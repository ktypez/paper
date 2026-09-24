import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { onRequestGet, onRequestPost } from "../../functions/api/documents/index.js";
import { createTestD1 } from "./helpers/d1-adapter.js";

function seededDatabase() {
  const { database, d1 } = createTestD1();
  database.exec(readFileSync(new URL("../../schema.sql", import.meta.url), "utf8"));
  database
    .prepare("INSERT INTO categories (id, name, created_at, sort_order) VALUES (?, ?, ?, ?)")
    .run("cat-1", "ทั่วไป", "2026-09-20T00:00:00.000Z", 0);
  database
    .prepare(
      "INSERT INTO receipts (id, filename, category, owner, notes, content_type, size, uploaded_at, thumb_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      "r-1",
      "receipt-one.webp",
      "ทั่วไป",
      "บัตรเครดิต",
      "ค่ากาแฟ",
      "image/webp",
      1024,
      "2026-09-24T10:00:00.000Z",
      null,
    );
  return { database, d1 };
}

test("document list supports Thai substring search and totals", async () => {
  const { d1 } = seededDatabase();
  const response = await onRequestGet({
    env: { receipts_db: d1 },
    request: new Request("https://paper.test/api/documents?q=กาแฟ&limit=1"),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.total, 1);
  assert.equal(body.items[0].id, "r-1");
  assert.equal(body.nextCursor, null);
});

test("document upload validates signatures and keeps the UUID R2 key", async () => {
  const { database, d1 } = seededDatabase();
  const writes = [];
  const bucket = {
    async put(key) {
      writes.push(key);
      return { key };
    },
    async delete() {},
  };
  const form = new FormData();
  form.append("file", new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "photo.png"));
  form.append("filename", "ชื่อที่แสดง");
  form.append("category", "ทั่วไป");
  form.append("notes", "บันทึก");

  const response = await onRequestPost({
    env: { receipts_db: d1, BUCKET: bucket },
    request: new Request("https://paper.test/api/documents", { method: "POST", body: form }),
  });
  const body = await response.json();
  const row = database.prepare("SELECT * FROM receipts WHERE id = ?").get(body.id);

  assert.equal(response.status, 201);
  assert.equal(body.filename, "ชื่อที่แสดง");
  assert.equal(body.contentType, "image/png");
  assert.equal(row.category, "ทั่วไป");
  assert.equal(writes.length, 1);
  assert.equal(writes[0], body.id);
});

test("a repeated client upload id returns the existing document without another R2 write", async () => {
  const { d1 } = seededDatabase();
  const writes = [];
  const bucket = {
    async put(key) {
      writes.push(key);
      return { key };
    },
    async delete() {},
  };
  const uploadId = "3b889f9b-59d2-4d16-b0e5-726f11c09611";

  async function sendUpload() {
    const form = new FormData();
    form.append("file", new File([new TextEncoder().encode("%PDF-1.7")], "document.pdf"));
    form.append("client_id", uploadId);
    form.append("filename", "document.pdf");
    form.append("category", "ทั่วไป");
    return onRequestPost({
      env: { receipts_db: d1, BUCKET: bucket },
      request: new Request("https://paper.test/api/documents", { method: "POST", body: form }),
    });
  }

  const first = await sendUpload();
  const second = await sendUpload();
  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal((await second.json()).id, uploadId);
  assert.deepEqual(writes, [uploadId]);
});

test("unsupported files are rejected before R2 is written", async () => {
  const { d1 } = seededDatabase();
  const writes = [];
  const bucket = {
    async put(key) {
      writes.push(key);
      return { key };
    },
    async delete() {},
  };
  const form = new FormData();
  form.append("file", new File(["plain text"], "note.txt", { type: "text/plain" }));
  form.append("filename", "note.txt");
  form.append("category", "ทั่วไป");

  const response = await onRequestPost({
    env: { receipts_db: d1, BUCKET: bucket },
    request: new Request("https://paper.test/api/documents", { method: "POST", body: form }),
  });

  assert.equal(response.status, 415);
  assert.equal(writes.length, 0);
});

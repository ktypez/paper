import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { onRequestGet, onRequestPost } from "../../functions/api/documents/index.js";
import { MAX_UPLOAD_BODY_SIZE } from "../../functions/api/_lib/validation.js";
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
  assert.equal(response.headers.get("vary"), "Authorization, Cookie");
  assert.equal(body.total, 1);
  assert.equal(body.items[0].id, "r-1");
  assert.equal(body.nextCursor, null);
});

test("list totals stay stable across cursor pages", async () => {
  const { database, d1 } = seededDatabase();
  database
    .prepare(
      "INSERT INTO receipts (id, filename, category, owner, notes, content_type, size, uploaded_at, thumb_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run("r-0", "older.webp", "ทั่วไป", null, null, "image/webp", 100, "2026-09-20T10:00:00.000Z", null);

  const firstResponse = await onRequestGet({
    env: { receipts_db: d1 },
    request: new Request("https://paper.test/api/documents?limit=1"),
  });
  const first = await firstResponse.json();
  const secondResponse = await onRequestGet({
    env: { receipts_db: d1 },
    request: new Request(`https://paper.test/api/documents?limit=1&cursor=${encodeURIComponent(first.nextCursor)}`),
  });
  const second = await secondResponse.json();

  assert.equal(first.total, 2);
  assert.equal(second.total, 2);
  assert.equal(second.items[0].id, "r-0");
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

test("an R2 write conflict does not overwrite or create a thumbnail", async () => {
  const { d1 } = seededDatabase();
  let originalWrites = 0;
  let thumbnailWrites = 0;
  const bucket = {
    async put(_key, _value, options) {
      if (options?.onlyIf) {
        originalWrites += 1;
        return null;
      }
      thumbnailWrites += 1;
      return { key: "preview" };
    },
    async delete() {},
  };
  const form = new FormData();
  form.append("file", new File([new TextEncoder().encode("%PDF-1.7")], "document.pdf"));
  form.append("filename", "document.pdf");
  form.append("category", "ทั่วไป");

  const response = await onRequestPost({
    env: { receipts_db: d1, BUCKET: bucket },
    request: new Request("https://paper.test/api/documents", { method: "POST", body: form }),
  });

  assert.equal(response.status, 409);
  assert.equal(originalWrites, 1);
  assert.equal(thumbnailWrites, 0);
});

test("a pending receipt blocks a concurrent upload with the same client id", async () => {
  const { d1 } = seededDatabase();
  const uploadId = "4b889f9b-59d2-4d16-b0e5-726f11c09611";
  let releasePut;
  let putStarted;
  const putStartedPromise = new Promise((resolve) => {
    putStarted = resolve;
  });
  const putGate = new Promise((resolve) => {
    releasePut = resolve;
  });
  let writes = 0;
  const bucket = {
    async put() {
      writes += 1;
      putStarted();
      await putGate;
      return { key: uploadId };
    },
    async delete() {},
  };
  function request() {
    const form = new FormData();
    form.append("file", new File([new TextEncoder().encode("%PDF-1.7")], "document.pdf"));
    form.append("client_id", uploadId);
    form.append("filename", "document.pdf");
    form.append("category", "ทั่วไป");
    return new Request("https://paper.test/api/documents", { method: "POST", body: form });
  }

  const first = onRequestPost({ env: { receipts_db: d1, BUCKET: bucket }, request: request() });
  await putStartedPromise;
  const second = await onRequestPost({ env: { receipts_db: d1, BUCKET: bucket }, request: request() });
  releasePut();
  const firstResponse = await first;

  assert.equal(firstResponse.status, 201);
  assert.equal(second.status, 409);
  assert.equal(writes, 1);
});

test("oversized multipart bodies are rejected before form parsing", async () => {
  const { d1 } = seededDatabase();
  let writes = 0;
  const bucket = {
    async put() {
      writes += 1;
    },
    async delete() {},
  };
  const form = new FormData();
  form.append("file", new File(["small"], "small.pdf", { type: "application/pdf" }));
  form.append("category", "ทั่วไป");
  const request = new Request("https://paper.test/api/documents", { method: "POST", body: form });
  request.headers.set("content-length", String(MAX_UPLOAD_BODY_SIZE + 1));

  const response = await onRequestPost({
    env: { receipts_db: d1, BUCKET: bucket },
    request,
  });

  assert.equal(response.status, 413);
  assert.equal(writes, 0);
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

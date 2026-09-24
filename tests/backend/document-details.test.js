import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { onRequestDelete, onRequestGet, onRequestPatch } from "../../functions/api/documents/[id].js";
import { createTestD1 } from "./helpers/d1-adapter.js";

function detailDatabase() {
  const { database, d1 } = createTestD1();
  database.exec(readFileSync(new URL("../../schema.sql", import.meta.url), "utf8"));
  database
    .prepare("INSERT INTO categories (id, name, created_at, sort_order) VALUES (?, ?, ?, ?)")
    .run("cat-1", "ทั่วไป", "2026-09-20T00:00:00.000Z", 0);
  database
    .prepare("INSERT INTO categories (id, name, created_at, sort_order) VALUES (?, ?, ?, ?)")
    .run("cat-2", "ย้ายแล้ว", "2026-09-20T00:00:01.000Z", 1);
  database
    .prepare(
      "INSERT INTO receipts (id, filename, category, owner, notes, content_type, size, uploaded_at, thumb_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run("r-1", "receipt.pdf", "ทั่วไป", null, null, "application/pdf", 100, "2026-09-24T10:00:00.000Z", null);
  return { database, d1 };
}

function request(url, options = {}) {
  return new Request(`https://paper.test${url}`, options);
}

test("document detail reads and patches metadata", async () => {
  const { database, d1 } = detailDatabase();
  const env = { receipts_db: d1, BUCKET: { delete: async () => {} } };

  const readResponse = await onRequestGet({ env, params: { id: "r-1" }, request: request("/api/documents/r-1") });
  assert.equal(readResponse.status, 200);
  assert.equal((await readResponse.json()).filename, "receipt.pdf");

  const patchResponse = await onRequestPatch({
    env,
    params: { id: "r-1" },
    request: request("/api/documents/r-1", {
      method: "PATCH",
      body: JSON.stringify({ filename: "updated.pdf", category: "ย้ายแล้ว" }),
    }),
  });
  assert.equal(patchResponse.status, 200);
  assert.equal((await patchResponse.json()).category, "ย้ายแล้ว");
  assert.equal(database.prepare("SELECT filename, category FROM receipts WHERE id = ?").get("r-1").filename, "updated.pdf");
});

test("document patches recheck the category at write time", async () => {
  const { d1 } = detailDatabase();
  const response = await onRequestPatch({
    env: { receipts_db: d1, BUCKET: { delete: async () => {} } },
    params: { id: "r-1" },
    request: request("/api/documents/r-1", {
      method: "PATCH",
      body: JSON.stringify({ category: "ไม่มีหมวดหมู่" }),
    }),
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, "category_not_found");
});

test("document delete removes the row and both storage objects", async () => {
  const { database, d1 } = detailDatabase();
  const deleted = [];
  const response = await onRequestDelete({
    env: { receipts_db: d1, BUCKET: { delete: async (key) => deleted.push(key) } },
    params: { id: "r-1" },
    request: request("/api/documents/r-1", { method: "DELETE" }),
  });

  assert.equal(response.status, 204);
  assert.equal(database.prepare("SELECT id FROM receipts WHERE id = ?").get("r-1"), undefined);
  assert.deepEqual(deleted, ["r-1"]);
});

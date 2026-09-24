import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { onRequestGet as onRequestCategoryGet } from "../../functions/api/categories/index.js";
import { onRequestDelete as onRequestCategoryDelete } from "../../functions/api/categories/[id].js";
import { onRequestGet as onRequestDocumentGet, onRequestDelete as onRequestDocumentDelete } from "../../functions/api/documents/[id].js";
import { onRequestGet as onRequestFileGet } from "../../functions/api/documents/[id]/file.js";
import { onRequestGet as onRequestList } from "../../functions/api/documents/index.js";
import { onRequestGet as onRequestSummary } from "../../functions/api/summary.js";
import { PENDING_UPLOAD_PREFIX } from "../../functions/api/_lib/validation.js";
import { createTestD1 } from "./helpers/d1-adapter.js";

function pendingDatabase() {
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
      "pending-1",
      `${PENDING_UPLOAD_PREFIX}token`,
      "ทั่วไป",
      "internal",
      "internal",
      "application/pdf",
      100,
      new Date().toISOString(),
      null,
    );
  return d1;
}

test("pending upload reservations stay hidden and cannot be read or deleted", async () => {
  const d1 = pendingDatabase();
  const listResponse = await onRequestList({
    env: { receipts_db: d1 },
    request: new Request("https://paper.test/api/documents"),
  });
  assert.deepEqual((await listResponse.json()).items, []);

  const detailResponse = await onRequestDocumentGet({
    env: { receipts_db: d1, BUCKET: {} },
    params: { id: "pending-1" },
    request: new Request("https://paper.test/api/documents/pending-1"),
  });
  assert.equal(detailResponse.status, 409);

  const deleteResponse = await onRequestDocumentDelete({
    env: { receipts_db: d1, BUCKET: { delete: async () => {} } },
    params: { id: "pending-1" },
    request: new Request("https://paper.test/api/documents/pending-1", { method: "DELETE" }),
  });
  assert.equal(deleteResponse.status, 409);

  const fileResponse = await onRequestFileGet({
    env: { receipts_db: d1, BUCKET: { get: async () => null } },
    params: { id: "pending-1" },
    request: new Request("https://paper.test/api/documents/pending-1/file"),
  });
  assert.equal(fileResponse.status, 409);
});

test("pending rows do not inflate category or summary counts", async () => {
  const d1 = pendingDatabase();
  const categoriesResponse = await onRequestCategoryGet({
    env: { receipts_db: d1 },
    request: new Request("https://paper.test/api/categories"),
  });
  assert.equal((await categoriesResponse.json())[0].documentCount, 0);

  const summaryResponse = await onRequestSummary({
    env: { receipts_db: d1 },
    request: new Request("https://paper.test/api/summary"),
  });
  const summary = await summaryResponse.json();
  assert.equal(summary.documentCount, 0);
  assert.deepEqual(summary.owners, []);

  const categoryDelete = await onRequestCategoryDelete({
    env: { receipts_db: d1 },
    params: { id: "cat-1" },
    request: new Request("https://paper.test/api/categories/cat-1", { method: "DELETE" }),
  });
  assert.equal(categoryDelete.status, 409);
});

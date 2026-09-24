import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { onRequestDelete, onRequestPatch } from "../../functions/api/categories/[id].js";
import { createTestD1 } from "./helpers/d1-adapter.js";

function categoryDatabase() {
  const { database, d1 } = createTestD1();
  database.exec(readFileSync(new URL("../../schema.sql", import.meta.url), "utf8"));
  database
    .prepare("INSERT INTO categories (id, name, created_at, sort_order) VALUES (?, ?, ?, ?)")
    .run("cat-1", "เดิม", "2026-09-20T00:00:00.000Z", 0);
  database
    .prepare(
      "INSERT INTO receipts (id, filename, category, owner, notes, content_type, size, uploaded_at, thumb_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      "r-1",
      "receipt.webp",
      "เดิม",
      null,
      null,
      "image/webp",
      1024,
      "2026-09-24T10:00:00.000Z",
      null,
    );
  return { database, d1 };
}

test("category rename updates receipt references and the FTS index", async () => {
  const { database, d1 } = categoryDatabase();
  const response = await onRequestPatch({
    env: { receipts_db: d1 },
    params: { id: "cat-1" },
    request: new Request("https://paper.test/api/categories/cat-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "ใหม่" }),
    }),
  });
  const receipt = database.prepare("SELECT category FROM receipts WHERE id = ?").get("r-1");
  const search = database
    .prepare("SELECT rowid FROM receipts_fts WHERE receipts_fts MATCH ?")
    .all('"ใหม่"*');

  assert.equal(response.status, 200);
  assert.equal((await response.json()).documentCount, 1);
  assert.equal(receipt.category, "ใหม่");
  assert.equal(search.length, 1);
});

test("a category with documents cannot be deleted", async () => {
  const { d1 } = categoryDatabase();
  const response = await onRequestDelete({
    env: { receipts_db: d1 },
    params: { id: "cat-1" },
    request: new Request("https://paper.test/api/categories/cat-1", { method: "DELETE" }),
  });

  assert.equal(response.status, 409);
});

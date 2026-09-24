import assert from "node:assert/strict";
import test from "node:test";
import { toCategory, toDocument } from "../../functions/api/_lib/records.js";

test("D1 receipt rows map to the public document contract", () => {
  assert.deepEqual(
    toDocument({
      id: "r1",
      filename: "receipt.webp",
      category: "ทั่วไป",
      owner: null,
      notes: null,
      content_type: "image/webp",
      size: 1234,
      uploaded_at: "2026-09-24T00:00:00.000Z",
      thumb_key: null,
    }),
    {
      id: "r1",
      filename: "receipt.webp",
      category: "ทั่วไป",
      owner: null,
      notes: null,
      contentType: "image/webp",
      size: 1234,
      uploadedAt: "2026-09-24T00:00:00.000Z",
      hasPreview: false,
    },
  );
});

test("category rows expose a live document count", () => {
  assert.deepEqual(
    toCategory({
      id: "c1",
      name: "ทั่วไป",
      created_at: "2026-09-24T00:00:00.000Z",
      sort_order: 2,
      receipt_count: 4,
    }),
    {
      id: "c1",
      name: "ทั่วไป",
      createdAt: "2026-09-24T00:00:00.000Z",
      sortOrder: 2,
      documentCount: 4,
    },
  );
});

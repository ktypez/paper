import assert from "node:assert/strict";
import test from "node:test";
import { onRequestGet } from "../../functions/api/documents/[id]/file.js";

function rowDatabase(row) {
  return {
    prepare() {
      return {
        bind() {
          return this;
        },
        async first() {
          return row;
        },
      };
    },
  };
}

test("original file responses are private and support byte ranges", async () => {
  const gets = [];
  const bucket = {
    async get(key, options) {
      gets.push({ key, options });
      return {
        body: "abcdefghij",
        size: 10,
        etag: "etag-1",
        httpMetadata: { contentType: "application/pdf" },
        range: options?.range ? { offset: 2, length: 4 } : undefined,
      };
    },
  };
  const response = await onRequestGet({
    env: {
      receipts_db: rowDatabase({ filename: "document.pdf", content_type: "application/pdf", thumb_key: null }),
      BUCKET: bucket,
    },
    params: { id: "r-1" },
    request: new Request("https://paper.test/api/documents/r-1/file?variant=original", {
      headers: { Range: "bytes=2-5" },
    }),
  });

  assert.equal(response.status, 206);
  assert.equal(response.headers.get("cache-control"), "private, max-age=3600");
  assert.equal(response.headers.get("content-range"), "bytes 2-5/10");
  assert.equal(response.headers.get("etag"), '"etag-1"');
  assert.deepEqual(gets[0].options, { range: { offset: 2, length: 4 } });
});

test("a missing preview object falls back to the original", async () => {
  const keys = [];
  const bucket = {
    async get(key) {
      keys.push(key);
      if (key === "missing-preview") return null;
      return {
        body: "image",
        size: 5,
        etag: "etag-2",
        httpMetadata: { contentType: "image/webp" },
      };
    },
  };
  const response = await onRequestGet({
    env: {
      receipts_db: rowDatabase({ filename: "receipt.webp", content_type: "image/webp", thumb_key: "missing-preview" }),
      BUCKET: bucket,
    },
    params: { id: "r-1" },
    request: new Request("https://paper.test/api/documents/r-1/file?variant=preview"),
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, max-age=3600");
  assert.deepEqual(keys, ["missing-preview", "r-1"]);
});

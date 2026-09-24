import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "../../functions/api/_middleware.js";

test("preview hosts cannot reach the production-bound API", async () => {
  const response = await onRequest({
    request: new Request("https://abc123.receipts-dms.pages.dev/api/documents"),
    env: {},
  });

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, "preview_disabled");
});

test("cross-site mutations are rejected before auth lookup", async () => {
  const response = await onRequest({
    request: new Request("https://paper.test/api/documents", {
      method: "POST",
      headers: { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" },
    }),
    env: {},
  });

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, "invalid_origin");
});

test("local Vite proxy origins are allowed to reach bearer validation", async () => {
  const response = await onRequest({
    request: new Request("http://localhost:8788/api/documents", {
      method: "POST",
      headers: { Origin: "http://localhost:5173" },
    }),
    env: {},
  });

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "bearer_required");
});

test("cookie-only mutations are rejected", async () => {
  const response = await onRequest({
    request: new Request("https://paper.test/api/documents", {
      method: "POST",
      headers: { Cookie: "__session=not-read-by-this-test" },
    }),
    env: {},
  });

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "bearer_required");
});

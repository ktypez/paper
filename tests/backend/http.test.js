import assert from "node:assert/strict";
import test from "node:test";
import { readJsonObject } from "../../functions/api/_lib/http.js";

test("JSON routes reject oversized bodies before parsing", async () => {
  const request = new Request("https://paper.test/api/categories", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": "70000" },
    body: "{}",
  });

  await assert.rejects(
    () => readJsonObject(request, 64 * 1024),
    (error) => error.status === 413 && error.code === "body_too_large",
  );
});

test("JSON routes reject arrays and preserve object bodies", async () => {
  await assert.rejects(
    () => readJsonObject(new Request("https://paper.test/api/categories", { method: "POST", body: "[]" })),
    (error) => error.status === 400 && error.code === "invalid_json",
  );
  assert.deepEqual(
    await readJsonObject(new Request("https://paper.test/api/categories", { method: "POST", body: '{"name":"ทั่วไป"}' })),
    { name: "ทั่วไป" },
  );
});

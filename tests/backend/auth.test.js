import assert from "node:assert/strict";
import test from "node:test";
import { bearerToken, frontendApiHost } from "../../functions/api/_lib/auth.js";

test("frontendApiHost decodes the Clerk publishable-key suffix", () => {
  const suffix = btoa("clerk.example.com$").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  assert.equal(frontendApiHost(`pk_test_${suffix}`), "clerk.example.com");
});

test("bearerToken accepts Authorization and Clerk session cookies", () => {
  assert.equal(
    bearerToken(new Request("https://paper.test", { headers: { Authorization: "Bearer header-token" } })),
    "header-token",
  );
  assert.equal(
    bearerToken(new Request("https://paper.test", { headers: { Cookie: "other=1; __session=cookie-token" } })),
    "cookie-token",
  );
});

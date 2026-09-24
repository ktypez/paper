import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { bearerToken, fastAuth, frontendApiHost } from "../../functions/api/_lib/auth.js";

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

test("concurrent auth requests share JWKS and access lookups", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key", alg: "RS256", use: "sig" };
  const encode = (value) => Buffer.from(value).toString("base64url");
  const header = encode(JSON.stringify({ alg: "RS256", kid: "test-key", typ: "JWT" }));
  const payload = encode(JSON.stringify({ sub: "user-concurrent", iss: "https://clerk.test", azp: "https://paper.test", exp: Math.floor(Date.now() / 1000) + 3600 }));
  const unsigned = `${header}.${payload}`;
  const token = `${unsigned}.${sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString("base64url")}`;
  let jwksCalls = 0;
  let userCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("jwks")) {
      jwksCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    }
    if (url.includes("/v1/users/")) {
      userCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return new Response(JSON.stringify({ private_metadata: { apps: ["paper"] } }), { status: 200 });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const suffix = Buffer.from("clerk.test$").toString("base64url");
    const env = {
      CLERK_PUBLISHABLE_KEY: `pk_test_${suffix}`,
      CLERK_SECRET_KEY: "sk_test_local",
    };
    const request = new Request("https://paper.test/api/documents", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const results = await Promise.all([fastAuth(request, env), fastAuth(request, env), fastAuth(request, env)]);
    assert.deepEqual(results, [
      { ok: true, userId: "user-concurrent", sessionId: null },
      { ok: true, userId: "user-concurrent", sessionId: null },
      { ok: true, userId: "user-concurrent", sessionId: null },
    ]);
    assert.equal(jwksCalls, 1);
    assert.equal(userCalls, 1);

    const unknownHeader = encode(JSON.stringify({ alg: "RS256", kid: "unknown-key", typ: "JWT" }));
    const unknownPayload = encode(JSON.stringify({ sub: "user-unknown", iss: "https://clerk.test", azp: "https://paper.test", exp: Math.floor(Date.now() / 1000) + 3600 }));
    const unknownUnsigned = `${unknownHeader}.${unknownPayload}`;
    const unknownToken = `${unknownUnsigned}.${sign("RSA-SHA256", Buffer.from(unknownUnsigned), privateKey).toString("base64url")}`;
    const unknownResult = await fastAuth(
      new Request("https://paper.test/api/documents", { headers: { Authorization: `Bearer ${unknownToken}` } }),
      env,
    );
    assert.deepEqual(unknownResult, { ok: false });
    assert.equal(jwksCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

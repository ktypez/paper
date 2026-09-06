// Fast Clerk auth for Pages Functions — zero-dependency JWT verification.
//
// Replaces per-request `authenticateRequest` + `users.getUser` (2 Clerk API
// round-trips) with:
//   1. Local RS256 verification of the session JWT against a cached JWKS
//      (~0ms hot path; JWKS refetched at most once per 24h per isolate).
//   2. Access decision (privateMetadata.apps includes "paper") cached
//      per user for 5 minutes (one Clerk API call per user per 5 min).
//
// Fail-closed: any error → { ok: false }.

const JWKS_TTL = 24 * 3600 * 1000;
const ACCESS_TTL = 5 * 60 * 1000;

let jwksCache = { keys: null, exp: 0 };
const accessCache = new Map(); // userId -> { apps: string[], exp: number }

function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function frontendApiHost(publishableKey) {
  // Clerk publishable keys end with base64(<frontend-api hostname>).
  const tail = (publishableKey || "").split("_").pop() || "";
  try {
    return atob(tail);
  } catch {
    return null;
  }
}

async function getJwks(env) {
  const now = Date.now();
  if (jwksCache.keys && jwksCache.exp > now) return jwksCache.keys;
  const override = env.CLERK_JWKS_URL;
  const host = override ? null : frontendApiHost(env.CLERK_PUBLISHABLE_KEY);
  const url = override || (host ? `https://${host}/.well-known/jwks.json` : null);
  if (!url) throw new Error("no jwks url");
  const res = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!res.ok) throw new Error("jwks fetch failed");
  const { keys } = await res.json();
  jwksCache = { keys, exp: now + JWKS_TTL };
  return keys;
}

async function verifySessionToken(token, env) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("bad jwt");
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now - 30) throw new Error("expired");
  if (payload.nbf && payload.nbf > now + 30) throw new Error("not yet valid");
  if (header.alg !== "RS256") throw new Error("bad alg");

  const keys = await getJwks(env);
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    jwksCache = { keys: null, exp: 0 }; // force refetch once (key rotation)
    const fresh = await getJwks(env);
    const retry = fresh.find((k) => k.kid === header.kid);
    if (!retry) throw new Error("unknown kid");
    return finishVerify(retry, parts, payload);
  }
  return finishVerify(jwk, parts, payload);
}

async function finishVerify(jwk, parts, payload) {
  const key = await crypto.subtle.importKey(
    "jwk",
    { ...jwk, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const data = new TextEncoder().encode(parts[0] + "." + parts[1]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]), data);
  if (!ok) throw new Error("bad signature");
  return payload;
}

async function getUserApps(userId, env) {
  const now = Date.now();
  const hit = accessCache.get(userId);
  if (hit && hit.exp > now) return hit.apps;
  const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` },
  });
  if (!res.ok) throw new Error("clerk user fetch failed");
  const user = await res.json();
  const apps =
    user.private_metadata && Array.isArray(user.private_metadata.apps)
      ? user.private_metadata.apps
      : [];
  accessCache.set(userId, { apps, exp: now + ACCESS_TTL });
  return apps;
}

export async function fastAuth(request, env) {
  try {
    const h = request.headers.get("authorization") || "";
    const m = h.match(/^Bearer (.+)$/);
    if (!m) return { ok: false };
    const payload = await verifySessionToken(m[1].trim(), env);
    const userId = payload.sub;
    if (!userId) return { ok: false };
    const apps = await getUserApps(userId, env);
    if (!apps.includes("paper")) return { ok: false };
    return { ok: true, userId, sessionId: payload.sid || null };
  } catch {
    return { ok: false };
  }
}

const JWKS_TTL = 24 * 60 * 60 * 1000;
const ACCESS_TTL = 5 * 60 * 1000;
const MAX_ACCESS_ENTRIES = 500;

let jwksCache = { keys: null, expiresAt: 0 };
let jwksRequest = null;
const accessCache = new Map();
const accessRequests = new Map();

function base64UrlToBytes(value) {
  let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  while (normalized.length % 4) normalized += "=";
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function frontendApiHost(publishableKey) {
  let encodedHost = (publishableKey ?? "").split("_").at(-1) ?? "";
  encodedHost = encodedHost.replace(/-/g, "+").replace(/_/g, "/");
  while (encodedHost.length % 4) encodedHost += "=";
  try {
    return atob(encodedHost).replace(/\$$/, "") || null;
  } catch {
    return null;
  }
}

function jwksUrl(env) {
  if (env.CLERK_JWKS_URL) return env.CLERK_JWKS_URL;
  const host = frontendApiHost(env.CLERK_PUBLISHABLE_KEY);
  return host ? `https://${host}/.well-known/jwks.json` : null;
}

async function getJwks(env) {
  if (jwksCache.keys && jwksCache.expiresAt > Date.now()) return jwksCache.keys;
  if (jwksRequest) return jwksRequest;

  jwksRequest = (async () => {
    const url = jwksUrl(env);
    if (!url) throw new Error("Clerk JWKS is not configured");

    const response = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } });
    if (!response.ok) throw new Error("Clerk JWKS request failed");
    const payload = await response.json();
    if (!Array.isArray(payload.keys) || payload.keys.length === 0) {
      throw new Error("Clerk JWKS is empty");
    }
    jwksCache = { keys: payload.keys, expiresAt: Date.now() + JWKS_TTL };
    return payload.keys;
  })();

  try {
    return await jwksRequest;
  } finally {
    jwksRequest = null;
  }
}

async function importVerificationKey(jwk) {
  return crypto.subtle.importKey(
    "jwk",
    { ...jwk, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

async function verifySignature(jwk, token) {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  const key = await importVerificationKey(jwk);
  const signed = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlToBytes(encodedSignature),
    signed,
  );
  if (!valid) throw new Error("Invalid session signature");
}

async function verifySessionToken(token, env) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid session token");
  const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])));
  const now = Math.floor(Date.now() / 1000);

  if (header.alg !== "RS256" || typeof header.kid !== "string") {
    throw new Error("Invalid session header");
  }
  if (typeof payload.exp !== "number" || payload.exp < now - 30) {
    throw new Error("Session expired");
  }
  if (typeof payload.nbf === "number" && payload.nbf > now + 30) {
    throw new Error("Session is not active");
  }

  let keys = await getJwks(env);
  let jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) {
    jwksCache = { keys: null, expiresAt: 0 };
    keys = await getJwks(env);
    jwk = keys.find((key) => key.kid === header.kid);
  }
  if (!jwk) throw new Error("Unknown session key");

  await verifySignature(jwk, token);
  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("Session subject missing");
  return payload;
}

function pruneAccessCache() {
  const now = Date.now();
  for (const [userId, entry] of accessCache) {
    if (entry.expiresAt <= now) accessCache.delete(userId);
  }
  while (accessCache.size >= MAX_ACCESS_ENTRIES) {
    const oldest = accessCache.keys().next().value;
    if (!oldest) break;
    accessCache.delete(oldest);
  }
}

async function getUserApps(userId, env) {
  const cached = accessCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.apps;
  const pending = accessRequests.get(userId);
  if (pending) return pending;
  if (!env.CLERK_SECRET_KEY) throw new Error("Clerk secret is not configured");

  const request = (async () => {
    const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` },
    });
    if (!response.ok) throw new Error("Clerk user request failed");
    const user = await response.json();
    const apps = Array.isArray(user.private_metadata?.apps) ? user.private_metadata.apps : [];

    pruneAccessCache();
    accessCache.set(userId, { apps, expiresAt: Date.now() + ACCESS_TTL });
    return apps;
  })();
  accessRequests.set(userId, request);

  try {
    return await request;
  } finally {
    if (accessRequests.get(userId) === request) accessRequests.delete(userId);
  }
}

function bearerToken(request) {
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer (.+)$/i);
  if (bearer) return bearer[1].trim();

  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== "__session") continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

export async function fastAuth(request, env) {
  try {
    const token = bearerToken(request);
    if (!token) return { ok: false };
    const payload = await verifySessionToken(token, env);
    const apps = await getUserApps(payload.sub, env);
    if (!apps.includes("paper")) return { ok: false };
    return { ok: true, userId: payload.sub, sessionId: payload.sid ?? null };
  } catch {
    return { ok: false };
  }
}

export { bearerToken, frontendApiHost };

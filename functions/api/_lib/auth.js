const JWKS_TTL = 24 * 60 * 60 * 1000;
const ACCESS_TTL = 5 * 60 * 1000;
const MAX_ACCESS_ENTRIES = 500;
const MAX_TOKEN_LENGTH = 16 * 1024;
const AUTH_FETCH_TIMEOUT_MS = 4000;
const JWKS_REFRESH_COOLDOWN_MS = 60 * 1000;

class AuthUnavailableError extends Error {}

let jwksCache = { keys: null, expiresAt: 0 };
let jwksLastRefreshAt = 0;
let jwksNextAttemptAt = 0;
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

function expectedIssuer(env) {
  const host = frontendApiHost(env.CLERK_PUBLISHABLE_KEY);
  if (host) return `https://${host}`;
  try {
    return env.CLERK_JWKS_URL ? new URL(env.CLERK_JWKS_URL).origin : null;
  } catch {
    return null;
  }
}

async function fetchJsonWithTimeout(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) return { response, payload: null };
    return { response, payload: await response.json() };
  } catch (error) {
    throw new AuthUnavailableError("Clerk request failed", { cause: error });
  } finally {
    clearTimeout(timer);
  }
}

async function getJwks(env, forceRefresh = false) {
  if (!forceRefresh && jwksCache.keys && jwksCache.expiresAt > Date.now()) return jwksCache.keys;
  if (jwksRequest) return jwksRequest;
  if (jwksCache.keys && Date.now() < jwksNextAttemptAt) return jwksCache.keys;
  if (!jwksCache.keys && Date.now() < jwksNextAttemptAt) {
    throw new AuthUnavailableError("Clerk JWKS refresh is cooling down");
  }

  jwksNextAttemptAt = Date.now() + JWKS_REFRESH_COOLDOWN_MS;
  jwksRequest = (async () => {
    const url = jwksUrl(env);
    if (!url) throw new AuthUnavailableError("Clerk JWKS is not configured");

    const { response, payload } = await fetchJsonWithTimeout(url, {
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
    if (!response.ok) throw new AuthUnavailableError("Clerk JWKS request failed");
    if (!Array.isArray(payload?.keys) || payload.keys.length === 0) {
      throw new AuthUnavailableError("Clerk JWKS is empty");
    }
    jwksLastRefreshAt = Date.now();
    jwksCache = { keys: payload.keys, expiresAt: jwksLastRefreshAt + JWKS_TTL };
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

async function verifySessionToken(token, env, requestUrl, requestOrigin) {
  if (token.length > MAX_TOKEN_LENGTH) throw new Error("Invalid session token");
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
  const issuer = expectedIssuer(env);
  if (issuer && payload.iss !== issuer) {
    throw new Error("Invalid session issuer");
  }
  if (payload.azp) {
    let urlOrigin;
    try {
      urlOrigin = new URL(requestUrl).origin;
    } catch {
      throw new Error("Invalid session party");
    }
    const allowedOrigins = new Set([urlOrigin]);
    if (urlOrigin.includes("localhost") || urlOrigin.includes("127.0.0.1")) {
      if (requestOrigin) allowedOrigins.add(requestOrigin);
      allowedOrigins.add("http://localhost:5173");
      allowedOrigins.add("http://localhost:8788");
      allowedOrigins.add("http://127.0.0.1:5173");
      allowedOrigins.add("http://127.0.0.1:8788");
    }
    for (const origin of (env.CLERK_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)) {
      allowedOrigins.add(origin);
    }
    if (!allowedOrigins.has(payload.azp)) throw new Error("Invalid session party");
  }

  let keys = await getJwks(env);
  let jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) {
    // Unknown key IDs are attacker-controlled, so refresh them at most once per cooldown.
    if (Date.now() - jwksLastRefreshAt < JWKS_REFRESH_COOLDOWN_MS) {
      throw new Error("Unknown session key");
    }
    keys = await getJwks(env, true);
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
  if (!env.CLERK_SECRET_KEY) throw new AuthUnavailableError("Clerk secret is not configured");

  const request = (async () => {
    const { response, payload } = await fetchJsonWithTimeout(
      `https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` } },
    );
    if (!response.ok) throw new AuthUnavailableError("Clerk user request failed");
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new AuthUnavailableError("Clerk user response is invalid");
    }
    const user = payload;
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
    const payload = await verifySessionToken(token, env, request.url, request.headers.get("origin"));
    const apps = await getUserApps(payload.sub, env);
    if (!apps.includes("paper")) return { ok: false };
    return { ok: true, userId: payload.sub, sessionId: payload.sid ?? null };
  } catch (error) {
    return error instanceof AuthUnavailableError ? { ok: false, unavailable: true } : { ok: false };
  }
}

export { bearerToken, frontendApiHost };

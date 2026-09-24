import { fastAuth } from "./_lib/auth.js";
import { json } from "./_lib/http.js";

const ALLOWED_API_HOSTS = new Set([
  "paper.mcky.space",
  "receipts-dms.pages.dev",
  "localhost",
  "127.0.0.1",
  "::1",
  "paper.test",
]);

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!ALLOWED_API_HOSTS.has(hostname)) {
    return json(
      { error: { code: "preview_disabled", message: "API ไม่เปิดใช้งานบนสภาพแวดล้อม Preview" } },
      404,
      { "Cache-Control": "private, no-store" },
    );
  }
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(context.request.method);
  if (isMutation) {
    const origin = context.request.headers.get("origin");
    const fetchSite = context.request.headers.get("sec-fetch-site");
    let localProxyOrigin = false;
    if (origin && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
      try {
        const originUrl = new URL(origin);
        localProxyOrigin = originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1";
      } catch {
        localProxyOrigin = false;
      }
    }
    if ((origin && origin !== url.origin && !localProxyOrigin) || fetchSite === "cross-site") {
      return json(
        { error: { code: "invalid_origin", message: "คำขอมาจากโดเมนไม่ถูกต้อง" } },
        403,
      );
    }
    const hasBearer = /^Bearer\s+\S+/i.test(context.request.headers.get("authorization") ?? "");
    if (!hasBearer) {
      return json(
        { error: { code: "bearer_required", message: "คำขอแก้ไขข้อมูลต้องใช้ Bearer token" } },
        401,
      );
    }
  }

  const auth = await fastAuth(context.request, context.env);
  if (!auth.ok) {
    const unavailable = auth.unavailable === true;
    return json(
      {
        error: {
          code: unavailable ? "auth_unavailable" : "access_denied",
          message: unavailable ? "ระบบยืนยันสิทธิ์ไม่พร้อมใช้งานชั่วคราว" : "บัญชีนี้ยังไม่มีสิทธิ์ใช้งาน Paper",
        },
      },
      unavailable ? 503 : 401,
      { "Cache-Control": "private, no-store" },
    );
  }

  context.data = {
    ...(context.data ?? {}),
    userId: auth.userId,
    sessionId: auth.sessionId,
  };

  return context.next();
}

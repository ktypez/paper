import { fastAuth } from "./_lib/auth.js";
import { json } from "./_lib/http.js";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (["POST", "PUT", "PATCH", "DELETE"].includes(context.request.method)) {
    const origin = context.request.headers.get("origin");
    if (origin && origin !== url.origin) {
      return json(
        { error: { code: "invalid_origin", message: "คำขอมาจากโดเมนไม่ถูกต้อง" } },
        403,
      );
    }
  }

  const auth = await fastAuth(context.request, context.env);
  if (!auth.ok) {
    return json(
      { error: { code: "access_denied", message: "บัญชีนี้ยังไม่มีสิทธิ์ใช้งาน Paper" } },
      401,
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

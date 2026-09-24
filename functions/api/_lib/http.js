const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "private, no-store",
  Vary: "Authorization, Cookie",
};

export class RequestError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...BASE_HEADERS, ...headers },
  });
}

export function errorResponse(error) {
  if (error instanceof RequestError) {
    return json({ error: { code: error.code, message: error.message } }, error.status);
  }
  console.error("Unhandled API error", error);
  return json({ error: { code: "internal_error", message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" } }, 500);
}

export async function readJsonObject(request, maxBytes = 64 * 1024) {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > maxBytes) {
      throw new RequestError(413, "body_too_large", "ข้อมูลที่ส่งมาใหญ่เกินกำหนด");
    }
  }

  let text;
  try {
    text = await request.text();
  } catch {
    throw new RequestError(400, "invalid_json", "ข้อมูลที่ส่งมาไม่ถูกต้อง");
  }
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new RequestError(413, "body_too_large", "ข้อมูลที่ส่งมาใหญ่เกินกำหนด");
  }

  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("not an object");
    return body;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(400, "invalid_json", "ข้อมูลที่ส่งมาไม่ถูกต้อง");
  }
}

export function noContent() {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "private, no-store", Vary: "Authorization, Cookie" },
  });
}

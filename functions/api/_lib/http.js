const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "private, no-store",
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

export function noContent() {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "private, no-store" },
  });
}

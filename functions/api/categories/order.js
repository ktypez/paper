import { errorResponse, noContent, RequestError } from "../_lib/http.js";

export async function onRequestPut(context) {
  try {
    const { receipts_db: DB } = context.env;
    const body = await readJson(context.request);
    if (!Array.isArray(body.ids) || body.ids.some((id) => typeof id !== "string")) {
      throw new RequestError(400, "invalid_order", "ลำดับหมวดหมู่ไม่ถูกต้อง");
    }
    const ids = [...new Set(body.ids)];
    if (ids.length !== body.ids.length) {
      throw new RequestError(400, "duplicate_category", "ลำดับหมวดหมู่มีรายการซ้ำ");
    }

    const { results } = await DB.prepare("SELECT id FROM categories").all();
    if (results.length === 0 && ids.length === 0) return noContent();
    const existing = new Set(results.map((row) => row.id));
    if (ids.length !== existing.size || ids.some((id) => !existing.has(id))) {
      throw new RequestError(409, "incomplete_order", "ลำดับหมวดหมู่ไม่ครบทุกรายการ");
    }

    await DB.batch(
      ids.map((id, index) => DB.prepare("UPDATE categories SET sort_order = ? WHERE id = ?").bind(index, id)),
    );
    return noContent();
  } catch (error) {
    return errorResponse(error);
  }
}

async function readJson(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("not an object");
    return body;
  } catch {
    throw new RequestError(400, "invalid_json", "ข้อมูลที่ส่งมาไม่ถูกต้อง");
  }
}

import { toCategory } from "../_lib/records.js";
import { errorResponse, json, noContent, RequestError } from "../_lib/http.js";
import { requiredText } from "../_lib/validation.js";

const CATEGORY_QUERY =
  "SELECT c.id, c.name, c.created_at, c.sort_order, COUNT(r.id) AS receipt_count " +
  "FROM categories c LEFT JOIN receipts r ON r.category = c.name ";

export async function onRequestPatch(context) {
  try {
    const { receipts_db: DB } = context.env;
    const id = requiredText(context.params.id, "รหัสหมวดหมู่", 100);
    const body = await readJson(context.request);
    if (Object.keys(body).some((key) => key !== "name")) {
      throw new RequestError(400, "unknown_field", "มีข้อมูลที่แก้ไขไม่ได้");
    }
    const name = requiredText(body.name, "ชื่อหมวดหมู่", 80);
    const current = await DB.prepare("SELECT id, name FROM categories WHERE id = ?").bind(id).first();
    if (!current) throw new RequestError(404, "category_not_found", "ไม่พบหมวดหมู่");
    if (current.name === name) {
      const unchanged = await DB.prepare(`${CATEGORY_QUERY} WHERE c.id = ? GROUP BY c.id`).bind(id).first();
      return json(toCategory(unchanged));
    }

    const duplicate = await DB.prepare(
      "SELECT id FROM categories WHERE id <> ? AND name = ? COLLATE NOCASE",
    )
      .bind(id, name)
      .first();
    if (duplicate) throw new RequestError(409, "category_exists", "มีหมวดหมู่นี้อยู่แล้ว");

    await DB.batch([
      DB.prepare("UPDATE categories SET name = ? WHERE id = ?").bind(name, id),
      DB.prepare("UPDATE receipts SET category = ? WHERE category = ?").bind(name, current.name),
    ]);
    const updated = await DB.prepare(`${CATEGORY_QUERY} WHERE c.id = ? GROUP BY c.id`).bind(id).first();
    return json(toCategory(updated));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestDelete(context) {
  try {
    const { receipts_db: DB } = context.env;
    const id = requiredText(context.params.id, "รหัสหมวดหมู่", 100);
    const category = await DB.prepare(
      "SELECT c.id, COUNT(r.id) AS receipt_count FROM categories c " +
        "LEFT JOIN receipts r ON r.category = c.name WHERE c.id = ? GROUP BY c.id",
    )
      .bind(id)
      .first();
    if (!category) throw new RequestError(404, "category_not_found", "ไม่พบหมวดหมู่");
    if (category.receipt_count > 0) {
      throw new RequestError(409, "category_in_use", "ย้ายเอกสารออกจากหมวดหมู่นี้ก่อน");
    }
    await DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
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

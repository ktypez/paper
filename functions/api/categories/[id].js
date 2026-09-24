import { toCategory } from "../_lib/records.js";
import { errorResponse, json, noContent, readJsonObject, RequestError } from "../_lib/http.js";
import { pendingUploadPattern, requiredText } from "../_lib/validation.js";

const CATEGORY_QUERY =
  "SELECT c.id, c.name, c.created_at, c.sort_order, COUNT(r.id) AS receipt_count " +
  "FROM categories c LEFT JOIN receipts r ON r.category = c.name " +
  "AND r.filename NOT LIKE ? ESCAPE '\\' ";

export async function onRequestPatch(context) {
  try {
    const { receipts_db: DB } = context.env;
    const id = requiredText(context.params.id, "รหัสหมวดหมู่", 100);
    const body = await readJsonObject(context.request);
    if (Object.keys(body).some((key) => key !== "name")) {
      throw new RequestError(400, "unknown_field", "มีข้อมูลที่แก้ไขไม่ได้");
    }
    const name = requiredText(body.name, "ชื่อหมวดหมู่", 80);
    const current = await DB.prepare("SELECT id, name FROM categories WHERE id = ?").bind(id).first();
    if (!current) throw new RequestError(404, "category_not_found", "ไม่พบหมวดหมู่");
    if (current.name === name) {
      const unchanged = await DB.prepare(`${CATEGORY_QUERY} WHERE c.id = ? GROUP BY c.id`).bind(pendingUploadPattern(), id).first();
      return json(toCategory(unchanged));
    }

    const [categoryUpdate] = await DB.batch([
      DB.prepare(
        "UPDATE categories SET name = ? WHERE id = ? AND name = ? " +
          "AND NOT EXISTS (SELECT 1 FROM categories WHERE id <> ? AND name = ? COLLATE NOCASE)",
      ).bind(name, id, current.name, id, name),
      DB.prepare(
        "UPDATE receipts SET category = ? WHERE category = ? " +
          "AND EXISTS (SELECT 1 FROM categories WHERE id = ? AND name = ?)",
      ).bind(name, current.name, id, name),
    ]);
    if (Number(categoryUpdate.meta?.changes ?? 0) === 0) {
      const latest = await DB.prepare("SELECT id, name FROM categories WHERE id = ?").bind(id).first();
      if (!latest) throw new RequestError(404, "category_not_found", "ไม่พบหมวดหมู่");
      throw new RequestError(409, "category_exists", "มีหมวดหมู่นี้อยู่แล้ว");
    }
    const updated = await DB.prepare(`${CATEGORY_QUERY} WHERE c.id = ? GROUP BY c.id`).bind(pendingUploadPattern(), id).first();
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
    const deleted = await DB.prepare(
      "DELETE FROM categories WHERE id = ? " +
        "AND NOT EXISTS (SELECT 1 FROM receipts WHERE category = (SELECT name FROM categories WHERE id = ?))",
    )
      .bind(id, id)
      .run();
    if (Number(deleted.meta?.changes ?? 0) === 0) {
      const latest = await DB.prepare("SELECT id FROM categories WHERE id = ?").bind(id).first();
      if (!latest) throw new RequestError(404, "category_not_found", "ไม่พบหมวดหมู่");
      throw new RequestError(409, "category_in_use", "ย้ายเอกสารออกจากหมวดหมู่นี้ก่อน");
    }
    return noContent();
  } catch (error) {
    return errorResponse(error);
  }
}

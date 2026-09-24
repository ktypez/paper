import { toCategory } from "../_lib/records.js";
import { errorResponse, json, readJsonObject, RequestError } from "../_lib/http.js";
import { pendingUploadPattern, requiredText } from "../_lib/validation.js";

export async function onRequestGet(context) {
  try {
    const { results } = await context.env.receipts_db.prepare(
      "SELECT c.id, c.name, c.created_at, c.sort_order, COUNT(r.id) AS receipt_count " +
        "FROM categories c LEFT JOIN receipts r ON r.category = c.name " +
        "AND r.filename NOT LIKE ? ESCAPE '\\' " +
        "GROUP BY c.id ORDER BY c.sort_order, c.created_at, c.name",
    ).bind(pendingUploadPattern()).all();
    return json(results.map(toCategory), 200, { "Cache-Control": "private, max-age=30" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost(context) {
  try {
    const { receipts_db: DB } = context.env;
    const body = await readJsonObject(context.request);
    if (Object.keys(body).some((key) => key !== "name")) {
      throw new RequestError(400, "unknown_field", "มีข้อมูลที่เพิ่มไม่ได้");
    }
    const name = requiredText(body.name, "ชื่อหมวดหมู่", 80);

    const last = await DB.prepare("SELECT sort_order FROM categories ORDER BY sort_order DESC, created_at DESC LIMIT 1")
      .first();
    const category = {
      id: crypto.randomUUID(),
      name,
      created_at: new Date().toISOString(),
      sort_order: (last?.sort_order ?? -1) + 1,
    };
    const inserted = await DB.prepare(
      "INSERT INTO categories (id, name, created_at, sort_order) " +
        "SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = ? COLLATE NOCASE)",
    )
      .bind(category.id, category.name, category.created_at, category.sort_order, name)
      .run();
    if (Number(inserted.meta?.changes ?? 0) === 0) {
      throw new RequestError(409, "category_exists", "มีหมวดหมู่นี้อยู่แล้ว");
    }
    return json(toCategory(category), 201);
  } catch (error) {
    return errorResponse(error);
  }
}

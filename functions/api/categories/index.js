import { toCategory } from "../_lib/records.js";
import { errorResponse, json, RequestError } from "../_lib/http.js";
import { requiredText } from "../_lib/validation.js";

export async function onRequestGet(context) {
  try {
    const { results } = await context.env.receipts_db.prepare(
      "SELECT c.id, c.name, c.created_at, c.sort_order, COUNT(r.id) AS receipt_count " +
        "FROM categories c LEFT JOIN receipts r ON r.category = c.name " +
        "GROUP BY c.id ORDER BY c.sort_order, c.created_at, c.name",
    ).all();
    return json(results.map(toCategory), 200, { "Cache-Control": "private, max-age=30" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost(context) {
  try {
    const { receipts_db: DB } = context.env;
    const body = await readJson(context.request);
    if (Object.keys(body).some((key) => key !== "name")) {
      throw new RequestError(400, "unknown_field", "มีข้อมูลที่เพิ่มไม่ได้");
    }
    const name = requiredText(body.name, "ชื่อหมวดหมู่", 80);
    const duplicate = await DB.prepare("SELECT id FROM categories WHERE name = ? COLLATE NOCASE")
      .bind(name)
      .first();
    if (duplicate) throw new RequestError(409, "category_exists", "มีหมวดหมู่นี้อยู่แล้ว");

    const last = await DB.prepare("SELECT sort_order FROM categories ORDER BY sort_order DESC, created_at DESC LIMIT 1")
      .first();
    const category = {
      id: crypto.randomUUID(),
      name,
      created_at: new Date().toISOString(),
      sort_order: (last?.sort_order ?? -1) + 1,
    };
    await DB.prepare("INSERT INTO categories (id, name, created_at, sort_order) VALUES (?, ?, ?, ?)")
      .bind(category.id, category.name, category.created_at, category.sort_order)
      .run();
    return json(toCategory(category), 201);
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

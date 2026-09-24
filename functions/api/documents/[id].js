import { toDocument } from "../_lib/records.js";
import { errorResponse, json, noContent, readJsonObject, RequestError } from "../_lib/http.js";
import { isPendingUpload, optionalText, requiredText } from "../_lib/validation.js";

const COLUMNS = "id, filename, category, owner, notes, content_type, size, uploaded_at, thumb_key";

export async function onRequestGet(context) {
  try {
    const id = requiredText(context.params.id, "รหัสเอกสาร", 100);
    const row = await context.env.receipts_db
      .prepare(`SELECT ${COLUMNS} FROM receipts WHERE id = ?`)
      .bind(id)
      .first();
    if (!row) throw new RequestError(404, "document_not_found", "ไม่พบเอกสาร");
    if (isPendingUpload(row)) throw new RequestError(409, "upload_in_progress", "อัปโหลดกำลังดำเนินการ");
    return json(toDocument(row), 200, { "Cache-Control": "private, max-age=10" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPatch(context) {
  try {
    const { receipts_db: DB } = context.env;
    const id = requiredText(context.params.id, "รหัสเอกสาร", 100);
    const body = await readJsonObject(context.request);
    const existing = await DB.prepare("SELECT id, filename FROM receipts WHERE id = ?").bind(id).first();
    if (!existing) throw new RequestError(404, "document_not_found", "ไม่พบเอกสาร");
    if (isPendingUpload(existing)) throw new RequestError(409, "upload_in_progress", "อัปโหลดกำลังดำเนินการ");

    const assignments = [];
    const values = [];
    let categoryCondition = "";
    let categoryName;
    const allowed = new Set(["filename", "category", "owner", "notes"]);
    if (Object.keys(body).some((key) => !allowed.has(key))) {
      throw new RequestError(400, "unknown_field", "มีข้อมูลที่แก้ไขไม่ได้");
    }

    if (Object.hasOwn(body, "filename")) {
      assignments.push("filename = ?");
      values.push(requiredText(body.filename, "ชื่อเอกสาร", 180));
    }
    if (Object.hasOwn(body, "category")) {
      categoryName = requiredText(body.category, "หมวดหมู่", 80);
      const category = await DB.prepare("SELECT name FROM categories WHERE name = ?")
        .bind(categoryName)
        .first();
      if (!category) throw new RequestError(400, "category_not_found", "ไม่พบหมวดหมู่นี้");
      assignments.push("category = ?");
      values.push(category.name);
      categoryCondition = " AND EXISTS (SELECT 1 FROM categories WHERE name = ?)";
    }
    if (Object.hasOwn(body, "owner")) {
      assignments.push("owner = ?");
      values.push(optionalText(body.owner, 120));
    }
    if (Object.hasOwn(body, "notes")) {
      assignments.push("notes = ?");
      values.push(optionalText(body.notes, 4000));
    }
    if (!assignments.length) {
      throw new RequestError(400, "empty_patch", "ไม่มีข้อมูลที่ต้องแก้ไข");
    }

    values.push(id, ...(categoryCondition ? [categoryName] : []));
    const updated = await DB.prepare(
      `UPDATE receipts SET ${assignments.join(", ")} WHERE id = ?${categoryCondition}`,
    )
      .bind(...values)
      .run();
    if (Number(updated.meta?.changes ?? 0) === 0) {
      const latest = await DB.prepare("SELECT id FROM receipts WHERE id = ?").bind(id).first();
      if (!latest) throw new RequestError(404, "document_not_found", "ไม่พบเอกสาร");
      throw new RequestError(400, "category_not_found", "ไม่พบหมวดหมู่นี้");
    }
    const row = await DB.prepare(`SELECT ${COLUMNS} FROM receipts WHERE id = ?`).bind(id).first();
    return json(toDocument(row));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestDelete(context) {
  try {
    const { receipts_db: DB, BUCKET } = context.env;
    const id = requiredText(context.params.id, "รหัสเอกสาร", 100);
    const row = await DB.prepare("SELECT filename, thumb_key FROM receipts WHERE id = ?").bind(id).first();
    if (!row) throw new RequestError(404, "document_not_found", "ไม่พบเอกสาร");
    if (isPendingUpload(row)) throw new RequestError(409, "upload_in_progress", "อัปโหลดกำลังดำเนินการ");

    await DB.prepare("DELETE FROM receipts WHERE id = ?").bind(id).run();
    const keys = row.thumb_key ? [id, row.thumb_key] : [id];
    const deletions = await Promise.allSettled(keys.map((key) => BUCKET.delete(key)));
    if (deletions.some((result) => result.status === "rejected")) {
      console.error("Document row deleted but one or more R2 objects could not be removed", { id });
    }
    return noContent();
  } catch (error) {
    return errorResponse(error);
  }
}

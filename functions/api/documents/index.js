import { toDocument } from "../_lib/records.js";
import { errorResponse, json, RequestError } from "../_lib/http.js";
import {
  buildFtsQuery,
  buildLikePattern,
  decodeCursor,
  detectFileType,
  encodeCursor,
  hasThai,
  MAX_FILE_SIZE,
  MAX_THUMBNAIL_SIZE,
  optionalText,
  parseLimit,
  requiredText,
  SUPPORTED_FILE_TYPES,
  SUPPORTED_THUMBNAIL_TYPES,
} from "../_lib/validation.js";

const DOCUMENT_COLUMNS =
  "r.id, r.filename, r.category, r.owner, r.notes, r.content_type, r.size, r.uploaded_at, r.thumb_key";

export async function onRequestGet(context) {
  try {
    const { receipts_db: DB } = context.env;
    const url = new URL(context.request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const category = optionalText(url.searchParams.get("category"), 80);
    const owner = optionalText(url.searchParams.get("owner"), 120);
    const search = optionalText(url.searchParams.get("q"), 200);
    const cursorValue = url.searchParams.get("cursor");
    const cursor = cursorValue ? decodeCursor(cursorValue) : null;
    const where = [];
    const values = [];

    if (category) {
      where.push("r.category = ?");
      values.push(category);
    }
    if (owner) {
      where.push("r.owner = ?");
      values.push(owner);
    }
    if (search) {
      if (hasThai(search)) {
        const pattern = buildLikePattern(search);
        where.push(
          "(r.filename LIKE ? ESCAPE '\\' OR r.notes LIKE ? ESCAPE '\\' OR r.owner LIKE ? ESCAPE '\\' OR r.category LIKE ? ESCAPE '\\')",
        );
        values.push(pattern, pattern, pattern, pattern);
      } else {
        where.push("r.rowid IN (SELECT rowid FROM receipts_fts WHERE receipts_fts MATCH ?)");
        values.push(buildFtsQuery(search));
      }
    }
    if (cursor) {
      where.push("(r.uploaded_at < ? OR (r.uploaded_at = ? AND r.id < ?))");
      values.push(cursor.uploadedAt, cursor.uploadedAt, cursor.id);
    }

    const sql =
      `SELECT ${DOCUMENT_COLUMNS}, COUNT(*) OVER() AS total_count FROM receipts r` +
      (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
      " ORDER BY r.uploaded_at DESC, r.id DESC LIMIT ?";
    values.push(limit + 1);
    const { results } = await DB.prepare(sql).bind(...values).all();
    const hasNextPage = results.length > limit;
    const rows = hasNextPage ? results.slice(0, limit) : results;
    const last = rows.at(-1);
    const nextCursor = hasNextPage ? encodeCursor(last.uploaded_at, last.id) : null;

    return json(
      {
        items: rows.map(toDocument),
        nextCursor,
        total: rows[0]?.total_count ?? 0,
      },
      200,
      { "Cache-Control": "private, max-age=10" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost(context) {
  const writtenKeys = [];
  try {
    const { receipts_db: DB, BUCKET } = context.env;
    const contentType = context.request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new RequestError(415, "unsupported_media_type", "ต้องใช้ multipart/form-data");
    }

    const form = await context.request.formData();
    const file = form.get("file");
    const thumbnail = form.get("thumb");
    if (!(file instanceof File) || file.size === 0) {
      throw new RequestError(400, "file_required", "เลือกไฟล์ที่ต้องการเพิ่ม");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new RequestError(413, "file_too_large", "ไฟล์ต้องมีขนาดไม่เกิน 10 MB");
    }

    const detectedType = await detectFileType(file);
    if (!detectedType || !SUPPORTED_FILE_TYPES.has(detectedType)) {
      throw new RequestError(415, "unsupported_file", "รองรับเฉพาะ JPEG, PNG, WebP และ PDF");
    }

    const clientId = optionalText(form.get("client_id"), 100);
    if (clientId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientId)) {
      throw new RequestError(400, "invalid_client_id", "รหัสคำขออัปโหลดไม่ถูกต้อง");
    }
    const id = clientId ?? crypto.randomUUID();
    const existing = await DB.prepare(
      "SELECT id, filename, category, owner, notes, content_type, size, uploaded_at, thumb_key FROM receipts WHERE id = ?",
    )
      .bind(id)
      .first();
    if (existing) return json(toDocument(existing), 200);

    const filename = requiredText(form.get("filename") || file.name, "ชื่อเอกสาร", 180);
    const categoryName = requiredText(form.get("category"), "หมวดหมู่", 80);
    const owner = optionalText(form.get("owner"), 120);
    const notes = optionalText(form.get("notes"), 4000);
    const category = await DB.prepare("SELECT name FROM categories WHERE name = ?")
      .bind(categoryName)
      .first();
    if (!category) throw new RequestError(400, "category_not_found", "ไม่พบหมวดหมู่นี้");

    let thumbKey = null;
    let thumbnailType = null;
    if (thumbnail instanceof File && thumbnail.size > 0) {
      if (thumbnail.size > MAX_THUMBNAIL_SIZE) {
        throw new RequestError(413, "thumbnail_too_large", "ภาพตัวอย่างมีขนาดใหญ่เกินกำหนด");
      }
      thumbnailType = await detectFileType(thumbnail);
      if (!thumbnailType || !SUPPORTED_THUMBNAIL_TYPES.has(thumbnailType)) {
        throw new RequestError(415, "invalid_thumbnail", "ภาพตัวอย่างไม่ถูกต้อง");
      }
      thumbKey = `${crypto.randomUUID()}-thumb`;
    }

    const uploadedAt = new Date().toISOString();
    const puts = [
      BUCKET.put(id, file.stream(), {
        httpMetadata: { contentType: detectedType, cacheControl: "private, max-age=3600" },
        customMetadata: { receiptId: id },
      }).then((result) => {
        writtenKeys.push(id);
        return result;
      }),
    ];
    if (thumbKey && thumbnail instanceof File && thumbnailType) {
      puts.push(
        BUCKET.put(thumbKey, thumbnail.stream(), {
          httpMetadata: { contentType: thumbnailType, cacheControl: "private, max-age=31536000, immutable" },
          customMetadata: { receiptId: id, variant: "preview" },
        }).then((result) => {
          writtenKeys.push(thumbKey);
          return result;
        }),
      );
    }

    await Promise.all(puts);
    const insert = await DB.prepare(
      "INSERT OR IGNORE INTO receipts (id, filename, category, owner, notes, content_type, size, uploaded_at, thumb_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(id, filename, category.name, owner, notes, detectedType, file.size, uploadedAt, thumbKey)
      .run();
    if (Number(insert.meta?.changes ?? 1) === 0) {
      const concurrent = await DB.prepare(
        "SELECT id, filename, category, owner, notes, content_type, size, uploaded_at, thumb_key FROM receipts WHERE id = ?",
      )
        .bind(id)
        .first();
      if (!concurrent) throw new RequestError(409, "upload_race", "เอกสารกำลังถูกประมวลผล กรุณาลองอีกครั้ง");
      return json(toDocument(concurrent), 200);
    }

    return json(
      {
        id,
        filename,
        category: category.name,
        owner,
        notes,
        contentType: detectedType,
        size: file.size,
        uploadedAt,
        hasPreview: Boolean(thumbKey),
      },
      201,
    );
  } catch (error) {
    await Promise.allSettled(writtenKeys.map((key) => context.env.BUCKET.delete(key)));
    return errorResponse(error);
  }
}

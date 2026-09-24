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
  MAX_UPLOAD_BODY_SIZE,
  MIN_THAI_SEARCH_LENGTH,
  isPendingUpload,
  optionalText,
  PENDING_UPLOAD_PREFIX,
  PENDING_UPLOAD_TTL_MS,
  parseLimit,
  pendingUploadPattern,
  requiredText,
  SUPPORTED_FILE_TYPES,
  SUPPORTED_THUMBNAIL_TYPES,
} from "../_lib/validation.js";

const DOCUMENT_COLUMNS =
  "r.id, r.filename, r.category, r.owner, r.content_type, r.size, r.uploaded_at, r.thumb_key";

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
    if (search && hasThai(search) && search.length < MIN_THAI_SEARCH_LENGTH) {
      return json({ items: [], nextCursor: null, total: 0 }, 200, { "Cache-Control": "private, max-age=10" });
    }
    const baseWhere = ["r.filename NOT LIKE ? ESCAPE '\\'"];
    const baseValues = [pendingUploadPattern()];

    if (category) {
      baseWhere.push("r.category = ?");
      baseValues.push(category);
    }
    if (owner) {
      baseWhere.push("r.owner = ?");
      baseValues.push(owner);
    }
    if (search) {
      if (hasThai(search)) {
        const pattern = buildLikePattern(search);
        baseWhere.push(
          "(r.filename LIKE ? ESCAPE '\\' OR r.notes LIKE ? ESCAPE '\\' OR r.owner LIKE ? ESCAPE '\\' OR r.category LIKE ? ESCAPE '\\')",
        );
        baseValues.push(pattern, pattern, pattern, pattern);
      } else {
        baseWhere.push("r.rowid IN (SELECT rowid FROM receipts_fts WHERE receipts_fts MATCH ?)");
        baseValues.push(buildFtsQuery(search));
      }
    }

    const pageWhere = [...baseWhere];
    const pageValues = [...baseValues];
    if (cursor) {
      pageWhere.push("(r.uploaded_at < ? OR (r.uploaded_at = ? AND r.id < ?))");
      pageValues.push(cursor.uploadedAt, cursor.uploadedAt, cursor.id);
    }

    const pageSql =
      `SELECT ${DOCUMENT_COLUMNS} FROM receipts r` +
      (pageWhere.length ? ` WHERE ${pageWhere.join(" AND ")}` : "") +
      " ORDER BY r.uploaded_at DESC, r.id DESC LIMIT ?";
    const countSql =
      "SELECT COUNT(*) AS total_count FROM receipts r" +
      (baseWhere.length ? ` WHERE ${baseWhere.join(" AND ")}` : "");
    pageValues.push(limit + 1);
    const [pageResult, countResult] = await Promise.all([
      DB.prepare(pageSql).bind(...pageValues).all(),
      DB.prepare(countSql).bind(...baseValues).all(),
    ]);
    const results = pageResult.results;
    const hasNextPage = results.length > limit;
    const rows = hasNextPage ? results.slice(0, limit) : results;
    const last = rows.at(-1);
    const nextCursor = hasNextPage ? encodeCursor(last.uploaded_at, last.id) : null;

    return json(
      {
        items: rows.map(toDocument),
        nextCursor,
        total: countResult.results[0]?.total_count ?? 0,
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
  let id;
  let claimFilename;
  let claimOwned = false;
  let preserveClaim = false;
  let committed = false;
  try {
    const { receipts_db: DB, BUCKET } = context.env;
    const contentType = context.request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new RequestError(415, "unsupported_media_type", "ต้องใช้ multipart/form-data");
    }
    const contentLengthHeader = context.request.headers.get("content-length");
    if (contentLengthHeader !== null) {
      const contentLength = Number(contentLengthHeader);
      if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > MAX_UPLOAD_BODY_SIZE) {
        throw new RequestError(413, "upload_too_large", "ไฟล์และข้อมูลมีขนาดใหญ่เกินกำหนด");
      }
    }

    let form;
    try {
      form = await context.request.formData();
    } catch {
      throw new RequestError(400, "invalid_form", "รูปแบบไฟล์ที่ส่งมาไม่ถูกต้อง");
    }
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
    id = clientId ?? crypto.randomUUID();
    const existing = await DB.prepare(
      "SELECT id, filename, category, owner, notes, content_type, size, uploaded_at, thumb_key FROM receipts WHERE id = ?",
    )
      .bind(id)
      .first();
    if (existing && !isPendingUpload(existing)) return json(toDocument(existing), 200);

    const filename = requiredText(form.get("filename") || file.name, "ชื่อเอกสาร", 180);
    if (filename.startsWith(PENDING_UPLOAD_PREFIX)) {
      throw new RequestError(400, "reserved_filename", "ชื่อเอกสารไม่ถูกต้อง");
    }
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
    claimFilename = `${PENDING_UPLOAD_PREFIX}${crypto.randomUUID()}`;
    const claim = await DB.prepare(
      "INSERT OR IGNORE INTO receipts (id, filename, category, owner, notes, content_type, size, uploaded_at, thumb_key) " +
        "SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? " +
        "WHERE EXISTS (SELECT 1 FROM categories WHERE name = ?)",
    )
      .bind(id, claimFilename, category.name, owner, notes, detectedType, file.size, uploadedAt, thumbKey, category.name)
      .run();
    claimOwned = Number(claim.meta?.changes ?? 0) === 1;

    if (!claimOwned) {
      const categoryStillExists = await DB.prepare("SELECT name FROM categories WHERE name = ?")
        .bind(category.name)
        .first();
      if (!categoryStillExists) throw new RequestError(400, "category_not_found", "ไม่พบหมวดหมู่นี้");
      const concurrent = await DB.prepare(
        "SELECT id, filename, category, owner, notes, content_type, size, uploaded_at, thumb_key FROM receipts WHERE id = ?",
      )
        .bind(id)
        .first();
      if (!concurrent || !isPendingUpload(concurrent)) {
        if (concurrent) return json(toDocument(concurrent), 200);
        throw new RequestError(409, "upload_race", "เอกสารกำลังถูกประมวลผล กรุณาลองอีกครั้ง");
      }
      const age = Date.now() - Date.parse(concurrent.uploaded_at);
      if (!Number.isFinite(age) || age < PENDING_UPLOAD_TTL_MS) {
        throw new RequestError(409, "upload_in_progress", "อัปโหลดเดิมยังไม่เสร็จ กรุณาลองอีกครั้ง");
      }
      claimFilename = `${PENDING_UPLOAD_PREFIX}${crypto.randomUUID()}`;
      const takeover = await DB.prepare(
        "UPDATE receipts SET filename = ?, category = ?, owner = ?, notes = ?, content_type = ?, size = ?, thumb_key = ?, uploaded_at = ? " +
          "WHERE id = ? AND filename = ? AND uploaded_at = ?",
      )
        .bind(
          claimFilename,
          category.name,
          owner,
          notes,
          detectedType,
          file.size,
          thumbKey,
          uploadedAt,
          id,
          concurrent.filename,
          concurrent.uploaded_at,
        )
        .run();
      if (Number(takeover.meta?.changes ?? 0) === 0) {
        throw new RequestError(409, "upload_in_progress", "อัปโหลดเดิมยังไม่เสร็จ กรุณาลองอีกครั้ง");
      }
      claimOwned = true;
    }

    // A retried client id must never replace bytes already stored under the receipt key.
    const original = await BUCKET.put(id, file.stream(), {
      onlyIf: { etagDoesNotMatch: "*" },
      httpMetadata: { contentType: detectedType, cacheControl: "private, max-age=3600" },
      customMetadata: { receiptId: id },
    });
    if (!original) {
      preserveClaim = true;
      throw new RequestError(409, "upload_race", "เอกสารกำลังถูกประมวลผล กรุณาลองอีกครั้ง");
    }
    writtenKeys.push(id);

    if (thumbKey && thumbnail instanceof File && thumbnailType) {
      const preview = await BUCKET.put(thumbKey, thumbnail.stream(), {
        httpMetadata: { contentType: thumbnailType, cacheControl: "private, max-age=31536000, immutable" },
        customMetadata: { receiptId: id, variant: "preview" },
      });
      if (!preview) throw new Error("thumbnail write failed");
      writtenKeys.push(thumbKey);
    }

    const finalized = await DB.prepare(
      "UPDATE receipts SET filename = ?, thumb_key = ? WHERE id = ? AND filename = ?",
    )
      .bind(filename, thumbKey, id, claimFilename)
      .run();
    if (Number(finalized.meta?.changes ?? 0) === 0) {
      throw new RequestError(409, "upload_race", "เอกสารกำลังถูกประมวลผล กรุณาลองอีกครั้ง");
    }
    committed = true;

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
    if (claimOwned && !preserveClaim && !committed && claimFilename) {
      try {
        await context.env.receipts_db
          .prepare("DELETE FROM receipts WHERE id = ? AND filename = ?")
          .bind(id, claimFilename)
          .run();
      } catch {
        // Keep the original upload error; reconciliation can remove an orphaned claim.
      }
    }
    await Promise.allSettled(writtenKeys.map((key) => context.env.BUCKET.delete(key)));
    return errorResponse(error);
  }
}

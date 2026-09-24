import { errorResponse, RequestError } from "../../_lib/http.js";
import {
  inlineDisposition,
  parseRange,
  requiredText,
  safeFileContentType,
  isPendingUpload,
} from "../../_lib/validation.js";

export async function onRequestGet(context) {
  try {
    const { receipts_db: DB, BUCKET } = context.env;
    const id = requiredText(context.params.id, "รหัสเอกสาร", 100);
    const url = new URL(context.request.url);
    const variant = url.searchParams.get("variant") ?? "preview";
    if (variant !== "preview" && variant !== "original") {
      throw new RequestError(400, "invalid_variant", "ชนิดไฟล์ไม่ถูกต้อง");
    }

    const row = await DB.prepare(
      "SELECT filename, content_type, thumb_key FROM receipts WHERE id = ?",
    )
      .bind(id)
      .first();
    if (!row) throw new RequestError(404, "document_not_found", "ไม่พบเอกสาร");
    if (isPendingUpload(row)) throw new RequestError(409, "upload_in_progress", "อัปโหลดกำลังดำเนินการ");

    const rangeHeader = context.request.headers.get("range");
    const range = rangeHeader ? parseRange(rangeHeader) : undefined;
    let key = id;
    let preview = false;
    if (variant === "preview" && row.thumb_key) {
      const object = await getObject(BUCKET, row.thumb_key, range);
      if (object) {
        key = row.thumb_key;
        preview = true;
        return fileResponse(context, object, row.filename, row.content_type, preview, rangeHeader);
      }
    }

    const object = await getObject(BUCKET, key, range);
    if (!object) throw new RequestError(404, "file_not_found", "ไม่พบไฟล์ต้นฉบับ");
    return fileResponse(context, object, row.filename, row.content_type, preview, rangeHeader);
  } catch (error) {
    return errorResponse(error);
  }
}

async function getObject(bucket, key, range) {
  try {
    return await bucket.get(key, range ? { range } : undefined);
  } catch (error) {
    if (range) throw new RequestError(416, "invalid_range", "ช่วงข้อมูลไม่ถูกต้อง");
    throw error;
  }
}

function fileResponse(context, object, filename, fallbackType, preview, rangeHeader) {
  const etag = String(object.etag ?? "").replace(/^"|"$/g, "");
  const contentType = safeFileContentType(fallbackType);
  const disposition = contentType === "application/octet-stream" ? "attachment" : "inline";
  const headers = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": preview ? "private, max-age=31536000, immutable" : "private, max-age=3600",
    "Content-Disposition": inlineDisposition(filename).replace(/^inline/, disposition),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": "frame-ancestors 'self'",
    "Cross-Origin-Resource-Policy": "same-origin",
    Vary: "Authorization, Cookie",
  };
  if (etag) headers.ETag = `"${etag}"`;

  const ifNoneMatch = context.request.headers.get("if-none-match");
  if (etag && ifNoneMatch?.split(",").some((value) => value.trim().replace(/^W\//, "") === `"${etag}"`)) {
    return new Response(null, { status: 304, headers });
  }

  if (rangeHeader && object.range) {
    headers["Content-Range"] = `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`;
    headers["Content-Length"] = String(object.range.length);
    return new Response(object.body, { status: 206, headers });
  }

  headers["Content-Length"] = String(object.size);
  return new Response(object.body, { status: 200, headers });
}

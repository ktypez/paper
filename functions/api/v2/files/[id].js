// GET /api/v2/files/:id?variant=thumb|orig (default thumb when available)
//
// - Thumbnails are immutable (R2 key never reused) → 1-year immutable cache.
// - Originals carry ETag + Accept-Ranges so PDFs can seek and clients can
//   revalidate instead of re-downloading.
export async function onRequestGet(context) {
  const { receipts_db: DB, BUCKET } = context.env;
  const id = context.params.id;
  if (!id) return new Response("ไม่พบไอดี", { status: 400 });

  const url = new URL(context.request.url);
  const variant = url.searchParams.get("variant") || "thumb";

  let key = id;
  let immutable = false;
  if (variant === "thumb") {
    const row = await DB.prepare("SELECT thumb_key FROM receipts WHERE id = ?")
      .bind(id)
      .first();
    if (!row) return new Response("ไม่พบไฟล์", { status: 404 });
    if (row.thumb_key) {
      key = row.thumb_key;
      immutable = true;
    }
    // No thumb stored (legacy rows): fall back to the original.
  }

  const range = context.request.headers.get("range");
  let obj;
  try {
    obj = range
      ? await BUCKET.get(key, { range: parseRange(range) })
      : await BUCKET.get(key);
  } catch {
    return new Response("ช่วงข้อมูลไม่ถูกต้อง", { status: 416 });
  }
  if (!obj) return new Response("ไม่พบไฟล์", { status: 404 });

  const headers = {
    "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
    "Accept-Ranges": "bytes",
    ETag: `"${obj.etag}"`,
  };

  const ifNoneMatch = context.request.headers.get("if-none-match");
  if (ifNoneMatch && obj.etag && ifNoneMatch.includes(obj.etag)) {
    return new Response(null, { status: 304, headers });
  }

  if (immutable) {
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  } else {
    headers["Cache-Control"] = "public, max-age=3600";
  }

  if (range && obj.range) {
    headers["Content-Range"] = `bytes ${obj.range.offset}-${obj.range.offset + obj.range.length - 1}/${obj.size}`;
    headers["Content-Length"] = String(obj.range.length);
    return new Response(obj.body, { status: 206, headers });
  }
  headers["Content-Length"] = String(obj.size);
  return new Response(obj.body, { headers });
}

function parseRange(header) {
  const m = /^bytes=(\d*)-(\d*)$/.exec((header || "").trim());
  if (!m) throw new Error("bad range");
  const hasStart = m[1] !== "";
  const hasEnd = m[2] !== "";
  if (!hasStart && !hasEnd) throw new Error("bad range");
  if (!hasStart) return { suffix: parseInt(m[2], 10) }; // last N bytes
  const offset = parseInt(m[1], 10);
  if (hasEnd) return { offset, length: parseInt(m[2], 10) - offset + 1 };
  return { offset };
}

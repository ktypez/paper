const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_THUMB = ["image/webp", "image/jpeg"];
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_THUMB = 256 * 1024;

// POST /api/v2/upload (multipart/form-data)
//   file: original (required) · thumb: pre-generated client thumbnail (optional,
//   required for images) · category, owner, notes
export async function onRequestPost(context) {
  const { receipts_db: DB, BUCKET } = context.env;
  const ct = context.request.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return json({ error: "ต้องใช้ multipart/form-data" }, 400);
  }

  const formData = await context.request.formData();
  const file = formData.get("file");
  const thumb = formData.get("thumb");
  const category = formData.get("category");
  const owner = (formData.get("owner") || "").toString().trim() || null;
  const notes = formData.get("notes")?.toString() || null;

  if (!file || typeof file === "string" || !category) {
    return json({ error: "ต้องส่งไฟล์และหมวดหมู่" }, 400);
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return json({ error: "ชนิดไฟล์ไม่รองรับ ใช้ jpeg, png, webp หรือ pdf" }, 400);
  }
  if (file.size > MAX_SIZE) {
    return json({ error: "ขนาดไฟล์ใหญ่เกิน 10MB" }, 400);
  }

  const isImage = file.type.startsWith("image/");
  let thumbKey = null;
  if (thumb && typeof thumb !== "string") {
    if (!ALLOWED_THUMB.includes(thumb.type) || thumb.size > MAX_THUMB) {
      return json({ error: "thumbnail ไม่ถูกต้อง" }, 400);
    }
    thumbKey = `${crypto.randomUUID()}-thumb`;
  } else if (isImage) {
    return json({ error: "รูปภาพต้องส่ง thumbnail มาด้วย" }, 400);
  }

  const catRow = await DB.prepare("SELECT name FROM categories WHERE name = ?")
    .bind(category.toString())
    .first();
  if (!catRow) return json({ error: "ไม่พบหมวดหมู่นี้" }, 400);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // R2 writes in parallel; D1 insert after (single round-trip).
  const puts = [
    BUCKET.put(id, file.stream(), { httpMetadata: { contentType: file.type } }),
  ];
  if (thumbKey) {
    puts.push(
      BUCKET.put(thumbKey, thumb.stream(), { httpMetadata: { contentType: thumb.type } })
    );
  }
  await Promise.all(puts);
  await DB.prepare(
    "INSERT INTO receipts (id, filename, category, owner, content_type, size, uploaded_at, notes, thumb_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, file.name, catRow.name, owner, file.type, file.size, now, notes, thumbKey)
    .run();

  return json(
    {
      id,
      filename: file.name,
      category: catRow.name,
      owner,
      content_type: file.type,
      size: file.size,
      uploaded_at: now,
      notes,
      thumb_key: thumbKey,
    },
    201
  );
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_SIZE = 10 * 1024 * 1024;

export async function onRequestPost(context) {
  const { receipts_db: DB, BUCKET } = context.env;
  const ct = context.request.headers.get("content-type") || "";

  if (!ct.includes("multipart/form-data")) {
    return new Response(JSON.stringify({ error: "ต้องใช้ multipart/form-data" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const formData = await context.request.formData();
  const file = formData.get("file");
  const category = formData.get("category");
  const owner = (formData.get("owner") || "").trim() || null;
  const notes = formData.get("notes") || null;

  if (!file || !category) {
    return new Response(JSON.stringify({ error: "ต้องส่งไฟล์และหมวดหมู่" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response(
      JSON.stringify({ error: "ชนิดไฟล์ไม่รองรับ ใช้ jpeg, png, webp หรือ pdf" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (file.size > MAX_SIZE) {
    return new Response(
      JSON.stringify({ error: "ขนาดไฟล์ใหญ่เกิน 10MB" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const catRow = await DB.prepare("SELECT name FROM categories WHERE name = ?")
    .bind(category)
    .first();
  if (!catRow) {
    return new Response(
      JSON.stringify({ error: "ไม่พบหมวดหมู่นี้" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const id = crypto.randomUUID();
  await BUCKET.put(id, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const now = new Date().toISOString();
  await DB.prepare(
    "INSERT INTO receipts (id, filename, category, owner, content_type, size, uploaded_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, file.name, catRow.name, owner, file.type, file.size, now, notes)
    .run();

  return new Response(
    JSON.stringify({ id, filename: file.name, category: catRow.name, owner, uploaded_at: now, notes }),
    { status: 201, headers: { "Content-Type": "application/json" } }
  );
}

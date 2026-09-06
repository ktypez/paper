const COLS =
  "id, filename, category, owner, content_type, size, uploaded_at, notes, thumb_key";

export async function onRequestGet(context) {
  const { receipts_db: DB } = context.env;
  const id = context.params.id;
  if (!id) return json({ error: "Missing id" }, 400);
  const row = await DB.prepare(`SELECT ${COLS} FROM receipts WHERE id = ?`).bind(id).first();
  if (!row) return json({ error: "ไม่พบเอกสาร" }, 404);
  return json(row);
}

// Single-statement partial update (v1 did up to 4 sequential UPDATEs).
export async function onRequestPut(context) {
  const { receipts_db: DB } = context.env;
  const id = context.params.id;
  if (!id) return json({ error: "Missing id" }, 400);

  const body = await context.request.json();
  const sets = [];
  const params = [];

  if (body.filename !== undefined) {
    if (typeof body.filename !== "string" || !body.filename.trim()) {
      return json({ error: "Invalid filename" }, 400);
    }
    sets.push("filename = ?");
    params.push(body.filename.trim());
  }
  if (body.category !== undefined) {
    if (typeof body.category !== "string" || !body.category.trim()) {
      return json({ error: "Invalid category" }, 400);
    }
    const cat = await DB.prepare("SELECT name FROM categories WHERE name = ?")
      .bind(body.category.trim())
      .first();
    if (!cat) return json({ error: "Category not found" }, 400);
    sets.push("category = ?");
    params.push(body.category.trim());
  }
  if (body.notes !== undefined) {
    sets.push("notes = ?");
    params.push(body.notes);
  }
  if (body.owner !== undefined) {
    const value = body.owner === null ? null : String(body.owner).trim() || null;
    sets.push("owner = ?");
    params.push(value);
  }

  if (!sets.length) return json({ error: "ไม่มีอะไรให้แก้" }, 400);
  params.push(id);
  await DB.prepare(`UPDATE receipts SET ${sets.join(", ")} WHERE id = ?`).bind(...params).run();
  const row = await DB.prepare(`SELECT ${COLS} FROM receipts WHERE id = ?`).bind(id).first();
  return json(row || { id });
}

export async function onRequestDelete(context) {
  const { receipts_db: DB, BUCKET } = context.env;
  const id = context.params.id;
  if (!id) return json({ error: "Missing id" }, 400);

  const row = await DB.prepare("SELECT thumb_key FROM receipts WHERE id = ?").bind(id).first();
  await DB.batch([
    DB.prepare("DELETE FROM receipts WHERE id = ?").bind(id),
  ]);
  await BUCKET.delete(id);
  if (row && row.thumb_key) await BUCKET.delete(row.thumb_key);

  return new Response(null, { status: 204 });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=10",
    },
  });
}

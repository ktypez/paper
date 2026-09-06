const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 30;

function encodeCursor(uploadedAt, id) {
  return btoa(`${uploadedAt}|${id}`).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeCursor(cursor) {
  let s = cursor.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const [uploadedAt, id] = atob(s).split("|");
  if (!uploadedAt || !id) throw new Error("bad cursor");
  return { uploadedAt, id };
}

function ftsQuery(q) {
  // Prefix-match each term; quote-escape for FTS5.
  return q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, '""')}"*`)
    .join(" ");
}

// GET /api/v2/receipts?cursor=&limit=&category=&owner=&q=
// → { items: [...], nextCursor: string | null }
export async function onRequestGet(context) {
  const { receipts_db: DB } = context.env;
  const url = new URL(context.request.url);

  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") || "", 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const category = url.searchParams.get("category") || null;
  const owner = url.searchParams.get("owner") || null;
  const q = (url.searchParams.get("q") || "").trim() || null;

  let cursor = null;
  if (url.searchParams.get("cursor")) {
    try {
      cursor = decodeCursor(url.searchParams.get("cursor"));
    } catch {
      return json({ error: "cursor ไม่ถูกต้อง" }, 400);
    }
  }

  const where = [];
  const params = [];
  if (category) {
    where.push("r.category = ?");
    params.push(category);
  }
  if (owner) {
    where.push("r.owner = ?");
    params.push(owner);
  }
  if (q) {
    where.push("r.rowid IN (SELECT rowid FROM receipts_fts WHERE receipts_fts MATCH ?)");
    params.push(ftsQuery(q));
  }
  if (cursor) {
    where.push("(r.uploaded_at < ? OR (r.uploaded_at = ? AND r.id < ?))");
    params.push(cursor.uploadedAt, cursor.uploadedAt, cursor.id);
  }

  const sql =
    "SELECT r.id, r.filename, r.category, r.owner, r.content_type, r.size, " +
    "r.uploaded_at, r.notes, r.thumb_key FROM receipts r" +
    (where.length ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY r.uploaded_at DESC, r.id DESC LIMIT ?";
  params.push(limit + 1);

  const { results } = await DB.prepare(sql).bind(...params).all();

  let nextCursor = null;
  let items = results;
  if (results.length > limit) {
    items = results.slice(0, limit);
    const last = items[items.length - 1];
    nextCursor = encodeCursor(last.uploaded_at, last.id);
  }

  return json({ items, nextCursor });
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

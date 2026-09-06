// GET /api/v2/categories — list with live receipt counts (single query,
// so the client never needs the receipts table for the categories view).
export async function onRequestGet(context) {
  const { receipts_db: DB } = context.env;
  const { results } = await DB.prepare(
    "SELECT c.id, c.name, c.created_at, c.sort_order, COUNT(r.id) AS count " +
      "FROM categories c LEFT JOIN receipts r ON r.category = c.name " +
      "GROUP BY c.id ORDER BY c.sort_order, c.created_at"
  ).all();
  return new Response(JSON.stringify(results), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=30",
    },
  });
}

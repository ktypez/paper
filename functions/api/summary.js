import { errorResponse, json } from "./_lib/http.js";

export async function onRequestGet(context) {
  try {
    const { receipts_db: DB } = context.env;
    const [counts, owners] = await DB.batch([
      DB.prepare(
        "SELECT " +
          "(SELECT COUNT(*) FROM receipts) AS document_count, " +
          "(SELECT COUNT(*) FROM categories) AS category_count, " +
          "(SELECT COUNT(*) FROM receipts r LEFT JOIN categories c ON c.name = r.category WHERE c.id IS NULL) AS uncategorized_count",
      ),
      DB.prepare(
        "SELECT DISTINCT owner FROM receipts WHERE owner IS NOT NULL AND trim(owner) <> '' ORDER BY owner COLLATE NOCASE",
      ),
    ]);
    const row = counts.results[0];
    return json(
      {
        documentCount: row.document_count,
        categoryCount: row.category_count,
        uncategorizedCount: row.uncategorized_count,
        owners: owners.results.map((item) => item.owner),
      },
      200,
      { "Cache-Control": "private, max-age=30" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

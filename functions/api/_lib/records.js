export function toDocument(row) {
  return {
    id: row.id,
    filename: row.filename,
    category: row.category,
    owner: row.owner ?? null,
    notes: row.notes ?? null,
    contentType: row.content_type,
    size: row.size,
    uploadedAt: row.uploaded_at,
    hasPreview: Boolean(row.thumb_key),
  };
}

export function toCategory(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    sortOrder: row.sort_order,
    documentCount: row.receipt_count ?? row.count ?? 0,
  };
}

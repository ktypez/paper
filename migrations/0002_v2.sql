-- v2 migration: thumbnails, full-text search, covering indexes.
-- Apply: wrangler d1 execute receipts-db --remote --file=migrations/0002_v2.sql
-- (local:  --local)

-- 1. Thumbnail R2 key per receipt (generated client-side at upload).
ALTER TABLE receipts ADD COLUMN thumb_key TEXT;

-- 2. Full-text search over filename + notes + owner + category.
CREATE VIRTUAL TABLE IF NOT EXISTS receipts_fts USING fts5(
  filename, notes, owner, category,
  content='receipts', content_rowid='rowid'
);

-- Backfill existing rows.
INSERT INTO receipts_fts(rowid, filename, notes, owner, category)
  SELECT rowid, filename, notes, owner, category FROM receipts;

-- Keep FTS in sync.
CREATE TRIGGER IF NOT EXISTS receipts_fts_ai AFTER INSERT ON receipts BEGIN
  INSERT INTO receipts_fts(rowid, filename, notes, owner, category)
    VALUES (new.rowid, new.filename, new.notes, new.owner, new.category);
END;
CREATE TRIGGER IF NOT EXISTS receipts_fts_ad AFTER DELETE ON receipts BEGIN
  INSERT INTO receipts_fts(receipts_fts, rowid, filename, notes, owner, category)
    VALUES ('delete', old.rowid, old.filename, old.notes, old.owner, old.category);
END;
CREATE TRIGGER IF NOT EXISTS receipts_fts_au AFTER UPDATE ON receipts BEGIN
  INSERT INTO receipts_fts(receipts_fts, rowid, filename, notes, owner, category)
    VALUES ('delete', old.rowid, old.filename, old.notes, old.owner, old.category);
  INSERT INTO receipts_fts(rowid, filename, notes, owner, category)
    VALUES (new.rowid, new.filename, new.notes, new.owner, new.category);
END;

-- 3. Indexes covering the v2 list queries.
CREATE INDEX IF NOT EXISTS idx_receipts_cursor ON receipts(uploaded_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_cat_cursor ON receipts(category, uploaded_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_owner ON receipts(owner);

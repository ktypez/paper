-- Fresh local database baseline for the current Paper application.
-- Production already has this shape. Do not use this file as a production migration.

CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS receipts (
  id           TEXT PRIMARY KEY,
  filename     TEXT NOT NULL,
  category     TEXT NOT NULL,
  owner        TEXT,
  notes        TEXT,
  content_type TEXT NOT NULL,
  size         INTEGER NOT NULL,
  uploaded_at  TEXT NOT NULL,
  thumb_key    TEXT
);

CREATE INDEX IF NOT EXISTS idx_receipts_uploaded_at ON receipts(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_category ON receipts(category);
CREATE INDEX IF NOT EXISTS idx_receipts_cursor ON receipts(uploaded_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_cat_cursor ON receipts(category, uploaded_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_owner ON receipts(owner);
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(sort_order, created_at);

CREATE VIRTUAL TABLE IF NOT EXISTS receipts_fts USING fts5(
  filename,
  notes,
  owner,
  category,
  content='receipts',
  content_rowid='rowid'
);

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

CREATE TABLE IF NOT EXISTS receipts (
  id           TEXT PRIMARY KEY,
  filename     TEXT NOT NULL,
  category     TEXT NOT NULL,
  owner        TEXT,
  content_type TEXT NOT NULL,
  size         INTEGER NOT NULL,
  uploaded_at  TEXT NOT NULL,
  notes        TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_receipts_uploaded_at ON receipts(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_category ON receipts(category);
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(sort_order);

-- Existing deployments: apply the following to the live D1 database:
--   ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
--   ALTER TABLE receipts ADD COLUMN owner TEXT;
--   DROP TABLE IF EXISTS subcategories;
-- Rows keep sort_order = 0 (ordered by created_at) until reordered via the UI.

-- Auth tables (user, session, account, verification) are managed by
-- Better Auth (v1.6.x, lib/auth.ts) and were created automatically on the
-- first deploy via the temporary /api/setup bootstrap endpoint.

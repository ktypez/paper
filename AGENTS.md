# paper

Paper is a private, single-user document and receipt archive deployed at `paper.mcky.space`. The current v3 rewrite keeps the existing Cloudflare D1 rows, R2 objects, Clerk access, and database shape.

## Project memory

Use agentmemory, not the retired Second Brain.

- Recall: `paper rebuild D1 R2 frontend API`
- Save outcomes with project slug `paper`
- Read `DESIGN.md` before UI work
- Read file history before changing established data or auth files

## Product

Core flows:

1. Add a JPEG, PNG, WebP, or PDF up to 10 MB.
2. Assign a category, optional owner/folder, and notes.
3. Browse recent documents or the full library.
4. Search filename, notes, owner, and category.
5. Preview, download, share, edit, or delete a document.
6. Create, rename, reorder, and delete categories.

Deliberately excluded: OCR, extracted receipt fields, tags, subcategories, accounting reports, sharing permissions, multi-user ownership, and PWA/offline behavior.

## Design

`DESIGN.md` is the canonical product and visual direction.

- Mobile-first, five-part navigation: Recent, Library, Search, Add, More
- Cool mineral surfaces with one vermilion accent
- Geist Variable and Noto Sans Thai Variable
- No dashboard shell, decorative gradients, glass, glow, fake metrics, or generic card mosaics
- Minimum 44 px targets, visible focus, reduced motion, and responsive reflow are required

## Stack

- Vite 8, React 19, strict TypeScript 7
- React Router 7
- TanStack Query 5
- Clerk React with Thai localization
- Radix Dialog and Slot
- Tailwind CSS 4 with tokens in `src/styles.css`
- Cloudflare Pages Functions with Node compatibility
- Cloudflare D1 binding `receipts_db`
- Cloudflare R2 binding `BUCKET`
- Lucide icons, Sonner notifications

## Commands

```bash
npm run dev          # Vite frontend on :5173
npm run dev:api      # Pages Functions on :8788
npm run typecheck    # strict TypeScript check
npm test             # Node backend tests
npm run check:syntax # parse Functions and cleanup worker
npm run build        # typecheck and build to ./public
npm run build:functions # bundle and verify Pages Functions routes
npm run check        # tests, frontend build, and Functions bundle
```

Deploy only after `npm run check` passes:

```bash
npx wrangler pages deploy ./public --project-name=receipts-dms
```

`public/` is generated output. Never hand-edit it.

## Environment

- `.env`: `VITE_CLERK_PUBLISHABLE_KEY`
- `.dev.vars`: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, optional `CLERK_JWKS_URL`
- `.env.example` and `.dev.vars.example` show the required names
- Real secret files are gitignored
- The existing local `.dev.vars` may still contain retired Better Auth names and must be updated manually for local API work

## Data contract

The production D1 database is `receipts-db`, database ID `64dc7d25-606e-4e53-80bb-60f229b37b74`.

`receipts` fields:

```text
id TEXT PRIMARY KEY
filename TEXT NOT NULL
category TEXT NOT NULL
owner TEXT NULL
notes TEXT NULL
content_type TEXT NOT NULL
size INTEGER NOT NULL
uploaded_at TEXT NOT NULL
thumb_key TEXT NULL
```

`categories` fields:

```text
id TEXT PRIMARY KEY
name TEXT NOT NULL UNIQUE
created_at TEXT NOT NULL
sort_order INTEGER NOT NULL DEFAULT 0
```

Critical invariants:

- Original R2 key is exactly `receipts.id`
- Thumbnail key is exactly `receipts.thumb_key`; it is nullable
- `receipts.category` stores the category name, not the category ID
- `owner` is free text, not a Clerk user or tenant ID
- FTS uses the implicit `receipts.rowid`; do not replace the table with `WITHOUT ROWID`
- Existing rows may have no thumbnail; preview must fall back to the original
- The archive is globally visible to every Clerk account with `paper` access

Do not run a migration against production during application work. `schema.sql` is a fresh local baseline, while `migrations/0002_v2.sql` is a historical one-off migration that is not idempotent.

## API

All `/api/*` routes are guarded by `functions/api/_middleware.js`.

- `GET /api/documents`: cursor list with `cursor`, `limit`, `category`, `owner`, and `q`
- `POST /api/documents`: multipart upload with `file`, optional `thumb`, `client_id`, `filename`, `category`, optional `owner`, and optional `notes`
- `GET /api/documents/:id`
- `PATCH /api/documents/:id`
- `DELETE /api/documents/:id`
- `GET /api/documents/:id/file?variant=preview|original`
- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`
- `PUT /api/categories/order`
- `GET /api/summary`

Category rename updates both `categories.name` and matching `receipts.category` in one D1 batch. Category deletion is blocked while documents reference the name. Reordering requires the exact full set of category IDs.

Upload validates file signatures, not only the browser MIME type. Images may omit a thumbnail. Delete removes the D1 row first so a storage failure cannot leave a visible document with a missing original, then makes idempotent R2 deletes and logs any orphan cleanup failure. File responses are private, support ETag and byte ranges, and must never use public cache headers.

## Frontend

Routes:

```text
/                 Recent
/library          Library and filters
/search           Dedicated search
/capture          Add document
/more             More menu
/more/categories  Category management
/more/settings    Account, theme, and local cleanup
/d/:id            Document detail
```

Old `/lib`, `/r/:id`, `/receipts`, `/receipts/:id`, `/upload`, `/dashboard`, `/categories`, and `/settings` paths redirect to the new routes.

Important files:

- `src/app.tsx`: providers, auth gate, lazy routes
- `src/components/app-shell.tsx`: responsive shell and navigation
- `src/lib/api.ts`: typed API client and XHR upload progress
- `src/lib/query.tsx`: TanStack Query hooks and mutations
- `src/pages/`: route screens
- `src/styles.css`: the only color, radius, shadow, and motion token source

The app does not register a service worker. `static/sw.js` is a one-release cleanup stub that existing legacy registrations can update to; it has no fetch handler and unregisters itself. Startup also unregisters legacy workers and removes old Paper Workbox caches. The Settings screen can explicitly remove legacy IndexedDB and Cache API data.

## Auth

`functions/api/_lib/auth.js` verifies Clerk RS256 session tokens against cached JWKS, then checks `private_metadata.apps` for `paper`. It accepts a Bearer token or Clerk `__session` cookie, fails closed, and caches access decisions for five minutes.

The frontend redirects signed-out users to `me.mcky.space?from=paper`. Do not reintroduce Better Auth.

## Gotchas

1. `public/` is both build output and deploy input.
2. Never add OCR or amount UI without a schema migration and an explicit product decision.
3. Keep client and server upload limits at 10 MB.
4. Keep original R2 keys equal to receipt IDs.
5. Do not assume `thumb_key` exists.
6. Do not add user filtering without a migration and a policy for existing global rows.
7. Do not reintroduce PWA, service workers, tags, or subcategories.
8. Preview deployments may still bind the same D1 and R2 unless bindings are deliberately isolated.
9. Local Wrangler execution may require the correct Clerk variables in `.dev.vars`.
10. `origin/master` may be behind the local rewrite branch; verify the deployed revision before release.

## Source citations

When project context comes from an MCP server, cite it at the end of the answer:

- `[source: agentmemory]`
- `[source: context7]`

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read `antislop.md` (core) and then the skill for the task:
- UI / visual: `skills/antislop-ui/SKILL.md`
- Copy & text: `skills/antislop-copywriting/SKILL.md`
- People: `skills/antislop-human/SKILL.md`
- Mobile / responsive: `skills/antislop-layoutmobile/SKILL.md`
- Code comments: `skills/antislop-code/SKILL.md`
Before starting, ask the user when antislop applies: during the work, or after it is done.
<!-- antislop:end -->

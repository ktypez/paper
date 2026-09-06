# paper

Personal document / receipt DMS ("Paper") — the docs live at paper.mcky.space.
Single-tenant SaaS for personal receipt/scan storage.

## KB (Second Brain)
Project context is stored in Second Brain (brain.mcky.space via secondbrain MCP).
Use `recall` to retrieve context, `remember` to save new info.
- `recall query="paper project"` — tech stack, architecture, commands
- `recall query="paper agent"` — personality, key context
- Tags: `paper`, `project`

## Stack
- Frontend: Vite 8 + React 19 + TypeScript 7 (strict), react-router v7, **TanStack Query 5 (+persist to IndexedDB), TanStack Virtual, vite-plugin-pwa (injectManifest)**, lucide-react, sonner (toasts). **No framer-motion** (CSS transitions only).
- Backend: Cloudflare Pages Functions (Node-compat), Cloudflare D1 (`receipts_db`) + R2 (`BUCKET`)
- Auth: **Clerk** (`@clerk/backend` + `@clerk/clerk-react`) — NOT Better Auth (see Gotchas). Edge: `functions/api/_lib/auth.js` verifies session JWT locally against cached JWKS + 5-min access cache (replaces 2 blocking Clerk API calls/request, same fail-closed 401).
- UI: shadcn/ui (radix-nova style) + Tailwind 4 (`@tailwindcss/vite`)
- Build: Vite with manual chunking; build output = `./public`

## Commands
- `npm run dev` — Vite dev server only, **frontend only**. Proxies `/api` → `http://localhost:8788`
- Full-stack dev: run `npx wrangler pages dev ./public --port 8788` (with local D1/R2 state) alongside `npm run dev`
- `npm run build` — `vite build` → `./public` (emptyOutDir: true — wipes public first)
- `npm run preview` — serve built frontend (no API)
- `npm run preview` + wrangler: deploy = `npx wrangler pages deploy ./public --project-name=receipts-dms`
- **No test suite / test script / linter config exists.** tsconfig has strict + noUnusedLocals/Parameters. Typecheck via `npx tsc --noEmit` (works, since noEmit is set).

## Env / Secrets
- `.dev.vars` — secrets for local wrangler (CLERK_SECRET_KEY/CLERK_PUBLISHABLE_KEY, BETTER_AUTH_SECRET — see Gotchas). Gitignored.
- `.env` — Vite client env (`VITE_CLERK_PUBLISHABLE_KEY`). Gitignored.
- Client reads `import.meta.env.VITE_CLERK_PUBLISHABLE_KEY`; App renders an error if missing.
- wrangler.toml binds: `receipts_db` (D1, `receipts-db`), `BUCKET` (R2, `receipts-dms-bucket`). `pages_build_output_dir = "./public"`.

## Auth & Access Control (critical)
- `functions/api/_middleware.js` guards **every** `/api/*` route except `/api/auth*`.
- Auth via Clerk `authenticateRequest`; must be `signed-in`.
- **App access gating**: the user's Clerk `privateMetadata.apps` must include the string `"paper"`, otherwise a styled 401 page is returned. Access is granted at **me.mcky.space** (the mcky access manager). Fails closed on any error resolving access.
- Middleware sets `context.data = { userId, sessionId }` for downstream handlers.
- Frontend: `ClerkProvider` wraps `BrowserRouter`; `Root` shows `<Login/>` (Clerk `<SignIn>` with `routing="hash"`) when signed out. Lazy-loaded routes via `React.lazy` + Suspense with a spinner fallback.

## Architecture / Data Flow
- **Backend (Cloudflare Pages Functions)** under `functions/api/`. Each file exports `onRequestGet/Post/Put/Delete`:
  - **v2** (`functions/api/v2/`, current): `receipts.js` — GET cursor-paginated list (`cursor/limit/category/owner/q`, FTS5 search, `{items, nextCursor}`); `receipts/[id].js` — GET one, single-statement PUT, DELETE (removes orig+thumb from R2); `files/[id].js` — `?variant=thumb|orig`, immutable 1y thumbs, ETag/304 + Range on originals; `upload.js` — POST multipart (`file` + client `thumb`), parallel R2 puts, single D1 insert, 201; `categories.js` — GET with live counts (one query).
  - **v1** (legacy, kept for rollback): `receipts.js` — GET full list (no pagination); `receipts/[id].js`; `file/[id].js`; `upload.js`; `categories*.js`. The v2 client never calls v1 except categories CRUD (POST/PUT/DELETE still on `/api/categories*`).
  - `migrations/0002_v2.sql` — `thumb_key` column, `receipts_fts` (FTS5 + sync triggers), cursor indexes. Applied to remote D1 2026-09-06.
  - `upload.js` — (v1) POST multipart; `categories.js` — (v1) GET/POST; `categories/[id].js`, `categories/reorder.js`, `categories/[id]/subcategories.js` (dead code — table dropped), `tags/` + `receipts/[id]/tags/` (empty, not implemented).
- **Frontend** (`src/`):
  - `App.tsx` — theming + Clerk + QueryProvider + router + lazy routes. Routes: `/` Home (capture-first), `/lib` Library, `/r/:id` Detail, `/capture`, `/categories`, `/settings`. Old `/dashboard`→`/`, `/receipts`→`/lib`, `/receipts/:id`→`/r/:id`, `/upload`→`/capture` redirects kept.
  - `lib/api-v2.ts` — v2 client: cursor list, single get/update/delete, upload with client thumbnail + XHR progress, IndexedDB offline outbox (`enqueueUpload`/`uploadQueuedItem`). Thumbnails: 320px webp via canvas/OffscreenCanvas.
  - `lib/query.tsx` — QueryClient (stale 60s, persist 7d in IDB) + `useReceiptsInfinite`/`useReceipt`/`useCategories`/mutations. `lib/outbox.ts` — `useOutboxDrain()` (online event + SW message + poll).
  - `sw.ts` — injectManifest SW: precached shell, CacheFirst immutable thumbs, NetworkFirst orig + read APIs, Background Sync `paper-uploads` drains outbox.
  - `hooks/` and hand-rolled fetch are gone. No full-table fetch anywhere: list is cursor-paginated server-side, detail fetches one row.
  - Responsive shell: `Layout` switches Sidebar (desktop ≥1024px) vs BottomNav (mobile) via `useMediaQuery`. Mobile uses `--spacing-safe-bottom` / safe-area insets (viewport-fit=cover).
- **`owner` field** = free-text "Owner / Folder" label on a receipt (set at upload, edited in detail, filtered in receipts list), NOT tied to the signed-in user.

## Design System
- **Implemented theme: SOFT / "Variant D"** (commit `935ccf5`, chosen in design gallery `paper/paper-gallery-v3`) — warm-neutral gallery look: white base, soft 14px radii, gentle borders/shadows, rounded everything (dark mode: near-black base). Tokens live ONLY in `src/index.css` (`:root` light + `.dark`) — single source of truth. Motion utilities: `.panel-in` / `.overlay-in` / `.zoom-in` (slide-over + lightbox).
- **Variant D layout**: timeline list (`src/components/timeline.tsx` — month groups, left time rail with dots, 76px rows, 56px rounded thumbs) shared by Home + Library; slide-over detail (`src/components/receipt-panel.tsx`, right, 86%→max-w-md) with tap-to-lightbox image (`src/components/lightbox.tsx`); formatting helpers in `src/lib/format.ts`. Detail route `/r/:id` is the full page (PDF iframe, lightbox, edit/delete).
- Fonts: **Inter** (sans + display) + **JetBrains Mono**, loaded via `@fontsource` in `main.tsx`; Thai glyphs fall back to Noto Sans Thai Variable. No bunny.net / external font links.
- `design-system/paper/MASTER.md` ("Lovable Warm", cream `#f7f4ed`), `Design.md` (Expo) and `design-revamp-spec.md` are **historical** — superseded. MONO (commit `59e385a`) was itself superseded by SOFT on 2026-09-06. Their "never #fff/#000" rules no longer apply.
- 44px touch targets (`touch-target` / `touch-target-full` utilities).
- shadcn components under `src/components/ui/` (button, card, dialog, dropdown-menu, input, label, progress, select, separator, skeleton, table, tooltip, badge). There's also `claude-callout`, `claude-note`, `claude-effects.css`, `touch-area`.

## Naming / Style Conventions
- Files: kebab-case (`use-categories.ts`, `receipt-detail.tsx`). UI primitives named `ui/<name>.tsx`.
- Components: named exports (`export function Dashboard()`), PascalCase.
- Backend handlers: `onRequestGet/Post/Put/Delete` per file.
- UI copy is bilingual — Thai (ไทย) is used for most user-facing strings, English for some labels (e.g. "Documents", "Settings"). Match the surrounding page's language.
- Uses `@/` path alias → `./src`.

## Gotchas / Non-Obvious
1. **Clerk vs Better Auth**: schema.sql comments reference "Better Auth (lib/auth.ts)" tables and `.dev.vars` has `BETTER_AUTH_*` — this is **outdated/leftover**. The real auth is Clerk (middleware + `@clerk/backend`). Do not reintroduce Better Auth.
2. **`public/` is the build output AND deploy source.** `vite build` wipes it (`emptyOutDir: true`) and `wrangler pages deploy ./public` deploys it. Git status often shows `public/assets/*.js` as deleted after rebuilds — expected (content-hashed filenames).
3. **Upload size limit is 10MB** on both client and server (`src/lib/upload-utils.ts` MAX_FILE_SIZE and `functions/api/upload.js` MAX_SIZE both = 10MB). Keep these in sync.
4. **PWA was removed** — `main.tsx` actively unregisters service workers and wipes caches. Do not reintroduce a service worker or re-add `/manifest.webmanifest` (the link was removed from index.html).
5. **subcategories/tags are gone** — the `subcategories.js` handler was deleted (it queried a dropped table); `tags/` are not implemented. Don't assume these features exist.
6. **Dev needs two processes**: `npm run dev` (Vite, port 5173) + `wrangler pages dev ./public --port 8788` (API). The proxy only forwards `/api`.
7. **`onRequest` middleware** is shared; adding a handler under `functions/api/` is auto-guarded — no manual wiring. Non-`/api` routes are untouched by Pages Functions unless you add root handlers.
8. **No tests, no CI** — verify manually via the running dev stack. Typecheck with `npx tsc --noEmit` (works — `tsconfig.json` has no `baseUrl`, which TS 7 removed).
9. **Category is referenced by name, not id** in `receipts.category` (denormalized). Renaming/deleting a category with receipts is blocked server-side; deleting a receipt does not touch category counts.
10. **Optimistic category reorder** in `use-categories.ts` reverts by reloading on error — no manual rollback.
11. **List images** (receipts grid/table, dashboard recent) use `loading="lazy"` — keep it on any new list thumbnails.
12. **`radix-ui` umbrella vs granular imports**: `button.tsx` uses `import { Slot } from "radix-ui"`; everything else uses `@radix-ui/react-*`. Both work — pick one per file, don't mix in the same file.
13. **`ui-foundation` was REMOVED (2026-09-05)** — it imported `canonical.css` (portal INK theme values) which, due to import order, silently overrode paper's own `:root` tokens and force-applied portal dark under OS dark mode (`:root:not([data-mode])` media query beats the `.dark` class). Tokens are now single-sourced in `src/index.css`. Do NOT reintroduce `ui-foundation` / `src/foundation.css` / `ui.mcky.space` CDN links here; portal/truck/data consume it separately and are unaffected.

## MCP Source Cite
When answering using data from an MCP server, indicate the source in square brackets at the end:
- `[source: brain]` — from brain.mcky.space
- `[source: context7]` — from library docs

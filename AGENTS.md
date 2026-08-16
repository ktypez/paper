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
- Frontend: Vite 8 + React 19 + TypeScript 7 (strict), react-router v7, framer-motion, lucide-react, sonner (toasts)
- Backend: Cloudflare Pages Functions (Node-compat), Cloudflare D1 (`receipts_db`) + R2 (`BUCKET`)
- Auth: **Clerk** (`@clerk/backend` + `@clerk/clerk-react`) — NOT Better Auth (see Gotchas)
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
  - `receipts.js` — GET list; query params `category`, `q` (filename/notes LIKE). No owner filter param — owner is filtered client-side.
  - `receipts/[id].js` — PUT (partial update: filename/category/notes/owner), DELETE (removes from R2 + D1).
  - `file/[id].js` — GET raw file bytes from R2 (cache 1h).
  - `upload.js` — POST multipart; validates type (jpeg/png/webp/pdf) and size; verifies category exists by name; writes R2 keyed by `crypto.randomUUID()`, inserts D1 row. Returns 201.
  - `categories.js` — GET (ORDER BY sort_order, created_at), POST (unique name, 409 on dup).
  - `categories/[id].js` — PUT (rename, 409 on dup), DELETE (409 if receipts still reference category name).
  - `categories/reorder.js` — POST `{ ordered_ids: string[] }`; batch-updates sort_order via `DB.batch`.
  - `categories/[id]/subcategories.js` — references a `subcategories` table that **no longer exists** (dropped). Dead/misleading code.
  - `tags/` and `receipts/[id]/tags/` — **empty directories**, feature not implemented.
- **Frontend** (`src/`):
  - `App.tsx` — theming + Clerk + router + lazy routes. Layout throws once, no nested route config beyond that.
  - `lib/api.ts` — thin fetch wrapper over `/api` (JSON, throws Error with server `error` msg). `uploadReceiptWithProgress` uses XHR for progress.
  - `hooks/use-receipts.ts`, `use-categories.ts` — hand-rolled state management (no TanStack Query). `useCategories` does optimistic reorder.
  - `lib/upload-utils.ts` — client-side file validation + image compression (canvas → webp, max 2048px, q0.8).
  - Routes: `/` Dashboard, `/receipts`, `/receipts/:id`, `/upload`, `/categories`, `/settings`.
  - Responsive shell: `Layout` switches Sidebar (desktop ≥1024px) vs BottomNav (mobile) via `useMediaQuery`. Mobile uses `--spacing-safe-bottom` / safe-area insets (viewport-fit=cover).
- **`owner` field** = free-text "Owner / Folder" label on a receipt (set at upload, edited in detail, filtered in receipts list), NOT tied to the signed-in user.

## Design System
- Source of truth: **`design-system/paper/MASTER.md`** — "Lovable Warm" theme.
- Tokens live in `src/index.css` (`:root` light + `.dark`). Rules: never `#fff` bg, never `#000` text, grays derived from `#1c1c1c` opacities, `--shadow: none` (border-over-shadow), 44px touch targets.
- Fonts: display = **Source Serif 4**, sans = DM Sans / Geist Variable / Noto Sans Thai. Loaded via fonts.bunny.net in `index.html` + `@fontsource` packages.
- `Design.md` (Expo) and `design-revamp-spec.md` (Lovable) are historical references; the **implemented** palette is warm cream (`#f7f4ed`). The "Cold Document Archive" comment block atop `:root` in index.css is stale — ignore it, the actual tokens are warm.
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

## MCP Source Cite
When answering using data from an MCP server, indicate the source in square brackets at the end:
- `[source: brain]` — from brain.mcky.space
- `[source: context7]` — from library docs

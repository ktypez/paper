# Paper

Private, mobile-first archive for personal receipts and documents. The app runs on Cloudflare Pages and uses the existing D1 database and R2 bucket without changing the stored data shape.

## Requirements

- Node.js 22.12 or newer
- A Clerk application with `paper` enabled in `private_metadata.apps`
- Cloudflare access for the configured Pages project, D1 database, and R2 bucket

## Local setup

```bash
npm install
cp .env.example .env
cp .dev.vars.example .dev.vars
```

Add real Clerk values to both local files:

- `.env`: `VITE_CLERK_PUBLISHABLE_KEY`
- `.dev.vars`: `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY`

Run the frontend and API in separate terminals:

```bash
npm run dev
npm run dev:api
```

Frontend: `http://localhost:5173`

API: `http://localhost:8788`

## Verification

```bash
npm run check
```

This runs backend tests, strict TypeScript checks, a production frontend build, and a Pages Functions route bundle. The same command runs in GitHub Actions for pushes and pull requests.

## Deploy

```bash
npm run check
npm run release:check
npx wrangler pages deploy ./public --project-name=receipts-dms --branch=master
```

Do not run a database migration as part of deployment. The application is built to read and write the existing `receipts` and `categories` tables. Preview Pages deployments currently inherit the production D1/R2 bindings, so the API host guard blocks preview requests until separate preview resources exist.

## Project map

- `DESIGN.md`: product scope and visual direction
- `AGENTS.md`: architecture, data contract, commands, and safety rules
- `src/`: React application
- `functions/api/`: authenticated Cloudflare Pages Functions
- `tests/backend/`: validation, mapping, auth-helper, SQL-contract, category, upload, and file-response tests
- `schema.sql`: fresh local database baseline
- `wrangler.toml`: Pages, D1, and R2 bindings

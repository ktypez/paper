# paper

## KB
Project context is stored in Second Brain (brain.mcky.space via secondbrain MCP).
Use `recall` to retrieve context, `remember` to save new info.
- `recall query="paper project"` — tech stack, architecture, commands
- `recall query="paper agent"` — personality, key context
- Tags: `paper`, `project`

## Stack
- Vite 8 + React 19 + TypeScript 7
- Cloudflare Pages Functions
- Cloudflare D1 + R2
- shadcn/ui + Tailwind 4

## Commands
- dev: `npm run dev`
- build: `npm run build`
- deploy: `npx wrangler pages deploy ./public --project-name=receipts-dms`

## Rules
- Domain: paper.mcky.space

## Local
- Env: wrangler config

## MCP Source Cite
When answering using data from an MCP server, indicate the source in square brackets at the end:
- `[source: brain]` — from brain.mcky.space
- `[source: context7]` — from library docs

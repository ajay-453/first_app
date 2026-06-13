# AGENTS.md — app/ (App Router)

> Local contract for the UI + routing layer. Parent: `../AGENTS.md`.

## Purpose

Next.js App Router. Holds the root layout, the global stylesheet, and the user-facing pages. API routes live under `api/` (own doc).

## Local Contracts

- **Layout:** `layout.tsx` is the root layout — sets `<html>`/`<body>`, dark theme classes, metadata, and renders `<Nav/>` above all pages. Global CSS is imported here (`globals.css`); don't import it elsewhere.
- **Server vs client:** default to Server Components. Add `'use client'` only when a page needs hooks/state (`page.tsx`, `progress/page.tsx` are client; `history/page.tsx` is a server component that calls `auth()` and queries the DB directly).
- **Auth in pages:** `history/page.tsx` is the only auth-gated route — it `redirect('/api/auth/signin')` when there's no session. Match this pattern for future private pages; the middleware only enforces `/history`.
- **Data fetching:** client pages fetch from `/api/*` (e.g. `page.tsx` → `/api/search`, `progress/page.tsx` → `/api/progress`). Server pages may hit the DB directly via `@/lib/db`.
- **Style:** Tailwind utility classes; slate/indigo/violet palette. Match the existing visual language.

## Pages

- `page.tsx` — search UI (client). Posts to `/api/search`; auto-runs a search when loaded with `?q=`.
- `history/page.tsx` — auth-gated history (server); last 50 searches, links re-run via `?q=`.
- `progress/page.tsx` — build dashboard (client); Recharts over `/api/progress`.

## Work Guidance

- Adding a page = add a folder with `page.tsx`. Public by default; gate it explicitly if private.
- A new public shareable area (e.g. Phase 3 `app/t/[slug]/`) is a durable boundary → give it its own `AGENTS.md`.

## Verification

`npm run build` must pass (catches type + RSC/client boundary errors). No unit tests.

## Child DOX Index

- `api/AGENTS.md` — route handlers.

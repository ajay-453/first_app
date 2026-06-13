# AGENTS.md — 3P Explorer (root)

> DOX root. Project-wide contract + child index. Patterned on [agent0ai/dox](https://github.com/agent0ai/dox).
> Behavioral rules live in `CLAUDE.md` + the `karpathy-guidelines` skill. This tree adds **local, folder-specific** context.

## Purpose

3P Explorer — an AI-powered "Top 3" ranker. Enter a topic, get the top three picks with reasons and links from an LLM. Live: https://first-app-eta-gold.vercel.app

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · NextAuth.js v5 (Google + GitHub) · NeonDB (Postgres, `pg`) · OpenRouter (`gpt-4o-mini`) · Vercel.

## Global Contracts

- **Behavior:** follow the four Karpathy principles (`CLAUDE.md`). Think before coding, simplest thing that works, surgical diffs, verify against a goal.
- **Secrets:** never commit `.env*`. Env vars: `DATABASE_URL`, `OPENAI_API_KEY` (an OpenRouter key despite the name), `AUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`.
- **DB:** there is no pool — `lib/db.ts` hands out a fresh `pg.Client` per call. Any code that connects MUST `client.end()` in a `finally`.
- **Auth boundary:** `auth.config.ts → authorized()` gates only `/history`. Everything else is public, including `/api/*`.
- **Verification:** there is no test suite. The only gate is `npm run build` (type-check + Next build). State this honestly; don't claim "tests pass."

## Walk & Update Protocol (DOX)

1. Before editing, read this file, then read the `AGENTS.md` of every folder your change touches, root → target. The nearest doc wins.
2. Make precise edits within those local contracts.
3. After a meaningful change (new file, moved responsibility, changed contract), update the affected `AGENTS.md` — then update `README.md` and the vault if the change shifts project state.
4. Keep docs operational: stable contracts, not history. Delete stale lines instead of explaining them.

## Phase Workflow

The app is built in 5 phases (see `README.md` → Development Roadmap; live status at `/progress`). When developing a new phase from here:

1. Walk this tree to the folders the phase will touch.
2. Build within local contracts; if the phase introduces a **new durable boundary** (a folder with its own purpose/rules — e.g. `app/t/` for shareable pages, a `votes`/`api/v1` module), create a child `AGENTS.md` for it and register it in the index below.
3. Update affected `AGENTS.md` files, the README roadmap status, and the vault (`/home/oc/ai`) log + index.

## Child DOX Index

- `app/AGENTS.md` — App Router: pages, layout, client/server UI.
- `app/api/AGENTS.md` — serverless route handlers (LLM call, DB writes, auth handlers).
- `lib/AGENTS.md` — shared server utilities (`db.ts`).
- `components/AGENTS.md` — shared React components.

Root-level config (`auth.ts`, `auth.config.ts`, `middleware.ts`, `next.config.mjs`, `tailwind.config.ts`, `vercel.json`) and `types/next-auth.d.ts` are governed by this root doc — no child docs (not durable boundaries yet).

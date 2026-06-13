# AGENTS.md — app/api/ (route handlers)

> Local contract for serverless API routes. Parent: `../AGENTS.md`.

## Purpose

Server-side route handlers: the LLM-backed search, the progress feed, and the NextAuth handler mount.

## Routes

- `search/route.ts` — `POST`. Calls OpenRouter (`gpt-4o-mini`), parses the JSON top-3, slugifies the topic, upserts `searches`, replaces `results`, records `user_search_history` when logged in.
- `progress/route.ts` — `GET`. Returns `version1` tasks + recent `version1_logs`.
- `auth/[...nextauth]/route.ts` — re-exports `GET`/`POST` from `@/auth`. Leave it thin; auth logic lives in `auth.ts`.

## Local Contracts

- **Always close the DB client.** Every handler that calls `getClient()` must `await client.connect()` and `client.end()` in a `finally` (no shared pool — see `lib/AGENTS.md`).
- **Public + paid.** These routes have no auth gate or rate limit, and `search` spends real OpenRouter credit per call. Before relying on them in production, add auth/rate-limiting/abuse protection. Don't add new unauthenticated paid calls without flagging it.
- **Read the session, don't require it.** Use `const session = await auth()` and treat `session?.user?.id` as optional (anonymous is allowed).
- **Validate before trusting.** Reject empty/oversized request bodies. Treat the LLM response as untrusted: guard `aiData.choices?.[0]`, `JSON.parse`, and the shape/types of each result before writing to the DB.
- **Slug upsert is destructive.** `ON CONFLICT (slug) DO UPDATE` overwrites stored results for that topic. Keep this in mind before exposing shared/shareable reads off the same row.
- **Keep the build-tracker write contained.** `search` currently runs an `UPDATE version1 ...`; don't spread project-tracking writes into other routes. Prefer removing it over copying it.

## Work Guidance

- New route = new folder with `route.ts` exporting the HTTP method. Use `NextResponse.json(...)` and explicit status codes.
- A public REST surface (Phase 5 `api/v1/`) is a durable boundary → its own `AGENTS.md`.

## Verification

`npm run build`. Manually exercise the route (`curl`/UI) since there are no tests; confirm the DB client is closed on every path.

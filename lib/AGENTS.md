# AGENTS.md — lib/ (shared server utilities)

> Local contract for shared helpers. Parent: `../AGENTS.md`.

## Purpose

Server-side utilities shared across routes and server components.

## Contents

- `db.ts` — `getClient()` returns a new `pg.Client` from `DATABASE_URL` with `ssl: { rejectUnauthorized: false }`.

## Local Contracts

- **Per-call client, no pool.** `getClient()` does not connect and does not pool. Every caller must `await client.connect()` and `client.end()` in a `finally`. Don't introduce module-level shared connection state (serverless = many short-lived instances).
- **Server-only.** Code here reads secrets (`DATABASE_URL`) — never import `lib/db` into a client component.
- **SSL caveat.** `rejectUnauthorized: false` disables cert validation for Neon. If you revisit connection handling (e.g. move to `@neondatabase/serverless` or a pool), prefer validating certs.
- Keep helpers small, pure, and single-purpose (Karpathy: simplicity first).

## Verification

`npm run build`. Exercise via a route that uses the helper.

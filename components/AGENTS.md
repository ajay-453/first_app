# AGENTS.md — components/ (shared React components)

> Local contract for reusable UI. Parent: `../AGENTS.md`.

## Purpose

Reusable React components shared across pages.

## Contents

- `Nav.tsx` — sticky top nav. Server component; calls `auth()` and renders session-aware links (History + avatar + sign-out form when logged in, "Sign in" otherwise). Sign-out uses a server action (`signOut({ redirectTo: '/' })`).

## Local Contracts

- **Server by default.** Components are Server Components unless they need hooks/interactivity — add `'use client'` only then. `Nav` must stay a server component (it awaits `auth()`).
- **Styling:** Tailwind, slate/indigo palette; match existing components. Use `next/image` for remote avatars (already configured for provider image hosts).
- **No business logic here.** Components render and link; data/DB/LLM work belongs in pages (`app/`) or routes (`app/api/`).
- One component per file, named to match the file.

## Verification

`npm run build` (catches client/server boundary + type errors).

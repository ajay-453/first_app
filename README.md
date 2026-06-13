# 3P Explorer

An AI-powered "Top 3" ranker — enter any topic and get the definitive top three picks, with reasons and links, powered by an LLM.

**Live app:** https://first-app-eta-gold.vercel.app  
**Author:** ajay-453 · ajaycse777@gmail.com

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | NextAuth.js v5 (Google + GitHub OAuth) |
| Database | NeonDB (serverless PostgreSQL) |
| LLM | OpenRouter → `gpt-4o-mini` |
| Charts | Recharts |
| Hosting | Vercel |

---

## Development Steps

### Step 0 — Repo bootstrap
- Created the GitHub repository and pushed an initial `README.md` using Git and the GitHub CLI.

### Step 1 — Static landing page
- Built an `index.html` landing page to establish the 3P Explorer brand and layout before adding any backend.
- Iterated on the design with a Nord-themed gradient, search bar, and example chip buttons.

### Step 2 — Progress tracking (Recharts + NeonDB)
- Provisioned a **NeonDB** (serverless Postgres) instance.
- Created two tables: `version1` (task tracker) and `version1_logs` (activity log).
- Added a `/api/progress` route that reads task status from NeonDB and returns JSON.
- Built a `progress.html` page using **Recharts** to visualise phase completion with a bar chart.

### Step 3 — Migrate to Next.js App Router (Phase 1)
- Replaced the static HTML site with a **Next.js 15** project using the App Router.
- Configured **Tailwind CSS** and **TypeScript**.
- Created the main search UI (`app/page.tsx`) — a client component with a topic input, loading spinner, and ranked result cards.
- Added `/api/search` (POST) that:
  1. Calls **OpenRouter** (`gpt-4o-mini`) with a system prompt that returns a JSON array of top-3 results.
  2. Slugifies the topic and upserts it into the `searches` table in NeonDB.
  3. Deletes and re-inserts rows in the `results` table for that search.
  4. Returns `{ results, slug }` to the client.
- Added `lib/db.ts` — a thin wrapper that creates a `pg.Client` from `DATABASE_URL`.
- Added a `vercel.json` to tell Vercel the project is a Next.js app.

### Step 4 — Fix OpenRouter base URL
- Corrected the LLM fetch URL to point at `https://openrouter.ai/api/v1/chat/completions` and added the required `HTTP-Referer` / `X-Title` headers that OpenRouter expects.

### Step 5 — Auth + Search History (Phase 2)
- Installed **NextAuth.js v5** (`next-auth@5.0.0-beta`).
- Configured `auth.ts` with **Google** and **GitHub** OAuth providers.
- `signIn` callback: upserts the authenticated user into a `users` table (email, name, avatar).
- `jwt` callback: looks up the internal user `id` and stores it in the JWT token.
- `session` callback: exposes `session.user.id` to the app.
- Added `middleware.ts` (Edge-compatible) to protect routes via NextAuth's built-in middleware.
- Extended `/api/search` to read the session and, when a user is logged in, insert a row into `user_search_history`.
- Added `app/history/page.tsx` — a server component that:
  - Redirects unauthenticated users to the sign-in page.
  - Queries the last 50 searches for the logged-in user, joining `searches` and `results`.
  - Renders a clickable list; clicking a row re-runs the search via `?q=` query param.
- Added a `Nav.tsx` component with links to Home, History, and Progress, and a sign-in/sign-out button.

---

## Database Schema

```sql
-- Task tracker (build progress)
CREATE TABLE version1 (
  id SERIAL PRIMARY KEY,
  title TEXT,
  status TEXT DEFAULT 'pending',
  parent_id INT,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE version1_logs (
  id SERIAL PRIMARY KEY,
  task_id INT,
  level TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App data
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE results (
  id SERIAL PRIMARY KEY,
  search_id UUID REFERENCES searches(id),
  rank INT,
  title TEXT,
  reason TEXT,
  source_url TEXT
);

CREATE TABLE user_search_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  search_id UUID REFERENCES searches(id),
  topic TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Environment Variables

Create a `.env.local` file (never commit it):

```env
# NeonDB connection string
DATABASE_URL=postgresql://...

# OpenRouter key (used as Bearer token)
OPENAI_API_KEY=sk-or-...

# NextAuth
AUTH_SECRET=<random 32-char string>
NEXTAUTH_URL=http://localhost:3000

# OAuth providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

---

## Running Locally

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open http://localhost:3000.

---

## Deployment

The app is deployed on **Vercel** via GitHub integration. Push to `master` → Vercel picks it up automatically. Environment variables are set in the Vercel project dashboard.

```bash
# Manual deploy (if needed)
vercel --prod
```

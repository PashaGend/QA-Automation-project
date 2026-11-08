# AI-Assisted QA Automation — Mundial2026

QA automation project testing [Mundial2026](https://pgmondial2026.netlify.app) (a World Cup 2026
score-prediction app: React + Vite + Supabase) from the outside. Covers UI (Playwright/TypeScript),
API, SQL data validation, AI-assisted bug reporting + visual regression (Claude), and CI/CD.

This repo holds the test environment and the test suites. The app under test lives in its own
repo (`../Mondial2026`) and is never modified here.

## Phase 1 — local environment

We run the app against a **local, disposable Supabase instance** (Postgres + REST API), never
against production. The schema in `supabase/migrations/` is reconstructed from how the app's
frontend code actually talks to Supabase (see the file's header comment) — it is not a copy of
the real production schema, since we have no read access to it.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
- Node.js (already installed) — Supabase CLI is run via `npx supabase`, no global install needed

### Start the local Supabase stack
```bash
npx supabase start
```
This prints a local API URL, DB URL, anon key, and service_role key, and runs the migration +
seed (104 World Cup matches) automatically.

### Point the app at it
Copy the printed `API URL` and `anon key` into `../Mondial2026/.env.local` (gitignored by that
repo, so this never touches its real `.env`):
```
VITE_SUPABASE_URL=<API URL from supabase start>
VITE_SUPABASE_ANON_KEY=<anon key from supabase start>
```
Then, from `../Mondial2026`:
```bash
npm install
npm run dev
```

### Stop / reset
```bash
npx supabase stop      # stop the local stack
npx supabase db reset  # wipe + re-run migrations + seed
```

## Phase 2 — UI tests

Playwright Test (TypeScript). Tests live in `tests/ui/`; `baseURL` in `playwright.config.ts` is
already set to the local app (`http://localhost:5173`).

```bash
npm install
npx playwright install chromium
npx playwright test              # run the suite
npx playwright codegen localhost:5173   # record a new test
```

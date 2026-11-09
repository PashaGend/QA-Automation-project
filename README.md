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

## Docker Compose — one-command environment

A self-contained, portable alternative to the `npx supabase start` setup above: a trimmed Postgres
+ PostgREST stack (not the full 11-container Supabase CLI stack — we only ever use the DB and the
REST API), the built Mondial2026 app, and the test suite, all wired together. This is what CI uses,
and what anyone can run locally with no Supabase CLI install.

| Service | Image | What it does |
|---|---|---|
| `db` | built from `docker/Dockerfile.db` (`postgres:17-alpine` + `pg-safeupdate`) | The database — schema + seed run automatically on first start |
| `rest` | `postgrest/postgrest` | Turns the Postgres schema into a REST API (no `/rest/v1` prefix) |
| `gateway` | `nginx:alpine` | Adds back the `/rest/v1` prefix `@supabase/supabase-js` expects, proxies to `rest` |
| `web` | built from `docker/Dockerfile.app`, or pulled from `ghcr.io/pashagend/mundial2026-web` | The built Mondial2026 app, served statically |
| `tests` | `mcr.microsoft.com/playwright` | Runs the full suite (`tests/api`, `tests/sql`, `tests/ui`) against the stack above |
| `load` | `grafana/k6` | Optional load test — see below |
| `sql-editor` | `adminer` | Optional GUI for the database (like Supabase Studio's SQL Editor, but lighter) |

### Bring up the environment
```bash
docker compose --env-file .env.docker up -d db rest gateway web
```
Open `http://localhost:8080` to use the app. Ports: `web` 8080, `gateway` 8000, `rest` 3000 (direct,
no prefix), `db` 55432.

### Run the tests
```bash
docker compose --env-file .env.docker run --rm tests
```
Same test code as `npx playwright test` above — only the target (local URLs vs. Docker service
names) changes, via environment variables in `tests/config.ts` / `playwright.config.ts`.

### Run a load test
```bash
docker compose --env-file .env.docker run --rm load
```
`k6/user-flow-load.js` simulates ~20 concurrent users signing up, fetching matches, and submitting
a prediction. Not a correctness gate (doesn't run in CI) — a demonstration that the API holds up
under concurrent writes, against the local stack only. Numbers aren't meaningful as real production
capacity figures.

### Inspect the database with a GUI
```bash
docker compose --env-file .env.docker up -d sql-editor
```
Open `http://localhost:8081` — System: PostgreSQL, Server: `db`, Username/Password: `postgres`,
Database: `postgres`. Stop it when done: `docker compose stop sql-editor`.

## Production smoke test

`tests/smoke/production.spec.ts` is a read-only check against the real deployed app
(`pgmondial2026.netlify.app`) — loads the page, checks the login form renders. Nothing is
submitted, nothing touches data. It's its own Playwright **project** (`smoke`), excluded from the
regular `chromium` project via `testIgnore`, so it never runs as part of the normal local/CI suite
(which targets the local Docker stack, not production) — only explicitly:
```bash
npx playwright test --project=smoke
```
`.github/workflows/smoke.yml` runs it automatically every 6 hours (`schedule: cron`) and can also
be triggered manually from the Actions tab (`workflow_dispatch`) — simple uptime/synthetic
monitoring for the real app, no new infrastructure needed.

### What needs a rebuild, and what doesn't
- **Test code changes** (`tests/*.spec.ts`) — nothing to rebuild, it's bind-mounted live. Just
  re-run `docker compose run tests`.
- **App code changes** (if `Mondial2026` changes) — `docker compose build web` (Vite build is baked
  into the image at build time, not live).
- **Schema/seed changes** (`supabase/migrations/`, `supabase/seed.sql`) — these only run once, when
  the DB volume is first created. `docker compose down -v` then `up` to re-apply.

### Reset everything
```bash
docker compose down -v --remove-orphans
```

## CI/CD

Two GitHub Actions workflows, one per repo, both running the same Docker Compose stack:

- **`mundial-qa-automation/.github/workflows/playwright.yml`** — on every push here, checks out
  `Mondial2026` as a sibling and runs the full test suite.
- **`Mondial2026/.github/workflows/qa.yml`** — on every push to the app, checks out this repo as a
  sibling, runs the same suite, and (only on `main`, only if tests pass) rebuilds and publishes the
  `web` image to `ghcr.io/pashagend/mundial2026-web`. Publishing lives here rather than in this
  repo's own workflow, since the image's content depends on the app's code, not the test suite's.

# AI-Assisted QA Automation — Mundial2026

QA automation project testing [Mundial2026](https://pgmondial2026.netlify.app) (a World Cup 2026
score-prediction app: React + Vite + Supabase) from the outside. Covers UI (Playwright/TypeScript),
API, SQL data validation, AI-assisted bug reporting, and CI/CD.

This repo holds the test environment and the test suites. The app under test lives in its own
repo (`../Mondial2026`) and is never modified here.

**[Presentation deck](https://claude.ai/artifact/C9odmz8w36PEMC5rHogL8B)** — a 10-slide walkthrough
of what this project demonstrates (architecture, test strategy, the real bugs the CI/CD pipeline
surfaced, AI-assisted bug triage). Needs to be shared with you first if you're not the owner.

## Quickstart

Needs [Docker Desktop](https://www.docker.com/products/docker-desktop/) running and Node.js — that's it,
no Supabase CLI, no manual secrets (`.env.docker` is safe to commit, see below).

```bash
git clone https://github.com/PashaGend/mundial-qa-automation.git
cd mundial-qa-automation
npm run setup
```
`setup` clones the sibling `Mondial2026` repo next to this one automatically (only if it isn't
already there), then runs `env:up` (below). Open `http://localhost:8080` — the app is live, against
a local, disposable backend. To run the full test suite (41 tests):
`docker compose --env-file .env.docker run --rm tests`. Verified against a genuinely clean clone —
no hidden manual step.

**Starting from nothing, on Windows?** `install.bat` at the repo root does the entire thing in one
file, no terminal needed: installs Git/Node.js/Docker Desktop if missing, starts Docker and waits
for it, clones both repos next to itself, brings up the environment, and opens the app in your
browser. Download it (no git needed first) from
`https://raw.githubusercontent.com/PashaGend/mundial-qa-automation/main/install.bat` (once this is
merged — for now, the `fix/local-dotenv-and-db-cleanup` branch) and double-click it. Windows will
likely show an unsigned-file warning (`More info` → `Run anyway`) and then a UAC prompt (`Yes`) —
normal for any downloaded, unsigned script. Safe to re-run. `install.ps1` is the exact same script
without the double-click wrapper, for running from PowerShell directly. The one thing neither can
script around: if Windows has never had virtualization (WSL2) enabled before, Docker needs a
one-time restart — the script detects that and tells you to restart and run it again.

(`install.bat` is a polyglot — valid as both a batch file and a PowerShell script in one file, via
a `<# : ... #>` header cmd.exe reads as a tiny launcher and PowerShell reads as a comment. Verified
end to end: the batch-to-PowerShell handoff, the elevation relaunch, and `$scriptPath` resolving
correctly inside the re-invoked content.)

**Same thing, on a Mac?** `install.command` does the same — Homebrew instead of `winget`, otherwise
identical. `.command` files are natively double-clickable in Finder (no polyglot trick needed).
Download from `.../install.command`, then in Terminal once: `chmod +x ~/Desktop/install.command`
(a browser download doesn't carry the executable bit the way `git clone` does), then double-click —
macOS will likely refuse the first run as unsigned (right-click → Open → Open to bypass, once).
*Honest limit: this was written and syntax-checked (`bash -n`), but never actually run on a Mac —
none was available while building it.*

`scripts\install-prereqs.ps1` is the Windows installer step alone (Git/Node/Docker, no cloning or
running), for anyone who'd rather do the rest themselves.

A non-technical walkthrough with copy-paste buttons also exists for this Quickstart — ask in a
Claude Code session in this repo, or see `guide.html`.

## Local environment (Docker Compose)

We run the app against a **local, disposable backend** (Postgres + REST API), never against
production. The schema in `supabase/migrations/` is reconstructed from how the app's frontend code
actually talks to Supabase (see the file's header comment) — it is not a copy of the real
production schema, since we have no read access to it.

A trimmed Postgres + PostgREST stack (not the full 11-container Supabase CLI stack — we only ever
use the DB and the REST API), the built Mondial2026 app, and the test suite, all wired together,
one command. This is what CI uses, and what anyone can run locally with no Supabase CLI install.

| Service | Image | What it does |
|---|---|---|
| `db` | built from `docker/Dockerfile.db` (`postgres:17-alpine` + `pg-safeupdate`) | The database — schema + seed run automatically on first start |
| `rest` | `postgrest/postgrest` | Turns the Postgres schema into a REST API (no `/rest/v1` prefix) |
| `gateway` | `nginx:alpine` | Adds back the `/rest/v1` prefix `@supabase/supabase-js` expects, proxies to `rest` |
| `web` | built from `docker/Dockerfile.app`, or pulled from `ghcr.io/pashagend/mundial2026-web` | The built Mondial2026 app, served statically |
| `tests` | `mcr.microsoft.com/playwright` | Runs the full suite (`tests/api`, `tests/sql`, `tests/ui`) against the stack above |
| `load` | `grafana/k6` | Optional load test — see below |
| `db-editor` | `adminer` | Optional GUI for the database (like Supabase Studio's SQL Editor, but lighter) |

### Bring up the environment
```bash
npm run env:up
```
This always runs `docker compose --env-file .env.docker up -d --build db rest gateway web` — the
`--build` matters every time: without it, Docker reuses whatever `web` image is already present,
even if it was built days ago from older code. `web` has no way to know on its own that
`Mondial2026`'s source changed, so if you skip `--build` after editing the app, you'll keep testing
stale code with no warning. `npm run env:up` makes that impossible to forget.

Open `http://localhost:8080` to use the app. Ports: `web` 8080, `gateway` 8000, `rest` 3000 (direct,
no prefix), `db` 55432.

`env:up` also runs `scripts/clean-test-users.mjs` at the end, every time. The `db` volume is
**persistent** — it survives `up`/`down`/`--build`, everything short of `down -v` — so every signup
every local test run has ever made (functional tests, k6 load tests, manual clicking around) just
accumulates there forever; after two days of this project it had grown to 611 users. CI never has
this problem (each job gets a brand new, empty volume), only local does. The script deletes every
user except the two fixed, seeded ones (`supabase/seed.sql`) that tests log in as on purpose.

### Run the tests
```bash
docker compose --env-file .env.docker run --rm tests
```
Runs the full suite (`tests/api`, `tests/sql`, `tests/ui`) inside a container against the stack
above — no local Node/Playwright install needed, and it's what CI runs.

You can also run the same tests directly (VS Code's Playwright extension, or plain
`npx playwright test`), once `npm install` + `npx playwright install chromium` are done and the
environment above is up. `playwright.config.ts` loads `.env` on its own, pointing
`tests/config.ts` and `baseURL` at the same Docker services (`localhost:8080` / `3000` / `55432`)
either way — so both paths hit the exact same backend, just with or without the extra container.

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
docker compose --env-file .env.docker up -d db-editor
```
Open `http://localhost:8081` — System: PostgreSQL, Server: `db`, Username/Password: `postgres`,
Database: `postgres`. Stop it when done: `docker compose stop db-editor`.

### Legacy: plain Supabase CLI

Before Docker Compose, this project ran against `npx supabase start` directly (the full Supabase
CLI stack). That's fully superseded now — Docker Compose does everything it did, plus the test
runner, load testing, and a DB GUI, in one command, with no CLI install. `supabase/config.toml`
and `supabase/migrations/` are still here because the same migration/seed files back both setups,
not because the CLI path is still a recommended way to run this project.

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
- **App code changes** (if `Mondial2026` changes) — `npm run env:up` again (Vite build is baked
  into the image at build time, not live, so this is never automatic — you have to re-run it).
- **Schema/seed changes** (`supabase/migrations/`, `supabase/seed.sql`) — these only run once, when
  the DB volume is first created. `docker compose down -v` then `up` to re-apply.

### Checking it's actually up
```bash
npm run status
```
Checks the 4 core containers are running and that the app answers at `localhost:8080` — a
container being "running" isn't the same as the app inside it actually working. Exits non-zero and
tells you to run `npm run env:up` if anything's off. Worth running before any demo instead of
assuming it's still up from last time.

All services have `restart: unless-stopped` in `docker-compose.yml`, so Docker should bring them
back on its own if one crashes or Docker itself restarts. On the machine this was built on
(Docker Engine inside WSL2, not Docker Desktop), that restart policy was tested directly and
**did not actually trigger** — a killed container stayed down. That's a property of that specific
Docker install, not of this project's config; a normal Docker Desktop install should honor it
correctly. Either way, `npm run status` is the reliable way to know for sure, rather than trusting
the restart policy blindly.

### Reset everything
```bash
docker compose down -v --remove-orphans
```

### Uninstalling completely

`uninstall.bat` (Windows) / `uninstall.command` (Mac) — the counterpart to `install.bat`/
`install.command`/`install.ps1`. Double-click it from wherever you ran the installer (same folder
as the cloned repos). Removes this project's Docker containers, volumes, networks and images, then
asks before also deleting the `mundial-qa-automation`/`Mondial2026` folders (says no by default —
that deletes any local changes). Also deletes the install.*/uninstall.* files themselves, including
itself, last. Deliberately leaves Git, Node.js, Docker Desktop (and Homebrew on Mac) installed,
since those are shared tools, not this project's to remove.

## CI/CD

Two GitHub Actions workflows, one per repo, both running the same Docker Compose stack:

- **`mundial-qa-automation/.github/workflows/playwright.yml`** — on every push here, checks out
  `Mondial2026` as a sibling and runs the full test suite.
- **`Mondial2026/.github/workflows/qa.yml`** — on every push to the app, checks out this repo as a
  sibling, runs the same suite, and (only on `main`, only if tests pass) rebuilds and publishes the
  `web` image to `ghcr.io/pashagend/mundial2026-web`. Publishing lives here rather than in this
  repo's own workflow, since the image's content depends on the app's code, not the test suite's.
- **`.github/workflows/load.yml`** — runs the k6 load test once a day (`schedule: cron`) plus
  `workflow_dispatch` for an on-demand run. Deliberately **not** a required check and doesn't run
  on push/PR — load numbers aren't reliable enough on shared CI runners to gate a merge on, and a
  real correctness bug shouldn't be blocked by an unrelated performance blip. GitHub emails
  automatically on a failed scheduled run, same mechanism as the smoke test above.

The first two workflows also trigger on `pull_request`, which is what makes branch protection
(below) work — GitHub needs a check to run on the PR itself before it can gate merging on it.

## AI-assisted bug filing (Jira)

`scripts/file-jira-bug.mjs` files a bug directly in Jira (project `KAN`) given a title and
description:
```bash
node scripts/file-jira-bug.mjs "<title>" "<description>"
```
Credentials (`JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_SITE_URL`, `JIRA_PROJECT_KEY`) live in `.env`
(gitignored, never committed). Deliberately manual, not wired into CI: when a test fails, Claude
Code drafts the report in conversation (same as any other task in this session — no separate paid
API call), then this script files it. Keeps a human in the loop before a real ticket is created,
and avoids spamming the board from flaky/transient CI failures.

## Branch protection — broken code can't reach `main`

Both repos' `main` branch has a protection rule (Settings → Branches): **require a pull request
before merging**, and **require the `test` status check to pass before merging**. In practice this
means:

- You can no longer `git push origin main` directly — pushes to `main` are rejected.
- Netlify deploys `Mondial2026`'s `main` branch automatically and immediately on every push to it,
  with **no awareness of our CI** — it doesn't wait for or check our test results at all. So the gate
  has to happen *before* anything lands on `main`, not after: if broken code can't be merged into
  `main` in the first place, Netlify never sees it to deploy it.
- "Require approvals" is deliberately **off** — this is a solo project, and GitHub won't let you
  approve your own PR, so requiring it would just lock you out of merging your own work. The gate
  here is the test suite, not a second human.

### Shipping a change, step by step
```bash
git checkout -b my-change        # never commit straight to main anymore
# ...edit files...
git add -A && git commit -m "..."
git push -u origin my-change
```
Then open a pull request on GitHub (`main` ← `my-change`). The `test` check runs automatically
(same Docker Compose suite as always) and its status shows right on the PR. Once it's green, the
**Merge** button becomes available — merging updates `main`, which is what actually triggers
Netlify's deploy. If the check is red, GitHub blocks the merge outright; `main` — and therefore
production — never sees that code.

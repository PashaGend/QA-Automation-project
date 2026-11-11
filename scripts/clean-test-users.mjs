#!/usr/bin/env node
// Deletes every test-created user from the local DB except the fixed, seeded
// ones (supabase/seed.sql) — predictions/score_predictions cascade-delete
// with them (see migrations/0001_init.sql, `on delete cascade`). Needed
// because the local `db` volume is persistent (survives `docker compose up`/
// `down`, `--build`, everything short of `down -v`), so every signup every
// test run has ever made just keeps accumulating — 611 users and counting.
// Doesn't touch CI: every CI job gets a brand new, empty volume already.
import 'dotenv/config';
import { Pool } from 'pg';

// Unlike tests/config.ts (shared with the plain Supabase CLI path), this
// script only ever runs against the Docker stack (wired into `env:up`), so
// its fallback points straight at Docker's db port — no .env needed at all
// on a fresh clone, where SUPABASE_URL/DB_URL/etc. haven't been set up yet.
const DB_URL =
  process.env.DB_URL || 'postgresql://postgres:postgres@localhost:55432/postgres';

// Phones that must never be deleted — the deterministic admin user some
// tests rely on logging in as (see supabase/seed.sql for why it exists).
const KEEP_PHONES = ['0548009108'];

const pool = new Pool({ connectionString: DB_URL });
try {
  const { rows } = await pool.query(
    `delete from users where phone <> all($1::text[]) returning phone`,
    [KEEP_PHONES]
  );
  console.log(`Deleted ${rows.length} test user(s). Kept: ${KEEP_PHONES.join(', ')}.`);
} finally {
  await pool.end();
}

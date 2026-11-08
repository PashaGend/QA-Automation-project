// Shared constants for the backend the tests run against. Defaults are the keys
// `npx supabase start` prints (safe to commit: fixed local-dev values, only work
// against 127.0.0.1). Env vars override these when running via docker-compose,
// where the REST API is plain PostgREST (no /rest/v1 prefix) on a different host.
export const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
export const REST_URL = process.env.REST_URL || `${SUPABASE_URL}/rest/v1`;
export const DB_URL =
  process.env.DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

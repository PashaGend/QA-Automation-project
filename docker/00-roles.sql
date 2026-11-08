-- Plain Postgres (no Supabase CLI) doesn't come with the roles PostgREST expects —
-- the real Supabase stack sets these up out of the box, so we recreate the minimum
-- needed here. Runs before the real schema migration (00- sorts before 01-).

create role anon nologin;
create role authenticator noinherit login password 'authenticator';
grant anon to authenticator;

grant usage on schema public to anon;
grant select, insert, update, delete on all tables in schema public to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to anon;

-- Only the role PostgREST actually connects as gets the no-WHERE-clause guard;
-- the postgres superuser (running this init script, including seed.sql's own
-- unconditional deletes) stays unaffected, matching the real Supabase setup.
alter role authenticator set session_preload_libraries = 'safeupdate';

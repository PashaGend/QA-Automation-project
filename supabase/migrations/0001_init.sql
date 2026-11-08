-- Reconstructed from the Mundial2026 app's Supabase usage (src/pages/*.jsx, src/lib/*.js).
-- Not a copy of the production schema — we have no read access to it. Columns and
-- constraints are the ones the frontend actually reads and writes; adjust here if a
-- real request shape surprises us once the app is running against this instance.

create extension if not exists pgcrypto;

create table if not exists public.matches (
  id integer primary key,
  match_date timestamptz not null
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  nickname text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.match_teams (
  match_id integer primary key references public.matches(id) on delete cascade,
  home text,
  away text
);

create table if not exists public.results (
  match_id integer primary key references public.matches(id) on delete cascade,
  result text not null check (result in ('home', 'draw', 'away')),
  home_score integer,
  away_score integer
);

create table if not exists public.predictions (
  user_id uuid not null references public.users(id) on delete cascade,
  match_id integer not null references public.matches(id) on delete cascade,
  prediction text not null check (prediction in ('home', 'draw', 'away')),
  primary key (user_id, match_id)
);

create table if not exists public.score_predictions (
  user_id uuid not null references public.users(id) on delete cascade,
  match_id integer not null references public.matches(id) on delete cascade,
  home_score integer not null,
  away_score integer not null,
  primary key (user_id, match_id)
);

-- The app talks to Supabase with only the anon key (no Supabase Auth session), so the
-- anon role needs full read/write for the app to function at all locally.
alter table public.matches enable row level security;
alter table public.users enable row level security;
alter table public.match_teams enable row level security;
alter table public.results enable row level security;
alter table public.predictions enable row level security;
alter table public.score_predictions enable row level security;

create policy "anon full access" on public.matches for all using (true) with check (true);
create policy "anon full access" on public.users for all using (true) with check (true);
create policy "anon full access" on public.match_teams for all using (true) with check (true);
create policy "anon full access" on public.results for all using (true) with check (true);
create policy "anon full access" on public.predictions for all using (true) with check (true);
create policy "anon full access" on public.score_predictions for all using (true) with check (true);

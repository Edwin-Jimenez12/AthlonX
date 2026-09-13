-- AthlonX: estructura deportiva inicial.
-- Ejecutar después de schema.sql en el proyecto de Supabase.

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  season text not null,
  start_date date,
  end_date date,
  location text,
  cover_url text,
  status text not null default 'published' check (status in ('draft', 'published', 'in_progress', 'finished')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tournament_divisions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  unique (tournament_id, name)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  city text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  division_id uuid not null references public.tournament_divisions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  unique (tournament_id, division_id, team_id)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  shirt_number integer,
  created_at timestamptz not null default now()
);

create table if not exists public.team_players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  is_substitute boolean not null default false,
  unique (team_id, player_id)
);

create table if not exists public.fixtures (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  date_number integer not null,
  calendar_date date,
  is_locked boolean not null default false,
  recesses jsonb not null default '[]'::jsonb,
  generated_at timestamptz,
  unique (tournament_id, date_number)
);

alter table public.fixtures add column if not exists is_locked boolean not null default false;

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  division_id uuid references public.tournament_divisions(id),
  local_team_id uuid not null references public.teams(id),
  visitor_team_id uuid not null references public.teams(id),
  scheduled_time time,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished', 'cancelled')),
  local_score integer not null default 0,
  visitor_score integer not null default 0,
  period text not null default 'first_half' check (period in ('first_half', 'second_half')),
  is_paused boolean not null default false,
  started_at timestamptz,
  finished_at timestamptz
);

alter table public.matches add column if not exists elapsed_seconds integer not null default 0;
alter table public.matches add column if not exists period text not null default 'first_half';
alter table public.matches add column if not exists is_paused boolean not null default false;

alter table public.matches
  drop constraint if exists matches_period_check;

alter table public.matches
  add constraint matches_period_check
  check (period in ('first_half', 'second_half'));

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  player_id uuid,
  event_type text not null check (event_type in ('try', 'conversion', 'penalty', 'yellow_card', 'red_card', 'injured', 'concussion')),
  points integer not null default 0,
  reason text,
  match_second integer,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.substitution_requests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  player_out_id uuid,
  player_in_id uuid,
  status text not null default 'requested' check (status in ('requested', 'attended', 'completed', 'cancelled')),
  requested_by uuid not null references auth.users(id),
  attended_by uuid references auth.users(id),
  completed_at timestamptz
);

alter table public.tournaments enable row level security;
alter table public.tournament_divisions enable row level security;
alter table public.teams enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.players enable row level security;
alter table public.team_players enable row level security;
alter table public.fixtures enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;
alter table public.substitution_requests enable row level security;

create or replace function public.has_user_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = required_role);
$$;

create policy "Authenticated users can view tournaments" on public.tournaments for select to authenticated using (true);
drop policy if exists "Directivos can create tournaments" on public.tournaments;
drop policy if exists "Directivos can create divisions" on public.tournament_divisions;
drop policy if exists "Directivos can create teams" on public.teams;
drop policy if exists "Directivos can link tournament teams" on public.tournament_teams;
create policy "Directivos can create tournaments" on public.tournaments for insert to authenticated with check (public.has_user_role('directivo'));
create policy "Directivos can create divisions" on public.tournament_divisions for insert to authenticated with check (public.has_user_role('directivo'));
create policy "Directivos can create teams" on public.teams for insert to authenticated with check (public.has_user_role('directivo'));
create policy "Directivos can link tournament teams" on public.tournament_teams for insert to authenticated with check (public.has_user_role('directivo'));
create policy "Authenticated users can view tournament data" on public.tournament_divisions for select to authenticated using (true);
create policy "Authenticated users can view teams" on public.teams for select to authenticated using (true);
create policy "Authenticated users can view tournament teams" on public.tournament_teams for select to authenticated using (true);
create policy "Authenticated users can view players" on public.players for select to authenticated using (true);
create policy "Authenticated users can view team players" on public.team_players for select to authenticated using (true);
create policy "Authenticated users can view fixtures" on public.fixtures for select to authenticated using (true);
drop policy if exists "Tournament owners can create fixtures" on public.fixtures;
drop policy if exists "Tournament owners can update fixtures" on public.fixtures;
drop policy if exists "Tournament owners can delete fixtures" on public.fixtures;
create policy "Tournament owners can create fixtures" on public.fixtures for insert to authenticated
  with check (exists (
    select 1
    from public.tournaments t
    where t.id = fixtures.tournament_id and t.created_by = auth.uid()
  ));
create policy "Tournament owners can update fixtures" on public.fixtures for update to authenticated
  using (exists (
    select 1
    from public.tournaments t
    where t.id = fixtures.tournament_id and t.created_by = auth.uid()
  ))
  with check (exists (
    select 1
    from public.tournaments t
    where t.id = fixtures.tournament_id and t.created_by = auth.uid()
  ));
create policy "Tournament owners can delete fixtures" on public.fixtures for delete to authenticated
  using (exists (
    select 1
    from public.tournaments t
    where t.id = fixtures.tournament_id and t.created_by = auth.uid()
  ));
create policy "Authenticated users can view matches" on public.matches for select to authenticated using (true);
drop policy if exists "Tournament owners can create matches" on public.matches;
drop policy if exists "Tournament owners can update matches" on public.matches;
drop policy if exists "Tournament owners can delete matches" on public.matches;
create policy "Tournament owners can create matches" on public.matches for insert to authenticated
  with check (exists (
    select 1
    from public.fixtures f
    join public.tournaments t on t.id = f.tournament_id
    where f.id = matches.fixture_id and t.created_by = auth.uid()
  ));
create policy "Tournament owners can update matches" on public.matches for update to authenticated
  using (exists (
    select 1
    from public.fixtures f
    join public.tournaments t on t.id = f.tournament_id
    where f.id = matches.fixture_id and t.created_by = auth.uid()
  ))
  with check (exists (
    select 1
    from public.fixtures f
    join public.tournaments t on t.id = f.tournament_id
    where f.id = matches.fixture_id and t.created_by = auth.uid()
  ));
create policy "Tournament owners can delete matches" on public.matches for delete to authenticated
  using (exists (
    select 1
    from public.fixtures f
    join public.tournaments t on t.id = f.tournament_id
    where f.id = matches.fixture_id and t.created_by = auth.uid()
  ));
create policy "Authenticated users can view match events" on public.match_events for select to authenticated using (true);
create policy "Tournament owners can create match events" on public.match_events for insert to authenticated
  with check (created_by = auth.uid() and exists (
    select 1
    from public.matches m
    join public.fixtures f on f.id = m.fixture_id
    join public.tournaments t on t.id = f.tournament_id
    where m.id = match_events.match_id and t.created_by = auth.uid()
  ));
create policy "Authenticated users can view substitution requests" on public.substitution_requests for select to authenticated using (true);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.fixtures to authenticated;
grant select, insert, update, delete on public.matches to authenticated;
grant select, insert, update, delete on public.match_events to authenticated;

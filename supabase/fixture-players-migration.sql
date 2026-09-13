-- Ejecuta este bloque una sola vez para registrar plantillas por fecha.
-- No modifica fixtures existentes ni agrega is_locked.

alter table public.players
  add column if not exists created_by uuid references auth.users(id);

create table if not exists public.fixture_players (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  shirt_number integer not null check (shirt_number >= 0 and shirt_number <= 99),
  is_substitute boolean not null default false,
  created_at timestamptz not null default now(),
  unique (fixture_id, player_id)
);

create index if not exists fixture_players_fixture_id_idx
  on public.fixture_players(fixture_id);

create index if not exists fixture_players_team_id_idx
  on public.fixture_players(team_id);

alter table public.players enable row level security;
alter table public.team_players enable row level security;
alter table public.fixture_players enable row level security;

grant select, insert on public.players to authenticated;
grant select, insert, update on public.team_players to authenticated;
grant select, insert, update, delete on public.fixture_players to authenticated;

drop policy if exists "Authenticated users can create players" on public.players;
create policy "Authenticated users can create players" on public.players
for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists "Tournament owners can create team players" on public.team_players;
create policy "Tournament owners can create team players" on public.team_players
for insert to authenticated
with check (
  exists (
    select 1
    from public.tournament_teams tt
    join public.tournaments t on t.id = tt.tournament_id
    where tt.team_id = team_players.team_id
      and t.created_by = auth.uid()
  )
);

drop policy if exists "Tournament owners can update team players" on public.team_players;
create policy "Tournament owners can update team players" on public.team_players
for update to authenticated
using (
  exists (
    select 1
    from public.tournament_teams tt
    join public.tournaments t on t.id = tt.tournament_id
    where tt.team_id = team_players.team_id
      and t.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.tournament_teams tt
    join public.tournaments t on t.id = tt.tournament_id
    where tt.team_id = team_players.team_id
      and t.created_by = auth.uid()
  )
);

drop policy if exists "Authenticated users can view fixture players" on public.fixture_players;
create policy "Authenticated users can view fixture players" on public.fixture_players
for select to authenticated
using (true);

drop policy if exists "Tournament owners can create fixture players" on public.fixture_players;
create policy "Tournament owners can create fixture players" on public.fixture_players
for insert to authenticated
with check (
  exists (
    select 1
    from public.fixtures f
    join public.tournaments t on t.id = f.tournament_id
    where f.id = fixture_players.fixture_id
      and t.created_by = auth.uid()
  )
);

drop policy if exists "Tournament owners can update fixture players" on public.fixture_players;
create policy "Tournament owners can update fixture players" on public.fixture_players
for update to authenticated
using (
  exists (
    select 1
    from public.fixtures f
    join public.tournaments t on t.id = f.tournament_id
    where f.id = fixture_players.fixture_id
      and t.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.fixtures f
    join public.tournaments t on t.id = f.tournament_id
    where f.id = fixture_players.fixture_id
      and t.created_by = auth.uid()
  )
);

drop policy if exists "Tournament owners can delete fixture players" on public.fixture_players;
create policy "Tournament owners can delete fixture players" on public.fixture_players
for delete to authenticated
using (
  exists (
    select 1
    from public.fixtures f
    join public.tournaments t on t.id = f.tournament_id
    where f.id = fixture_players.fixture_id
      and t.created_by = auth.uid()
  )
);

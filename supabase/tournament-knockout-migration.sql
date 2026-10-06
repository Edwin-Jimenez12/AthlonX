-- Estructura persistente para fases de eliminacion directa por torneo y division.
create table if not exists public.tournament_knockout_stages (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  division_id uuid not null references public.tournament_divisions(id) on delete cascade,
  name text not null,
  round_number integer not null check (round_number > 0),
  bracket_size integer not null check (bracket_size >= 2),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'finished')),
  created_at timestamptz not null default now(),
  unique (tournament_id, division_id, round_number)
);

create table if not exists public.tournament_knockout_matches (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.tournament_knockout_stages(id)
    on delete cascade,
  position integer not null check (position > 0),
  local_team_id uuid references public.teams(id),
  visitor_team_id uuid references public.teams(id),
  winner_team_id uuid references public.teams(id),
  local_source text,
  visitor_source text,
  next_match_id uuid references public.tournament_knockout_matches(id)
    on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'scheduled', 'finished', 'bye')),
  source_match_id uuid references public.matches(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (stage_id, position)
);

create index if not exists tournament_knockout_stages_lookup_idx
  on public.tournament_knockout_stages(tournament_id, division_id, round_number);

create index if not exists tournament_knockout_matches_stage_idx
  on public.tournament_knockout_matches(stage_id, position);

alter table public.tournament_knockout_stages enable row level security;
alter table public.tournament_knockout_matches enable row level security;

drop policy if exists "Public can view tournament knockout stages"
  on public.tournament_knockout_stages;
create policy "Public can view tournament knockout stages"
  on public.tournament_knockout_stages for select
  using (true);

drop policy if exists "Public can view tournament knockout matches"
  on public.tournament_knockout_matches;
create policy "Public can view tournament knockout matches"
  on public.tournament_knockout_matches for select
  using (true);

drop policy if exists "Tournament owners manage knockout stages"
  on public.tournament_knockout_stages;
create policy "Tournament owners manage knockout stages"
  on public.tournament_knockout_stages for all to authenticated
  using (exists (
    select 1 from public.tournaments t
    where t.id = tournament_knockout_stages.tournament_id
      and t.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.tournaments t
    where t.id = tournament_knockout_stages.tournament_id
      and t.created_by = auth.uid()
  ));

drop policy if exists "Tournament owners manage knockout matches"
  on public.tournament_knockout_matches;
create policy "Tournament owners manage knockout matches"
  on public.tournament_knockout_matches for all to authenticated
  using (exists (
    select 1
    from public.tournament_knockout_stages s
    join public.tournaments t on t.id = s.tournament_id
    where s.id = tournament_knockout_matches.stage_id
      and t.created_by = auth.uid()
  ))
  with check (exists (
    select 1
    from public.tournament_knockout_stages s
    join public.tournaments t on t.id = s.tournament_id
    where s.id = tournament_knockout_matches.stage_id
      and t.created_by = auth.uid()
  ));

grant select on public.tournament_knockout_stages,
  public.tournament_knockout_matches to anon, authenticated;
grant insert, update, delete on public.tournament_knockout_stages,
  public.tournament_knockout_matches to authenticated;

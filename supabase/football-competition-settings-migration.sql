-- AthlonX: configuración competitiva específica para torneos de fútbol.
-- Los torneos de rugby no reciben filas en esta tabla.

create table if not exists public.tournament_competition_settings (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  competition_format text not null check (
    competition_format in ('quick_league', 'group_stage', 'knockout')
  ),
  courts_count integer not null default 1 check (courts_count > 0),
  modality_rules_id uuid references public.sport_modality_rules(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id)
);

create index if not exists tournament_competition_settings_tournament_idx
  on public.tournament_competition_settings(tournament_id);

alter table public.tournament_competition_settings enable row level security;

drop policy if exists "Authenticated users can view competition settings"
  on public.tournament_competition_settings;
create policy "Authenticated users can view competition settings"
  on public.tournament_competition_settings
  for select
  to authenticated
  using (true);

drop policy if exists "Tournament owners can manage competition settings"
  on public.tournament_competition_settings;
create policy "Tournament owners can manage competition settings"
  on public.tournament_competition_settings
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.tournaments tournament
      where tournament.id = tournament_competition_settings.tournament_id
        and tournament.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tournaments tournament
      where tournament.id = tournament_competition_settings.tournament_id
        and tournament.created_by = auth.uid()
    )
  );

grant select, insert, update, delete
  on public.tournament_competition_settings to authenticated;

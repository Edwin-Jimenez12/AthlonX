alter table public.tournament_competition_settings
  add column if not exists qualifying_teams_per_group integer not null default 4
  check (qualifying_teams_per_group > 0);

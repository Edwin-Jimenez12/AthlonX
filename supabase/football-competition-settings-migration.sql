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

alter table public.tournament_competition_settings
  add column if not exists max_teams integer not null default 14
    check (max_teams > 0);

alter table public.tournament_competition_settings
  add column if not exists half_duration_minutes integer not null default 20
    check (half_duration_minutes > 0);

alter table public.tournament_competition_settings
  add column if not exists halftime_duration_minutes integer not null default 5
    check (halftime_duration_minutes in (5, 15));

-- Permite configurar el descanso libremente para cada torneo.
alter table public.tournament_competition_settings
  drop constraint if exists tournament_competition_settings_halftime_duration_minutes_check;

alter table public.tournament_competition_settings
  add constraint tournament_competition_settings_halftime_duration_minutes_check
    check (halftime_duration_minutes >= 0 and halftime_duration_minutes <= 60);

alter table public.tournament_competition_settings
  add column if not exists max_roster_size integer not null default 12
    check (max_roster_size > 0);

alter table public.tournament_competition_settings
  add column if not exists interval_between_matches_minutes integer not null default 10
    check (interval_between_matches_minutes = 10);

-- Permite definir el intervalo de cada torneo desde su formulario.
alter table public.tournament_competition_settings
  drop constraint if exists tournament_competition_settings_interval_between_matches_minutes_check;

alter table public.tournament_competition_settings
  add constraint tournament_competition_settings_interval_between_matches_minutes_check
    check (interval_between_matches_minutes >= 0
      and interval_between_matches_minutes <= 120);

-- Limita la configuración de canchas a las opciones disponibles en fútbol.
update public.tournament_competition_settings
  set courts_count = least(greatest(courts_count, 1), 2)
  where courts_count not in (1, 2);

alter table public.tournament_competition_settings
  drop constraint if exists tournament_competition_settings_courts_count_check;

alter table public.tournament_competition_settings
  add constraint tournament_competition_settings_courts_count_check
    check (courts_count in (1, 2));

-- Fútbol 5 vs 5 debe tener exactamente 10 equipos.
update public.tournament_competition_settings settings
  set max_teams = 10
  from public.sport_modality_rules rules
  join public.sport_modalities modality on modality.id = rules.modality_id
  where settings.modality_rules_id = rules.id
    and modality.code = 'futbol-5'
    and settings.max_teams <> 10;

create or replace function public.validate_football_competition_settings()
returns trigger
language plpgsql
as $$
declare
  modality_code text;
begin
  if new.courts_count not in (1, 2) then
    raise exception 'El número de canchas debe ser 1 o 2.';
  end if;

  select modality.code
    into modality_code
    from public.sport_modality_rules rules
    join public.sport_modalities modality on modality.id = rules.modality_id
    where rules.id = new.modality_rules_id;

  if modality_code = 'futbol-5' and new.max_teams <> 10 then
    raise exception 'Fútbol 5 vs 5 requiere exactamente 10 equipos.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_football_competition_settings_trigger
  on public.tournament_competition_settings;

create trigger validate_football_competition_settings_trigger
  before insert or update on public.tournament_competition_settings
  for each row execute function public.validate_football_competition_settings();

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

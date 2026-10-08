-- AthlonX: reglas independientes para las modalidades de fútbol.
-- Esta migración no modifica disciplinas, modalidades ni torneos de rugby.

create table if not exists public.sport_modality_rules (
  id uuid primary key default gen_random_uuid(),
  modality_id uuid not null references public.sport_modalities(id) on delete cascade,
  players_on_field integer not null check (players_on_field > 0),
  max_roster_size integer not null check (max_roster_size >= players_on_field),
  substitutions_allowed integer,
  substitutions_unlimited boolean not null default false,
  half_duration_minutes integer not null check (half_duration_minutes > 0),
  halftime_duration_minutes integer not null default 10
    check (halftime_duration_minutes >= 0),
  clock_can_pause boolean not null default true,
  extra_time_allowed boolean not null default true,
  extra_time_half_minutes integer not null default 5
    check (extra_time_half_minutes >= 0),
  penalty_shootout_allowed boolean not null default true,
  draws_allowed boolean not null default true,
  points_for_win integer not null default 3 check (points_for_win >= 0),
  points_for_draw integer not null default 1 check (points_for_draw >= 0),
  points_for_loss integer not null default 0 check (points_for_loss >= 0),
  tiebreakers text[] not null default array[
    'points',
    'goal_difference',
    'goals_for',
    'head_to_head',
    'disciplinary_record'
  ]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (modality_id)
);

create index if not exists sport_modality_rules_modality_idx
  on public.sport_modality_rules(modality_id);

alter table public.sport_modality_rules enable row level security;

drop policy if exists "Authenticated users can view modality rules"
  on public.sport_modality_rules;
create policy "Authenticated users can view modality rules"
  on public.sport_modality_rules
  for select
  to authenticated
  using (true);

grant select on public.sport_modality_rules to authenticated;

-- Carga únicamente las reglas de las modalidades de fútbol existentes.
insert into public.sport_modality_rules (
  modality_id,
  players_on_field,
  max_roster_size,
  substitutions_allowed,
  substitutions_unlimited,
  half_duration_minutes,
  halftime_duration_minutes,
  clock_can_pause,
  extra_time_allowed,
  extra_time_half_minutes,
  penalty_shootout_allowed,
  draws_allowed,
  points_for_win,
  points_for_draw,
  points_for_loss
)
select
  modality.id,
  rules.players_on_field,
  rules.max_roster_size,
  rules.substitutions_allowed,
  rules.substitutions_unlimited,
  rules.half_duration_minutes,
  10,
  true,
  true,
  rules.extra_time_half_minutes,
  true,
  true,
  3,
  1,
  0
from public.sport_modalities modality
join (
  values
    ('futbol-5', 5, 12, null::integer, true, 20, 5),
    ('futbol-7', 7, 16, 7, false, 25, 5),
    ('futbol-8', 8, 18, 8, false, 30, 5),
    ('futbol-11', 11, 23, 5, false, 45, 15)
) as rules(
  modality_code,
  players_on_field,
  max_roster_size,
  substitutions_allowed,
  substitutions_unlimited,
  half_duration_minutes,
  extra_time_half_minutes
) on rules.modality_code = modality.code
join public.disciplines discipline
  on discipline.id = modality.discipline_id
  and discipline.code = 'futbol'
where modality.is_active = true
on conflict (modality_id) do update set
  players_on_field = excluded.players_on_field,
  max_roster_size = excluded.max_roster_size,
  substitutions_allowed = excluded.substitutions_allowed,
  substitutions_unlimited = excluded.substitutions_unlimited,
  half_duration_minutes = excluded.half_duration_minutes,
  extra_time_half_minutes = excluded.extra_time_half_minutes,
  updated_at = now();

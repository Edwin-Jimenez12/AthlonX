-- Rugby 7 overtime (prórroga) with golden point rule (muerte subida)
-- Tracks overtime state for playoff matches that end in ties

alter table public.matches
  add column if not exists match_phase text not null default 'regular'
    check (match_phase in ('regular', 'overtime', 'overtime_finished'));

alter table public.matches
  add column if not exists overtime_minutes integer
    check (overtime_minutes is null or overtime_minutes > 0);

alter table public.matches
  add column if not exists overtime_started_at timestamp with time zone
    check (overtime_started_at is null or overtime_started_at <= now());

-- Restaura el constraint de match_phase con todos los valores que usa la app
-- (extra_time y penalty_shootout los escribe la lógica de fútbol 8).
alter table public.matches drop constraint if exists matches_match_phase_check;
alter table public.matches add constraint matches_match_phase_check
  check (match_phase in ('regular', 'extra_time', 'penalty_shootout', 'overtime', 'overtime_finished'));

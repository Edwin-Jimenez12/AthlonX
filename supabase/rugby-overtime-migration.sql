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

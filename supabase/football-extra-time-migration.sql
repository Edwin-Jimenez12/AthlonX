alter table public.matches
  add column if not exists match_phase text not null default 'regular'
    check (match_phase in ('regular', 'extra_time', 'penalty_shootout'));

alter table public.matches
  add column if not exists extra_time_seconds integer not null default 0
    check (extra_time_seconds >= 0);

alter table public.matches
  add column if not exists shootout_local_score integer
    check (shootout_local_score is null or shootout_local_score >= 0);

alter table public.matches
  add column if not exists shootout_visitor_score integer
    check (shootout_visitor_score is null or shootout_visitor_score >= 0);

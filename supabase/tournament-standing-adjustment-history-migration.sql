-- AthlonX: historial detallado de ajustes de puntos en torneos.
-- Ejecutar después de tournament-standing-adjustments-migration.sql.

create table if not exists public.tournament_standing_adjustment_history (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  division_id uuid not null references public.tournament_divisions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  points_adjustment integer not null,
  reason text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists tournament_standing_adjustment_history_lookup_idx
  on public.tournament_standing_adjustment_history(tournament_id, division_id, team_id, created_at desc);

alter table public.tournament_standing_adjustment_history enable row level security;

drop policy if exists "Public can view adjustment history" on public.tournament_standing_adjustment_history;
create policy "Public can view adjustment history"
  on public.tournament_standing_adjustment_history for select
  using (true);

grant select on public.tournament_standing_adjustment_history to anon, authenticated;

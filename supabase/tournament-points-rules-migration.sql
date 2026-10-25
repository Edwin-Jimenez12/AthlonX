-- Puntos por resultado configurables por torneo. Si son null, la app usa el valor por defecto de la disciplina.
-- Idempotente. Depende de: tournament_competition_settings.

alter table public.tournament_competition_settings
  add column if not exists points_for_win integer check (points_for_win is null or points_for_win >= 0),
  add column if not exists points_for_draw integer check (points_for_draw is null or points_for_draw >= 0),
  add column if not exists points_for_loss integer check (points_for_loss is null or points_for_loss >= 0);

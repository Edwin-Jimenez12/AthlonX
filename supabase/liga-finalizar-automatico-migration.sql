-- Cierra la liga sola cuando ya hay campeón. Idempotente.
-- - Liga + Fase final: al terminar la última final.
-- - Todos contra todos: al terminar todos los partidos de la liga (cada pareja,
--   tantas veces como vueltas tenga el torneo).
-- Guarda como fecha final el día de esa fecha (o hoy si no tiene día).
-- Depende de: matches, fixtures.stage, tournament_competition_settings.round_robin_legs, tournament_teams.

create or replace function public.finish_league_tournament()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  target_tournament uuid;
  fixture_stage text;
  fixture_day date;
  league_format text;
  legs integer;
  expected integer;
  finished_count integer;
  pending integer;
begin
  if new.status <> 'finished' or old.status = 'finished' then return new; end if;

  select f.tournament_id, f.stage, f.calendar_date into target_tournament, fixture_stage, fixture_day
  from public.fixtures f where f.id = new.fixture_id;
  if target_tournament is null then return new; end if;

  select s.competition_format, coalesce(s.round_robin_legs, 1) into league_format, legs
  from public.tournament_competition_settings s where s.tournament_id = target_tournament;

  if league_format = 'league_playoffs' then
    if fixture_stage <> 'final' then return new; end if;
    select count(*) into pending
    from public.matches m join public.fixtures f on f.id = m.fixture_id
    where f.tournament_id = target_tournament and f.stage = 'final' and m.status <> 'finished';
    if pending > 0 then return new; end if;
  elsif league_format = 'round_robin' then
    select coalesce(sum(team_count * (team_count - 1) / 2), 0) * legs into expected
    from (
      select count(distinct tt.team_id) as team_count
      from public.tournament_teams tt
      where tt.tournament_id = target_tournament
      group by tt.division_id
    ) divisions;
    select count(*) into finished_count
    from public.matches m join public.fixtures f on f.id = m.fixture_id
    where f.tournament_id = target_tournament and f.stage = 'league' and m.status = 'finished';
    if expected = 0 or finished_count < expected then return new; end if;
  else
    return new;
  end if;

  update public.tournaments
  set status = 'finished', end_date = coalesce(fixture_day, current_date)
  where id = target_tournament and status <> 'finished';
  return new;
end $function$;

drop trigger if exists finish_league_tournament_trigger on public.matches;
create trigger finish_league_tournament_trigger
after update of status on public.matches
for each row execute function public.finish_league_tournament();

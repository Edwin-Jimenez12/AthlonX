-- El torneo pasa a "En curso" cuando empieza su primer partido.
-- Solo cambia torneos publicados; un borrador sigue siendo visible únicamente para su creador.
-- Idempotente. Depende de: matches, tournaments, fixtures.

create or replace function public.start_tournament_on_first_match()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  target_tournament uuid;
begin
  if new.status <> 'live' or old.status = 'live' then return new; end if;

  select f.tournament_id into target_tournament
  from public.fixtures f where f.id = new.fixture_id;
  if target_tournament is null then return new; end if;

  update public.tournaments
  set status = 'in_progress'
  where id = target_tournament and status = 'published';
  return new;
end $function$;

drop trigger if exists start_tournament_on_first_match_trigger on public.matches;
create trigger start_tournament_on_first_match_trigger
after update of status on public.matches
for each row execute function public.start_tournament_on_first_match();

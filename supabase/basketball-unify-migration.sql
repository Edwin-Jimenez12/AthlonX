-- Baloncesto 3x3 usa las mismas secciones que fútbol 8: llave, equipos, generador y partidos.
-- Esta migración deja lista la base que esas secciones necesitan. Idempotente.
-- Ejecutar después de basketball-01-settings.sql, basketball-02-matches.sql y basketball-03-bracket.sql.
-- Si se vuelve a ejecutar football-rugby-event-isolation-migration.sql, este archivo deja el trigger
-- de marcador con básquet incluido.

begin;

-- 1. Horario de apertura/cierre y sede, que la base real no tenía.
alter table public.tournament_basketball_settings
  add column if not exists closes_at time,
  add column if not exists venue text;

update public.tournament_basketball_settings
set closes_at = '22:00:00'
where closes_at is null;

-- 2. Marcador de básquet: la misma regla que está en producción.
create or replace function public.sync_match_score_from_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  match_id_value uuid;
  local_team_value uuid;
  visitor_team_value uuid;
  discipline_code_value text;
begin
  match_id_value := case when tg_op = 'DELETE' then old.match_id else new.match_id end;

  select match_row.local_team_id, match_row.visitor_team_id, discipline.code
    into local_team_value, visitor_team_value, discipline_code_value
  from public.matches match_row
  join public.fixtures fixture on fixture.id = match_row.fixture_id
  join public.tournaments tournament on tournament.id = fixture.tournament_id
  join public.disciplines discipline on discipline.id = tournament.discipline_id
  where match_row.id = match_id_value;

  if discipline_code_value = 'baloncesto' then
    perform public.sync_basketball_score(match_id_value);
  elsif discipline_code_value in ('futbol', 'rugby') and local_team_value is not null and visitor_team_value is not null then
    update public.matches match_row
    set local_score = coalesce((
          select sum(event_row.points)
          from public.match_events event_row
          where event_row.match_id = match_id_value
            and event_row.team_id = local_team_value
            and not event_row.is_corrected
            and ((discipline_code_value = 'futbol' and event_row.event_type in ('goal', 'penalty_kick'))
              or (discipline_code_value = 'rugby' and event_row.event_type in ('try', 'conversion', 'penalty')))
        ), 0),
        visitor_score = coalesce((
          select sum(event_row.points)
          from public.match_events event_row
          where event_row.match_id = match_id_value
            and event_row.team_id = visitor_team_value
            and not event_row.is_corrected
            and ((discipline_code_value = 'futbol' and event_row.event_type in ('goal', 'penalty_kick'))
              or (discipline_code_value = 'rugby' and event_row.event_type in ('try', 'conversion', 'penalty')))
        ), 0)
    where match_row.id = match_id_value;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- 3. Llave de 16 equipos de básquet: mismo flujo que fútbol 8, con horarios de periodo + intervalo.
create or replace function public.generate_basketball_bracket(p_tournament_id uuid, p_division_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  settings public.tournament_basketball_settings%rowtype;
  team_ids uuid[];
  stage_ids uuid[] := '{}';
  fixture_ids uuid[] := '{}';
  new_id uuid;
  match_id uuid;
  date_base integer;
  round_no integer;
  pos integer;
  match_slot integer;
  match_interval integer;
begin
  perform 1 from public.tournaments t
  join public.disciplines d on d.id = t.discipline_id
  where t.id = p_tournament_id and t.created_by = auth.uid() and d.code = 'baloncesto'
  for update of t;
  if not found then raise exception 'No autorizado o el torneo no es de baloncesto.'; end if;

  select * into settings from public.tournament_basketball_settings where tournament_id = p_tournament_id;
  if settings.tournament_id is null then raise exception 'Falta la configuración de baloncesto del torneo.'; end if;
  match_interval := settings.period_minutes + settings.interval_minutes;

  if not exists (select 1 from public.tournament_divisions where id = p_division_id and tournament_id = p_tournament_id) then
    raise exception 'La división no pertenece al torneo.';
  end if;
  if exists (select 1 from public.tournament_knockout_stages where tournament_id = p_tournament_id) then
    raise exception 'La llave ya fue generada.';
  end if;

  select array_agg(team_id order by random()) into team_ids
  from public.tournament_teams
  where tournament_id = p_tournament_id and division_id = p_division_id;
  if coalesce(array_length(team_ids, 1), 0) <> 16
     or (select count(distinct team_id) from public.tournament_teams where tournament_id = p_tournament_id and division_id = p_division_id) <> 16 then
    raise exception 'Se requieren exactamente 16 equipos distintos en una división.';
  end if;

  select coalesce(max(date_number), 0) into date_base from public.fixtures where tournament_id = p_tournament_id;
  for round_no in 1..4 loop
    insert into public.tournament_knockout_stages(tournament_id, division_id, name, round_number, bracket_size)
    values (p_tournament_id, p_division_id, (array['Octavos de final', 'Cuartos de final', 'Semifinales', 'Final'])[round_no], round_no, 16 / (2 ^ (round_no - 1))::integer)
    returning id into new_id;
    stage_ids := array_append(stage_ids, new_id);

    insert into public.fixtures(tournament_id, date_number) values (p_tournament_id, date_base + round_no)
    returning id into new_id;
    fixture_ids := array_append(fixture_ids, new_id);

    for pos in 1..(8 / (2 ^ (round_no - 1))::integer) loop
      match_id := null;
      if round_no = 1 then
        match_slot := floor((pos - 1) / settings.courts_count);
        insert into public.matches(fixture_id, division_id, local_team_id, visitor_team_id, court_number, scheduled_time)
        values (fixture_ids[1], p_division_id, team_ids[pos * 2 - 1], team_ids[pos * 2],
          ((pos - 1) % settings.courts_count) + 1,
          settings.opens_at + make_interval(mins => match_slot * match_interval))
        returning id into match_id;
      end if;

      insert into public.tournament_knockout_matches(stage_id, position, local_team_id, visitor_team_id, local_source, visitor_source, source_match_id, status)
      values (stage_ids[round_no], pos,
        case when round_no = 1 then team_ids[pos * 2 - 1] end,
        case when round_no = 1 then team_ids[pos * 2] end,
        case when round_no > 1 then 'Ganador del cruce ' || (pos * 2 - 1) end,
        case when round_no > 1 then 'Ganador del cruce ' || (pos * 2) end,
        match_id,
        case when round_no = 1 then 'scheduled' else 'pending' end);
    end loop;
  end loop;
end;
$$;

revoke all on function public.generate_basketball_bracket(uuid, uuid) from public, anon;
grant execute on function public.generate_basketball_bracket(uuid, uuid) to authenticated;

-- 4. Llave de básquet con cruces, horas y canchas definidos a mano.
create or replace function public.generate_basketball_manual_bracket(p_tournament_id uuid, p_division_id uuid, p_pairings jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  settings public.tournament_basketball_settings%rowtype;
  team_ids uuid[];
  used_team_ids uuid[] := '{}';
  stage_ids uuid[] := '{}';
  fixture_ids uuid[] := '{}';
  new_id uuid;
  match_id uuid;
  date_base integer;
  round_no integer;
  pos integer;
  pair jsonb;
  local_team uuid;
  visitor_team uuid;
  selected_court integer;
  scheduled_match_time time;
begin
  if jsonb_typeof(p_pairings) <> 'array' or jsonb_array_length(p_pairings) <> 8 then
    raise exception 'La llave manual debe tener exactamente 8 cruces.';
  end if;

  perform 1 from public.tournaments t
  join public.disciplines d on d.id = t.discipline_id
  where t.id = p_tournament_id and t.created_by = auth.uid() and d.code = 'baloncesto'
  for update of t;
  if not found then raise exception 'No autorizado o el torneo no es de baloncesto.'; end if;

  select * into settings from public.tournament_basketball_settings where tournament_id = p_tournament_id;
  if settings.tournament_id is null then raise exception 'Falta la configuración de baloncesto del torneo.'; end if;

  if exists (select 1 from public.tournament_knockout_stages where tournament_id = p_tournament_id) then
    raise exception 'La llave ya fue generada.';
  end if;

  select array_agg(tt.team_id order by tt.id) into team_ids
  from public.tournament_teams tt
  where tt.tournament_id = p_tournament_id and tt.division_id = p_division_id;
  if coalesce(array_length(team_ids, 1), 0) <> 16
     or (select count(distinct tt.team_id) from public.tournament_teams tt where tt.tournament_id = p_tournament_id and tt.division_id = p_division_id) <> 16 then
    raise exception 'Se requieren exactamente 16 equipos en una división.';
  end if;

  for pos in 0..7 loop
    pair := p_pairings -> pos;
    local_team := (pair ->> 'local_team_id')::uuid;
    visitor_team := (pair ->> 'visitor_team_id')::uuid;
    scheduled_match_time := nullif(pair ->> 'scheduled_time', '')::time;
    selected_court := nullif(pair ->> 'court_number', '')::integer;

    if local_team is null or visitor_team is null or local_team = visitor_team then
      raise exception 'Cada cruce debe tener dos equipos distintos.';
    end if;
    if not (local_team = any(team_ids)) or not (visitor_team = any(team_ids)) then
      raise exception 'Todos los equipos deben pertenecer a la división.';
    end if;
    if scheduled_match_time is null then raise exception 'Cada cruce debe tener una hora válida.'; end if;
    if selected_court is null or selected_court < 1 or selected_court > settings.courts_count then
      raise exception 'La cancha seleccionada no está disponible.';
    end if;
    if local_team = any(used_team_ids) or visitor_team = any(used_team_ids) then
      raise exception 'Un equipo no puede aparecer en dos cruces.';
    end if;
    used_team_ids := array_append(used_team_ids, local_team);
    used_team_ids := array_append(used_team_ids, visitor_team);
  end loop;

  select coalesce(max(date_number), 0) into date_base from public.fixtures where tournament_id = p_tournament_id;
  for round_no in 1..4 loop
    insert into public.tournament_knockout_stages(tournament_id, division_id, name, round_number, bracket_size)
    values (p_tournament_id, p_division_id, (array['Octavos de final', 'Cuartos de final', 'Semifinales', 'Final'])[round_no], round_no, 16 / (2 ^ (round_no - 1))::integer)
    returning id into new_id;
    stage_ids := array_append(stage_ids, new_id);

    insert into public.fixtures(tournament_id, date_number, recesses, generated_at)
    values (p_tournament_id, date_base + round_no, '[]'::jsonb, now())
    returning id into new_id;
    fixture_ids := array_append(fixture_ids, new_id);

    for pos in 1..(8 / (2 ^ (round_no - 1))::integer) loop
      match_id := null;
      if round_no = 1 then
        pair := p_pairings -> (pos - 1);
        insert into public.matches(fixture_id, division_id, local_team_id, visitor_team_id, court_number, scheduled_time)
        values (fixture_ids[1], p_division_id,
          (pair ->> 'local_team_id')::uuid, (pair ->> 'visitor_team_id')::uuid,
          (pair ->> 'court_number')::integer, (pair ->> 'scheduled_time')::time)
        returning id into match_id;
      end if;

      insert into public.tournament_knockout_matches(stage_id, position, local_team_id, visitor_team_id, local_source, visitor_source, source_match_id, status)
      values (stage_ids[round_no], pos,
        case when round_no = 1 then (p_pairings -> (pos - 1) ->> 'local_team_id')::uuid end,
        case when round_no = 1 then (p_pairings -> (pos - 1) ->> 'visitor_team_id')::uuid end,
        case when round_no > 1 then 'Ganador del cruce ' || (pos * 2 - 1) end,
        case when round_no > 1 then 'Ganador del cruce ' || (pos * 2) end,
        match_id,
        case when round_no = 1 then 'scheduled' else 'pending' end);
    end loop;
  end loop;
end;
$$;

revoke all on function public.generate_basketball_manual_bracket(uuid, uuid, jsonb) from public, anon;
grant execute on function public.generate_basketball_manual_bracket(uuid, uuid, jsonb) to authenticated;

-- 5. Eliminar la llave de básquet para volver a generarla. No se permite si ya hay partidos jugados.
create or replace function public.delete_basketball_bracket(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from public.tournaments t
  join public.disciplines d on d.id = t.discipline_id
  where t.id = p_tournament_id and t.created_by = auth.uid() and d.code = 'baloncesto'
  for update of t;
  if not found then raise exception 'No autorizado o el torneo no es de baloncesto.'; end if;

  if exists (
    select 1 from public.matches mt join public.fixtures f on f.id = mt.fixture_id
    where f.tournament_id = p_tournament_id and mt.status in ('live', 'finished')
  ) then
    raise exception 'No se puede eliminar la llave: ya hay partidos en juego o finalizados.';
  end if;

  delete from public.tournament_knockout_matches
  where stage_id in (select id from public.tournament_knockout_stages where tournament_id = p_tournament_id);
  delete from public.tournament_knockout_stages where tournament_id = p_tournament_id;
  delete from public.matches where fixture_id in (select id from public.fixtures where tournament_id = p_tournament_id);
  delete from public.fixtures where tournament_id = p_tournament_id;
end;
$$;

revoke all on function public.delete_basketball_bracket(uuid) from public, anon;
grant execute on function public.delete_basketball_bracket(uuid) to authenticated;

-- 6. Torneos de básquet existentes: configuración de competencia igual a la de fútbol 8.
insert into public.tournament_competition_settings (
  tournament_id, competition_format, courts_count, max_teams,
  half_duration_minutes, halftime_duration_minutes, interval_between_matches_minutes
)
select s.tournament_id, 'knockout', s.courts_count, 16,
  s.period_minutes, 0, s.interval_minutes
from public.tournament_basketball_settings s
where not exists (
  select 1 from public.tournament_competition_settings c where c.tournament_id = s.tournament_id
);

commit;

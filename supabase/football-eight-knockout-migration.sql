-- Fútbol 8 vs 8: ejecutar después de football-modality-rules,
-- football-competition-settings, football-extra-time, tournament-knockout
-- y tournament-courts.
-- No convierte torneos existentes ni borra resultados.
begin;

alter table public.matches
  add column if not exists court_number integer check (court_number > 0);

-- Permite confirmar explícitamente el cierre anticipado de un tiempo.
alter table public.matches
  add column if not exists early_finish_confirmed boolean not null default false;

-- Los esquemas anteriores solo aceptaban first_half y second_half.
alter table public.matches drop constraint if exists matches_period_check;
alter table public.matches add constraint matches_period_check
  check (period in ('first_half', 'second_half', 'extra_first_half', 'extra_second_half'));

insert into public.sport_modalities (discipline_id, code, name, is_active)
select id, 'futbol-8', 'Fútbol 8 vs 8', true from public.disciplines d
where d.code = 'futbol' and not exists (
  select 1 from public.sport_modalities m where m.discipline_id = d.id and m.code = 'futbol-8'
);
update public.sport_modalities m set is_active = true, name = 'Fútbol 8 vs 8'
from public.disciplines d where m.discipline_id = d.id and d.code = 'futbol' and m.code = 'futbol-8';

insert into public.sport_modality_rules (
  modality_id, players_on_field, max_roster_size, substitutions_allowed,
  substitutions_unlimited, half_duration_minutes, halftime_duration_minutes,
  extra_time_allowed, extra_time_half_minutes, penalty_shootout_allowed, draws_allowed
)
select m.id, 8, 15, null, true, 20, 5, true, 5, true, false
from public.sport_modalities m join public.disciplines d on d.id = m.discipline_id
where d.code = 'futbol' and m.code = 'futbol-8'
on conflict (modality_id) do update set
  players_on_field = 8, max_roster_size = 15, substitutions_allowed = null,
  substitutions_unlimited = true, half_duration_minutes = 20,
  halftime_duration_minutes = 5,
  extra_time_allowed = true, extra_time_half_minutes = 5,
  penalty_shootout_allowed = true, draws_allowed = false, updated_at = now();
-- Se conserva el campo histórico extra_time_half_minutes=5; el partido de
-- fútbol 8 usa un único bloque extra de 10 minutos (600 segundos).

-- Resuelve la modalidad desde el torneo, no desde un identificador enviado por el cliente.
create or replace function public.validate_football_competition_settings()
returns trigger language plpgsql set search_path = public as $$
declare modality_code text; rule_id uuid;
begin
  if new.courts_count not in (1, 2) then raise exception 'El número de canchas debe ser 1 o 2.'; end if;
  select m.code, r.id into modality_code, rule_id
  from public.tournaments t join public.sport_modalities m on m.id = t.modality_id
  join public.disciplines d on d.id = t.discipline_id and d.id = m.discipline_id
  left join public.sport_modality_rules r on r.modality_id = m.id
  where t.id = new.tournament_id and d.code = 'futbol';
  if modality_code = 'futbol-5' and new.max_teams <> 10 then
    raise exception 'Fútbol 5 vs 5 requiere exactamente 10 equipos.';
  end if;
  if modality_code = 'futbol-8' then
    if new.max_teams <> 16 or new.competition_format <> 'knockout' then
      raise exception 'Fútbol 8 vs 8 requiere 16 equipos y eliminación directa.';
    end if;
    if rule_id is null then raise exception 'Faltan las reglas de fútbol 8.'; end if;
    new.modality_rules_id := rule_id;
  end if;
  return new;
end $$;

-- Serializa inscripciones para evitar superar el límite por solicitudes simultáneas.
create or replace function public.limit_football_eight_teams()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_tournament uuid;
begin
  target_tournament := case when tg_op = 'DELETE' then old.tournament_id else new.tournament_id end;
  perform 1 from public.tournaments t join public.sport_modalities m on m.id = t.modality_id
  where t.id = target_tournament and m.code = 'futbol-8' for update of t;
  if not found then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'UPDATE' and new.tournament_id = old.tournament_id and new.division_id = old.division_id and new.team_id = old.team_id then return new; end if;
  if exists (select 1 from public.tournament_knockout_stages where tournament_id = target_tournament) then
    raise exception 'La inscripción está cerrada porque la llave ya fue generada.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if (select count(*) from public.tournament_teams where tournament_id = new.tournament_id) >= 16 then
    raise exception 'Fútbol 8 vs 8 admite un máximo de 16 equipos.';
  end if;
  return new;
end $$;
drop trigger if exists limit_football_eight_teams_trigger on public.tournament_teams;
create trigger limit_football_eight_teams_trigger before insert or update or delete on public.tournament_teams
for each row execute function public.limit_football_eight_teams();

-- Genera las cuatro rondas y los ocho partidos reales de octavos en una transacción.
create or replace function public.generate_football_eight_bracket(p_tournament_id uuid, p_division_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  team_ids uuid[]; stage_ids uuid[] := '{}'; fixture_ids uuid[] := '{}';
  new_id uuid; match_id uuid; date_base integer; round_no integer; pos integer;
  courts integer; match_interval integer; match_slot integer;
begin
  perform 1 from public.tournaments t join public.sport_modalities m on m.id = t.modality_id
  join public.disciplines d on d.id = t.discipline_id
  join public.tournament_competition_settings s on s.tournament_id = t.id
  where t.id = p_tournament_id and t.created_by = auth.uid()
    and d.code = 'futbol' and m.code = 'futbol-8'
    and s.competition_format = 'knockout' and s.max_teams = 16 for update of t;
  if not found then raise exception 'No autorizado o configuración de fútbol 8 incompleta.'; end if;
  select s.courts_count,
    (s.half_duration_minutes * 2)
      + s.halftime_duration_minutes
      + s.interval_between_matches_minutes
    into courts, match_interval
  from public.tournament_competition_settings s
  where s.tournament_id = p_tournament_id;
  if not exists (select 1 from public.tournament_divisions where id = p_division_id and tournament_id = p_tournament_id) then
    raise exception 'La división no pertenece al torneo.';
  end if;
  if exists (select 1 from public.tournament_knockout_stages where tournament_id = p_tournament_id) then
    raise exception 'La llave ya fue generada.';
  end if;
  select array_agg(team_id order by id) into team_ids from public.tournament_teams
    where tournament_id = p_tournament_id and division_id = p_division_id;
  if coalesce(array_length(team_ids, 1), 0) <> 16 or
    (select count(*) from public.tournament_teams where tournament_id = p_tournament_id) <> 16 or
    (select count(distinct team_id) from public.tournament_teams where tournament_id = p_tournament_id and division_id = p_division_id) <> 16 then
    raise exception 'Se requieren exactamente 16 equipos distintos en una división.';
  end if;
  select coalesce(max(date_number), 0) into date_base from public.fixtures where tournament_id = p_tournament_id;
  for round_no in 1..4 loop
    insert into public.tournament_knockout_stages(tournament_id, division_id, name, round_number, bracket_size)
      values(p_tournament_id, p_division_id, (array['Octavos de final','Cuartos de final','Semifinales','Final'])[round_no], round_no, 16 / (2 ^ (round_no - 1))::integer)
      returning id into new_id;
    stage_ids := array_append(stage_ids, new_id);
    insert into public.fixtures(tournament_id, date_number) values(p_tournament_id, date_base + round_no) returning id into new_id;
    fixture_ids := array_append(fixture_ids, new_id);
    for pos in 1..(8 / (2 ^ (round_no - 1))::integer) loop
      match_id := null;
      if round_no = 1 then
        match_slot := floor((pos - 1) / courts);
        insert into public.matches(fixture_id, division_id, local_team_id, visitor_team_id)
        values(fixture_ids[1], p_division_id, team_ids[pos * 2 - 1], team_ids[pos * 2])
        returning id into match_id;
        update public.matches
        set court_number = ((pos - 1) % courts) + 1,
            scheduled_time = time '08:00'
              + make_interval(mins => match_slot * match_interval)
        where id = match_id;
      end if;
      insert into public.tournament_knockout_matches(stage_id, position, local_team_id, visitor_team_id, local_source, visitor_source, source_match_id, status)
      values(stage_ids[round_no], pos, case when round_no = 1 then team_ids[pos * 2 - 1] end,
        case when round_no = 1 then team_ids[pos * 2] end,
        case when round_no > 1 then 'Ganador del cruce ' || (pos * 2 - 1) end,
        case when round_no > 1 then 'Ganador del cruce ' || (pos * 2) end,
        match_id, case when round_no = 1 then 'scheduled' else 'pending' end);
    end loop;
  end loop;
end $$;
revoke all on function public.generate_football_eight_bracket(uuid, uuid) from public, anon;
grant execute on function public.generate_football_eight_bracket(uuid, uuid) to authenticated;

-- Genera una llave de fútbol 8 usando los cruces, horarios y canchas enviados.
create or replace function public.generate_football_eight_manual_bracket(
  p_tournament_id uuid,
  p_division_id uuid,
  p_pairings jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  team_ids uuid[];
  used_team_ids uuid[] := '{}';
  stage_ids uuid[] := '{}';
  fixture_ids uuid[] := '{}';
  new_id uuid;
  match_id uuid;
  date_base integer;
  round_no integer;
  pos integer;
  courts integer;
  pair jsonb;
  local_team uuid;
  visitor_team uuid;
  scheduled_match_time time;
  selected_court integer;
begin
  if jsonb_typeof(p_pairings) <> 'array'
     or jsonb_array_length(p_pairings) <> 8 then
    raise exception 'La llave manual debe tener exactamente 8 cruces.';
  end if;

  perform 1
  from public.tournaments t
  join public.sport_modalities m on m.id = t.modality_id
  join public.disciplines d on d.id = t.discipline_id
  join public.tournament_competition_settings s on s.tournament_id = t.id
  where t.id = p_tournament_id
    and t.created_by = auth.uid()
    and d.code = 'futbol'
    and m.code = 'futbol-8'
    and s.competition_format = 'knockout'
    and s.max_teams = 16
  for update of t;

  if not found then
    raise exception 'No autorizado o configuración de fútbol 8 incompleta.';
  end if;

  select s.courts_count
  into courts
  from public.tournament_competition_settings s
  where s.tournament_id = p_tournament_id;

  if courts is null or courts < 1 then
    raise exception 'El torneo no tiene canchas configuradas.';
  end if;

  if exists (
    select 1
    from public.tournament_knockout_stages
    where tournament_id = p_tournament_id
  ) then
    raise exception 'La llave ya fue generada.';
  end if;

  select array_agg(tt.team_id order by tt.id)
  into team_ids
  from public.tournament_teams tt
  where tt.tournament_id = p_tournament_id
    and tt.division_id = p_division_id;

  if coalesce(array_length(team_ids, 1), 0) <> 16
     or (select count(distinct tt.team_id)
         from public.tournament_teams tt
         where tt.tournament_id = p_tournament_id
           and tt.division_id = p_division_id) <> 16 then
    raise exception 'Se requieren exactamente 16 equipos en una división.';
  end if;

  for pos in 0..7 loop
    pair := p_pairings -> pos;
    local_team := (pair ->> 'local_team_id')::uuid;
    visitor_team := (pair ->> 'visitor_team_id')::uuid;
    scheduled_match_time := nullif(pair ->> 'scheduled_time', '')::time;
    selected_court := nullif(pair ->> 'court_number', '')::integer;

    if local_team is null or visitor_team is null
       or local_team = visitor_team then
      raise exception 'Cada cruce debe tener dos equipos distintos.';
    end if;
    if not (local_team = any(team_ids))
       or not (visitor_team = any(team_ids)) then
      raise exception 'Todos los equipos deben pertenecer a la división.';
    end if;
    if scheduled_match_time is null then
      raise exception 'Cada cruce debe tener una hora válida.';
    end if;
    if selected_court is null or selected_court < 1
       or selected_court > courts then
      raise exception 'La cancha seleccionada no está disponible.';
    end if;
    if local_team = any(used_team_ids)
       or visitor_team = any(used_team_ids) then
      raise exception 'Un equipo no puede aparecer en dos cruces.';
    end if;
    used_team_ids := array_append(used_team_ids, local_team);
    used_team_ids := array_append(used_team_ids, visitor_team);
  end loop;

  if coalesce(array_length(used_team_ids, 1), 0) <> 16 then
    raise exception 'Todos los equipos deben estar incluidos una sola vez.';
  end if;

  select coalesce(max(date_number), 0)
  into date_base
  from public.fixtures
  where tournament_id = p_tournament_id;

  for round_no in 1..4 loop
    insert into public.tournament_knockout_stages(
      tournament_id, division_id, name, round_number, bracket_size
    ) values (
      p_tournament_id,
      p_division_id,
      (array['Octavos de final', 'Cuartos de final', 'Semifinales', 'Final'])[
        round_no
      ],
      round_no,
      16 / (2 ^ (round_no - 1))::integer
    ) returning id into new_id;
    stage_ids := array_append(stage_ids, new_id);

    insert into public.fixtures(
      tournament_id, date_number, recesses, generated_at
    ) values (
      p_tournament_id,
      date_base + round_no,
      '[]'::jsonb,
      now()
    ) returning id into new_id;
    fixture_ids := array_append(fixture_ids, new_id);

    for pos in 1..(8 / (2 ^ (round_no - 1))::integer) loop
      match_id := null;
      if round_no = 1 then
        pair := p_pairings -> (pos - 1);
        insert into public.matches(
          fixture_id,
          division_id,
          local_team_id,
          visitor_team_id,
          court_number,
          scheduled_time
        ) values (
          fixture_ids[1],
          p_division_id,
          (pair ->> 'local_team_id')::uuid,
          (pair ->> 'visitor_team_id')::uuid,
          (pair ->> 'court_number')::integer,
          (pair ->> 'scheduled_time')::time
        ) returning id into match_id;
      end if;

      insert into public.tournament_knockout_matches(
        stage_id,
        position,
        local_team_id,
        visitor_team_id,
        local_source,
        visitor_source,
        source_match_id,
        status
      ) values (
        stage_ids[round_no],
        pos,
        case when round_no = 1 then (p_pairings -> (pos - 1) ->> 'local_team_id')::uuid end,
        case when round_no = 1 then (p_pairings -> (pos - 1) ->> 'visitor_team_id')::uuid end,
        case when round_no > 1 then 'Ganador del cruce ' || (pos * 2 - 1) end,
        case when round_no > 1 then 'Ganador del cruce ' || (pos * 2) end,
        match_id,
        case when round_no = 1 then 'scheduled' else 'pending' end
      );
    end loop;
  end loop;
end;
$$;

revoke all on function public.generate_football_eight_manual_bracket(
  uuid,
  uuid,
  jsonb
) from public, anon;
grant execute on function public.generate_football_eight_manual_bracket(
  uuid,
  uuid,
  jsonb
) to authenticated;

-- Reglas de transición verificadas también en PostgreSQL.
create or replace function public.validate_football_eight_match()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  elapsed integer;
  tied boolean;
  half_minutes integer;
  event_local_score integer;
  event_visitor_score integer;
begin
  if not exists (select 1 from public.fixtures f join public.tournaments t on t.id = f.tournament_id
    join public.sport_modalities m on m.id = t.modality_id where f.id = new.fixture_id and m.code = 'futbol-8') then return new; end if;
  select s.half_duration_minutes
    into half_minutes
  from public.tournament_competition_settings s
  join public.fixtures f on f.tournament_id = s.tournament_id
  where f.id = new.fixture_id;

  -- Usa los eventos persistidos como fuente oficial del marcador.
  select coalesce(sum(event_row.points) filter (
      where event_row.team_id = new.local_team_id
    ), 0),
    coalesce(sum(event_row.points) filter (
      where event_row.team_id = new.visitor_team_id
    ), 0)
    into event_local_score, event_visitor_score
  from public.match_events event_row
  where event_row.match_id = new.id
    and event_row.event_type in ('goal', 'penalty_kick')
    and not event_row.is_corrected;

  new.local_score := event_local_score;
  new.visitor_score := event_visitor_score;
  tied := event_local_score = event_visitor_score;

  if old.match_phase <> 'regular' and new.match_phase = 'regular' then raise exception 'No se puede volver al tiempo reglamentario.'; end if;
  if new.period = 'extra_first_half' and new.match_phase = 'regular' then raise exception 'La prórroga requiere la fase extra_time.'; end if;
  elapsed := coalesce(old.elapsed_seconds, 0) + case when old.status = 'live' and not old.is_paused and old.started_at is not null
    then greatest(0, floor(extract(epoch from now() - old.started_at))::integer) else 0 end;
  if old.status = 'finished' and (new.local_score, new.visitor_score, new.status, new.shootout_local_score, new.shootout_visitor_score)
    is distinct from (old.local_score, old.visitor_score, old.status, old.shootout_local_score, old.shootout_visitor_score) then
    raise exception 'No se puede modificar un resultado final de la llave.';
  end if;
  if new.period = 'extra_second_half' then raise exception 'Fútbol 8 usa un único tiempo extra de 10 minutos.'; end if;
  if old.period = 'first_half' and new.period = 'second_half' then
    if elapsed < half_minutes * 60 and not new.early_finish_confirmed then
      raise exception 'El primer tiempo aún no ha terminado.';
    end if;
    new.is_paused := true; new.started_at := now(); new.elapsed_seconds := 0;
    new.early_finish_confirmed := false;
  end if;
  if old.period = 'second_half' and old.is_paused and not new.is_paused then
    new.started_at := now(); new.elapsed_seconds := 0;
  end if;
  if new.match_phase = 'extra_time' and old.match_phase <> 'extra_time' then
    if old.period <> 'second_half' or old.is_paused
      or (elapsed < half_minutes * 60 and not new.early_finish_confirmed)
      or not tied then
      raise exception 'La prórroga requiere empate al terminar el tiempo reglamentario.';
    end if;
    new.extra_time_seconds := 0;
    new.early_finish_confirmed := false;
  end if;
  if new.match_phase = 'penalty_shootout' and old.match_phase <> 'penalty_shootout' then
    if old.match_phase <> 'extra_time' or old.is_paused or not tied then
      raise exception 'Los penales requieren empate después de iniciar el tiempo extra.';
    end if;
    new.extra_time_seconds := elapsed;
  end if;
  if new.status = 'finished' and old.status <> 'finished' then
    if old.match_phase = 'penalty_shootout' then
      if not tied or new.shootout_local_score is null or new.shootout_visitor_score is null or new.shootout_local_score = new.shootout_visitor_score then
        raise exception 'La tanda de penales debe tener un ganador.';
      end if;
    elsif tied or old.is_paused
      or (old.match_phase = 'regular'
        and (old.period <> 'second_half'
          or (elapsed < half_minutes * 60 and not new.early_finish_confirmed))) then
      raise exception 'Cumple el tiempo reglamentario y registra el desempate antes de finalizar.';
    end if;
    new.early_finish_confirmed := false;
  end if;
  return new;
end $$;
drop trigger if exists validate_football_eight_match_trigger on public.matches;
create trigger validate_football_eight_match_trigger before update on public.matches
for each row execute function public.validate_football_eight_match();

-- Finalizar un partido avanza su ganador y crea el siguiente cruce cuando tenga ambos equipos.
create or replace function public.advance_football_eight_winner()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  bracket public.tournament_knockout_matches%rowtype;
  stage public.tournament_knockout_stages%rowtype;
  next_bracket public.tournament_knockout_matches%rowtype;
  winner uuid; next_fixture uuid; next_match uuid; source_date integer;
  courts integer; match_interval integer; next_position integer;
  match_slot integer;
begin
  if new.status <> 'finished' or old.status = 'finished' then return new; end if;
  if not exists (select 1 from public.fixtures f join public.tournaments t on t.id = f.tournament_id
    join public.sport_modalities m on m.id = t.modality_id where f.id = new.fixture_id and m.code = 'futbol-8') then return new; end if;
  -- Bloqueo por torneo: dos partidos de la misma ronda pueden finalizar simultáneamente.
  perform 1 from public.tournaments t join public.fixtures f on f.tournament_id = t.id where f.id = new.fixture_id for update of t;
  select * into bracket from public.tournament_knockout_matches where source_match_id = new.id for update;
  if not found then return new; end if;
  select * into stage from public.tournament_knockout_stages where id = bracket.stage_id;
  select s.courts_count,
    (s.half_duration_minutes * 2)
      + s.halftime_duration_minutes
      + s.interval_between_matches_minutes
    into courts, match_interval
  from public.tournament_competition_settings s
  where s.tournament_id = stage.tournament_id;
  winner := case when new.local_score > new.visitor_score then new.local_team_id
    when new.visitor_score > new.local_score then new.visitor_team_id
    when new.shootout_local_score > new.shootout_visitor_score then new.local_team_id else new.visitor_team_id end;
  update public.tournament_knockout_matches set winner_team_id = winner, status = 'finished' where id = bracket.id;
  select b.* into next_bracket from public.tournament_knockout_matches b
    join public.tournament_knockout_stages s on s.id = b.stage_id
    where s.tournament_id = stage.tournament_id and s.division_id = stage.division_id
      and s.round_number = stage.round_number + 1 and b.position = (bracket.position + 1) / 2 for update of b;
  if not found then
    update public.tournament_knockout_stages set status = 'finished' where id = stage.id;
    return new;
  end if;
  if bracket.position % 2 = 1 then next_bracket.local_team_id := winner; else next_bracket.visitor_team_id := winner; end if;
  if next_bracket.local_team_id is not null and next_bracket.visitor_team_id is not null and next_bracket.source_match_id is null then
    select date_number into source_date from public.fixtures where id = new.fixture_id;
    select id into next_fixture from public.fixtures where tournament_id = stage.tournament_id and date_number = source_date + 1;
    if next_fixture is null then raise exception 'No existe la jornada de la siguiente ronda.'; end if;
    next_position := (bracket.position + 1) / 2;
    match_slot := floor((next_position - 1) / courts);
    insert into public.matches(
      fixture_id, division_id, local_team_id, visitor_team_id,
      court_number, scheduled_time
    ) values (
      next_fixture, stage.division_id, next_bracket.local_team_id,
      next_bracket.visitor_team_id, ((next_position - 1) % courts) + 1,
      time '08:00' + make_interval(mins => match_slot * match_interval)
    ) returning id into next_match;
    next_bracket.source_match_id := next_match;
  end if;
  update public.tournament_knockout_matches set local_team_id = next_bracket.local_team_id,
    visitor_team_id = next_bracket.visitor_team_id, source_match_id = next_bracket.source_match_id,
    status = case when next_bracket.source_match_id is null then 'pending' else 'scheduled' end where id = next_bracket.id;
  return new;
end $$;
drop trigger if exists advance_football_eight_winner_trigger on public.matches;
create trigger advance_football_eight_winner_trigger after update on public.matches
for each row execute function public.advance_football_eight_winner();

commit;

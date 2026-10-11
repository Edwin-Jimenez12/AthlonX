-- Fútbol 8 vs 8: ejecutar después de football-modality-rules,
-- football-competition-settings, football-extra-time y tournament-knockout.
-- No convierte torneos existentes ni borra resultados.
begin;

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
select m.id, 8, 18, 8, false, 20, 5, true, 5, true, false
from public.sport_modalities m join public.disciplines d on d.id = m.discipline_id
where d.code = 'futbol' and m.code = 'futbol-8'
on conflict (modality_id) do update set
  players_on_field = 8, half_duration_minutes = 20, halftime_duration_minutes = 5,
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
    if new.max_teams <> 16 or new.competition_format <> 'knockout'
      or new.half_duration_minutes <> 20 or new.halftime_duration_minutes <> 5 then
      raise exception 'Fútbol 8 vs 8 requiere 16 equipos, eliminación directa, tiempos de 20 minutos y descanso de 5 minutos.';
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
begin
  perform 1 from public.tournaments t join public.sport_modalities m on m.id = t.modality_id
  join public.disciplines d on d.id = t.discipline_id
  join public.tournament_competition_settings s on s.tournament_id = t.id
  where t.id = p_tournament_id and t.created_by = auth.uid()
    and d.code = 'futbol' and m.code = 'futbol-8'
    and s.competition_format = 'knockout' and s.max_teams = 16
    and s.half_duration_minutes = 20 and s.halftime_duration_minutes = 5 for update of t;
  if not found then raise exception 'No autorizado o configuración de fútbol 8 incompleta.'; end if;
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
        insert into public.matches(fixture_id, division_id, local_team_id, visitor_team_id)
        values(fixture_ids[1], p_division_id, team_ids[pos * 2 - 1], team_ids[pos * 2]) returning id into match_id;
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

-- Reglas de transición verificadas también en PostgreSQL.
create or replace function public.validate_football_eight_match()
returns trigger language plpgsql security definer set search_path = public as $$
declare elapsed integer; tied boolean;
begin
  if not exists (select 1 from public.fixtures f join public.tournaments t on t.id = f.tournament_id
    join public.sport_modalities m on m.id = t.modality_id where f.id = new.fixture_id and m.code = 'futbol-8') then return new; end if;
  tied := new.local_score = new.visitor_score;
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
    if elapsed < 1200 then raise exception 'El primer tiempo debe durar 20 minutos.'; end if;
    new.is_paused := true; new.started_at := now(); new.elapsed_seconds := 0;
  end if;
  if old.period = 'second_half' and old.is_paused and not new.is_paused then
    if old.started_at is null or now() < old.started_at + interval '5 minutes' then raise exception 'El descanso debe durar 5 minutos.'; end if;
    new.started_at := now(); new.elapsed_seconds := 0;
  end if;
  if new.match_phase = 'extra_time' and old.match_phase <> 'extra_time' then
    if old.period <> 'second_half' or old.is_paused or elapsed < 1200 or not tied then
      raise exception 'La prórroga requiere empate al terminar los dos tiempos de 20 minutos.';
    end if;
    new.extra_time_seconds := 0;
  end if;
  if new.match_phase = 'penalty_shootout' and old.match_phase <> 'penalty_shootout' then
    if old.match_phase <> 'extra_time' or elapsed < 600 or old.is_paused or not tied then
      raise exception 'Los penales requieren empate tras 10 minutos extra.';
    end if;
    new.extra_time_seconds := elapsed;
  end if;
  if new.status = 'finished' and old.status <> 'finished' then
    if old.match_phase = 'penalty_shootout' then
      if not tied or new.shootout_local_score is null or new.shootout_visitor_score is null or new.shootout_local_score = new.shootout_visitor_score then
        raise exception 'La tanda de penales debe tener un ganador.';
      end if;
    elsif tied or old.is_paused or (old.match_phase = 'extra_time' and elapsed < 600)
      or (old.match_phase = 'regular' and (old.period <> 'second_half' or elapsed < 1200)) then
      raise exception 'Cumple el tiempo reglamentario y registra el desempate antes de finalizar.';
    end if;
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
begin
  if new.status <> 'finished' or old.status = 'finished' then return new; end if;
  if not exists (select 1 from public.fixtures f join public.tournaments t on t.id = f.tournament_id
    join public.sport_modalities m on m.id = t.modality_id where f.id = new.fixture_id and m.code = 'futbol-8') then return new; end if;
  -- Bloqueo por torneo: dos partidos de la misma ronda pueden finalizar simultáneamente.
  perform 1 from public.tournaments t join public.fixtures f on f.tournament_id = t.id where f.id = new.fixture_id for update of t;
  select * into bracket from public.tournament_knockout_matches where source_match_id = new.id for update;
  if not found then return new; end if;
  select * into stage from public.tournament_knockout_stages where id = bracket.stage_id;
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
    insert into public.matches(fixture_id, division_id, local_team_id, visitor_team_id)
      values(next_fixture, stage.division_id, next_bracket.local_team_id, next_bracket.visitor_team_id) returning id into next_match;
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

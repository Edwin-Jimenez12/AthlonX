-- Fútbol 8 vs 8: eliminar la llave generada y sortear los cruces al volver a generarla.
-- Ejecutar después de football-eight-knockout-migration.sql. Idempotente.
-- No se ejecuta SQL contra el proyecto real sin pedirlo.

begin;

-- Borra la llave completa del torneo: cruces, etapas, partidos y jornadas.
-- Solo el creador del torneo y solo si todavía no hay partidos en juego o finalizados.
create or replace function public.delete_football_eight_bracket(p_tournament_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.tournaments t join public.sport_modalities m on m.id = t.modality_id
  join public.disciplines d on d.id = t.discipline_id
  where t.id = p_tournament_id and t.created_by = auth.uid()
    and d.code = 'futbol' and m.code = 'futbol-8' for update of t;
  if not found then raise exception 'No autorizado o el torneo no es de fútbol 8.'; end if;

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
end $$;
revoke all on function public.delete_football_eight_bracket(uuid) from public, anon;
grant execute on function public.delete_football_eight_bracket(uuid) to authenticated;

-- Misma generación de octavos, pero con los equipos sorteados al azar en cada llave.
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
  select array_agg(team_id order by random()) into team_ids from public.tournament_teams
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

commit;

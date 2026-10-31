-- Resultados ficticios de "bas" (baloncesto 3x3): octavos, cuartos y la primera semifinal.
-- Requiere la llave ya generada. Simula el reloj de cada partido (10 minutos) y registra canastas
-- con las mismas reglas de la app: el organizador autenticado, eventos con su puntuación y un ganador
-- sin empate. La final queda pendiente. El torneo sigue en borrador: no se publica.
-- Semilla fija (setseed) para resultados reproducibles.

do $$
declare
  tournament_uuid uuid := 'ff7cf955-a11d-458f-8947-56b5f72e9372'::uuid;
  owner_id uuid;
  m record;
  side int;
  team uuid;
  i int;
  n_in int;
  n_out int;
  n_ft int;
  local_points int;
  visitor_points int;
begin
  select created_by into owner_id from public.tournaments where id = tournament_uuid;
  if owner_id is null then
    raise exception 'No existe el torneo %.', tournament_uuid;
  end if;

  -- Las validaciones de básquet leen auth.uid(): actuamos como el organizador del torneo.
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  perform setseed(0.31);

  loop
    select mt.id, mt.local_team_id, mt.visitor_team_id into m
    from public.matches mt
    join public.tournament_knockout_matches b on b.source_match_id = mt.id
    join public.tournament_knockout_stages st on st.id = b.stage_id
    join public.fixtures f on f.id = mt.fixture_id
    where f.tournament_id = tournament_uuid
      and mt.status = 'scheduled'
      and (st.round_number < 3 or (st.round_number = 3 and b.position = 1))
    order by st.round_number, b.position
    limit 1;
    exit when not found;

    update public.matches set status = 'live', is_paused = false, started_at = now(), elapsed_seconds = 0 where id = m.id;

    for side in 1..2 loop
      team := case when side = 1 then m.local_team_id else m.visitor_team_id end;
      n_in := 6 + floor(random() * 6)::int;
      n_out := 1 + floor(random() * 4)::int;
      n_ft := floor(random() * 4)::int;

      for i in 1..n_in loop
        insert into public.match_events (match_id, team_id, event_type, points, created_by)
        values (m.id, team, 'basket_inside', 1, owner_id);
      end loop;
      for i in 1..n_out loop
        insert into public.match_events (match_id, team_id, event_type, points, created_by)
        values (m.id, team, 'basket_outside', 2, owner_id);
      end loop;
      for i in 1..n_ft loop
        insert into public.match_events (match_id, team_id, event_type, points, created_by)
        values (m.id, team, 'basket_free_throw', 1, owner_id);
      end loop;
      if random() < 0.3 then
        insert into public.match_events (match_id, team_id, event_type, points, created_by)
        values (m.id, team, 'basket_foul', 0, owner_id);
      end if;
    end loop;

    select local_score, visitor_score into local_points, visitor_points from public.matches where id = m.id;
    if local_points = visitor_points then
      insert into public.match_events (match_id, team_id, event_type, points, created_by)
      values (m.id, m.local_team_id, 'basket_free_throw', 1, owner_id);
    end if;

    -- Un periodo de 10 minutos cumplido: el partido termina sin prórroga.
    update public.matches set started_at = now() - interval '620 seconds' where id = m.id;
    update public.matches
    set status = 'finished', is_paused = true, elapsed_seconds = 620, started_at = null, finished_at = now()
    where id = m.id;
  end loop;
end $$;

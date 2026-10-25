-- Resultados ficticios de la liga de prueba de Rugby Sevens.
-- Requiere: seed-liga-rugby-sevens-prueba-completa.sql y el fixture ya generado.
-- Para cada partido pendiente: tries (5 pts), conversiones (2 pts), tarjetas amarillas,
-- rojas, conmociones y lesiones. No registra penales. Marcador = suma de puntos de los eventos.
-- Semilla fija (setseed) para que los resultados sean reproducibles.
-- Al terminar el último partido, la liga pasa sola a "Finalizado" (trigger existente).

do $$
declare
  owner_id uuid := 'ede6717e-6b7e-4ba5-9126-58ae0a292a56'::uuid;
  tournament_uuid uuid;
  m record;
  side int;
  team uuid;
  player uuid;
  tries int;
  i int;
  local_points int;
  visitor_points int;
begin
  select id into tournament_uuid from public.tournaments where slug = 'liga-rugby-sevens-prueba-2026';
  if tournament_uuid is null then
    raise exception 'No existe el torneo liga-rugby-sevens-prueba-2026.';
  end if;

  perform setseed(0.42);

  for m in
    select mt.id, mt.local_team_id, mt.visitor_team_id
    from public.matches mt
    join public.fixtures f on f.id = mt.fixture_id
    where f.tournament_id = tournament_uuid and mt.status <> 'finished'
    order by f.date_number, mt.scheduled_time
  loop
    for side in 1..2 loop
      team := case when side = 1 then m.local_team_id else m.visitor_team_id end;
      tries := floor(random() * 5)::int;

      for i in 1..tries loop
        select tp.player_id into player from public.team_players tp where tp.team_id = team order by random() limit 1;
        insert into public.match_events (match_id, team_id, player_id, event_type, points, match_second, created_by)
        values (m.id, team, player, 'try', 5, floor(random() * 420)::int, owner_id);

        if random() < 0.6 then
          select tp.player_id into player from public.team_players tp where tp.team_id = team order by random() limit 1;
          insert into public.match_events (match_id, team_id, player_id, event_type, points, match_second, created_by)
          values (m.id, team, player, 'conversion', 2, floor(random() * 420)::int, owner_id);
        end if;
      end loop;

      if random() < 0.35 then
        select tp.player_id into player from public.team_players tp where tp.team_id = team order by random() limit 1;
        insert into public.match_events (match_id, team_id, player_id, event_type, points, match_second, created_by)
        values (m.id, team, player, 'yellow_card', 0, floor(random() * 420)::int, owner_id);
      end if;

      if random() < 0.08 then
        select tp.player_id into player from public.team_players tp where tp.team_id = team order by random() limit 1;
        insert into public.match_events (match_id, team_id, player_id, event_type, points, match_second, created_by)
        values (m.id, team, player, 'red_card', 0, floor(random() * 420)::int, owner_id);
      end if;

      if random() < 0.10 then
        select tp.player_id into player from public.team_players tp where tp.team_id = team order by random() limit 1;
        insert into public.match_events (match_id, team_id, player_id, event_type, points, match_second, created_by)
        values (m.id, team, player, 'concussion', 0, floor(random() * 420)::int, owner_id);
      end if;

      if random() < 0.15 then
        select tp.player_id into player from public.team_players tp where tp.team_id = team order by random() limit 1;
        insert into public.match_events (match_id, team_id, player_id, event_type, points, match_second, created_by)
        values (m.id, team, player, 'injured', 0, floor(random() * 420)::int, owner_id);
      end if;
    end loop;

    select coalesce(sum(points), 0) into local_points from public.match_events where match_id = m.id and team_id = m.local_team_id;
    select coalesce(sum(points), 0) into visitor_points from public.match_events where match_id = m.id and team_id = m.visitor_team_id;

    update public.matches
    set local_score = local_points,
        visitor_score = visitor_points,
        status = 'finished',
        is_paused = true,
        elapsed_seconds = 840,
        started_at = null,
        finished_at = now()
    where id = m.id;
  end loop;
end $$;

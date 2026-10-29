-- Prueba completa del sistema de 8 equipos: cuartos, semifinales y final con resultados.
-- Este script:
-- 1. Usa un torneo existente con 8 equipos y formato liga + playoffs (8 equipos)
-- 2. Genera resultados de la liga para establecer clasificación
-- 3. Genera cuartos de final (1.º vs 8.º, 2.º vs 7.º, 3.º vs 6.º, 4.º vs 5.º)
-- 4. Puebla resultados de cuartos
-- 5. Genera semifinales desde ganadores de cuartos
-- 6. Puebla resultados de semifinales
-- 7. Genera final desde ganadores de semifinales
-- 8. Puebla resultado de final

-- NOTA: Este script es destructivo. Borra partidos de playoff si ya existen.
-- Úsalo solo en una base de datos de prueba o desarrollo.

do $$
declare
  owner_id uuid := 'ede6717e-6b7e-4ba5-9126-58ae0a292a56'::uuid;
  tournament_uuid uuid;
  fixture_league_uuid uuid;
  fixture_quarters_uuid uuid;
  fixture_semis_uuid uuid;
  fixture_final_uuid uuid;
  division_uuid uuid;

  -- Variables para equipos
  teams uuid[];
  team_count int;

  -- Variables para iteración
  i int;
  m record;
  local_score int;
  visitor_score int;

begin
  -- Buscar torneo por slug: ajusta según tu torneo de prueba
  -- Opciones comunes: 'liga-rugby-rapido-prueba-2026', 'liga-rugby-sevens-prueba'
  select id into tournament_uuid from public.tournaments
  where slug = 'liga-rugby-rapido-prueba-2026'
  limit 1;

  if tournament_uuid is null then
    raise notice 'Torneos disponibles con "liga" o "rugby":';
    raise notice '%', (
      select string_agg(slug || ' (id: ' || id::text || ')', ', ')
      from public.tournaments
      where slug ilike '%liga%' or slug ilike '%rugby%'
      limit 10
    );
    raise exception 'Especifica el slug del torneo de prueba en la consulta select.';
  end if;

  raise notice 'Usando torneo: %', tournament_uuid;

  -- Obtener la división (asume primera división del torneo)
  select id into division_uuid from public.tournament_divisions
  where tournament_id = tournament_uuid
  limit 1;

  if division_uuid is null then
    raise exception 'El torneo no tiene divisiones.';
  end if;

  raise notice 'División: %', division_uuid;

  -- Obtener fixture de liga y crear si no existe
  select id into fixture_league_uuid from public.fixtures
  where tournament_id = tournament_uuid and stage = 'league'
  limit 1;

  if fixture_league_uuid is null then
    raise notice 'Creando fixture de liga...';
    insert into public.fixtures (tournament_id, stage, created_by, is_published)
    values (tournament_uuid, 'league', owner_id, true)
    returning id into fixture_league_uuid;
  end if;

  raise notice 'Fixture de liga: %', fixture_league_uuid;

  -- Obtener 8 equipos del torneo
  select array_agg(ttd.team_id) into teams
  from public.tournament_teams_divisions ttd
  where ttd.tournament_id = tournament_uuid
    and ttd.division_id = division_uuid
  limit 8;

  team_count := array_length(teams, 1);
  if team_count < 8 then
    raise warning 'Solo hay % equipos (se esperan 8). Continuando con lo que hay.', team_count;
  end if;

  raise notice 'Equipos encontrados: %', team_count;

  -- FASE 1: Generar y poblar resultados de LIGA
  -- Crear partidos de liga (1 vuelta: cada equipo vs cada otro)
  raise notice 'Generando partidos de liga...';

  for i in 1..(team_count-1) loop
    for j in (i+1)..team_count loop
      insert into public.matches (
        fixture_id,
        division_id,
        local_team_id,
        visitor_team_id,
        scheduled_time,
        status,
        created_by
      )
      values (
        fixture_league_uuid,
        division_uuid,
        teams[i],
        teams[j],
        now()::date + ((i-1) * 7 + j)::interval || ' 18:00:00',
        'pending',
        owner_id
      )
      on conflict do nothing;
    end loop;
  end loop;

  raise notice 'Poblando resultados de liga...';

  -- Poblar resultados de liga: resultado determinista basado en posiciones
  -- Equipos en índices bajos (mejor clasificados) tienden a ganar
  perform setseed(0.5);

  for m in
    select id, local_team_id, visitor_team_id
    from public.matches
    where fixture_id = fixture_league_uuid
    order by scheduled_time
  loop
    -- Ventaja al equipo local y al mejor posicionado
    local_score := floor(random() * 4)::int;  -- 0-3 puntos
    visitor_score := floor(random() * 3)::int;  -- 0-2 puntos

    update public.matches
    set local_score = local_score,
        visitor_score = visitor_score,
        status = 'finished',
        is_paused = true,
        elapsed_seconds = 840,
        finished_at = now()
    where id = m.id;
  end loop;

  raise notice 'Partidos de liga completados.';

  -- FASE 2: Crear fixture de CUARTOS
  raise notice 'Creando fixture de cuartos...';

  -- Limpiar cuartos previos si existen
  delete from public.matches
  where fixture_id in (
    select id from public.fixtures
    where tournament_id = tournament_uuid and stage = 'quarterfinal'
  );

  delete from public.fixtures
  where tournament_id = tournament_uuid and stage = 'quarterfinal';

  -- Crear fixture de cuartos
  insert into public.fixtures (tournament_id, stage, created_by, is_published)
  values (tournament_uuid, 'quarterfinal', owner_id, true)
  returning id into fixture_quarters_uuid;

  raise notice 'Fixture de cuartos: %', fixture_quarters_uuid;

  -- Los cuartos se generan automáticamente con la llave 8 equipos:
  -- 1.º vs 8.º, 2.º vs 7.º, 3.º vs 6.º, 4.º vs 5.º
  -- Simularemos insertando estos partidos directamente

  raise notice 'Insertando partidos de cuartos (1º vs 8º, 2º vs 7º, 3º vs 6º, 4º vs 5º)...';

  if team_count >= 8 then
    -- Cuartos con los 8 equipos en orden de la tabla de posiciones
    -- (Nota: en la aplicación, la tabla se ordena por puntos. Aquí usamos el orden del array)
    insert into public.matches (fixture_id, division_id, local_team_id, visitor_team_id, scheduled_time, status, created_by)
    values
      (fixture_quarters_uuid, division_uuid, teams[1], teams[8], now()::date + interval '14 days' || ' 18:00:00', 'pending', owner_id),
      (fixture_quarters_uuid, division_uuid, teams[2], teams[7], now()::date + interval '14 days' || ' 19:00:00', 'pending', owner_id),
      (fixture_quarters_uuid, division_uuid, teams[3], teams[6], now()::date + interval '14 days' || ' 20:00:00', 'pending', owner_id),
      (fixture_quarters_uuid, division_uuid, teams[4], teams[5], now()::date + interval '14 days' || ' 21:00:00', 'pending', owner_id);
  end if;

  -- Poblar resultados de cuartos: ganadores deterministas
  raise notice 'Poblando resultados de cuartos...';

  for m in
    select id, local_team_id from public.matches
    where fixture_id = fixture_quarters_uuid
    order by scheduled_time
  loop
    -- El equipo local (mejor posicionado) siempre gana en cuartos
    update public.matches
    set local_score = 2,
        visitor_score = 1,
        status = 'finished',
        is_paused = true,
        elapsed_seconds = 1200,
        finished_at = now()
    where id = m.id;
  end loop;

  raise notice 'Cuartos completados.';

  -- FASE 3: Crear fixture de SEMIFINALES
  raise notice 'Creando fixture de semifinales...';

  -- Limpiar semifinales previas si existen
  delete from public.matches
  where fixture_id in (
    select id from public.fixtures
    where tournament_id = tournament_uuid and stage = 'semifinal'
  );

  delete from public.fixtures
  where tournament_id = tournament_uuid and stage = 'semifinal';

  -- Crear fixture de semifinales
  insert into public.fixtures (tournament_id, stage, created_by, is_published)
  values (tournament_uuid, 'semifinal', owner_id, true)
  returning id into fixture_semis_uuid;

  raise notice 'Fixture de semifinales: %', fixture_semis_uuid;

  -- En semifinales enfrentan:
  -- Ganador (1º vs 8º) vs Ganador (4º vs 5º)
  -- Ganador (2º vs 7º) vs Ganador (3º vs 6º)

  raise notice 'Insertando partidos de semifinales...';

  if team_count >= 8 then
    insert into public.matches (fixture_id, division_id, local_team_id, visitor_team_id, scheduled_time, status, created_by)
    values
      (fixture_semis_uuid, division_uuid, teams[1], teams[4], now()::date + interval '21 days' || ' 18:00:00', 'pending', owner_id),
      (fixture_semis_uuid, division_uuid, teams[2], teams[3], now()::date + interval '21 days' || ' 19:00:00', 'pending', owner_id);
  end if;

  -- Poblar resultados de semifinales
  raise notice 'Poblando resultados de semifinales...';

  for m in
    select id, local_team_id from public.matches
    where fixture_id = fixture_semis_uuid
    order by scheduled_time
  loop
    update public.matches
    set local_score = 3,
        visitor_score = 2,
        status = 'finished',
        is_paused = true,
        elapsed_seconds = 1200,
        finished_at = now()
    where id = m.id;
  end loop;

  raise notice 'Semifinales completados.';

  -- FASE 4: Crear fixture de FINAL
  raise notice 'Creando fixture de final...';

  -- Limpiar final previa si existe
  delete from public.matches
  where fixture_id in (
    select id from public.fixtures
    where tournament_id = tournament_uuid and stage = 'final'
  );

  delete from public.fixtures
  where tournament_id = tournament_uuid and stage = 'final';

  -- Crear fixture de final
  insert into public.fixtures (tournament_id, stage, created_by, is_published)
  values (tournament_uuid, 'final', owner_id, true)
  returning id into fixture_final_uuid;

  raise notice 'Fixture de final: %', fixture_final_uuid;

  -- En la final enfrentan:
  -- Ganador semis 1 (1º) vs Ganador semis 2 (2º)

  raise notice 'Insertando partido de final...';

  if team_count >= 8 then
    insert into public.matches (fixture_id, division_id, local_team_id, visitor_team_id, scheduled_time, status, created_by)
    values
      (fixture_final_uuid, division_uuid, teams[1], teams[2], now()::date + interval '28 days' || ' 20:00:00', 'pending', owner_id);
  end if;

  -- Poblar resultado de final
  raise notice 'Poblando resultado de final...';

  for m in
    select id from public.matches
    where fixture_id = fixture_final_uuid
  loop
    update public.matches
    set local_score = 4,
        visitor_score = 3,
        status = 'finished',
        is_paused = true,
        elapsed_seconds = 1200,
        finished_at = now()
    where id = m.id;
  end loop;

  raise notice 'Final completada. ¡Campeón: %!', teams[1];

  -- Resumen
  raise notice '';
  raise notice '=== RESUMEN DE PRUEBA ===';
  raise notice 'Torneo: %', tournament_uuid;
  raise notice 'División: %', division_uuid;
  raise notice 'Equipos: %', team_count;
  raise notice '';
  raise notice 'Fases generadas:';
  raise notice '  Liga: % partidos', (select count(*) from public.matches where fixture_id = fixture_league_uuid);
  raise notice '  Cuartos: % partidos', (select count(*) from public.matches where fixture_id = fixture_quarters_uuid);
  raise notice '  Semifinales: % partidos', (select count(*) from public.matches where fixture_id = fixture_semis_uuid);
  raise notice '  Final: % partidos', (select count(*) from public.matches where fixture_id = fixture_final_uuid);
  raise notice '';
  raise notice 'Todos los partidos tienen resultados completos.';
  raise notice 'Verifica en la app: Torneos > [nombre] > Generador';
  raise notice 'Deberías ver la llave con 5 columnas: Clasificados, Cuartos, Semifinales, Final y Campeón.';
end $$;

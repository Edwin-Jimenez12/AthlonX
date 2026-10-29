-- Test script for rugby 7 overtime (prórroga) with muerte subida
-- Creates a scenario with tied semifinal to test the complete overtime flow

do $$
declare
  owner_id uuid := 'ede6717e-6b7e-4ba5-9126-58ae0a292a56'::uuid;
  tournament_uuid uuid;
  fixture_league_uuid uuid;
  fixture_quarters_uuid uuid;
  fixture_semis_uuid uuid;
  division_uuid uuid;

  teams uuid[];
  team_count int;

  i int;
  m record;
begin
  -- Find tournament: update this slug to match your test tournament
  select id into tournament_uuid from public.tournaments
  where slug = 'liga-rugby-rapido-prueba-2026'
  limit 1;

  if tournament_uuid is null then
    raise notice 'Tournament not found. Available tournaments with "rugby" or "liga":';
    raise notice '%', (
      select string_agg(slug || ' (id: ' || id::text || ')', ', ')
      from public.tournaments
      where slug ilike '%liga%' or slug ilike '%rugby%'
      limit 10
    );
    raise exception 'Specify a valid tournament slug.';
  end if;

  raise notice 'Using tournament: %', tournament_uuid;

  -- Get division
  select id into division_uuid from public.tournament_divisions
  where tournament_id = tournament_uuid
  limit 1;

  if division_uuid is null then
    raise exception 'Tournament has no divisions.';
  end if;

  -- Get league fixture
  select id into fixture_league_uuid from public.fixtures
  where tournament_id = tournament_uuid and stage = 'league'
  limit 1;

  if fixture_league_uuid is null then
    raise exception 'Tournament has no league fixture.';
  end if;

  -- Get 8 teams
  select array_agg(ttd.team_id) into teams
  from public.tournament_teams_divisions ttd
  where ttd.tournament_id = tournament_uuid
    and ttd.division_id = division_uuid
  limit 8;

  team_count := array_length(teams, 1);
  if team_count < 8 then
    raise exception 'Need at least 8 teams. Found: %', team_count;
  end if;

  raise notice 'Found % teams.', team_count;

  -- Clean up existing playoff fixtures
  delete from public.matches
  where fixture_id in (
    select id from public.fixtures
    where tournament_id = tournament_uuid and stage in ('quarterfinal', 'semifinal', 'final')
  );

  delete from public.fixtures
  where tournament_id = tournament_uuid and stage in ('quarterfinal', 'semifinal', 'final');

  -- Create and populate quarters
  raise notice 'Creating quarterfinals...';
  insert into public.fixtures (tournament_id, stage, created_by, is_published)
  values (tournament_uuid, 'quarterfinal', owner_id, true)
  returning id into fixture_quarters_uuid;

  insert into public.matches (fixture_id, division_id, local_team_id, visitor_team_id, scheduled_time, status, created_by)
  values
    (fixture_quarters_uuid, division_uuid, teams[1], teams[8], now()::date + interval '14 days' || ' 18:00:00', 'finished', owner_id),
    (fixture_quarters_uuid, division_uuid, teams[2], teams[7], now()::date + interval '14 days' || ' 19:00:00', 'finished', owner_id),
    (fixture_quarters_uuid, division_uuid, teams[3], teams[6], now()::date + interval '14 days' || ' 20:00:00', 'finished', owner_id),
    (fixture_quarters_uuid, division_uuid, teams[4], teams[5], now()::date + interval '14 days' || ' 21:00:00', 'finished', owner_id);

  -- Populate quarter results
  for m in select id, local_team_id from public.matches where fixture_id = fixture_quarters_uuid order by scheduled_time loop
    update public.matches
    set local_score = 2, visitor_score = 1, is_paused = true, elapsed_seconds = 1200, finished_at = now()
    where id = m.id;
  end loop;

  raise notice 'Quarterfinals created and finished.';

  -- Create semifinals
  raise notice 'Creating semifinals...';
  insert into public.fixtures (tournament_id, stage, created_by, is_published)
  values (tournament_uuid, 'semifinal', owner_id, true)
  returning id into fixture_semis_uuid;

  -- Semifinal 1: teams[1] vs teams[4] → will end tied
  -- Semifinal 2: teams[2] vs teams[3] → will be decided
  insert into public.matches (fixture_id, division_id, local_team_id, visitor_team_id, scheduled_time, status, created_by)
  values
    (fixture_semis_uuid, division_uuid, teams[1], teams[4], now()::date + interval '21 days' || ' 18:00:00', 'finished', owner_id),
    (fixture_semis_uuid, division_uuid, teams[2], teams[3], now()::date + interval '21 days' || ' 19:00:00', 'finished', owner_id);

  -- Semifinal 1: Teams tied at 15-15 (requires overtime)
  -- Semifinal 2: Team 2 wins 20-10
  for m in select id, local_team_id from public.matches where fixture_id = fixture_semis_uuid order by scheduled_time limit 1 loop
    update public.matches
    set local_score = 15, visitor_score = 15, is_paused = true, elapsed_seconds = 1200, finished_at = now()
    where id = m.id;
  end loop;

  for m in select id, local_team_id from public.matches where fixture_id = fixture_semis_uuid order by scheduled_time offset 1 limit 1 loop
    update public.matches
    set local_score = 20, visitor_score = 10, is_paused = true, elapsed_seconds = 1200, finished_at = now()
    where id = m.id;
  end loop;

  raise notice 'Semifinals created and finished.';
  raise notice '';
  raise notice '=== OVERTIME TEST SCENARIO ===';
  raise notice 'Tournament: %', tournament_uuid;
  raise notice 'Division: %', division_uuid;
  raise notice '';
  raise notice 'Status:';
  raise notice '  Quarterfinals: 4 matches (all finished, 1.º through 4.º qualified)';
  raise notice '  Semifinals: 2 matches';
  raise notice '    • Match 1 (TIED): %s 15-15 %s → REQUIRES OVERTIME', array_to_string(array[teams[1]], ','), array_to_string(array[teams[4]], ',');
  raise notice '    • Match 2 (DECIDED): %s 20-10 %s → Teams 2 qualified to final', array_to_string(array[teams[2]], ','), array_to_string(array[teams[3]], ',');
  raise notice '';
  raise notice 'Test the overtime panel in the tournament:';
  raise notice '  1. Go to Torneos > [tournament name] > Generador';
  raise notice '  2. You should see a tied semifinal with "Configurar prórroga" button';
  raise notice '  3. Click button and set overtime minutes (e.g., 5)';
  raise notice '  4. Click "Iniciar prórroga"';
  raise notice '  5. The match clock starts; simulate a goal by updating scores:';
  raise notice '     UPDATE public.matches SET local_score = 20 WHERE id = [tied match id];';
  raise notice '  6. The panel detects the score change and shows "Confirmar ganador y avanzar"';
  raise notice '  7. Click to confirm → winner advances to final';
  raise notice '';
end $$;

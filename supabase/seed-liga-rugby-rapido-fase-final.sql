-- Torneo rápido de rugby con formato "Liga + Fase final" (datos ficticios).
-- 3 divisiones: Primera (5 equipos), Segunda (4) y Femenina (5), 14 equipos registrados
-- con invitación aceptada y 12 jugadores por equipo (7 titulares, 5 suplentes).
-- Liga de 1 vuelta, clasifican 4 por división a la fase final, 1 cancha, fecha de hoy, Panamá.
-- NO genera fixtures (se generan desde la app). Idempotente por slug.

do $$
declare
  owner_id uuid := 'ede6717e-6b7e-4ba5-9126-58ae0a292a56'::uuid;
  rugby_id uuid;
  seven_id uuid;
  tournament_id uuid;
  division_ids uuid[];
  new_division_id uuid;
  new_team_id uuid;
  new_player_id uuid;
  division_names text[] := array['Primera división', 'Segunda división', 'Femenina'];
  division_sizes int[] := array[5, 4, 5];
  positions text[] := array['Pilar izquierdo', 'Hooker', 'Pilar derecho', 'Medio scrum', 'Apertura', 'Centro', 'Zaguero'];
  team_row record;
  i int;
  j int;
  n int;
begin
  if exists (select 1 from public.tournaments where slug = 'liga-rugby-rapido-prueba-2026') then
    raise notice 'El torneo rápido de prueba ya existe; no se crea de nuevo.';
    return;
  end if;

  select id into rugby_id from public.disciplines where code = 'rugby';
  select sm.id into seven_id from public.sport_modalities sm where sm.discipline_id = rugby_id and sm.code = 'seven';
  if rugby_id is null or seven_id is null then
    raise exception 'No se encontró la disciplina rugby o la modalidad seven.';
  end if;

  insert into public.tournaments (name, slug, season, start_date, status, created_by, is_public, is_quick, discipline_id, modality_id, country, location)
  values ('Liga Rugby Sevens rápido de prueba', 'liga-rugby-rapido-prueba-2026', '2026', current_date, 'published', owner_id, true, true, rugby_id, seven_id, 'Panamá', 'Panamá')
  returning id into tournament_id;

  insert into public.tournament_competition_settings (tournament_id, competition_format, round_robin_legs, qualifying_teams_per_group, courts_count, half_duration_minutes, halftime_duration_minutes, interval_between_matches_minutes, points_for_win, points_for_draw, points_for_loss)
  values (tournament_id, 'league_playoffs', 1, 4, 1, 7, 2, 10, 4, 2, 0);

  for i in 1..array_length(division_names, 1) loop
    insert into public.tournament_divisions (tournament_id, name, sort_order)
    values (tournament_id, division_names[i], i)
    returning id into new_division_id;
    division_ids := division_ids || new_division_id;
  end loop;

  -- Equipos registrados (oficiales) con invitación aceptada: 5 + 4 + 5 = 14.
  for i in 1..array_length(division_names, 1) loop
    for j in 1..division_sizes[i] loop
      insert into public.teams (name, city, created_by, is_official, is_public, discipline_id, handle, contact_phone)
      values (
        format('Rápido %s %s', left(division_names[i], 3), j),
        'Panamá',
        owner_id,
        true,
        true,
        rugby_id,
        format('prueba-rapido-%s-%s', i, j),
        '+507 6000-0001'
      )
      returning id into new_team_id;

      insert into public.tournament_team_invitations (tournament_id, team_id, division_id, invited_by, status, responded_at)
      values (tournament_id, new_team_id, division_ids[i], owner_id, 'accepted', now());

      insert into public.tournament_teams (tournament_id, division_id, team_id)
      values (tournament_id, division_ids[i], new_team_id);
    end loop;
  end loop;

  -- 12 jugadores por equipo: dorsales 1-12, titulares 1-7, suplentes 8-12.
  for team_row in
    select t.id, t.handle from public.teams t where t.handle like 'prueba-rapido-%'
  loop
    for n in 1..12 loop
      insert into public.players (full_name, shirt_number, position)
      values (format('Jugador %s %s', upper(team_row.handle), n), n, positions[((n - 1) % array_length(positions, 1)) + 1])
      returning id into new_player_id;

      insert into public.team_players (team_id, player_id, is_substitute)
      values (team_row.id, new_player_id, n > 7);
    end loop;
  end loop;
end $$;

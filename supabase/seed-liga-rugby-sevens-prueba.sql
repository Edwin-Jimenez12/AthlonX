-- Liga de prueba de Rugby Sevens (datos ficticios).
-- Crea un torneo oficial publicado, con 3 divisiones y 12 equipos ya aceptados,
-- todos contra todos a 4 vueltas, 1 cancha, fecha de hoy y ciudad Panamá.
-- NO genera fixtures: se generan desde la app (pestaña Generador).
--
-- Antes de ejecutar: reemplaza OWNER_USER_ID por tu id de Supabase Auth
-- (Authentication → Users). Idempotente por slug: si ya existe, no hace nada.

do $$
declare
  owner_id uuid := 'ede6717e-6b7e-4ba5-9126-58ae0a292a56'::uuid;
  rugby_id uuid;
  seven_id uuid;
  tournament_id uuid;
  division_ids uuid[];
  new_team_id uuid;
  new_division_id uuid;
  division_names text[] := array['Primera división', 'Segunda división', 'Femenina'];
  team_division int;
  i int;
  j int;
begin
  if exists (select 1 from public.tournaments where slug = 'liga-rugby-sevens-prueba-2026') then
    raise notice 'El torneo de prueba ya existe; no se crea de nuevo.';
    return;
  end if;

  select id into rugby_id from public.disciplines where code = 'rugby';
  select sm.id into seven_id from public.sport_modalities sm where sm.discipline_id = rugby_id and sm.code = 'seven';
  if rugby_id is null or seven_id is null then
    raise exception 'No se encontró la disciplina rugby o la modalidad seven.';
  end if;

  insert into public.tournaments (name, slug, season, start_date, status, created_by, is_public, is_quick, discipline_id, modality_id, country, location)
  values ('Liga Rugby Sevens de prueba', 'liga-rugby-sevens-prueba-2026', '2026', current_date, 'published', owner_id, true, false, rugby_id, seven_id, 'Panamá', 'Panamá')
  returning id into tournament_id;

  insert into public.tournament_competition_settings (tournament_id, competition_format, round_robin_legs, courts_count, half_duration_minutes, halftime_duration_minutes, interval_between_matches_minutes, points_for_win, points_for_draw, points_for_loss)
  values (tournament_id, 'round_robin', 4, 1, 7, 2, 10, 4, 2, 0);

  for i in 1..array_length(division_names, 1) loop
    insert into public.tournament_divisions (tournament_id, name, sort_order)
    values (tournament_id, division_names[i], i)
    returning id into new_division_id;
    division_ids := division_ids || new_division_id;
  end loop;

  -- 12 equipos ficticios oficiales: 4 por división, con invitación ya aceptada.
  for team_division in 1..array_length(division_names, 1) loop
    for j in 1..4 loop
      insert into public.teams (name, city, created_by, is_official, is_public, discipline_id, handle, contact_phone)
      values (
        format('Prueba %s %s', left(division_names[team_division], 3), j),
        'Panamá',
        owner_id,
        true,
        true,
        rugby_id,
        format('prueba-rugby-%s-%s', team_division, j),
        '+507 6000-0000'
      )
      returning id into new_team_id;

      insert into public.tournament_team_invitations (tournament_id, team_id, division_id, invited_by, status, responded_at)
      values (tournament_id, new_team_id, division_ids[team_division], owner_id, 'accepted', now());

      insert into public.tournament_teams (tournament_id, division_id, team_id)
      values (tournament_id, division_ids[team_division], new_team_id);
    end loop;
  end loop;
end $$;

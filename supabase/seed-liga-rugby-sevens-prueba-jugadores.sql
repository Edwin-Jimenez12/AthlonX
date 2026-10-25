-- Jugadores ficticios para los equipos de la liga de prueba de Rugby Sevens.
-- Requiere haber ejecutado antes seed-liga-rugby-sevens-prueba.sql.
-- Cada equipo de prueba recibe 12 jugadores: 7 titulares y 5 suplentes, con dorsal 1-12.
-- Idempotente: los equipos que ya tienen jugadores se saltan.

do $$
declare
  team_row record;
  player_id uuid;
  positions text[] := array['Pilar izquierdo', 'Hooker', 'Pilar derecho', 'Medio scrum', 'Apertura', 'Centro', 'Zaguero'];
  n int;
begin
  for team_row in
    select t.id, t.handle, t.name
    from public.teams t
    where t.handle like 'prueba-rugby-%'
  loop
    if exists (select 1 from public.team_players tp where tp.team_id = team_row.id) then
      continue;
    end if;

    for n in 1..12 loop
      insert into public.players (full_name, shirt_number, position)
      values (
        format('Jugador %s %s', upper(team_row.handle), n),
        n,
        positions[((n - 1) % array_length(positions, 1)) + 1]
      )
      returning id into player_id;

      insert into public.team_players (team_id, player_id, is_substitute)
      values (team_row.id, player_id, n > 7);
    end loop;
  end loop;
end $$;

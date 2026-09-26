-- Datos de prueba para los seis equipos adicionales de rugby.
-- No crea cuentas Auth y no modifica la plantilla existente de Titanes.
-- Es idempotente: busca los equipos y participantes por nombre/correo.

do $$
declare
  v_organization_id uuid;
  v_discipline_id uuid;
  v_team_id uuid;
  v_player_id uuid;
  v_team record;
  v_team_slug text;
  v_email text;
  v_full_name text;
  i integer;
  v_first_names text[] := array[
    'Alejandro', 'Brandon', 'Cristian', 'Damián', 'Esteban',
    'Fernando', 'Gustavo', 'Hernán', 'Iván', 'Joaquín'
  ];
  v_last_names text[] := array[
    'Ríos', 'Castillo', 'Mendoza', 'Pérez', 'Gómez',
    'Sánchez', 'Vega', 'Morales', 'Cedeño', 'Quintero'
  ];
  v_positions text[] := array[
    'Pilar', 'Hooker', 'Segunda línea', 'Ala', 'Octavo',
    'Medio scrum', 'Apertura', 'Centro', 'Ala', 'Zaguero'
  ];
begin
  select d.id
  into v_discipline_id
  from public.disciplines d
  where d.code = 'rugby'
    and d.is_active = true
  limit 1;

  if v_discipline_id is null then
    raise exception 'No se encontró la disciplina rugby en public.disciplines';
  end if;

  -- Prioriza la Liga Panameña de Rugby y usa la organización de prueba
  -- únicamente cuando la primera todavía no exista.
  select o.id
  into v_organization_id
  from public.organizations o
  where lower(o.name) like '%liga%panam%rugby%'
     or lower(coalesce(o.handle, '')) like '%liga%panam%rugby%'
  order by o.created_at desc
  limit 1;

  if v_organization_id is null then
    select o.id
    into v_organization_id
    from public.organizations o
    where lower(o.name) like '%organizacion%prueba%'
    order by o.created_at desc
    limit 1;
  end if;

  for v_team in
    select * from (values
      ('Guerreros'),
      ('Vikingos'),
      ('Cuervos'),
      ('Centauros'),
      ('Powerclan'),
      ('Dragones')
    ) as teams(name)
  loop
    select t.id
    into v_team_id
    from public.teams t
    where lower(trim(t.name)) = lower(trim(v_team.name))
    order by t.created_at
    limit 1;

    if v_team_id is null then
      insert into public.teams (name, country, city, discipline_id, organization_id, is_public)
      values (v_team.name, 'Panamá', 'Panamá', v_discipline_id, v_organization_id, true)
      returning id into v_team_id;
    else
      update public.teams
      set discipline_id = coalesce(discipline_id, v_discipline_id),
          organization_id = coalesce(organization_id, v_organization_id),
          is_public = true
      where id = v_team_id;
    end if;

    v_team_slug := regexp_replace(lower(v_team.name), '[^a-z0-9]+', '', 'g');

    update public.teams
    set handle = coalesce(nullif(trim(handle), ''), v_team_slug || '-' || substr(replace(id::text, '-', ''), 1, 5)),
        athlonx_code = coalesce(nullif(trim(athlonx_code), ''), 'AX-EQP-' || upper(substr(replace(id::text, '-', ''), 1, 5)))
    where id = v_team_id;

    for i in 1..10 loop
      v_full_name := v_first_names[i] || ' ' || v_last_names[i] || ' ' || v_team.name;
      v_email := 'seed.' || v_team_slug || '.' || lpad(i::text, 2, '0') || '@athlonx.test';

      select p.id
      into v_player_id
      from public.players p
      where lower(p.contact_email) = lower(v_email)
      limit 1;

      if v_player_id is null then
        insert into public.players (
          full_name, shirt_number, position, birth_date, photo_url,
          contact_email, contact_phone, city, username, division
        )
        values (
          v_full_name,
          i,
          v_positions[i],
          ('199' || (i % 10)::text || '-' || lpad(((i * 2) % 12 + 1)::text, 2, '0') || '-' || lpad(((i * 3) % 27 + 1)::text, 2, '0'))::date,
          null,
          v_email,
          '+507 6200-' || lpad((3000 + i)::text, 4, '0'),
          case when i % 3 = 0 then 'Colón' when i % 3 = 1 then 'Panamá' else 'Chiriquí' end,
          v_team_slug || '.atleta' || i,
          'General'
        )
        returning id into v_player_id;
      else
        update public.players
        set full_name = v_full_name,
            shirt_number = coalesce(shirt_number, i),
            position = coalesce(position, v_positions[i]),
            division = coalesce(division, 'General')
        where id = v_player_id;
      end if;

      insert into public.team_players (team_id, player_id, is_substitute)
      values (v_team_id, v_player_id, false)
      on conflict (team_id, player_id) do nothing;
    end loop;
  end loop;
end;
$$;

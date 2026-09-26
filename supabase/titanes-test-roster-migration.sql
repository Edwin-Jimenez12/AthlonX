-- Datos de prueba para Titanes.
-- Agrega 10 participantes por división sin crear cuentas Auth.
-- Los datos son ficticios y el bloque es idempotente.

alter table public.players
  add column if not exists birth_date date,
  add column if not exists photo_url text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists city text,
  add column if not exists username text,
  add column if not exists division text;

do $$
declare
  v_team_id uuid;
  v_player_id uuid;
  roster record;
begin
  select id
  into v_team_id
  from public.teams
  where lower(trim(name)) = 'titanes'
  order by created_at
  limit 1;

  if v_team_id is null then
    raise exception 'No se encontró el equipo Titanes en public.teams';
  end if;

  for roster in
    select * from (values
      ('Marco Valdés', 'marco.valdes', 'marco.valdes@athlonx.test', '+507 6100-2001', 'Panamá', '1994-02-14'::date, 'Primera masculina', 'Pilar', 1),
      ('Alberto Moreno', 'alberto.moreno', 'alberto.moreno@athlonx.test', '+507 6100-2002', 'Colón', '1992-06-21'::date, 'Primera masculina', 'Hooker', 2),
      ('Luis De Gracia', 'luis.degracia', 'luis.degracia@athlonx.test', '+507 6100-2003', 'Panamá', '1996-01-08'::date, 'Primera masculina', 'Segunda línea', 4),
      ('Ricardo Santamaría', 'ricardo.santamaria', 'ricardo.santamaria@athlonx.test', '+507 6100-2004', 'Chiriquí', '1993-09-17'::date, 'Primera masculina', 'Ala', 6),
      ('José Alvarado', 'jose.alvarado', 'jose.alvarado@athlonx.test', '+507 6100-2005', 'Panamá', '1995-11-03'::date, 'Primera masculina', 'Octavo', 8),
      ('Diego Pimentel', 'diego.pimentel', 'diego.pimentel@athlonx.test', '+507 6100-2006', 'Veraguas', '1998-04-26'::date, 'Primera masculina', 'Medio scrum', 9),
      ('Carlos Vergara', 'carlos.vergara', 'carlos.vergara@athlonx.test', '+507 6100-2007', 'Panamá', '1991-12-19'::date, 'Primera masculina', 'Apertura', 10),
      ('Andrés Echevers', 'andres.echevers', 'andres.echevers@athlonx.test', '+507 6100-2008', 'Coclé', '1997-07-12'::date, 'Primera masculina', 'Centro', 12),
      ('Manuel Cárdenas', 'manuel.cardenas', 'manuel.cardenas@athlonx.test', '+507 6100-2009', 'Panamá', '1996-10-30'::date, 'Primera masculina', 'Ala', 14),
      ('Gabriel Ríos', 'gabriel.rios', 'gabriel.rios@athlonx.test', '+507 6100-2010', 'Herrera', '1990-05-05'::date, 'Primera masculina', 'Zaguero', 15),

      ('Javier Bernal', 'javier.bernal', 'javier.bernal@athlonx.test', '+507 6100-2101', 'Panamá', '1999-03-11'::date, 'Segunda masculina', 'Pilar', 1),
      ('Miguel Solís', 'miguel.solis', 'miguel.solis@athlonx.test', '+507 6100-2102', 'Colón', '1998-08-24'::date, 'Segunda masculina', 'Hooker', 2),
      ('Daniel Figueroa', 'daniel.figueroa', 'daniel.figueroa@athlonx.test', '+507 6100-2103', 'Panamá', '2000-01-16'::date, 'Segunda masculina', 'Segunda línea', 5),
      ('Ernesto Tejada', 'ernesto.tejada', 'ernesto.tejada@athlonx.test', '+507 6100-2104', 'Chiriquí', '1997-06-07'::date, 'Segunda masculina', 'Ala', 7),
      ('César Mena', 'cesar.mena', 'cesar.mena@athlonx.test', '+507 6100-2105', 'Panamá', '2001-09-22'::date, 'Segunda masculina', 'Octavo', 8),
      ('Felipe Guerra', 'felipe.guerra', 'felipe.guerra@athlonx.test', '+507 6100-2106', 'Veraguas', '1999-12-02'::date, 'Segunda masculina', 'Medio scrum', 9),
      ('Jorge Batista', 'jorge.batista', 'jorge.batista@athlonx.test', '+507 6100-2107', 'Panamá', '1996-02-28'::date, 'Segunda masculina', 'Apertura', 10),
      ('Samuel Rojas', 'samuel.rojas', 'samuel.rojas@athlonx.test', '+507 6100-2108', 'Coclé', '2000-07-14'::date, 'Segunda masculina', 'Centro', 12),
      ('Héctor Durán', 'hector.duran', 'hector.duran@athlonx.test', '+507 6100-2109', 'Panamá', '1998-11-09'::date, 'Segunda masculina', 'Ala', 14),
      ('Nicolás Pitti', 'nicolas.pitti', 'nicolas.pitti@athlonx.test', '+507 6100-2110', 'Herrera', '1997-04-18'::date, 'Segunda masculina', 'Zaguero', 15),

      ('Ana Pérez', 'ana.perez', 'ana.perez@athlonx.test', '+507 6100-2201', 'Panamá', '1997-01-27'::date, 'Femenina', 'Pilar', 1),
      ('Sofía Castillo', 'sofia.castillo', 'sofia.castillo@athlonx.test', '+507 6100-2202', 'Colón', '1998-05-13'::date, 'Femenina', 'Hooker', 2),
      ('Mariana León', 'mariana.leon', 'mariana.leon@athlonx.test', '+507 6100-2203', 'Panamá', '2000-10-06'::date, 'Femenina', 'Segunda línea', 4),
      ('Valeria Ortega', 'valeria.ortega', 'valeria.ortega@athlonx.test', '+507 6100-2204', 'Chiriquí', '1996-03-20'::date, 'Femenina', 'Ala', 6),
      ('Camila Batista', 'camila.batista', 'camila.batista@athlonx.test', '+507 6100-2205', 'Panamá', '1999-08-31'::date, 'Femenina', 'Octavo', 8),
      ('Daniela Cruz', 'daniela.cruz', 'daniela.cruz@athlonx.test', '+507 6100-2206', 'Veraguas', '2001-02-11'::date, 'Femenina', 'Medio scrum', 9),
      ('Gabriela Ríos', 'gabriela.rios', 'gabriela.rios@athlonx.test', '+507 6100-2207', 'Panamá', '1995-07-23'::date, 'Femenina', 'Apertura', 10),
      ('Paola Montenegro', 'paola.montenegro', 'paola.montenegro@athlonx.test', '+507 6100-2208', 'Coclé', '1998-12-15'::date, 'Femenina', 'Centro', 12),
      ('Natalia Suárez', 'natalia.suarez', 'natalia.suarez@athlonx.test', '+507 6100-2209', 'Panamá', '2000-06-29'::date, 'Femenina', 'Ala', 14),
      ('Laura Tejada', 'laura.tejada', 'laura.tejada@athlonx.test', '+507 6100-2210', 'Herrera', '1997-09-04'::date, 'Femenina', 'Zaguero', 15)
    ) as data(full_name, username, contact_email, contact_phone, city, birth_date, division, position, shirt_number)
  loop
    select p.id
    into v_player_id
    from public.players p
    where lower(p.full_name) = lower(roster.full_name)
    limit 1;

    if v_player_id is null then
      insert into public.players (full_name, shirt_number, position, birth_date, contact_email, contact_phone, city, username, division)
      values (roster.full_name, roster.shirt_number, roster.position, roster.birth_date, roster.contact_email, roster.contact_phone, roster.city, roster.username, roster.division)
      returning id into v_player_id;
    else
      update public.players
      set shirt_number = coalesce(shirt_number, roster.shirt_number),
          position = coalesce(position, roster.position),
          birth_date = coalesce(birth_date, roster.birth_date),
          contact_email = coalesce(contact_email, roster.contact_email),
          contact_phone = coalesce(contact_phone, roster.contact_phone),
          city = coalesce(city, roster.city),
          username = coalesce(username, roster.username),
          division = coalesce(division, roster.division)
      where id = v_player_id;
    end if;

    insert into public.team_players (team_id, player_id, is_substitute)
    values (v_team_id, v_player_id, false)
    on conflict (team_id, player_id) do nothing;
  end loop;
end;
$$;

-- Perfil de persona: rediseño según la hoja "AthlonX · Información del perfil por rol".
-- Ejecutar una sola vez en Supabase > SQL Editor, después de registration-profile-names-migration.sql.
-- No elimina datos existentes. Todo lo nuevo queda inactivo para la app hasta que el código lo use:
--   * avatars: bucket preparado (foto opcional), la app solo lo usará cuando se active la foto.
--   * profile_privacy_settings, profile_tournament_visibility: visibilidad elegida por la persona.

-- 1. Registro de Persona: guardar fecha de nacimiento (dato privado del dueño).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_type text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'account_type'), ''), 'persona');
  v_first_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), '');
  v_last_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '');
  v_birth_date date;
  v_full_name text;
  v_organization_id uuid;
  v_organization_name text := trim(coalesce(new.raw_user_meta_data ->> 'organization_name', ''));
  v_organization_type text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'organization_type'), ''), 'organizacion_deportiva');
  v_organization_slug text;
begin
  v_birth_date := nullif(trim(coalesce(new.raw_user_meta_data ->> 'birth_date', '')), '')::date;
  if v_birth_date is not null and (v_birth_date > current_date or v_birth_date < date '1900-01-01') then
    raise exception 'La fecha de nacimiento no es válida';
  end if;

  v_full_name := coalesce(
    nullif(trim(concat_ws(' ', v_first_name, v_last_name)), ''),
    trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  );

  insert into public.profiles (id, full_name, first_name, last_name, birth_date, email_verified)
  values (new.id, v_full_name, v_first_name, v_last_name, v_birth_date, new.email_confirmed_at is not null)
  on conflict (id) do update set
    full_name = excluded.full_name,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    birth_date = coalesce(excluded.birth_date, public.profiles.birth_date),
    email_verified = excluded.email_verified,
    updated_at = now();

  insert into public.user_roles (user_id, role)
  select new.id, case when role_name = 'coach' then 'entrenador' else role_name end
  from jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'roles', '["atleta"]'::jsonb)) as role_name
  where role_name in ('atleta', 'coach', 'entrenador', 'staff', 'directivo')
  on conflict (user_id, role) do nothing;

  if v_account_type = 'organizacion' then
    if v_organization_name = '' then
      raise exception 'El nombre de la organización es obligatorio';
    end if;

    if v_organization_type not in (
      'comite_olimpico', 'institucion_gubernamental', 'federacion', 'union',
      'liga', 'organizacion_deportiva', 'otro'
    ) then
      v_organization_type := 'organizacion_deportiva';
    end if;

    v_organization_slug := coalesce(
      nullif(trim(both '-' from lower(regexp_replace(v_organization_name, '[^a-zA-Z0-9]+', '-', 'g'))), ''),
      'organizacion'
    ) || '-' || substr(new.id::text, 1, 8);

    insert into public.organizations (name, type, country, city, institutional_email, slug, created_by)
    values (
      v_organization_name,
      v_organization_type,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'organization_country'), ''), 'Panamá'),
      nullif(trim(new.raw_user_meta_data ->> 'organization_city'), ''),
      new.email,
      v_organization_slug,
      new.id
    )
    returning id into v_organization_id;

    insert into public.organization_members (organization_id, user_id, role, status)
    values (v_organization_id, new.id, 'owner', 'active')
    on conflict (organization_id, user_id, role) do update set status = 'active';

    insert into public.organization_disciplines (organization_id, discipline_id)
    select v_organization_id, d.id
    from public.disciplines d
    join jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'organization_disciplines', '[]'::jsonb)) selected
      on selected.value = d.id::text
    where d.is_active = true
    on conflict (organization_id, discipline_id) do nothing;
  end if;

  return new;
end;
$$;

-- 2. Foto de perfil opcional: una por cuenta (no por rol).
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists avatar_path text;
grant update (avatar_url, avatar_path) on public.profiles to authenticated;

-- 3. Edad: no se guarda, se calcula desde la fecha de nacimiento.
create or replace function public.age_from_birth_date(p_birth_date date)
returns integer
language sql
stable
as $$
  select case when p_birth_date is null then null
    else extract(year from age(current_date, p_birth_date))::integer
  end;
$$;

-- 4. Visibilidad por campo elegida por la persona (privado por defecto).
--    birth_date y tipo de sangre no están aquí: su visibilidad es fija según la hoja de cálculo.
create table if not exists public.profile_privacy_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  field_key text not null check (field_key in ('email', 'phone', 'age')),
  visibility text not null default 'owner' check (visibility in ('owner', 'public')),
  updated_at timestamptz not null default now(),
  primary key (user_id, field_key)
);

alter table public.profile_privacy_settings enable row level security;

drop policy if exists "profile_privacy_settings_owner_all" on public.profile_privacy_settings;
create policy "profile_privacy_settings_owner_all"
  on public.profile_privacy_settings
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.profile_privacy_settings to authenticated;

-- Edad pública: solo devuelve un valor si la persona eligió mostrarla.
create or replace function public.profile_public_age(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when exists (
    select 1 from public.profile_privacy_settings s
    where s.user_id = p_user_id and s.field_key = 'age' and s.visibility = 'public'
  )
  then public.age_from_birth_date((select p.birth_date from public.profiles p where p.id = p_user_id))
  end;
$$;

grant execute on function public.profile_public_age(uuid) to anon, authenticated;

-- 5. Cargos fijos de staff (cada cargo tiene su nombre).
create table if not exists public.staff_positions (
  code text primary key,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

insert into public.staff_positions (code, name, sort_order) values
  ('medico', 'Médico', 10),
  ('preparador_fisico', 'Preparador físico', 20),
  ('fisioterapeuta', 'Fisioterapeuta', 30),
  ('utilero', 'Utilero', 40),
  ('logistica', 'Logística', 50),
  ('delegado', 'Delegado', 60),
  ('analista', 'Analista de rendimiento', 70)
on conflict (code) do nothing;

alter table public.staff_positions enable row level security;

drop policy if exists "staff_positions_read_active" on public.staff_positions;
create policy "staff_positions_read_active"
  on public.staff_positions
  for select
  to anon, authenticated
  using (is_active = true);

grant select on public.staff_positions to anon, authenticated;

alter table public.team_user_memberships
  add column if not exists staff_position_code text references public.staff_positions(code);

-- 6. Posiciones de atleta: dependen de la disciplina.
create table if not exists public.sport_positions (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.disciplines(id) on delete cascade,
  code text not null,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  unique (discipline_id, code),
  unique (id, discipline_id)
);

alter table public.sport_positions enable row level security;

drop policy if exists "sport_positions_read" on public.sport_positions;
create policy "sport_positions_read"
  on public.sport_positions
  for select
  to anon, authenticated
  using (is_active = true);

grant select on public.sport_positions to anon, authenticated;

create table if not exists public.athlete_discipline_positions (
  user_id uuid not null references auth.users(id) on delete cascade,
  discipline_id uuid not null references public.disciplines(id) on delete cascade,
  position_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, discipline_id),
  constraint athlete_position_matches_discipline
    foreign key (position_id, discipline_id) references public.sport_positions(id, discipline_id) on delete cascade
);

alter table public.athlete_discipline_positions enable row level security;

drop policy if exists "athlete_discipline_positions_read" on public.athlete_discipline_positions;
create policy "athlete_discipline_positions_read"
  on public.athlete_discipline_positions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "athlete_discipline_positions_owner_write" on public.athlete_discipline_positions;
create policy "athlete_discipline_positions_owner_write"
  on public.athlete_discipline_positions
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select on public.athlete_discipline_positions to anon, authenticated;
grant insert, update, delete on public.athlete_discipline_positions to authenticated;

-- 7. Torneos supervisados por Directivo o Staff: la persona elige cuáles mostrar.
create table if not exists public.profile_tournament_visibility (
  user_id uuid not null references auth.users(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  is_visible boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, tournament_id)
);

alter table public.profile_tournament_visibility enable row level security;

drop policy if exists "profile_tournament_visibility_owner_all" on public.profile_tournament_visibility;
create policy "profile_tournament_visibility_owner_all"
  on public.profile_tournament_visibility
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.profile_tournament_visibility to authenticated;

-- 8. Bucket de fotos de perfil (preparado, aún no usado por la app).
--    Plan Free: cada foto se redimensiona en el navegador a 512x512 WebP (<150 KB), límite 2 MB.
--    Ruta del archivo: {user_id}/avatar.webp
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 9. Código AthlonX = cédula de la cuenta o división: no se puede cambiar una vez creado.
--    Aplica a personas (profiles), equipos (teams), divisiones (team_division_catalog)
--    y organizaciones (organizations). Usa to_jsonb para no fallar si una tabla no tiene la columna.
create or replace function public.prevent_athlonx_code_change()
returns trigger
language plpgsql
as $$
begin
  if to_jsonb(new) ->> 'athlonx_code' is distinct from to_jsonb(old) ->> 'athlonx_code' then
    raise exception 'El código AthlonX no se puede cambiar';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_athlonx_code on public.profiles;
create trigger profiles_lock_athlonx_code
  before update on public.profiles
  for each row execute function public.prevent_athlonx_code_change();

drop trigger if exists teams_lock_athlonx_code on public.teams;
create trigger teams_lock_athlonx_code
  before update on public.teams
  for each row execute function public.prevent_athlonx_code_change();

drop trigger if exists team_division_catalog_lock_athlonx_code on public.team_division_catalog;
create trigger team_division_catalog_lock_athlonx_code
  before update on public.team_division_catalog
  for each row execute function public.prevent_athlonx_code_change();

drop trigger if exists organizations_lock_athlonx_code on public.organizations;
create trigger organizations_lock_athlonx_code
  before update on public.organizations
  for each row execute function public.prevent_athlonx_code_change();

-- 10. Divisiones de equipo: nombre libre + atributos opcionales.
--     Nivel (Primera, Segunda, Única), categoría de edad (Mayores, Sub-18, ...) y género.
--     Cada división tiene su código AthlonX (columna athlonx_code, ya bloqueada arriba) y su escudo opcional.
alter table public.team_division_catalog
  add column if not exists level text,
  add column if not exists age_group text,
  add column if not exists gender text,
  add column if not exists shield_url text,
  add column if not exists shield_path text;

alter table public.team_division_catalog drop constraint if exists team_division_catalog_level_check;
alter table public.team_division_catalog add constraint team_division_catalog_level_check
  check (level is null or level in ('primera', 'segunda', 'unica'));

alter table public.team_division_catalog drop constraint if exists team_division_catalog_age_group_check;
alter table public.team_division_catalog add constraint team_division_catalog_age_group_check
  check (age_group is null or age_group in ('mayores', 'sub-18', 'sub-16', 'sub-14', 'sub-12'));

alter table public.team_division_catalog drop constraint if exists team_division_catalog_gender_check;
alter table public.team_division_catalog add constraint team_division_catalog_gender_check
  check (gender is null or gender in ('masculino', 'femenino', 'mixto'));

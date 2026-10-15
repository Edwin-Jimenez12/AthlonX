-- Registro de cuentas: Persona, Equipo y Organización.
-- Ejecutar una sola vez en Supabase > SQL Editor. Es idempotente: si se vuelve a ejecutar, no duplica nada.
-- Deja una sola versión de los disparadores de alta, para que el comportamiento sea el mismo en todas las bases.

-- 1. Columnas que el registro necesita.
alter table public.teams
  add column if not exists city text,
  add column if not exists country text not null default 'Panamá',
  add column if not exists discipline_id uuid references public.disciplines(id) on delete restrict;

alter table public.organizations
  add column if not exists city text,
  add column if not exists country text not null default 'Panamá';

-- Tabla de disciplinas de cada organización (ya existe en multidiscipline-migration.sql; esto solo asegura su estructura).
create table if not exists public.organization_disciplines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  discipline_id uuid not null references public.disciplines(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, discipline_id)
);

-- 2. Alta de cuentas de Persona y Organización.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_type text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'account_type'), ''), 'persona');
  v_organization_id uuid;
  v_organization_name text := trim(coalesce(new.raw_user_meta_data ->> 'organization_name', ''));
  v_organization_type text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'organization_type'), ''), 'organizacion_deportiva');
  v_organization_slug text;
begin
  insert into public.profiles (id, full_name, email_verified)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email_confirmed_at is not null)
  on conflict (id) do update set
    full_name = excluded.full_name,
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

    -- Tipos válidos según organizations_type_check; cualquier otro valor se guarda como organizacion_deportiva.
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

-- 3. Alta de cuentas de Equipo: nombre, disciplina, país y ciudad. La modalidad no se pide en el registro.
create or replace function public.handle_new_team_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_team_name text := trim(coalesce(new.raw_user_meta_data ->> 'team_name', ''));
  v_team_country text := nullif(trim(new.raw_user_meta_data ->> 'team_country'), '');
  v_team_city text := nullif(trim(new.raw_user_meta_data ->> 'team_city'), '');
  v_discipline_id uuid;
begin
  if coalesce(new.raw_user_meta_data ->> 'account_type', 'persona') <> 'equipo' then
    return new;
  end if;

  if v_team_name = '' then
    raise exception 'El nombre del equipo es obligatorio';
  end if;

  select d.id
  into v_discipline_id
  from public.disciplines d
  where d.id::text = nullif(new.raw_user_meta_data ->> 'team_discipline', '')
    and d.is_active = true;

  if v_discipline_id is null then
    raise exception 'La disciplina del equipo no es válida';
  end if;

  insert into public.teams (name, country, city, created_by, discipline_id)
  values (v_team_name, coalesce(v_team_country, 'Panamá'), v_team_city, new.id, v_discipline_id)
  returning id into v_team_id;

  insert into public.team_user_memberships (team_id, user_id, role, role_label, status)
  values (v_team_id, new.id, 'owner', 'Propietario', 'active');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_team_account on auth.users;
create trigger on_auth_user_created_team_account
  after insert on auth.users
  for each row execute procedure public.handle_new_team_account();

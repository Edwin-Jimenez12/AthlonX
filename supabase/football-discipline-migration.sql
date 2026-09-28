-- AthlonX: catalogo oficial de disciplinas y modalidades.
-- Ejecutar despues de las migraciones de disciplinas, modalidades y equipos.

-- AthlonX mantiene actualmente tres disciplinas activas.
update public.disciplines
set is_active = code in ('rugby', 'baloncesto', 'futbol');

update public.disciplines
set name = 'Fútbol'
where code = 'futbol';

-- La lectura publica y autenticada debe mostrar el mismo catalogo activo.
alter table public.disciplines enable row level security;

drop policy if exists "Authenticated users can view disciplines" on public.disciplines;
drop policy if exists "Public can view registration disciplines" on public.disciplines;
drop policy if exists "Public can view active disciplines" on public.disciplines;

create policy "Public can view active disciplines"
  on public.disciplines
  for select
  to anon, authenticated
  using (is_active = true);

grant select on public.disciplines to anon, authenticated;

create table if not exists public.sport_modalities (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.disciplines(id) on delete cascade,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (discipline_id, code),
  unique (discipline_id, name)
);

insert into public.sport_modalities (discipline_id, code, name, is_active)
select discipline.id, modality.code, modality.name, true
from public.disciplines discipline
cross join (
  values
    ('rugby', 'seven', 'Rugby Sevens'),
    ('rugby', 'xv', 'Rugby 15s'),
    ('baloncesto', '5x5', 'Basketball 5x5'),
    ('baloncesto', '3x3', 'Basketball 3x3'),
    ('futbol', 'futbol-11', 'Fútbol 11'),
    ('futbol', 'futbol-sala', 'Fútbol sala (5 jugadores)'),
    ('futbol', 'futbol-7', 'Fútbol 7'),
    ('futbol', 'futbol-8', 'Fútbol 8')
) as modality(discipline_code, code, name)
where discipline.code = modality.discipline_code
on conflict (discipline_id, code) do update
set name = excluded.name,
    is_active = true;

alter table public.sport_modalities enable row level security;

drop policy if exists "Authenticated users can view active modalities" on public.sport_modalities;
drop policy if exists "Public can view active modalities" on public.sport_modalities;

create policy "Public can view active modalities"
  on public.sport_modalities
  for select
  to anon, authenticated
  using (is_active = true);

grant select on public.sport_modalities to anon, authenticated;

-- Permite crear cuentas de equipo con cualquiera de las disciplinas activas.
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

  select discipline.id
  into v_discipline_id
  from public.disciplines discipline
  where discipline.id::text = nullif(new.raw_user_meta_data ->> 'team_discipline', '')
    and discipline.is_active = true;

  if v_discipline_id is null then
    raise exception 'La disciplina del equipo no es válida';
  end if;

  insert into public.teams (name, country, city, created_by, discipline_id)
  values (
    v_team_name,
    coalesce(v_team_country, 'Panamá'),
    v_team_city,
    new.id,
    v_discipline_id
  )
  returning id into v_team_id;

  if exists (
    select 1
    from public.team_user_memberships
    where team_id = v_team_id
      and user_id = new.id
  ) then
    update public.team_user_memberships
    set role = 'owner',
        role_label = 'Propietario',
        status = 'active'
    where team_id = v_team_id
      and user_id = new.id;
  else
    insert into public.team_user_memberships (
      team_id,
      user_id,
      role,
      role_label,
      status
    )
    values (
      v_team_id,
      new.id,
      'owner',
      'Propietario',
      'active'
    );
  end if;

  return new;
end;
$$;

-- La edición del perfil de equipo también acepta Fútbol.
create or replace function public.update_team_profile(
  p_team_id uuid,
  p_name text,
  p_description text default null,
  p_logo_url text default null,
  p_country text default null,
  p_city text default null,
  p_contact_email text default null,
  p_contact_phone text default null,
  p_website_url text default null,
  p_handle text default null,
  p_discipline_id uuid default null,
  p_is_public boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_handle text;
begin
  if not exists (
    select 1
    from public.teams team
    where team.id = p_team_id
      and (
        team.created_by = auth.uid()
        or exists (
          select 1
          from public.team_user_memberships membership
          where membership.team_id = team.id
            and membership.user_id = auth.uid()
            and membership.role in ('owner', 'directivo')
            and membership.status = 'active'
        )
      )
  ) then
    raise exception 'No tienes permisos para editar este equipo';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'El nombre del equipo es obligatorio';
  end if;

  if p_discipline_id is not null and not exists (
    select 1
    from public.disciplines discipline
    where discipline.id = p_discipline_id
      and discipline.is_active = true
  ) then
    raise exception 'La disciplina seleccionada no está disponible';
  end if;

  normalized_handle := nullif(
    lower(trim(regexp_replace(coalesce(p_handle, ''), '^@', ''))),
    ''
  );

  if normalized_handle is not null
    and normalized_handle !~ '^[a-z0-9][a-z0-9._-]{2,39}$' then
    raise exception 'El usuario público solo puede usar letras, números, puntos, guiones y guion bajo';
  end if;

  if normalized_handle is not null and exists (
    select 1
    from public.teams other_team
    where lower(other_team.handle) = normalized_handle
      and other_team.id <> p_team_id
  ) then
    raise exception 'Ese usuario público ya está en uso';
  end if;

  update public.teams
  set name = trim(p_name),
      description = nullif(trim(coalesce(p_description, '')), ''),
      logo_url = nullif(trim(coalesce(p_logo_url, '')), ''),
      country = nullif(trim(coalesce(p_country, '')), ''),
      city = nullif(trim(coalesce(p_city, '')), ''),
      contact_email = nullif(trim(coalesce(p_contact_email, '')), ''),
      contact_phone = nullif(trim(coalesce(p_contact_phone, '')), ''),
      website_url = nullif(trim(coalesce(p_website_url, '')), ''),
      handle = normalized_handle,
      discipline_id = p_discipline_id,
      is_public = coalesce(p_is_public, true)
  where id = p_team_id;
end;
$$;

revoke all on function public.update_team_profile(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  boolean
) from public;

grant execute on function public.update_team_profile(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  boolean
) to authenticated;

-- Corrige el registro de cuentas de equipo despues de account-contexts-migration.sql.
-- Ejecutar en Supabase SQL Editor despues de las migraciones base de equipos,
-- disciplinas, ubicaciones e identidades.

alter table if exists public.teams
  add column if not exists country text not null default 'Panama',
  add column if not exists discipline_id uuid references public.disciplines(id) on delete restrict,
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists contact_email text,
  add column if not exists contact_phone text;

alter table if exists public.teams
  alter column country set default 'Panama';

create table if not exists public.team_user_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'directivo', 'entrenador', 'staff', 'atleta')),
  role_label text,
  status text not null default 'active' check (status in ('active', 'pending', 'revoked')),
  created_at timestamptz not null default now()
);

alter table public.team_user_memberships
  add column if not exists role_label text;

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
    and d.is_active = true
    and d.code in ('rugby', 'baloncesto');

  if v_discipline_id is null then
    raise exception 'La disciplina del equipo no es valida';
  end if;

  insert into public.teams (name, country, city, created_by, discipline_id)
  values (v_team_name, coalesce(v_team_country, 'Panama'), v_team_city, new.id, v_discipline_id)
  returning id into v_team_id;

  -- No usamos ON CONFLICT (team_id, user_id): la migracion de contextos
  -- permite que una persona tenga varios roles dentro del mismo equipo.
  if exists (
    select 1
    from public.team_user_memberships
    where team_id = v_team_id and user_id = new.id
  ) then
    update public.team_user_memberships
    set role = 'owner', role_label = 'Propietario', status = 'active'
    where team_id = v_team_id and user_id = new.id;
  else
    insert into public.team_user_memberships (team_id, user_id, role, role_label, status)
    values (v_team_id, new.id, 'owner', 'Propietario', 'active');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_team_account on auth.users;
create trigger on_auth_user_created_team_account
  after insert on auth.users
  for each row execute procedure public.handle_new_team_account();


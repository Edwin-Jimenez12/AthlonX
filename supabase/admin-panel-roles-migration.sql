-- AthlonX: roles del panel administrativo de la plataforma.
-- No confundir con user_roles (roles deportivos personales: atleta, entrenador, staff, directivo).
-- Propietario: 1 sola cuenta. Administrador: crea colaboradores. Colaborador: solo con permisos asignados.
-- Idempotente: puede ejecutarse varias veces.

create table if not exists public.platform_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('propietario', 'administrador', 'colaborador')),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists platform_staff_un_propietario
  on public.platform_staff (role) where role = 'propietario';

create table if not exists public.platform_staff_permissions (
  user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null check (permission in ('estadisticas', 'ingresos', 'planes', 'novedades', 'promociones', 'sugerencias')),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, permission)
);

alter table public.platform_staff enable row level security;
alter table public.platform_staff_permissions enable row level security;

drop policy if exists "Staff can read own platform role" on public.platform_staff;
create policy "Staff can read own platform role"
on public.platform_staff for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Staff can read own permissions" on public.platform_staff_permissions;
create policy "Staff can read own permissions"
on public.platform_staff_permissions for select to authenticated
using (user_id = auth.uid());

-- Rol del usuario actual dentro del panel (null si no pertenece).
create or replace function public.platform_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select s.role from public.platform_staff s where s.user_id = auth.uid() and s.is_active;
$$;

-- ¿Puede el usuario actual usar esta sección? Propietario y administrador: todas. Colaborador: solo las asignadas.
create or replace function public.platform_has(p_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r text := public.platform_role();
begin
  if r is null then return false; end if;
  if r in ('propietario', 'administrador') then return true; end if;
  return exists (
    select 1 from public.platform_staff_permissions p
    where p.user_id = auth.uid() and p.permission = p_permission
  );
end;
$$;

-- Acceso del usuario actual. Lo usan el inicio de sesión y el panel. Devuelve null si no es parte del panel.
create or replace function public.platform_my_access()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'role', s.role,
    'permissions', coalesce(
      (select jsonb_agg(p.permission order by p.permission) from public.platform_staff_permissions p where p.user_id = s.user_id),
      '[]'::jsonb
    )
  )
  from public.platform_staff s
  where s.user_id = auth.uid() and s.is_active;
$$;

-- Crear una cuenta del panel a partir de un correo que ya existe en AthlonX.
-- Propietario: administradores y colaboradores. Administrador: solo colaboradores. Nadie crea otro propietario.
create or replace function public.platform_create_staff(p_email text, p_role text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller text := public.platform_role();
  target uuid;
begin
  if caller is null then
    raise exception 'No tienes acceso al panel administrativo.';
  end if;
  if not (
    (caller = 'propietario' and p_role in ('administrador', 'colaborador'))
    or (caller = 'administrador' and p_role = 'colaborador')
  ) then
    raise exception 'Tu rol no puede crear cuentas con el rol %.', p_role;
  end if;

  select u.id into target from auth.users u where lower(u.email) = lower(trim(p_email));
  if target is null then
    raise exception 'No existe una cuenta de AthlonX con ese correo.';
  end if;
  if exists (select 1 from public.platform_staff s where s.user_id = target) then
    raise exception 'Esa cuenta ya tiene un rol en el panel.';
  end if;

  insert into public.platform_staff (user_id, role, created_by)
  values (target, p_role, auth.uid());
  return target;
end;
$$;

-- Activar o desactivar una cuenta del panel. El propietario nunca se desactiva.
create or replace function public.platform_set_staff_active(p_user uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller text := public.platform_role();
  target_role text;
begin
  if caller is null then
    raise exception 'No tienes acceso al panel administrativo.';
  end if;
  select s.role into target_role from public.platform_staff s where s.user_id = p_user;
  if target_role is null then
    raise exception 'Esa cuenta no tiene rol en el panel.';
  end if;
  if target_role = 'propietario' then
    raise exception 'El propietario no se puede desactivar desde el panel.';
  end if;
  if not (
    (caller = 'propietario' and target_role in ('administrador', 'colaborador'))
    or (caller = 'administrador' and target_role = 'colaborador')
  ) then
    raise exception 'Tu rol no puede gestionar esa cuenta.';
  end if;

  update public.platform_staff set is_active = p_active where user_id = p_user;
end;
$$;

-- Asignar o quitar un permiso a un colaborador.
create or replace function public.platform_grant_permission(p_user uuid, p_permission text, p_granted boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller text := public.platform_role();
  target_role text;
begin
  if caller not in ('propietario', 'administrador') then
    raise exception 'Solo el propietario o un administrador asignan permisos.';
  end if;
  select s.role into target_role from public.platform_staff s where s.user_id = p_user;
  if target_role is distinct from 'colaborador' then
    raise exception 'Solo se asignan permisos a colaboradores.';
  end if;

  if p_granted then
    insert into public.platform_staff_permissions (user_id, permission, granted_by)
    values (p_user, p_permission, auth.uid())
    on conflict (user_id, permission) do nothing;
  else
    delete from public.platform_staff_permissions where user_id = p_user and permission = p_permission;
  end if;
end;
$$;

-- Lista de cuentas del panel. Solo propietario y administrador.
create or replace function public.platform_list_staff()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.platform_role() not in ('propietario', 'administrador') then
    raise exception 'Solo el propietario o un administrador ven el equipo del panel.';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', s.user_id,
      'role', s.role,
      'is_active', s.is_active,
      'email', u.email,
      'name', coalesce(p.full_name, u.email),
      'created_at', s.created_at,
      'created_by_name', coalesce(cp.full_name, 'Sistema'),
      'permissions', coalesce(
        (select jsonb_agg(x.permission order by x.permission) from public.platform_staff_permissions x where x.user_id = s.user_id),
        '[]'::jsonb)
    ) order by case s.role when 'propietario' then 1 when 'administrador' then 2 else 3 end, s.created_at)
    from public.platform_staff s
    join auth.users u on u.id = s.user_id
    left join public.profiles p on p.id = s.user_id
    left join public.profiles cp on cp.id = s.created_by
  ), '[]'::jsonb);
end;
$$;

-- Propietario inicial: la cuenta del dueño de la plataforma.
insert into public.platform_staff (user_id, role)
select id, 'propietario' from auth.users where lower(email) = 'ed.jimenez0012@gmail.com'
on conflict (user_id) do nothing;

revoke all on function public.platform_role() from public, anon;
revoke all on function public.platform_has(text) from public, anon;
revoke all on function public.platform_my_access() from public, anon;
revoke all on function public.platform_create_staff(text, text) from public, anon;
revoke all on function public.platform_set_staff_active(uuid, boolean) from public, anon;
revoke all on function public.platform_grant_permission(uuid, text, boolean) from public, anon;
revoke all on function public.platform_list_staff() from public, anon;
grant execute on function public.platform_role() to authenticated;
grant execute on function public.platform_has(text) to authenticated;
grant execute on function public.platform_my_access() to authenticated;
grant execute on function public.platform_create_staff(text, text) to authenticated;
grant execute on function public.platform_set_staff_active(uuid, boolean) to authenticated;
grant execute on function public.platform_grant_permission(uuid, text, boolean) to authenticated;
grant execute on function public.platform_list_staff() to authenticated;

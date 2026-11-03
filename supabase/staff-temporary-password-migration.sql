-- AthlonX: contraseña temporal para cuentas del panel, cambio obligatorio al ingresar y quitar del panel.
-- Idempotente.

alter table public.platform_staff
  add column if not exists must_change_password boolean not null default false,
  add column if not exists temp_password_hash text;

-- Acceso del usuario actual, ahora con la marca de cambio obligatorio.
create or replace function public.platform_my_access()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'role', s.role,
    'must_change_password', s.must_change_password,
    'permissions', coalesce(
      (select jsonb_agg(p.permission order by p.permission) from public.platform_staff_permissions p where p.user_id = s.user_id),
      '[]'::jsonb
    )
  )
  from public.platform_staff s
  where s.user_id = auth.uid() and s.is_active;
$$;

-- Genera una contraseña temporal, la guarda en la cuenta, cierra sus sesiones y la devuelve una sola vez.
-- Mismas reglas que desactivar: propietario a administradores y colaboradores; administrador a colaboradores.
create or replace function public.platform_reset_staff_password(p_user uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  caller text := public.platform_role();
  target_role text;
  v_password text;
begin
  if caller is null then
    raise exception 'No tienes acceso al panel administrativo.';
  end if;
  select s.role into target_role from public.platform_staff s where s.user_id = p_user;
  if target_role is null then
    raise exception 'Esa cuenta no tiene rol en el panel.';
  end if;
  if not (
    (caller = 'propietario' and target_role in ('administrador', 'colaborador'))
    or (caller = 'administrador' and target_role = 'colaborador')
  ) then
    raise exception 'Tu rol no puede gestionar esa cuenta.';
  end if;

  v_password := 'AX-' || substr(encode(extensions.gen_random_bytes(9), 'hex'), 1, 14);

  update auth.users
  set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
      updated_at = now()
  where id = p_user;

  delete from auth.sessions where user_id = p_user;

  update public.platform_staff
  set must_change_password = true,
      temp_password_hash = (select u.encrypted_password from auth.users u where u.id = p_user)
  where user_id = p_user;

  return v_password;
end;
$$;

-- Lo llama la propia cuenta después de cambiar la contraseña temporal.
-- Solo libera la cuenta si la contraseña actual ya no es la temporal.
create or replace function public.platform_finish_password_change()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_current text;
begin
  select s.temp_password_hash into v_hash
  from public.platform_staff s
  where s.user_id = auth.uid() and s.must_change_password;
  if not found then
    return;
  end if;

  select u.encrypted_password into v_current from auth.users u where u.id = auth.uid();
  if v_current is null or v_current = v_hash then
    raise exception 'Primero cambia la contraseña temporal.';
  end if;

  update public.platform_staff
  set must_change_password = false, temp_password_hash = null
  where user_id = auth.uid();
end;
$$;

-- Quita una cuenta del panel: sus permisos y su rol. La cuenta de AthlonX no se borra.
create or replace function public.platform_remove_staff(p_user uuid)
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
  if not (
    (caller = 'propietario' and target_role in ('administrador', 'colaborador'))
    or (caller = 'administrador' and target_role = 'colaborador')
  ) then
    raise exception 'Tu rol no puede quitar esa cuenta del panel.';
  end if;

  delete from public.platform_staff_permissions where user_id = p_user;
  delete from public.platform_staff where user_id = p_user;
end;
$$;

revoke all on function public.platform_my_access() from public, anon;
revoke all on function public.platform_reset_staff_password(uuid) from public, anon;
revoke all on function public.platform_finish_password_change() from public, anon;
revoke all on function public.platform_remove_staff(uuid) from public, anon;
grant execute on function public.platform_my_access() to authenticated;
grant execute on function public.platform_reset_staff_password(uuid) to authenticated;
grant execute on function public.platform_finish_password_change() to authenticated;
grant execute on function public.platform_remove_staff(uuid) to authenticated;

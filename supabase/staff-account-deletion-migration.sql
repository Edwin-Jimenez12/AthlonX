-- AthlonX: eliminar la cuenta de AthlonX de un miembro del panel.
-- Usa el mismo mecanismo de eliminación de cuenta del proyecto: plazo de 15 días, recuperable al iniciar sesión,
-- y borrado definitivo por purge_expired_account_deletions (cada hora). Las cuentas de organización no se eliminan.
-- Al programar la eliminación, la cuenta sale del panel y sus sesiones se cierran.
-- Requiere cuenta-eliminacion-migration.sql y cuenta-eliminacion-auth-migration.sql. Idempotente.

create or replace function public.platform_schedule_staff_account_deletion(p_user uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller text := public.platform_role();
  target_role text;
  account_kind text;
  v_scheduled timestamptz := now() + interval '15 days';
  v_updated integer;
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
    raise exception 'Tu rol no puede eliminar esa cuenta.';
  end if;

  select u.raw_user_meta_data->>'account_type' into account_kind from auth.users u where u.id = p_user;
  if account_kind = 'organizacion' then
    raise exception 'Las cuentas de organización no se pueden eliminar.';
  end if;

  update public.profiles
  set deletion_scheduled_at = v_scheduled, updated_at = now()
  where id = p_user;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'No se encontró el perfil de la cuenta.';
  end if;

  delete from public.platform_staff_permissions where user_id = p_user;
  delete from public.platform_staff where user_id = p_user;
  delete from auth.sessions where user_id = p_user;

  return v_scheduled;
end;
$$;

revoke all on function public.platform_schedule_staff_account_deletion(uuid) from public, anon;
grant execute on function public.platform_schedule_staff_account_deletion(uuid) to authenticated;

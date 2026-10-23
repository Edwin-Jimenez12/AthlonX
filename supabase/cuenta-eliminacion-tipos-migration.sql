-- Solo las cuentas de Persona y de Equipo se pueden eliminar; las de Organización no.
-- Se aplica después de cuenta-eliminacion-migration.sql. Idempotente.
-- Al eliminar una cuenta de Equipo, el equipo se conserva sin autor (cuenta-eliminacion-auth-migration.sql).

create or replace function public.request_account_deletion(p_password text)
returns timestamptz
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  stored_hash text;
  account_type text;
  scheduled_at timestamptz := now() + interval '15 days';
begin
  if current_user_id is null then
    raise exception 'Tu sesión no es válida. Vuelve a iniciar sesión.';
  end if;

  select encrypted_password, raw_user_meta_data->>'account_type' into stored_hash, account_type
  from auth.users where id = current_user_id;

  if account_type = 'organizacion' then
    raise exception 'Las cuentas de organización no se pueden eliminar.';
  end if;

  if stored_hash is null or stored_hash <> extensions.crypt(p_password, stored_hash) then
    raise exception 'La contraseña no es correcta.';
  end if;

  update public.profiles
  set deletion_scheduled_at = scheduled_at, updated_at = now()
  where id = current_user_id;

  return scheduled_at;
end;
$$;

revoke all on function public.request_account_deletion(text) from public, anon;
grant execute on function public.request_account_deletion(text) to authenticated;

-- La purga tampoco borra organizaciones, por si alguna quedó programada antes de esta regla.
create or replace function public.purge_expired_account_deletions()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  removed integer;
begin
  with expired as (
    select p.id from public.profiles p
    join auth.users u on u.id = p.id
    where p.deletion_scheduled_at is not null and p.deletion_scheduled_at <= now()
      and coalesce(u.raw_user_meta_data->>'account_type', 'persona') <> 'organizacion'
  ), deleted as (
    delete from auth.users where id in (select id from expired) returning id
  )
  select count(*) into removed from deleted;
  return removed;
end;
$$;

revoke all on function public.purge_expired_account_deletions() from public, anon, authenticated;
grant execute on function public.purge_expired_account_deletions() to service_role;

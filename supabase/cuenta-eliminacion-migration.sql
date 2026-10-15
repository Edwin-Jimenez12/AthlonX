-- Eliminación de cuenta con periodo de recuperación de 15 días calendario.
-- Idempotente. Ejecutar en Supabase SQL Editor.

alter table public.profiles add column if not exists deletion_scheduled_at timestamptz;

-- Programa la eliminación. Verifica la contraseña contra auth.users antes de programar.
create or replace function public.request_account_deletion(p_password text)
returns timestamptz
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  stored_hash text;
  scheduled_at timestamptz := now() + interval '15 days';
begin
  if current_user_id is null then
    raise exception 'Tu sesión no es válida. Vuelve a iniciar sesión.';
  end if;

  select encrypted_password into stored_hash from auth.users where id = current_user_id;
  if stored_hash is null or stored_hash <> extensions.crypt(p_password, stored_hash) then
    raise exception 'La contraseña no es correcta.';
  end if;

  update public.profiles
  set deletion_scheduled_at = scheduled_at, updated_at = now()
  where id = current_user_id;

  return scheduled_at;
end;
$$;

-- Se llama al iniciar sesión: si la cuenta estaba programada para eliminarse, la recupera.
create or replace function public.cancel_account_deletion()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set deletion_scheduled_at = null, updated_at = now()
  where id = auth.uid() and deletion_scheduled_at is not null;
$$;

-- Elimina definitivamente las cuentas cuyo plazo venció. Programarla con pg_cron (por ejemplo, cada hora).
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
    select id from public.profiles
    where deletion_scheduled_at is not null and deletion_scheduled_at <= now()
  ), deleted as (
    delete from auth.users where id in (select id from expired) returning id
  )
  select count(*) into removed from deleted;
  return removed;
end;
$$;

revoke all on function public.request_account_deletion(text) from public;
revoke all on function public.cancel_account_deletion() from public;
revoke all on function public.purge_expired_account_deletions() from public;
grant execute on function public.request_account_deletion(text) to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;
grant execute on function public.purge_expired_account_deletions() to service_role;

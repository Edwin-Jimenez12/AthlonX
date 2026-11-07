-- Eliminar una cuenta que entra con Google (sin contraseña de AthlonX).
-- En vez de la contraseña: la persona vuelve a entrar con Google (inicio de sesión de hace menos de 10 minutos)
-- y escribe el correo de la cuenta. Mismo periodo de recuperación de 15 días.
-- Idempotente: se puede volver a ejecutar.

create or replace function public.request_account_deletion_google(p_email text)
returns timestamptz
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user auth.users%rowtype;
  v_scheduled timestamptz := now() + interval '15 days';
begin
  if auth.uid() is null then
    raise exception 'Tu sesión no es válida. Vuelve a iniciar sesión.';
  end if;
  select * into v_user from auth.users where id = auth.uid();

  if v_user.raw_user_meta_data ->> 'account_type' = 'organizacion' then
    raise exception 'Las cuentas de organización no se pueden eliminar.';
  end if;
  if coalesce(v_user.encrypted_password, '') <> '' then
    raise exception 'Tu cuenta tiene contraseña: confírmala con tu contraseña.';
  end if;
  if v_user.last_sign_in_at is null or v_user.last_sign_in_at < now() - interval '10 minutes' then
    raise exception 'Por seguridad, vuelve a entrar con Google para confirmar.';
  end if;
  if lower(trim(coalesce(p_email, ''))) <> lower(coalesce(v_user.email, '')) then
    raise exception 'El correo no coincide con el de tu cuenta.';
  end if;

  update public.profiles
  set deletion_scheduled_at = v_scheduled, updated_at = now()
  where id = v_user.id;
  return v_scheduled;
end;
$$;

revoke all on function public.request_account_deletion_google(text) from public, anon;
grant execute on function public.request_account_deletion_google(text) to authenticated;

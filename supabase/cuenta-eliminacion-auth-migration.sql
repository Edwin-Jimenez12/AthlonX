-- Eliminación definitiva de cuentas en Supabase Auth. Se aplica después de cuenta-eliminacion-migration.sql.
-- Idempotente.
--
-- 1. Las referencias a auth.users que bloqueaban el borrado (sin regla o con RESTRICT) pasan a ON DELETE SET NULL.
--    Así se conserva el historial deportivo (torneos, partidos, auditorías) y el registro queda sin autor.
--    Las tablas que ya borran en cascada o ponen null no cambian.
-- 2. purge_expired_account_deletions borra de auth.users las cuentas con el plazo de 15 días vencido;
--    profiles y los datos personales se borran en cascada.
-- 3. pg_cron ejecuta la purga cada hora.

do $$
declare
  fk record;
begin
  for fk in
    select c.conname, c.conrelid::regclass as tabla, a.attname as columna
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    join pg_namespace n on n.oid = (select relnamespace from pg_class where oid = c.conrelid)
    where c.contype = 'f'
      and c.confrelid = 'auth.users'::regclass
      and n.nspname = 'public'
      and array_length(c.conkey, 1) = 1
      and c.confdeltype in ('a', 'r')
  loop
    execute format('alter table %s alter column %I drop not null', fk.tabla, fk.columna);
    execute format('alter table %s drop constraint %I', fk.tabla, fk.conname);
    execute format('alter table %s add constraint %I foreign key (%I) references auth.users (id) on delete set null', fk.tabla, fk.conname, fk.columna);
  end loop;
end;
$$;

-- Borra de Auth las cuentas cuyo plazo venció. Devuelve cuántas se eliminaron.
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

revoke all on function public.purge_expired_account_deletions() from public, anon, authenticated;
grant execute on function public.purge_expired_account_deletions() to service_role;

create extension if not exists pg_cron;

-- cron.schedule con el mismo nombre actualiza el trabajo si ya existe.
select cron.schedule('athlonx-purge-expired-account-deletions', '0 * * * *', 'select public.purge_expired_account_deletions()');

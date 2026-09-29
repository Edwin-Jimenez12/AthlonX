-- AthlonX: permite que cada persona gestione sus roles personales.
-- Ejecutar despues de identity-affiliations-migration.sql y account-contexts-migration.sql.

alter table public.user_roles
  drop constraint if exists user_roles_role_check;

delete from public.user_roles
where role not in ('atleta', 'entrenador', 'staff', 'directivo');

alter table public.user_roles
  add constraint user_roles_role_check
  check (role in ('atleta', 'entrenador', 'staff', 'directivo'));

create or replace function public.set_my_personal_roles(p_roles text[])
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_roles text[];
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para actualizar tus roles';
  end if;

  select coalesce(array_agg(role order by role), '{}'::text[])
  into v_roles
  from (
    select distinct role
    from unnest(coalesce(p_roles, '{}'::text[])) as input_role(role)
    where role in ('atleta', 'entrenador', 'staff', 'directivo')
  ) valid_roles;

  if cardinality(v_roles) = 0 then
    raise exception 'Debes conservar al menos un rol personal';
  end if;

  delete from public.user_roles
  where user_id = auth.uid();

  insert into public.user_roles (user_id, role)
  select auth.uid(), role
  from unnest(v_roles) as selected_role(role);

  delete from public.user_contexts
  where user_id = auth.uid()
    and context_type = 'personal';

  insert into public.user_contexts (user_id, context_type, role, status)
  select auth.uid(), 'personal', role, 'active'
  from unnest(v_roles) as selected_role(role)
  on conflict (user_id, role) where context_type = 'personal'
  do update set status = 'active';

  return v_roles;
end;
$$;

revoke all on function public.set_my_personal_roles(text[]) from public;
grant execute on function public.set_my_personal_roles(text[]) to authenticated;

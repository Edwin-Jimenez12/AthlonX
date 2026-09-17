-- AthlonX: registro institucional y administracion de miembros.
-- Ejecutar despues de organization-management-migration.sql.

update public.disciplines
set is_active = code in ('rugby', 'baloncesto');

insert into public.organization_members (organization_id, user_id, role, status)
select o.id, o.created_by, 'owner', 'active'
from public.organizations o
where o.created_by is not null
on conflict (organization_id, user_id, role) do update set status = 'active';

create or replace function public.is_organization_manager(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organizations o
    where o.id = target_organization_id and o.created_by = auth.uid()
  ) or exists (
    select 1 from public.organization_members m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'directivo')
      and m.status = 'active'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_organization_id uuid;
  v_organization_name text := trim(coalesce(new.raw_user_meta_data ->> 'organization_name', ''));
  v_organization_slug text;
begin
  insert into public.profiles (id, full_name, email_verified)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email_confirmed_at is not null)
  on conflict (id) do update set
    full_name = excluded.full_name,
    email_verified = excluded.email_verified,
    updated_at = now();

  insert into public.user_roles (user_id, role)
  select new.id, role_name
  from jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'roles', '["espectador"]'::jsonb)) as role_name
  where role_name in ('espectador', 'atleta', 'entrenador', 'directivo')
  on conflict (user_id, role) do nothing;

  if coalesce(new.raw_user_meta_data ->> 'account_type', 'persona') = 'organizacion'
     and v_organization_name <> '' then
    v_organization_slug := nullif(
      trim(both '-' from lower(regexp_replace(v_organization_name, '[^a-zA-Z0-9]+', '-', 'g'))),
      ''
    );
    v_organization_slug := coalesce(v_organization_slug, 'organizacion') || '-' || substr(new.id::text, 1, 8);

    insert into public.organizations (
      name, type, city, institutional_email, slug, created_by
    )
    values (
      v_organization_name,
      coalesce(new.raw_user_meta_data ->> 'organization_type', 'organizacion_deportiva'),
      nullif(trim(new.raw_user_meta_data ->> 'organization_city'), ''),
      new.email,
      v_organization_slug,
      new.id
    )
    returning id into v_organization_id;

    insert into public.organization_members (organization_id, user_id, role, status)
    values (v_organization_id, new.id, 'owner', 'active')
    on conflict (organization_id, user_id, role) do update set status = 'active';

    insert into public.organization_disciplines (organization_id, discipline_id)
    select v_organization_id, d.id
    from public.disciplines d
    join jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'organization_disciplines', '[]'::jsonb)) selected
      on selected.value = d.id::text
    where d.is_active = true
    on conflict (organization_id, discipline_id) do nothing;
  end if;

  return new;
end;
$$;

drop policy if exists "Organization managers can view memberships" on public.organization_members;
drop policy if exists "Organization managers can update memberships" on public.organization_members;
drop policy if exists "Organization managers can delete memberships" on public.organization_members;

create policy "Organization managers can view memberships"
  on public.organization_members for select to authenticated
  using (public.is_organization_manager(organization_id));

create policy "Organization managers can update memberships"
  on public.organization_members for update to authenticated
  using (public.is_organization_manager(organization_id))
  with check (public.is_organization_manager(organization_id));

create policy "Organization managers can delete memberships"
  on public.organization_members for delete to authenticated
  using (public.is_organization_manager(organization_id));

grant execute on function public.is_organization_manager(uuid) to authenticated;
grant select, update, delete on public.organization_members to authenticated;

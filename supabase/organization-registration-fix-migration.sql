-- Corrige el registro de organizaciones en bases que ya ejecutaron
-- organization-access-migration.sql.
-- Ejecutar una sola vez en Supabase SQL Editor.

alter table public.organizations
  add column if not exists slug text;

alter table public.organizations drop constraint if exists organizations_type_check;
alter table public.organizations add constraint organizations_type_check
  check (type in ('federacion', 'union', 'liga', 'club', 'equipo', 'academia', 'organizacion_deportiva', 'otro'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_organization_name text := trim(coalesce(new.raw_user_meta_data ->> 'organization_name', ''));
  v_organization_slug text;
begin
  insert into public.profiles (id, full_name, email_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email_confirmed_at is not null
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email_verified = excluded.email_verified,
    updated_at = now();

  insert into public.user_roles (user_id, role)
  select new.id, role_name
  from jsonb_array_elements_text(
    coalesce(new.raw_user_meta_data -> 'roles', '["espectador"]'::jsonb)
  ) as role_name
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
      name,
      type,
      city,
      institutional_email,
      slug,
      created_by
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
    join jsonb_array_elements_text(
      coalesce(new.raw_user_meta_data -> 'organization_disciplines', '[]'::jsonb)
    ) selected on selected.value = d.id::text
    where d.is_active = true
    on conflict (organization_id, discipline_id) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.ensure_my_organization()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user auth.users%rowtype;
  v_organization_id uuid;
  v_name text;
  v_slug text;
begin
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null or coalesce(v_user.raw_user_meta_data ->> 'account_type', 'persona') <> 'organizacion' then
    return;
  end if;

  v_name := trim(coalesce(v_user.raw_user_meta_data ->> 'organization_name', ''));
  if v_name = '' then
    return;
  end if;

  select id into v_organization_id
  from public.organizations
  where created_by = v_user.id
  order by created_at
  limit 1;

  if v_organization_id is null then
    v_slug := nullif(trim(both '-' from lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'))), '');
    v_slug := coalesce(v_slug, 'organizacion') || '-' || substr(v_user.id::text, 1, 8);

    insert into public.organizations (name, type, city, institutional_email, slug, created_by)
    values (
      v_name,
      coalesce(v_user.raw_user_meta_data ->> 'organization_type', 'organizacion_deportiva'),
      nullif(trim(v_user.raw_user_meta_data ->> 'organization_city'), ''),
      v_user.email,
      v_slug,
      v_user.id
    )
    returning id into v_organization_id;
  end if;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_organization_id, v_user.id, 'owner', 'active')
  on conflict (organization_id, user_id, role) do update set status = 'active';

  insert into public.organization_disciplines (organization_id, discipline_id)
  select v_organization_id, d.id
  from public.disciplines d
  join jsonb_array_elements_text(
    coalesce(v_user.raw_user_meta_data -> 'organization_disciplines', '[]'::jsonb)
  ) selected on selected.value = d.id::text
  where d.is_active = true
  on conflict (organization_id, discipline_id) do nothing;
end;
$$;

grant execute on function public.ensure_my_organization() to authenticated;

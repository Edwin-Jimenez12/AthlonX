-- Repara cuentas de organizacion creadas sin perfil institucional.
-- Ejecutar despues de las migraciones de identidades y organizaciones.

alter table public.organizations drop constraint if exists organizations_type_check;
alter table public.organizations add constraint organizations_type_check
  check (type in ('comite_olimpico', 'institucion_gubernamental', 'federacion', 'union', 'liga', 'organizacion_deportiva', 'otro', 'club', 'academia', 'equipo'));

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

  v_name := trim(coalesce(
    nullif(v_user.raw_user_meta_data ->> 'organization_name', ''),
    nullif(v_user.raw_user_meta_data ->> 'full_name', ''),
    nullif(split_part(v_user.email, '@', 1), '')
  ));
  if v_name = '' then
    return;
  end if;

  select o.id into v_organization_id
  from public.organizations o
  left join public.organization_members m on m.organization_id = o.id
  where o.created_by = v_user.id
     or (m.user_id = v_user.id and m.role in ('owner', 'directivo') and m.status = 'active')
  order by o.created_at
  limit 1;

  if v_organization_id is null then
    v_slug := nullif(trim(both '-' from lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'))), '');
    v_slug := coalesce(v_slug, 'organizacion') || '-' || substr(v_user.id::text, 1, 8);

    insert into public.organizations (name, type, city, institutional_email, slug, created_by)
    values (
      v_name,
      case when v_user.raw_user_meta_data ->> 'organization_type' in ('comite_olimpico', 'institucion_gubernamental', 'federacion', 'union', 'liga', 'organizacion_deportiva', 'otro')
        then v_user.raw_user_meta_data ->> 'organization_type'
        else 'organizacion_deportiva'
      end,
      nullif(trim(v_user.raw_user_meta_data ->> 'organization_city'), ''),
      v_user.email,
      v_slug,
      v_user.id
    ) returning id into v_organization_id;
  end if;

  if exists (select 1 from public.organization_members where organization_id = v_organization_id and user_id = v_user.id) then
    update public.organization_members
    set role = 'owner', status = 'active'
    where organization_id = v_organization_id and user_id = v_user.id;
  else
    insert into public.organization_members (organization_id, user_id, role, status)
    values (v_organization_id, v_user.id, 'owner', 'active');
  end if;

  insert into public.organization_disciplines (organization_id, discipline_id)
  select v_organization_id, d.id
  from public.disciplines d
  join jsonb_array_elements_text(coalesce(v_user.raw_user_meta_data -> 'organization_disciplines', '[]'::jsonb)) selected
    on selected.value = d.id::text
  where d.is_active = true
  on conflict (organization_id, discipline_id) do nothing;
end;
$$;

grant execute on function public.ensure_my_organization() to authenticated;

create or replace function public.provision_organization_account(p_user_id uuid)
returns uuid
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
  select * into v_user from auth.users where id = p_user_id;
  if v_user.id is null or coalesce(v_user.raw_user_meta_data ->> 'account_type', 'persona') <> 'organizacion' then
    return null;
  end if;

  v_name := trim(coalesce(
    nullif(v_user.raw_user_meta_data ->> 'organization_name', ''),
    nullif(v_user.raw_user_meta_data ->> 'full_name', ''),
    nullif(split_part(v_user.email, '@', 1), '')
  ));
  if v_name = '' then
    return null;
  end if;

  select o.id into v_organization_id
  from public.organizations o
  left join public.organization_members m on m.organization_id = o.id
  where o.created_by = p_user_id
     or (m.user_id = p_user_id and m.role in ('owner', 'directivo') and m.status = 'active')
  order by o.created_at
  limit 1;

  if v_organization_id is null then
    v_slug := nullif(trim(both '-' from lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'))), '');
    v_slug := coalesce(v_slug, 'organizacion') || '-' || substr(p_user_id::text, 1, 8);
    insert into public.organizations (name, type, city, institutional_email, slug, created_by)
    values (
      v_name,
      case when v_user.raw_user_meta_data ->> 'organization_type' in ('comite_olimpico', 'institucion_gubernamental', 'federacion', 'union', 'liga', 'organizacion_deportiva', 'otro')
        then v_user.raw_user_meta_data ->> 'organization_type'
        else 'organizacion_deportiva'
      end,
      nullif(trim(v_user.raw_user_meta_data ->> 'organization_city'), ''),
      v_user.email,
      v_slug,
      p_user_id
    ) returning id into v_organization_id;
  end if;

  if exists (select 1 from public.organization_members where organization_id = v_organization_id and user_id = p_user_id) then
    update public.organization_members
    set role = 'owner', status = 'active'
    where organization_id = v_organization_id and user_id = p_user_id;
  else
    insert into public.organization_members (organization_id, user_id, role, status)
    values (v_organization_id, p_user_id, 'owner', 'active');
  end if;

  insert into public.organization_disciplines (organization_id, discipline_id)
  select v_organization_id, d.id
  from public.disciplines d
  join jsonb_array_elements_text(coalesce(v_user.raw_user_meta_data -> 'organization_disciplines', '[]'::jsonb)) selected
    on selected.value = d.id::text
  where d.is_active = true
  on conflict (organization_id, discipline_id) do nothing;

  return v_organization_id;
end;
$$;

create or replace function public.ensure_my_organization()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.provision_organization_account(auth.uid());
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email_verified)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email_confirmed_at is not null)
  on conflict (id) do update set
    full_name = excluded.full_name,
    email_verified = excluded.email_verified,
    updated_at = now();

  insert into public.user_roles (user_id, role)
  select new.id, case when role_name = 'coach' then 'entrenador' else role_name end
  from jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'roles', '["atleta"]'::jsonb)) as role_name
  where role_name in ('atleta', 'coach', 'entrenador', 'staff', 'directivo')
  on conflict (user_id, role) do nothing;

  perform public.provision_organization_account(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

grant execute on function public.ensure_my_organization() to authenticated;
revoke all on function public.provision_organization_account(uuid) from public;

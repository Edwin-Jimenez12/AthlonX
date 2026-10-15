-- Nombre y apellido en el registro de Persona.
-- Ejecutar una sola vez en Supabase > SQL Editor, después de registration-accounts-migration.sql.
-- Vuelve a crear handle_new_user para guardar first_name y last_name en profiles.
-- full_name se arma con nombre y apellido; en equipos y organizaciones sigue siendo el nombre de la cuenta.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_type text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'account_type'), ''), 'persona');
  v_first_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), '');
  v_last_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '');
  v_full_name text;
  v_organization_id uuid;
  v_organization_name text := trim(coalesce(new.raw_user_meta_data ->> 'organization_name', ''));
  v_organization_type text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'organization_type'), ''), 'organizacion_deportiva');
  v_organization_slug text;
begin
  v_full_name := coalesce(
    nullif(trim(concat_ws(' ', v_first_name, v_last_name)), ''),
    trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  );

  insert into public.profiles (id, full_name, first_name, last_name, email_verified)
  values (new.id, v_full_name, v_first_name, v_last_name, new.email_confirmed_at is not null)
  on conflict (id) do update set
    full_name = excluded.full_name,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email_verified = excluded.email_verified,
    updated_at = now();

  insert into public.user_roles (user_id, role)
  select new.id, case when role_name = 'coach' then 'entrenador' else role_name end
  from jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'roles', '["atleta"]'::jsonb)) as role_name
  where role_name in ('atleta', 'coach', 'entrenador', 'staff', 'directivo')
  on conflict (user_id, role) do nothing;

  if v_account_type = 'organizacion' then
    if v_organization_name = '' then
      raise exception 'El nombre de la organización es obligatorio';
    end if;

    if v_organization_type not in (
      'comite_olimpico', 'institucion_gubernamental', 'federacion', 'union',
      'liga', 'organizacion_deportiva', 'otro'
    ) then
      v_organization_type := 'organizacion_deportiva';
    end if;

    v_organization_slug := coalesce(
      nullif(trim(both '-' from lower(regexp_replace(v_organization_name, '[^a-zA-Z0-9]+', '-', 'g'))), ''),
      'organizacion'
    ) || '-' || substr(new.id::text, 1, 8);

    insert into public.organizations (name, type, country, city, institutional_email, slug, created_by)
    values (
      v_organization_name,
      v_organization_type,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'organization_country'), ''), 'Panamá'),
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

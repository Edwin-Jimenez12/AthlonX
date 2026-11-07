-- Registro sin rol y acceso con Google.
-- 1) Una cuenta nueva ya no recibe "atleta" por defecto: la persona elige su rol dentro de la plataforma.
-- 2) Cuenta creada con Google (sin nombre de usuario en el registro): nombre y apellido desde el nombre de Google,
--    foto de Google si no tiene, y un nombre de usuario generado a partir del nombre (se puede cambiar en Mi perfil).
-- Idempotente: se puede volver a ejecutar.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_account_type text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'account_type'), ''), 'persona');
  v_first_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), '');
  v_last_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '');
  v_birth_date date;
  v_full_name text;
  v_organization_id uuid;
  v_organization_name text := trim(coalesce(new.raw_user_meta_data ->> 'organization_name', ''));
  v_organization_type text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'organization_type'), ''), 'organizacion_deportiva');
  v_organization_slug text;
begin
  v_birth_date := nullif(trim(coalesce(new.raw_user_meta_data ->> 'birth_date', '')), '')::date;
  if v_birth_date is not null and (v_birth_date > current_date or v_birth_date < date '1900-01-01') then
    raise exception 'La fecha de nacimiento no es válida';
  end if;

  v_full_name := coalesce(
    nullif(trim(concat_ws(' ', v_first_name, v_last_name)), ''),
    trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  );

  insert into public.profiles (id, full_name, first_name, last_name, birth_date, email_verified)
  values (new.id, v_full_name, v_first_name, v_last_name, v_birth_date, new.email_confirmed_at is not null)
  on conflict (id) do update set
    full_name = excluded.full_name,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    birth_date = coalesce(excluded.birth_date, public.profiles.birth_date),
    email_verified = excluded.email_verified,
    updated_at = now();

  insert into public.user_roles (user_id, role)
  select new.id, case when role_name = 'coach' then 'entrenador' else role_name end
  from jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'roles', '[]'::jsonb)) as role_name
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
$function$;


create or replace function public.handle_new_oauth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text := nullif(trim(coalesce(v_meta ->> 'full_name', v_meta ->> 'name', '')), '');
  v_avatar text := nullif(trim(coalesce(v_meta ->> 'avatar_url', v_meta ->> 'picture', '')), '');
  v_base text;
  v_handle text;
begin
  -- Solo cuentas de persona creadas sin el formulario de registro (Google): ese formulario manda public_username.
  if coalesce(v_meta ->> 'account_type', 'persona') <> 'persona' or nullif(trim(v_meta ->> 'public_username'), '') is not null then
    return new;
  end if;

  v_base := lower(coalesce(v_name, split_part(coalesce(new.email, ''), '@', 1), 'usuario'));
  v_base := translate(v_base, 'áéíóúüñàèìòù', 'aeiouunaeiou');
  v_base := trim(both '.' from regexp_replace(regexp_replace(v_base, '[^a-z0-9]+', '.', 'g'), '\.+', '.', 'g'));
  v_base := left(coalesce(nullif(v_base, ''), 'usuario'), 24);
  if char_length(v_base) < 3 then v_base := v_base || '.ax'; end if;
  v_handle := v_base;
  if exists (select 1 from public.profiles p where lower(p.username) = v_handle and p.id <> new.id) then
    v_handle := left(v_base, 24) || '.' || substr(replace(new.id::text, '-', ''), 1, 5);
  end if;

  update public.profiles p set
    full_name = coalesce(nullif(p.full_name, ''), v_name),
    first_name = coalesce(p.first_name, nullif(split_part(coalesce(v_name, ''), ' ', 1), '')),
    last_name = coalesce(p.last_name, nullif(trim(substr(coalesce(v_name, ''), length(split_part(coalesce(v_name, ''), ' ', 1)) + 1)), '')),
    avatar_url = coalesce(p.avatar_url, v_avatar),
    username = coalesce(p.username, v_handle),
    is_searchable = true,
    updated_at = now()
  where p.id = new.id;
  return new;
end;
$$;

-- Se ejecuta después de on_auth_user_created (orden alfabético), cuando el perfil ya existe.
drop trigger if exists on_auth_user_created_oauth on auth.users;
create trigger on_auth_user_created_oauth
  after insert on auth.users
  for each row execute function public.handle_new_oauth_user();

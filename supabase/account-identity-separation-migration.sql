-- AthlonX: separa las identidades de personas, equipos y organizaciones.
-- Ejecutar despues de public-search-migration.sql y
-- team-organization-invitations-migration.sql.

-- La fila en profiles existe para toda cuenta autenticada, pero solo una
-- cuenta de persona puede aparecer como persona en el directorio publico.
create or replace function public.account_type_for_user(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(u.raw_user_meta_data ->> 'account_type', 'persona')
  from auth.users u
  where u.id = p_user_id;
$$;

revoke all on function public.account_type_for_user(uuid) from public;

-- Limpia los identificadores de persona que se generaron para cuentas
-- institucionales antes de aplicar esta separacion.
update public.profiles p
set username = null,
    athlonx_code = null,
    is_searchable = false,
    updated_at = now()
where public.account_type_for_user(p.id) in ('equipo', 'organizacion');

update public.profiles p
set username = coalesce(nullif(trim(p.username), ''), 'usuario-' || substr(replace(p.id::text, '-', ''), 1, 8)),
    athlonx_code = coalesce(nullif(trim(p.athlonx_code), ''), 'AX-PER-' || upper(substr(replace(p.id::text, '-', ''), 1, 5))),
    is_searchable = true,
    updated_at = now()
where public.account_type_for_user(p.id) = 'persona';

create or replace function public.set_public_athlonx_code()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_account_type text;
begin
  if tg_table_name = 'profiles' then
    v_account_type := public.account_type_for_user(new.id);

    if v_account_type in ('equipo', 'organizacion') then
      new.username := null;
      new.athlonx_code := null;
      new.is_searchable := false;
      return new;
    end if;
  end if;

  if new.athlonx_code is null or trim(new.athlonx_code) = '' then
    new.athlonx_code := case tg_table_name
      when 'profiles' then 'AX-PER-'
      when 'organizations' then 'AX-ORG-'
      when 'teams' then 'AX-EQP-'
      when 'tournaments' then 'AX-TOR-'
      else 'AX-'
    end || upper(substr(replace(new.id::text, '-', ''), 1, 5));
  end if;
  return new;
end;
$$;

create or replace function public.ensure_my_public_identity()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user auth.users%rowtype;
  v_account_type text;
  v_handle text;
  v_base_handle text;
begin
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null then return; end if;

  v_account_type := coalesce(v_user.raw_user_meta_data ->> 'account_type', 'persona');
  v_base_handle := lower(trim(regexp_replace(coalesce(v_user.raw_user_meta_data ->> 'public_username', ''), '^@', '')));
  v_base_handle := regexp_replace(v_base_handle, '[^a-z0-9._-]+', '-', 'g');
  v_base_handle := trim(both '-' from v_base_handle);
  v_handle := nullif(v_base_handle, '');

  if v_account_type in ('equipo', 'organizacion') then
    update public.profiles
    set username = null, athlonx_code = null, is_searchable = false, updated_at = now()
    where id = v_user.id;
  else
    if v_handle is null then
      v_handle := 'usuario-' || substr(replace(v_user.id::text, '-', ''), 1, 8);
    elsif exists (select 1 from public.profiles where lower(username) = v_handle and id <> v_user.id) then
      v_handle := v_handle || '-' || substr(replace(v_user.id::text, '-', ''), 1, 5);
    end if;

    update public.profiles
    set username = v_handle,
        athlonx_code = coalesce(nullif(trim(athlonx_code), ''), 'AX-PER-' || upper(substr(replace(v_user.id::text, '-', ''), 1, 5))),
        is_searchable = true,
        updated_at = now()
    where id = v_user.id;
  end if;

  if v_account_type = 'organizacion' then
    update public.organizations o
    set handle = case
      when v_base_handle is null or v_base_handle = '' then 'organizacion-' || substr(replace(o.id::text, '-', ''), 1, 8)
      when exists (select 1 from public.organizations other where lower(other.handle) = v_base_handle and other.id <> o.id) then v_base_handle || '-' || substr(replace(o.id::text, '-', ''), 1, 5)
      else v_base_handle
    end
    where o.created_by = v_user.id;
  elsif v_account_type = 'equipo' then
    update public.teams t
    set handle = case
      when v_base_handle is null or v_base_handle = '' then 'equipo-' || substr(replace(t.id::text, '-', ''), 1, 8)
      when exists (select 1 from public.teams other where lower(other.handle) = v_base_handle and other.id <> t.id) then v_base_handle || '-' || substr(replace(t.id::text, '-', ''), 1, 5)
      else v_base_handle
    end
    where t.created_by = v_user.id;
  end if;
end;
$$;

create or replace function public.search_directory(
  p_query text,
  p_result_type text default 'todos',
  p_discipline_code text default null,
  p_location text default null,
  p_limit integer default 40
)
returns table (
  result_type text,
  entity_id uuid,
  display_name text,
  username text,
  athlonx_code text,
  avatar_url text,
  location text,
  discipline_names text[],
  affiliations jsonb,
  relevance integer
)
language sql
stable
security definer
set search_path = public
as $$
with input as (
  select lower(trim(coalesce(p_query, ''))) as raw_query,
    lower(trim(regexp_replace(coalesce(p_query, ''), '^@', ''))) as term,
    lower(trim(coalesce(p_location, ''))) as location,
    lower(trim(coalesce(p_discipline_code, ''))) as discipline_code
),
directory as (
  select
    'persona'::text as result_type,
    p.id as entity_id,
    p.full_name as display_name,
    p.username,
    p.athlonx_code,
    p.avatar_url,
    null::text as location,
    coalesce((
      select array_agg(distinct discipline_name order by discipline_name)
      from (
        select d.name as discipline_name
        from public.team_user_memberships m
        join public.teams t on t.id = m.team_id
        join public.disciplines d on d.id = t.discipline_id
        where m.user_id = p.id and m.status = 'active'
        union
        select d.name
        from public.organization_members m
        join public.organization_disciplines od on od.organization_id = m.organization_id
        join public.disciplines d on d.id = od.discipline_id
        where m.user_id = p.id and m.status = 'active'
      ) disciplines_for_person
    ), '{}'::text[]) as discipline_names,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'role', case when role = 'owner' then 'directivo' else role end,
        'role_label', coalesce(role_label, case when role = 'owner' then 'Directivo' else initcap(role) end),
        'organization_name', organization_name,
        'team_name', team_name
      ) order by coalesce(team_name, organization_name))
      from public.profile_affiliation_labels labels
      where labels.user_id = p.id
    ), '[]'::jsonb) as affiliations,
    0
  from public.profiles p
  where p.is_searchable = true
    and public.account_type_for_user(p.id) = 'persona'

  union all

  select
    'organizacion'::text,
    o.id,
    o.name,
    o.handle,
    o.athlonx_code,
    o.logo_url,
    coalesce(o.city, o.province, o.country),
    coalesce((select array_agg(distinct d.name order by d.name) from public.organization_disciplines od join public.disciplines d on d.id = od.discipline_id where od.organization_id = o.id), '{}'::text[]),
    '[]'::jsonb,
    0
  from public.organizations o
  where o.is_public = true and o.status = 'active'

  union all

  select
    'equipo'::text,
    t.id,
    t.name,
    t.handle,
    t.athlonx_code,
    t.logo_url,
    t.city,
    case when d.name is null then '{}'::text[] else array[d.name] end,
    case when o.id is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('role', 'organización', 'role_label', 'Pertenece a', 'organization_name', o.name, 'team_name', null)) end,
    0
  from public.teams t
  left join public.disciplines d on d.id = t.discipline_id
  left join public.organizations o on o.id = t.organization_id
  where t.is_public = true

  union all

  select
    'torneo'::text,
    t.id,
    t.name,
    t.slug,
    t.athlonx_code,
    t.cover_url,
    t.location,
    case when d.name is null then '{}'::text[] else array[d.name] end,
    '[]'::jsonb,
    0
  from public.tournaments t
  left join public.disciplines d on d.id = t.discipline_id
  where t.is_public = true and t.status in ('published', 'in_progress', 'finished')
),
matched as (
  select directory.*,
    case
      when lower(directory.athlonx_code) = input.raw_query then 0
      when lower(coalesce(directory.username, '')) = input.term then 1
      when lower(directory.display_name) = input.term then 2
      when lower(coalesce(directory.username, '')) like input.term || '%' then 3
      when lower(directory.display_name) like input.term || '%' then 4
      else 5
    end as calculated_relevance
  from directory, input
  where input.term <> ''
    and (
      lower(directory.athlonx_code) = input.raw_query
      or lower(coalesce(directory.username, '')) like '%' || input.term || '%'
      or lower(directory.display_name) like '%' || input.term || '%'
    )
    and (p_result_type = 'todos' or directory.result_type = p_result_type)
    and (input.location = '' or lower(coalesce(directory.location, '')) like '%' || input.location || '%')
    and (input.discipline_code = '' or exists (
      select 1 from public.disciplines d
      where d.code = input.discipline_code
        and d.name = any(directory.discipline_names)
    ))
)
select result_type, entity_id, display_name, username, athlonx_code, avatar_url,
  location, discipline_names, affiliations, calculated_relevance
from matched
order by calculated_relevance, display_name
limit least(greatest(coalesce(p_limit, 40), 1), 50);
$$;

create or replace function public.search_invitable_athletes(p_query text, p_limit integer default 20)
returns table (id uuid, full_name text, avatar_url text, username text, athlonx_code text)
language sql
stable
security definer
set search_path = public
as $$
  with input as (
    select lower(trim(regexp_replace(coalesce(p_query, ''), '^@', ''))) as term
  )
  select p.id, p.full_name, p.avatar_url, p.username, p.athlonx_code
  from public.profiles p, input
  where p.is_searchable = true
    and public.account_type_for_user(p.id) = 'persona'
    and p.allow_athlete_invitations = true
    and exists (
      select 1 from public.user_roles r
      where r.user_id = p.id and r.role = 'atleta'
    )
    and input.term <> ''
    and (
      lower(coalesce(p.athlonx_code, '')) like '%' || input.term || '%'
      or lower(coalesce(p.username, '')) like '%' || input.term || '%'
      or lower(p.full_name) like '%' || input.term || '%'
    )
  order by
    case
      when lower(coalesce(p.athlonx_code, '')) = input.term then 0
      when lower(coalesce(p.username, '')) = input.term then 1
      when lower(p.full_name) = input.term then 2
      else 3
    end,
    p.full_name
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

grant execute on function public.ensure_my_public_identity() to authenticated;
grant execute on function public.search_directory(text, text, text, text, integer) to authenticated;
grant execute on function public.search_invitable_athletes(text, integer) to authenticated;

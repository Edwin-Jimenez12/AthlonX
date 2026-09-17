-- AthlonX: identificadores publicos y directorio global de busqueda.
-- Ejecutar despues de schema.sql, sports-schema.sql,
-- multidiscipline-migration.sql e identity-affiliations-migration.sql.

create extension if not exists pg_trgm;

alter table public.profiles
  add column if not exists username text,
  add column if not exists athlonx_code text,
  add column if not exists is_searchable boolean not null default true;

alter table public.organizations
  add column if not exists handle text,
  add column if not exists athlonx_code text,
  add column if not exists is_public boolean not null default true;

alter table public.teams
  add column if not exists handle text,
  add column if not exists athlonx_code text,
  add column if not exists is_public boolean not null default true;

alter table public.tournaments
  add column if not exists athlonx_code text,
  add column if not exists is_public boolean not null default true;

update public.profiles
set username = 'usuario-' || substr(replace(id::text, '-', ''), 1, 8)
where username is null or trim(username) = '';

update public.profiles
set athlonx_code = 'AX-PER-' || upper(substr(replace(id::text, '-', ''), 1, 5))
where athlonx_code is null or trim(athlonx_code) = '';

update public.organizations
set handle = coalesce(nullif(lower(trim(slug)), ''), 'organizacion-' || substr(replace(id::text, '-', ''), 1, 8))
where handle is null or trim(handle) = '';

update public.organizations
set athlonx_code = 'AX-ORG-' || upper(substr(replace(id::text, '-', ''), 1, 5))
where athlonx_code is null or trim(athlonx_code) = '';

update public.teams
set handle = 'equipo-' || substr(replace(id::text, '-', ''), 1, 8)
where handle is null or trim(handle) = '';

update public.teams
set athlonx_code = 'AX-EQP-' || upper(substr(replace(id::text, '-', ''), 1, 5))
where athlonx_code is null or trim(athlonx_code) = '';

update public.tournaments
set athlonx_code = 'AX-TOR-' || upper(substr(replace(id::text, '-', ''), 1, 5))
where athlonx_code is null or trim(athlonx_code) = '';

create unique index if not exists profiles_username_key on public.profiles (lower(username));
create unique index if not exists profiles_athlonx_code_key on public.profiles (athlonx_code);
create unique index if not exists organizations_handle_key on public.organizations (lower(handle));
create unique index if not exists organizations_athlonx_code_key on public.organizations (athlonx_code);
create unique index if not exists teams_handle_key on public.teams (lower(handle));
create unique index if not exists teams_athlonx_code_key on public.teams (athlonx_code);
create unique index if not exists tournaments_athlonx_code_key on public.tournaments (athlonx_code);

create index if not exists profiles_search_name_trgm on public.profiles using gin (full_name gin_trgm_ops);
create index if not exists profiles_search_username_trgm on public.profiles using gin (username gin_trgm_ops);
create index if not exists organizations_search_name_trgm on public.organizations using gin (name gin_trgm_ops);
create index if not exists teams_search_name_trgm on public.teams using gin (name gin_trgm_ops);
create index if not exists tournaments_search_name_trgm on public.tournaments using gin (name gin_trgm_ops);

create or replace function public.set_public_athlonx_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
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

drop trigger if exists profiles_public_code_before_insert on public.profiles;
create trigger profiles_public_code_before_insert
before insert on public.profiles
for each row execute function public.set_public_athlonx_code();

drop trigger if exists organizations_public_code_before_insert on public.organizations;
create trigger organizations_public_code_before_insert
before insert on public.organizations
for each row execute function public.set_public_athlonx_code();

drop trigger if exists teams_public_code_before_insert on public.teams;
create trigger teams_public_code_before_insert
before insert on public.teams
for each row execute function public.set_public_athlonx_code();

drop trigger if exists tournaments_public_code_before_insert on public.tournaments;
create trigger tournaments_public_code_before_insert
before insert on public.tournaments
for each row execute function public.set_public_athlonx_code();

create or replace function public.ensure_my_public_identity()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user auth.users%rowtype;
  v_handle text;
  v_base_handle text;
begin
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null then return; end if;

  v_base_handle := lower(trim(regexp_replace(coalesce(v_user.raw_user_meta_data ->> 'public_username', ''), '^@', '')));
  v_base_handle := regexp_replace(v_base_handle, '[^a-z0-9._-]+', '-', 'g');
  v_base_handle := trim(both '-' from v_base_handle);
  v_handle := nullif(v_base_handle, '');

  if v_handle is null then
    v_handle := 'usuario-' || substr(replace(v_user.id::text, '-', ''), 1, 8);
  elsif exists (select 1 from public.profiles where lower(username) = v_handle and id <> v_user.id) then
    v_handle := v_handle || '-' || substr(replace(v_user.id::text, '-', ''), 1, 5);
  end if;

  update public.profiles
  set username = v_handle, is_searchable = true, updated_at = now()
  where id = v_user.id;

  if coalesce(v_user.raw_user_meta_data ->> 'account_type', 'persona') = 'organizacion' then
    update public.organizations o
    set handle = case
      when v_base_handle is null or v_base_handle = '' then 'organizacion-' || substr(replace(o.id::text, '-', ''), 1, 8)
      when exists (select 1 from public.organizations other where lower(other.handle) = v_base_handle and other.id <> o.id) then v_base_handle || '-' || substr(replace(o.id::text, '-', ''), 1, 5)
      else v_base_handle
    end
    where o.created_by = v_user.id;
  elsif coalesce(v_user.raw_user_meta_data ->> 'account_type', 'persona') = 'equipo' then
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

grant execute on function public.ensure_my_public_identity() to authenticated;

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
    ), '[]'::jsonb) as affiliations
    ,0
  from public.profiles p
  where p.is_searchable = true

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

grant execute on function public.search_directory(text, text, text, text, integer) to authenticated;

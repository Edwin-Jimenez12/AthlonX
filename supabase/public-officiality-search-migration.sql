-- AthlonX: filtro publico de perfiles oficiales y no oficiales.
-- Ejecutar despues de quick-tournaments-migration.sql.

create or replace function public.search_directory_filtered(
  p_query text,
  p_result_type text default 'todos',
  p_officiality text default 'todos',
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
  is_official boolean,
  relevance integer
)
language sql
stable
security definer
set search_path = public
as $$
with input as (
  select
    lower(trim(coalesce(p_query, ''))) as raw_query,
    lower(trim(regexp_replace(coalesce(p_query, ''), '^@', ''))) as term,
    lower(trim(coalesce(p_location, ''))) as location,
    lower(trim(coalesce(p_discipline_code, ''))) as discipline_code,
    lower(trim(coalesce(p_officiality, 'todos'))) as officiality
),
directory as (
  select
    'persona'::text as result_type,
    profile.id as entity_id,
    profile.full_name as display_name,
    profile.username,
    profile.athlonx_code,
    profile.avatar_url,
    null::text as location,
    coalesce((
      select array_agg(distinct discipline.name order by discipline.name)
      from (
        select team_discipline.name
        from public.team_user_memberships membership
        join public.teams team
          on team.id = membership.team_id
        join public.disciplines team_discipline
          on team_discipline.id = team.discipline_id
        where membership.user_id = profile.id
          and membership.status = 'active'
        union
        select organization_discipline_catalog.name
        from public.organization_members membership
        join public.organization_disciplines organization_discipline
          on organization_discipline.organization_id = membership.organization_id
        join public.disciplines organization_discipline_catalog
          on organization_discipline_catalog.id = organization_discipline.discipline_id
        where membership.user_id = profile.id
          and membership.status = 'active'
      ) discipline
    ), '{}'::text[]) as discipline_names,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'role', case when role = 'owner' then 'directivo' else role end,
          'role_label', coalesce(
            role_label,
            case when role = 'owner' then 'Directivo' else initcap(role) end
          ),
          'organization_name', organization_name,
          'team_name', team_name
        )
        order by coalesce(team_name, organization_name)
      )
      from public.profile_affiliation_labels affiliation
      where affiliation.user_id = profile.id
    ), '[]'::jsonb) as affiliations,
    true as is_official,
    0 as relevance
  from public.profiles profile
  where profile.is_searchable = true

  union all

  select
    'organizacion'::text,
    organization.id,
    organization.name,
    organization.handle,
    organization.athlonx_code,
    organization.logo_url,
    coalesce(
      organization.city,
      organization.province,
      organization.country
    ),
    coalesce((
      select array_agg(distinct discipline.name order by discipline.name)
      from public.organization_disciplines organization_discipline
      join public.disciplines discipline
        on discipline.id = organization_discipline.discipline_id
      where organization_discipline.organization_id = organization.id
    ), '{}'::text[]),
    '[]'::jsonb,
    true,
    0
  from public.organizations organization
  where organization.is_public = true
    and organization.status = 'active'

  union all

  select
    'equipo'::text,
    team.id,
    team.name,
    team.handle,
    team.athlonx_code,
    team.logo_url,
    team.city,
    case
      when discipline.name is null then '{}'::text[]
      else array[discipline.name]
    end,
    case
      when organization.id is null then '[]'::jsonb
      else jsonb_build_array(
        jsonb_build_object(
          'role', 'organización',
          'role_label', 'Pertenece a',
          'organization_name', organization.name,
          'team_name', null
        )
      )
    end,
    team.is_official,
    0
  from public.teams team
  left join public.disciplines discipline
    on discipline.id = team.discipline_id
  left join public.organizations organization
    on organization.id = team.organization_id
  where team.is_public = true

  union all

  select
    'torneo'::text,
    tournament.id,
    tournament.name,
    tournament.slug,
    tournament.athlonx_code,
    tournament.cover_url,
    tournament.location,
    case
      when discipline.name is null then '{}'::text[]
      else array[discipline.name]
    end,
    '[]'::jsonb,
    not coalesce(tournament.is_quick, false),
    0
  from public.tournaments tournament
  left join public.disciplines discipline
    on discipline.id = tournament.discipline_id
  where tournament.is_public = true
    and tournament.status in ('published', 'in_progress', 'finished')
),
matched as (
  select
    directory.*,
    case
      when lower(directory.athlonx_code) = input.raw_query then 0
      when lower(coalesce(directory.username, '')) = input.term then 1
      when lower(directory.display_name) = input.term then 2
      when lower(coalesce(directory.username, '')) like input.term || '%' then 3
      when lower(directory.display_name) like input.term || '%' then 4
      else 5
    end as calculated_relevance
  from directory
  cross join input
  where input.term <> ''
    and (
      lower(directory.athlonx_code) = input.raw_query
      or lower(coalesce(directory.username, '')) like '%' || input.term || '%'
      or lower(directory.display_name) like '%' || input.term || '%'
    )
    and (
      input.officiality = 'todos'
      or (
        input.officiality = 'oficiales'
        and directory.is_official = true
      )
      or (
        input.officiality = 'no_oficiales'
        and directory.is_official = false
      )
    )
    and (
      input.location = ''
      or lower(coalesce(directory.location, '')) like '%' || input.location || '%'
    )
    and (
      input.discipline_code = ''
      or exists (
        select 1
        from public.disciplines discipline
        where discipline.code = input.discipline_code
          and discipline.name = any(directory.discipline_names)
      )
    )
)
select
  result_type,
  entity_id,
  display_name,
  username,
  athlonx_code,
  avatar_url,
  location,
  discipline_names,
  affiliations,
  is_official,
  calculated_relevance
from matched
order by calculated_relevance, display_name
limit least(greatest(coalesce(p_limit, 40), 1), 50);
$$;

create or replace function public.search_public_players_filtered(
  p_query text,
  p_officiality text default 'todos',
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
  is_official boolean,
  relevance integer
)
language sql
stable
security definer
set search_path = public
as $$
with input as (
  select
    lower(trim(coalesce(p_query, ''))) as raw_query,
    lower(trim(regexp_replace(coalesce(p_query, ''), '^@', ''))) as term,
    lower(trim(coalesce(p_location, ''))) as location,
    lower(trim(coalesce(p_discipline_code, ''))) as discipline_code,
    lower(trim(coalesce(p_officiality, 'todos'))) as officiality
),
directory as (
  select
    'persona'::text as result_type,
    player.id as entity_id,
    player.full_name as display_name,
    player.username,
    ('AX-PLA-' || upper(substr(replace(player.id::text, '-', ''), 1, 5)))::text as athlonx_code,
    player.photo_url as avatar_url,
    player.city as location,
    coalesce(
      array_agg(distinct discipline.name)
        filter (where discipline.name is not null),
      '{}'::text[]
    ) as discipline_names,
    coalesce(
      jsonb_agg(
        distinct jsonb_build_object(
          'role', 'atleta',
          'role_label', 'Atleta',
          'organization_name', organization.name,
          'team_name', team.name
        )
      ) filter (where team.id is not null),
      '[]'::jsonb
    ) as affiliations,
    player.is_official,
    0 as relevance
  from public.players player
  join public.team_players team_player
    on team_player.player_id = player.id
  join public.teams team
    on team.id = team_player.team_id
    and team.is_public = true
  left join public.organizations organization
    on organization.id = team.organization_id
  left join public.disciplines discipline
    on discipline.id = team.discipline_id
  group by
    player.id,
    player.full_name,
    player.username,
    player.photo_url,
    player.city,
    player.is_official
),
matched as (
  select
    directory.*,
    case
      when lower(directory.athlonx_code) = input.raw_query then 0
      when lower(coalesce(directory.username, '')) = input.term then 1
      when lower(directory.display_name) = input.term then 2
      when lower(coalesce(directory.username, '')) like input.term || '%' then 3
      when lower(directory.display_name) like input.term || '%' then 4
      else 5
    end as calculated_relevance
  from directory
  cross join input
  where input.term <> ''
    and (
      lower(directory.athlonx_code) = input.raw_query
      or lower(coalesce(directory.username, '')) like '%' || input.term || '%'
      or lower(directory.display_name) like '%' || input.term || '%'
    )
    and (
      input.officiality = 'todos'
      or (
        input.officiality = 'oficiales'
        and directory.is_official = true
      )
      or (
        input.officiality = 'no_oficiales'
        and directory.is_official = false
      )
    )
    and (
      input.location = ''
      or lower(coalesce(directory.location, '')) like '%' || input.location || '%'
    )
    and (
      input.discipline_code = ''
      or exists (
        select 1
        from public.disciplines discipline
        where discipline.code = input.discipline_code
          and discipline.name = any(directory.discipline_names)
      )
    )
)
select
  result_type,
  entity_id,
  display_name,
  username,
  athlonx_code,
  avatar_url,
  location,
  discipline_names,
  affiliations,
  is_official,
  calculated_relevance
from matched
order by calculated_relevance, display_name
limit least(greatest(coalesce(p_limit, 40), 1), 50);
$$;

revoke all on function public.search_directory_filtered(text, text, text, text, text, integer) from public;
revoke all on function public.search_public_players_filtered(text, text, text, text, integer) from public;
grant execute on function public.search_directory_filtered(text, text, text, text, text, integer) to authenticated;
grant execute on function public.search_public_players_filtered(text, text, text, text, integer) to authenticated;

-- Incluye atletas registrados en plantillas aunque todavía no tengan una cuenta Auth.
-- Ejecutar despues de supabase/titanes-test-roster-migration.sql.

create or replace function public.search_public_players(
  p_query text,
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
    ('AX-PLA-' || upper(substr(replace(p.id::text, '-', ''), 1, 5)))::text as athlonx_code,
    p.photo_url as avatar_url,
    p.city as location,
    coalesce(array_agg(distinct d.name) filter (where d.name is not null), '{}'::text[]) as discipline_names,
    coalesce(jsonb_agg(distinct jsonb_build_object(
      'role', 'atleta',
      'role_label', 'Atleta',
      'organization_name', o.name,
      'team_name', t.name
    )) filter (where t.id is not null), '[]'::jsonb) as affiliations,
    0 as relevance
  from public.players p
  join public.team_players tp on tp.player_id = p.id
  join public.teams t on t.id = tp.team_id and t.is_public = true
  left join public.organizations o on o.id = t.organization_id
  left join public.disciplines d on d.id = t.discipline_id
  group by p.id, p.full_name, p.username, p.photo_url, p.city
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

create or replace function public.get_public_player_profile(p_player_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.photo_url,
        'username', p.username,
        'athlonx_code', 'AX-PLA-' || upper(substr(replace(p.id::text, '-', ''), 1, 5))
      )
      from public.players p
      where p.id = p_player_id
    ),
    'roles', '[{"role":"atleta"}]'::jsonb,
    'labels', coalesce((
      select jsonb_agg(jsonb_build_object(
        'role', 'atleta',
        'role_label', 'Atleta',
        'organization_id', t.organization_id,
        'organization_name', o.name,
        'team_id', t.id,
        'team_name', t.name
      ) order by t.name)
      from public.team_players tp
      join public.teams t on t.id = tp.team_id
      left join public.organizations o on o.id = t.organization_id
      where tp.player_id = p_player_id and t.is_public = true
    ), '[]'::jsonb),
    'team_affiliations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'team_id', t.id,
        'team_name', t.name,
        'team_city', t.city,
        'organization_id', t.organization_id,
        'organization_name', o.name,
        'discipline_id', d.id,
        'discipline_code', d.code,
        'discipline_name', d.name,
        'role', 'atleta',
        'role_label', 'Atleta'
      ) order by d.name, t.name)
      from public.team_players tp
      join public.teams t on t.id = tp.team_id
      left join public.organizations o on o.id = t.organization_id
      left join public.disciplines d on d.id = t.discipline_id
      where tp.player_id = p_player_id and t.is_public = true
    ), '[]'::jsonb),
    'disciplines', coalesce((
      select jsonb_agg(jsonb_build_object('id', item.id, 'code', item.code, 'name', item.name) order by item.name)
      from (
        select distinct d.id, d.code, d.name
        from public.team_players tp
        join public.teams t on t.id = tp.team_id
        join public.disciplines d on d.id = t.discipline_id
        where tp.player_id = p_player_id and t.is_public = true
      ) item
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.search_public_players(text, text, text, integer) from public;
revoke all on function public.get_public_player_profile(uuid) from public;
grant execute on function public.search_public_players(text, text, text, integer) to authenticated;
grant execute on function public.get_public_player_profile(uuid) to authenticated;

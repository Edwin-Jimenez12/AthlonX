-- AthlonX: perfiles publicos y plantillas independientes por division.
-- Ejecutar despues de team-profile-divisions-migration.sql,
-- team-division-normalization-migration.sql, team-public-labels-migration.sql
-- y team-calendar-migration.sql.

alter table public.team_division_catalog
  add column if not exists athlonx_code text;

alter table public.team_players
  add column if not exists division_id uuid references public.team_division_catalog(id) on delete set null;

alter table public.team_calendar_events
  add column if not exists division_id uuid references public.team_division_catalog(id) on delete set null;

create unique index if not exists team_division_catalog_athlonx_code_key
  on public.team_division_catalog (athlonx_code)
  where athlonx_code is not null;

create index if not exists team_players_team_division_idx
  on public.team_players (team_id, division_id);

create index if not exists team_calendar_events_team_division_idx
  on public.team_calendar_events (team_id, division_id, starts_at);

create or replace function public.set_team_division_athlonx_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.athlonx_code is null or trim(new.athlonx_code) = '' then
    new.athlonx_code := 'AX-DIV-' || upper(substr(replace(new.id::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists set_team_division_athlonx_code on public.team_division_catalog;
create trigger set_team_division_athlonx_code
before insert or update on public.team_division_catalog
for each row execute procedure public.set_team_division_athlonx_code();

update public.team_division_catalog
set athlonx_code = 'AX-DIV-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where athlonx_code is null or trim(athlonx_code) = '';

update public.team_players player_link
set division_id = division.id
from public.players player
join public.team_division_catalog division
  on division.team_id = player_link.team_id
 and lower(trim(division.name)) = lower(trim(player.division))
where player.id = player_link.player_id
  and player_link.division_id is null
  and nullif(trim(player.division), '') is not null;

create or replace function public.save_team_divisions(
  p_team_id uuid,
  p_divisions text[] default '{}'::text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_division text;
  canonical_division text;
  selected_divisions text[] := '{}'::text[];
  team_discipline_id uuid;
begin
  if not exists (
    select 1
    from public.teams team
    where team.id = p_team_id
      and (
        team.created_by = auth.uid()
        or exists (
          select 1
          from public.team_user_memberships membership
          where membership.team_id = team.id
            and membership.user_id = auth.uid()
            and membership.role in ('owner', 'directivo')
            and membership.status = 'active'
        )
      )
  ) then
    raise exception 'No tienes permisos para configurar este equipo';
  end if;

  select discipline_id into team_discipline_id
  from public.teams
  where id = p_team_id;

  foreach requested_division in array coalesce(p_divisions, '{}'::text[]) loop
    canonical_division := case lower(trim(coalesce(requested_division, '')))
      when 'primera división' then 'Primera división'
      when 'segunda división' then 'Segunda división'
      when 'femenina' then 'Femenina'
      else null
    end;

    if canonical_division is not null
      and not (canonical_division = any(selected_divisions)) then
      selected_divisions := array_append(selected_divisions, canonical_division);
    end if;
  end loop;

  delete from public.team_division_catalog
  where team_id = p_team_id
    and not (name = any(selected_divisions));

  foreach canonical_division in array selected_divisions loop
    insert into public.team_division_catalog (team_id, name, discipline_id)
    values (p_team_id, canonical_division, team_discipline_id)
    on conflict (team_id, name)
    do update set discipline_id = excluded.discipline_id;
  end loop;
end;
$$;

revoke all on function public.save_team_divisions(uuid, text[]) from public;
grant execute on function public.save_team_divisions(uuid, text[]) to authenticated;

-- Resultados adicionales del directorio: el equipo general sigue viniendo de
-- search_directory_filtered y cada division aparece como otro resultado.
create or replace function public.search_public_team_divisions_filtered(
  p_query text,
  p_officiality text default 'todos',
  p_discipline_code text default null,
  p_location text default null,
  p_limit integer default 40
)
returns table (
  result_type text,
  entity_id uuid,
  division_id uuid,
  division_name text,
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
), division_directory as (
  select
    'equipo'::text as result_type,
    team.id as entity_id,
    division.id as division_id,
    division.name as division_name,
    team.name as display_name,
    team.handle as username,
    division.athlonx_code,
    team.logo_url as avatar_url,
    team.city as location,
    case when discipline.name is null then '{}'::text[] else array[discipline.name] end as discipline_names,
    '[]'::jsonb as affiliations,
    team.is_official,
    case
      when lower(division.athlonx_code) = input.raw_query then 0
      when lower(team.name) = input.term then 2
      when lower(division.name) = input.term then 2
      when lower(team.name) like input.term || '%' then 4
      else 5
    end as relevance
  from public.team_division_catalog division
  join public.teams team on team.id = division.team_id
  left join public.disciplines discipline on discipline.id = team.discipline_id
  cross join input
  where team.is_public = true
    and input.term <> ''
    and (
      lower(division.athlonx_code) = input.raw_query
      or lower(coalesce(team.handle, '')) like '%' || input.term || '%'
      or lower(team.name) like '%' || input.term || '%'
      or lower(division.name) like '%' || input.term || '%'
    )
    and (
      input.officiality = 'todos'
      or (input.officiality = 'oficiales' and team.is_official = true)
      or (input.officiality = 'no_oficiales' and team.is_official = false)
    )
    and (input.location = '' or lower(coalesce(team.city, '')) like '%' || input.location || '%')
    and (
      input.discipline_code = ''
      or exists (
        select 1 from public.disciplines filter_discipline
        where filter_discipline.code = input.discipline_code
          and filter_discipline.id = team.discipline_id
      )
    )
)
select * from division_directory
order by relevance, display_name, division_name
limit least(greatest(coalesce(p_limit, 40), 1), 50);
$$;

revoke all on function public.search_public_team_divisions_filtered(text, text, text, text, integer) from public;
grant execute on function public.search_public_team_divisions_filtered(text, text, text, text, integer) to authenticated;

-- El perfil general conserva toda la informacion del equipo. Las vistas de
-- division reutilizan este mismo RPC y filtran en el cliente por division_id.
create or replace function public.get_public_team_profile(p_team_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
select jsonb_build_object(
  'team', (
    select jsonb_build_object(
      'id', team.id,
      'name', team.name,
      'description', team.description,
      'logo_url', team.logo_url,
      'country', team.country,
      'city', team.city,
      'contact_email', team.contact_email,
      'contact_phone', team.contact_phone,
      'website_url', team.website_url,
      'athlonx_code', team.athlonx_code,
      'handle', team.handle,
      'discipline', case when discipline.id is null then null else jsonb_build_object(
        'id', discipline.id, 'code', discipline.code, 'name', discipline.name
      ) end,
      'organization', case when organization.id is null then null else jsonb_build_object(
        'id', organization.id, 'name', organization.name,
        'athlonx_code', organization.athlonx_code, 'handle', organization.handle
      ) end
    )
    from public.teams team
    left join public.disciplines discipline on discipline.id = team.discipline_id
    left join public.organizations organization on organization.id = team.organization_id
    where team.id = p_team_id and team.is_public = true
  ),
  'labels', coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', profile.id,
      'full_name', profile.full_name,
      'avatar_url', profile.avatar_url,
      'username', profile.username,
      'role', membership.role,
      'role_label', membership.role_label
    ) order by profile.full_name)
    from public.team_user_memberships membership
    join public.profiles profile on profile.id = membership.user_id
    where membership.team_id = p_team_id
      and membership.status = 'active'
      and membership.role in ('owner', 'directivo', 'entrenador', 'staff')
      and profile.is_searchable = true
  ), '[]'::jsonb),
  'players', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', player.id,
      'profile_id', player.profile_id,
      'full_name', player.full_name,
      'avatar_url', player.avatar_url,
      'shirt_number', player.shirt_number,
      'position', player.position,
      'division_id', player.division_id,
      'division_name', player.division_name
    ) order by player.full_name)
    from (
      select
        player.id,
        player.profile_id,
        player.full_name,
        coalesce(profile.avatar_url, player.photo_url) as avatar_url,
        player.shirt_number,
        player.position,
        team_player.division_id,
        division.name as division_name
      from public.team_players team_player
      join public.players player on player.id = team_player.player_id
      left join public.profiles profile on profile.id = player.profile_id
      left join public.team_division_catalog division on division.id = team_player.division_id
      where team_player.team_id = p_team_id

      union all

      select
        profile.id,
        profile.id,
        profile.full_name,
        profile.avatar_url,
        null::integer,
        null::text,
        null::uuid,
        null::text
      from public.team_user_memberships membership
      join public.profiles profile on profile.id = membership.user_id
      where membership.team_id = p_team_id
        and membership.status = 'active'
        and membership.role = 'atleta'
        and profile.is_searchable = true
    ) player
  ), '[]'::jsonb),
  'divisions', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', division.id,
      'name', division.name,
      'athlonx_code', division.athlonx_code,
      'players', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', player.id,
          'profile_id', player.profile_id,
          'full_name', player.full_name,
          'avatar_url', coalesce(profile.avatar_url, player.photo_url),
          'shirt_number', player.shirt_number,
          'position', player.position,
          'division_id', team_player.division_id,
          'division_name', division.name
        ) order by player.full_name)
        from public.team_players team_player
        join public.players player on player.id = team_player.player_id
        left join public.profiles profile on profile.id = player.profile_id
        where team_player.team_id = p_team_id
          and team_player.division_id = division.id
      ), '[]'::jsonb)
    ) order by division.name)
    from public.team_division_catalog division
    where division.team_id = p_team_id
  ), '[]'::jsonb),
  'tournaments', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', item.id,
      'name', item.name,
      'slug', item.slug,
      'season', item.season,
      'status', item.status,
      'location', item.location
    ) order by item.created_at desc)
    from (
      select distinct tournament.id, tournament.name, tournament.slug,
        tournament.season, tournament.status, tournament.location, tournament.created_at
      from public.tournament_teams tournament_team
      join public.tournaments tournament on tournament.id = tournament_team.tournament_id
      where tournament_team.team_id = p_team_id
      union
      select tournament.id, tournament.name, tournament.slug,
        tournament.season, tournament.status, tournament.location, tournament.created_at
      from public.tournaments tournament
      where tournament.organizer_team_id = p_team_id
    ) item
  ), '[]'::jsonb)
);
$$;

revoke all on function public.get_public_team_profile(uuid) from public;
grant execute on function public.get_public_team_profile(uuid) to authenticated;

create or replace function public.set_team_player_division(
  p_team_id uuid,
  p_player_id uuid,
  p_division_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.teams team
    where team.id = p_team_id
      and (
        team.created_by = auth.uid()
        or exists (
          select 1
          from public.team_user_memberships membership
          where membership.team_id = team.id
            and membership.user_id = auth.uid()
            and membership.role in ('owner', 'directivo')
            and membership.status = 'active'
        )
      )
  ) then
    raise exception 'No tienes permisos para editar la plantilla del equipo';
  end if;

  if p_division_id is not null and not exists (
    select 1 from public.team_division_catalog division
    where division.id = p_division_id and division.team_id = p_team_id
  ) then
    raise exception 'La division seleccionada no pertenece a este equipo';
  end if;

  update public.team_players
  set division_id = p_division_id
  where team_id = p_team_id and player_id = p_player_id;

  if not found then
    raise exception 'El jugador no pertenece a la plantilla del equipo';
  end if;
end;
$$;

revoke all on function public.set_team_player_division(uuid, uuid, uuid) from public;
grant execute on function public.set_team_player_division(uuid, uuid, uuid) to authenticated;

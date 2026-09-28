-- AthlonX: edición del perfil propio de las cuentas de equipo.
-- Ejecutar despues de coach-team-access-migration.sql y public-entities-migration.sql.

alter table public.teams
  add column if not exists description text,
  add column if not exists website_url text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists country text not null default 'Panamá',
  add column if not exists handle text,
  add column if not exists is_public boolean not null default true;

create or replace function public.update_team_profile(
  p_team_id uuid,
  p_name text,
  p_description text default null,
  p_logo_url text default null,
  p_country text default null,
  p_city text default null,
  p_contact_email text default null,
  p_contact_phone text default null,
  p_website_url text default null,
  p_handle text default null,
  p_discipline_id uuid default null,
  p_is_public boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_handle text;
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
    raise exception 'No tienes permisos para editar este equipo';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'El nombre del equipo es obligatorio';
  end if;

  if p_discipline_id is not null and not exists (
    select 1
    from public.disciplines discipline
    where discipline.id = p_discipline_id
      and discipline.is_active = true
  ) then
    raise exception 'La disciplina seleccionada no está disponible';
  end if;

  normalized_handle := nullif(lower(trim(regexp_replace(coalesce(p_handle, ''), '^@', ''))), '');

  if normalized_handle is not null
    and normalized_handle !~ '^[a-z0-9][a-z0-9._-]{2,39}$' then
    raise exception 'El usuario público solo puede usar letras, números, puntos, guiones y guion bajo';
  end if;

  if normalized_handle is not null and exists (
    select 1
    from public.teams other_team
    where lower(other_team.handle) = normalized_handle
      and other_team.id <> p_team_id
  ) then
    raise exception 'Ese usuario público ya está en uso';
  end if;

  update public.teams
  set name = trim(p_name),
      description = nullif(trim(coalesce(p_description, '')), ''),
      logo_url = nullif(trim(coalesce(p_logo_url, '')), ''),
      country = nullif(trim(coalesce(p_country, '')), ''),
      city = nullif(trim(coalesce(p_city, '')), ''),
      contact_email = nullif(trim(coalesce(p_contact_email, '')), ''),
      contact_phone = nullif(trim(coalesce(p_contact_phone, '')), ''),
      website_url = nullif(trim(coalesce(p_website_url, '')), ''),
      handle = normalized_handle,
      discipline_id = p_discipline_id,
      is_public = coalesce(p_is_public, true)
  where id = p_team_id;
end;
$$;

revoke all on function public.update_team_profile(uuid, text, text, text, text, text, text, text, text, text, uuid, boolean) from public;
grant execute on function public.update_team_profile(uuid, text, text, text, text, text, text, text, text, text, uuid, boolean) to authenticated;

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
        'id', t.id,
        'name', t.name,
        'description', t.description,
        'logo_url', t.logo_url,
        'country', t.country,
        'city', t.city,
        'contact_email', t.contact_email,
        'contact_phone', t.contact_phone,
        'website_url', t.website_url,
        'athlonx_code', t.athlonx_code,
        'handle', t.handle,
        'discipline', case when d.id is null then null else jsonb_build_object('id', d.id, 'code', d.code, 'name', d.name) end,
        'organization', case when o.id is null then null else jsonb_build_object('id', o.id, 'name', o.name, 'athlonx_code', o.athlonx_code, 'handle', o.handle) end
      )
      from public.teams t
      left join public.disciplines d on d.id = t.discipline_id
      left join public.organizations o on o.id = t.organization_id
      where t.id = p_team_id and t.is_public = true
    ),
    'labels', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'username', p.username,
        'role', m.role,
        'role_label', m.role_label
      ) order by p.full_name)
      from public.team_user_memberships m
      join public.profiles p on p.id = m.user_id
      where m.team_id = p_team_id
        and m.status = 'active'
        and m.role in ('owner', 'directivo', 'entrenador', 'staff')
        and p.is_searchable = true
    ), '[]'::jsonb),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'shirt_number', p.shirt_number,
        'position', p.position
      ) order by p.full_name)
      from public.team_players tp
      join public.players p on p.id = tp.player_id
      where tp.team_id = p_team_id
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
        select distinct t.id, t.name, t.slug, t.season, t.status, t.location, t.created_at
        from public.tournament_teams tt
        join public.tournaments t on t.id = tt.tournament_id
        where tt.team_id = p_team_id
        union
        select t.id, t.name, t.slug, t.season, t.status, t.location, t.created_at
        from public.tournaments t
        where t.organizer_team_id = p_team_id
      ) item
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_public_team_profile(uuid) from public;
grant execute on function public.get_public_team_profile(uuid) to authenticated;

-- Perfiles publicos seguros para equipos y organizaciones.
-- Ejecutar despues de identity-affiliations-migration.sql,
-- public-search-migration.sql y event-management-migration.sql.

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
        'logo_url', t.logo_url,
        'country', t.country,
        'city', t.city,
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
      where m.team_id = p_team_id and m.status = 'active' and p.is_searchable = true
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

create or replace function public.get_public_organization_profile(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'organization', (
      select jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'type', o.type,
        'country', o.country,
        'city', coalesce(o.city, o.province),
        'logo_url', o.logo_url,
        'description', o.description,
        'slug', o.slug,
        'athlonx_code', o.athlonx_code,
        'handle', o.handle
      )
      from public.organizations o
      where o.id = p_organization_id and o.is_public = true and o.status = 'active'
    ),
    'disciplines', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'code', d.code, 'name', d.name) order by d.name)
      from public.organization_disciplines od
      join public.disciplines d on d.id = od.discipline_id
      where od.organization_id = p_organization_id
    ), '[]'::jsonb),
    'modalities', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'code', m.code, 'name', m.name, 'discipline_id', m.discipline_id) order by m.name)
      from public.organization_modalities om
      join public.sport_modalities m on m.id = om.modality_id
      where om.organization_id = p_organization_id and m.is_active = true
    ), '[]'::jsonb),
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'logo_url', t.logo_url,
        'country', t.country,
        'city', t.city,
        'discipline_id', d.id,
        'discipline_code', d.code,
        'discipline_name', d.name,
        'athlonx_code', t.athlonx_code,
        'handle', t.handle
      ) order by d.name, t.name)
      from public.teams t
      left join public.disciplines d on d.id = t.discipline_id
      where t.organization_id = p_organization_id and t.is_public = true
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'username', p.username,
        'role', m.role,
        'role_label', m.role_label
      ) order by p.full_name)
      from public.organization_members m
      join public.profiles p on p.id = m.user_id
      where m.organization_id = p_organization_id and m.status = 'active' and p.is_searchable = true
    ), '[]'::jsonb),
    'relationships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', relation.id,
        'direction', relation.direction,
        'relationship_type', relation.relationship_type,
        'organization_id', relation.organization_id,
        'organization_name', relation.organization_name,
        'discipline_name', relation.discipline_name
      ) order by relation.organization_name)
      from (
        select r.id, 'superior'::text as direction, r.relationship_type, child.id as organization_id, child.name as organization_name, d.name as discipline_name
        from public.organization_relationships r
        join public.organizations child on child.id = r.subordinate_organization_id
        left join public.disciplines d on d.id = r.discipline_id
        where r.superior_organization_id = p_organization_id and r.status = 'active'
        union all
        select r.id, 'subordinate'::text as direction, r.relationship_type, parent.id, parent.name, d.name
        from public.organization_relationships r
        join public.organizations parent on parent.id = r.superior_organization_id
        left join public.disciplines d on d.id = r.discipline_id
        where r.subordinate_organization_id = p_organization_id and r.status = 'active'
      ) relation
    ), '[]'::jsonb),
    'tournaments', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'season', t.season, 'status', t.status, 'location', t.location, 'modality', case when m.id is null then null else jsonb_build_object('id', m.id, 'code', m.code, 'name', m.name) end) order by t.created_at desc)
      from public.tournaments t
      left join public.sport_modalities m on m.id = t.modality_id
      where t.organization_id = p_organization_id
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_public_team_profile(uuid) from public;
revoke all on function public.get_public_organization_profile(uuid) from public;
grant execute on function public.get_public_team_profile(uuid) to authenticated;
grant execute on function public.get_public_organization_profile(uuid) to authenticated;

create or replace function public.get_public_tournament_profile(p_tournament_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'tournament', (
      select jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'slug', t.slug,
        'season', t.season,
        'status', t.status,
        'start_date', t.start_date,
        'end_date', t.end_date,
        'location', t.location,
        'country', t.country,
        'cover_url', t.cover_url,
        'athlonx_code', t.athlonx_code,
        'discipline', case when d.id is null then null else jsonb_build_object('id', d.id, 'code', d.code, 'name', d.name) end,
        'modality', case when m.id is null then null else jsonb_build_object('id', m.id, 'code', m.code, 'name', m.name) end,
        'organization', case when o.id is null then null else jsonb_build_object('id', o.id, 'name', o.name, 'athlonx_code', o.athlonx_code, 'handle', o.handle) end,
        'organizer_team', case when ot.id is null then null else jsonb_build_object('id', ot.id, 'name', ot.name, 'athlonx_code', ot.athlonx_code, 'handle', ot.handle) end
      )
      from public.tournaments t
      left join public.disciplines d on d.id = t.discipline_id
      left join public.sport_modalities m on m.id = t.modality_id
      left join public.organizations o on o.id = t.organization_id
      left join public.teams ot on ot.id = t.organizer_team_id
      where t.id = p_tournament_id
        and (
          (t.is_public = true and t.status in ('published', 'in_progress', 'finished'))
          or (t.status = 'draft' and t.created_by = auth.uid())
        )
    ),
    'divisions', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'sort_order', d.sort_order) order by d.sort_order, d.name)
      from public.tournament_divisions d
      where d.tournament_id = p_tournament_id
        and exists (
          select 1 from public.tournaments visible_tournament
          where visible_tournament.id = p_tournament_id
            and ((visible_tournament.is_public = true and visible_tournament.status in ('published', 'in_progress', 'finished')) or (visible_tournament.status = 'draft' and visible_tournament.created_by = auth.uid()))
        )
    ), '[]'::jsonb),
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'logo_url', t.logo_url,
        'city', t.city,
        'division_id', d.id,
        'division_name', d.name,
        'athlonx_code', t.athlonx_code,
        'handle', t.handle
      ) order by d.sort_order, t.name)
      from public.tournament_teams tt
      join public.teams t on t.id = tt.team_id
      join public.tournament_divisions d on d.id = tt.division_id
      where tt.tournament_id = p_tournament_id
        and exists (
          select 1 from public.tournaments visible_tournament
          where visible_tournament.id = p_tournament_id
            and ((visible_tournament.is_public = true and visible_tournament.status in ('published', 'in_progress', 'finished')) or (visible_tournament.status = 'draft' and visible_tournament.created_by = auth.uid()))
        )
    ), '[]'::jsonb),
    'matches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'fixture_id', f.id,
        'date_number', f.date_number,
        'calendar_date', f.calendar_date,
        'division_name', d.name,
        'scheduled_time', m.scheduled_time,
        'status', m.status,
        'local_team_id', local_team.id,
        'local_team_name', local_team.name,
        'local_logo_url', local_team.logo_url,
        'visitor_team_id', visitor_team.id,
        'visitor_team_name', visitor_team.name,
        'visitor_logo_url', visitor_team.logo_url,
        'local_score', m.local_score,
        'visitor_score', m.visitor_score
      ) order by f.date_number, m.scheduled_time nulls last, local_team.name)
      from public.fixtures f
      join public.matches m on m.fixture_id = f.id
      left join public.tournament_divisions d on d.id = m.division_id
      left join public.teams local_team on local_team.id = m.local_team_id
      left join public.teams visitor_team on visitor_team.id = m.visitor_team_id
      where f.tournament_id = p_tournament_id
        and exists (
          select 1 from public.tournaments visible_tournament
          where visible_tournament.id = p_tournament_id
            and ((visible_tournament.is_public = true and visible_tournament.status in ('published', 'in_progress', 'finished')) or (visible_tournament.status = 'draft' and visible_tournament.created_by = auth.uid()))
        )
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_public_tournament_profile(uuid) from public;
grant execute on function public.get_public_tournament_profile(uuid) to authenticated;

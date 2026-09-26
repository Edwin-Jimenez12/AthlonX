-- Permite que el creador abra sus propios borradores desde la pagina de gestion.
-- Los borradores siguen ocultos para cualquier otra cuenta.

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

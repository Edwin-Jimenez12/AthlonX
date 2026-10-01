-- AthlonX: conserva el orden aleatorio de los partidos dentro de cada fecha.
-- Ejecutar despues de sports-schema.sql y de las migraciones del perfil publico.

alter table public.matches
  add column if not exists fixture_order integer;

with ordered_matches as (
  select
    id,
    row_number() over (
      partition by fixture_id
      order by scheduled_time nulls last, id
    ) - 1 as fixture_order
  from public.matches
)
update public.matches as match_row
set fixture_order = ordered_matches.fixture_order
from ordered_matches
where match_row.id = ordered_matches.id
  and match_row.fixture_order is null;

create index if not exists matches_fixture_order_idx
  on public.matches (fixture_id, fixture_order);

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
        'is_quick', t.is_quick,
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
        'handle', t.handle,
        'is_official', t.is_official,
        'contact_phone', t.contact_phone
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
        'id', match_row.id,
        'fixture_id', fixture.id,
        'date_number', fixture.date_number,
        'calendar_date', fixture.calendar_date,
        'fixture_order', match_row.fixture_order,
        'division_name', division.name,
        'scheduled_time', match_row.scheduled_time,
        'status', match_row.status,
        'local_team_id', local_team.id,
        'local_team_name', local_team.name,
        'local_logo_url', local_team.logo_url,
        'visitor_team_id', visitor_team.id,
        'visitor_team_name', visitor_team.name,
        'visitor_logo_url', visitor_team.logo_url,
        'local_score', match_row.local_score,
        'visitor_score', match_row.visitor_score,
        'elapsed_seconds', match_row.elapsed_seconds,
        'first_half_seconds', match_row.first_half_seconds,
        'started_at', match_row.started_at,
        'is_paused', match_row.is_paused,
        'period', match_row.period
      ) order by fixture.date_number, match_row.fixture_order nulls last, match_row.scheduled_time nulls last, local_team.name)
      from public.fixtures fixture
      join public.matches match_row on match_row.fixture_id = fixture.id
      left join public.tournament_divisions division on division.id = match_row.division_id
      left join public.teams local_team on local_team.id = match_row.local_team_id
      left join public.teams visitor_team on visitor_team.id = match_row.visitor_team_id
      where fixture.tournament_id = p_tournament_id
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

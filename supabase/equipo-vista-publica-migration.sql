-- AthlonX: vista pública de equipo.
-- Amplía get_public_team_profile con descripción, contacto, organización a la que pertenece
-- y torneos con fechas, disciplina, modalidad y tipo de participación.
-- Mantiene la misma firma (p_team_id uuid) y los campos existentes (labels, players, tournaments).
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.

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
        'description', t.description,
        'contact_email', t.contact_email,
        'contact_phone', t.contact_phone,
        'website_url', t.website_url,
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
        'profile_id', p.user_id,
        'full_name', p.full_name,
        'avatar_url', coalesce(pr.avatar_url, p.photo_url),
        'shirt_number', p.shirt_number,
        'position', p.position,
        'division_id', tp.division_id
      ) order by p.full_name)
      from public.team_players tp
      join public.players p on p.id = tp.player_id
      left join public.profiles pr on pr.id = p.user_id
      where tp.team_id = p_team_id
    ), '[]'::jsonb),
    'tournaments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id,
        'name', item.name,
        'slug', item.slug,
        'cover_url', item.cover_url,
        'season', item.season,
        'status', item.status,
        'location', item.location,
        'start_date', item.start_date,
        'end_date', item.end_date,
        'discipline_id', item.discipline_id,
        'discipline_name', item.discipline_name,
        'modality', item.modality,
        'participation_type', item.participation_type
      ) order by coalesce(item.start_date, item.created_at) desc, item.name)
      from (
        select
          t.id,
          t.name,
          t.slug,
          t.cover_url,
          t.season,
          t.status,
          t.location,
          t.start_date,
          t.end_date,
          t.created_at,
          t.discipline_id,
          d.name as discipline_name,
          case when sm.id is null then null else jsonb_build_object('id', sm.id, 'code', sm.code, 'name', sm.name) end as modality,
          case when t.organizer_team_id = p_team_id then 'created' else 'participated' end as participation_type
        from public.tournaments t
        left join public.disciplines d on d.id = t.discipline_id
        left join public.sport_modalities sm on sm.id = t.modality_id
        where t.organizer_team_id = p_team_id
          or exists (
            select 1 from public.tournament_teams tt
            where tt.tournament_id = t.id and tt.team_id = p_team_id
          )
      ) item
    ), '[]'::jsonb)
  );
$$;

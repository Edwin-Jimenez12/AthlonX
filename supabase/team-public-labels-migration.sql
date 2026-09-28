-- AthlonX: las etiquetas publicas representan responsables del equipo,
-- no atletas que forman parte de la plantilla.
-- Ejecutar despues de team-profile-editing-migration.sql.

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
        'discipline', case
          when discipline.id is null then null
          else jsonb_build_object(
            'id', discipline.id,
            'code', discipline.code,
            'name', discipline.name
          )
        end,
        'organization', case
          when organization.id is null then null
          else jsonb_build_object(
            'id', organization.id,
            'name', organization.name,
            'athlonx_code', organization.athlonx_code,
            'handle', organization.handle
          )
        end
      )
      from public.teams team
      left join public.disciplines discipline on discipline.id = team.discipline_id
      left join public.organizations organization on organization.id = team.organization_id
      where team.id = p_team_id
        and team.is_public = true
    ),
    'labels', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', profile.id,
          'full_name', profile.full_name,
          'avatar_url', profile.avatar_url,
          'username', profile.username,
          'role', membership.role,
          'role_label', membership.role_label
        )
        order by profile.full_name
      )
      from public.team_user_memberships membership
      join public.profiles profile on profile.id = membership.user_id
      where membership.team_id = p_team_id
        and membership.status = 'active'
        and membership.role in ('owner', 'directivo', 'entrenador', 'staff')
        and profile.is_searchable = true
    ), '[]'::jsonb),
    'players', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', player.id,
          'profile_id', player.profile_id,
          'full_name', player.full_name,
          'avatar_url', player.avatar_url,
          'shirt_number', player.shirt_number,
          'position', player.position
        )
        order by player.full_name
      )
      from (
        select
          player.id,
          null::uuid as profile_id,
          player.full_name,
          player.shirt_number,
          player.position,
          null::text as avatar_url
        from public.team_players team_player
        join public.players player on player.id = team_player.player_id
        where team_player.team_id = p_team_id

        union

        select
          profile.id,
          profile.id as profile_id,
          profile.full_name,
          null::integer as shirt_number,
          null::text as position,
          profile.avatar_url
        from public.team_user_memberships membership
        join public.profiles profile on profile.id = membership.user_id
        where membership.team_id = p_team_id
          and membership.status = 'active'
          and membership.role = 'atleta'
          and profile.is_searchable = true
      ) player
    ), '[]'::jsonb),
    'tournaments', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', tournament_item.id,
          'name', tournament_item.name,
          'slug', tournament_item.slug,
          'season', tournament_item.season,
          'status', tournament_item.status,
          'location', tournament_item.location
        )
        order by tournament_item.created_at desc
      )
      from (
        select distinct
          tournament.id,
          tournament.name,
          tournament.slug,
          tournament.season,
          tournament.status,
          tournament.location,
          tournament.created_at
        from public.tournament_teams tournament_team
        join public.tournaments tournament on tournament.id = tournament_team.tournament_id
        where tournament_team.team_id = p_team_id

        union

        select
          tournament.id,
          tournament.name,
          tournament.slug,
          tournament.season,
          tournament.status,
          tournament.location,
          tournament.created_at
        from public.tournaments tournament
        where tournament.organizer_team_id = p_team_id
      ) tournament_item
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_public_team_profile(uuid) from public;
grant execute on function public.get_public_team_profile(uuid) to authenticated;

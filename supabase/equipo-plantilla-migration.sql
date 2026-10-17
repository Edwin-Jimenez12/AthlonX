-- AthlonX: plantilla pública del equipo (filtros por división y género, fotos y perfil del jugador).
-- Amplía get_public_team_divisions con level, age_group y gender de cada división.
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.

create or replace function public.get_public_team_divisions(p_team_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
select coalesce(jsonb_agg(
  jsonb_build_object(
    'id', division.id,
    'name', division.name,
    'athlonx_code', division.athlonx_code,
    'level', division.level,
    'age_group', division.age_group,
    'gender', division.gender,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', roster.id,
        'profile_id', roster.profile_id,
        'full_name', roster.full_name,
        'avatar_url', roster.avatar_url,
        'shirt_number', roster.shirt_number,
        'position', roster.position,
        'division_id', roster.division_id,
        'division_name', division.name
      ) order by roster.full_name)
      from (
        select
          player.id,
          player.user_id as profile_id,
          player.full_name,
          coalesce(profile.avatar_url, player.photo_url) as avatar_url,
          player.shirt_number,
          player.position,
          team_player.division_id
        from public.team_players team_player
        join public.players player on player.id = team_player.player_id
        left join public.profiles profile on profile.id = player.user_id
        where team_player.team_id = p_team_id
          and team_player.division_id = division.id

        union

        select
          profile.id,
          profile.id as profile_id,
          profile.full_name,
          profile.avatar_url,
          null::integer as shirt_number,
          null::text as position,
          membership.division_id
        from public.team_user_memberships membership
        join public.profiles profile on profile.id = membership.user_id
        where membership.team_id = p_team_id
          and membership.division_id = division.id
          and membership.status = 'active'
          and membership.role = 'atleta'
          and profile.is_searchable = true
      ) roster
    ), '[]'::jsonb)
  ) order by division.name
), '[]'::jsonb)
from public.team_division_catalog division
join public.teams team on team.id = division.team_id
where division.team_id = p_team_id
  and team.is_public = true;
$$;

-- Vista pública: cualquier visitante (sin iniciar sesión) puede ver divisiones y plantilla de equipos públicos.
revoke all on function public.get_public_team_divisions(uuid) from public;
grant execute on function public.get_public_team_divisions(uuid) to anon, authenticated;

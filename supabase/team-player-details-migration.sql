-- Edición directa del dorsal y la posición de un jugador desde Mi equipo.
-- Ejecutar después de team-division-profiles-migration.sql y team-athlete-roster-sync-migration.sql.
-- Es idempotente: se puede volver a ejecutar sin efectos secundarios.
--
-- Mismos permisos que set_team_player_division: el creador del equipo, el propietario o un directivo.
-- El dorsal vive en public.players (no en team_players), igual que en el flujo de
-- player_number_change_requests; esta función solo deja editar jugadores que estén en la plantilla del equipo.

create or replace function public.set_team_player_details(
  p_team_id uuid,
  p_player_id uuid,
  p_shirt_number integer default null,
  p_position text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_division_id uuid;
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

  select roster.division_id
  into v_division_id
  from public.team_players roster
  where roster.team_id = p_team_id and roster.player_id = p_player_id;

  if not found then
    raise exception 'El jugador no pertenece a la plantilla de este equipo';
  end if;

  if p_shirt_number is not null and (p_shirt_number < 0 or p_shirt_number > 99) then
    raise exception 'El dorsal debe estar entre 0 y 99';
  end if;

  if p_shirt_number is not null and exists (
    select 1
    from public.team_players roster
    join public.players player on player.id = roster.player_id
    where roster.team_id = p_team_id
      and roster.player_id <> p_player_id
      and roster.division_id is not distinct from v_division_id
      and player.shirt_number = p_shirt_number
  ) then
    raise exception 'El dorsal % ya lo usa otro jugador de esta división', p_shirt_number;
  end if;

  update public.players
  set shirt_number = p_shirt_number,
      position = nullif(trim(coalesce(p_position, '')), '')
  where id = p_player_id;
end;
$$;

revoke all on function public.set_team_player_details(uuid, uuid, integer, text) from public;
grant execute on function public.set_team_player_details(uuid, uuid, integer, text) to authenticated;

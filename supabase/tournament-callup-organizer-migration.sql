-- Organizer-only controls for per-date callup shirt numbers and player 13.

create or replace function public.update_tournament_fixture_callup_player_number(
  p_callup_id uuid,
  p_player_id uuid,
  p_shirt_number integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  callup_row public.tournament_fixture_callups;
begin
  if not public.is_tournament_owner((select tournament_id from public.tournament_fixture_callups where id = p_callup_id)) then
    raise exception 'Solo el organizador puede editar el numero del jugador';
  end if;
  if p_shirt_number is not null and (p_shirt_number < 0 or p_shirt_number > 99) then
    raise exception 'El numero debe estar entre 0 y 99';
  end if;
  select * into callup_row from public.tournament_fixture_callups where id = p_callup_id;
  if not found then raise exception 'La convocatoria no existe'; end if;
  if not exists (select 1 from public.tournament_fixture_callup_players where callup_id = p_callup_id and player_id = p_player_id) then
    raise exception 'El jugador no pertenece a esta convocatoria';
  end if;
  update public.tournament_fixture_callup_players
  set shirt_number = p_shirt_number
  where callup_id = p_callup_id and player_id = p_player_id;
  insert into public.tournament_fixture_callup_audit (callup_id, action, performed_by, details)
  values (p_callup_id, 'edited', auth.uid(), jsonb_build_object('player_id', p_player_id, 'shirt_number', p_shirt_number));
  return true;
end;
$$;

create or replace function public.set_tournament_fixture_callup_non_participant_by_organizer(
  p_callup_id uuid,
  p_player_id uuid
)
returns public.tournament_fixture_callups
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.tournament_fixture_callups;
begin
  select * into result from public.tournament_fixture_callups where id = p_callup_id for update;
  if not found then raise exception 'La convocatoria no existe'; end if;
  if not public.is_tournament_owner(result.tournament_id) then raise exception 'Solo el organizador puede definir el jugador 13'; end if;
  if result.status = 'locked' and result.non_participant_player_id is not null then raise exception 'El jugador 13 ya fue confirmado y no se puede cambiar'; end if;
  if not exists (select 1 from public.tournament_fixture_callup_players where callup_id = p_callup_id and player_id = p_player_id) then raise exception 'El jugador no pertenece a esta convocatoria'; end if;
  update public.tournament_fixture_callup_players
  set state = case when player_id = p_player_id then 'no_participante' else 'convocado' end
  where callup_id = p_callup_id;
  update public.tournament_fixture_callups
  set status = 'locked', locked_at = now(), non_participant_player_id = p_player_id, updated_at = now()
  where id = p_callup_id
  returning * into result;
  insert into public.tournament_fixture_callup_audit (callup_id, action, performed_by, details)
  values (p_callup_id, 'marked_inactive', auth.uid(), jsonb_build_object('player_id', p_player_id));
  return result;
end;
$$;

revoke all on function public.update_tournament_fixture_callup_player_number(uuid, uuid, integer) from public;
revoke all on function public.set_tournament_fixture_callup_non_participant_by_organizer(uuid, uuid) from public;
grant execute on function public.update_tournament_fixture_callup_player_number(uuid, uuid, integer) to authenticated;
grant execute on function public.set_tournament_fixture_callup_non_participant_by_organizer(uuid, uuid) to authenticated;

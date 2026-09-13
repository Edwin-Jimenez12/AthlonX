-- Ejecuta este bloque para corregir lesiones, conmociones y sustituciones.
-- No modifica fixtures ni agrega is_locked.

alter table public.match_events
  drop constraint if exists match_events_event_type_check;

alter table public.match_events
  add constraint match_events_event_type_check
  check (
    event_type in (
      'try',
      'conversion',
      'penalty',
      'yellow_card',
      'red_card',
      'injured',
      'concussion'
    )
  );

create or replace function public.complete_fixture_substitution(
  p_match_id uuid,
  p_fixture_id uuid,
  p_team_id uuid,
  p_player_out_id uuid,
  p_player_in_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para realizar un cambio';
  end if;

  if not exists (
    select 1
    from public.matches m
    join public.fixtures f on f.id = m.fixture_id
    join public.tournaments t on t.id = f.tournament_id
    where m.id = p_match_id
      and f.id = p_fixture_id
      and t.created_by = auth.uid()
  ) then
    raise exception 'Solo el creador del torneo puede realizar cambios';
  end if;

  if not exists (
    select 1
    from public.fixture_players fp
    where fp.fixture_id = p_fixture_id
      and fp.team_id = p_team_id
      and fp.player_id = p_player_out_id
      and fp.is_substitute = false
  ) then
    raise exception 'El jugador seleccionado no está en cancha';
  end if;

  if not exists (
    select 1
    from public.fixture_players fp
    where fp.fixture_id = p_fixture_id
      and fp.team_id = p_team_id
      and fp.player_id = p_player_in_id
      and fp.is_substitute = true
  ) then
    raise exception 'El jugador seleccionado no es un suplente disponible';
  end if;

  update public.fixture_players
  set is_substitute = true
  where fixture_id = p_fixture_id
    and team_id = p_team_id
    and player_id = p_player_out_id;

  update public.fixture_players
  set is_substitute = false
  where fixture_id = p_fixture_id
    and team_id = p_team_id
    and player_id = p_player_in_id;

  insert into public.substitution_requests (
    match_id,
    team_id,
    player_out_id,
    player_in_id,
    status,
    requested_by,
    attended_by,
    completed_at
  )
  values (
    p_match_id,
    p_team_id,
    p_player_out_id,
    p_player_in_id,
    'completed',
    auth.uid(),
    auth.uid(),
    now()
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.complete_fixture_substitution(uuid, uuid, uuid, uuid, uuid) from public;
grant execute on function public.complete_fixture_substitution(uuid, uuid, uuid, uuid, uuid) to authenticated;

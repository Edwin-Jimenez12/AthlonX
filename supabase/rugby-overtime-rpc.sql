-- RPC functions for rugby 7 overtime (prórroga) management with muerte subida (golden point)

-- Start overtime for a tied match
create or replace function start_rugby_overtime(
  p_match_id uuid,
  p_overtime_minutes int
)
returns json as $$
declare
  v_match public.matches;
  v_error text;
begin
  -- Get current match state
  select * into v_match from public.matches where id = p_match_id;

  if v_match is null then
    raise exception 'Match not found';
  end if;

  -- Verify match is tied
  if v_match.local_score != v_match.visitor_score then
    raise exception 'Match is not tied';
  end if;

  -- Verify match is finished
  if v_match.status != 'finished' then
    raise exception 'Match is not finished';
  end if;

  -- Update match to overtime state
  update public.matches
  set
    match_phase = 'overtime',
    overtime_minutes = p_overtime_minutes,
    overtime_started_at = now(),
    status = 'live',
    is_paused = false
  where id = p_match_id;

  return json_build_object(
    'success', true,
    'message', 'Overtime started',
    'match_id', p_match_id
  );
end;
$$ language plpgsql security definer;

-- Finish overtime and determine winner (muerte subida: first to score wins)
create or replace function finish_rugby_overtime(
  p_match_id uuid,
  p_winner_team_id uuid
)
returns json as $$
declare
  v_match public.matches;
  v_local_won boolean;
begin
  -- Get current match state
  select * into v_match from public.matches where id = p_match_id;

  if v_match is null then
    raise exception 'Match not found';
  end if;

  -- Verify we're in overtime
  if v_match.match_phase != 'overtime' then
    raise exception 'Match is not in overtime';
  end if;

  -- Verify winner is one of the teams
  if p_winner_team_id != v_match.local_team_id and p_winner_team_id != v_match.visitor_team_id then
    raise exception 'Winner must be one of the match teams';
  end if;

  -- Verify there's actually a score difference now (muerte subida)
  if v_match.local_score = v_match.visitor_score then
    raise exception 'Teams are still tied; cannot finish overtime';
  end if;

  -- Determine if local or visitor won
  v_local_won := (p_winner_team_id = v_match.local_team_id);

  -- Verify the winner has the higher score
  if v_local_won and v_match.local_score <= v_match.visitor_score then
    raise exception 'Local team does not have the higher score';
  end if;

  if not v_local_won and v_match.visitor_score <= v_match.local_score then
    raise exception 'Visitor team does not have the higher score';
  end if;

  -- Update match to overtime finished state
  update public.matches
  set
    match_phase = 'overtime_finished',
    status = 'finished',
    is_paused = true
  where id = p_match_id;

  return json_build_object(
    'success', true,
    'message', 'Overtime finished',
    'match_id', p_match_id,
    'winner_team_id', p_winner_team_id
  );
end;
$$ language plpgsql security definer;

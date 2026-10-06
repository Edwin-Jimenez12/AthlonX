-- Rebuild match scores from the persisted scoring events.
-- Run this once after the score persistence fix to repair finished matches.
update public.matches as m
set
  local_score = coalesce(scores.local_score, 0),
  visitor_score = coalesce(scores.visitor_score, 0)
from (
  select
    match_id,
    coalesce(sum(points) filter (where team_id = local_team_id), 0) as local_score,
    coalesce(sum(points) filter (where team_id = visitor_team_id), 0) as visitor_score
  from public.match_events
  join public.matches source_match on source_match.id = match_events.match_id
  where event_type in ('try', 'conversion')
    and not is_corrected
  group by match_id
) as scores
where m.id = scores.match_id;

-- Matches without scoring events must also remain explicitly at 0-0.
update public.matches as m
set local_score = 0, visitor_score = 0
where not exists (
  select 1
  from public.match_events event
    where event.match_id = m.id
      and event.event_type in ('try', 'conversion')
      and not event.is_corrected
);

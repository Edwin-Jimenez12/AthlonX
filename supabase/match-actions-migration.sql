-- Ejecuta este bloque una sola vez para habilitar las acciones del partido.
-- No modifica fixtures ni agrega columnas.

grant select, insert, update, delete on public.matches to authenticated;
grant select, insert, update, delete on public.match_events to authenticated;
grant select, insert, update, delete on public.substitution_requests to authenticated;

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

drop policy if exists "Tournament owners can update matches" on public.matches;
create policy "Tournament owners can update matches" on public.matches
for update to authenticated
using (
  exists (
    select 1
    from public.fixtures f
    join public.tournaments t on t.id = f.tournament_id
    where f.id = matches.fixture_id
      and t.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.fixtures f
    join public.tournaments t on t.id = f.tournament_id
    where f.id = matches.fixture_id
      and t.created_by = auth.uid()
  )
);

drop policy if exists "Tournament owners can create match events" on public.match_events;
create policy "Tournament owners can create match events" on public.match_events
for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.matches m
    join public.fixtures f on f.id = m.fixture_id
    join public.tournaments t on t.id = f.tournament_id
    where m.id = match_events.match_id
      and t.created_by = auth.uid()
  )
);

drop policy if exists "Tournament owners can create substitution requests" on public.substitution_requests;
create policy "Tournament owners can create substitution requests" on public.substitution_requests
for insert to authenticated
with check (
  requested_by = auth.uid()
  and exists (
    select 1
    from public.matches m
    join public.fixtures f on f.id = m.fixture_id
    join public.tournaments t on t.id = f.tournament_id
    where m.id = substitution_requests.match_id
      and t.created_by = auth.uid()
  )
);

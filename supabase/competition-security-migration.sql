-- Consolida permisos de torneos, partidos, eventos e incidencias.

grant select, insert, update, delete on public.tournaments to authenticated;
grant select, insert, update, delete on public.tournament_divisions to authenticated;
grant select, insert, update, delete on public.tournament_teams to authenticated;
grant select, insert, update, delete on public.fixtures to authenticated;
grant select, insert, update, delete on public.matches to authenticated;
grant select, insert, update, delete on public.match_events to authenticated;
grant select, insert, update, delete on public.substitution_requests to authenticated;

drop policy if exists "Tournament owners can update tournaments" on public.tournaments;
create policy "Tournament owners can update tournaments"
on public.tournaments for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "Tournament owners can delete tournaments" on public.tournaments;
create policy "Tournament owners can delete tournaments"
on public.tournaments for delete to authenticated
using (created_by = auth.uid());

drop policy if exists "Tournament owners can update match events" on public.match_events;
create policy "Tournament owners can update match events"
on public.match_events for update to authenticated
using (
  exists (
    select 1
    from public.matches m
    join public.fixtures f on f.id = m.fixture_id
    join public.tournaments t on t.id = f.tournament_id
    where m.id = match_events.match_id
      and t.created_by = auth.uid()
  )
)
with check (created_by = auth.uid());

drop policy if exists "Tournament owners can delete match events" on public.match_events;
create policy "Tournament owners can delete match events"
on public.match_events for delete to authenticated
using (
  exists (
    select 1
    from public.matches m
    join public.fixtures f on f.id = m.fixture_id
    join public.tournaments t on t.id = f.tournament_id
    where m.id = match_events.match_id
      and t.created_by = auth.uid()
  )
);

drop policy if exists "Tournament owners can update substitution requests" on public.substitution_requests;
create policy "Tournament owners can update substitution requests"
on public.substitution_requests for update to authenticated
using (
  exists (
    select 1
    from public.matches m
    join public.fixtures f on f.id = m.fixture_id
    join public.tournaments t on t.id = f.tournament_id
    where m.id = substitution_requests.match_id
      and t.created_by = auth.uid()
  )
)
with check (requested_by = auth.uid());

drop policy if exists "Tournament owners can delete substitution requests" on public.substitution_requests;
create policy "Tournament owners can delete substitution requests"
on public.substitution_requests for delete to authenticated
using (
  exists (
    select 1
    from public.matches m
    join public.fixtures f on f.id = m.fixture_id
    join public.tournaments t on t.id = f.tournament_id
    where m.id = substitution_requests.match_id
      and t.created_by = auth.uid()
  )
);

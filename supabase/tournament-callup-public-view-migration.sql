-- AthlonX: authenticated viewers can read submitted/editing callup lists
-- for public tournament pages without gaining any mutation permissions.

drop policy if exists "Users can view fixture callups" on public.tournament_fixture_callups;
create policy "Users can view fixture callups"
  on public.tournament_fixture_callups for select to authenticated
  using (
    public.can_manage_tournament_callup(tournament_id, team_id)
    or exists (
      select 1
      from public.team_user_memberships membership
      where membership.team_id = tournament_fixture_callups.team_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
    )
    or exists (
      select 1
      from public.tournaments tournament
      where tournament.id = tournament_fixture_callups.tournament_id
        and tournament.status in ('published', 'in_progress', 'finished')
    )
  );

drop policy if exists "Users can view fixture callup players" on public.tournament_fixture_callup_players;
create policy "Users can view fixture callup players"
  on public.tournament_fixture_callup_players for select to authenticated
  using (
    exists (
      select 1
      from public.tournament_fixture_callups callup
      where callup.id = tournament_fixture_callup_players.callup_id
        and (
          public.can_manage_tournament_callup(callup.tournament_id, callup.team_id)
          or exists (
            select 1
            from public.team_user_memberships membership
            where membership.team_id = callup.team_id
              and membership.user_id = auth.uid()
              and membership.status = 'active'
          )
          or exists (
            select 1
            from public.tournaments tournament
            where tournament.id = callup.tournament_id
              and tournament.status in ('published', 'in_progress', 'finished')
          )
        )
    )
  );

grant select on public.tournament_fixture_callups, public.tournament_fixture_callup_players to authenticated;

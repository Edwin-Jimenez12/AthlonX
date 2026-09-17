-- AthlonX: administracion de divisiones y equipos dentro del torneo.

drop policy if exists "Tournament owners can delete tournament teams" on public.tournament_teams;
drop policy if exists "Tournament owners can update tournament teams" on public.tournament_teams;
drop policy if exists "Tournament owners can delete divisions" on public.tournament_divisions;
drop policy if exists "Tournament owners can update divisions" on public.tournament_divisions;

create policy "Tournament owners can delete tournament teams"
  on public.tournament_teams for delete to authenticated
  using (exists (
    select 1 from public.tournaments t
    where t.id = tournament_teams.tournament_id and t.created_by = auth.uid()
  ));

create policy "Tournament owners can update tournament teams"
  on public.tournament_teams for update to authenticated
  using (exists (
    select 1 from public.tournaments t
    where t.id = tournament_teams.tournament_id and t.created_by = auth.uid()
  ));

create policy "Tournament owners can delete divisions"
  on public.tournament_divisions for delete to authenticated
  using (exists (
    select 1 from public.tournaments t
    where t.id = tournament_divisions.tournament_id and t.created_by = auth.uid()
  ));

create policy "Tournament owners can update divisions"
  on public.tournament_divisions for update to authenticated
  using (exists (
    select 1 from public.tournaments t
    where t.id = tournament_divisions.tournament_id and t.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.tournaments t
    where t.id = tournament_divisions.tournament_id and t.created_by = auth.uid()
  ));

grant delete, update on public.tournament_teams to authenticated;
grant delete, update on public.tournament_divisions to authenticated;

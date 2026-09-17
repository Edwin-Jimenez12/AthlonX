-- AthlonX: equipos y jugadores institucionales.

alter table public.teams
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists discipline_id uuid references public.disciplines(id) on delete restrict,
  add column if not exists contact_email text,
  add column if not exists contact_phone text;

alter table public.players
  add column if not exists position text,
  add column if not exists birth_date date,
  add column if not exists photo_url text;

update public.teams team
set organization_id = tournament.organization_id,
    discipline_id = tournament.discipline_id
from public.tournament_teams link
join public.tournaments tournament on tournament.id = link.tournament_id
where link.team_id = team.id
  and team.organization_id is null;

drop policy if exists "Organization managers can update teams" on public.teams;
drop policy if exists "Organization managers can delete teams" on public.teams;
drop policy if exists "Organization managers can create teams" on public.teams;

create policy "Organization managers can create teams"
  on public.teams for insert to authenticated
  with check (public.is_organization_manager(organization_id));

create policy "Organization managers can update teams"
  on public.teams for update to authenticated
  using (public.is_organization_manager(organization_id))
  with check (public.is_organization_manager(organization_id));

create policy "Organization managers can delete teams"
  on public.teams for delete to authenticated
  using (public.is_organization_manager(organization_id));

drop policy if exists "Organization managers can create players" on public.players;
drop policy if exists "Organization managers can update players" on public.players;
drop policy if exists "Organization managers can delete players" on public.players;

create policy "Organization managers can create players"
  on public.players for insert to authenticated
  with check (created_by = auth.uid());

create policy "Organization managers can update players"
  on public.players for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Organization managers can delete players"
  on public.players for delete to authenticated
  using (created_by = auth.uid());

grant select, insert, update, delete on public.teams to authenticated;
grant select, insert, update, delete on public.players to authenticated;

drop policy if exists "Organization managers can delete team players" on public.team_players;
create policy "Organization managers can delete team players"
  on public.team_players for delete to authenticated
  using (exists (
    select 1 from public.teams t
    where t.id = team_players.team_id
      and public.is_organization_manager(t.organization_id)
  ));

grant delete on public.team_players to authenticated;

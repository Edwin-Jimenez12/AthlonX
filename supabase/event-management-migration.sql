-- AthlonX: eventos institucionales e invitaciones de equipos a torneos.
-- Ejecutar despues de identity-affiliations-migration.sql.

alter table public.tournaments
  add column if not exists organizer_team_id uuid references public.teams(id) on delete set null;

drop policy if exists "Directivos can create tournaments" on public.tournaments;
create policy "Authorized accounts can create tournaments"
  on public.tournaments for insert to authenticated
  with check (
    public.has_user_role('directivo')
    or exists (
      select 1
      from public.team_user_memberships membership
      where membership.team_id = tournaments.organizer_team_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'directivo')
        and membership.status = 'active'
    )
  );

drop policy if exists "Directivos can create divisions" on public.tournament_divisions;
create policy "Tournament creators can create divisions"
  on public.tournament_divisions for insert to authenticated
  with check (
    public.has_user_role('directivo')
    or exists (
      select 1 from public.tournaments tournament
      where tournament.id = tournament_divisions.tournament_id
        and tournament.created_by = auth.uid()
    )
  );

drop policy if exists "Organization managers can update tournaments" on public.tournaments;
create policy "Tournament creators can update tournaments"
  on public.tournaments for update to authenticated
  using (
    created_by = auth.uid()
    or public.is_organization_manager(organization_id)
  )
  with check (
    created_by = auth.uid()
    or public.is_organization_manager(organization_id)
  );

create table if not exists public.tournament_team_invitations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  division_id uuid references public.tournament_divisions(id) on delete set null,
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  message text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (tournament_id, team_id)
);

alter table public.tournament_team_invitations enable row level security;

drop policy if exists "Authenticated users can view tournament team invitations" on public.tournament_team_invitations;
create policy "Authenticated users can view tournament team invitations"
  on public.tournament_team_invitations for select to authenticated
  using (
    invited_by = auth.uid()
    or exists (
      select 1
      from public.team_user_memberships membership
      where membership.team_id = tournament_team_invitations.team_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
    )
  );

drop policy if exists "Organization managers can create tournament invitations" on public.tournament_team_invitations;
create policy "Organization managers can create tournament invitations"
  on public.tournament_team_invitations for insert to authenticated
  with check (
    invited_by = auth.uid()
    and exists (
      select 1
      from public.tournaments tournament
      where tournament.id = tournament_team_invitations.tournament_id
        and (
          public.is_organization_manager(tournament.organization_id)
          or exists (
            select 1
            from public.team_user_memberships membership
            where membership.team_id = tournament.organizer_team_id
              and membership.user_id = auth.uid()
              and membership.role in ('owner', 'directivo')
              and membership.status = 'active'
          )
        )
    )
  );

drop policy if exists "Team managers can respond to tournament invitations" on public.tournament_team_invitations;
create policy "Team managers can respond to tournament invitations"
  on public.tournament_team_invitations for update to authenticated
  using (exists (
    select 1
    from public.team_user_memberships membership
    where membership.team_id = tournament_team_invitations.team_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'directivo')
      and membership.status = 'active'
  ))
  with check (status in ('accepted', 'declined'));

create or replace function public.notify_tournament_team_invitation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_notifications (recipient_user_id, title, body)
  select membership.user_id,
    'Nueva invitacion a torneo',
    'Tu equipo ha recibido una invitacion para participar en un torneo.'
  from public.team_user_memberships membership
  where membership.team_id = new.team_id
    and membership.role in ('owner', 'directivo', 'entrenador')
    and membership.status = 'active'
    and membership.user_id is not null;
  return new;
end;
$$;

drop trigger if exists on_tournament_team_invitation_created on public.tournament_team_invitations;
create trigger on_tournament_team_invitation_created
  after insert on public.tournament_team_invitations
  for each row execute procedure public.notify_tournament_team_invitation();

grant select, insert, update on public.tournament_team_invitations to authenticated;
revoke all on function public.notify_tournament_team_invitation() from public;

-- Flujo de invitaciones de equipos para torneos normales y torneos rapidos.
-- Ejecutar despues de event-management-migration.sql.

alter table public.user_notifications
  add column if not exists tournament_team_invitation_id uuid references public.tournament_team_invitations(id) on delete cascade;

create index if not exists user_notifications_tournament_invitation_idx
  on public.user_notifications(tournament_team_invitation_id)
  where tournament_team_invitation_id is not null;

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
    or exists (
      select 1
      from public.tournaments tournament
      where tournament.id = tournament_team_invitations.tournament_id
        and (
          tournament.created_by = auth.uid()
          or public.is_organization_manager(tournament.organization_id)
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

drop policy if exists "Organization managers can create tournament invitations" on public.tournament_team_invitations;
create policy "Organization managers can create tournament invitations"
  on public.tournament_team_invitations for insert to authenticated
  with check (
    invited_by = auth.uid()
    and exists (
      select 1
      from public.tournaments tournament
      where tournament.id = tournament_team_invitations.tournament_id
        and tournament.status = 'published'
        and (
          public.is_organization_manager(tournament.organization_id)
          or tournament.created_by = auth.uid()
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

create or replace function public.notify_tournament_team_invitation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_notifications (recipient_user_id, tournament_team_invitation_id, title, body)
  select membership.user_id,
    new.id,
    'Nueva invitacion a torneo',
    'Tu equipo ha recibido una invitacion para participar en un torneo. Puedes inspeccionarlo, aceptar o rechazar la invitacion.'
  from public.team_user_memberships membership
  where membership.team_id = new.team_id
    and membership.role in ('owner', 'directivo', 'entrenador')
    and membership.status = 'active'
    and membership.user_id is not null;
  return new;
end;
$$;

create or replace function public.respond_tournament_team_invitation(
  p_invitation_id uuid,
  p_decision text
)
returns table (tournament_id uuid, invitation_status text)
language plpgsql
security definer set search_path = public
as $$
declare
  invitation public.tournament_team_invitations%rowtype;
  tournament_status text;
begin
  if p_decision not in ('accepted', 'declined') then
    raise exception 'La respuesta de la invitacion no es valida';
  end if;

  select * into invitation
  from public.tournament_team_invitations
  where id = p_invitation_id
  for update;

  if invitation.id is null then
    raise exception 'La invitacion no existe';
  end if;

  if not exists (
    select 1
    from public.team_user_memberships membership
    where membership.team_id = invitation.team_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'directivo', 'entrenador')
      and membership.status = 'active'
  ) then
    raise exception 'No tienes permisos para responder esta invitacion';
  end if;

  if invitation.status <> 'pending' then
    raise exception 'Esta invitacion ya fue respondida';
  end if;

  select status into tournament_status
  from public.tournaments
  where id = invitation.tournament_id;

  if p_decision = 'accepted' then
    if tournament_status not in ('published', 'in_progress') then
      raise exception 'El torneo ya no acepta equipos';
    end if;

    insert into public.tournament_teams (tournament_id, division_id, team_id)
    values (invitation.tournament_id, invitation.division_id, invitation.team_id)
    on conflict (tournament_id, division_id, team_id) do nothing;
  end if;

  update public.tournament_team_invitations
  set status = p_decision,
      responded_at = now()
  where id = invitation.id;

  update public.user_notifications
  set read_at = now()
  where tournament_team_invitation_id = invitation.id
    and recipient_user_id = auth.uid();

  return query select invitation.tournament_id, p_decision;
end;
$$;

grant select, insert, update on public.tournament_team_invitations to authenticated;
grant execute on function public.respond_tournament_team_invitation(uuid, text) to authenticated;
revoke all on function public.notify_tournament_team_invitation() from public;
revoke all on function public.respond_tournament_team_invitation(uuid, text) from public;

-- AthlonX: repara invitaciones y aceptacion de equipos en torneos con varias divisiones.
-- Ejecutar despues de event-management-migration.sql y
-- tournament-team-invitation-flow-migration.sql.

alter table public.tournament_team_invitations
  drop constraint if exists tournament_team_invitations_tournament_id_team_id_key;

drop index if exists public.tournament_team_invitations_tournament_division_team_key;

create unique index tournament_team_invitations_tournament_division_team_key
  on public.tournament_team_invitations (tournament_id, division_id, team_id)
  where status = 'pending';

create index if not exists tournament_team_invitations_tournament_division_idx
  on public.tournament_team_invitations (tournament_id, division_id, status);

create or replace function public.respond_tournament_team_invitation(
  p_invitation_id uuid,
  p_decision text
)
returns table (tournament_id uuid, invitation_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.tournament_team_invitations%rowtype;
  v_tournament_status text;
begin
  if p_decision not in ('accepted', 'declined') then
    raise exception 'La respuesta de la invitacion no es valida';
  end if;

  select invitation_row.*
  into invitation
  from public.tournament_team_invitations as invitation_row
  where invitation_row.id = p_invitation_id
  for update;

  if invitation.id is null then
    raise exception 'La invitacion no existe';
  end if;

  if not exists (
    select 1
    from public.team_user_memberships as membership
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

  select tournament_row.status
  into v_tournament_status
  from public.tournaments as tournament_row
  where tournament_row.id = invitation.tournament_id;

  if p_decision = 'accepted' then
    if v_tournament_status not in ('published', 'in_progress') then
      raise exception 'El torneo ya no acepta equipos';
    end if;

    if invitation.division_id is null or not exists (
      select 1
      from public.tournament_divisions as division_row
      where division_row.id = invitation.division_id
        and division_row.tournament_id = invitation.tournament_id
    ) then
      raise exception 'La invitacion no tiene una division valida';
    end if;

    insert into public.tournament_teams (tournament_id, division_id, team_id)
    values (invitation.tournament_id, invitation.division_id, invitation.team_id)
    on conflict do nothing;
  end if;

  update public.tournament_team_invitations as invitation_row
  set status = p_decision,
      responded_at = now()
  where invitation_row.id = invitation.id;

  update public.user_notifications as notification_row
  set read_at = now()
  where notification_row.tournament_team_invitation_id = invitation.id
    and notification_row.recipient_user_id = auth.uid();

  tournament_id := invitation.tournament_id;
  invitation_status := p_decision;
  return next;
end;
$$;

revoke all on function public.respond_tournament_team_invitation(uuid, text) from public;
grant execute on function public.respond_tournament_team_invitation(uuid, text) to authenticated;

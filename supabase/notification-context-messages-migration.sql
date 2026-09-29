-- Mensajes contextuales para las notificaciones de invitaciones y actividades.
-- Ejecutar despues de las migraciones de afiliaciones, calendario y torneos.

alter table public.user_notifications
  add column if not exists tournament_team_invitation_id uuid references public.tournament_team_invitations(id) on delete cascade;

create index if not exists user_notifications_tournament_invitation_idx
  on public.user_notifications(tournament_team_invitation_id)
  where tournament_team_invitation_id is not null;

create or replace function public.notify_affiliation_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_name text;
  role_name text;
begin
  select coalesce(
    (select team.name from public.teams team where team.id = new.source_team_id),
    (select organization.name from public.organizations organization where organization.id = new.source_organization_id),
    'Una entidad deportiva'
  )
  into source_name;

  role_name := coalesce(nullif(trim(new.role_label), ''), initcap(replace(coalesce(new.role, 'participacion'), '_', ' ')));

  if new.target_user_id is not null then
    insert into public.user_notifications (recipient_user_id, affiliation_request_id, title, body)
    values (
      new.target_user_id,
      new.id,
      case when new.source_team_id is not null then 'Invitacion a equipo' else 'Invitacion a organizacion' end,
      source_name || case
        when new.source_team_id is not null then ' te invita a formar parte de su equipo como ' || role_name || '.'
        else ' te invita a formar parte de su organizacion como ' || role_name || '.'
      end || ' Revisa la invitacion para aceptarla o rechazarla.'
    );
  elsif new.target_team_id is not null then
    insert into public.user_notifications (recipient_user_id, affiliation_request_id, title, body)
    select distinct membership.user_id,
      new.id,
      'Invitacion para tu equipo',
      source_name || ' invita a tu equipo a formar parte de su red. Revisa la invitacion para aceptarla o rechazarla.'
    from public.team_user_memberships membership
    where membership.team_id = new.target_team_id
      and membership.role in ('owner', 'directivo')
      and membership.status = 'active'
      and membership.user_id is not null;
  else
    insert into public.user_notifications (recipient_user_id, affiliation_request_id, title, body)
    select membership.user_id,
      new.id,
      'Nueva relacion institucional',
      source_name || ' propone una relacion de ' || replace(coalesce(new.relationship_type, 'colaboracion'), '_', ' ') || ' con tu organizacion.'
    from public.organization_members membership
    where membership.organization_id = new.target_organization_id
      and membership.role in ('owner', 'directivo')
      and membership.status = 'active'
      and membership.user_id is not null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_affiliation_request_created on public.affiliation_requests;
create trigger on_affiliation_request_created
  after insert on public.affiliation_requests
  for each row execute procedure public.notify_affiliation_request();

create or replace function public.notify_tournament_team_invitation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament_name text;
  team_name text;
  division_name text;
begin
  select tournament.name, team.name, division.name
  into tournament_name, team_name, division_name
  from public.tournaments tournament
  join public.teams team on team.id = new.team_id
  left join public.tournament_divisions division on division.id = new.division_id
  where tournament.id = new.tournament_id;

  insert into public.user_notifications (
    recipient_user_id, tournament_team_invitation_id, title, body
  )
  select membership.user_id,
    new.id,
    'Invitacion a torneo',
    'Tu equipo ' || coalesce(team_name, 'ha sido seleccionado') ||
      ' ha recibido una invitacion para participar en el torneo "' || coalesce(tournament_name, 'Nuevo torneo') || '"' ||
      case when division_name is not null then ' en la division ' || division_name else '' end ||
      '. Puedes inspeccionarlo, aceptar o rechazar la invitacion.'
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

create or replace function public.notify_team_calendar_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  team_name text;
  notification_title text;
  notification_body text;
begin
  select name into team_name from public.teams where id = new.team_id;
  if tg_op = 'INSERT' then
    notification_title := 'Nueva actividad del equipo';
    notification_body := coalesce(team_name, 'Tu equipo') || ' agrego "' || new.title || '" a su calendario.';
  elsif old.title is distinct from new.title
     or old.description is distinct from new.description
     or old.location is distinct from new.location
     or old.starts_at is distinct from new.starts_at
     or old.ends_at is distinct from new.ends_at
     or old.event_type is distinct from new.event_type then
    notification_title := 'Actividad del equipo actualizada';
    notification_body := coalesce(team_name, 'Tu equipo') || ' actualizo "' || new.title || '" en su calendario.';
  else
    return new;
  end if;

  insert into public.user_notifications (recipient_user_id, title, body)
  select membership.user_id, notification_title, notification_body
  from public.team_user_memberships membership
  where membership.team_id = new.team_id
    and membership.status = 'active'
    and membership.user_id is not null
    and membership.user_id <> auth.uid();
  return new;
end;
$$;

drop trigger if exists on_team_calendar_event_changed on public.team_calendar_events;
create trigger on_team_calendar_event_changed
  after insert or update on public.team_calendar_events
  for each row execute procedure public.notify_team_calendar_event();

create or replace function public.notify_organization_calendar_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_name text;
  notification_title text;
  notification_body text;
begin
  select name into organization_name from public.organizations where id = new.organization_id;
  if tg_op = 'INSERT' then
    notification_title := 'Nueva actividad de la organizacion';
    notification_body := coalesce(organization_name, 'Tu organizacion') || ' agrego "' || new.title || '" a su calendario.';
  elsif old.title is distinct from new.title
     or old.description is distinct from new.description
     or old.location is distinct from new.location
     or old.starts_at is distinct from new.starts_at
     or old.ends_at is distinct from new.ends_at
     or old.event_type is distinct from new.event_type then
    notification_title := 'Actividad de la organizacion actualizada';
    notification_body := coalesce(organization_name, 'Tu organizacion') || ' actualizo "' || new.title || '" en su calendario.';
  else
    return new;
  end if;

  insert into public.user_notifications (recipient_user_id, title, body)
  select membership.user_id, notification_title, notification_body
  from public.organization_members membership
  where membership.organization_id = new.organization_id
    and membership.status = 'active'
    and membership.user_id is not null
    and membership.user_id <> auth.uid();
  return new;
end;
$$;

drop trigger if exists on_organization_calendar_event_changed on public.organization_calendar_events;
create trigger on_organization_calendar_event_changed
  after insert or update on public.organization_calendar_events
  for each row execute procedure public.notify_organization_calendar_event();

revoke all on function public.notify_affiliation_request() from public;
revoke all on function public.notify_tournament_team_invitation() from public;
revoke all on function public.notify_team_calendar_event() from public;
revoke all on function public.notify_organization_calendar_event() from public;

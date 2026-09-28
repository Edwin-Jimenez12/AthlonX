-- AthlonX: calendario compartido de actividades por equipo.
-- Ejecutar despues de identity-affiliations-migration.sql y coach-team-access-migration.sql.

create table if not exists public.team_calendar_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  event_type text not null default 'other'
    check (event_type in ('training', 'match', 'game', 'meeting', 'other')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists team_calendar_events_team_starts_idx
  on public.team_calendar_events (team_id, starts_at);

alter table public.team_calendar_events enable row level security;

drop policy if exists "Team members can view calendar events" on public.team_calendar_events;
create policy "Team members can view calendar events"
  on public.team_calendar_events for select to authenticated
  using (
    exists (
      select 1
      from public.team_user_memberships membership
      where membership.team_id = team_calendar_events.team_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
    )
  );

drop policy if exists "Team managers can create calendar events" on public.team_calendar_events;
create policy "Team managers can create calendar events"
  on public.team_calendar_events for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.team_user_memberships membership
      where membership.team_id = team_calendar_events.team_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'directivo', 'entrenador', 'staff')
        and membership.status = 'active'
    )
  );

drop policy if exists "Team managers can update calendar events" on public.team_calendar_events;
create policy "Team managers can update calendar events"
  on public.team_calendar_events for update to authenticated
  using (
    exists (
      select 1
      from public.team_user_memberships membership
      where membership.team_id = team_calendar_events.team_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'directivo', 'entrenador', 'staff')
        and membership.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.team_user_memberships membership
      where membership.team_id = team_calendar_events.team_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'directivo', 'entrenador', 'staff')
        and membership.status = 'active'
    )
  );

drop policy if exists "Team managers can delete calendar events" on public.team_calendar_events;
create policy "Team managers can delete calendar events"
  on public.team_calendar_events for delete to authenticated
  using (
    exists (
      select 1
      from public.team_user_memberships membership
      where membership.team_id = team_calendar_events.team_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'directivo', 'entrenador', 'staff')
        and membership.status = 'active'
    )
  );

grant select, insert, update, delete on public.team_calendar_events to authenticated;

create or replace function public.set_team_calendar_event_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_team_calendar_event_updated_at on public.team_calendar_events;
create trigger set_team_calendar_event_updated_at
before update on public.team_calendar_events
for each row execute procedure public.set_team_calendar_event_updated_at();

create or replace function public.notify_team_calendar_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  notification_title text;
  notification_body text;
begin
  if tg_op = 'INSERT' then
    notification_title := 'Nueva actividad del equipo';
    notification_body := 'Se agrego "' || new.title || '" al calendario del equipo.';
  elsif old.title is distinct from new.title
     or old.description is distinct from new.description
     or old.location is distinct from new.location
     or old.starts_at is distinct from new.starts_at
     or old.ends_at is distinct from new.ends_at
     or old.event_type is distinct from new.event_type then
    notification_title := 'Actividad del equipo actualizada';
    notification_body := 'Se actualizo "' || new.title || '" en el calendario del equipo.';
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

revoke all on function public.set_team_calendar_event_updated_at() from public;
revoke all on function public.notify_team_calendar_event() from public;

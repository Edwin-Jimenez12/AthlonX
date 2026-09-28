-- Calendario global de personas y actividades de organizaciones.
-- Ejecutar despues de team-calendar-migration.sql y de las migraciones de organizaciones.

create table if not exists public.organization_calendar_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  discipline_id uuid references public.disciplines(id) on delete set null,
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

create index if not exists organization_calendar_events_org_starts_idx
  on public.organization_calendar_events (organization_id, starts_at);

alter table public.organization_calendar_events enable row level security;

drop policy if exists "Organization members can view calendar events" on public.organization_calendar_events;
create policy "Organization members can view calendar events"
  on public.organization_calendar_events for select to authenticated
  using (
    exists (
      select 1
      from public.organization_members membership
      where membership.organization_id = organization_calendar_events.organization_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
    )
  );

drop policy if exists "Organization managers can create calendar events" on public.organization_calendar_events;
create policy "Organization managers can create calendar events"
  on public.organization_calendar_events for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_organization_manager(organization_id)
  );

drop policy if exists "Organization managers can update calendar events" on public.organization_calendar_events;
create policy "Organization managers can update calendar events"
  on public.organization_calendar_events for update to authenticated
  using (public.is_organization_manager(organization_id))
  with check (public.is_organization_manager(organization_id));

drop policy if exists "Organization managers can delete calendar events" on public.organization_calendar_events;
create policy "Organization managers can delete calendar events"
  on public.organization_calendar_events for delete to authenticated
  using (public.is_organization_manager(organization_id));

grant select, insert, update, delete on public.organization_calendar_events to authenticated;

create or replace function public.set_organization_calendar_event_updated_at()
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

drop trigger if exists set_organization_calendar_event_updated_at on public.organization_calendar_events;
create trigger set_organization_calendar_event_updated_at
before update on public.organization_calendar_events
for each row execute procedure public.set_organization_calendar_event_updated_at();

create or replace function public.notify_organization_calendar_event()
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
    notification_title := 'Nueva actividad de la organización';
    notification_body := 'Se agregó "' || new.title || '" al calendario de la organización.';
  elsif old.title is distinct from new.title
     or old.description is distinct from new.description
     or old.location is distinct from new.location
     or old.starts_at is distinct from new.starts_at
     or old.ends_at is distinct from new.ends_at
     or old.event_type is distinct from new.event_type then
    notification_title := 'Actividad de la organización actualizada';
    notification_body := 'Se actualizó "' || new.title || '" en el calendario de la organización.';
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

revoke all on function public.set_organization_calendar_event_updated_at() from public;
revoke all on function public.notify_organization_calendar_event() from public;

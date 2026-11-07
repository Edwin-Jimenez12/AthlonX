-- Avisos de actividades del calendario: al crear y al cambiar algo, con el detalle de lo que cambió.
-- En equipo, el aviso llega solo a quienes va dirigido el evento (todo el equipo, la división, el cuerpo técnico o las personas elegidas).
-- Idempotente: se puede volver a ejecutar.

-- Fecha y hora en Panamá, en español: "12 nov" y "6:00 p. m.".
create or replace function public.calendar_fmt_day(p_ts timestamptz)
returns text
language sql
stable
as $$
  select extract(day from p_ts at time zone 'America/Panama')::int || ' ' ||
    (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from p_ts at time zone 'America/Panama')::int];
$$;

create or replace function public.calendar_fmt_time(p_ts timestamptz)
returns text
language sql
stable
as $$
  select ltrim(replace(replace(to_char(p_ts at time zone 'America/Panama', 'HH12:MI AM'), 'AM', 'a. m.'), 'PM', 'p. m.'), '0');
$$;

create or replace function public.calendar_type_label(p_type text)
returns text
language sql
stable
as $$
  select case p_type when 'training' then 'Entrenamiento' when 'match' then 'Partido' when 'game' then 'Partido'
    when 'meeting' then 'Reunión' when 'personal' then 'Personal' else 'Otro' end;
$$;

create or replace function public.calendar_repeat_label(p_rule text)
returns text
language sql
stable
as $$
  select case p_rule when 'weekly' then 'cada semana' when 'monthly' then 'cada mes' else 'no se repite' end;
$$;

-- Resumen de cambios entre dos versiones de un evento. Devuelve null si no cambió nada que interese a quien lo recibe.
create or replace function public.calendar_change_summary(
  o_title text, n_title text, o_start timestamptz, n_start timestamptz, o_end timestamptz, n_end timestamptz,
  o_location text, n_location text, o_description text, n_description text, o_type text, n_type text,
  o_repeat text, n_repeat text, o_until timestamptz, n_until timestamptz)
returns text
language plpgsql
stable
as $$
declare
  parts text[] := '{}';
begin
  if o_title is distinct from n_title then parts := parts || ('título: "' || coalesce(o_title, '') || '" → "' || coalesce(n_title, '') || '"'); end if;
  if public.calendar_fmt_day(o_start) is distinct from public.calendar_fmt_day(n_start) then
    parts := parts || ('fecha: ' || public.calendar_fmt_day(o_start) || ' → ' || public.calendar_fmt_day(n_start));
  end if;
  if public.calendar_fmt_time(o_start) is distinct from public.calendar_fmt_time(n_start)
     or public.calendar_fmt_time(o_end) is distinct from public.calendar_fmt_time(n_end) then
    parts := parts || ('hora: ' || public.calendar_fmt_time(o_start) || '–' || public.calendar_fmt_time(o_end)
      || ' → ' || public.calendar_fmt_time(n_start) || '–' || public.calendar_fmt_time(n_end));
  end if;
  if coalesce(o_location, '') is distinct from coalesce(n_location, '') then
    parts := parts || case when coalesce(n_location, '') = '' then 'se quitó el lugar'
      else 'lugar: ' || coalesce(nullif(o_location, ''), 'sin lugar') || ' → ' || n_location end;
  end if;
  if coalesce(o_type, '') is distinct from coalesce(n_type, '') then
    parts := parts || ('tipo: ' || public.calendar_type_label(o_type) || ' → ' || public.calendar_type_label(n_type));
  end if;
  if coalesce(o_repeat, 'none') is distinct from coalesce(n_repeat, 'none') then
    parts := parts || ('repetición: ' || public.calendar_repeat_label(o_repeat) || ' → ' || public.calendar_repeat_label(n_repeat));
  elsif o_until is distinct from n_until and coalesce(n_repeat, 'none') <> 'none' then
    parts := parts || ('se repite hasta: ' || coalesce(public.calendar_fmt_day(o_until), 'sin fin') || ' → ' || coalesce(public.calendar_fmt_day(n_until), 'sin fin'));
  end if;
  if coalesce(o_description, '') is distinct from coalesce(n_description, '') then parts := parts || 'cambió la descripción'::text; end if;
  if cardinality(parts) = 0 then return null; end if;
  return array_to_string(parts, '; ');
end;
$$;

-- Destinatarios de un evento de equipo según a quién va dirigido. Incluye a jugadores vinculados a la plantilla.
create or replace function public.calendar_team_event_recipients(p_team uuid, p_audience text, p_division uuid, p_users uuid[])
returns table (user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with plantilla as (
    select distinct pl.user_id, tp.division_id
    from public.team_players tp join public.players pl on pl.id = tp.player_id
    where tp.team_id = p_team and pl.user_id is not null
  ),
  miembros as (
    select m.user_id, m.role from public.team_user_memberships m
    where m.team_id = p_team and m.status = 'active' and m.user_id is not null
  )
  select distinct x.user_id from (
    select user_id from miembros where coalesce(p_audience, 'team') = 'team'
    union all select user_id from plantilla where coalesce(p_audience, 'team') = 'team'
    union all select user_id from plantilla where p_audience = 'division' and division_id = p_division
    union all select user_id from miembros where p_audience = 'staff' and role in ('owner', 'directivo', 'entrenador', 'staff')
    union all select u from unnest(coalesce(p_users, '{}'::uuid[])) as u where p_audience = 'person'
  ) x;
$$;

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
  changes text;
begin
  select name into team_name from public.teams where id = new.team_id;
  if tg_op = 'INSERT' then
    notification_title := 'Nueva actividad del equipo';
    notification_body := coalesce(team_name, 'Tu equipo') || ' agregó "' || new.title || '" a su calendario: '
      || public.calendar_fmt_day(new.starts_at) || ', ' || public.calendar_fmt_time(new.starts_at) || '.';
  else
    changes := public.calendar_change_summary(old.title, new.title, old.starts_at, new.starts_at, old.ends_at, new.ends_at,
      old.location, new.location, old.description, new.description, old.event_type::text, new.event_type::text,
      old.repeat_rule, new.repeat_rule, old.repeat_until, new.repeat_until);
    if changes is null then return new; end if;
    notification_title := 'Actividad del equipo modificada';
    notification_body := coalesce(team_name, 'Tu equipo') || ' cambió "' || new.title || '": ' || changes || '.';
  end if;

  insert into public.user_notifications (recipient_user_id, title, body)
  select r.user_id, notification_title, notification_body
  from public.calendar_team_event_recipients(new.team_id, new.audience, new.division_id, new.audience_user_ids) r
  where r.user_id is distinct from auth.uid();
  return new;
end;
$$;

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
  changes text;
begin
  select name into organization_name from public.organizations where id = new.organization_id;
  if tg_op = 'INSERT' then
    notification_title := 'Nueva actividad de la organización';
    notification_body := coalesce(organization_name, 'Tu organización') || ' agregó "' || new.title || '" a su calendario: '
      || public.calendar_fmt_day(new.starts_at) || ', ' || public.calendar_fmt_time(new.starts_at) || '.';
  else
    changes := public.calendar_change_summary(old.title, new.title, old.starts_at, new.starts_at, old.ends_at, new.ends_at,
      old.location, new.location, old.description, new.description, old.event_type::text, new.event_type::text,
      old.repeat_rule, new.repeat_rule, old.repeat_until, new.repeat_until);
    if changes is null then return new; end if;
    notification_title := 'Actividad de la organización modificada';
    notification_body := coalesce(organization_name, 'Tu organización') || ' cambió "' || new.title || '": ' || changes || '.';
  end if;

  insert into public.user_notifications (recipient_user_id, title, body)
  select membership.user_id, notification_title, notification_body
  from public.organization_members membership
  where membership.organization_id = new.organization_id
    and membership.status = 'active'
    and membership.user_id is not null
    and membership.user_id is distinct from auth.uid();
  return new;
end;
$$;

-- Avisos al crear y al cambiar (una sola vez por cambio; un evento repetido es una sola fila).
drop trigger if exists on_team_calendar_event_created on public.team_calendar_events;
drop trigger if exists on_team_calendar_event_changed on public.team_calendar_events;
create trigger on_team_calendar_event_changed
  after insert or update on public.team_calendar_events
  for each row execute procedure public.notify_team_calendar_event();

drop trigger if exists on_organization_calendar_event_created on public.organization_calendar_events;
drop trigger if exists on_organization_calendar_event_changed on public.organization_calendar_events;
create trigger on_organization_calendar_event_changed
  after insert or update on public.organization_calendar_events
  for each row execute procedure public.notify_organization_calendar_event();

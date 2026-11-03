-- AthlonX: calendario del atleta (cuenta personal, perfil atleta).
-- Actividades personales (Libre: 5 al mes; Pro/Élite: ilimitadas, con repetición y recordatorios personalizados),
-- asistencia a eventos de equipo y de organización, y recordatorios automáticos (4 horas antes por defecto).
-- Los cambios en eventos de equipo y organización ya notifican a sus miembros (triggers existentes).
-- Idempotente.

create table if not exists public.personal_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text,
  location text,
  event_type text not null default 'personal' check (event_type in ('personal', 'training', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  repeat_rule text not null default 'none' check (repeat_rule in ('none', 'weekly', 'monthly')),
  repeat_until timestamptz,
  reminder_minutes integer[] not null default '{240}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at),
  check (repeat_until is null or repeat_until >= starts_at)
);

create index if not exists personal_activities_user_created on public.personal_activities (user_id, created_at);

create table if not exists public.calendar_attendance (
  source text not null check (source in ('team', 'organization')),
  event_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  response text not null check (response in ('voy', 'tal_vez', 'no_voy')),
  updated_at timestamptz not null default now(),
  primary key (source, event_id, user_id)
);

create table if not exists public.calendar_reminders_sent (
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('team', 'organization', 'personal')),
  event_id uuid not null,
  starts_at timestamptz not null,
  minutes_before integer not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, source, event_id, starts_at, minutes_before)
);

alter table public.personal_activities enable row level security;
alter table public.calendar_attendance enable row level security;
alter table public.calendar_reminders_sent enable row level security;
-- Sin políticas: todo se lee y escribe mediante funciones con validación.

-- Plan vigente de la cuenta persona del usuario actual (Libre si no tiene plan pagado).
create or replace function public.calendar_current_plan()
returns table (code text, personal_limit integer, unlimited boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.code, p.personal_activity_monthly_limit, p.personal_activity_monthly_limit is null
  from public.plans p
  where p.code = coalesce(
    (select ap.plan_code from public.account_plans ap
     where ap.account_type = 'persona' and ap.account_id = auth.uid()
       and (ap.ends_at is null or ap.ends_at > now())),
    'libre');
$$;

-- Actividades personales creadas en el mes calendario actual (para mostrar "3 de 5 este mes").
create or replace function public.calendar_personal_usage()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.personal_activities
  where user_id = auth.uid() and created_at >= date_trunc('month', now());
$$;

-- Eventos del atleta en un rango: equipos, organizaciones y actividades personales (con repetición expandida).
create or replace function public.calendar_my_feed(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para ver tu calendario.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_at), '[]'::jsonb) into v_result
  from (
    select 'team'::text as source, e.id, e.team_id as owner_id, t.name as owner_name, e.title, e.description,
      e.location, e.event_type::text as event_type, e.starts_at, e.ends_at, e.all_day, 0 as occurrence,
      'none'::text as repeat_rule, a.response as my_response
    from public.team_calendar_events e
    join public.teams t on t.id = e.team_id
    left join public.calendar_attendance a on a.source = 'team' and a.event_id = e.id and a.user_id = auth.uid()
    where e.starts_at < p_to and e.ends_at > p_from
      and exists (select 1 from public.team_user_memberships m
                  where m.team_id = e.team_id and m.user_id = auth.uid() and m.status = 'active')
    union all
    select 'organization', e.id, e.organization_id, o.name, e.title, e.description,
      e.location, e.event_type::text, e.starts_at, e.ends_at, e.all_day, 0,
      'none', a.response
    from public.organization_calendar_events e
    join public.organizations o on o.id = e.organization_id
    left join public.calendar_attendance a on a.source = 'organization' and a.event_id = e.id and a.user_id = auth.uid()
    where e.starts_at < p_to and e.ends_at > p_from
      and exists (select 1 from public.organization_members m
                  where m.organization_id = e.organization_id and m.user_id = auth.uid() and m.status = 'active')
    union all
    select 'personal', pa.id, pa.user_id, null::text, pa.title, pa.description, pa.location, pa.event_type,
      pa.starts_at + occ.shift, pa.ends_at + occ.shift, pa.all_day, occ.n, pa.repeat_rule, null::text
    from public.personal_activities pa
    cross join lateral (
      select n, case pa.repeat_rule
        when 'weekly' then make_interval(weeks => n)
        when 'monthly' then make_interval(months => n)
        else make_interval() end as shift
      from generate_series(0, 300) as n
      where pa.repeat_rule <> 'none' or n = 0
    ) occ
    where pa.user_id = auth.uid()
      and (pa.repeat_until is null or pa.starts_at + occ.shift <= pa.repeat_until)
      and pa.starts_at + occ.shift < p_to and pa.ends_at + occ.shift > p_from
  ) x;

  return v_result;
end;
$$;

-- Crear o editar una actividad personal, con las reglas del plan.
create or replace function public.calendar_save_personal_activity(
  p_id uuid, p_title text, p_description text, p_location text, p_event_type text,
  p_starts timestamptz, p_ends timestamptz, p_all_day boolean,
  p_repeat text, p_repeat_until timestamptz, p_reminders integer[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan record;
  v_allowed integer[];
  v_reminders integer[];
  v_id uuid := p_id;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para guardar actividades.';
  end if;
  select * into v_plan from public.calendar_current_plan();

  if char_length(trim(coalesce(p_title, ''))) = 0 then
    raise exception 'La actividad necesita un título.';
  end if;
  if p_ends < p_starts then
    raise exception 'La hora de fin debe ser posterior al inicio.';
  end if;
  if coalesce(p_repeat, 'none') <> 'none' and not v_plan.unlimited then
    raise exception 'Repetir actividades es parte del plan Pro.';
  end if;

  -- Libre: recordatorio fijo de 4 horas. Pro y Élite: varios recordatorios entre estas opciones.
  v_allowed := case when v_plan.unlimited then array[15, 30, 60, 240, 1440] else array[240] end;
  v_reminders := case when p_reminders is null or cardinality(p_reminders) = 0 then array[240] else p_reminders end;
  if not (v_reminders <@ v_allowed) or cardinality(v_reminders) > 5 then
    raise exception 'Elige recordatorios disponibles en tu plan.';
  end if;

  if p_id is null then
    if not v_plan.unlimited then
      select count(*) into v_count from public.personal_activities
      where user_id = auth.uid() and created_at >= date_trunc('month', now());
      if v_count >= v_plan.personal_limit then
        raise exception 'Tu plan Libre permite % actividades personales al mes. Mejora a Pro para crear más.', v_plan.personal_limit;
      end if;
    end if;
    insert into public.personal_activities (user_id, title, description, location, event_type, starts_at, ends_at,
      all_day, repeat_rule, repeat_until, reminder_minutes)
    values (auth.uid(), trim(p_title), nullif(trim(coalesce(p_description, '')), ''), nullif(trim(coalesce(p_location, '')), ''),
      coalesce(p_event_type, 'personal'), p_starts, p_ends, coalesce(p_all_day, false),
      coalesce(p_repeat, 'none'), case when coalesce(p_repeat, 'none') = 'none' then null else p_repeat_until end, v_reminders)
    returning id into v_id;
  else
    update public.personal_activities set
      title = trim(p_title),
      description = nullif(trim(coalesce(p_description, '')), ''),
      location = nullif(trim(coalesce(p_location, '')), ''),
      event_type = coalesce(p_event_type, 'personal'),
      starts_at = p_starts,
      ends_at = p_ends,
      all_day = coalesce(p_all_day, false),
      repeat_rule = coalesce(p_repeat, 'none'),
      repeat_until = case when coalesce(p_repeat, 'none') = 'none' then null else p_repeat_until end,
      reminder_minutes = v_reminders,
      updated_at = now()
    where id = p_id and user_id = auth.uid();
    if not found then
      raise exception 'La actividad no existe o no es tuya.';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.calendar_delete_personal_activity(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.personal_activities where id = p_id and user_id = auth.uid();
  if not found then
    raise exception 'La actividad no existe o no es tuya.';
  end if;
end;
$$;

-- Respuesta del atleta a un evento de su equipo u organización.
create or replace function public.calendar_set_attendance(p_source text, p_event_id uuid, p_response text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  if p_source = 'team' then
    v_allowed := exists (select 1 from public.team_calendar_events e
      join public.team_user_memberships m on m.team_id = e.team_id
      where e.id = p_event_id and m.user_id = auth.uid() and m.status = 'active');
  elsif p_source = 'organization' then
    v_allowed := exists (select 1 from public.organization_calendar_events e
      join public.organization_members m on m.organization_id = e.organization_id
      where e.id = p_event_id and m.user_id = auth.uid() and m.status = 'active');
  else
    raise exception 'Origen de evento no válido.';
  end if;
  if not coalesce(v_allowed, false) then
    raise exception 'No perteneces al calendario de este evento.';
  end if;

  insert into public.calendar_attendance (source, event_id, user_id, response)
  values (p_source, p_event_id, auth.uid(), p_response)
  on conflict (source, event_id, user_id) do update set response = excluded.response, updated_at = now();
end;
$$;

-- Asistencia de un evento de equipo, para el cuerpo técnico (entrenador, staff, directivo y dueño).
create or replace function public.calendar_team_attendance(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_team uuid;
begin
  select e.team_id into v_team from public.team_calendar_events e where e.id = p_event_id;
  if v_team is null then
    raise exception 'El evento no existe.';
  end if;
  if not exists (select 1 from public.team_user_memberships m
    where m.team_id = v_team and m.user_id = auth.uid() and m.status = 'active'
      and m.role in ('owner', 'directivo', 'entrenador', 'staff')) then
    raise exception 'Solo el cuerpo técnico del equipo ve la asistencia.';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object('user_id', a.user_id, 'name', coalesce(p.full_name, 'Jugador'), 'response', a.response)
      order by p.full_name)
    from public.calendar_attendance a
    left join public.profiles p on p.id = a.user_id
    where a.source = 'team' and a.event_id = p_event_id
  ), '[]'::jsonb);
end;
$$;

-- Recordatorios automáticos. Corre cada 15 minutos con pg_cron.
-- Eventos de equipo y organización: 4 horas antes para todos los miembros.
-- Actividades personales: los minutos elegidos (incluye repeticiones).
create or replace function public.calendar_send_due_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
  total integer := 0;
begin
  with new_rows as (
    insert into public.calendar_reminders_sent (user_id, source, event_id, starts_at, minutes_before)
    select m.user_id, 'team', e.id, e.starts_at, 240
    from public.team_calendar_events e
    join public.team_user_memberships m on m.team_id = e.team_id and m.status = 'active' and m.user_id is not null
    where e.starts_at > now() and e.starts_at <= now() + interval '240 minutes'
    on conflict do nothing
    returning user_id, event_id, starts_at
  )
  insert into public.user_notifications (recipient_user_id, title, body)
  select nr.user_id, 'Recordatorio de actividad',
    '"' || e.title || '" empieza a las ' || to_char(nr.starts_at at time zone 'America/Panama', 'HH24:MI') || '.'
  from new_rows nr join public.team_calendar_events e on e.id = nr.event_id;
  get diagnostics n = row_count;
  total := total + n;

  with new_rows as (
    insert into public.calendar_reminders_sent (user_id, source, event_id, starts_at, minutes_before)
    select m.user_id, 'organization', e.id, e.starts_at, 240
    from public.organization_calendar_events e
    join public.organization_members m on m.organization_id = e.organization_id and m.status = 'active' and m.user_id is not null
    where e.starts_at > now() and e.starts_at <= now() + interval '240 minutes'
    on conflict do nothing
    returning user_id, event_id, starts_at
  )
  insert into public.user_notifications (recipient_user_id, title, body)
  select nr.user_id, 'Recordatorio de actividad',
    '"' || e.title || '" empieza a las ' || to_char(nr.starts_at at time zone 'America/Panama', 'HH24:MI') || '.'
  from new_rows nr join public.organization_calendar_events e on e.id = nr.event_id;
  get diagnostics n = row_count;
  total := total + n;

  with due as (
    select pa.user_id, pa.id as event_id, pa.title, pa.starts_at + occ.shift as occurrence_start, r.minutes
    from public.personal_activities pa
    cross join lateral unnest(pa.reminder_minutes) as r(minutes)
    cross join lateral (
      select case pa.repeat_rule
        when 'weekly' then make_interval(weeks => k)
        when 'monthly' then make_interval(months => k)
        else make_interval() end as shift
      from generate_series(0, 300) as k
      where pa.repeat_rule <> 'none' or k = 0
    ) occ
    where (pa.repeat_until is null or pa.starts_at + occ.shift <= pa.repeat_until)
      and pa.starts_at + occ.shift > now()
      and pa.starts_at + occ.shift <= now() + make_interval(mins => r.minutes)
  ), new_rows as (
    insert into public.calendar_reminders_sent (user_id, source, event_id, starts_at, minutes_before)
    select d.user_id, 'personal', d.event_id, d.occurrence_start, d.minutes from due d
    on conflict do nothing
    returning user_id, event_id, starts_at
  )
  insert into public.user_notifications (recipient_user_id, title, body)
  select nr.user_id, 'Recordatorio de actividad',
    '"' || pa.title || '" empieza a las ' || to_char(nr.starts_at at time zone 'America/Panama', 'HH24:MI') || '.'
  from new_rows nr join public.personal_activities pa on pa.id = nr.event_id;
  get diagnostics n = row_count;
  total := total + n;

  return total;
end;
$$;

revoke all on function public.calendar_current_plan() from public, anon;
revoke all on function public.calendar_personal_usage() from public, anon;
revoke all on function public.calendar_my_feed(timestamptz, timestamptz) from public, anon;
revoke all on function public.calendar_save_personal_activity(uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz, integer[]) from public, anon;
revoke all on function public.calendar_delete_personal_activity(uuid) from public, anon;
revoke all on function public.calendar_set_attendance(text, uuid, text) from public, anon;
revoke all on function public.calendar_team_attendance(uuid) from public, anon;
revoke all on function public.calendar_send_due_reminders() from public, anon, authenticated;
grant execute on function public.calendar_current_plan() to authenticated;
grant execute on function public.calendar_personal_usage() to authenticated;
grant execute on function public.calendar_my_feed(timestamptz, timestamptz) to authenticated;
grant execute on function public.calendar_save_personal_activity(uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz, integer[]) to authenticated;
grant execute on function public.calendar_delete_personal_activity(uuid) to authenticated;
grant execute on function public.calendar_set_attendance(text, uuid, text) to authenticated;
grant execute on function public.calendar_team_attendance(uuid) to authenticated;

create extension if not exists pg_cron;
select cron.schedule('athlonx-calendar-reminders', '*/15 * * * *', 'select public.calendar_send_due_reminders()');

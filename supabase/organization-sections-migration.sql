-- AthlonX: funciones de las secciones de la cuenta de organización según su plan (diseño de Figma, REDISEÑO).
-- 1) Repetir y recordatorios en eventos de organización (Pro y Élite).
-- 2) Calendario: repeticiones en el feed y eventos de los equipos de la organización.
-- 3) Recordatorios de eventos de organización con sus minutos y repeticiones.
-- 4) Listados de equipos y torneos, crear equipo propio, asistencia resumida por equipo.
-- 5) Patrocinios (Élite).
-- Idempotente. Requiere organization-plans-migration.sql y organization-calendar-feed-migration.sql.

-- 1) Repetir y recordatorios
alter table public.organization_calendar_events
  add column if not exists repeat_rule text not null default 'none',
  add column if not exists repeat_until timestamptz,
  add column if not exists reminder_minutes integer[] not null default '{240}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'organization_calendar_events_repeat_check') then
    alter table public.organization_calendar_events
      add constraint organization_calendar_events_repeat_check check (repeat_rule in ('none', 'weekly', 'monthly'));
  end if;
end;
$$;

create or replace function public.enforce_org_event_features()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  if new.repeat_rule <> 'none' and not public.platform_org_feature(new.organization_id, 'repetir_eventos') then
    raise exception 'Repetir eventos es parte del plan Pro de organización.';
  end if;
  if coalesce(array_length(new.reminder_minutes, 1), 0) = 0 then
    new.reminder_minutes := array[240];
  end if;
  v_limit := public.platform_org_limit(new.organization_id, 'recordatorios_evento');
  if v_limit is not null and v_limit <= 1 then
    new.reminder_minutes := array[240];
  elsif v_limit is not null and array_length(new.reminder_minutes, 1) > v_limit then
    raise exception 'El plan % de la organización permite hasta % recordatorios por evento.',
      (public.platform_org_plan(new.organization_id)).name, v_limit;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_org_event_features on public.organization_calendar_events;
create trigger enforce_org_event_features before insert or update on public.organization_calendar_events
for each row execute function public.enforce_org_event_features();

-- 2) Feed del calendario de la organización
create or replace function public.calendar_org_feed(p_org uuid, p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_manager boolean := public.is_organization_manager(p_org);
  v_teams boolean := public.platform_org_feature(p_org, 'vista_equipos');
  v_result jsonb;
begin
  if not (v_manager or exists (select 1 from public.organization_members m
                               where m.organization_id = p_org and m.user_id = auth.uid() and m.status = 'active')) then
    raise exception 'No puedes ver el calendario de esta organización.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_at), '[]'::jsonb) into v_result
  from (
    select 'organization'::text as source, e.id, e.organization_id as owner_id, o.name as owner_name, e.title, e.description,
      e.location, e.event_type, e.starts_at + occ.shift as starts_at, e.ends_at + occ.shift as ends_at, e.all_day,
      occ.n as occurrence, e.repeat_rule, null::text as my_response, v_manager as can_edit,
      e.repeat_until, e.reminder_minutes
    from public.organization_calendar_events e
    join public.organizations o on o.id = e.organization_id
    cross join lateral (
      select n, case e.repeat_rule
        when 'weekly' then make_interval(weeks => n)
        when 'monthly' then make_interval(months => n)
        else make_interval() end as shift
      from generate_series(0, 300) as n
      where e.repeat_rule <> 'none' or n = 0
    ) occ
    where e.organization_id = p_org
      and (e.repeat_until is null or e.starts_at + occ.shift <= e.repeat_until)
      and e.starts_at + occ.shift < p_to and e.ends_at + occ.shift > p_from
    union all
    select 'team', e.id, e.team_id, t.name, e.title, e.description,
      e.location, e.event_type::text, e.starts_at, e.ends_at, e.all_day, 0, 'none', null::text, v_manager,
      null::timestamptz, null::integer[]
    from public.team_calendar_events e
    join public.teams t on t.id = e.team_id
    where v_teams and t.organization_id = p_org and t.temporary_tournament_id is null
      and e.starts_at < p_to and e.ends_at > p_from
  ) x;

  return v_result;
end;
$$;

revoke all on function public.calendar_org_feed(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.calendar_org_feed(uuid, timestamptz, timestamptz) to authenticated;

-- Eventos de los equipos creados desde la organización (Calendario: Titanes RC, Guerreros, …).
create or replace function public.calendar_org_save_team_event(
  p_org uuid, p_id uuid, p_team uuid, p_title text, p_description text, p_location text,
  p_event_type text, p_starts timestamptz, p_ends timestamptz)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := p_id;
begin
  if not public.is_organization_manager(p_org) then
    raise exception 'Solo quien gestiona la organización crea eventos para sus equipos.';
  end if;
  if not exists (select 1 from public.teams t where t.id = p_team and t.organization_id = p_org and t.temporary_tournament_id is null) then
    raise exception 'El equipo no pertenece a la organización.';
  end if;
  if char_length(trim(coalesce(p_title, ''))) = 0 then
    raise exception 'El evento necesita un título.';
  end if;
  if p_ends <= p_starts then
    raise exception 'La hora de fin debe ser posterior al inicio.';
  end if;
  if p_event_type not in ('training', 'match', 'game', 'meeting', 'other') then
    raise exception 'Tipo de evento no válido.';
  end if;
  if p_id is null then
    insert into public.team_calendar_events (team_id, created_by, event_type, title, description, location, starts_at, ends_at, all_day)
    values (p_team, auth.uid(), p_event_type, trim(p_title), nullif(trim(coalesce(p_description, '')), ''),
      nullif(trim(coalesce(p_location, '')), ''), p_starts, p_ends, false)
    returning id into v_id;
  else
    update public.team_calendar_events set
      event_type = p_event_type, title = trim(p_title),
      description = nullif(trim(coalesce(p_description, '')), ''),
      location = nullif(trim(coalesce(p_location, '')), ''),
      starts_at = p_starts, ends_at = p_ends
    where id = p_id and team_id = p_team;
  end if;
  return v_id;
end;
$$;

create or replace function public.calendar_org_delete_team_event(p_org uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_organization_manager(p_org) then
    raise exception 'Solo quien gestiona la organización elimina eventos de sus equipos.';
  end if;
  delete from public.team_calendar_events e
  using public.teams t
  where e.id = p_id and t.id = e.team_id and t.organization_id = p_org;
end;
$$;

revoke all on function public.calendar_org_save_team_event(uuid, uuid, uuid, text, text, text, text, timestamptz, timestamptz) from public, anon;
revoke all on function public.calendar_org_delete_team_event(uuid, uuid) from public, anon;
grant execute on function public.calendar_org_save_team_event(uuid, uuid, uuid, text, text, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.calendar_org_delete_team_event(uuid, uuid) to authenticated;

-- 3) Recordatorios: los eventos de organización usan sus minutos y repeticiones.
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

  with due as (
    select m.user_id, e.id as event_id, e.starts_at + occ.shift as occurrence_start, r.minutes
    from public.organization_calendar_events e
    join public.organization_members m on m.organization_id = e.organization_id and m.status = 'active' and m.user_id is not null
    cross join lateral unnest(e.reminder_minutes) as r(minutes)
    cross join lateral (
      select case e.repeat_rule
        when 'weekly' then make_interval(weeks => k)
        when 'monthly' then make_interval(months => k)
        else make_interval() end as shift
      from generate_series(0, 300) as k
      where e.repeat_rule <> 'none' or k = 0
    ) occ
    where (e.repeat_until is null or e.starts_at + occ.shift <= e.repeat_until)
      and e.starts_at + occ.shift > now()
      and e.starts_at + occ.shift <= now() + make_interval(mins => r.minutes)
  ), new_rows as (
    insert into public.calendar_reminders_sent (user_id, source, event_id, starts_at, minutes_before)
    select d.user_id, 'organization', d.event_id, d.occurrence_start, d.minutes from due d
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
    select pa.user_id, pa.id as event_id, pa.starts_at + occ.shift as occurrence_start, r.minutes
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

-- 4) Listados de la organización
create or replace function public.org_can_view(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_organization_manager(p_org)
      or exists (select 1 from public.organization_members m
                 where m.organization_id = p_org and m.user_id = auth.uid() and m.status = 'active');
$$;

-- Equipos propios, afiliados directamente y de organizaciones vinculadas (subordinadas activas).
create or replace function public.platform_org_teams(p_org uuid)
returns table (team_id uuid, team_name text, discipline text, athlonx_code text, owner_name text, team_group text, via_organization text, members integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.org_can_view(p_org) then
    raise exception 'No puedes ver los equipos de esta organización.';
  end if;
  return query
  select t.id, t.name, d.name, t.athlonx_code,
    coalesce(nullif(trim(p.full_name), ''), 'Sin dueño'),
    case when t.organization_id = p_org and public.org_team_is_own(p_org, t.created_by) then 'propio'
         when t.organization_id = p_org then 'afiliado' else 'vinculado' end,
    case when t.organization_id = p_org then null else o.name end,
    (select count(*)::integer from public.team_user_memberships m where m.team_id = t.id and m.status = 'active')
  from public.teams t
  left join public.disciplines d on d.id = t.discipline_id
  left join public.profiles p on p.id = t.created_by
  left join public.organizations o on o.id = t.organization_id
  where t.temporary_tournament_id is null
    and (t.organization_id = p_org
         or t.organization_id in (select r.subordinate_organization_id from public.organization_relationships r
                                  where r.superior_organization_id = p_org and r.status = 'active'))
  order by 6, 2;
end;
$$;

create or replace function public.platform_org_tournaments(p_org uuid)
returns table (tournament_id uuid, tournament_name text, discipline text, is_quick boolean, status text, teams integer, competition_format text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.org_can_view(p_org) then
    raise exception 'No puedes ver los torneos de esta organización.';
  end if;
  return query
  select x.id, x.name, coalesce(sm.name, d.name), x.is_quick, x.status,
    (select count(*)::integer from public.tournament_teams tt where tt.tournament_id = x.id),
    coalesce(cs.competition_format, bs.competition_format)
  from public.tournaments x
  left join public.disciplines d on d.id = x.discipline_id
  left join public.sport_modalities sm on sm.id = x.modality_id
  left join public.tournament_competition_settings cs on cs.tournament_id = x.id
  left join public.tournament_basketball_settings bs on bs.tournament_id = x.id
  where x.organization_id = p_org
  order by (x.status = 'finished'), x.created_at desc;
end;
$$;

-- Crear un equipo propio de la organización. El límite del plan lo aplica enforce_org_team_limit.
create or replace function public.org_create_team(p_org uuid, p_name text, p_discipline uuid, p_city text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team uuid;
begin
  if not public.is_organization_manager(p_org) then
    raise exception 'Solo quien gestiona la organización crea equipos propios.';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'El equipo necesita un nombre.';
  end if;
  if not exists (select 1 from public.disciplines where id = p_discipline) then
    raise exception 'Elige la disciplina del equipo.';
  end if;
  insert into public.teams (name, city, created_by, discipline_id, organization_id, is_official)
  values (trim(p_name), nullif(trim(coalesce(p_city, '')), ''), auth.uid(), p_discipline, p_org, true)
  returning id into v_team;
  insert into public.team_user_memberships (team_id, user_id, role, role_label, status)
  values (v_team, auth.uid(), 'owner', 'Propietario', 'active');
  return v_team;
end;
$$;

-- Asistencia resumida por equipo (Pro y Élite): porcentaje de "Voy" en los últimos 90 días.
create or replace function public.org_team_attendance_summary(p_org uuid)
returns table (team_id uuid, team_name text, confirmed integer, responses integer, percent integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_organization_manager(p_org) then
    raise exception 'Solo quien gestiona la organización ve la asistencia de sus equipos.';
  end if;
  if not public.platform_org_feature(p_org, 'asistencia_equipos') then
    raise exception 'La asistencia resumida por equipo es parte del plan Pro de organización.';
  end if;
  return query
  select t.id, t.name,
    count(a.event_id) filter (where a.response = 'voy')::integer,
    count(a.event_id)::integer,
    case when count(a.event_id) = 0 then 0
         else round(100.0 * count(a.event_id) filter (where a.response = 'voy') / count(a.event_id))::integer end
  from public.teams t
  left join public.team_calendar_events e on e.team_id = t.id and e.starts_at > now() - interval '90 days' and e.starts_at <= now()
  left join public.calendar_attendance a on a.source = 'team' and a.event_id = e.id
  where t.organization_id = p_org and t.temporary_tournament_id is null
  group by t.id, t.name
  order by t.name;
end;
$$;

revoke all on function public.org_can_view(uuid) from public, anon;
revoke all on function public.platform_org_teams(uuid) from public, anon;
revoke all on function public.platform_org_tournaments(uuid) from public, anon;
revoke all on function public.org_create_team(uuid, text, uuid, text) from public, anon;
revoke all on function public.org_team_attendance_summary(uuid) from public, anon;
grant execute on function public.org_can_view(uuid) to authenticated;
grant execute on function public.platform_org_teams(uuid) to authenticated;
grant execute on function public.platform_org_tournaments(uuid) to authenticated;
grant execute on function public.org_create_team(uuid, text, uuid, text) to authenticated;
grant execute on function public.org_team_attendance_summary(uuid) to authenticated;

-- 5) Patrocinios (Élite): logotipos de patrocinadores de la organización.
create table if not exists public.organization_sponsors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  logo_url text,
  website_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.organization_sponsors enable row level security;
grant select on public.organization_sponsors to anon, authenticated;
grant insert, update, delete on public.organization_sponsors to authenticated;

drop policy if exists "Sponsors are public" on public.organization_sponsors;
create policy "Sponsors are public" on public.organization_sponsors for select using (true);
drop policy if exists "Elite managers manage sponsors" on public.organization_sponsors;
create policy "Elite managers manage sponsors" on public.organization_sponsors for all
  using (public.is_organization_manager(organization_id))
  with check (public.is_organization_manager(organization_id) and public.platform_org_feature(organization_id, 'patrocinios'));

-- AthlonX: calendario de gestión por perfil (coach, staff, directivo) sobre la base del calendario del atleta.
-- Reglas confirmadas:
--   * Coach (entrenador) y directivo: crean y editan eventos de su equipo; ven la asistencia por jugador.
--   * Staff: crea eventos y cambia lugar, hora y datos logísticos solo en eventos donde tenga permiso
--     (creados por él o con permiso otorgado). No ve la asistencia por jugador.
--   * Reportes de asistencia y vista de todos los equipos de la organización: solo plan Pro o Élite.
-- Idempotente.

create table if not exists public.calendar_event_grants (
  event_id uuid not null references public.team_calendar_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  can_edit boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.calendar_event_grants enable row level security;

-- Rol de mayor jerarquía del usuario actual en un equipo.
create or replace function public.calendar_team_role(p_team uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role from public.team_user_memberships m
  where m.team_id = p_team and m.user_id = auth.uid() and m.status = 'active'
  order by case m.role when 'owner' then 1 when 'directivo' then 2 when 'entrenador' then 3 when 'staff' then 4 else 5 end
  limit 1;
$$;

-- ¿Puede editar este evento? Coach, directivo y dueño: siempre. Quien lo creó o tiene permiso otorgado.
create or replace function public.calendar_can_edit_team_event(p_event uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_team uuid;
  v_created uuid;
  v_role text;
begin
  select e.team_id, e.created_by into v_team, v_created from public.team_calendar_events e where e.id = p_event;
  if v_team is null or auth.uid() is null then
    return false;
  end if;
  v_role := public.calendar_team_role(v_team);
  if v_role in ('owner', 'directivo', 'entrenador') then
    return true;
  end if;
  if v_role = 'staff' and v_created = auth.uid() then
    return true;
  end if;
  return exists (select 1 from public.calendar_event_grants g
    where g.event_id = p_event and g.user_id = auth.uid() and g.can_edit);
end;
$$;

-- Crear o editar un evento de equipo.
create or replace function public.calendar_save_team_event(
  p_id uuid, p_team uuid, p_title text, p_description text, p_location text, p_event_type text,
  p_starts timestamptz, p_ends timestamptz, p_all_day boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.calendar_team_role(p_team);
  v_id uuid := p_id;
begin
  if v_role is null or v_role = 'atleta' then
    raise exception 'Tu rol en este equipo no permite gestionar el calendario.';
  end if;
  if char_length(trim(coalesce(p_title, ''))) = 0 then
    raise exception 'El evento necesita un título.';
  end if;
  if p_ends < p_starts then
    raise exception 'La hora de fin debe ser posterior al inicio.';
  end if;
  if p_event_type not in ('training', 'match', 'game', 'meeting', 'other') then
    raise exception 'Tipo de evento no válido.';
  end if;

  if p_id is null then
    insert into public.team_calendar_events (team_id, created_by, event_type, title, description, location, starts_at, ends_at, all_day)
    values (p_team, auth.uid(), p_event_type, trim(p_title), nullif(trim(coalesce(p_description, '')), ''),
      nullif(trim(coalesce(p_location, '')), ''), p_starts, p_ends, coalesce(p_all_day, false))
    returning id into v_id;
  else
    if not public.calendar_can_edit_team_event(p_id) then
      raise exception 'No tienes permiso para editar este evento.';
    end if;
    update public.team_calendar_events set
      event_type = p_event_type,
      title = trim(p_title),
      description = nullif(trim(coalesce(p_description, '')), ''),
      location = nullif(trim(coalesce(p_location, '')), ''),
      starts_at = p_starts,
      ends_at = p_ends,
      all_day = coalesce(p_all_day, false)
    where id = p_id and team_id = p_team;
  end if;
  return v_id;
end;
$$;

-- Eliminar un evento de equipo con el mismo permiso de edición.
create or replace function public.calendar_delete_team_event(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.calendar_can_edit_team_event(p_id) then
    raise exception 'No tienes permiso para eliminar este evento.';
  end if;
  delete from public.team_calendar_events where id = p_id;
end;
$$;

-- Otorgar o quitar permiso de edición sobre un evento (coach, directivo o dueño).
create or replace function public.calendar_grant_event_edit(p_event uuid, p_user uuid, p_granted boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team uuid;
  v_role text;
begin
  select e.team_id into v_team from public.team_calendar_events e where e.id = p_event;
  if v_team is null then
    raise exception 'El evento no existe.';
  end if;
  v_role := public.calendar_team_role(v_team);
  if v_role not in ('owner', 'directivo', 'entrenador') then
    raise exception 'Solo el coach o el directivo otorgan permisos sobre eventos.';
  end if;
  if p_granted then
    insert into public.calendar_event_grants (event_id, user_id, can_edit, granted_by)
    values (p_event, p_user, true, auth.uid())
    on conflict (event_id, user_id) do update set can_edit = true, granted_by = auth.uid();
  else
    delete from public.calendar_event_grants where event_id = p_event and user_id = p_user;
  end if;
end;
$$;

-- La asistencia por jugador la ven el coach, el directivo y el dueño. El staff no.
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
  if public.calendar_team_role(v_team) not in ('owner', 'directivo', 'entrenador') then
    raise exception 'Solo el coach o el directivo ven la asistencia.';
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

-- Reporte por jugador de un equipo: asistencia confirmada y ausencias. Solo Pro o Élite.
create or replace function public.calendar_team_attendance_report(p_team uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.calendar_team_role(p_team) not in ('owner', 'directivo', 'entrenador') then
    raise exception 'Solo el coach o el directivo ven el reporte de asistencia.';
  end if;
  if not exists (select 1 from public.calendar_current_plan() where unlimited) then
    raise exception 'El reporte de asistencia es parte del plan Pro.';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(r) order by r.name)
    from (
      select m.user_id, coalesce(p.full_name, 'Jugador') as name,
        count(*) filter (where a.response = 'voy') as confirmadas,
        count(*) filter (where a.response = 'no_voy') as ausencias,
        count(a.event_id) as respuestas,
        (select count(*) from public.team_calendar_events e where e.team_id = p_team) as eventos
      from public.team_user_memberships m
      left join public.profiles p on p.id = m.user_id
      left join public.team_calendar_events e on e.team_id = p_team
      left join public.calendar_attendance a on a.source = 'team' and a.event_id = e.id and a.user_id = m.user_id
      where m.team_id = p_team and m.status = 'active' and m.role = 'atleta'
      group by m.user_id, p.full_name
    ) r
  ), '[]'::jsonb);
end;
$$;

-- Vista del directivo: eventos de todos los equipos de su organización en un rango. Solo Pro o Élite.
create or replace function public.calendar_org_overview(p_org uuid, p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.organization_members m
    where m.organization_id = p_org and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner', 'directivo')) then
    raise exception 'Solo el directivo de la organización ve su calendario general.';
  end if;
  if not exists (select 1 from public.calendar_current_plan() where unlimited) then
    raise exception 'La vista de todos los equipos es parte del plan Pro.';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.starts_at)
    from (
      select e.id, e.team_id, t.name as team_name, e.title, e.event_type, e.location, e.starts_at, e.ends_at,
        exists (select 1 from public.team_calendar_events o
          where o.id <> e.id and o.location is not null and o.location = e.location
            and o.starts_at < e.ends_at and o.ends_at > e.starts_at) as conflict
      from public.team_calendar_events e
      join public.teams t on t.id = e.team_id
      where t.organization_id = p_org and e.starts_at < p_to and e.ends_at > p_from
    ) x
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.calendar_team_role(uuid) from public, anon;
revoke all on function public.calendar_can_edit_team_event(uuid) from public, anon;
revoke all on function public.calendar_save_team_event(uuid, uuid, text, text, text, text, timestamptz, timestamptz, boolean) from public, anon;
revoke all on function public.calendar_delete_team_event(uuid) from public, anon;
revoke all on function public.calendar_grant_event_edit(uuid, uuid, boolean) from public, anon;
revoke all on function public.calendar_team_attendance(uuid) from public, anon;
revoke all on function public.calendar_team_attendance_report(uuid) from public, anon;
revoke all on function public.calendar_org_overview(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.calendar_team_role(uuid) to authenticated;
grant execute on function public.calendar_can_edit_team_event(uuid) to authenticated;
grant execute on function public.calendar_save_team_event(uuid, uuid, text, text, text, text, timestamptz, timestamptz, boolean) to authenticated;
grant execute on function public.calendar_delete_team_event(uuid) to authenticated;
grant execute on function public.calendar_grant_event_edit(uuid, uuid, boolean) to authenticated;
grant execute on function public.calendar_team_attendance(uuid) to authenticated;
grant execute on function public.calendar_team_attendance_report(uuid) to authenticated;
grant execute on function public.calendar_org_overview(uuid, timestamptz, timestamptz) to authenticated;

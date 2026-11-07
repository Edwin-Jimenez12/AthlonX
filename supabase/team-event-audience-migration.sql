-- Destinatario de los eventos de equipo: toda la plantilla, una división, el cuerpo técnico o una persona vinculada al equipo.
-- Los eventos de equipo que ya tenían división pasan a "división". Idempotente: se puede volver a ejecutar.

alter table public.team_calendar_events
  add column if not exists audience text not null default 'team',
  add column if not exists audience_user_id uuid references auth.users(id) on delete set null;

alter table public.team_calendar_events drop constraint if exists team_calendar_events_audience_check;
alter table public.team_calendar_events add constraint team_calendar_events_audience_check
  check (audience in ('team', 'division', 'staff', 'person'));

update public.team_calendar_events set audience = 'division'
where division_id is not null and audience = 'team';

-- Quién ve un evento de equipo. Los directivos, owner y cuerpo técnico ven todo el calendario del equipo.
create or replace function public.calendar_team_event_visible(p_team uuid, p_audience text, p_division uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(p_audience, 'team') = 'team' then true
    when public.platform_can_manage_account('equipo', p_team) then true
    when exists (select 1 from public.team_user_memberships m
                 where m.team_id = p_team and m.user_id = auth.uid() and m.status = 'active'
                   and m.role in ('owner', 'directivo', 'entrenador', 'staff')) then true
    when p_audience = 'division' then exists (select 1 from public.team_players tp
                 join public.players pl on pl.id = tp.player_id
                 where tp.team_id = p_team and tp.division_id = p_division and pl.user_id = auth.uid())
    when p_audience = 'person' then p_user = auth.uid()
    else false
  end;
$$;

-- Opciones para el formulario: divisiones, cuerpo técnico y jugadores con cuenta vinculada al equipo.
create or replace function public.calendar_team_audience_options(p_team uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión.'; end if;
  if not public.platform_can_manage_account('equipo', p_team) and not exists (
    select 1 from public.team_user_memberships m where m.team_id = p_team and m.user_id = auth.uid() and m.status = 'active'
  ) then
    raise exception 'No tienes acceso a este equipo.';
  end if;
  return jsonb_build_object(
    'divisions', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name) order by d.name)
                           from public.team_division_catalog d where d.team_id = p_team), '[]'::jsonb),
    'staff', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'name', coalesce(p.full_name, 'Miembro del equipo'), 'role', m.role) order by p.full_name)
                       from public.team_user_memberships m
                       left join public.profiles p on p.id = m.user_id
                       where m.team_id = p_team and m.status = 'active' and m.role in ('owner', 'directivo', 'entrenador', 'staff')), '[]'::jsonb),
    'players', coalesce((select jsonb_agg(jsonb_build_object('user_id', x.user_id, 'name', x.full_name) order by x.full_name)
                         from (select distinct pl.user_id, pl.full_name
                               from public.team_players tp join public.players pl on pl.id = tp.player_id
                               where tp.team_id = p_team and pl.user_id is not null) x), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.calendar_team_audience_options(uuid) from public, anon;
grant execute on function public.calendar_team_audience_options(uuid) to authenticated;

-- Guardar evento de equipo con destinatario (v3). v2 se conserva para clientes anteriores.
create or replace function public.calendar_save_team_event_v3(
  p_id uuid, p_team uuid, p_title text, p_description text, p_location text, p_event_type text,
  p_starts timestamptz, p_ends timestamptz, p_division uuid, p_repeat text, p_repeat_until timestamptz, p_reminders integer[],
  p_audience text, p_audience_user uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.calendar_team_role(p_team);
  v_id uuid := p_id;
  v_audience text := coalesce(p_audience, 'team');
  v_division uuid := null;
  v_user uuid := null;
begin
  if (v_role is null or v_role = 'atleta') and not public.platform_can_manage_account('equipo', p_team) then
    raise exception 'Tu rol en este equipo no permite gestionar el calendario.';
  end if;
  if char_length(trim(coalesce(p_title, ''))) = 0 then raise exception 'El evento necesita un título.'; end if;
  if p_ends <= p_starts then raise exception 'La hora de fin debe ser posterior al inicio.'; end if;
  if p_event_type not in ('training', 'match', 'game', 'meeting', 'other') then raise exception 'Tipo de evento no válido.'; end if;
  if coalesce(p_repeat, 'none') not in ('none', 'weekly', 'monthly') then raise exception 'Repetición no válida.'; end if;
  if v_audience not in ('team', 'division', 'staff', 'person') then raise exception 'Destinatario no válido.'; end if;

  if v_audience = 'division' then
    if p_division is null or not exists (select 1 from public.team_division_catalog d where d.id = p_division and d.team_id = p_team) then
      raise exception 'La división no pertenece al equipo.';
    end if;
    v_division := p_division;
  elsif v_audience = 'person' then
    if p_audience_user is null or not (
      exists (select 1 from public.team_user_memberships m where m.team_id = p_team and m.user_id = p_audience_user and m.status = 'active')
      or exists (select 1 from public.team_players tp join public.players pl on pl.id = tp.player_id
                 where tp.team_id = p_team and pl.user_id = p_audience_user)
    ) then
      raise exception 'La persona debe estar vinculada al equipo.';
    end if;
    v_user := p_audience_user;
  end if;

  if p_id is null then
    insert into public.team_calendar_events (team_id, created_by, event_type, title, description, location, starts_at, ends_at, all_day,
      division_id, repeat_rule, repeat_until, reminder_minutes, audience, audience_user_id)
    values (p_team, auth.uid(), p_event_type, trim(p_title), nullif(trim(coalesce(p_description, '')), ''), nullif(trim(coalesce(p_location, '')), ''),
      p_starts, p_ends, false, v_division, coalesce(p_repeat, 'none'), p_repeat_until, coalesce(p_reminders, array[240]), v_audience, v_user)
    returning id into v_id;
  else
    if not public.calendar_can_edit_team_event(p_id) and not public.platform_can_manage_account('equipo', p_team) then
      raise exception 'No tienes permiso para editar este evento.';
    end if;
    update public.team_calendar_events set event_type = p_event_type, title = trim(p_title),
      description = nullif(trim(coalesce(p_description, '')), ''), location = nullif(trim(coalesce(p_location, '')), ''),
      starts_at = p_starts, ends_at = p_ends, division_id = v_division, repeat_rule = coalesce(p_repeat, 'none'),
      repeat_until = p_repeat_until, reminder_minutes = coalesce(p_reminders, array[240]),
      audience = v_audience, audience_user_id = v_user
    where id = p_id and team_id = p_team;
  end if;
  return v_id;
end;
$$;

revoke all on function public.calendar_save_team_event_v3(uuid, uuid, text, text, text, text, timestamptz, timestamptz, uuid, text, timestamptz, integer[], text, uuid) from public, anon;
grant execute on function public.calendar_save_team_event_v3(uuid, uuid, text, text, text, text, timestamptz, timestamptz, uuid, text, timestamptz, integer[], text, uuid) to authenticated;

-- Feed del calendario: filtra los eventos de equipo según su destinatario y añade el destinatario a cada fila.
CREATE OR REPLACE FUNCTION public.calendar_my_feed(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para ver tu calendario.';
  end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_at), '[]'::jsonb) into v_result
  from (
    select 'team'::text as source, e.id, e.team_id as owner_id, t.name as owner_name, e.title, e.description,
      e.location, e.event_type::text as event_type, e.starts_at + occ.shift as starts_at, e.ends_at + occ.shift as ends_at, e.all_day,
      occ.n as occurrence, e.repeat_rule, a.response as my_response, public.calendar_can_edit_team_event(e.id) as can_edit, null::uuid as type_id, null::text as type_label, null::text as type_color, e.audience as audience, e.audience_user_id as audience_user_id, e.division_id as division_id
    from public.team_calendar_events e
    join public.teams t on t.id = e.team_id
    left join public.calendar_attendance a on a.source = 'team' and a.event_id = e.id and a.user_id = auth.uid()
    cross join lateral (
      select n, case e.repeat_rule when 'weekly' then make_interval(weeks => n) when 'monthly' then make_interval(months => n) else make_interval() end as shift
      from generate_series(0, 300) as n where e.repeat_rule <> 'none' or n = 0
    ) occ
    where (e.repeat_until is null or e.starts_at + occ.shift <= e.repeat_until)
      and e.starts_at + occ.shift < p_to and e.ends_at + occ.shift > p_from
      and exists (select 1 from public.team_user_memberships m
                  where m.team_id = e.team_id and m.user_id = auth.uid() and m.status = 'active')
      and public.calendar_team_event_visible(e.team_id, e.audience, e.division_id, e.audience_user_id)
    union all
    select 'organization', e.id, e.organization_id, o.name, e.title, e.description,
      e.location, e.event_type::text, e.starts_at + occ.shift, e.ends_at + occ.shift, e.all_day, occ.n,
      e.repeat_rule, a.response, false, null::uuid, null::text, null::text, null::text, null::uuid, null::uuid
    from public.organization_calendar_events e
    join public.organizations o on o.id = e.organization_id
    left join public.calendar_attendance a on a.source = 'organization' and a.event_id = e.id and a.user_id = auth.uid()
    cross join lateral (
      select n, case e.repeat_rule when 'weekly' then make_interval(weeks => n) when 'monthly' then make_interval(months => n) else make_interval() end as shift
      from generate_series(0, 300) as n where e.repeat_rule <> 'none' or n = 0
    ) occ
    where (e.repeat_until is null or e.starts_at + occ.shift <= e.repeat_until)
      and e.starts_at + occ.shift < p_to and e.ends_at + occ.shift > p_from
      and exists (select 1 from public.organization_members m
                  where m.organization_id = e.organization_id and m.user_id = auth.uid() and m.status = 'active')
    union all
    select 'personal', pa.id, pa.user_id, null::text, pa.title, pa.description, pa.location, pa.event_type,
      pa.starts_at + occ.shift, pa.ends_at + occ.shift, pa.all_day, occ.n, pa.repeat_rule, null::text, true,
      pa.type_id, pet.label, pet.color, null::text, null::uuid, null::uuid
    from public.personal_activities pa
    left join public.personal_event_types pet on pet.id = pa.type_id
    cross join lateral (
      select n, case pa.repeat_rule when 'weekly' then make_interval(weeks => n) when 'monthly' then make_interval(months => n) else make_interval() end as shift
      from generate_series(0, 300) as n where pa.repeat_rule <> 'none' or n = 0
    ) occ
    where pa.user_id = auth.uid()
      and (pa.repeat_until is null or pa.starts_at + occ.shift <= pa.repeat_until)
      and pa.starts_at + occ.shift < p_to and pa.ends_at + occ.shift > p_from
  ) x;
  return v_result;
end;
$function$;

grant execute on function public.calendar_my_feed(timestamptz, timestamptz) to authenticated;

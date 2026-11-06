-- Tipos de evento personalizables en el calendario personal.
-- Cada evento guarda una categoría interna (training, match, meeting, personal, other) que usan los límites,
-- los filtros y las reglas de plan. El nombre y el color son de cada persona y se pueden cambiar.
-- Los 5 tipos predefinidos no se eliminan; sus nombres se pueden restablecer. Los tipos propios solo los borra su dueño.
-- Idempotente: se puede volver a ejecutar.

create table if not exists public.personal_event_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('training', 'match', 'meeting', 'personal', 'other')),
  label text not null check (char_length(trim(label)) between 1 and 40),
  color text not null check (color in ('#b4ff45', '#4ea8ff', '#a78bfa', '#ff9f43', '#ff6b6b', '#2dd4bf', '#facc15', '#f472b6', '#22c55e', '#7dd3fc', '#818cf8', '#94a3b8')),
  default_key text check (default_key in ('training', 'match', 'meeting', 'personal', 'other')),
  created_at timestamptz not null default now()
);

create unique index if not exists personal_event_types_default_unique on public.personal_event_types(user_id, default_key) where default_key is not null;
create unique index if not exists personal_event_types_label_unique on public.personal_event_types(user_id, lower(trim(label)));

alter table public.personal_event_types enable row level security;
drop policy if exists "tipos: solo el dueño ve" on public.personal_event_types;
create policy "tipos: solo el dueño ve" on public.personal_event_types for select to authenticated using (user_id = auth.uid());
drop policy if exists "tipos: solo el dueño crea" on public.personal_event_types;
create policy "tipos: solo el dueño crea" on public.personal_event_types for insert to authenticated with check (user_id = auth.uid() and default_key is null);
drop policy if exists "tipos: solo el dueño cambia" on public.personal_event_types;
create policy "tipos: solo el dueño cambia" on public.personal_event_types for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "tipos: solo el dueño borra los propios" on public.personal_event_types;
create policy "tipos: solo el dueño borra los propios" on public.personal_event_types for delete to authenticated using (user_id = auth.uid() and default_key is null);
grant select, insert, update, delete on public.personal_event_types to authenticated;

-- Predefinidos: Entrenamiento (azul), Partido (lima), Reunión (violeta), Personal (pizarra), Otro (naranja).
create or replace function public.personal_types_ensure()
returns setof public.personal_event_types
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión para ver tus tipos de evento.'; end if;
  insert into public.personal_event_types (user_id, category, label, color, default_key) values
    (auth.uid(), 'training', 'Entrenamiento', '#4ea8ff', 'training'),
    (auth.uid(), 'match', 'Partido', '#b4ff45', 'match'),
    (auth.uid(), 'meeting', 'Reunión', '#a78bfa', 'meeting'),
    (auth.uid(), 'personal', 'Personal', '#94a3b8', 'personal'),
    (auth.uid(), 'other', 'Otro', '#ff9f43', 'other')
  on conflict do nothing;
  return query select * from public.personal_event_types where user_id = auth.uid() order by created_at, label;
end;
$$;

-- Restablece los nombres originales de los predefinidos. Si un tipo propio ya usa ese nombre, no se cambia y se avisa.
create or replace function public.personal_types_reset_defaults()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_original text;
  v_changed integer := 0;
begin
  if auth.uid() is null then raise exception 'Inicia sesión.'; end if;
  for v_row in select * from public.personal_event_types where user_id = auth.uid() and default_key is not null loop
    v_original := case v_row.default_key when 'training' then 'Entrenamiento' when 'match' then 'Partido' when 'meeting' then 'Reunión' when 'personal' then 'Personal' else 'Otro' end;
    if v_row.label <> v_original then
      if exists (select 1 from public.personal_event_types x where x.user_id = auth.uid() and lower(trim(x.label)) = lower(v_original) and x.id <> v_row.id) then
        raise exception 'Ya tienes un tipo llamado "%". Renómbralo antes de restablecer.', v_original;
      end if;
      update public.personal_event_types set label = v_original where id = v_row.id;
      v_changed := v_changed + 1;
    end if;
  end loop;
  return v_changed;
end;
$$;

-- Actividades personales: tipo elegido (opcional; sin tipo se muestra el predefinido de su categoría).
alter table public.personal_activities add column if not exists type_id uuid references public.personal_event_types(id) on delete set null;
alter table public.personal_activities drop constraint if exists personal_activities_event_type_check;
alter table public.personal_activities add constraint personal_activities_event_type_check
  check (event_type in ('personal', 'training', 'match', 'meeting', 'other'));

-- Guardar actividad personal: ahora acepta el tipo. Se reemplaza la firma anterior.
drop function if exists public.calendar_save_personal_activity(uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz, integer[]);
create or replace function public.calendar_save_personal_activity(
  p_id uuid, p_title text, p_description text, p_location text, p_event_type text, p_starts timestamptz, p_ends timestamptz,
  p_all_day boolean, p_repeat text, p_repeat_until timestamptz, p_reminders integer[], p_type_id uuid default null
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
  if coalesce(p_event_type, 'personal') not in ('personal', 'training', 'match', 'meeting', 'other') then
    raise exception 'Tipo de evento no válido.';
  end if;
  if p_type_id is not null and not exists (select 1 from public.personal_event_types t where t.id = p_type_id and t.user_id = auth.uid()) then
    raise exception 'El tipo de evento no es tuyo.';
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
      all_day, repeat_rule, repeat_until, reminder_minutes, type_id)
    values (auth.uid(), trim(p_title), nullif(trim(coalesce(p_description, '')), ''), nullif(trim(coalesce(p_location, '')), ''),
      coalesce(p_event_type, 'personal'), p_starts, p_ends, coalesce(p_all_day, false),
      coalesce(p_repeat, 'none'), case when coalesce(p_repeat, 'none') = 'none' then null else p_repeat_until end, v_reminders, p_type_id)
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
      type_id = p_type_id,
      updated_at = now()
    where id = p_id and user_id = auth.uid();
    if not found then
      raise exception 'La actividad no existe o no es tuya.';
    end if;
  end if;
  return v_id;
end;
$$;

revoke all on function public.personal_types_ensure() from public, anon;
revoke all on function public.personal_types_reset_defaults() from public, anon;
revoke all on function public.calendar_save_personal_activity(uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz, integer[], uuid) from public, anon;
grant execute on function public.personal_types_ensure() to authenticated;
grant execute on function public.personal_types_reset_defaults() to authenticated;
grant execute on function public.calendar_save_personal_activity(uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz, integer[], uuid) to authenticated;

-- Feed del calendario: las actividades personales devuelven su tipo (id, nombre y color).
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
      occ.n as occurrence, e.repeat_rule, a.response as my_response, public.calendar_can_edit_team_event(e.id) as can_edit, null::uuid as type_id, null::text as type_label, null::text as type_color
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
    union all
    select 'organization', e.id, e.organization_id, o.name, e.title, e.description,
      e.location, e.event_type::text, e.starts_at + occ.shift, e.ends_at + occ.shift, e.all_day, occ.n,
      e.repeat_rule, a.response, false, null::uuid, null::text, null::text
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
      pa.type_id, pet.label, pet.color
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

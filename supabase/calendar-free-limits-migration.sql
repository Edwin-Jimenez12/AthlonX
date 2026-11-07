-- Límite de 5 actividades al mes en Free para cuenta personal, equipo y organización, con 2 repetidas.
-- Pro: actividades y repeticiones sin límite. Idempotente: se puede volver a ejecutar.

-- 1) Planes: límites de repetición y textos que muestra la página de planes.
update public.plans set limits = limits || '{"eventos_repetidos": 2}'::jsonb,
  features = replace(features::text, 'Hasta 5 actividades personales al mes', '5 actividades al mes, incluidas 2 repetidas')::jsonb
where code = 'libre';

update public.plans set limits = limits || '{"eventos_mes": 5}'::jsonb,
  features = replace(features::text, '10 eventos al mes y 2 eventos repetidos', '5 eventos al mes, incluidos 2 repetidos')::jsonb
where code = 'team_free';

update public.plans set limits = limits || '{"eventos_repetidos": 2}'::jsonb,
  feature_flags = feature_flags || '{"repetir_eventos": true}'::jsonb,
  features = replace(features::text, '5 eventos de la organización al mes', '5 eventos al mes, incluidos 2 repetidos')::jsonb
where code = 'org_free';

update public.plans set limits = limits || '{"eventos_mes": null, "eventos_repetidos": null}'::jsonb,
  features = replace(features::text, '30 eventos al mes, con repetición', 'Eventos y repeticiones sin límite')::jsonb
where code = 'org_pro';

-- 2) Organización: el límite de repeticiones se cuenta con los eventos repetidos activos.
create or replace function public.enforce_org_repeat_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.repeat_rule = 'none' then return new; end if;
  if tg_op = 'UPDATE' and old.repeat_rule <> 'none' then return new; end if;
  v_limit := public.platform_org_limit(new.organization_id, 'eventos_repetidos');
  if v_limit is null then return new; end if;
  select count(*) into v_count from public.organization_calendar_events e
  where e.organization_id = new.organization_id and e.repeat_rule <> 'none'
    and (e.repeat_until is null or e.repeat_until > now()) and e.id is distinct from new.id;
  if v_count >= v_limit then
    raise exception 'El plan % de la organización permite % evento(s) repetido(s). Mejora el plan para repetir más.',
      (public.platform_org_plan(new.organization_id)).name, v_limit;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_org_repeat_limit on public.organization_calendar_events;
create trigger enforce_org_repeat_limit before insert or update on public.organization_calendar_events
for each row execute function public.enforce_org_repeat_limit();

-- 3) Funciones actualizadas: cuenta personal (repeticiones de Libre) y uso de organización.
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
  v_repeat_limit integer;
  v_repeat_count integer;
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
  -- Repeticiones: Libre permite 2 actividades repetidas activas; Pro y Élite, sin límite.
  if coalesce(p_repeat, 'none') <> 'none' then
    select (l.limits->>'eventos_repetidos')::integer into v_repeat_limit from public.plans l where l.code = v_plan.code;
    if v_repeat_limit = 0 or (v_repeat_limit is null and not v_plan.unlimited) then
      raise exception 'Repetir actividades es parte del plan Pro.';
    end if;
    if v_repeat_limit is not null and (p_id is null or not exists (select 1 from public.personal_activities x where x.id = p_id and x.repeat_rule <> 'none')) then
      select count(*) into v_repeat_count from public.personal_activities x
      where x.user_id = auth.uid() and x.repeat_rule <> 'none' and (x.repeat_until is null or x.repeat_until > now()) and x.id is distinct from p_id;
      if v_repeat_count >= v_repeat_limit then
        raise exception 'Tu plan Libre permite % actividades repetidas. Mejora a Pro para repetir más.', v_repeat_limit;
      end if;
    end if;
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
grant execute on function public.calendar_save_personal_activity(uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz, integer[], uuid) to authenticated;

create or replace function public.platform_org_usage(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan public.plans%rowtype;
begin
  if not (public.platform_can_manage_account('organizacion', p_org)
          or exists (select 1 from public.organization_members m
                     where m.organization_id = p_org and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner', 'directivo'))) then
    raise exception 'No puedes ver el uso de esta organización.';
  end if;
  select * into v_plan from public.platform_org_plan(p_org);
  return jsonb_build_object(
    'plan', v_plan.name,
    'code', v_plan.code,
    'limits', v_plan.limits,
    'usage', jsonb_build_object(
      'equipos_afiliados', (select count(*) from public.teams t where t.organization_id = p_org and t.temporary_tournament_id is null and not public.org_team_is_own(p_org, t.created_by)),
      'equipos_propios', (select count(*) from public.teams t where t.organization_id = p_org and t.temporary_tournament_id is null and public.org_team_is_own(p_org, t.created_by)),
      'directivos_staff', (select count(*) from public.organization_members m where m.organization_id = p_org and m.role in ('directivo', 'staff') and m.status in ('active', 'pending')),
      'eventos_mes', (select count(*) from public.organization_calendar_events e where e.organization_id = p_org and e.created_at >= date_trunc('month', now())),
      'eventos_repetidos', (select count(*) from public.organization_calendar_events e where e.organization_id = p_org and e.repeat_rule <> 'none' and (e.repeat_until is null or e.repeat_until > now())),
      'torneos_rapidos', (select count(*) from public.tournaments x where x.organization_id = p_org and x.status <> 'finished' and x.is_quick),
      'torneos_oficiales', (select count(*) from public.tournaments x where x.organization_id = p_org and x.status <> 'finished' and not x.is_quick)
    )
  );
end;
$$;

revoke all on function public.platform_org_usage(uuid) from public, anon;
grant execute on function public.platform_org_usage(uuid) to authenticated;

-- AthlonX: planes de la cuenta de equipo (Free, Pro y Élite) y la sección Finanzas.
-- Basado en documentos/PLANES_EQUIPO_APROBADO.xlsx y el diseño aprobado en Figma (REDISEÑO, "Equipo · …").
-- Los límites se aplican a lo que se crea desde ahora; lo existente sigue funcionando.
-- Idempotente. Requiere organization-plans-migration.sql y organization-sections-migration.sql.

-- 1) Catálogo
insert into public.plans (code, name, kind, account_type, monthly_price, annual_enabled, annual_price, seats,
  personal_activity_monthly_limit, price_pending, limits, feature_flags, features, sort_order)
values
  ('team_free', 'Free', 'individual', 'equipo', 0, false, null, 1, null, false,
   '{"divisiones": 1, "jugadores_division": 25, "cuerpo_tecnico": 5, "eventos_mes": 10, "eventos_repetidos": 1, "recordatorios_evento": 1, "torneos_rapidos": 1, "equipos_por_torneo": 8, "movimientos_mes": 30, "jugadores_cuota": 30, "tesoreros": 1, "presupuestos": 1, "historial_meses": 3}'::jsonb,
   '{"sincronizacion": false, "permisos_evento": false, "comparar_temporadas": false, "reportes": false, "logo_reportes": false, "comprobantes": false, "categorias_propias": false, "cuota_por_division": false, "estadisticas_finanzas": false, "patrocinios": false, "costo_jugador": false, "comparativa_finanzas": false, "alertas_presupuesto": false, "auditoria": false}'::jsonb,
   '["1 división, hasta 25 jugadores", "Hasta 5 personas en cuerpo técnico y directiva", "10 eventos al mes y 1 evento repetido", "Recordatorio fijo de 4 horas", "1 torneo rápido activo, hasta 8 equipos", "Finanzas: 30 movimientos al mes, cajas y cuotas", "1 tesorero"]'::jsonb, 20),
  ('team_pro', 'Pro', 'individual', 'equipo', 0, false, null, 1, null, true,
   '{"divisiones": 3, "jugadores_division": 60, "cuerpo_tecnico": 15, "eventos_mes": null, "eventos_repetidos": null, "recordatorios_evento": 5, "torneos_rapidos": 1, "equipos_por_torneo": null, "movimientos_mes": null, "jugadores_cuota": null, "tesoreros": 2, "presupuestos": null, "historial_meses": null}'::jsonb,
   '{"sincronizacion": true, "permisos_evento": true, "comparar_temporadas": true, "reportes": true, "logo_reportes": true, "comprobantes": true, "categorias_propias": true, "cuota_por_division": true, "estadisticas_finanzas": true, "patrocinios": true, "costo_jugador": false, "comparativa_finanzas": false, "alertas_presupuesto": false, "auditoria": false}'::jsonb,
   '["Hasta 3 divisiones y 60 jugadores por división", "Hasta 15 personas en cuerpo técnico y directiva", "Eventos sin límite, con repetición", "Hasta 5 recordatorios por evento", "Sincronización con Google y Outlook", "Comparar temporadas", "Finanzas: presupuesto, estadísticas, comprobantes y patrocinios", "Hasta 2 tesoreros", "Reportes PDF y CSV con tu logotipo"]'::jsonb, 21),
  ('team_elite', 'Élite', 'individual', 'equipo', 0, false, null, 1, null, true,
   '{"divisiones": null, "jugadores_division": null, "cuerpo_tecnico": null, "eventos_mes": null, "eventos_repetidos": null, "recordatorios_evento": null, "torneos_rapidos": null, "equipos_por_torneo": null, "movimientos_mes": null, "jugadores_cuota": null, "tesoreros": null, "presupuestos": null, "historial_meses": null}'::jsonb,
   '{"sincronizacion": true, "permisos_evento": true, "comparar_temporadas": true, "reportes": true, "logo_reportes": true, "comprobantes": true, "categorias_propias": true, "cuota_por_division": true, "estadisticas_finanzas": true, "patrocinios": true, "costo_jugador": true, "comparativa_finanzas": true, "alertas_presupuesto": true, "auditoria": true}'::jsonb,
   '["Divisiones, jugadores y personas sin límite", "Torneos rápidos y ligas sin límite", "Costo por jugador y por partido", "Comparativa financiera entre temporadas", "Alertas de presupuesto y registro de cambios", "Tesoreros sin límite"]'::jsonb, 22)
on conflict (code) do nothing;

-- 2) Plan, límites y funciones de un equipo (sin plan asignado: Free)
create or replace function public.platform_team_plan(p_team uuid)
returns public.plans
language sql
stable
security definer
set search_path = public
as $$
  select p.* from public.plans p
  where p.code = coalesce(
    (select ap.plan_code from public.account_plans ap
     join public.plans pp on pp.code = ap.plan_code and pp.account_type = 'equipo'
     where ap.account_type = 'equipo' and ap.account_id = p_team
       and (ap.ends_at is null or ap.ends_at > now())),
    'team_free');
$$;

create or replace function public.platform_team_limit(p_team uuid, p_key text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (p.limits ->> p_key)::integer from public.platform_team_plan(p_team) p;
$$;

create or replace function public.platform_team_feature(p_team uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((p.feature_flags ->> p_key)::boolean, false) from public.platform_team_plan(p_team) p;
$$;

-- Equipos de cuenta (no los temporales de un torneo rápido)
create or replace function public.team_is_regular(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.teams t where t.id = p_team and t.temporary_tournament_id is null);
$$;

create or replace function public.team_is_manager(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.calendar_team_role(p_team) in ('owner', 'directivo'), false)
      or public.platform_can_manage_account('equipo', p_team);
$$;

-- 3) Catálogo por tipo de cuenta en el plan vigente y en el canje de códigos
create or replace function public.platform_account_plan(p_account_type text, p_account_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_catalog text := case p_account_type when 'organizacion' then 'organizacion' when 'equipo' then 'equipo' else 'persona' end;
  v_default text := case p_account_type when 'organizacion' then 'org_free' when 'equipo' then 'team_free' else 'libre' end;
  v_plan public.plans%rowtype;
  v_ap public.account_plans%rowtype;
begin
  if not (public.platform_can_manage_account(p_account_type, p_account_id)
          or (p_account_type = 'equipo' and public.calendar_team_role(p_account_id) is not null)) then
    raise exception 'No puedes ver el plan de esta cuenta.';
  end if;
  select ap.* into v_ap from public.account_plans ap
  join public.plans p on p.code = ap.plan_code and p.account_type = v_catalog
  where ap.account_type = p_account_type and ap.account_id = p_account_id
    and (ap.ends_at is null or ap.ends_at > now());
  if found then
    select * into v_plan from public.plans where code = v_ap.plan_code;
  else
    select * into v_plan from public.plans where code = v_default;
  end if;
  return jsonb_build_object(
    'code', v_plan.code, 'name', v_plan.name, 'account_type', v_plan.account_type,
    'monthly_price', v_plan.monthly_price, 'price_pending', v_plan.price_pending,
    'personal_activity_monthly_limit', v_plan.personal_activity_monthly_limit,
    'limits', v_plan.limits, 'feature_flags', v_plan.feature_flags, 'features', v_plan.features,
    'ends_at', v_ap.ends_at, 'is_free', v_plan.code in ('libre', 'org_free', 'team_free')
  );
end;
$$;

create or replace function public.platform_redeem_plan_code(
  p_account_type text, p_account_id uuid, p_plan_code text, p_promo_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catalog text := case p_account_type when 'organizacion' then 'organizacion' when 'equipo' then 'equipo' else 'persona' end;
  v_plan public.plans%rowtype;
  v_promo public.promo_codes%rowtype;
  v_code text := upper(trim(coalesce(p_promo_code, '')));
  v_final numeric(10,2);
begin
  if not public.platform_can_manage_account(p_account_type, p_account_id) then
    raise exception 'No puedes cambiar el plan de esta cuenta.';
  end if;
  select * into v_plan from public.plans
  where code = p_plan_code and is_active and kind = 'individual' and account_type = v_catalog;
  if not found or p_plan_code in ('libre', 'org_free', 'team_free') then
    raise exception 'Elige Pro o Élite.';
  end if;
  select * into v_promo from public.promo_codes where code = v_code for update;
  if not found or not v_promo.is_active then raise exception 'El código no es válido.'; end if;
  if v_promo.starts_at > now() or (v_promo.ends_at is not null and v_promo.ends_at <= now()) then raise exception 'El código no está vigente.'; end if;
  if v_promo.max_uses is not null and v_promo.uses_count >= v_promo.max_uses then raise exception 'El código ya no tiene usos disponibles.'; end if;
  if not (p_plan_code = any(v_promo.applies_to_plans)) then raise exception 'El código no aplica a este plan.'; end if;
  if v_plan.price_pending then
    if not (v_promo.discount_type = 'percent' and v_promo.amount = 100) then
      raise exception 'El precio de este plan aún no está definido. Por ahora solo se activa con un código del 100 %%.';
    end if;
    v_final := 0;
  else
    v_final := case when v_promo.discount_type = 'percent'
      then round(v_plan.monthly_price * (1 - v_promo.amount / 100), 2)
      else greatest(0, v_plan.monthly_price - v_promo.amount) end;
  end if;
  if v_final > 0 then
    raise exception 'Con este código el plan queda en US$ %. El pago aún no está disponible.', v_final;
  end if;
  insert into public.account_plans (account_type, account_id, plan_code, billing_period, started_at, ends_at)
  values (p_account_type, p_account_id, v_plan.code, 'mensual', now(), now() + interval '1 month')
  on conflict (account_type, account_id) do update set
    plan_code = excluded.plan_code, billing_period = excluded.billing_period,
    started_at = excluded.started_at, ends_at = excluded.ends_at;
  update public.promo_codes set uses_count = uses_count + 1 where id = v_promo.id;
  return jsonb_build_object('activated', true, 'plan', v_plan.name, 'ends_at', now() + interval '1 month');
end;
$$;

-- 4) Límites de Mi equipo: divisiones, jugadores por división y cuerpo técnico
create or replace function public.enforce_team_division_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  if not public.team_is_regular(new.team_id) then return new; end if;
  v_limit := public.platform_team_limit(new.team_id, 'divisiones');
  if v_limit is not null and (select count(*) from public.team_division_catalog d where d.team_id = new.team_id and d.id <> new.id) >= v_limit then
    raise exception 'El plan % del equipo permite % división(es). Mejora el plan para agregar más.', (public.platform_team_plan(new.team_id)).name, v_limit;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_team_division_limit on public.team_division_catalog;
create trigger enforce_team_division_limit before insert on public.team_division_catalog
for each row execute function public.enforce_team_division_limit();

create or replace function public.enforce_team_roster_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  if not public.team_is_regular(new.team_id) then return new; end if;
  if tg_op = 'UPDATE' and old.division_id is not distinct from new.division_id then return new; end if;
  v_limit := public.platform_team_limit(new.team_id, 'jugadores_division');
  if v_limit is not null and (select count(*) from public.team_players p
       where p.team_id = new.team_id and p.division_id is not distinct from new.division_id and p.id <> new.id) >= v_limit then
    raise exception 'El plan % del equipo permite % jugadores por división. Mejora el plan para agregar más.', (public.platform_team_plan(new.team_id)).name, v_limit;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_team_roster_limit on public.team_players;
create trigger enforce_team_roster_limit before insert or update of division_id on public.team_players
for each row execute function public.enforce_team_roster_limit();

create or replace function public.enforce_team_staff_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  if new.role not in ('entrenador', 'staff', 'directivo') or new.status not in ('active', 'pending') then return new; end if;
  if tg_op = 'UPDATE' and old.role in ('entrenador', 'staff', 'directivo') and old.status in ('active', 'pending') then return new; end if;
  if not public.team_is_regular(new.team_id) then return new; end if;
  -- La persona ya cuenta si tiene otro rol del cuerpo técnico en el equipo.
  if exists (select 1 from public.team_user_memberships m where m.team_id = new.team_id and m.user_id = new.user_id and m.id <> new.id
             and m.role in ('entrenador', 'staff', 'directivo') and m.status in ('active', 'pending')) then return new; end if;
  v_limit := public.platform_team_limit(new.team_id, 'cuerpo_tecnico');
  if v_limit is not null and (select count(distinct m.user_id) from public.team_user_memberships m
       where m.team_id = new.team_id and m.id <> new.id and m.role in ('entrenador', 'staff', 'directivo') and m.status in ('active', 'pending')) >= v_limit then
    raise exception 'El plan % del equipo permite % personas en el cuerpo técnico y la directiva. Mejora el plan para agregar más.', (public.platform_team_plan(new.team_id)).name, v_limit;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_team_staff_limit on public.team_user_memberships;
create trigger enforce_team_staff_limit before insert or update of role, status on public.team_user_memberships
for each row execute function public.enforce_team_staff_limit();

-- 5) Calendario del equipo: eventos al mes, repetición y recordatorios
alter table public.team_calendar_events
  add column if not exists repeat_rule text not null default 'none',
  add column if not exists repeat_until timestamptz,
  add column if not exists reminder_minutes integer[] not null default '{240}';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'team_calendar_events_repeat_check') then
    alter table public.team_calendar_events add constraint team_calendar_events_repeat_check check (repeat_rule in ('none', 'weekly', 'monthly'));
  end if;
end $$;

create or replace function public.enforce_team_event_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_plan text;
begin
  if not public.team_is_regular(new.team_id) then return new; end if;
  v_plan := (public.platform_team_plan(new.team_id)).name;
  if tg_op = 'INSERT' then
    v_limit := public.platform_team_limit(new.team_id, 'eventos_mes');
    if v_limit is not null and (select count(*) from public.team_calendar_events e
         where e.team_id = new.team_id and e.created_at >= date_trunc('month', now())) >= v_limit then
      raise exception 'El plan % del equipo permite % eventos al mes. Mejora el plan para crear más.', v_plan, v_limit;
    end if;
  end if;
  if new.repeat_rule <> 'none' and (tg_op = 'INSERT' or old.repeat_rule = 'none') then
    v_limit := public.platform_team_limit(new.team_id, 'eventos_repetidos');
    if v_limit is not null and (select count(*) from public.team_calendar_events e
         where e.team_id = new.team_id and e.id <> new.id and e.repeat_rule <> 'none'
           and (e.repeat_until is null or e.repeat_until > now())) >= v_limit then
      raise exception 'El plan % del equipo permite % evento(s) repetido(s). Mejora el plan para repetir más.', v_plan, v_limit;
    end if;
  end if;
  if coalesce(array_length(new.reminder_minutes, 1), 0) = 0 then new.reminder_minutes := array[240]; end if;
  v_limit := public.platform_team_limit(new.team_id, 'recordatorios_evento');
  if v_limit is not null and v_limit <= 1 then
    new.reminder_minutes := array[240];
  elsif v_limit is not null and array_length(new.reminder_minutes, 1) > v_limit then
    raise exception 'El plan % del equipo permite hasta % recordatorios por evento.', v_plan, v_limit;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_team_event_limits on public.team_calendar_events;
create trigger enforce_team_event_limits before insert or update on public.team_calendar_events
for each row execute function public.enforce_team_event_limits();

-- Guardar con división, repetición y recordatorios (la versión anterior sigue disponible).
create or replace function public.calendar_save_team_event_v2(
  p_id uuid, p_team uuid, p_title text, p_description text, p_location text, p_event_type text,
  p_starts timestamptz, p_ends timestamptz, p_division uuid, p_repeat text, p_repeat_until timestamptz, p_reminders integer[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.calendar_team_role(p_team);
  v_id uuid := p_id;
begin
  if (v_role is null or v_role = 'atleta') and not public.platform_can_manage_account('equipo', p_team) then
    raise exception 'Tu rol en este equipo no permite gestionar el calendario.';
  end if;
  if char_length(trim(coalesce(p_title, ''))) = 0 then raise exception 'El evento necesita un título.'; end if;
  if p_ends <= p_starts then raise exception 'La hora de fin debe ser posterior al inicio.'; end if;
  if p_event_type not in ('training', 'match', 'game', 'meeting', 'other') then raise exception 'Tipo de evento no válido.'; end if;
  if coalesce(p_repeat, 'none') not in ('none', 'weekly', 'monthly') then raise exception 'Repetición no válida.'; end if;
  if p_division is not null and not exists (select 1 from public.team_division_catalog d where d.id = p_division and d.team_id = p_team) then
    raise exception 'La división no pertenece al equipo.';
  end if;
  if p_id is null then
    insert into public.team_calendar_events (team_id, created_by, event_type, title, description, location, starts_at, ends_at, all_day, division_id, repeat_rule, repeat_until, reminder_minutes)
    values (p_team, auth.uid(), p_event_type, trim(p_title), nullif(trim(coalesce(p_description, '')), ''), nullif(trim(coalesce(p_location, '')), ''),
      p_starts, p_ends, false, p_division, coalesce(p_repeat, 'none'), p_repeat_until, coalesce(p_reminders, array[240]))
    returning id into v_id;
  else
    if not public.calendar_can_edit_team_event(p_id) and not public.platform_can_manage_account('equipo', p_team) then
      raise exception 'No tienes permiso para editar este evento.';
    end if;
    update public.team_calendar_events set event_type = p_event_type, title = trim(p_title),
      description = nullif(trim(coalesce(p_description, '')), ''), location = nullif(trim(coalesce(p_location, '')), ''),
      starts_at = p_starts, ends_at = p_ends, division_id = p_division, repeat_rule = coalesce(p_repeat, 'none'),
      repeat_until = p_repeat_until, reminder_minutes = coalesce(p_reminders, array[240])
    where id = p_id and team_id = p_team;
  end if;
  return v_id;
end;
$$;
revoke all on function public.calendar_save_team_event_v2(uuid, uuid, text, text, text, text, timestamptz, timestamptz, uuid, text, timestamptz, integer[]) from public, anon;
grant execute on function public.calendar_save_team_event_v2(uuid, uuid, text, text, text, text, timestamptz, timestamptz, uuid, text, timestamptz, integer[]) to authenticated;

-- Calendario de la cuenta de equipo: eventos del equipo con sus repeticiones.
create or replace function public.calendar_team_feed(p_team uuid, p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if public.calendar_team_role(p_team) is null and not public.platform_can_manage_account('equipo', p_team) then
    raise exception 'No puedes ver el calendario de este equipo.';
  end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_at), '[]'::jsonb) into v_result
  from (
    select 'team'::text as source, e.id, e.team_id as owner_id, coalesce(d.name, t.name) as owner_name, e.title, e.description,
      e.location, e.event_type::text as event_type, e.starts_at + occ.shift as starts_at, e.ends_at + occ.shift as ends_at, e.all_day,
      occ.n as occurrence, e.repeat_rule, a.response as my_response,
      (public.calendar_can_edit_team_event(e.id) or public.platform_can_manage_account('equipo', p_team)) as can_edit,
      e.repeat_until, e.reminder_minutes, e.division_id
    from public.team_calendar_events e
    join public.teams t on t.id = e.team_id
    left join public.team_division_catalog d on d.id = e.division_id
    left join public.calendar_attendance a on a.source = 'team' and a.event_id = e.id and a.user_id = auth.uid()
    cross join lateral (
      select n, case e.repeat_rule when 'weekly' then make_interval(weeks => n) when 'monthly' then make_interval(months => n) else make_interval() end as shift
      from generate_series(0, 300) as n where e.repeat_rule <> 'none' or n = 0
    ) occ
    where e.team_id = p_team
      and (e.repeat_until is null or e.starts_at + occ.shift <= e.repeat_until)
      and e.starts_at + occ.shift < p_to and e.ends_at + occ.shift > p_from
  ) x;
  return v_result;
end;
$$;
revoke all on function public.calendar_team_feed(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.calendar_team_feed(uuid, timestamptz, timestamptz) to authenticated;

-- El feed personal también repite los eventos de equipo.
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
      e.location, e.event_type::text as event_type, e.starts_at + occ.shift as starts_at, e.ends_at + occ.shift as ends_at, e.all_day,
      occ.n as occurrence, e.repeat_rule, a.response as my_response, public.calendar_can_edit_team_event(e.id) as can_edit
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
      e.repeat_rule, a.response, false
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
      pa.starts_at + occ.shift, pa.ends_at + occ.shift, pa.all_day, occ.n, pa.repeat_rule, null::text, true
    from public.personal_activities pa
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
$$;

-- Recordatorios: los eventos de equipo usan sus minutos y repeticiones.
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
  with due as (
    select distinct m.user_id, e.id as event_id, e.starts_at + occ.shift as occurrence_start, r.minutes
    from public.team_calendar_events e
    join public.team_user_memberships m on m.team_id = e.team_id and m.status = 'active' and m.user_id is not null
    cross join lateral unnest(e.reminder_minutes) as r(minutes)
    cross join lateral (
      select case e.repeat_rule when 'weekly' then make_interval(weeks => k) when 'monthly' then make_interval(months => k) else make_interval() end as shift
      from generate_series(0, 300) as k where e.repeat_rule <> 'none' or k = 0
    ) occ
    where (e.repeat_until is null or e.starts_at + occ.shift <= e.repeat_until)
      and e.starts_at + occ.shift > now()
      and e.starts_at + occ.shift <= now() + make_interval(mins => r.minutes)
  ), new_rows as (
    insert into public.calendar_reminders_sent (user_id, source, event_id, starts_at, minutes_before)
    select d.user_id, 'team', d.event_id, d.occurrence_start, d.minutes from due d
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
    select distinct m.user_id, e.id as event_id, e.starts_at + occ.shift as occurrence_start, r.minutes
    from public.organization_calendar_events e
    join public.organization_members m on m.organization_id = e.organization_id and m.status = 'active' and m.user_id is not null
    cross join lateral unnest(e.reminder_minutes) as r(minutes)
    cross join lateral (
      select case e.repeat_rule when 'weekly' then make_interval(weeks => k) when 'monthly' then make_interval(months => k) else make_interval() end as shift
      from generate_series(0, 300) as k where e.repeat_rule <> 'none' or k = 0
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
      select case pa.repeat_rule when 'weekly' then make_interval(weeks => k) when 'monthly' then make_interval(months => k) else make_interval() end as shift
      from generate_series(0, 300) as k where pa.repeat_rule <> 'none' or k = 0
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

-- Permisos de edición por evento: desde Pro.
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
  if v_team is null then raise exception 'El evento no existe.'; end if;
  v_role := public.calendar_team_role(v_team);
  if v_role not in ('owner', 'directivo', 'entrenador') then
    raise exception 'Solo el coach o el directivo otorgan permisos sobre eventos.';
  end if;
  if p_granted and not public.platform_team_feature(v_team, 'permisos_evento') then
    raise exception 'Los permisos de edición por evento son parte del plan Pro del equipo.';
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

-- 6) Torneos rápidos creados por el equipo
create or replace function public.enforce_team_tournament_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  if new.organizer_team_id is null or new.organization_id is not null or not new.is_quick or new.status = 'finished' then return new; end if;
  if tg_op = 'UPDATE' and old.organizer_team_id is not distinct from new.organizer_team_id
     and old.is_quick is not distinct from new.is_quick and old.status is distinct from 'finished' then return new; end if;
  v_limit := public.platform_team_limit(new.organizer_team_id, 'torneos_rapidos');
  if v_limit is not null and (select count(*) from public.tournaments x where x.organizer_team_id = new.organizer_team_id
       and x.organization_id is null and x.is_quick and x.status <> 'finished' and x.id <> new.id) >= v_limit then
    raise exception 'El plan % del equipo permite % torneo(s) rápido(s) activo(s). Finaliza uno o mejora el plan.', (public.platform_team_plan(new.organizer_team_id)).name, v_limit;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_team_tournament_limit on public.tournaments;
create trigger enforce_team_tournament_limit before insert or update of status, organizer_team_id, is_quick on public.tournaments
for each row execute function public.enforce_team_tournament_limit();

create or replace function public.enforce_team_tournament_size()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team uuid;
  v_limit integer;
begin
  select x.organizer_team_id into v_team from public.tournaments x
  where x.id = new.tournament_id and x.organization_id is null and x.is_quick;
  if v_team is null then return new; end if;
  v_limit := public.platform_team_limit(v_team, 'equipos_por_torneo');
  if v_limit is not null and (select count(*) from public.tournament_teams tt where tt.tournament_id = new.tournament_id and tt.id <> new.id) >= v_limit then
    raise exception 'El plan % del equipo permite hasta % equipos por torneo rápido.', (public.platform_team_plan(v_team)).name, v_limit;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_team_tournament_size on public.tournament_teams;
create trigger enforce_team_tournament_size before insert on public.tournament_teams
for each row execute function public.enforce_team_tournament_size();

-- 7) Temporada del equipo
alter table public.teams
  add column if not exists season_start date,
  add column if not exists season_end date,
  add column if not exists fee_reminders_enabled boolean not null default true;

create or replace function public.team_season(p_team uuid)
returns table (starts_on date, ends_on date)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(t.season_start, date_trunc('year', current_date)::date),
         coalesce(t.season_end, (date_trunc('year', current_date) + interval '1 year - 1 day')::date)
  from public.teams t where t.id = p_team;
$$;

create or replace function public.team_set_season(p_team uuid, p_start date, p_end date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.team_is_manager(p_team) then raise exception 'Solo el propietario o un directivo define la temporada.'; end if;
  if p_start is null or p_end is null or p_end <= p_start then raise exception 'La fecha de fin debe ser posterior al inicio.'; end if;
  update public.teams set season_start = p_start, season_end = p_end where id = p_team;
end;
$$;

-- 8) Finanzas
create table if not exists public.team_treasurers (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create or replace function public.team_finance_access(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.team_is_manager(p_team)
      or exists (select 1 from public.team_treasurers tr where tr.team_id = p_team and tr.user_id = auth.uid());
$$;

create table if not exists public.team_finance_accounts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create table if not exists public.team_finance_categories (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  kind text not null check (kind in ('ingreso', 'gasto')),
  created_at timestamptz not null default now(),
  unique (team_id, name, kind)
);

create table if not exists public.team_finance_movements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  kind text not null check (kind in ('ingreso', 'gasto', 'transferencia')),
  amount numeric(12,2) not null check (amount > 0),
  occurred_on date not null default current_date,
  category text,
  concept text not null check (char_length(trim(concept)) between 1 and 160),
  division_id uuid references public.team_division_catalog(id) on delete set null,
  note text,
  account_id uuid references public.team_finance_accounts(id) on delete set null,
  to_account_id uuid references public.team_finance_accounts(id) on delete set null,
  receipt_path text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists team_finance_movements_team_date on public.team_finance_movements (team_id, occurred_on desc);

create table if not exists public.team_fee_settings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  division_id uuid references public.team_division_catalog(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  unique nulls not distinct (team_id, division_id)
);

create table if not exists public.team_fee_payments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  status text not null check (status in ('pagado', 'pendiente', 'exento')),
  amount numeric(10,2),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  unique (team_id, user_id, month)
);

create table if not exists public.team_fee_reminders_sent (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  sent_at timestamptz not null default now(),
  primary key (team_id, user_id, month)
);

create table if not exists public.team_budgets (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table if not exists public.team_budget_lines (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.team_budgets(id) on delete cascade,
  category text not null,
  amount numeric(12,2) not null check (amount >= 0),
  unique (budget_id, category)
);

create table if not exists public.team_finance_sponsors (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  period text not null default 'mensual' check (period in ('mensual', 'anual', 'unico')),
  ends_on date,
  contract_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.team_finance_audit (
  id bigserial primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  movement_id uuid,
  action text not null check (action in ('creado', 'editado', 'eliminado')),
  actor uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Categorías base de todos los planes
create or replace function public.team_finance_base_categories()
returns text[]
language sql
immutable
as $$ select array['Cuotas', 'Inscripciones', 'Uniformes', 'Arbitraje', 'Transporte', 'Cancha', 'Patrocinios', 'Otros']; $$;

-- Movimientos: límite al mes, comprobantes desde Pro y categorías válidas.
create or replace function public.enforce_team_movement_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  if tg_op = 'INSERT' then
    v_limit := public.platform_team_limit(new.team_id, 'movimientos_mes');
    if v_limit is not null and (select count(*) from public.team_finance_movements m
         where m.team_id = new.team_id and m.created_at >= date_trunc('month', now())) >= v_limit then
      raise exception 'El plan % del equipo permite % movimientos al mes. Mejora el plan para registrar más.', (public.platform_team_plan(new.team_id)).name, v_limit;
    end if;
  end if;
  if new.receipt_path is not null and (tg_op = 'INSERT' or old.receipt_path is distinct from new.receipt_path)
     and not public.platform_team_feature(new.team_id, 'comprobantes') then
    raise exception 'Adjuntar comprobantes es parte del plan Pro del equipo.';
  end if;
  if new.kind <> 'transferencia' and new.category is not null and not (new.category = any(public.team_finance_base_categories()))
     and not exists (select 1 from public.team_finance_categories c where c.team_id = new.team_id and c.name = new.category) then
    raise exception 'La categoría "%" no existe en el equipo.', new.category;
  end if;
  if new.kind = 'transferencia' and (new.account_id is null or new.to_account_id is null or new.account_id = new.to_account_id) then
    raise exception 'Una transferencia necesita una caja de origen y otra de destino.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists enforce_team_movement_rules on public.team_finance_movements;
create trigger enforce_team_movement_rules before insert or update on public.team_finance_movements
for each row execute function public.enforce_team_movement_rules();

-- Registro de cambios (se guarda siempre; se ve en Élite)
create or replace function public.audit_team_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.team_finance_audit (team_id, movement_id, action, actor, details)
    values (new.team_id, new.id, 'creado', auth.uid(), jsonb_build_object('concept', new.concept, 'amount', new.amount, 'kind', new.kind));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.team_finance_audit (team_id, movement_id, action, actor, details)
    values (new.team_id, new.id, 'editado', auth.uid(), jsonb_build_object('concept', new.concept, 'amount_before', old.amount, 'amount', new.amount));
    return new;
  end if;
  insert into public.team_finance_audit (team_id, movement_id, action, actor, details)
  values (old.team_id, old.id, 'eliminado', auth.uid(), jsonb_build_object('concept', old.concept, 'amount', old.amount));
  return old;
end;
$$;
drop trigger if exists audit_team_movement on public.team_finance_movements;
create trigger audit_team_movement after insert or update or delete on public.team_finance_movements
for each row execute function public.audit_team_movement();

-- Alerta de presupuesto (Élite): avisa al pasar del 90 % de una categoría.
create or replace function public.alert_team_budget()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_spent numeric;
begin
  if new.kind <> 'gasto' or new.category is null or not public.platform_team_feature(new.team_id, 'alertas_presupuesto') then return new; end if;
  for r in select b.id, b.name, b.starts_on, b.ends_on, l.amount from public.team_budgets b
           join public.team_budget_lines l on l.budget_id = b.id and l.category = new.category
           where b.team_id = new.team_id and b.is_active and new.occurred_on between b.starts_on and b.ends_on and l.amount > 0 loop
    select coalesce(sum(m.amount), 0) into v_spent from public.team_finance_movements m
    where m.team_id = new.team_id and m.kind = 'gasto' and m.category = new.category and m.occurred_on between r.starts_on and r.ends_on;
    if v_spent >= r.amount * 0.9 and v_spent - new.amount < r.amount * 0.9 then
      insert into public.user_notifications (recipient_user_id, title, body)
      select distinct m.user_id, 'Alerta de presupuesto',
        new.category || ' llegó al ' || round(100 * v_spent / r.amount) || ' % del presupuesto "' || r.name || '".'
      from public.team_user_memberships m
      where m.team_id = new.team_id and m.status = 'active' and m.role in ('owner', 'directivo') and m.user_id is not null;
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists alert_team_budget on public.team_finance_movements;
create trigger alert_team_budget after insert on public.team_finance_movements
for each row execute function public.alert_team_budget();

create or replace function public.enforce_team_finance_features()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_plan text := (public.platform_team_plan(new.team_id)).name;
begin
  if tg_table_name = 'team_finance_categories' then
    if not public.platform_team_feature(new.team_id, 'categorias_propias') then raise exception 'Las categorías propias son parte del plan Pro del equipo.'; end if;
  elsif tg_table_name = 'team_fee_settings' then
    if new.division_id is not null and not public.platform_team_feature(new.team_id, 'cuota_por_division') then raise exception 'La cuota por división es parte del plan Pro del equipo.'; end if;
  elsif tg_table_name = 'team_finance_sponsors' then
    if not public.platform_team_feature(new.team_id, 'patrocinios') then raise exception 'Los patrocinios son parte del plan Pro del equipo.'; end if;
  elsif tg_table_name = 'team_treasurers' then
    if tg_op = 'INSERT' then
      v_limit := public.platform_team_limit(new.team_id, 'tesoreros');
      if v_limit is not null and (select count(*) from public.team_treasurers t where t.team_id = new.team_id) >= v_limit then
        raise exception 'El plan % del equipo permite % tesorero(s).', v_plan, v_limit;
      end if;
    end if;
  elsif tg_table_name = 'team_budgets' then
    if new.is_active and (tg_op = 'INSERT' or not coalesce((to_jsonb(old) ->> 'is_active')::boolean, false)) then
      v_limit := public.platform_team_limit(new.team_id, 'presupuestos');
      if v_limit is not null and (select count(*) from public.team_budgets b where b.team_id = new.team_id and b.is_active and b.id <> new.id) >= v_limit then
        raise exception 'El plan % del equipo permite % presupuesto(s) activo(s).', v_plan, v_limit;
      end if;
    end if;
  elsif tg_table_name = 'team_fee_payments' then
    if tg_op = 'INSERT' then
      v_limit := public.platform_team_limit(new.team_id, 'jugadores_cuota');
      if v_limit is not null and (select count(distinct p.user_id) from public.team_fee_payments p
           where p.team_id = new.team_id and p.month = new.month and p.user_id <> new.user_id) >= v_limit then
        raise exception 'El plan % del equipo permite llevar la cuota de % jugadores.', v_plan, v_limit;
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_team_finance_features on public.team_finance_categories;
create trigger enforce_team_finance_features before insert on public.team_finance_categories for each row execute function public.enforce_team_finance_features();
drop trigger if exists enforce_team_finance_features on public.team_fee_settings;
create trigger enforce_team_finance_features before insert or update on public.team_fee_settings for each row execute function public.enforce_team_finance_features();
drop trigger if exists enforce_team_finance_features on public.team_finance_sponsors;
create trigger enforce_team_finance_features before insert on public.team_finance_sponsors for each row execute function public.enforce_team_finance_features();
drop trigger if exists enforce_team_finance_features on public.team_treasurers;
create trigger enforce_team_finance_features before insert on public.team_treasurers for each row execute function public.enforce_team_finance_features();
drop trigger if exists enforce_team_finance_features on public.team_budgets;
create trigger enforce_team_finance_features before insert or update on public.team_budgets for each row execute function public.enforce_team_finance_features();
drop trigger if exists enforce_team_finance_features on public.team_fee_payments;
create trigger enforce_team_finance_features before insert on public.team_fee_payments for each row execute function public.enforce_team_finance_features();


-- 0) Corrección: las divisiones del equipo están en team_division_catalog (team_divisions es de organizaciones).
drop trigger if exists enforce_team_division_limit on public.team_divisions;
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'team_finance_movements_division_id_fkey' and pg_get_constraintdef(oid) like '%team_divisions(%') then
    alter table public.team_finance_movements drop constraint team_finance_movements_division_id_fkey;
    alter table public.team_finance_movements add constraint team_finance_movements_division_id_fkey foreign key (division_id) references public.team_division_catalog(id) on delete set null;
  end if;
  if exists (select 1 from pg_constraint where conname = 'team_fee_settings_division_id_fkey' and pg_get_constraintdef(oid) like '%team_divisions(%') then
    alter table public.team_fee_settings drop constraint team_fee_settings_division_id_fkey;
    alter table public.team_fee_settings add constraint team_fee_settings_division_id_fkey foreign key (division_id) references public.team_division_catalog(id) on delete cascade;
  end if;
end $$;

-- Seguridad de filas: solo propietario, directivos y tesoreros; cada jugador ve su cuota.
do $$
declare t text;
begin
  foreach t in array array['team_finance_accounts', 'team_finance_categories', 'team_fee_settings', 'team_budgets', 'team_finance_sponsors'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists "Finance access" on public.%I', t);
    execute format('create policy "Finance access" on public.%I for all using (public.team_finance_access(team_id)) with check (public.team_finance_access(team_id))', t);
  end loop;
end $$;

alter table public.team_finance_movements enable row level security;
grant select, insert, update, delete on public.team_finance_movements to authenticated;
drop policy if exists "Finance read" on public.team_finance_movements;
create policy "Finance read" on public.team_finance_movements for select using (
  public.team_finance_access(team_id)
  and (public.platform_team_limit(team_id, 'historial_meses') is null
       or occurred_on >= (date_trunc('month', current_date) - make_interval(months => public.platform_team_limit(team_id, 'historial_meses') - 1))::date));
drop policy if exists "Finance write" on public.team_finance_movements;
create policy "Finance write" on public.team_finance_movements for insert with check (public.team_finance_access(team_id));
drop policy if exists "Finance update" on public.team_finance_movements;
create policy "Finance update" on public.team_finance_movements for update using (public.team_finance_access(team_id)) with check (public.team_finance_access(team_id));
drop policy if exists "Finance delete" on public.team_finance_movements;
create policy "Finance delete" on public.team_finance_movements for delete using (public.team_finance_access(team_id));

alter table public.team_budget_lines enable row level security;
grant select, insert, update, delete on public.team_budget_lines to authenticated;
drop policy if exists "Finance access" on public.team_budget_lines;
create policy "Finance access" on public.team_budget_lines for all
  using (exists (select 1 from public.team_budgets b where b.id = budget_id and public.team_finance_access(b.team_id)))
  with check (exists (select 1 from public.team_budgets b where b.id = budget_id and public.team_finance_access(b.team_id)));

alter table public.team_fee_payments enable row level security;
grant select, insert, update, delete on public.team_fee_payments to authenticated;
drop policy if exists "Fee read" on public.team_fee_payments;
create policy "Fee read" on public.team_fee_payments for select using (public.team_finance_access(team_id) or user_id = auth.uid());
drop policy if exists "Fee write" on public.team_fee_payments;
create policy "Fee write" on public.team_fee_payments for insert with check (public.team_finance_access(team_id));
drop policy if exists "Fee update" on public.team_fee_payments;
create policy "Fee update" on public.team_fee_payments for update using (public.team_finance_access(team_id)) with check (public.team_finance_access(team_id));
drop policy if exists "Fee delete" on public.team_fee_payments;
create policy "Fee delete" on public.team_fee_payments for delete using (public.team_finance_access(team_id));

alter table public.team_treasurers enable row level security;
grant select, insert, delete on public.team_treasurers to authenticated;
drop policy if exists "Treasurers read" on public.team_treasurers;
create policy "Treasurers read" on public.team_treasurers for select using (public.team_finance_access(team_id) or user_id = auth.uid());
drop policy if exists "Treasurers manage" on public.team_treasurers;
create policy "Treasurers manage" on public.team_treasurers for insert with check (public.team_is_manager(team_id));
drop policy if exists "Treasurers remove" on public.team_treasurers;
create policy "Treasurers remove" on public.team_treasurers for delete using (public.team_is_manager(team_id));

alter table public.team_finance_audit enable row level security;
grant select on public.team_finance_audit to authenticated;
drop policy if exists "Audit read" on public.team_finance_audit;
create policy "Audit read" on public.team_finance_audit for select using (public.team_finance_access(team_id) and public.platform_team_feature(team_id, 'auditoria'));

alter table public.team_fee_reminders_sent enable row level security;

-- Comprobantes y contratos: almacenamiento privado por equipo (carpeta = id del equipo).
insert into storage.buckets (id, name, public) values ('team-finance', 'team-finance', false) on conflict (id) do nothing;
drop policy if exists "Team finance files read" on storage.objects;
create policy "Team finance files read" on storage.objects for select to authenticated
  using (bucket_id = 'team-finance' and public.team_finance_access(((storage.foldername(name))[1])::uuid));
drop policy if exists "Team finance files write" on storage.objects;
create policy "Team finance files write" on storage.objects for insert to authenticated
  with check (bucket_id = 'team-finance' and public.team_finance_access(((storage.foldername(name))[1])::uuid)
              and (public.platform_team_feature(((storage.foldername(name))[1])::uuid, 'comprobantes')
                   or public.platform_team_feature(((storage.foldername(name))[1])::uuid, 'patrocinios')));
drop policy if exists "Team finance files delete" on storage.objects;
create policy "Team finance files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'team-finance' and public.team_finance_access(((storage.foldername(name))[1])::uuid));

-- Tablero de cuotas del mes: jugadores (atletas activos), su división y su estado.
create or replace function public.team_fee_board(p_team uuid, p_month date)
returns table (user_id uuid, player_name text, division_id uuid, division_name text, fee numeric, status text, pending_months integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_month date := date_trunc('month', p_month)::date;
begin
  if not public.team_finance_access(p_team) then raise exception 'No tienes acceso a las finanzas de este equipo.'; end if;
  return query
  with players as (
    select distinct on (m.user_id) m.user_id, m.division_id from public.team_user_memberships m
    where m.team_id = p_team and m.status = 'active' and m.role = 'atleta' and m.user_id is not null
    order by m.user_id, m.created_at
  )
  select p.user_id, coalesce(nullif(trim(pr.full_name), ''), 'Jugador'), p.division_id, d.name,
    coalesce((select s.amount from public.team_fee_settings s where s.team_id = p_team and s.division_id = p.division_id),
             (select s.amount from public.team_fee_settings s where s.team_id = p_team and s.division_id is null), 0),
    coalesce(fp.status, 'pendiente'),
    (select count(*)::integer from public.team_fee_payments x where x.team_id = p_team and x.user_id = p.user_id and x.status = 'pendiente' and x.month <= v_month)
  from players p
  left join public.profiles pr on pr.id = p.user_id
  left join public.team_division_catalog d on d.id = p.division_id
  left join public.team_fee_payments fp on fp.team_id = p_team and fp.user_id = p.user_id and fp.month = v_month
  order by 2;
end;
$$;

-- Recordatorio de cuota pendiente (todos los planes): desde el día 5, una vez al mes.
create or replace function public.team_send_fee_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date := date_trunc('month', current_date)::date;
  n integer := 0;
begin
  if extract(day from current_date) < 5 then return 0; end if;
  with due as (
    select p.team_id, p.user_id, t.name from public.team_fee_payments p
    join public.teams t on t.id = p.team_id and t.fee_reminders_enabled
    where p.month = v_month and p.status = 'pendiente'
  ), sent as (
    insert into public.team_fee_reminders_sent (team_id, user_id, month)
    select d.team_id, d.user_id, v_month from due d
    on conflict do nothing
    returning team_id, user_id
  )
  insert into public.user_notifications (recipient_user_id, title, body)
  select s.user_id, 'Cuota pendiente', 'Tu cuota de ' || to_char(v_month, 'TMMonth') || ' en ' || t.name || ' está pendiente.'
  from sent s join public.teams t on t.id = s.team_id;
  get diagnostics n = row_count;
  return n;
end;
$$;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'athlonx-fee-reminders';
    perform cron.schedule('athlonx-fee-reminders', '0 14 * * *', 'select public.team_send_fee_reminders()');
  end if;
end $$;

-- 9) Uso del plan del equipo (tarjetas "Límites del plan")
create or replace function public.platform_team_usage(p_team uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan public.plans%rowtype;
begin
  if public.calendar_team_role(p_team) is null and not public.platform_can_manage_account('equipo', p_team) and not public.team_finance_access(p_team) then
    raise exception 'No puedes ver el uso de este equipo.';
  end if;
  select * into v_plan from public.platform_team_plan(p_team);
  return jsonb_build_object(
    'plan', v_plan.name, 'code', v_plan.code, 'limits', v_plan.limits, 'flags', v_plan.feature_flags,
    'usage', jsonb_build_object(
      'divisiones', (select count(*) from public.team_division_catalog d where d.team_id = p_team),
      'jugadores_division', coalesce((select max(c) from (select count(*) c from public.team_players p where p.team_id = p_team group by p.division_id) z), 0),
      'cuerpo_tecnico', (select count(distinct m.user_id) from public.team_user_memberships m where m.team_id = p_team and m.role in ('entrenador', 'staff', 'directivo') and m.status in ('active', 'pending')),
      'eventos_mes', (select count(*) from public.team_calendar_events e where e.team_id = p_team and e.created_at >= date_trunc('month', now())),
      'eventos_repetidos', (select count(*) from public.team_calendar_events e where e.team_id = p_team and e.repeat_rule <> 'none' and (e.repeat_until is null or e.repeat_until > now())),
      'torneos_rapidos', (select count(*) from public.tournaments x where x.organizer_team_id = p_team and x.organization_id is null and x.is_quick and x.status <> 'finished'),
      'movimientos_mes', (select count(*) from public.team_finance_movements m where m.team_id = p_team and m.created_at >= date_trunc('month', now())),
      'jugadores_cuota', (select count(distinct f.user_id) from public.team_fee_payments f where f.team_id = p_team and f.month = date_trunc('month', current_date)::date),
      'tesoreros', (select count(*) from public.team_treasurers t where t.team_id = p_team),
      'presupuestos', (select count(*) from public.team_budgets b where b.team_id = p_team and b.is_active)
    ),
    'season', (select jsonb_build_object('starts_on', s.starts_on, 'ends_on', s.ends_on) from public.team_season(p_team) s)
  );
end;
$$;

-- 10) Estadísticas deportivas del equipo (temporada; comparar temporadas desde Pro)
create or replace function public.team_season_stats(p_team uuid, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_from date := p_from;
  v_to date := p_to;
begin
  if public.calendar_team_role(p_team) is null and not public.platform_can_manage_account('equipo', p_team) then
    raise exception 'No puedes ver las estadísticas de este equipo.';
  end if;
  if not public.platform_team_feature(p_team, 'comparar_temporadas') then
    select s.starts_on, s.ends_on into v_from, v_to from public.team_season(p_team) s;
  end if;
  return jsonb_build_object(
    'from', v_from, 'to', v_to,
    'summary', (select jsonb_build_object(
        'jugados', count(*),
        'ganados', count(*) filter (where (m.local_team_id = p_team and m.local_score > m.visitor_score) or (m.visitor_team_id = p_team and m.visitor_score > m.local_score)),
        'empatados', count(*) filter (where m.local_score = m.visitor_score),
        'perdidos', count(*) filter (where (m.local_team_id = p_team and m.local_score < m.visitor_score) or (m.visitor_team_id = p_team and m.visitor_score < m.local_score)))
      from public.matches m
      where m.status = 'finished' and (m.local_team_id = p_team or m.visitor_team_id = p_team)
        and coalesce(m.finished_at, m.started_at)::date between v_from and v_to),
    'players', coalesce((select jsonb_agg(row_to_json(z) order by z.puntos desc, z.nombre) from (
        select pl.full_name as nombre, coalesce(pl.position, '—') as posicion,
          count(distinct e.match_id) as partidos,
          count(*) filter (where e.event_type in ('try', 'goal', 'basket_inside', 'basket_outside', 'basket_free_throw')) as anotaciones,
          coalesce(sum(e.points), 0) as puntos,
          count(*) filter (where e.event_type in ('yellow_card', 'red_card')) as tarjetas
        from public.match_events e
        join public.matches m on m.id = e.match_id
        join public.players pl on pl.id = e.player_id
        where e.team_id = p_team and not coalesce(e.is_corrected, false) and m.status = 'finished'
          and coalesce(m.finished_at, m.started_at)::date between v_from and v_to
        group by pl.id, pl.full_name, pl.position) z), '[]'::jsonb)
  );
end;
$$;

create or replace function public.team_compare_seasons(p_team uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.calendar_team_role(p_team) is null and not public.platform_can_manage_account('equipo', p_team) then
    raise exception 'No puedes ver las estadísticas de este equipo.';
  end if;
  if not public.platform_team_feature(p_team, 'comparar_temporadas') then
    raise exception 'Comparar temporadas es parte del plan Pro del equipo.';
  end if;
  return coalesce((select jsonb_agg(row_to_json(z) order by z.temporada desc) from (
    select extract(year from coalesce(m.finished_at, m.started_at))::integer as temporada, count(*) as jugados,
      count(*) filter (where (m.local_team_id = p_team and m.local_score > m.visitor_score) or (m.visitor_team_id = p_team and m.visitor_score > m.local_score)) as ganados
    from public.matches m
    where m.status = 'finished' and (m.local_team_id = p_team or m.visitor_team_id = p_team)
    group by 1) z), '[]'::jsonb);
end;
$$;

-- 11) Estadísticas de finanzas (Pro; costo y comparativa en Élite)
create or replace function public.team_finance_stats(p_team uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_from date;
  v_to date;
  v_month date := date_trunc('month', current_date)::date;
  v_result jsonb;
  v_avg numeric;
  v_balance numeric;
  v_months_left integer;
  v_elapsed numeric;
  v_players integer;
  v_matches integer;
  v_season_spent numeric;
begin
  if not public.team_finance_access(p_team) then raise exception 'No tienes acceso a las finanzas de este equipo.'; end if;
  if not public.platform_team_feature(p_team, 'estadisticas_finanzas') then raise exception 'Las estadísticas de finanzas son parte del plan Pro del equipo.'; end if;
  select s.starts_on, s.ends_on into v_from, v_to from public.team_season(p_team) s;
  select coalesce(sum(case when kind = 'ingreso' then amount when kind = 'gasto' then -amount else 0 end), 0) into v_balance
  from public.team_finance_movements where team_id = p_team and occurred_on between v_from and v_to;
  select coalesce(avg(net), 0) into v_avg from (
    select sum(case when kind = 'ingreso' then amount when kind = 'gasto' then -amount else 0 end) as net
    from public.team_finance_movements where team_id = p_team and occurred_on >= (v_month - interval '3 months') and occurred_on < v_month
    group by date_trunc('month', occurred_on)) z;
  v_months_left := greatest(0, (extract(year from age(v_to, current_date)) * 12 + extract(month from age(v_to, current_date)))::integer);
  v_result := jsonb_build_object(
    'monthly', coalesce((select jsonb_agg(row_to_json(z) order by z.mes) from (
        select to_char(g.mes, 'YYYY-MM') as mes,
          coalesce(sum(m.amount) filter (where m.kind = 'ingreso'), 0) as ingresos,
          coalesce(sum(m.amount) filter (where m.kind = 'gasto'), 0) as gastos
        from generate_series(v_month - interval '11 months', v_month, interval '1 month') as g(mes)
        left join public.team_finance_movements m on m.team_id = p_team and date_trunc('month', m.occurred_on) = g.mes
        group by g.mes) z), '[]'::jsonb),
    'gastos_categoria', coalesce((select jsonb_agg(row_to_json(z) order by z.total desc) from (
        select coalesce(category, 'Otros') as categoria, sum(amount) as total from public.team_finance_movements
        where team_id = p_team and kind = 'gasto' and occurred_on between v_from and v_to group by 1) z), '[]'::jsonb),
    'ingresos_fuente', coalesce((select jsonb_agg(row_to_json(z) order by z.total desc) from (
        select coalesce(category, 'Otros') as categoria, sum(amount) as total from public.team_finance_movements
        where team_id = p_team and kind = 'ingreso' and occurred_on between v_from and v_to group by 1) z), '[]'::jsonb),
    'cuotas', (select jsonb_build_object('pagadas', count(*) filter (where status = 'pagado'), 'total', count(*) filter (where status <> 'exento'))
               from public.team_fee_payments where team_id = p_team and month = v_month),
    'morosos', coalesce((select jsonb_agg(row_to_json(z) order by z.meses desc) from (
        select coalesce(nullif(trim(pr.full_name), ''), 'Jugador') as nombre, count(*) as meses, sum(coalesce(p.amount, 0)) as monto
        from public.team_fee_payments p left join public.profiles pr on pr.id = p.user_id
        where p.team_id = p_team and p.status = 'pendiente' group by pr.full_name, p.user_id limit 5) z), '[]'::jsonb),
    'saldo_temporada', v_balance,
    'proyeccion', round(v_balance + v_avg * v_months_left, 2),
    'temporada', jsonb_build_object('desde', v_from, 'hasta', v_to)
  );
  if public.platform_team_feature(p_team, 'costo_jugador') then
    select coalesce(sum(amount), 0) into v_season_spent from public.team_finance_movements where team_id = p_team and kind = 'gasto' and occurred_on between v_from and least(v_to, current_date);
    v_elapsed := greatest(1, (extract(year from age(least(v_to, current_date), v_from)) * 12 + extract(month from age(least(v_to, current_date), v_from)) + 1));
    select count(*) into v_players from public.team_players where team_id = p_team;
    select count(*) into v_matches from public.matches m where m.status = 'finished' and (m.local_team_id = p_team or m.visitor_team_id = p_team)
      and coalesce(m.finished_at, m.started_at)::date between v_from and v_to;
    v_result := v_result || jsonb_build_object(
      'costo_jugador_mes', case when v_players > 0 then round(v_season_spent / v_elapsed / v_players, 2) end,
      'costo_partido', case when v_matches > 0 then round(v_season_spent / v_matches, 2) end);
  end if;
  if public.platform_team_feature(p_team, 'comparativa_finanzas') then
    v_result := v_result || jsonb_build_object('temporadas', coalesce((select jsonb_agg(row_to_json(z) order by z.anio desc) from (
        select extract(year from occurred_on)::integer as anio,
          coalesce(sum(amount) filter (where kind = 'ingreso'), 0) as ingresos,
          coalesce(sum(amount) filter (where kind = 'gasto'), 0) as gastos
        from public.team_finance_movements where team_id = p_team group by 1) z), '[]'::jsonb));
  end if;
  return v_result;
end;
$$;

-- Permisos de ejecución
do $$
declare f text;
begin
  foreach f in array array[
    'platform_team_plan(uuid)', 'platform_team_limit(uuid, text)', 'platform_team_feature(uuid, text)', 'team_is_regular(uuid)', 'team_is_manager(uuid)',
    'team_finance_access(uuid)', 'team_season(uuid)', 'team_set_season(uuid, date, date)', 'team_fee_board(uuid, date)', 'platform_team_usage(uuid)',
    'team_season_stats(uuid, date, date)', 'team_compare_seasons(uuid)', 'team_finance_stats(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  revoke all on function public.team_send_fee_reminders() from public, anon, authenticated;
end $$;

-- AthlonX: planes de la cuenta de organización (Free, Pro y Élite) con sus límites y funciones.
-- Basado en el Excel aprobado (PLANES_ORGANIZACION_PROPUESTA) y las decisiones del 2026-11-03.
-- Los controles se aplican a lo que se crea o se reactiva desde ahora; lo existente sigue funcionando.
-- Idempotente.

-- 1) Catálogo por tipo de cuenta
alter table public.plans
  add column if not exists account_type text not null default 'persona',
  add column if not exists price_pending boolean not null default false,
  add column if not exists limits jsonb not null default '{}'::jsonb,
  add column if not exists feature_flags jsonb not null default '{}'::jsonb;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'plans_account_type_check') then
    alter table public.plans add constraint plans_account_type_check check (account_type in ('persona', 'equipo', 'organizacion'));
  end if;
end $$;

insert into public.plans (code, name, kind, account_type, monthly_price, annual_enabled, annual_price, seats,
  personal_activity_monthly_limit, price_pending, limits, feature_flags, features, sort_order)
values
  ('org_free', 'Free', 'individual', 'organizacion', 0, false, null, 1, null, false,
   '{"equipos_afiliados": 3, "equipos_propios": 3, "directivos_staff": 2, "eventos_mes": 5, "torneos_rapidos": 1, "torneos_oficiales": 0, "recordatorios_evento": 1}'::jsonb,
   '{"repetir_eventos": false, "sincronizacion": false, "vista_equipos": false, "asistencia_equipos": false, "participantes": false, "reportes": false, "logo_reportes": false, "patrocinios": false, "planes_grupo": false, "torneos_oficiales": false}'::jsonb,
   '["Hasta 3 equipos afiliados y 3 equipos propios", "Hasta 2 directivos y staff", "5 eventos de la organización al mes", "Recordatorio fijo de 4 horas", "1 torneo rápido activo, con liga o final directa"]'::jsonb, 10),
  ('org_pro', 'Pro', 'individual', 'organizacion', 0, false, null, 1, null, true,
   '{"equipos_afiliados": 15, "equipos_propios": 15, "directivos_staff": 10, "eventos_mes": 30, "torneos_rapidos": 5, "torneos_oficiales": 3, "recordatorios_evento": 5}'::jsonb,
   '{"repetir_eventos": true, "sincronizacion": true, "vista_equipos": true, "asistencia_equipos": true, "participantes": true, "reportes": true, "logo_reportes": false, "patrocinios": false, "planes_grupo": true, "torneos_oficiales": true}'::jsonb,
   '["Hasta 15 equipos afiliados y 15 equipos propios", "Hasta 10 directivos y staff", "30 eventos al mes, con repetición", "Hasta 5 recordatorios por evento", "Sincronización con Google y Outlook", "Vista de todos los equipos con choques", "Asistencia resumida por equipo", "5 torneos rápidos y 3 oficiales activos, con liga o final directa", "Reportes PDF y CSV", "Lista de participantes", "Planes de grupo (AX Club)"]'::jsonb, 11),
  ('org_elite', 'Élite', 'individual', 'organizacion', 0, false, null, 1, null, true,
   '{"equipos_afiliados": null, "equipos_propios": null, "directivos_staff": null, "eventos_mes": null, "torneos_rapidos": null, "torneos_oficiales": null, "recordatorios_evento": null}'::jsonb,
   '{"repetir_eventos": true, "sincronizacion": true, "vista_equipos": true, "asistencia_equipos": true, "participantes": true, "reportes": true, "logo_reportes": true, "patrocinios": true, "planes_grupo": true, "torneos_oficiales": true}'::jsonb,
   '["Equipos, personas, eventos y torneos sin límite", "Torneos y ligas activas sin límite", "Patrocinios en torneos", "Reportes PDF y CSV con tu logotipo", "Lista de participantes", "Planes de grupo (AX Club)"]'::jsonb, 12)
on conflict (code) do nothing;

-- 2) Plan, límites y funciones de una organización (sin plan asignado: Free)
create or replace function public.platform_org_plan(p_org uuid)
returns public.plans
language sql
stable
security definer
set search_path = public
as $$
  select p.* from public.plans p
  where p.code = coalesce(
    (select ap.plan_code from public.account_plans ap
     join public.plans pp on pp.code = ap.plan_code and pp.account_type = 'organizacion'
     where ap.account_type = 'organizacion' and ap.account_id = p_org
       and (ap.ends_at is null or ap.ends_at > now())),
    'org_free');
$$;

-- null = sin límite
create or replace function public.platform_org_limit(p_org uuid, p_key text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (p.limits ->> p_key)::integer from public.platform_org_plan(p_org) p;
$$;

create or replace function public.platform_org_feature(p_org uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((p.feature_flags ->> p_key)::boolean, false) from public.platform_org_plan(p_org) p;
$$;

-- 3) Eventos de la organización por mes calendario
create or replace function public.enforce_org_event_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := public.platform_org_limit(new.organization_id, 'eventos_mes');
  v_count integer;
begin
  if v_limit is null then return new; end if;
  select count(*) into v_count from public.organization_calendar_events
  where organization_id = new.organization_id and created_at >= date_trunc('month', now());
  if v_count >= v_limit then
    raise exception 'El plan % de la organización permite % eventos al mes. Mejora el plan para crear más.',
      (public.platform_org_plan(new.organization_id)).name, v_limit;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_org_event_limit on public.organization_calendar_events;
create trigger enforce_org_event_limit before insert on public.organization_calendar_events
for each row execute function public.enforce_org_event_limit();

-- 4) Torneos activos (rápidos y oficiales). Solo cuenta altas y reactivaciones.
create or replace function public.enforce_org_tournament_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
  v_plan text;
begin
  if new.organization_id is null or new.status = 'finished' then return new; end if;
  if tg_op = 'UPDATE' and old.organization_id is not distinct from new.organization_id
     and old.is_quick is not distinct from new.is_quick and old.status is distinct from 'finished' then
    return new;
  end if;
  v_plan := (public.platform_org_plan(new.organization_id)).name;
  if not new.is_quick and not public.platform_org_feature(new.organization_id, 'torneos_oficiales') then
    raise exception 'Los torneos oficiales no están incluidos en el plan % de la organización. Mejora a Pro para crearlos.', v_plan;
  end if;
  v_limit := public.platform_org_limit(new.organization_id, case when new.is_quick then 'torneos_rapidos' else 'torneos_oficiales' end);
  if v_limit is null then return new; end if;
  select count(*) into v_count from public.tournaments t
  where t.organization_id = new.organization_id and t.status <> 'finished'
    and t.is_quick = new.is_quick and t.id <> new.id;
  if v_count >= v_limit then
    raise exception 'El plan % de la organización permite % % activos. Finaliza uno o mejora el plan.',
      v_plan, v_limit, case when new.is_quick then 'torneos rápidos' else 'torneos oficiales' end;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_org_tournament_limit on public.tournaments;
create trigger enforce_org_tournament_limit before insert or update of status, organization_id, is_quick on public.tournaments
for each row execute function public.enforce_org_tournament_limit();

-- 5) Directivos y staff de la organización (miembros activos y pendientes)
create or replace function public.enforce_org_staff_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.role not in ('directivo', 'staff') or new.status not in ('active', 'pending') then return new; end if;
  if tg_op = 'UPDATE' and old.role in ('directivo', 'staff') and old.status in ('active', 'pending') then return new; end if;
  v_limit := public.platform_org_limit(new.organization_id, 'directivos_staff');
  if v_limit is null then return new; end if;
  select count(*) into v_count from public.organization_members m
  where m.organization_id = new.organization_id and m.role in ('directivo', 'staff')
    and m.status in ('active', 'pending') and m.id is distinct from new.id;
  if v_count >= v_limit then
    raise exception 'El plan % de la organización permite % directivos y staff. Mejora el plan para invitar más.',
      (public.platform_org_plan(new.organization_id)).name, v_limit;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_org_staff_limit on public.organization_members;
create trigger enforce_org_staff_limit before insert or update of role, status on public.organization_members
for each row execute function public.enforce_org_staff_limit();

-- 6) Invitaciones a directivos y staff (cuentan junto con los miembros)
create or replace function public.enforce_org_invite_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.source_organization_id is null or new.target_user_id is null
     or coalesce(new.role, '') not in ('directivo', 'staff') or coalesce(new.status, '') <> 'pending' then
    return new;
  end if;
  v_limit := public.platform_org_limit(new.source_organization_id, 'directivos_staff');
  if v_limit is null then return new; end if;
  select (select count(*) from public.organization_members m
          where m.organization_id = new.source_organization_id and m.role in ('directivo', 'staff') and m.status in ('active', 'pending'))
       + (select count(*) from public.affiliation_requests r
          where r.source_organization_id = new.source_organization_id and r.target_user_id is not null
            and r.role in ('directivo', 'staff') and r.status = 'pending')
  into v_count;
  if v_count >= v_limit then
    raise exception 'El plan % de la organización permite % directivos y staff. Mejora el plan para invitar más.',
      (public.platform_org_plan(new.source_organization_id)).name, v_limit;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_org_invite_limit on public.affiliation_requests;
create trigger enforce_org_invite_limit before insert on public.affiliation_requests
for each row execute function public.enforce_org_invite_limit();

-- 7) Equipos de la organización: propios (creados por su dueño o un directivo) y afiliados (de otros dueños).
--    Los equipos temporales de torneos rápidos no cuentan.
create or replace function public.org_team_is_own(p_org uuid, p_created_by uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.organizations o where o.id = p_org and o.created_by = p_created_by)
      or exists (select 1 from public.organization_members m
                 where m.organization_id = p_org and m.user_id = p_created_by and m.status = 'active' and m.role in ('owner', 'directivo'));
$$;

create or replace function public.enforce_org_team_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_own boolean;
  v_limit integer;
  v_count integer;
begin
  if new.organization_id is null or new.temporary_tournament_id is not null then return new; end if;
  if tg_op = 'UPDATE' and old.organization_id is not distinct from new.organization_id then return new; end if;
  v_own := public.org_team_is_own(new.organization_id, new.created_by);
  v_limit := public.platform_org_limit(new.organization_id, case when v_own then 'equipos_propios' else 'equipos_afiliados' end);
  if v_limit is null then return new; end if;
  select count(*) into v_count from public.teams t
  where t.organization_id = new.organization_id and t.id <> new.id and t.temporary_tournament_id is null
    and public.org_team_is_own(t.organization_id, t.created_by) = v_own;
  if v_count >= v_limit then
    raise exception 'El plan % de la organización permite % %. Mejora el plan para agregar más.',
      (public.platform_org_plan(new.organization_id)).name, v_limit, case when v_own then 'equipos propios' else 'equipos afiliados' end;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_org_team_limit on public.teams;
create trigger enforce_org_team_limit before insert or update of organization_id on public.teams
for each row execute function public.enforce_org_team_limit();

-- 8) Plan de la cuenta: catálogo según el tipo de cuenta (equipo usa por ahora el de persona)
create or replace function public.platform_account_plan(p_account_type text, p_account_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_catalog text := case when p_account_type = 'organizacion' then 'organizacion' else 'persona' end;
  v_default text := case when p_account_type = 'organizacion' then 'org_free' else 'libre' end;
  v_plan public.plans%rowtype;
  v_ap public.account_plans%rowtype;
begin
  if not public.platform_can_manage_account(p_account_type, p_account_id) then
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
    'ends_at', v_ap.ends_at, 'is_free', v_plan.code in ('libre', 'org_free')
  );
end;
$$;

-- 9) Canje: el plan debe ser del catálogo de la cuenta. Con precio por definir solo vale un código del 100 %.
create or replace function public.platform_redeem_plan_code(
  p_account_type text, p_account_id uuid, p_plan_code text, p_promo_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catalog text := case when p_account_type = 'organizacion' then 'organizacion' else 'persona' end;
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
  if not found or p_plan_code in ('libre', 'org_free') then
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

-- 10) Vista de todos los equipos: por plan de la organización (Pro y Élite) o por plan personal Pro/Élite
create or replace function public.calendar_org_overview(p_org uuid, p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.organization_members m
    where m.organization_id = p_org and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner', 'directivo'))
    and not exists (select 1 from public.organizations o where o.id = p_org and o.created_by = auth.uid()) then
    raise exception 'Solo el directivo de la organización ve su calendario general.';
  end if;
  if not public.platform_org_feature(p_org, 'vista_equipos')
     and not exists (select 1 from public.calendar_current_plan() where unlimited) then
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

-- 11) Guardar plan desde el panel: al poner un precio mayor que cero deja de estar "por definir"
create or replace function public.platform_save_plan(
  p_code text, p_name text, p_kind text, p_monthly numeric, p_annual_enabled boolean,
  p_annual numeric, p_seats integer, p_limit integer, p_features jsonb, p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.platform_has('planes') then
    raise exception 'No tienes permiso para gestionar planes.';
  end if;
  insert into public.plans as p (code, name, kind, monthly_price, annual_enabled, annual_price, seats,
    personal_activity_monthly_limit, features, is_active, updated_at, updated_by)
  values (p_code, p_name, p_kind, p_monthly, p_annual_enabled, p_annual, p_seats,
    p_limit, coalesce(p_features, '[]'::jsonb), p_active, now(), auth.uid())
  on conflict (code) do update set
    name = excluded.name, kind = excluded.kind, monthly_price = excluded.monthly_price,
    annual_enabled = excluded.annual_enabled, annual_price = excluded.annual_price, seats = excluded.seats,
    personal_activity_monthly_limit = excluded.personal_activity_monthly_limit, features = excluded.features,
    is_active = excluded.is_active, updated_at = now(), updated_by = auth.uid(),
    price_pending = case when excluded.monthly_price > 0 then false else p.price_pending end;
end;
$$;

revoke all on function public.platform_org_plan(uuid) from public, anon;
revoke all on function public.platform_org_limit(uuid, text) from public, anon;
revoke all on function public.platform_org_feature(uuid, text) from public, anon;
revoke all on function public.org_team_is_own(uuid, uuid) from public, anon;
grant execute on function public.platform_org_plan(uuid) to authenticated;
grant execute on function public.platform_org_limit(uuid, text) to authenticated;
grant execute on function public.platform_org_feature(uuid, text) to authenticated;
grant execute on function public.org_team_is_own(uuid, uuid) to authenticated;

-- Planes de la cuenta persona por perfil: Free, Atleta Pro, Entrenador Pro y Pro Completo.
-- Cualquier Pro desbloquea el calendario personal (sincronización, actividades y repeticiones sin límite,
-- recordatorios personalizados). Atleta Pro suma las herramientas de atleta y Entrenador Pro las de entrenador.
-- Las reglas leen flags y límites del catálogo (editables desde el panel), no el código del plan.
-- Idempotente: se puede volver a ejecutar.

-- 1) Datos de presentación de cada plan en la página pública.
alter table public.plans add column if not exists tagline text;
alter table public.plans add column if not exists includes_plan text;

-- 2) Catálogo de la cuenta persona.
update public.plans set
  name = 'Free',
  tagline = coalesce(tagline, 'Gratis para todos'),
  feature_flags = '{"calendario_pro": false, "atleta_pro": false, "entrenador_pro": false}'::jsonb,
  limits = '{"equipos_entrenador": 1, "eventos_equipo_mes": 5, "recordatorios_evento": 1}'::jsonb,
  sort_order = 1
where code = 'libre';

insert into public.plans (code, name, kind, account_type, monthly_price, annual_enabled, annual_price, seats,
  personal_activity_monthly_limit, price_pending, features, feature_flags, limits, tagline, includes_plan, sort_order, is_active)
values
  ('atleta_pro', 'Atleta Pro', 'individual', 'persona', 0, false, null, 1, null, true,
   '["Sincronización con Google Calendar y Outlook", "Actividades personales sin límite", "Repetir actividades sin límite", "Recordatorios personalizados (hasta 5 por evento)", "Historial de estadísticas y comparar años"]'::jsonb,
   '{"calendario_pro": true, "atleta_pro": true, "entrenador_pro": false}'::jsonb,
   '{"equipos_entrenador": 1, "eventos_equipo_mes": 5, "recordatorios_evento": 5}'::jsonb,
   'Para jugar y organizar tu vida', 'libre', 2, true),
  ('entrenador_pro', 'Entrenador Pro', 'individual', 'persona', 0, false, null, 1, null, true,
   '["Sincronización con Google Calendar y Outlook", "Actividades personales sin límite", "Recordatorios personalizados (hasta 5 por evento)", "Hasta 3 equipos y eventos de equipo sin límite", "Formaciones, anuncios y reportes"]'::jsonb,
   '{"calendario_pro": true, "atleta_pro": false, "entrenador_pro": true}'::jsonb,
   '{"equipos_entrenador": 3, "eventos_equipo_mes": null, "recordatorios_evento": 5}'::jsonb,
   'Para dirigir tus equipos', 'libre', 3, true),
  ('pro_completo', 'Pro Completo', 'individual', 'persona', 0, false, null, 1, null, true,
   '["Todo lo de Atleta Pro y Entrenador Pro", "Un solo pago"]'::jsonb,
   '{"calendario_pro": true, "atleta_pro": true, "entrenador_pro": true}'::jsonb,
   '{"equipos_entrenador": 3, "eventos_equipo_mes": null, "recordatorios_evento": 5}'::jsonb,
   'Atleta y entrenador, con descuento', 'libre', 4, true)
on conflict (code) do nothing;

-- 3) Los planes persona anteriores (Pro y Élite) dejan de venderse. Quien los tenía pasa a Pro Completo.
update public.plans set is_active = false where code in ('pro', 'elite');
update public.account_plans set plan_code = 'pro_completo'
where account_type = 'persona' and plan_code in ('pro', 'elite');
-- Los códigos promocionales que aplicaban a Pro o Élite también aplican a los planes nuevos.
update public.promo_codes
set applies_to_plans = array(select distinct unnest(applies_to_plans || array['atleta_pro', 'entrenador_pro', 'pro_completo']))
where applies_to_plans && array['pro', 'elite'];

-- 4) Flags y límites del plan vigente de una persona (sin plan activo = Free).
create or replace function public.persona_flag(p_user uuid, p_flag text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((p.feature_flags ->> p_flag)::boolean, false)
  from public.plans p
  where p.code = coalesce((select ap.plan_code from public.account_plans ap
                           where ap.account_type = 'persona' and ap.account_id = p_user
                             and (ap.ends_at is null or ap.ends_at > now())
                           limit 1), 'libre');
$$;

create or replace function public.persona_limit(p_user uuid, p_key text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (p.limits ->> p_key)::integer
  from public.plans p
  where p.code = coalesce((select ap.plan_code from public.account_plans ap
                           where ap.account_type = 'persona' and ap.account_id = p_user
                             and (ap.ends_at is null or ap.ends_at > now())
                           limit 1), 'libre');
$$;

revoke all on function public.persona_flag(uuid, text) from public, anon, authenticated;
revoke all on function public.persona_limit(uuid, text) from public, anon, authenticated;

-- 5) Estadísticas propias: los años anteriores son de Atleta Pro.
create or replace function public.persona_personal_stats(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pro boolean;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión.'; end if;
  if p_from is null or p_to is null or p_from > p_to then raise exception 'El rango de fechas no es válido.'; end if;
  v_pro := public.persona_flag(v_uid, 'atleta_pro');
  if not v_pro and (extract(year from p_from) <> extract(year from current_date) or extract(year from p_to) <> extract(year from current_date)) then
    raise exception 'Tu plan permite ver solo el año actual. Los años anteriores son de Atleta Pro.';
  end if;
  return jsonb_build_object(
    'from', p_from, 'to', p_to, 'pro', v_pro,
    'teams', coalesce((select jsonb_agg(row_to_json(z) order by z.equipo) from (
        select e.team_id, t.name as equipo,
          count(distinct e.match_id) as partidos,
          count(*) filter (where e.event_type in ('try', 'goal', 'basket_inside', 'basket_outside', 'basket_free_throw')) as anotaciones,
          coalesce(sum(e.points), 0) as puntos,
          count(*) filter (where e.event_type in ('yellow_card', 'red_card')) as tarjetas
        from public.players pl
        join public.match_events e on e.player_id = pl.id
        join public.matches m on m.id = e.match_id
        join public.teams t on t.id = e.team_id
        where pl.user_id = v_uid and not coalesce(e.is_corrected, false) and m.status = 'finished'
          and coalesce(m.finished_at, m.started_at)::date between p_from and p_to
        group by e.team_id, t.name) z), '[]'::jsonb)
  );
end;
$$;

-- 6) Entrenador: eventos de equipo al mes según el límite de su plan (Free: 5; Entrenador Pro y Pro Completo: sin límite).
create or replace function public.enforce_coach_event_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_max integer;
  v_count integer;
  v_start timestamptz := date_trunc('month', now());
begin
  if new.created_by is null then return new; end if;
  select m.role into v_role from public.team_user_memberships m
  where m.team_id = new.team_id and m.user_id = new.created_by and m.status = 'active'
  order by case m.role when 'owner' then 1 when 'directivo' then 2 when 'entrenador' then 3 when 'staff' then 4 else 5 end
  limit 1;
  if v_role is distinct from 'entrenador' then return new; end if;

  v_max := public.persona_limit(new.created_by, 'eventos_equipo_mes');
  if v_max is null then return new; end if;

  select count(*) into v_count from public.team_calendar_events e
  where e.created_by = new.created_by
    and e.created_at >= v_start and e.created_at < v_start + interval '1 month'
    and exists (select 1 from public.team_user_memberships m
                where m.team_id = e.team_id and m.user_id = new.created_by and m.status = 'active' and m.role = 'entrenador');
  if v_count >= v_max then
    raise exception 'Tu plan permite % eventos de equipo al mes. Mejora a Entrenador Pro para crear más.', v_max;
  end if;
  return new;
end;
$$;

-- 7) Formaciones y anuncios del entrenador: requieren Entrenador Pro (o Pro Completo).
create or replace function public.enforce_persona_pro_for_coach()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if new.created_by is null then return new; end if;
  select m.role into v_role from public.team_user_memberships m
  where m.team_id = new.team_id and m.user_id = new.created_by and m.status = 'active'
  order by case m.role when 'owner' then 1 when 'directivo' then 2 when 'entrenador' then 3 when 'staff' then 4 else 5 end
  limit 1;
  if v_role is distinct from 'entrenador' then return new; end if;
  if not public.persona_flag(new.created_by, 'entrenador_pro') then
    raise exception 'Esta función es de Entrenador Pro. Mejora tu plan para usarla.';
  end if;
  return new;
end;
$$;

-- 8) Guardar plan desde el panel, con subtítulo, plan base, flags, límites, orden y "precio por definir".
create or replace function public.platform_save_plan_v2(
  p_code text, p_name text, p_monthly numeric, p_annual_enabled boolean, p_annual numeric, p_seats integer,
  p_limit integer, p_features jsonb, p_active boolean, p_tagline text, p_includes text, p_limits jsonb,
  p_flags jsonb, p_sort integer, p_price_pending boolean
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
  if p_includes is not null and (p_includes = p_code or not exists (select 1 from public.plans where code = p_includes)) then
    raise exception 'El plan base no es válido.';
  end if;
  update public.plans set
    name = p_name, monthly_price = p_monthly, annual_enabled = p_annual_enabled, annual_price = p_annual,
    seats = p_seats, personal_activity_monthly_limit = p_limit, features = coalesce(p_features, '[]'::jsonb),
    is_active = p_active, tagline = nullif(trim(coalesce(p_tagline, '')), ''), includes_plan = p_includes,
    limits = coalesce(p_limits, '{}'::jsonb), feature_flags = coalesce(p_flags, '{}'::jsonb),
    sort_order = coalesce(p_sort, sort_order), price_pending = coalesce(p_price_pending, price_pending),
    updated_at = now(), updated_by = auth.uid()
  where code = p_code;
  if not found then raise exception 'El plan no existe.'; end if;
end;
$$;

revoke all on function public.platform_save_plan_v2(text, text, numeric, boolean, numeric, integer, integer, jsonb, boolean, text, text, jsonb, jsonb, integer, boolean) from public, anon;
grant execute on function public.platform_save_plan_v2(text, text, numeric, boolean, numeric, integer, integer, jsonb, boolean, text, text, jsonb, jsonb, integer, boolean) to authenticated;

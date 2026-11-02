-- AthlonX: catálogo de planes, planes por cuenta, estadísticas e ingresos del panel.
-- Precios según documentos/athlonx-planes-y-precios.docx (USD). El anual solo existe en planes individuales.
-- Idempotente.

create table if not exists public.plans (
  code text primary key check (code ~ '^[a-z_]+$'),
  name text not null,
  kind text not null check (kind in ('individual', 'grupo')),
  monthly_price numeric(10,2) not null check (monthly_price >= 0),
  annual_enabled boolean not null default false,
  annual_price numeric(10,2) check (annual_price is null or annual_price >= 0),
  seats integer not null default 1 check (seats >= 1),
  personal_activity_monthly_limit integer check (personal_activity_monthly_limit is null or personal_activity_monthly_limit >= 0),
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint plans_annual_rule check (
    (annual_enabled and annual_price is not null and kind = 'individual')
    or (not annual_enabled and annual_price is null)
  )
);

alter table public.plans enable row level security;

drop policy if exists "Anyone can read active plans" on public.plans;
create policy "Anyone can read active plans"
on public.plans for select to anon, authenticated
using (is_active);

insert into public.plans (code, name, kind, monthly_price, annual_enabled, annual_price, seats, personal_activity_monthly_limit, features, sort_order)
values
  ('libre', 'Libre', 'individual', 0, false, null, 1, 5,
   '["Calendario y agenda de tu club", "Confirmar asistencia", "Hasta 5 actividades personales al mes", "Perfil personal, de equipo y de organización"]'::jsonb, 1),
  ('pro', 'Pro', 'individual', 4.99, true, 47.90, 1, null,
   '["Actividades personales ilimitadas", "Sincronización con Google y Outlook", "Actividades repetidas", "Recordatorios personalizados", "Estadísticas de asistencia", "Torneos oficiales por invitación"]'::jsonb, 2),
  ('elite', 'Élite', 'individual', 9.99, true, 95.90, 1, null,
   '["Todo lo de Pro", "Torneos de liga sin límite práctico", "Reportes en PDF y CSV", "Marca propia en reportes", "Patrocinios en torneos"]'::jsonb, 3),
  ('club_pro', 'Club Pro', 'grupo', 14.99, false, null, 6, null,
   '["Plan Pro para 6 cuentas", "El titular administra los cupos", "Invitación desde la plantilla"]'::jsonb, 4),
  ('club_elite', 'Club Élite', 'grupo', 29.99, false, null, 6, null,
   '["Plan Élite para 6 cuentas", "El titular administra los cupos", "Invitación desde la plantilla"]'::jsonb, 5)
on conflict (code) do nothing;

-- Plan vigente de cada cuenta. Sin datos personales: solo tipo, identificador y plan.
create table if not exists public.account_plans (
  account_type text not null check (account_type in ('persona', 'equipo', 'organizacion')),
  account_id uuid not null,
  plan_code text not null references public.plans(code),
  billing_period text not null default 'mensual' check (billing_period in ('mensual', 'anual')),
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  primary key (account_type, account_id)
);

alter table public.account_plans enable row level security;

-- Lectura y escritura solo por funciones del panel.

-- Guardar un plan del catálogo. Requiere el permiso "planes".
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
    name = excluded.name,
    kind = excluded.kind,
    monthly_price = excluded.monthly_price,
    annual_enabled = excluded.annual_enabled,
    annual_price = excluded.annual_price,
    seats = excluded.seats,
    personal_activity_monthly_limit = excluded.personal_activity_monthly_limit,
    features = excluded.features,
    is_active = excluded.is_active,
    updated_at = now(),
    updated_by = auth.uid();
end;
$$;

-- Lista completa del catálogo, incluidos los planes inactivos. Requiere "planes".
create or replace function public.platform_list_plans()
returns setof public.plans
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.platform_has('planes') then
    raise exception 'No tienes permiso para ver planes.';
  end if;
  return query select * from public.plans order by sort_order, code;
end;
$$;

-- Conteos generales de cuentas. Requiere "estadisticas". No devuelve datos personales.
create or replace function public.platform_account_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.platform_has('estadisticas') then
    raise exception 'No tienes permiso para ver estadísticas.';
  end if;
  return jsonb_build_object(
    'personas', (select count(*) from public.profiles),
    'equipos', (select count(*) from public.teams),
    'organizaciones', (select count(*) from public.organizations),
    'con_plan_pagado', (select count(*) from public.account_plans where plan_code <> 'libre'),
    'por_plan', coalesce((
      select jsonb_object_agg(plan_code, n) from (
        select plan_code, count(*) as n from public.account_plans group by plan_code
      ) x
    ), '{}'::jsonb)
  );
end;
$$;

-- Ingresos y altas por plan. Requiere "ingresos". Propietario y administrador lo tienen por defecto.
create or replace function public.platform_revenue_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.platform_has('ingresos') then
    raise exception 'No tienes permiso para ver ingresos.';
  end if;
  return jsonb_build_object(
    'ingreso_mensual', coalesce((
      select sum(case when ap.billing_period = 'anual' then p.annual_price / 12 else p.monthly_price end)
      from public.account_plans ap join public.plans p on p.code = ap.plan_code
    ), 0),
    'cuentas_totales', (select count(*) from public.account_plans),
    'por_plan', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', p.code,
        'name', p.name,
        'cuentas', coalesce(s.cuentas, 0),
        'precio_mensual', p.monthly_price,
        'ingreso_mensual', coalesce(s.ingreso, 0),
        'altas_mes', coalesce(s.altas, 0)
      ) order by p.sort_order)
      from public.plans p
      left join (
        select ap.plan_code,
          count(*) as cuentas,
          sum(case when ap.billing_period = 'anual' then pl.annual_price / 12 else pl.monthly_price end) as ingreso,
          count(*) filter (where ap.started_at >= date_trunc('month', now())) as altas
        from public.account_plans ap join public.plans pl on pl.code = ap.plan_code
        group by ap.plan_code
      ) s on s.plan_code = p.code
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.platform_save_plan(text, text, text, numeric, boolean, numeric, integer, integer, jsonb, boolean) from public, anon;
revoke all on function public.platform_list_plans() from public, anon;
revoke all on function public.platform_account_stats() from public, anon;
revoke all on function public.platform_revenue_summary() from public, anon;
grant execute on function public.platform_save_plan(text, text, text, numeric, boolean, numeric, integer, integer, jsonb, boolean) to authenticated;
grant execute on function public.platform_list_plans() to authenticated;
grant execute on function public.platform_account_stats() to authenticated;
grant execute on function public.platform_revenue_summary() to authenticated;

-- AthlonX: códigos promocionales del panel administrativo.
-- Descuento en porcentaje (0 a 100) o en monto fijo (USD). Límite de usos y fecha de vencimiento opcionales.
-- Idempotente.

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,30}$'),
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  amount numeric(10,2) not null check (amount > 0),
  check (discount_type <> 'percent' or amount <= 100),
  applies_to_plans text[] not null default '{}',
  max_uses integer check (max_uses is null or max_uses > 0),
  uses_count integer not null default 0 check (uses_count >= 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

alter table public.promo_codes enable row level security;
-- Sin políticas: solo se lee y escribe mediante funciones del panel.

-- Crear o editar un código. Requiere el permiso "promociones".
create or replace function public.platform_save_promo(
  p_id uuid, p_code text, p_type text, p_amount numeric, p_plans text[],
  p_max_uses integer, p_starts timestamptz, p_ends timestamptz, p_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_code text := upper(trim(p_code));
begin
  if not public.platform_has('promociones') then
    raise exception 'No tienes permiso para gestionar promociones.';
  end if;
  if exists (select unnest(coalesce(p_plans, '{}'::text[])) except select code from public.plans) then
    raise exception 'Hay planes que no existen en el catálogo.';
  end if;

  if p_id is null then
    insert into public.promo_codes (code, discount_type, amount, applies_to_plans, max_uses, starts_at, ends_at, is_active, created_by)
    values (v_code, p_type, p_amount, coalesce(p_plans, '{}'::text[]), p_max_uses, coalesce(p_starts, now()), p_ends, p_active, auth.uid())
    returning id into v_id;
  else
    update public.promo_codes set
      code = v_code,
      discount_type = p_type,
      amount = p_amount,
      applies_to_plans = coalesce(p_plans, '{}'::text[]),
      max_uses = p_max_uses,
      starts_at = coalesce(p_starts, starts_at),
      ends_at = p_ends,
      is_active = p_active
    where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'El código no existe.'; end if;
  end if;
  return v_id;
end;
$$;

-- Lista de códigos. Requiere "promociones".
create or replace function public.platform_list_promos()
returns setof public.promo_codes
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.platform_has('promociones') then
    raise exception 'No tienes permiso para ver promociones.';
  end if;
  return query select * from public.promo_codes order by created_at desc;
end;
$$;

revoke all on function public.platform_save_promo(uuid, text, text, numeric, text[], integer, timestamptz, timestamptz, boolean) from public, anon;
revoke all on function public.platform_list_promos() from public, anon;
grant execute on function public.platform_save_promo(uuid, text, text, numeric, text[], integer, timestamptz, timestamptz, boolean) to authenticated;
grant execute on function public.platform_list_promos() to authenticated;

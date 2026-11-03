-- AthlonX: plan de cada cuenta y canje de códigos promocionales desde Mi perfil.
-- Sin pasarela de pago: un código solo activa un plan cuando deja el precio en US$ 0.
-- Si el precio final es mayor, el código se valida pero no activa nada hasta que exista el pago.
-- Idempotente.

-- Verifica que el usuario actual puede administrar la cuenta indicada.
-- persona: la propia cuenta. equipo y organizacion: quien la creó.
create or replace function public.platform_can_manage_account(p_account_type text, p_account_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return false; end if;
  if p_account_type = 'persona' then
    return p_account_id = auth.uid();
  elsif p_account_type = 'equipo' then
    return exists (select 1 from public.teams t where t.id = p_account_id and t.created_by = auth.uid());
  elsif p_account_type = 'organizacion' then
    return exists (select 1 from public.organizations o where o.id = p_account_id and o.created_by = auth.uid());
  end if;
  return false;
end;
$$;

-- Plan vigente de una cuenta. Sin fila en account_plans, la cuenta está en Libre.
create or replace function public.platform_account_plan(p_account_type text, p_account_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan public.plans%rowtype;
  v_ap public.account_plans%rowtype;
begin
  if not public.platform_can_manage_account(p_account_type, p_account_id) then
    raise exception 'No puedes ver el plan de esta cuenta.';
  end if;

  select * into v_ap from public.account_plans
  where account_type = p_account_type and account_id = p_account_id
    and (ends_at is null or ends_at > now());

  if found then
    select * into v_plan from public.plans where code = v_ap.plan_code;
  else
    select * into v_plan from public.plans where code = 'libre';
  end if;

  return jsonb_build_object(
    'code', v_plan.code,
    'name', v_plan.name,
    'monthly_price', v_plan.monthly_price,
    'personal_activity_monthly_limit', v_plan.personal_activity_monthly_limit,
    'features', v_plan.features,
    'ends_at', v_ap.ends_at,
    'is_free', v_plan.code = 'libre'
  );
end;
$$;

-- Canjea un código para un plan. Valida el código, calcula el precio final y solo activa si queda en US$ 0.
create or replace function public.platform_redeem_plan_code(
  p_account_type text, p_account_id uuid, p_plan_code text, p_promo_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.plans%rowtype;
  v_promo public.promo_codes%rowtype;
  v_code text := upper(trim(coalesce(p_promo_code, '')));
  v_final numeric(10,2);
begin
  if not public.platform_can_manage_account(p_account_type, p_account_id) then
    raise exception 'No puedes cambiar el plan de esta cuenta.';
  end if;

  select * into v_plan from public.plans where code = p_plan_code and is_active and kind = 'individual';
  if not found or p_plan_code = 'libre' then
    raise exception 'Elige Pro o Élite.';
  end if;

  select * into v_promo from public.promo_codes where code = v_code for update;
  if not found or not v_promo.is_active then
    raise exception 'El código no es válido.';
  end if;
  if v_promo.starts_at > now() or (v_promo.ends_at is not null and v_promo.ends_at <= now()) then
    raise exception 'El código no está vigente.';
  end if;
  if v_promo.max_uses is not null and v_promo.uses_count >= v_promo.max_uses then
    raise exception 'El código ya no tiene usos disponibles.';
  end if;
  if not (p_plan_code = any(v_promo.applies_to_plans)) then
    raise exception 'El código no aplica a este plan.';
  end if;

  v_final := case when v_promo.discount_type = 'percent'
    then round(v_plan.monthly_price * (1 - v_promo.amount / 100), 2)
    else greatest(0, v_plan.monthly_price - v_promo.amount) end;

  if v_final > 0 then
    raise exception 'Con este código el plan queda en US$ %. El pago aún no está disponible.', v_final;
  end if;

  insert into public.account_plans (account_type, account_id, plan_code, billing_period, started_at, ends_at)
  values (p_account_type, p_account_id, v_plan.code, 'mensual', now(), now() + interval '1 month')
  on conflict (account_type, account_id) do update set
    plan_code = excluded.plan_code,
    billing_period = excluded.billing_period,
    started_at = excluded.started_at,
    ends_at = excluded.ends_at;

  update public.promo_codes set uses_count = uses_count + 1 where id = v_promo.id;

  return jsonb_build_object('activated', true, 'plan', v_plan.name, 'ends_at', now() + interval '1 month');
end;
$$;

revoke all on function public.platform_can_manage_account(text, uuid) from public, anon;
revoke all on function public.platform_account_plan(text, uuid) from public, anon;
revoke all on function public.platform_redeem_plan_code(text, uuid, text, text) from public, anon;
grant execute on function public.platform_can_manage_account(text, uuid) to authenticated;
grant execute on function public.platform_account_plan(text, uuid) to authenticated;
grant execute on function public.platform_redeem_plan_code(text, uuid, text, text) to authenticated;

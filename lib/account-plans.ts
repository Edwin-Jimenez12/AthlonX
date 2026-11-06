// Planes por cuenta: lectura del plan vigente y canje de códigos. La base de datos valida permisos y reglas.
import { supabase } from './supabase'

export type AccountType = 'persona' | 'equipo' | 'organizacion'

export type PlanLimits = Partial<Record<string, number | null>>

export type AccountPlan = {
  code: string
  name: string
  account_type: 'persona' | 'equipo' | 'organizacion'
  price_pending: boolean
  limits: PlanLimits
  feature_flags: Record<string, boolean>
  monthly_price: number
  personal_activity_monthly_limit: number | null
  features: string[]
  ends_at: string | null
  is_free: boolean
}

export type CatalogPlan = {
  code: string
  name: string
  tagline?: string | null
  includes_plan?: string | null
  price_pending: boolean
  monthly_price: number
  annual_enabled: boolean
  annual_price: number | null
  features: string[]
}

// Flag del plan (calendario_pro, atleta_pro, entrenador_pro…). Sin plan o sin flag: falso.
export function planFlag(plan: AccountPlan | null | undefined, key: string) {
  return plan?.feature_flags?.[key] === true
}

// Límite del plan. null = sin límite; undefined = el plan no define ese límite.
export function planLimit(plan: AccountPlan | null | undefined, key: string): number | null | undefined {
  if (!plan?.limits || !(key in plan.limits)) return undefined
  return plan.limits[key] ?? null
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('La conexión no está disponible.')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

export function loadAccountPlan(accountType: AccountType, accountId: string) {
  return rpc<AccountPlan>('platform_account_plan', { p_account_type: accountType, p_account_id: accountId })
}

export function redeemPlanCode(accountType: AccountType, accountId: string, planCode: string, promoCode: string) {
  return rpc<{ activated: boolean; plan: string; ends_at: string }>('platform_redeem_plan_code', {
    p_account_type: accountType,
    p_account_id: accountId,
    p_plan_code: planCode,
    p_promo_code: promoCode,
  })
}

// Planes que se ofrecen según el tipo de cuenta: persona (Free, Atleta Pro, Entrenador Pro y Pro Completo),
// equipo u organización (Free, Pro y Élite).
// Los planes de grupo se venden aparte.
export async function loadUpgradePlans(accountType: AccountType): Promise<CatalogPlan[]> {
  if (!supabase) return []
  const catalog = accountType
  const { data, error } = await supabase
    .from('plans')
    .select('code, name, tagline, includes_plan, monthly_price, price_pending, annual_enabled, annual_price, features')
    .eq('is_active', true)
    .eq('kind', 'individual')
    .eq('account_type', catalog)
    .order('sort_order')
  if (error) throw new Error(error.message)
  return (data ?? []) as CatalogPlan[]
}

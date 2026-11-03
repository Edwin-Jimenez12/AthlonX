// Planes por cuenta: lectura del plan vigente y canje de códigos. La base de datos valida permisos y reglas.
import { supabase } from './supabase'

export type AccountType = 'persona' | 'equipo' | 'organizacion'

export type AccountPlan = {
  code: string
  name: string
  monthly_price: number
  personal_activity_monthly_limit: number | null
  features: string[]
  ends_at: string | null
  is_free: boolean
}

export type CatalogPlan = {
  code: string
  name: string
  monthly_price: number
  annual_enabled: boolean
  annual_price: number | null
  features: string[]
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

// Planes que se ofrecen a la cuenta (Libre, Pro y Élite). Los de grupo se venden aparte.
export async function loadUpgradePlans(): Promise<CatalogPlan[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('plans')
    .select('code, name, monthly_price, annual_enabled, annual_price, features')
    .eq('is_active', true)
    .in('code', ['libre', 'pro', 'elite'])
    .order('sort_order')
  if (error) throw new Error(error.message)
  return (data ?? []) as CatalogPlan[]
}

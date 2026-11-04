// Finanzas del equipo: reglas puras (saldos, totales y meses). Sin dependencias de React ni de Supabase.

export const BASE_CATEGORIES = ['Cuotas', 'Inscripciones', 'Uniformes', 'Arbitraje', 'Transporte', 'Cancha', 'Patrocinios', 'Otros']

export type Movement = {
  id: string
  kind: 'ingreso' | 'gasto' | 'transferencia'
  amount: number
  occurred_on: string
  category: string | null
  concept: string
  division_id: string | null
  note: string | null
  account_id: string | null
  to_account_id: string | null
  receipt_path: string | null
  created_by: string | null
  created_at: string
}
export type FinanceAccount = { id: string; name: string }
export type Division = { id: string; name: string }

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
export const money = (value: number | string | null | undefined) => usd.format(Number(value ?? 0))

export function monthStart(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

export function monthName(month: string) {
  const [y, m] = month.split('-').map(Number)
  const name = new Date(y, m - 1, 1).toLocaleDateString('es-PA', { month: 'long' })
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function nextMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  return monthStart(new Date(y, m, 1))
}

export function shortDate(day: string) {
  return new Date(`${day}T12:00:00`).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' })
}

// Saldo de cada caja según los movimientos.
export function accountBalances(accounts: FinanceAccount[], movements: Movement[]) {
  const map = new Map(accounts.map((a) => [a.id, 0]))
  for (const m of movements) {
    const amount = Number(m.amount)
    if (m.kind === 'ingreso' && m.account_id && map.has(m.account_id)) map.set(m.account_id, (map.get(m.account_id) ?? 0) + amount)
    if (m.kind === 'gasto' && m.account_id && map.has(m.account_id)) map.set(m.account_id, (map.get(m.account_id) ?? 0) - amount)
    if (m.kind === 'transferencia') {
      if (m.account_id && map.has(m.account_id)) map.set(m.account_id, (map.get(m.account_id) ?? 0) - amount)
      if (m.to_account_id && map.has(m.to_account_id)) map.set(m.to_account_id, (map.get(m.to_account_id) ?? 0) + amount)
    }
  }
  return map
}

export function totals(movements: Movement[]) {
  let ingresos = 0
  let gastos = 0
  for (const m of movements) {
    if (m.kind === 'ingreso') ingresos += Number(m.amount)
    if (m.kind === 'gasto') gastos += Number(m.amount)
  }
  return { ingresos, gastos, saldo: ingresos - gastos }
}

'use client'

import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatUsd } from '../../lib/admin'
import { loadAccountPlan, loadUpgradePlans, redeemPlanCode, type AccountPlan, type AccountType, type CatalogPlan } from '../../lib/account-plans'
import { Button, Notice, inputClass } from '../mi-equipo/ui'
import { Card } from './ui'

// Tarjeta de plan de la cuenta. "Mejorar plan" muestra los planes disponibles dentro de la misma tarjeta.
export function PlanCard({ accountType, accountId }: { accountType: AccountType; accountId: string }) {
  const [plan, setPlan] = useState<AccountPlan | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    try {
      setPlan(await loadAccountPlan(accountType, accountId))
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  useEffect(() => {
    void refresh()
    // Cambia solo cuando cambia la cuenta mostrada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountType, accountId])

  if (upgrading && plan) {
    return (
      <PlanUpgrade
        accountType={accountType}
        accountId={accountId}
        currentCode={plan.code}
        onBack={() => setUpgrading(false)}
        onActivated={async () => {
          setUpgrading(false)
          await refresh()
        }}
      />
    )
  }

  return (
    <Card title="Plan actual">
      {error && <Notice tone="danger" icon={Info}>{error}</Notice>}
      {plan && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="font-display text-[44px] uppercase leading-none text-[var(--ax-accent-text)]">{plan.name}</p>
              <p className="text-sm text-[var(--ax-text)]">{plan.is_free ? 'Gratis' : `${formatUsd(plan.monthly_price)} al mes`}</p>
            </div>
            <Button variant="primary" onClick={() => setUpgrading(true)}>Mejorar plan</Button>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--ax-muted)]">
            {plan.personal_activity_monthly_limit !== null
              ? <span>{plan.personal_activity_monthly_limit} actividades personales al mes</span>
              : <span>Actividades personales ilimitadas</span>}
            <span>{plan.ends_at ? `Vence el ${new Date(plan.ends_at).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Sin vencimiento'}</span>
          </div>
        </div>
      )}
    </Card>
  )
}

// Planes disponibles y campo de código promocional al comprar.
function PlanUpgrade({
  accountType,
  accountId,
  currentCode,
  onBack,
  onActivated,
}: {
  accountType: AccountType
  accountId: string
  currentCode: string
  onBack: () => void
  onActivated: () => void | Promise<void>
}) {
  const [plans, setPlans] = useState<CatalogPlan[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  useEffect(() => {
    loadUpgradePlans().then(setPlans).catch((err: Error) => setMessage({ tone: 'danger', text: err.message }))
  }, [])

  async function apply() {
    if (!selected) return
    setSaving(true)
    setMessage(null)
    try {
      const result = await redeemPlanCode(accountType, accountId, selected, code)
      setMessage({ tone: 'success', text: `Plan ${result.plan} activado.` })
      await onActivated()
    } catch (err) {
      setMessage({ tone: 'danger', text: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="Mejorar plan" action={<Button variant="secondary" onClick={onBack}>Volver</Button>}>
      {message && <Notice tone={message.tone === 'success' ? 'success' : 'danger'} icon={Info}>{message.text}</Notice>}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const current = plan.code === currentCode
          return (
            <div key={plan.code} className={`flex flex-col gap-3 rounded-[14px] border p-5 ${current ? 'border-[var(--ax-accent)]' : 'border-[var(--ax-line)]'}`}>
              <p className="font-display text-[36px] uppercase leading-none text-[var(--ax-accent-text)]">{plan.name}</p>
              <p className="text-base font-semibold text-[var(--ax-text)]">{plan.monthly_price === 0 ? 'Gratis' : `${formatUsd(plan.monthly_price)} / mes`}</p>
              {plan.annual_enabled && plan.annual_price !== null && (
                <p className="text-xs text-[var(--ax-muted)]">o {formatUsd(plan.annual_price)} al año</p>
              )}
              <ul className="flex flex-col gap-1.5 text-sm text-[var(--ax-text)]">
                {plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}
              </ul>
              <div className="mt-auto pt-2">
                {current
                  ? <Button variant="secondary" disabled className="w-full">Plan actual</Button>
                  : <Button variant="primary" className="w-full" onClick={() => setSelected(plan.code)}>Comprar {plan.name}</Button>}
              </div>
            </div>
          )
        })}
      </div>

      {selected && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-[var(--ax-line)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--ax-muted)]">Código promocional</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input className={inputClass} placeholder="Ingresa tu código" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button variant="primary" disabled={saving || !code.trim()} onClick={() => void apply()}>Aplicar código</Button>
          </div>
        </div>
      )}
    </Card>
  )
}

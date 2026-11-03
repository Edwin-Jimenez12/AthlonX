'use client'

import { Info } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatUsd } from '../../lib/admin'

function priceLabel(plan: { monthly_price: number; price_pending: boolean }) {
  if (plan.price_pending) return 'Precio por definir'
  return plan.monthly_price === 0 ? 'Gratis' : `${formatUsd(plan.monthly_price)} / mes`
}

function limitLabel(value: number | null | undefined, unit: string) {
  return value === null || value === undefined ? `${unit} sin límite` : `Hasta ${value} ${unit}`
}
import { loadAccountPlan, loadUpgradePlans, redeemPlanCode, type AccountPlan, type AccountType, type CatalogPlan } from '../../lib/account-plans'
import { Button, Notice, inputClass } from '../mi-equipo/ui'
import { Card } from './ui'

// Plan actual de la cuenta, según el diseño aprobado en REDISEÑO (Mi perfil · Cuenta).
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
    // Recarga solo cuando cambia la cuenta mostrada.
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
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-display text-[44px] uppercase leading-none text-[var(--ax-accent-text)]">{plan.name}</p>
            <Button variant="primary" className="w-[180px]" onClick={() => setUpgrading(true)}>Mejorar plan</Button>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="font-semibold text-[var(--ax-text)]">Precio: {plan.is_free ? 'Gratis' : priceLabel(plan)}</span>
            {accountType === 'organizacion' ? (
              <>
                <span className="text-[var(--ax-muted)]">{limitLabel(plan.limits?.equipos_afiliados, 'equipos afiliados')}</span>
                <span className="text-[var(--ax-muted)]">{plan.limits?.eventos_mes === null || plan.limits?.eventos_mes === undefined ? 'Eventos sin límite' : `${plan.limits.eventos_mes} eventos al mes`}</span>
              </>
            ) : (
              <span className="text-[var(--ax-muted)]">
                {plan.personal_activity_monthly_limit !== null
                  ? `${plan.personal_activity_monthly_limit} actividades personales por mes`
                  : 'Actividades personales ilimitadas'}
              </span>
            )}
            <span className="text-[var(--ax-muted)]">
              {plan.ends_at
                ? `Vence el ${new Date(plan.ends_at).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'Sin vencimiento'}
            </span>
          </div>
        </>
      )}
    </Card>
  )
}

// Mejorar plan: tres planes, botón Volver a cuenta y tarjeta de código promocional, como en el diseño.
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
  const promoRef = useRef<HTMLElement>(null)
  const selectedPlan = plans.find((plan) => plan.code === selected) ?? null

  useEffect(() => {
    loadUpgradePlans(accountType).then(setPlans).catch((err: Error) => setMessage({ tone: 'danger', text: err.message }))
  }, [accountType])

  // Al pulsar Comprar, el campo del código aparece y se muestra en pantalla.
  useEffect(() => {
    if (selected) promoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [selected])

  async function apply() {
    if (!selected) {
      setMessage({ tone: 'danger', text: 'Elige un plan con el botón Comprar.' })
      return
    }
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
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="secondary" onClick={onBack}>← Volver a cuenta</Button>
      </div>
      <p className="font-display text-[44px] uppercase leading-none text-[var(--ax-accent-text)]">Mejorar plan</p>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const current = plan.code === currentCode
          return (
            <article
              key={plan.code}
              className={`flex flex-col gap-3 rounded-[20px] border bg-[var(--ax-surface)] p-6 ${current ? 'border-[var(--ax-accent)]' : 'border-[var(--ax-line)]'}`}
            >
              <p className="font-display text-[44px] uppercase leading-none text-[var(--ax-accent-text)]">{plan.name}</p>
              <p className="text-[22px] font-semibold text-[var(--ax-text)]">{priceLabel(plan)}</p>
              {plan.annual_enabled && plan.annual_price !== null && (
                <p className="text-[13px] text-[var(--ax-muted)]">o {formatUsd(plan.annual_price)} al año</p>
              )}
              <ul className="flex flex-col gap-1.5 text-[13px] text-[var(--ax-text)]">
                {plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}
              </ul>
              <div className="mt-auto pt-3">
                {current
                  ? <Button variant="secondary" disabled className="w-full">Plan actual</Button>
                  : <Button variant="primary" className="w-full" onClick={() => { setSelected(plan.code); setMessage(null) }}>Comprar {plan.name}</Button>}
              </div>
            </article>
          )
        })}
      </div>

      {message && !selectedPlan && <Notice tone={message.tone === 'success' ? 'success' : 'danger'} icon={Info}>{message.text}</Notice>}
      {selectedPlan && (
        <section ref={promoRef} className="flex flex-col gap-4 rounded-[20px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-6">
          <p className="font-display text-[30px] uppercase leading-none text-[var(--ax-accent-text)]">Código promocional para {selectedPlan.name}</p>
          {message && <Notice tone={message.tone === 'success' ? 'success' : 'danger'} icon={Info}>{message.text}</Notice>}
          <input className={inputClass} placeholder="Ingresa tu código" value={code} onChange={(e) => setCode(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setSelected(null); setCode(''); setMessage(null) }}>Cancelar</Button>
            <Button variant="primary" className="w-[200px]" disabled={saving || !code.trim()} onClick={() => void apply()}>Aplicar código</Button>
          </div>
        </section>
      )}
    </div>
  )
}

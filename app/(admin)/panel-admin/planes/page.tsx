'use client'

import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { callPanel, useAdminAccess } from '../../../../Components/admin/admin-shell'
import { Button, Card, CardHeader, FieldLabel, Notice, PageHeader, Segment, inputClass } from '../../../../Components/mi-equipo/ui'
import { hasPermission, validatePlan, formatUsd } from '../../../../lib/admin'

type Plan = {
  code: string
  name: string
  kind: 'individual' | 'grupo'
  monthly_price: number
  annual_enabled: boolean
  annual_price: number | null
  seats: number
  personal_activity_monthly_limit: number | null
  features: string[]
  is_active: boolean
  account_type: 'persona' | 'equipo' | 'organizacion'
  price_pending: boolean
}

const accountLabels: Record<Plan['account_type'], string> = { persona: 'Persona', equipo: 'Equipo', organizacion: 'Organización' }

type Draft = {
  code: string
  name: string
  kind: 'individual' | 'grupo'
  monthly: string
  annualEnabled: boolean
  annual: string
  seats: string
  limit: string
  features: string
  active: boolean
}

function toDraft(plan: Plan): Draft {
  return {
    code: plan.code,
    name: plan.name,
    kind: plan.kind,
    monthly: String(plan.monthly_price),
    annualEnabled: plan.annual_enabled,
    annual: plan.annual_price === null ? '' : String(plan.annual_price),
    seats: String(plan.seats),
    limit: plan.personal_activity_monthly_limit === null ? '' : String(plan.personal_activity_monthly_limit),
    features: plan.features.join('\n'),
    active: plan.is_active,
  }
}

export default function PlanesAdminPage() {
  const access = useAdminAccess()
  const canEdit = hasPermission(access, 'planes')
  const [plans, setPlans] = useState<Plan[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  async function load() {
    const data = await callPanel<Plan[]>('platform_list_plans')
    setPlans(data)
    setDraft((current) => {
      if (!current) return current
      const fresh = data.find((plan) => plan.code === current.code)
      return fresh ? toDraft(fresh) : current
    })
  }

  useEffect(() => {
    if (!canEdit) return
    load().catch((err: Error) => setMessage({ tone: 'danger', text: err.message }))
    // Carga inicial del catálogo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit])

  if (!canEdit) return <Notice tone="warning" icon={Info}>No tienes permiso para gestionar planes.</Notice>

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
  }

  async function save() {
    if (!draft) return
    const features = draft.features.split('\n').map((line) => line.trim()).filter(Boolean)
    const limit = draft.limit.trim() === '' ? null : Number(draft.limit)
    const annual = draft.annualEnabled ? Number(draft.annual) : null
    const problem = validatePlan({
      name: draft.name,
      kind: draft.kind,
      monthly: Number(draft.monthly),
      annualEnabled: draft.annualEnabled,
      annual,
      seats: Number(draft.seats),
      limit,
      features,
    })
    if (problem) return setMessage({ tone: 'danger', text: problem })

    setSaving(true)
    setMessage(null)
    try {
      await callPanel('platform_save_plan', {
        p_code: draft.code,
        p_name: draft.name.trim(),
        p_kind: draft.kind,
        p_monthly: Number(draft.monthly),
        p_annual_enabled: draft.annualEnabled,
        p_annual: annual,
        p_seats: Number(draft.seats),
        p_limit: limit,
        p_features: features,
        p_active: draft.active,
      })
      setMessage({ tone: 'success', text: 'Plan guardado. Los cambios aparecen en la página pública de planes.' })
      await load()
    } catch (err) {
      setMessage({ tone: 'danger', text: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Planes"
        actions={<Button variant="secondary" onClick={() => void load()}>Actualizar</Button>}
      />
      {message && <Notice tone={message.tone === 'success' ? 'success' : 'danger'} icon={Info}>{message.text}</Notice>}
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card>
          <CardHeader id="planes-lista" title="Catálogo" />
          <ul className="mt-5 space-y-2">
            {plans.map((plan) => (
              <li key={plan.code}>
                <button
                  type="button"
                  onClick={() => setDraft(toDraft(plan))}
                  aria-current={draft?.code === plan.code ? 'true' : undefined}
                  className={
                    draft?.code === plan.code
                      ? 'w-full rounded-[14px] border border-[var(--ax-accent)] p-4 text-left'
                      : 'w-full rounded-[14px] border border-[var(--ax-line)] p-4 text-left hover:border-[var(--ax-line-strong)]'
                  }
                >
                  <span className="block font-display text-[26px] uppercase leading-none text-[var(--ax-accent-text)]">{plan.name}</span>
                  <span className="mt-2 block text-sm text-[var(--ax-text)]">{plan.price_pending ? 'Precio por definir' : `${formatUsd(plan.monthly_price)} al mes`}</span>
                  <span className="mt-1 block text-xs font-semibold text-[var(--ax-accent-text)]">{accountLabels[plan.account_type] ?? plan.account_type}</span>
                  <span className="mt-1 block text-xs text-[var(--ax-muted)]">
                    {plan.kind === 'grupo' ? `${plan.seats} cuentas` : plan.annual_enabled ? 'Mensual o anual' : 'Solo individual, sin anual'}
                    {!plan.is_active && ' · Inactivo'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {draft ? (
          <Card>
            <CardHeader id="planes-editor" title={`Editar ${draft.name}`} size="lg" />
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block">
                <FieldLabel>Nombre del plan</FieldLabel>
                <input className={inputClass} value={draft.name} disabled={!canEdit} onChange={(e) => update('name', e.target.value)} />
              </label>
              <div>
                <FieldLabel>Estado</FieldLabel>
                <div className="flex gap-2">
                  <Segment active={draft.active} label="Activo" onClick={() => update('active', true)} disabled={!canEdit} />
                  <Segment active={!draft.active} label="Inactivo" onClick={() => update('active', false)} disabled={!canEdit} />
                </div>
              </div>
              <label className="block">
                <FieldLabel>Precio mensual (US$)</FieldLabel>
                <input className={inputClass} inputMode="decimal" value={draft.monthly} disabled={!canEdit} onChange={(e) => update('monthly', e.target.value)} />
              </label>
              <div>
                <FieldLabel>Pago anual</FieldLabel>
                {draft.kind === 'grupo' ? (
                  <p className="text-sm text-[var(--ax-muted)]">Los planes de grupo solo se cobran al mes.</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Segment active={draft.annualEnabled} label="Disponible" onClick={() => update('annualEnabled', true)} disabled={!canEdit} />
                    <Segment active={!draft.annualEnabled} label="No disponible" onClick={() => update('annualEnabled', false)} disabled={!canEdit} />
                  </div>
                )}
              </div>
              {draft.kind === 'individual' && draft.annualEnabled && (
                <label className="block">
                  <FieldLabel>Precio anual (US$)</FieldLabel>
                  <input className={inputClass} inputMode="decimal" value={draft.annual} disabled={!canEdit} onChange={(e) => update('annual', e.target.value)} />
                </label>
              )}
              <label className="block">
                <FieldLabel>Cupos de la cuenta</FieldLabel>
                <input className={inputClass} inputMode="numeric" value={draft.seats} disabled={!canEdit} onChange={(e) => update('seats', e.target.value)} />
              </label>
              <label className="block">
                <FieldLabel>Límite de actividades personales al mes</FieldLabel>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  placeholder="Vacío = ilimitado"
                  value={draft.limit}
                  disabled={!canEdit}
                  onChange={(e) => update('limit', e.target.value)}
                />
              </label>
              <label className="block md:col-span-2">
                <FieldLabel>Funciones incluidas (una por línea)</FieldLabel>
                <textarea
                  className={`${inputClass} min-h-40 py-3`}
                  value={draft.features}
                  disabled={!canEdit}
                  onChange={(e) => update('features', e.target.value)}
                />
              </label>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDraft(null)}>Cerrar</Button>
              <Button variant="primary" onClick={() => void save()} disabled={!canEdit || saving}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-[var(--ax-muted)]">Elige un plan del catálogo para editarlo.</p>
          </Card>
        )}
      </div>
    </>
  )
}

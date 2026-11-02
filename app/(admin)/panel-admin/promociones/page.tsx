'use client'

import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { callPanel, useAdminAccess } from '../../../../Components/admin/admin-shell'
import { Button, Card, CardHeader, FieldLabel, Notice, PageHeader, Segment, inputClass } from '../../../../Components/mi-equipo/ui'
import { formatUsd, hasPermission, promoStatus, validatePromo, normalizePromoCode, type PromoStatus } from '../../../../lib/admin'

type Promo = {
  id: string
  code: string
  discount_type: 'percent' | 'fixed'
  amount: number
  applies_to_plans: string[]
  max_uses: number | null
  uses_count: number
  starts_at: string
  ends_at: string | null
  is_active: boolean
}

// Planes a los que puede aplicar un código. El servidor valida que existan en el catálogo.
const planOptions = [
  { code: 'pro', name: 'Pro' },
  { code: 'elite', name: 'Élite' },
  { code: 'club_pro', name: 'Club Pro' },
  { code: 'club_elite', name: 'Club Élite' },
  { code: 'libre', name: 'Libre' },
]

// Fechas en hora de Panamá (UTC-5): inicio a las 00:00 y vencimiento al final del día.
function startIso(date: string) {
  return `${date}T00:00:00-05:00`
}
function endIso(date: string) {
  return `${date}T23:59:59-05:00`
}

const statusTone: Record<PromoStatus, string> = {
  Activo: 'var(--ax-accent-text)',
  Programado: 'var(--ax-text-secondary)',
  Agotado: 'var(--ax-warning-text)',
  Vencido: 'var(--ax-muted)',
  Pausado: 'var(--ax-muted)',
}

export default function PromocionesPage() {
  const access = useAdminAccess()
  const canEdit = hasPermission(access, 'promociones')
  const [promos, setPromos] = useState<Promo[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [type, setType] = useState<'percent' | 'fixed'>('percent')
  const [amount, setAmount] = useState('')
  const [plans, setPlans] = useState<string[]>(['pro'])
  const [maxUses, setMaxUses] = useState('')
  const [starts, setStarts] = useState(() => new Date().toISOString().slice(0, 10))
  const [ends, setEnds] = useState('')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  async function load() {
    setPromos(await callPanel<Promo[]>('platform_list_promos'))
  }

  useEffect(() => {
    if (!canEdit) return
    load().catch((err: Error) => setMessage({ tone: 'danger', text: err.message }))
    // Carga inicial de códigos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit])

  if (!canEdit) return <Notice tone="warning" icon={Info}>No tienes permiso para gestionar promociones.</Notice>

  function clearForm() {
    setEditingId(null)
    setCode('')
    setType('percent')
    setAmount('')
    setPlans(['pro'])
    setMaxUses('')
    setStarts(new Date().toISOString().slice(0, 10))
    setEnds('')
    setActive(true)
  }

  function openPromo(promo: Promo) {
    setEditingId(promo.id)
    setCode(promo.code)
    setType(promo.discount_type)
    setAmount(String(promo.amount))
    setPlans(promo.applies_to_plans)
    setMaxUses(promo.max_uses === null ? '' : String(promo.max_uses))
    setStarts(promo.starts_at.slice(0, 10))
    setEnds(promo.ends_at ? promo.ends_at.slice(0, 10) : '')
    setActive(promo.is_active)
  }

  function togglePlan(planCode: string) {
    setPlans((current) => (current.includes(planCode) ? current.filter((p) => p !== planCode) : [...current, planCode]))
  }

  async function save() {
    const numericAmount = Number(amount)
    const uses = maxUses.trim() === '' ? null : Number(maxUses)
    const problem = validatePromo({
      code,
      type,
      amount: numericAmount,
      maxUses: uses,
      starts: startIso(starts),
      ends: ends ? endIso(ends) : null,
    })
    if (problem) return setMessage({ tone: 'danger', text: problem })
    if (plans.length === 0) return setMessage({ tone: 'danger', text: 'Elige al menos un plan.' })

    setSaving(true)
    setMessage(null)
    try {
      await callPanel('platform_save_promo', {
        p_id: editingId,
        p_code: normalizePromoCode(code),
        p_type: type,
        p_amount: numericAmount,
        p_plans: plans,
        p_max_uses: uses,
        p_starts: startIso(starts),
        p_ends: ends ? endIso(ends) : null,
        p_active: active,
      })
      setMessage({ tone: 'success', text: editingId ? 'Código actualizado.' : 'Código creado.' })
      clearForm()
      await load()
    } catch (err) {
      setMessage({ tone: 'danger', text: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Promociones" />
      {message && <Notice tone={message.tone === 'success' ? 'success' : 'danger'} icon={Info}>{message.text}</Notice>}

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <CardHeader id="promo-form" title={editingId ? 'Editar código' : 'Nuevo código'} />
          <div className="mt-6 space-y-5">
            <label className="block">
              <FieldLabel>Código</FieldLabel>
              <input className={inputClass} placeholder="VERANO25" value={code} disabled={!canEdit} onChange={(e) => setCode(e.target.value)} />
            </label>
            <div>
              <FieldLabel>Tipo de descuento</FieldLabel>
              <div className="flex gap-2">
                <Segment active={type === 'percent'} label="Porcentaje" onClick={() => setType('percent')} disabled={!canEdit} />
                <Segment active={type === 'fixed'} label="Monto fijo" onClick={() => setType('fixed')} disabled={!canEdit} />
              </div>
            </div>
            <label className="block">
              <FieldLabel>{type === 'percent' ? 'Descuento (%)' : 'Descuento (US$)'}</FieldLabel>
              <input className={inputClass} inputMode="decimal" value={amount} disabled={!canEdit} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <div>
              <FieldLabel>Aplica a</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {planOptions.map((plan) => (
                  <Segment key={plan.code} active={plans.includes(plan.code)} label={plan.name} onClick={() => togglePlan(plan.code)} disabled={!canEdit} />
                ))}
              </div>
            </div>
            <label className="block">
              <FieldLabel>Límite de usos</FieldLabel>
              <input className={inputClass} inputMode="numeric" placeholder="Vacío = sin límite" value={maxUses} disabled={!canEdit} onChange={(e) => setMaxUses(e.target.value)} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel>Inicio</FieldLabel>
                <input className={inputClass} type="date" value={starts} disabled={!canEdit} onChange={(e) => setStarts(e.target.value)} />
              </label>
              <label className="block">
                <FieldLabel>Vence</FieldLabel>
                <input className={inputClass} type="date" value={ends} disabled={!canEdit} onChange={(e) => setEnds(e.target.value)} />
              </label>
            </div>
            <div>
              <FieldLabel>Estado</FieldLabel>
              <div className="flex gap-2">
                <Segment active={active} label="Activo" onClick={() => setActive(true)} disabled={!canEdit} />
                <Segment active={!active} label="Pausado" onClick={() => setActive(false)} disabled={!canEdit} />
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-3">
            {editingId && <Button variant="secondary" onClick={clearForm}>Cancelar</Button>}
            <Button variant="primary" onClick={() => void save()} disabled={!canEdit || saving}>
              {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear código'}
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader id="promo-lista" title="Códigos" />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[.14em] text-[var(--ax-muted)]">
                <tr>
                  <th className="py-2 font-semibold">Código</th>
                  <th className="py-2 font-semibold">Descuento</th>
                  <th className="py-2 font-semibold">Planes</th>
                  <th className="py-2 font-semibold">Usos</th>
                  <th className="py-2 font-semibold">Vence</th>
                  <th className="py-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((promo) => {
                  const status = promoStatus({ is_active: promo.is_active, starts_at: promo.starts_at, ends_at: promo.ends_at, max_uses: promo.max_uses, uses_count: promo.uses_count })
                  return (
                    <tr key={promo.id} className="cursor-pointer border-t border-[var(--ax-line)] hover:bg-[var(--ax-surface-raised)]" onClick={() => canEdit && openPromo(promo)}>
                      <td className="py-3 font-semibold text-[var(--ax-text)]">{promo.code}</td>
                      <td className="py-3">{promo.discount_type === 'percent' ? `${promo.amount}%` : formatUsd(promo.amount)}</td>
                      <td className="py-3">{promo.applies_to_plans.map((p) => planOptions.find((o) => o.code === p)?.name ?? p).join(', ')}</td>
                      <td className="py-3">{promo.uses_count} / {promo.max_uses ?? '∞'}</td>
                      <td className="py-3">{promo.ends_at ? promo.ends_at.slice(0, 10) : 'Sin límite'}</td>
                      <td className="py-3 font-semibold" style={{ color: statusTone[status] }}>{status}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {promos.length === 0 && <p className="py-6 text-sm text-[var(--ax-muted)]">Todavía no hay códigos.</p>}
          </div>
        </Card>
      </div>
    </>
  )
}

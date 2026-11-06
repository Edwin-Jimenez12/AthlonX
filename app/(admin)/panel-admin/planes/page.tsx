'use client'

import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { callPanel, useAdminAccess } from '../../../../Components/admin/admin-shell'
import { Button, Card, CardHeader, FieldLabel, Notice, PageHeader, Segment, inputClass } from '../../../../Components/mi-equipo/ui'
import { hasPermission, validatePlan, formatUsd } from '../../../../lib/admin'

type AccountType = 'persona' | 'equipo' | 'organizacion'

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
  account_type: AccountType
  price_pending: boolean
  sort_order: number
  tagline: string | null
  includes_plan: string | null
  limits: Record<string, number | null>
  feature_flags: Record<string, boolean>
}

type Group = 'persona' | 'equipo' | 'organizacion' | 'grupo'
const groups: Array<{ id: Group; label: string }> = [
  { id: 'persona', label: 'Para ti' },
  { id: 'equipo', label: 'Para tu equipo' },
  { id: 'organizacion', label: 'Para tu organización' },
  { id: 'grupo', label: 'AX Club' },
]

// Nombres legibles de las funciones (flags) y los límites del catálogo.
const flagLabels: Record<string, string> = {
  calendario_pro: 'Calendario Pro: sincronización, sin límites y recordatorios personalizados',
  atleta_pro: 'Herramientas de atleta: historial y comparar años',
  entrenador_pro: 'Herramientas de entrenador: formaciones, anuncios y más equipos',
  reportes: 'Reportes en PDF y CSV',
  logo_reportes: 'Logotipo propio en reportes',
  patrocinios: 'Patrocinios',
  planes_grupo: 'Planes de grupo',
  participantes: 'Participantes',
  vista_equipos: 'Vista de todos los equipos',
  sincronizacion: 'Sincronización con Google y Outlook',
  repetir_eventos: 'Repetir eventos',
  torneos_oficiales: 'Torneos oficiales',
  asistencia_equipos: 'Asistencia por equipo',
  auditoria: 'Registro de cambios (auditoría)',
  comprobantes: 'Comprobantes',
  costo_jugador: 'Costo por jugador',
  permisos_evento: 'Permisos de edición por evento',
  categorias_propias: 'Categorías propias',
  cuota_por_division: 'Cuota por división',
  alertas_presupuesto: 'Alertas de presupuesto',
  comparar_temporadas: 'Comparar años y años anteriores',
  comparativa_finanzas: 'Comparativa de finanzas',
  estadisticas_finanzas: 'Estadísticas de finanzas',
}

const limitLabels: Record<string, string> = {
  equipos_entrenador: 'Equipos a cargo como entrenador',
  eventos_equipo_mes: 'Eventos de equipo al mes (entrenador)',
  recordatorios_evento: 'Recordatorios por evento',
  eventos_mes: 'Eventos al mes',
  eventos_repetidos: 'Eventos repetidos',
  equipos_propios: 'Equipos propios',
  equipos_afiliados: 'Equipos afiliados',
  torneos_rapidos: 'Torneos rápidos activos',
  torneos_oficiales: 'Torneos oficiales',
  directivos_staff: 'Directivos y staff',
  tesoreros: 'Tesoreros',
  divisiones: 'Divisiones',
  presupuestos: 'Presupuestos',
  cuerpo_tecnico: 'Cuerpo técnico y directiva',
  historial_meses: 'Meses de historial',
  jugadores_cuota: 'Jugadores con cuota',
  movimientos_mes: 'Movimientos al mes',
  equipos_por_torneo: 'Equipos por torneo',
  jugadores_division: 'Jugadores por división',
}

type Draft = {
  code: string
  accountType: AccountType
  name: string
  tagline: string
  includes: string
  kind: 'individual' | 'grupo'
  monthly: string
  pricePending: boolean
  annualEnabled: boolean
  annual: string
  seats: string
  limit: string
  features: string
  active: boolean
  sort: string
  limits: Record<string, string>
  flags: Record<string, boolean>
}

function toDraft(plan: Plan): Draft {
  return {
    code: plan.code,
    accountType: plan.account_type,
    name: plan.name,
    tagline: plan.tagline ?? '',
    includes: plan.includes_plan ?? '',
    kind: plan.kind,
    monthly: String(plan.monthly_price),
    pricePending: plan.price_pending,
    annualEnabled: plan.annual_enabled,
    annual: plan.annual_price === null ? '' : String(plan.annual_price),
    seats: String(plan.seats),
    limit: plan.personal_activity_monthly_limit === null ? '' : String(plan.personal_activity_monthly_limit),
    features: plan.features.join('\n'),
    active: plan.is_active,
    sort: String(plan.sort_order),
    limits: Object.fromEntries(Object.entries(plan.limits ?? {}).map(([key, value]) => [key, value === null ? '' : String(value)])),
    flags: { ...(plan.feature_flags ?? {}) },
  }
}

export default function PlanesAdminPage() {
  const access = useAdminAccess()
  const canEdit = hasPermission(access, 'planes')
  const [plans, setPlans] = useState<Plan[]>([])
  const [group, setGroup] = useState<Group>('persona')
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

  const inGroup = (plan: Plan) => (group === 'grupo' ? plan.kind === 'grupo' : plan.kind === 'individual' && plan.account_type === group)
  const listed = plans.filter(inGroup)
  const baseOptions = draft ? plans.filter((plan) => plan.account_type === draft.accountType && plan.code !== draft.code) : []

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
    const limits: Record<string, number | null> = {}
    for (const [key, value] of Object.entries(draft.limits)) {
      if (value.trim() === '') { limits[key] = null; continue }
      const parsed = Number(value)
      if (!Number.isInteger(parsed) || parsed < 0) return setMessage({ tone: 'danger', text: `El límite "${limitLabels[key] ?? key}" debe ser un número entero o quedar vacío (sin límite).` })
      limits[key] = parsed
    }
    const sort = Number(draft.sort)
    if (!Number.isInteger(sort)) return setMessage({ tone: 'danger', text: 'El orden debe ser un número entero.' })

    setSaving(true)
    setMessage(null)
    try {
      await callPanel('platform_save_plan_v2', {
        p_code: draft.code,
        p_name: draft.name.trim(),
        p_monthly: Number(draft.monthly),
        p_annual_enabled: draft.annualEnabled,
        p_annual: annual,
        p_seats: Number(draft.seats),
        p_limit: limit,
        p_features: features,
        p_active: draft.active,
        p_tagline: draft.tagline,
        p_includes: draft.includes || null,
        p_limits: limits,
        p_flags: draft.flags,
        p_sort: sort,
        p_price_pending: draft.pricePending,
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
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipo de cuenta">
        {groups.map((item) => <Segment key={item.id} active={group === item.id} label={item.label} onClick={() => { setGroup(item.id); setDraft(null) }} />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card>
          <CardHeader id="planes-lista" title="Catálogo" subtitle="En el orden en que se muestran" />
          <ul className="mt-5 space-y-2">
            {listed.map((plan) => (
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
                  {plan.tagline && <span className="mt-1.5 block text-xs text-[var(--ax-text-secondary)]">{plan.tagline}</span>}
                  <span className="mt-2 block text-sm text-[var(--ax-text)]">{plan.price_pending ? 'Precio por definir' : plan.monthly_price === 0 ? 'Gratis' : `${formatUsd(plan.monthly_price)} al mes`}</span>
                  <span className="mt-1 block text-xs text-[var(--ax-muted)]">
                    {plan.kind === 'grupo' ? `${plan.seats} cuentas` : plan.annual_enabled ? 'Mensual o anual' : 'Solo mensual'}
                    {!plan.is_active && ' · Inactivo (no se muestra)'}
                  </span>
                </button>
              </li>
            ))}
            {listed.length === 0 && <li className="text-sm text-[var(--ax-muted)]">No hay planes en este grupo.</li>}
          </ul>
        </Card>

        {draft ? (
          <Card>
            <CardHeader id="planes-editor" title={`Editar ${draft.name}`} subtitle={`Código: ${draft.code}`} size="lg" />
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block">
                <FieldLabel>Nombre del plan</FieldLabel>
                <input className={inputClass} value={draft.name} onChange={(e) => update('name', e.target.value)} />
              </label>
              <label className="block">
                <FieldLabel>Frase de la tarjeta</FieldLabel>
                <input className={inputClass} value={draft.tagline} placeholder="Para jugar y organizar tu vida" onChange={(e) => update('tagline', e.target.value)} />
              </label>
              <div>
                <FieldLabel>Estado</FieldLabel>
                <div className="flex gap-2">
                  <Segment active={draft.active} label="Activo" onClick={() => update('active', true)} />
                  <Segment active={!draft.active} label="Inactivo" onClick={() => update('active', false)} />
                </div>
              </div>
              <label className="block">
                <FieldLabel>Orden en la página</FieldLabel>
                <input className={inputClass} inputMode="numeric" value={draft.sort} onChange={(e) => update('sort', e.target.value)} />
              </label>
              <label className="block">
                <FieldLabel>Precio mensual (US$)</FieldLabel>
                <input className={inputClass} inputMode="decimal" value={draft.monthly} onChange={(e) => update('monthly', e.target.value)} />
              </label>
              <div>
                <FieldLabel>Precio por definir</FieldLabel>
                <div className="flex gap-2">
                  <Segment active={draft.pricePending} label="Sí" onClick={() => update('pricePending', true)} />
                  <Segment active={!draft.pricePending} label="No" onClick={() => update('pricePending', false)} />
                </div>
              </div>
              <div>
                <FieldLabel>Pago anual</FieldLabel>
                {draft.kind === 'grupo' ? (
                  <p className="text-sm text-[var(--ax-muted)]">Los planes de grupo solo se cobran al mes.</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Segment active={draft.annualEnabled} label="Disponible" onClick={() => update('annualEnabled', true)} />
                    <Segment active={!draft.annualEnabled} label="No disponible" onClick={() => update('annualEnabled', false)} />
                  </div>
                )}
              </div>
              {draft.kind === 'individual' && draft.annualEnabled && (
                <label className="block">
                  <FieldLabel>Precio anual (US$)</FieldLabel>
                  <input className={inputClass} inputMode="decimal" value={draft.annual} onChange={(e) => update('annual', e.target.value)} />
                </label>
              )}
              <label className="block">
                <FieldLabel>Incluye todo lo de</FieldLabel>
                <select className={inputClass} value={draft.includes} onChange={(e) => update('includes', e.target.value)}>
                  <option value="">Ninguno</option>
                  {baseOptions.map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Cupos de la cuenta</FieldLabel>
                <input className={inputClass} inputMode="numeric" value={draft.seats} onChange={(e) => update('seats', e.target.value)} />
              </label>
              {draft.accountType === 'persona' && (
                <label className="block">
                  <FieldLabel>Actividades personales al mes</FieldLabel>
                  <input className={inputClass} inputMode="numeric" placeholder="Vacío = sin límite" value={draft.limit} onChange={(e) => update('limit', e.target.value)} />
                </label>
              )}
              <label className="block md:col-span-2">
                <FieldLabel>Lo que se muestra en la tarjeta (una función por línea)</FieldLabel>
                <textarea className={`${inputClass} min-h-40 py-3`} value={draft.features} onChange={(e) => update('features', e.target.value)} />
              </label>
            </div>

            {Object.keys(draft.flags).length > 0 && (
              <div className="mt-8">
                <FieldLabel>Funciones del plan (cambian lo que la cuenta puede usar)</FieldLabel>
                <ul className="mt-2 divide-y divide-[var(--ax-line)] rounded-[14px] border border-[var(--ax-line)]">
                  {Object.keys(draft.flags).sort().map((key) => (
                    <li key={key} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="text-sm text-[var(--ax-text)]">{flagLabels[key] ?? key}</span>
                      <div className="flex shrink-0 gap-2">
                        <Segment active={draft.flags[key]} label="Sí" onClick={() => update('flags', { ...draft.flags, [key]: true })} />
                        <Segment active={!draft.flags[key]} label="No" onClick={() => update('flags', { ...draft.flags, [key]: false })} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Object.keys(draft.limits).length > 0 && (
              <div className="mt-8">
                <FieldLabel>Límites del plan (vacío = sin límite)</FieldLabel>
                <div className="mt-2 grid gap-4 md:grid-cols-2">
                  {Object.keys(draft.limits).sort().map((key) => (
                    <label key={key} className="block">
                      <span className="mb-1.5 block text-xs text-[var(--ax-text-secondary)]">{limitLabels[key] ?? key}</span>
                      <input className={inputClass} inputMode="numeric" placeholder="Sin límite" value={draft.limits[key]} onChange={(e) => update('limits', { ...draft.limits, [key]: e.target.value })} />
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDraft(null)}>Cerrar</Button>
              <Button variant="primary" onClick={() => void save()} disabled={saving}>
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

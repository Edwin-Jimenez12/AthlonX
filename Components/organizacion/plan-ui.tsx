'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { loadAccountContexts } from '../../lib/account-contexts'
import { loadAccountPlan, type AccountPlan } from '../../lib/account-plans'
import { supabase } from '../../lib/supabase'
import { ButtonLink, cx } from '../mi-equipo/ui'

export const upgradeHref = '/mi-perfil?seccion=cuenta&mejorar=1'

export type OrgUsage = { plan: string; code: string; limits: Record<string, number | null>; usage: Record<string, number> }

export type ActiveOrganization = {
  status: 'cargando' | 'sin-organizacion' | 'lista'
  organization: { id: string; name: string } | null
  plan: AccountPlan | null
  usage: OrgUsage | null
  reload: () => Promise<void>
}

// Organización del contexto activo, con su plan y el uso de sus límites.
export function useActiveOrganization(): ActiveOrganization {
  const [status, setStatus] = useState<ActiveOrganization['status']>('cargando')
  const [organization, setOrganization] = useState<{ id: string; name: string } | null>(null)
  const [plan, setPlan] = useState<AccountPlan | null>(null)
  const [usage, setUsage] = useState<OrgUsage | null>(null)

  async function loadUsage(orgId: string) {
    if (!supabase) return
    const { data } = await supabase.rpc('platform_org_usage', { p_org: orgId })
    setUsage((data ?? null) as OrgUsage | null)
  }

  async function load() {
    if (!supabase) return setStatus('sin-organizacion')
    const { data } = await supabase.auth.getUser()
    if (!data.user) return setStatus('sin-organizacion')
    const contexts = await loadAccountContexts(data.user.id)
    const stored = window.localStorage.getItem('athlonx-active-context-id')
    const current = contexts.find((context) => context.id === stored) ?? contexts[0]
    if (current?.contextType !== 'organization' || !current.organizationId) return setStatus('sin-organizacion')
    setOrganization({ id: current.organizationId, name: current.name })
    try {
      setPlan(await loadAccountPlan('organizacion', current.organizationId))
    } catch {
      setPlan(null)
    }
    await loadUsage(current.organizationId)
    setStatus('lista')
  }

  useEffect(() => {
    void load()
    const onChange = () => void load()
    window.addEventListener('athlonx-context-change', onChange)
    return () => window.removeEventListener('athlonx-context-change', onChange)
    // La carga depende solo del contexto activo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { status, organization, plan, usage, reload: async () => { if (organization) await loadUsage(organization.id) } }
}

export function hasFlag(plan: AccountPlan | null, key: string) {
  return plan?.feature_flags?.[key] === true
}

// Medidor de límite (componente "Límite" de Figma): etiqueta, "X de Y" y barra.
export function LimitMeter({ label, used, limit }: { label: string; used: number; limit: number | null | undefined }) {
  const unlimited = limit === null || limit === undefined
  const text = unlimited ? `${used} · Sin límite` : limit === 0 ? 'No incluido en tu plan' : `${used} de ${limit}`
  const pct = unlimited ? 25 : limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-[var(--ax-text)]">{label}</span>
        <span className="font-semibold tabular-nums text-[var(--ax-text)]">{text}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-[var(--ax-line)]">
        <div className="h-2 rounded-full bg-[var(--ax-accent)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Fila bloqueada (componente "Bloqueado" de Figma): función, chip "Disponible en …" y "Mejorar plan".
export function LockedFeature({ label, plan = 'Pro' }: { label: string; plan?: 'Pro' | 'Élite' }) {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-[var(--ax-line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2.5">
        <Lock size={15} aria-hidden="true" className="shrink-0 text-[var(--ax-muted)]" />
        <span className="text-[13px] text-[var(--ax-muted)]">{label}</span>
        <Chip tone="accent">Disponible en {plan}</Chip>
      </div>
      <ButtonLink href={upgradeHref} variant="secondary">Mejorar plan</ButtonLink>
    </div>
  )
}

const chipTones = {
  accent: 'bg-[var(--ax-accent-soft)] text-[var(--ax-accent-text)]',
  blue: 'bg-[var(--ax-info-soft)] text-[var(--ax-info-text)]',
  violet: 'bg-[var(--ax-violet-soft)] text-[var(--ax-violet-text)]',
  orange: 'bg-[var(--ax-warning-soft)] text-[var(--ax-warning-text)]',
  neutral: 'border border-[var(--ax-line-strong)] text-[var(--ax-text-secondary)]',
}

export function Chip({ tone = 'neutral', children }: { tone?: keyof typeof chipTones; children: React.ReactNode }) {
  return <span className={cx('inline-flex h-[23px] items-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold', chipTones[tone])}>{children}</span>
}

// Pestañas Equipos / Torneos de la sección Equipos.
export function TeamsTabs({ active }: { active: 'equipos' | 'torneos' }) {
  const tab = (id: 'equipos' | 'torneos', label: string, href: string) => (
    <Link
      href={href}
      aria-current={active === id ? 'page' : undefined}
      className={cx('inline-flex h-[34px] items-center rounded-full px-3.5 text-[13px] font-medium', active === id ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'border border-[var(--ax-line-strong)] text-[var(--ax-text)]')}
    >
      {label}
    </Link>
  )
  return <div className="flex gap-1.5">{tab('equipos', 'Equipos', '/equipos')}{tab('torneos', 'Torneos', '/equipos?vista=torneos')}</div>
}

// Reportes: CSV descargable y PDF por la impresión del navegador ("Guardar como PDF").
export function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number | null>>) {
  const escape = (value: string | number | null) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function printReport(title: string, header: string[], rows: Array<Array<string | number | null>>, logoUrl?: string | null) {
  const win = window.open('', '_blank')
  if (!win) return
  const esc = (value: string | number | null) => String(value ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font-family:Inter,Arial,sans-serif;color:#07131e;margin:32px}h1{font-size:22px;margin:0 0 4px}p{color:#4a5d6b;margin:0 0 20px;font-size:12px}
table{border-collapse:collapse;width:100%;font-size:12px}th,td{border-bottom:1px solid #d5dee6;padding:8px;text-align:left}th{text-transform:uppercase;font-size:10px;letter-spacing:.08em;color:#4a5d6b}img{max-height:48px;margin-bottom:12px}</style></head><body>
${logoUrl ? `<img src="${esc(logoUrl)}" alt="">` : ''}<h1>${esc(title)}</h1><p>Generado por AthlonX el ${new Date().toLocaleDateString('es-PA')}</p>
<table><thead><tr>${header.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>
<script>window.onload=function(){window.print()}</script></body></html>`)
  win.document.close()
}

'use client'

import { useState, type ReactNode } from 'react'
import { Building2, CalendarDays, Check, Copy, LockKeyhole, MapPin, X, type LucideIcon } from 'lucide-react'
import { Badge, Button, cx, inputClass, initialsOf } from '../mi-equipo/ui'

// Piezas del rediseño del gestor de torneos (Figma, página "Claude", y≈33 000).
// Solo usan tokens --ax-*, así que funcionan igual en tema claro y oscuro.

export type TournamentSport = 'rugby' | 'futbol' | 'baloncesto'

export function sportOf(code?: string | null): TournamentSport {
  return code === 'futbol' ? 'futbol' : code === 'baloncesto' ? 'baloncesto' : 'rugby'
}

// Arte de líneas de cancha que se usa cuando el torneo no tiene banner.
export function BannerArt({ sport, className }: { sport: TournamentSport; className?: string }) {
  const line = { stroke: 'var(--ax-accent)', strokeOpacity: 0.16, strokeWidth: 2, fill: 'none' }
  return <svg viewBox="0 0 1104 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={cx('absolute inset-0 h-full w-full', className)}>
    <defs>
      <radialGradient id={`ax-banner-glow-${sport}`} cx="0.78" cy="0.2" r="0.55">
        <stop offset="0" stopColor="var(--ax-accent)" stopOpacity="0.22" />
        <stop offset="1" stopColor="var(--ax-accent)" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="1104" height="200" fill={`url(#ax-banner-glow-${sport})`} />
    <line x1="552" y1="0" x2="552" y2="200" {...line} />
    {sport === 'rugby' && <g>
      <line x1="331" y1="0" x2="331" y2="200" {...line} strokeDasharray="9 9" />
      <line x1="773" y1="0" x2="773" y2="200" {...line} strokeDasharray="9 9" />
      <line x1="155" y1="0" x2="155" y2="200" {...line} />
      <line x1="949" y1="0" x2="949" y2="200" {...line} />
      <path d="M963 36v120M1023 36v120M963 100h60" {...line} strokeWidth={3} />
    </g>}
    {sport === 'futbol' && <g>
      <circle cx="552" cy="100" r="70" {...line} />
      <rect x="949" y="40" width="220" height="120" {...line} />
      <rect x="1049" y="72" width="110" height="56" {...line} />
      <rect x="-66" y="40" width="220" height="120" {...line} />
    </g>}
    {sport === 'baloncesto' && <g>
      <circle cx="552" cy="100" r="60" {...line} />
      <rect x="927" y="60" width="220" height="80" {...line} />
      <path d="M1037 -10a110 110 0 0 0 0 220" {...line} />
      <rect x="-44" y="60" width="220" height="80" {...line} />
    </g>}
  </svg>
}

export function TournamentHero({ name, sport, bannerUrl, photoUrl, badges, meta, code, actions }: {
  name: string
  sport: TournamentSport
  bannerUrl?: string | null
  photoUrl?: string | null
  badges: ReactNode
  meta: { icon: LucideIcon; label: string }[]
  code?: string | null
  actions?: ReactNode
}) {
  const [copied, setCopied] = useState(false)
  async function copyCode() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }
  return <section aria-labelledby="tournament-title" className="min-w-0">
    <div className="relative h-[120px] overflow-hidden rounded-2xl border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] sm:h-[200px] sm:rounded-[20px]">
      {bannerUrl ? <img src={bannerUrl} alt="" className="h-full w-full object-cover" /> : <BannerArt sport={sport} />}
    </div>
    <div className="flex flex-col gap-4 px-4 sm:flex-row sm:gap-6 sm:px-6">
      <span className="relative z-10 -mt-10 flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[var(--ax-accent)] font-display text-[34px] text-[var(--ax-on-accent)] ring-4 ring-[var(--ax-bg)] sm:-mt-16 sm:h-[120px] sm:w-[120px] sm:rounded-[20px] sm:text-[52px]">
        {photoUrl ? <img src={photoUrl} alt={`Foto de ${name}`} className="h-full w-full object-cover" /> : initialsOf(name)}
      </span>
      <div className="min-w-0 flex-1 space-y-2.5 sm:pt-3">
        <div className="flex flex-wrap items-center gap-1.5">{badges}</div>
        <h1 id="tournament-title" className="font-display text-[32px] uppercase leading-[34px] tracking-[.02em] text-[var(--ax-text)] [text-wrap:balance] sm:text-[44px] sm:leading-[46px]">{name}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[var(--ax-text-secondary)]">
          {meta.map(({ icon: Icon, label }) => <span key={label} className="inline-flex min-w-0 items-center gap-1.5"><Icon size={15} aria-hidden="true" className="shrink-0 text-[var(--ax-muted)]" /><span className="truncate">{label}</span></span>)}
          {code && <button type="button" onClick={() => void copyCode()} title={copied ? 'Copiado' : 'Copiar código'} className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1 font-medium text-[var(--ax-muted)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]">
            {code}{copied ? <Check size={13} aria-hidden="true" className="text-[var(--ax-accent-text)]" /> : <Copy size={13} aria-hidden="true" />}
            <span className="sr-only">{copied ? 'Código copiado' : 'Copiar código del torneo'}</span>
          </button>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-4">{actions}</div>}
    </div>
  </section>
}

export function defaultMeta(dates: string, location?: string | null, organizer?: string | null) {
  return [
    { icon: CalendarDays, label: dates },
    ...(location ? [{ icon: MapPin, label: location }] : []),
    ...(organizer ? [{ icon: Building2, label: `Organiza ${organizer}` }] : []),
  ]
}

export function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="min-w-0 rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-4">
    <p className="text-xs font-medium text-[var(--ax-muted)]">{label}</p>
    <p className="mt-1 font-display text-[30px] uppercase leading-8 tracking-[.02em] text-[var(--ax-text)]">{value}</p>
    {detail && <p className="mt-1 truncate text-xs text-[var(--ax-muted)]">{detail}</p>}
  </div>
}

export type TabItem<T extends string> = { value: T; label: string }

// Pestañas del torneo: subrayado verde y desplazamiento horizontal en móvil.
export function TournamentTabs<T extends string>({ tabs, active, onChange }: { tabs: TabItem<T>[]; active: T; onChange: (value: T) => void }) {
  return <nav aria-label="Secciones del torneo" className="ax-scroll-x -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
    <div role="tablist" className="flex min-w-max gap-6 border-b border-[var(--ax-line)]">
      {tabs.map((tab) => {
        const selected = tab.value === active
        return <button key={tab.value} type="button" role="tab" aria-selected={selected} onClick={() => onChange(tab.value)} className={cx(
          'relative -mb-px h-11 cursor-pointer whitespace-nowrap border-b-2 text-sm font-semibold transition-colors duration-150',
          selected ? 'border-[var(--ax-accent)] text-[var(--ax-text)]' : 'border-transparent text-[var(--ax-muted)] hover:text-[var(--ax-text)]',
        )}>{tab.label}</button>
      })}
    </div>
  </nav>
}

export type SaveBarItem = { id: string; label: string; detail?: string; onRemove?: () => void }

// Barra de guardado inline: reemplaza el modal de contraseña y el panel de cambios pendientes.
export function SaveBar({ items, error, saving, initiallyConfirming = false, onDiscard, onConfirm }: {
  items: SaveBarItem[]
  error?: string
  saving?: boolean
  initiallyConfirming?: boolean
  onDiscard: () => void
  onConfirm: (password: string) => void | Promise<void>
}) {
  const [confirming, setConfirming] = useState(initiallyConfirming)
  const [expanded, setExpanded] = useState(false)
  const [password, setPassword] = useState('')
  const count = items.length
  return <div role="region" aria-label="Cambios sin guardar" className="ax-drop-in sticky bottom-4 z-30 rounded-2xl border border-[var(--ax-line-strong)] bg-[var(--ax-surface-raised)] p-3 shadow-[var(--ax-shadow-pop)] sm:p-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--ax-text)]">{count} cambio{count === 1 ? '' : 's'} sin guardar</p>
        <button type="button" onClick={() => setExpanded((current) => !current)} className="mt-0.5 cursor-pointer text-left text-xs text-[var(--ax-muted)] underline-offset-2 hover:text-[var(--ax-text)] hover:underline">
          {expanded ? 'Ocultar detalle' : items.slice(0, 2).map((item) => item.label).join(' · ') + (count > 2 ? ` y ${count - 2} más` : '')}
        </button>
      </div>
      {confirming
        ? <form onSubmit={(event) => { event.preventDefault(); if (password) void onConfirm(password) }} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block sm:w-60">
            <span className="sr-only">Contraseña de la cuenta</span>
            <LockKeyhole size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ax-muted)]" />
            <input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Confirma con tu contraseña" className={cx(inputClass, 'pl-9')} />
          </label>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setConfirming(false); setPassword('') }} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="primary" icon={Check} disabled={!password || saving} className="flex-1 sm:flex-none">{saving ? 'Guardando…' : 'Confirmar y guardar'}</Button>
          </div>
        </form>
        : <div className="flex gap-2">
          <Button variant="ghost" onClick={onDiscard} disabled={saving}>Descartar</Button>
          <Button variant="primary" icon={Check} onClick={() => setConfirming(true)} className="flex-1 sm:flex-none">Guardar cambios</Button>
        </div>}
    </div>
    {error && <p role="alert" className="mt-3 rounded-[10px] bg-[var(--ax-danger-soft)] px-3 py-2 text-[13px] font-medium text-[var(--ax-danger-text)]">{error}</p>}
    {expanded && <ul className="mt-3 divide-y divide-[var(--ax-line)] border-t border-[var(--ax-line)]">
      {items.map((item) => <li key={item.id} className="flex items-center gap-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[var(--ax-text)]">{item.label}</p>
          {item.detail && <p className="truncate text-xs text-[var(--ax-muted)]">{item.detail}</p>}
        </div>
        {item.onRemove && <button type="button" onClick={item.onRemove} aria-label={`Quitar ${item.label}`} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--ax-muted)] hover:bg-[var(--ax-danger-soft)] hover:text-[var(--ax-danger-text)]"><X size={15} /></button>}
      </li>)}
    </ul>}
  </div>
}

export function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { draft: 'Borrador', published: 'Publicado', in_progress: 'En curso', finished: 'Finalizado' }
  return <Badge tone={status === 'in_progress' || status === 'published' ? 'success' : status === 'draft' ? 'warning' : 'neutral'}>{labels[status] || status}</Badge>
}

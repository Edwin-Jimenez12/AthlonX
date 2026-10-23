'use client'

import { CalendarDays, ChevronRight, LockKeyhole, MapPin, Pencil, Trash2, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Badge, Button, ButtonLink, FieldLabel, IconButton, IconTile, buttonClass, cx, inputClass } from '../mi-equipo/ui'

// Tarjeta de torneo y fila de borrador (componentes "Tarjeta/Evento" y "Fila/Borrador" en Figma).

export type EventTournament = {
  id: string
  name: string
  athlonx_code: string | null
  status: string
  is_quick: boolean
  cover_url: string | null
  location: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  organizationName: string | null
  teamName: string | null
}

const statusLabels: Record<string, string> = { draft: 'Borrador', published: 'Publicado', in_progress: 'En curso', finished: 'Finalizado' }

function formatDay(value: string, withYear: boolean) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: withYear ? 'numeric' : undefined }).replace(/\./g, '')
}

export function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return 'Fechas por definir'
  if (!start || !end || start === end) return formatDay((start || end) as string, true)
  const sameYear = start.slice(0, 4) === end.slice(0, 4)
  const sameMonth = sameYear && start.slice(0, 7) === end.slice(0, 7)
  if (sameMonth) return `${Number(start.slice(8, 10))} – ${formatDay(end, true)}`
  return `${formatDay(start, !sameYear)} – ${formatDay(end, true)}`
}

function savedAgo(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'Guardado hoy'
  if (days === 1) return 'Guardado ayer'
  return `Guardado hace ${days} días`
}

export function EventCard({ tournament, label, canEdit }: { tournament: EventTournament; label?: string; canEdit: boolean }) {
  const finished = tournament.status === 'finished'
  const organizer = tournament.organizationName || tournament.teamName
  return <article className="flex min-w-0 flex-col rounded-2xl border border-[var(--ax-line)] bg-[var(--ax-surface)] p-4 transition-[border-color] duration-150 hover:border-[var(--ax-line-strong)] sm:rounded-[20px] sm:p-5">
    <div className="flex items-start gap-3.5 sm:gap-4">
      {tournament.cover_url ? <img src={tournament.cover_url} alt="" className="h-14 w-14 shrink-0 rounded-[14px] object-cover" /> : <IconTile icon={Trophy} size={56} tone={finished ? 'muted' : 'accent'} />}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={tournament.status === 'in_progress' ? 'success' : 'neutral'}>{statusLabels[tournament.status] || tournament.status}</Badge>
          {label && <Badge>{label}</Badge>}
          {tournament.is_quick && <Badge tone="warning" dot={false}>Torneo rápido</Badge>}
        </div>
        <h3 className="font-display text-[26px] uppercase leading-[28px] tracking-[.02em] text-[var(--ax-text)] [overflow-wrap:anywhere] sm:text-[28px] sm:leading-[30px]">{tournament.name}</h3>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-[var(--ax-text-secondary)]">
      <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} aria-hidden="true" />{formatDateRange(tournament.start_date, tournament.end_date)}</span>
      {tournament.location && <span className="inline-flex items-center gap-1.5"><MapPin size={15} aria-hidden="true" />{tournament.location}</span>}
    </div>
    <p className="mt-2 text-[13px] text-[var(--ax-muted)]">{organizer ? `Organiza ${organizer}` : 'Torneo independiente'}</p>
    <div aria-hidden="true" className="min-h-4 flex-1" />
    <div className="flex items-center justify-between gap-3 border-t border-[var(--ax-line)] pt-4">
      <span className="truncate text-xs tracking-[.04em] text-[var(--ax-muted)]">{tournament.athlonx_code || 'Código pendiente'}</span>
      <div className="flex shrink-0 items-center gap-2">
        {canEdit && <ButtonLink href={`/torneos/ver/${tournament.id}?editar=1`} size="sm" icon={Pencil}>Editar</ButtonLink>}
        <Link href={`/torneos/ver/${tournament.id}`} className="inline-flex h-9 items-center gap-1 rounded-[10px] px-2 text-[13px] font-semibold text-[var(--ax-accent-text)] transition-colors hover:bg-[var(--ax-accent-soft)]">Ver torneo<ChevronRight size={16} aria-hidden="true" /></Link>
      </div>
    </div>
  </article>
}

export function DraftRow({ tournament, label, onDelete }: { tournament: EventTournament; label?: string; onDelete: (password: string) => Promise<string | null> }) {
  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const missing = !tournament.start_date || !tournament.end_date ? 'Faltan las fechas' : !tournament.location ? 'Falta la sede' : ''
  const meta = [label, savedAgo(tournament.created_at), missing].filter(Boolean).join(' · ')
  const continueHref = `/torneos/ver/${tournament.id}?editar=1`

  async function confirm() {
    setDeleting(true)
    const failure = await onDelete(password)
    setDeleting(false)
    if (failure) setError(failure)
  }

  function cancel() {
    setConfirming(false)
    setPassword('')
    setError('')
  }

  return <li className="border-b border-[var(--ax-line)] py-3.5 last:border-b-0 sm:px-4">
    <div className="flex items-center gap-3 sm:gap-4">
      <IconTile icon={Trophy} tone="muted" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--ax-text)] sm:text-[15px]">{tournament.name}</p>
        <p className="mt-0.5 text-xs leading-[18px] text-[var(--ax-muted)]">{meta}</p>
      </div>
      <span className="hidden sm:block"><ButtonLink href={continueHref} size="sm" icon={Pencil}>Continuar</ButtonLink></span>
      <Link href={continueHref} aria-label={`Continuar ${tournament.name}`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--ax-line-strong)] text-[var(--ax-text)] sm:hidden"><Pencil size={16} aria-hidden="true" /></Link>
      <IconButton icon={Trash2} label={`Eliminar ${tournament.name}`} size={36} aria-expanded={confirming} onClick={() => setConfirming(true)} className="border-transparent text-[var(--ax-text-secondary)] hover:border-[var(--ax-danger-line)] hover:bg-[var(--ax-danger-soft)] hover:text-[var(--ax-danger-text)]" />
    </div>
    {confirming && <form onSubmit={(event) => { event.preventDefault(); void confirm() }} className="ax-drop-in mt-3 space-y-3 rounded-[14px] border border-[var(--ax-danger-line)] bg-[var(--ax-danger-soft)] p-4">
      <div>
        <p className="text-sm font-semibold text-[var(--ax-text)] [overflow-wrap:anywhere]">¿Eliminar “{tournament.name}”?</p>
        <p className="mt-1 text-[13px] leading-5 text-[var(--ax-text-secondary)]">Se borran el torneo, su división inicial y la configuración guardada. Esta acción no se puede deshacer.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1">
          <FieldLabel>Contraseña de la cuenta</FieldLabel>
          <span className="relative block">
            <LockKeyhole size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ax-muted)]" />
            <input autoFocus required type="password" autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} placeholder="Escribe tu contraseña" className={cx(inputClass, 'pl-9')} />
          </span>
        </label>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={deleting} onClick={cancel} className="flex-1 sm:flex-none">Cancelar</Button>
          <button type="submit" disabled={!password || deleting} className={cx(buttonClass('danger'), 'flex-1 sm:flex-none')}><Trash2 size={16} aria-hidden="true" />{deleting ? 'Eliminando…' : 'Eliminar borrador'}</button>
        </div>
      </div>
      {error && <p role="alert" className="text-[13px] font-medium text-[var(--ax-danger-text)]">{error}</p>}
    </form>}
  </li>
}

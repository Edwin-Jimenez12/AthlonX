'use client'

import { Bell, Check, Hash, MailOpen, Trophy, UserPlus, X } from 'lucide-react'
import Link from 'next/link'
import { Badge, IconTile, buttonClass, cx } from '../mi-equipo/ui'

// Fila de notificación (componentes "Fila/Notificación" y "Fila/Notificación móvil" en Figma).

export type NotificationRecord = {
  id: string
  title: string
  body: string
  affiliation_request_id: string | null
  player_number_change_request_id: string | null
  tournament_team_invitation_id: string | null
  tournament_id: string | null
  read_at: string | null
  created_at: string
  status: 'pending' | 'accepted' | 'rejected' | 'info'
  responded_at: string | null
}

const statusBadges = {
  pending: { tone: 'warning', label: 'Pendiente' },
  accepted: { tone: 'success', label: 'Aceptada' },
  rejected: { tone: 'danger', label: 'Rechazada' },
} as const

function iconFor(notification: NotificationRecord) {
  if (notification.tournament_team_invitation_id) return Trophy
  if (notification.player_number_change_request_id) return Hash
  if (notification.affiliation_request_id) return UserPlus
  return Bell
}

const dayMs = 24 * 60 * 60 * 1000

export function notificationGroup(value: string, now = new Date()) {
  const date = new Date(value)
  if (date.toDateString() === now.toDateString()) return 'Hoy'
  return now.getTime() - date.getTime() < 7 * dayMs ? 'Esta semana' : 'Anteriores'
}

// Hoy: hora relativa. Esta semana: día y fecha. Antes: solo la fecha.
export function notificationTime(value: string, now = new Date()) {
  const date = new Date(value)
  const group = notificationGroup(value, now)
  if (group === 'Hoy') {
    const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000))
    if (minutes < 1) return 'ahora'
    return minutes < 60 ? `hace ${minutes} min` : `hace ${Math.floor(minutes / 60)} h`
  }
  const options: Intl.DateTimeFormatOptions = group === 'Esta semana'
    ? { weekday: 'short', day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric' }
  return date.toLocaleDateString('es-PA', options).replace(/\./g, '').replace(',', '')
}

export function canRespond(notification: NotificationRecord) {
  return notification.status === 'pending' && Boolean(notification.affiliation_request_id || notification.player_number_change_request_id || notification.tournament_team_invitation_id)
}

export function NotificationRow({ notification, busy, onRespond, onMarkAsRead }: {
  notification: NotificationRecord
  busy: boolean
  onRespond: (notification: NotificationRecord, decision: 'accepted' | 'rejected') => void
  onMarkAsRead: (notificationId: string) => void
}) {
  const unread = !notification.read_at
  const badge = notification.status === 'info' ? null : statusBadges[notification.status]
  const respondable = canRespond(notification)
  const time = <time dateTime={notification.created_at} className="text-xs text-[var(--ax-muted)] whitespace-nowrap">{notificationTime(notification.created_at)}</time>
  const badgeNode = badge && <Badge tone={badge.tone}>{badge.label}</Badge>

  return <li className="flex gap-3 border-b border-[var(--ax-line)] py-4 last:border-b-0 sm:gap-4 sm:px-4">
    <IconTile icon={iconFor(notification)} />
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-body flex min-w-0 items-start gap-2 tracking-normal text-sm font-semibold leading-5 text-[var(--ax-text)] sm:text-[15px]">
          {unread && <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-[var(--ax-accent-text)]"><span className="sr-only">No leída. </span></span>}
          <span className="[overflow-wrap:anywhere]">{notification.title}</span>
        </h3>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">{time}{badgeNode}</div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 sm:hidden">{time}{badgeNode}</div>
      {notification.body && <p className="mt-1.5 text-[13px] leading-5 text-[var(--ax-text-secondary)] sm:text-sm">{notification.body}</p>}
      {(respondable || notification.tournament_id || unread) && <div className="mt-3 flex flex-wrap items-center gap-2">
        {respondable && <>
          <button type="button" disabled={busy} onClick={() => onRespond(notification, 'accepted')} className={buttonClass('primary', 'sm')}><Check size={15} aria-hidden="true" />Aceptar</button>
          <button type="button" disabled={busy} onClick={() => onRespond(notification, 'rejected')} className={buttonClass('danger', 'sm')}><X size={15} aria-hidden="true" />Rechazar</button>
        </>}
        {notification.tournament_id && <Link href={`/torneos/ver/${notification.tournament_id}`} className={buttonClass('secondary', 'sm')}><Trophy size={15} aria-hidden="true" />Inspeccionar torneo</Link>}
        {unread && !respondable && <button type="button" disabled={busy} onClick={() => onMarkAsRead(notification.id)} className={cx(buttonClass('ghost', 'sm'), !notification.tournament_id && '-ml-2')}><MailOpen size={15} aria-hidden="true" />Marcar como leída</button>}
      </div>}
    </div>
  </li>
}

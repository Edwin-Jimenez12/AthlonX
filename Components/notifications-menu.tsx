'use client'

import { Bell, Hash, Trophy, UserPlus, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { announceHeaderMenu, useDismissableMenu } from './header-menu-dismiss'

type Notification = { id: string; title: string; body: string; affiliation_request_id: string | null; player_number_change_request_id: string | null; tournament_team_invitation_id: string | null; read_at: string | null; created_at: string }

function notificationIcon(notification: Notification) {
  if (notification.tournament_team_invitation_id) return Trophy
  if (notification.player_number_change_request_id) return Hash
  if (notification.affiliation_request_id) return UserPlus
  return Bell
}

function formatRelative(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.round(hours / 24)
  return days === 1 ? 'ayer' : `hace ${days} días`
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [message, setMessage] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  useDismissableMenu(containerRef, 'notifications', open, () => setOpen(false))

  async function loadNotifications() {
    if (!supabase) return
    const { data } = await supabase.from('user_notifications').select('id, title, body, affiliation_request_id, player_number_change_request_id, tournament_team_invitation_id, read_at, created_at').order('created_at', { ascending: false }).limit(8)
    setNotifications(data ?? [])
  }

  useEffect(() => { void loadNotifications() }, [])

  async function respond(notification: Notification, decision: 'accepted' | 'rejected') {
    if (!supabase) return
    if (notification.tournament_team_invitation_id) {
      const { error } = await supabase.rpc('respond_tournament_team_invitation', { p_invitation_id: notification.tournament_team_invitation_id, p_decision: decision === 'rejected' ? 'declined' : decision })
      if (error) return setMessage(error.message)
      setNotifications((current) => current.filter((item) => item.id !== notification.id))
      window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
      setMessage(decision === 'accepted' ? 'Invitacion al torneo aceptada.' : 'Invitacion al torneo rechazada.')
      return
    }
    const rpcName = notification.player_number_change_request_id ? 'respond_player_number_change_request' : 'respond_affiliation_request'
    const requestId = notification.player_number_change_request_id || notification.affiliation_request_id
    if (!requestId) return
    const { error } = await supabase.rpc(rpcName, { p_request_id: requestId, p_decision: decision })
    if (error) return setMessage(error.message)
    setNotifications((current) => current.filter((item) => item.id !== notification.id))
    window.dispatchEvent(new CustomEvent(notification.player_number_change_request_id ? 'athlonx-roster-updated' : 'athlonx-affiliation-updated'))
    if (decision === 'accepted') window.setTimeout(() => window.location.reload(), 250)
    setMessage(decision === 'accepted' ? 'Vinculación aceptada.' : 'Solicitud rechazada.')
  }

  const unread = notifications.filter((notification) => !notification.read_at).length
  const canRespond = (notification: Notification) => Boolean(!notification.read_at && (notification.affiliation_request_id || notification.tournament_team_invitation_id || (notification.player_number_change_request_id && notification.title === 'Solicitud de cambio de numero')))

  return <div ref={containerRef} className="relative"><button type="button" onClick={() => { const nextOpen = !open; setOpen(nextOpen); setMessage(''); if (nextOpen) { announceHeaderMenu('notifications'); void loadNotifications() } }} aria-label="Ver notificaciones" className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-[14px] border border-[#29485d] text-[#b4ff45] transition-all duration-300 hover:border-[#b4ff45] hover:bg-[#b4ff45]/10"><Bell size={19} />{unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-[5px] bg-[#ff7d88] px-1 text-[10px] font-bold text-[#07131e]">{unread}</span>}</button>{open && <div className="ax-v2 absolute right-0 top-14 z-50 w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface)] text-[var(--ax-text)] shadow-2xl">
    <div className="flex items-center justify-between gap-3 border-b border-[var(--ax-line)] px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-accent-text)]">Notificaciones</p>
      <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar notificaciones" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[10px] border border-[var(--ax-line)] text-[var(--ax-muted)] transition hover:bg-[var(--ax-hover)]"><X size={15} /></button>
    </div>
    <div className="max-h-80 overflow-y-auto">
      {notifications.map((notification, index) => {
        const Icon = notificationIcon(notification)
        return <article key={notification.id} className={`flex gap-3 px-4 py-3.5 ${index > 0 ? 'border-t border-[var(--ax-line)]' : ''}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] text-[var(--ax-text)]"><Icon size={16} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {!notification.read_at && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ax-accent)]" />}
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ax-text)]">{notification.title}</p>
              <span className="shrink-0 text-[11px] text-[var(--ax-muted)]">{formatRelative(notification.created_at)}</span>
            </div>
            <p className="mt-1 text-[13px] leading-5 text-[var(--ax-muted)]">{notification.body}</p>
            {canRespond(notification) && <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="rounded-[6px] bg-amber-300/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">Pendiente</span>
              <button type="button" onClick={() => void respond(notification, 'accepted')} className="inline-flex h-8 cursor-pointer items-center rounded-[10px] bg-[var(--ax-accent)] px-3 text-xs font-bold text-[var(--ax-on-accent)] transition hover:opacity-90">Aceptar</button>
              <button type="button" onClick={() => void respond(notification, 'rejected')} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[var(--ax-danger-line)] px-3 text-xs font-bold text-[var(--ax-danger-text)] transition hover:bg-[var(--ax-danger-text)]/10"><X size={13} />Rechazar</button>
            </div>}
          </div>
        </article>
      })}
      {!notifications.length && <p className="px-4 py-8 text-center text-sm text-[var(--ax-muted)]">No tienes notificaciones nuevas.</p>}
    </div>
    {message && <p role="status" className="border-t border-[var(--ax-line)] px-4 py-3 text-xs text-[var(--ax-text-secondary)]">{message}</p>}
    <div className="border-t border-[var(--ax-line)] p-3">
      <Link href="/notificaciones" onClick={() => setOpen(false)} className="flex h-10 items-center justify-center rounded-[10px] border border-[var(--ax-accent-line)] text-[13px] font-bold text-[var(--ax-accent-text)] transition hover:bg-[var(--ax-accent)]/10">Ver historial completo</Link>
    </div>
  </div>}</div>
}

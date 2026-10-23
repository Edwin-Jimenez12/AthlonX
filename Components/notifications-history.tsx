'use client'

import { Bell, CheckCheck, CheckCircle2, MailOpen, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Card, EmptyState, Notice, PageHeader, Segment, SkeletonRows } from './mi-equipo/ui'
import { NotificationRecord, NotificationRow, canRespond, notificationGroup } from './notificaciones/notification-row'

type RequestState = { id: string; status: 'pending' | 'accepted' | 'rejected'; responded_at: string | null }
type TournamentInvitationState = { id: string; tournament_id: string; status: 'pending' | 'accepted' | 'declined' | 'cancelled'; responded_at: string | null }
type Filter = 'all' | 'pending' | 'unread'

const groups = ['Hoy', 'Esta semana', 'Anteriores'] as const

export function NotificationsHistory() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  async function loadNotifications() {
    if (!supabase) {
      setLoading(false)
      setMessage('Supabase no está configurado.')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.from('user_notifications').select('id, title, body, affiliation_request_id, player_number_change_request_id, tournament_team_invitation_id, read_at, created_at').order('created_at', { ascending: false }).limit(100)
    if (error) {
      setLoading(false)
      setMessage(error.message)
      return
    }

    const rows = data ?? []
    const affiliationIds = rows.map((row) => row.affiliation_request_id).filter((id): id is string => Boolean(id))
    const numberIds = rows.map((row) => row.player_number_change_request_id).filter((id): id is string => Boolean(id))
    const tournamentInvitationIds = rows.map((row) => row.tournament_team_invitation_id).filter((id): id is string => Boolean(id))
    const [{ data: affiliationRequests }, { data: numberRequests }, { data: tournamentInvitations }] = await Promise.all([
      affiliationIds.length ? supabase.from('affiliation_requests').select('id, status, responded_at').in('id', affiliationIds) : Promise.resolve({ data: [] as RequestState[] }),
      numberIds.length ? supabase.from('player_number_change_requests').select('id, status, responded_at').in('id', numberIds) : Promise.resolve({ data: [] as RequestState[] }),
      tournamentInvitationIds.length ? supabase.from('tournament_team_invitations').select('id, tournament_id, status, responded_at').in('id', tournamentInvitationIds) : Promise.resolve({ data: [] as TournamentInvitationState[] }),
    ])
    const states = new Map<string, RequestState>([...(affiliationRequests ?? []), ...(numberRequests ?? [])].map((request) => [request.id, request]))
    const tournamentStates = new Map<string, TournamentInvitationState>((tournamentInvitations ?? []).map((invitation) => [invitation.id, invitation as TournamentInvitationState]))
    setNotifications(rows.map((row) => {
      const requestId = row.affiliation_request_id || row.player_number_change_request_id
      const request = requestId ? states.get(requestId) : undefined
      const tournamentInvitation = row.tournament_team_invitation_id ? tournamentStates.get(row.tournament_team_invitation_id) : undefined
      const tournamentStatus = tournamentInvitation?.status === 'declined' ? 'rejected' : tournamentInvitation?.status
      return { ...row, status: tournamentStatus || request?.status || 'info', responded_at: tournamentInvitation?.responded_at || request?.responded_at || null, tournament_id: tournamentInvitation?.tournament_id || null } as NotificationRecord
    }))
    setLoading(false)
  }

  useEffect(() => { void loadNotifications() }, [])

  async function markAsRead(notificationIds: string[]) {
    if (!supabase || !notificationIds.length) return false
    setMessage('')
    const readAt = new Date().toISOString()
    const { error } = await supabase.from('user_notifications').update({ read_at: readAt }).in('id', notificationIds)
    if (error) {
      setMessage(error.message)
      return false
    }
    const ids = new Set(notificationIds)
    setNotifications((current) => current.map((notification) => ids.has(notification.id) ? { ...notification, read_at: readAt } : notification))
    return true
  }

  async function markOne(notificationId: string) {
    setBusyId(notificationId)
    await markAsRead([notificationId])
    setBusyId(null)
  }

  async function markAll() {
    setMarkingAll(true)
    await markAsRead(notifications.filter((notification) => !notification.read_at).map((notification) => notification.id))
    setMarkingAll(false)
  }

  async function respond(notification: NotificationRecord, decision: 'accepted' | 'rejected') {
    if (!supabase) return
    setBusyId(notification.id)
    setMessage('')
    const answered = (item: NotificationRecord) => item.id === notification.id ? { ...item, status: decision, responded_at: new Date().toISOString(), read_at: new Date().toISOString() } : item
    if (notification.tournament_team_invitation_id) {
      const { error } = await supabase.rpc('respond_tournament_team_invitation', { p_invitation_id: notification.tournament_team_invitation_id, p_decision: decision === 'rejected' ? 'declined' : decision })
      setBusyId(null)
      if (error) return setMessage(error.message)
      setNotifications((current) => current.map(answered))
      window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
      return
    }
    const requestId = notification.player_number_change_request_id || notification.affiliation_request_id
    if (!requestId) return setBusyId(null)
    const rpcName = notification.player_number_change_request_id ? 'respond_player_number_change_request' : 'respond_affiliation_request'
    const { error } = await supabase.rpc(rpcName, { p_request_id: requestId, p_decision: decision })
    setBusyId(null)
    if (error) return setMessage(error.message)
    setNotifications((current) => current.map(answered))
    window.dispatchEvent(new CustomEvent(notification.player_number_change_request_id ? 'athlonx-roster-updated' : 'athlonx-affiliation-updated'))
    if (!notification.player_number_change_request_id) {
      window.dispatchEvent(new CustomEvent('athlonx-team-members-change'))
    }
  }

  const pending = notifications.filter(canRespond)
  const unread = notifications.filter((notification) => !notification.read_at)
  const visible = filter === 'pending' ? pending : filter === 'unread' ? unread : notifications
  const grouped = groups.map((group) => ({ group, items: visible.filter((notification) => notificationGroup(notification.created_at) === group) })).filter(({ items }) => items.length)

  return <NotificationsLayout
    message={message}
    actions={<Button icon={CheckCheck} disabled={!unread.length || markingAll} onClick={() => void markAll()} className="w-full sm:w-auto">{markingAll ? 'Marcando…' : 'Marcar todas como leídas'}</Button>}
  >
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Filtrar notificaciones">
      <Segment active={filter === 'all'} label="Todas" count={notifications.length} onClick={() => setFilter('all')} />
      <Segment active={filter === 'pending'} label="Pendientes" count={pending.length} onClick={() => setFilter('pending')} />
      <Segment active={filter === 'unread'} label="No leídas" count={unread.length} onClick={() => setFilter('unread')} />
    </div>
    {loading ? <SkeletonRows count={4} />
      : !visible.length ? <EmptyNotifications filter={filter} />
      : grouped.map(({ group, items }) => <section key={group} aria-label={group}>
        <h2 className="font-body pt-2 text-[13px] font-semibold tracking-normal text-[var(--ax-muted)]">{group}</h2>
        <ul>{items.map((notification) => <NotificationRow key={notification.id} notification={notification} busy={busyId === notification.id} onRespond={(item, decision) => void respond(item, decision)} onMarkAsRead={(id) => void markOne(id)} />)}</ul>
      </section>)}
  </NotificationsLayout>
}

export function NotificationsLayout({ message, actions, children }: { message?: string; actions?: ReactNode; children: ReactNode }) {
  return <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
    <div className="mx-auto max-w-[1184px] space-y-5 px-4 pb-16 pt-5 sm:space-y-6 sm:px-8 sm:pt-8 lg:px-10">
      <div className="max-w-[880px] space-y-5 sm:space-y-6">
        <PageHeader title="Notificaciones" description="Invitaciones, solicitudes y avisos de tu cuenta. Responde las pendientes desde aquí." actions={actions} />
        {message && <Notice tone="danger" icon={X}>{message}</Notice>}
        <Card className="space-y-2">{children}</Card>
      </div>
    </div>
  </main>
}

function EmptyNotifications({ filter }: { filter: Filter }) {
  if (filter === 'pending') return <EmptyState icon={CheckCircle2} title="No tienes nada pendiente" description="Las invitaciones y solicitudes nuevas aparecerán aquí." />
  if (filter === 'unread') return <EmptyState icon={MailOpen} title="Estás al día" description="Ya leíste todas tus notificaciones." />
  return <EmptyState icon={Bell} title="Todavía no tienes notificaciones" description="Aquí verás las invitaciones a equipos y torneos, y los avisos de tu cuenta." />
}

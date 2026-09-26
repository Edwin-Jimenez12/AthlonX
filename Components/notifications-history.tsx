'use client'

import { Bell, Check, Clock3, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type NotificationRecord = {
  id: string
  title: string
  body: string
  affiliation_request_id: string | null
  player_number_change_request_id: string | null
  read_at: string | null
  created_at: string
  status: 'pending' | 'accepted' | 'rejected' | 'info'
  responded_at: string | null
}

type RequestState = { id: string; status: 'pending' | 'accepted' | 'rejected'; responded_at: string | null }

const statusLabels: Record<NotificationRecord['status'], string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  info: 'Informativa',
}

export function NotificationsHistory() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  async function loadNotifications() {
    if (!supabase) {
      setLoading(false)
      setMessage('Supabase no está configurado.')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.from('user_notifications').select('id, title, body, affiliation_request_id, player_number_change_request_id, read_at, created_at').order('created_at', { ascending: false }).limit(100)
    if (error) {
      setLoading(false)
      setMessage(error.message)
      return
    }

    const rows = data ?? []
    const affiliationIds = rows.map((row) => row.affiliation_request_id).filter((id): id is string => Boolean(id))
    const numberIds = rows.map((row) => row.player_number_change_request_id).filter((id): id is string => Boolean(id))
    const [{ data: affiliationRequests }, { data: numberRequests }] = await Promise.all([
      affiliationIds.length ? supabase.from('affiliation_requests').select('id, status, responded_at').in('id', affiliationIds) : Promise.resolve({ data: [] as RequestState[] }),
      numberIds.length ? supabase.from('player_number_change_requests').select('id, status, responded_at').in('id', numberIds) : Promise.resolve({ data: [] as RequestState[] }),
    ])
    const states = new Map<string, RequestState>([...(affiliationRequests ?? []), ...(numberRequests ?? [])].map((request) => [request.id, request]))
    setNotifications(rows.map((row) => {
      const requestId = row.affiliation_request_id || row.player_number_change_request_id
      const request = requestId ? states.get(requestId) : undefined
      return { ...row, status: request?.status ?? 'info', responded_at: request?.responded_at ?? null } as NotificationRecord
    }))
    const unreadIds = rows.filter((row) => !row.read_at).map((row) => row.id)
    if (unreadIds.length) await supabase.from('user_notifications').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
    setLoading(false)
  }

  useEffect(() => { void loadNotifications() }, [])

  async function respond(notification: NotificationRecord, decision: 'accepted' | 'rejected') {
    if (!supabase) return
    const requestId = notification.player_number_change_request_id || notification.affiliation_request_id
    if (!requestId) return
    const rpcName = notification.player_number_change_request_id ? 'respond_player_number_change_request' : 'respond_affiliation_request'
    const { error } = await supabase.rpc(rpcName, { p_request_id: requestId, p_decision: decision })
    if (error) {
      setMessage(error.message)
      return
    }
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, status: decision, responded_at: new Date().toISOString(), read_at: new Date().toISOString() } : item))
    window.dispatchEvent(new CustomEvent(notification.player_number_change_request_id ? 'athlonx-roster-updated' : 'athlonx-affiliation-updated'))
  }

  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="font-heading text-sm uppercase tracking-[.28em] text-[#b4ff45]">Centro de actividad</p><h1 className="mt-2 font-heading text-4xl font-black uppercase sm:text-5xl">Notificaciones</h1><p className="mt-2 text-slate-400">Consulta el historial de actividad de tu cuenta y responde las invitaciones pendientes.</p></div><Bell className="text-[#b4ff45]" size={30} /></div></header>
      {message && <p role="alert" className="rounded-[5px] border border-[#ff7d88]/40 bg-[#ff7d88]/10 p-4 text-sm text-[#ffb0b7]">{message}</p>}
      <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-5"><h2 className="font-heading text-2xl font-black uppercase">Historial</h2><span className="rounded-[5px] border border-[#31556b] px-3 py-1 text-xs text-slate-400">{notifications.length} registros</span></div>
        {loading && <p className="py-10 text-center text-sm text-slate-400">Cargando notificaciones...</p>}
        {!loading && !notifications.length && <div className="py-12 text-center"><Bell className="mx-auto text-slate-500" size={34} /><p className="mt-3 text-slate-400">Todavía no tienes notificaciones registradas.</p></div>}
        {!loading && notifications.length > 0 && <div className="mt-5 space-y-3">{notifications.map((notification) => <NotificationCard key={notification.id} notification={notification} onRespond={respond} />)}</div>}
      </section>
    </div>
  </main>
}

function NotificationCard({ notification, onRespond }: { notification: NotificationRecord; onRespond: (notification: NotificationRecord, decision: 'accepted' | 'rejected') => void }) {
  const canRespond = notification.status === 'pending' && Boolean(notification.affiliation_request_id || notification.player_number_change_request_id)
  const statusClass = notification.status === 'accepted' ? 'border-[#b4ff45]/40 bg-[#b4ff45]/5 text-[#dfffba]' : notification.status === 'rejected' ? 'border-[#ff7d88]/40 bg-[#ff7d88]/5 text-[#ffb0b7]' : notification.status === 'pending' ? 'border-[#31556b] bg-[#07131e] text-[#ffd98a]' : 'border-[#31556b] bg-[#07131e] text-slate-400'
  return <article className={`rounded-[5px] border p-4 sm:p-5 ${notification.read_at ? 'opacity-95' : ''}`}><div className="flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-[#b4ff45]/10 text-[#b4ff45]"><Bell size={17} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold text-white">{notification.title}</h3><p className="mt-1 text-xs text-slate-500">{new Date(notification.created_at).toLocaleString('es-PA')}</p></div><span className={`inline-flex items-center gap-1 rounded-[5px] border px-2 py-1 text-xs font-bold ${statusClass}`}>{notification.status === 'pending' ? <Clock3 size={13} /> : notification.status === 'accepted' ? <Check size={13} /> : notification.status === 'rejected' ? <X size={13} /> : null}{statusLabels[notification.status]}</span></div><p className="mt-3 text-sm leading-6 text-slate-300">{notification.body}</p>{canRespond && <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => onRespond(notification, 'accepted')} className="inline-flex cursor-pointer items-center gap-1 rounded-[5px] bg-[#b4ff45] px-3 py-2 text-xs font-bold text-[#07131e]"><Check size={14} />Aceptar</button><button type="button" onClick={() => onRespond(notification, 'rejected')} className="inline-flex cursor-pointer items-center gap-1 rounded-[5px] border border-[#ff7d88]/50 px-3 py-2 text-xs font-bold text-[#ff9ca5]"><X size={14} />Rechazar</button></div>}</div></div></article>
}

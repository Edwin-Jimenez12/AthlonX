'use client'

import { Bell, Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Notification = { id: string; title: string; body: string; affiliation_request_id: string | null; read_at: string | null; created_at: string }

export function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [message, setMessage] = useState('')

  async function loadNotifications() {
    if (!supabase) return
    const { data } = await supabase.from('user_notifications').select('id, title, body, affiliation_request_id, read_at, created_at').order('created_at', { ascending: false }).limit(8)
    setNotifications(data ?? [])
  }

  useEffect(() => { void loadNotifications() }, [])

  async function respond(notification: Notification, decision: 'accepted' | 'rejected') {
    if (!supabase || !notification.affiliation_request_id) return
    const { error } = await supabase.rpc('respond_affiliation_request', { p_request_id: notification.affiliation_request_id, p_decision: decision })
    if (error) return setMessage(error.message)
    setNotifications((current) => current.filter((item) => item.id !== notification.id))
    window.dispatchEvent(new CustomEvent('athlonx-affiliation-updated'))
    if (decision === 'accepted') window.setTimeout(() => window.location.reload(), 250)
    setMessage(decision === 'accepted' ? 'Vinculación aceptada.' : 'Solicitud rechazada.')
  }

  const unread = notifications.filter((notification) => !notification.read_at).length

  return <div className="relative"><button type="button" onClick={() => { const nextOpen = !open; setOpen(nextOpen); setMessage(''); if (nextOpen) void loadNotifications() }} aria-label="Ver notificaciones" className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#294052] text-[#b4ff45] hover:border-[#b4ff45]"><Bell size={18} />{unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff7d88] px-1 text-[10px] font-bold text-[#07131e]">{unread}</span>}</button>{open && <div className="absolute right-0 top-14 z-50 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-[#31556b] bg-[#0d1d2b] p-3 text-white shadow-2xl"><div className="flex items-center justify-between px-2 pb-2"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Notificaciones</p><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar notificaciones" className="cursor-pointer rounded-full p-1 text-slate-400 hover:bg-white/10"><X size={16} /></button></div><div className="max-h-80 space-y-2 overflow-y-auto">{notifications.map((notification) => <article key={notification.id} className={`rounded-xl border p-3 ${notification.read_at ? 'border-[#294052] bg-white/[.02]' : 'border-[#b4ff45]/30 bg-[#b4ff45]/5'}`}><p className="text-sm font-semibold">{notification.title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{notification.body}</p>{notification.affiliation_request_id && !notification.read_at && <div className="mt-3 flex gap-2"><button type="button" onClick={() => void respond(notification, 'accepted')} className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#b4ff45] px-3 py-2 text-xs font-bold text-[#07131e]"><Check size={14} />Aceptar</button><button type="button" onClick={() => void respond(notification, 'rejected')} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#ff7d88]/40 px-3 py-2 text-xs font-bold text-[#ff9ca5]"><X size={14} />Rechazar</button></div>}</article>)}{!notifications.length && <p className="px-2 py-6 text-center text-sm text-slate-500">No tienes notificaciones nuevas.</p>}</div>{message && <p role="status" className="mt-2 rounded-lg bg-white/5 px-2 py-2 text-xs text-slate-300">{message}</p>}</div>}</div>
}

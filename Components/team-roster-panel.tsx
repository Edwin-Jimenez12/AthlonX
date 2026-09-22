'use client'

import { Check, Search, Send, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Candidate = { id: string; full_name: string; avatar_url: string | null; username: string | null; athlonx_code: string | null }
type RosterMember = Candidate & { role_label: string | null }

export function TeamRosterPanel({ teamId }: { teamId?: string }) {
  const [roster, setRoster] = useState<RosterMember[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadRoster() {
      if (!supabase || !teamId) return setRoster([])
      const { data, error } = await supabase.rpc('get_team_roster_for_manager', { p_team_id: teamId })
      if (error) return setMessage(error.message)
      setRoster((data ?? []) as RosterMember[])
    }
    void loadRoster()
  }, [teamId])

  useEffect(() => {
    let active = true
    async function searchAthletes() {
      if (!supabase || query.trim().length < 2 || selected) {
        setCandidates([])
        return
      }
      const { data, error } = await supabase.rpc('search_invitable_athletes', { p_query: query.trim(), p_limit: 8 })
      if (!active) return
      if (error) {
        setMessage(error.message)
        return
      }
      setCandidates((data ?? []) as Candidate[])
    }
    void searchAthletes()
    return () => { active = false }
  }, [query, selected])

  async function inviteAthlete() {
    if (!supabase || !teamId || !selected) {
      setMessage('Selecciona una cuenta de atleta para enviar la invitación.')
      return
    }
    setLoading(true)
    setMessage('')
    const { error } = await supabase.rpc('create_affiliation_request', {
      p_target_user_id: selected.id,
      p_source_team_id: teamId,
      p_role: 'atleta',
      p_role_label: 'Atleta',
    })
    setLoading(false)
    if (error) return setMessage(error.message)
    setSelected(null)
    setQuery('')
    setCandidates([])
    setMessage('Invitación enviada. El atleta deberá aceptarla desde Notificaciones.')
  }

  return <section id="plantilla" className="rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Gestión de personas</p><h3 className="mt-2 font-display text-3xl uppercase">Plantilla de atletas</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Busca por nombre, código AthlonX o nombre de usuario. Solo aparecerán personas registradas como atletas y con las invitaciones activadas.</p></div><UserRound className="text-[#b4ff45]" size={24} /></div>
    {teamId ? <div className="mt-7 rounded-2xl border border-[#29485d] bg-[#07131e] p-4 sm:p-5"><p className="text-sm font-bold text-white">Agregar atleta</p><div className="relative mt-3"><div className="flex items-center gap-3 rounded-xl border border-[#31556b] bg-[#0b1d2c] px-4 py-3 focus-within:border-[#b4ff45]"><Search size={18} className="shrink-0 text-[#b4ff45]" /><input value={selected?.full_name || query} onChange={(event) => { setSelected(null); setQuery(event.target.value); setMessage('') }} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" placeholder="Nombre, @usuario o AX-PER-..." />{selected && <button type="button" onClick={() => setSelected(null)} aria-label="Quitar atleta seleccionado" className="cursor-pointer text-slate-400 hover:text-white"><X size={17} /></button>}</div>{!selected && query.trim().length >= 2 && <div className="absolute left-0 right-0 top-14 z-20 overflow-hidden rounded-xl border border-[#31556b] bg-[#0d1d2b] shadow-2xl">{candidates.map((candidate) => <button type="button" key={candidate.id} onClick={() => { setSelected(candidate); setQuery(''); setCandidates([]) }} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-white/5"><span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#b4ff45] text-sm font-bold text-[#07131e]">{candidate.avatar_url ? <img src={candidate.avatar_url} alt="" className="h-full w-full object-cover" /> : candidate.full_name.slice(0, 1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{candidate.full_name}</span><span className="block truncate text-xs text-slate-400">{candidate.username ? `@${candidate.username}` : 'Sin usuario'} · {candidate.athlonx_code || 'Código pendiente'}</span></span></button>)}{!candidates.length && <p className="px-4 py-3 text-sm text-slate-500">No hay atletas disponibles con ese criterio.</p>}</div>}</div>{selected && <div className="mt-3 flex flex-col gap-3 rounded-xl border border-[#b4ff45]/30 bg-[#b4ff45]/5 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#dcffb6]">Atleta seleccionado: <strong>{selected.full_name}</strong></p><button type="button" onClick={() => void inviteAthlete()} disabled={loading} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#b4ff45] px-4 py-2 text-sm font-bold text-[#07131e] disabled:cursor-wait disabled:opacity-60"><Send size={15} />{loading ? 'Enviando...' : 'Enviar invitación'}</button></div>}</div> : <div className="mt-7 rounded-2xl border border-dashed border-[#31556b] p-5 text-sm text-slate-400">Este equipo todavía no tiene una cuenta vinculada para gestionar la plantilla.</div>}
    <div className="mt-7"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">Atletas vinculados</p><span className="rounded-full border border-[#29485d] px-3 py-1 text-xs font-semibold text-slate-400">{roster.length}</span></div>{roster.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{roster.map((member) => <div key={member.id} className="flex items-center gap-3 rounded-xl border border-[#29485d] bg-[#07131e] p-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#b4ff45] font-bold text-[#07131e]">{member.avatar_url ? <img src={member.avatar_url} alt="" className="h-full w-full object-cover" /> : member.full_name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{member.full_name}</p><p className="truncate text-xs text-slate-400">{member.role_label || 'Atleta'}</p></div><Check className="ml-auto shrink-0 text-[#b4ff45]" size={17} /></div>)}</div> : <p className="mt-3 rounded-xl border border-dashed border-[#31556b] p-5 text-sm text-slate-500">Todavía no hay atletas vinculados.</p>}</div>
    {message && <p role="status" className="mt-5 rounded-xl bg-[#07131e] px-4 py-3 text-sm font-semibold text-slate-300">{message}</p>}
  </section>
}

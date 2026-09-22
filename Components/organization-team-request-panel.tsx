'use client'

import { Building2, Search, Send, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Team = { id: string; name: string; logo_url: string | null; city: string | null; username: string | null; athlonx_code: string | null }

export function OrganizationTeamRequestPanel({ sourceOrganizationId }: { sourceOrganizationId?: string }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Team | null>(null)
  const [resolvedOrganizationId, setResolvedOrganizationId] = useState('')
  const [accountType, setAccountType] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const activeOrganizationId = sourceOrganizationId || resolvedOrganizationId

  useEffect(() => {
    if (sourceOrganizationId || !supabase) return
    let active = true
    async function resolveOrganization() {
      await supabase.rpc('ensure_my_organization')
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user || !active) return
      setAccountType(userData.user.user_metadata?.account_type || '')
      const { data } = await supabase
        .from('organizations')
        .select('id')
        .eq('created_by', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (active && data?.id) setResolvedOrganizationId(data.id)
    }
    void resolveOrganization()
    return () => { active = false }
  }, [sourceOrganizationId])

  useEffect(() => {
    let active = true
    async function searchTeams() {
      if (!supabase || query.trim().length < 2 || selected) {
        setTeams([])
        return
      }
      const { data, error } = await supabase.rpc('search_invitable_teams', { p_query: query.trim(), p_limit: 8 })
      if (!active) return
      if (error) return setMessage(error.message)
      setTeams((data ?? []) as Team[])
    }
    void searchTeams()
    return () => { active = false }
  }, [query, selected])

  async function sendRequest() {
    if (!supabase || !selected) {
      setMessage('Selecciona un equipo.')
      return
    }
    if (!activeOrganizationId) {
      setMessage('No hay una organización activa para enviar esta invitación.')
      return
    }
    setLoading(true)
    setMessage('')
    const { error } = await supabase.rpc('create_affiliation_request', {
      p_source_organization_id: activeOrganizationId,
      p_target_team_id: selected.id,
    })
    setLoading(false)
    if (error) return setMessage(error.message)
    setSelected(null)
    setQuery('')
    setTeams([])
    setMessage('Invitación enviada. Los directivos del equipo podrán aceptarla desde Notificaciones.')
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="font-heading text-sm uppercase tracking-[.2em] text-[#70b719]">Afiliaciones deportivas</p><h2 className="mt-1 font-heading text-2xl font-black uppercase text-[#081522]">Agregar equipo</h2><p className="mt-2 text-sm text-slate-600">Busca un equipo por nombre, código AthlonX o nombre de usuario y envíale una invitación para vincularlo a esta organización.</p></div><Building2 className="shrink-0 text-[#70b719]" size={22} /></div><div className="relative mt-5"><label className="block text-sm font-bold text-[#17212b]">Buscar equipo<div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-300 px-4 py-3 focus-within:border-[#70b719]"><Search size={18} className="text-slate-400" /><input value={selected?.name || query} onChange={(event) => { setSelected(null); setQuery(event.target.value); setMessage('') }} className="w-full outline-none" placeholder="Nombre, @usuario o AX-EQU-..." />{selected && <button type="button" onClick={() => setSelected(null)} aria-label="Quitar equipo seleccionado" className="cursor-pointer text-slate-400 hover:text-slate-700"><X size={17} /></button>}</div></label>{!selected && query.trim().length >= 2 && <div className="absolute left-0 right-0 top-[76px] z-10 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">{teams.map((team) => <button type="button" key={team.id} onClick={() => { setSelected(team); setQuery(''); setTeams([]) }} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-[#f2fbe5]"><span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e9fbd0] font-bold text-[#4c8500]">{team.logo_url ? <img src={team.logo_url} alt="" className="h-full w-full object-cover" /> : team.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate font-semibold text-[#17212b]">{team.name}</span><span className="block truncate text-xs text-slate-500">{team.username ? `@${team.username}` : 'Sin usuario'} · {team.athlonx_code || 'Código pendiente'}</span></span></button>)}{!teams.length && <p className="px-4 py-3 text-sm text-slate-500">No hay equipos disponibles con ese criterio.</p>}</div>}</div>{selected && <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#70b719]/30 bg-[#f2fbe5] p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#365e00]">Equipo seleccionado: <strong>{selected.name}</strong></p><button type="button" onClick={() => void sendRequest()} disabled={loading || !activeOrganizationId} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#b4ff45] px-4 py-2 text-sm font-bold text-[#081522] disabled:cursor-not-allowed disabled:opacity-60"><Send size={15} />{loading ? 'Enviando...' : 'Enviar invitación'}</button></div>}{!activeOrganizationId && <p role="status" className="mt-4 rounded-xl bg-[#fff4d6] px-4 py-3 text-sm font-semibold text-[#7a5500]">{accountType === 'equipo' ? 'Esta cuenta es de equipo. Inicia sesión con una cuenta de organización para enviar invitaciones.' : accountType === 'organizacion' ? 'La cuenta está configurada como organización, pero todavía no tiene un perfil institucional activo.' : 'No hay una organización activa para enviar esta invitación.'}</p>}{message && <p role="status" className="mt-4 rounded-xl bg-[#081522] px-4 py-3 text-sm font-semibold text-white">{message}</p>}</section>
}

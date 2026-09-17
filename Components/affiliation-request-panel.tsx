'use client'

import { Search, Send, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Profile = { id: string; full_name: string; avatar_url: string | null }

const roleLabels: Record<string, string> = {
  atleta: 'Atleta',
  entrenador: 'Entrenador',
  staff: 'Staff',
  directivo: 'Directivo',
}

export function AffiliationRequestPanel({ sourceOrganizationId, sourceTeamId, title = 'Vincular persona' }: { sourceOrganizationId?: string; sourceTeamId?: string; title?: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [query, setQuery] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState('atleta')
  const [roleLabel, setRoleLabel] = useState('Atleta')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadProfiles() {
      if (!supabase) return
      const { data } = await supabase.from('profile_directory').select('id, full_name, avatar_url').order('full_name').limit(40)
      setProfiles(data ?? [])
    }
    void loadProfiles()
  }, [])

  function changeRole(nextRole: string) {
    setRole(nextRole)
    setRoleLabel(roleLabels[nextRole])
  }

  async function sendRequest() {
    if (!supabase || !selectedProfile || (!sourceOrganizationId && !sourceTeamId)) {
      setMessage('Selecciona una persona y una cuenta de origen.')
      return
    }
    setLoading(true)
    setMessage('')
    const { error } = await supabase.rpc('create_affiliation_request', {
      p_target_user_id: selectedProfile.id,
      p_source_organization_id: sourceOrganizationId || null,
      p_source_team_id: sourceTeamId || null,
      p_role: role,
      p_role_label: roleLabel,
    })
    setLoading(false)
    if (error) return setMessage(error.message)
    setSelectedProfile(null)
    setQuery('')
    setMessage('Solicitud enviada. La persona recibirá una notificación para aceptarla.')
  }

  const filteredProfiles = profiles.filter((profile) => profile.full_name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)

  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-start justify-between gap-4"><div><p className="font-heading text-sm uppercase tracking-[.2em] text-[#70b719]">Afiliaciones</p><h2 className="mt-1 font-heading text-2xl font-black uppercase text-[#081522]">{title}</h2><p className="mt-2 text-sm text-slate-600">Busca una persona y envíale una propuesta de rol. La vinculación solo se activa cuando la acepta.</p></div><Send className="shrink-0 text-[#70b719]" size={22} /></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
      <div className="relative"><label className="block text-sm font-bold text-[#17212b]">Buscar persona<div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-300 px-4 py-3"><Search size={18} className="text-slate-400" /><input value={selectedProfile?.full_name || query} onChange={(event) => { setSelectedProfile(null); setQuery(event.target.value) }} className="w-full outline-none" placeholder="Nombre completo" /></div></label>{!selectedProfile && query && <div className="absolute left-0 right-0 top-[76px] z-10 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">{filteredProfiles.map((profile) => <button type="button" key={profile.id} onClick={() => { setSelectedProfile(profile); setQuery('') }} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-[#f2fbe5]"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9fbd0] text-[#4c8500]"><UserRound size={17} /></span><span className="font-semibold text-[#17212b]">{profile.full_name || 'Usuario sin nombre'}</span></button>)}{!filteredProfiles.length && <p className="px-4 py-3 text-sm text-slate-500">No se encontraron perfiles.</p>}</div>}{selectedProfile && <p className="mt-2 text-xs font-semibold text-[#4c8500]">Seleccionado: {selectedProfile.full_name}</p>}</div>
      <label className="block text-sm font-bold text-[#17212b]">Rol<select value={role} onChange={(event) => changeRole(event.target.value)} className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 px-4 py-3">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end"><label className="block flex-1 text-sm font-bold text-[#17212b]">Etiqueta visible<input value={roleLabel} onChange={(event) => setRoleLabel(event.target.value)} required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Ej. Presidente, Tesorero o Capitán" /></label><button type="button" onClick={() => void sendRequest()} disabled={loading} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#081522] disabled:cursor-wait disabled:opacity-60"><Send size={17} />{loading ? 'Enviando...' : 'Enviar solicitud'}</button></div>
    {message && <p role="status" className="mt-4 rounded-xl bg-[#081522] px-4 py-3 text-sm font-semibold text-white">{message}</p>}
  </section>
}

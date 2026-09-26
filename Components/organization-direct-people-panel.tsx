'use client'

import { Search, Send, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Profile = {
  id: string
  full_name: string
  username: string | null
  athlonx_code: string | null
  avatar_url: string | null
}

type DirectPerson = {
  user_id: string
  full_name: string
  avatar_url: string | null
  role_label: string
  status: string
}

export function OrganizationDirectPeoplePanel({ organizationId }: { organizationId?: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [people, setPeople] = useState<DirectPerson[]>([])
  const [query, setQuery] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  async function loadPeople() {
    if (!supabase || !organizationId) return
    const { data, error } = await supabase.rpc('get_organization_direct_people', {
      p_organization_id: organizationId,
      p_query: null,
    })
    if (error) setMessage(error.message)
    else setPeople((data ?? []) as DirectPerson[])
  }

  useEffect(() => { void loadPeople() }, [organizationId])

  async function searchProfiles(value: string) {
    if (!supabase || value.trim().length < 2) {
      setProfiles([])
      return
    }
    setSearching(true)
    const { data, error } = await supabase.rpc('search_directory', {
      p_query: value.trim(),
      p_result_type: 'persona',
      p_discipline_code: null,
      p_location: null,
      p_limit: 8,
    })
    setSearching(false)
    if (error) {
      setProfiles([])
      setMessage(error.message)
      return
    }
    const directIds = new Set(people.map((person) => person.user_id))
    setProfiles((data ?? [])
      .filter((profile) => !directIds.has(profile.entity_id))
      .map((profile) => ({
        id: profile.entity_id,
        full_name: profile.display_name,
        username: profile.username,
        athlonx_code: profile.athlonx_code,
        avatar_url: profile.avatar_url,
      })) as Profile[])
  }

  async function sendRequest() {
    if (!supabase || !organizationId || !selectedProfile) {
      setMessage('Selecciona una persona para enviar la invitación.')
      return
    }
    setLoading(true)
    setMessage('')
    const { error } = await supabase.rpc('create_affiliation_request', {
      p_target_user_id: selectedProfile.id,
      p_target_organization_id: null,
      p_source_organization_id: organizationId,
      p_source_team_id: null,
      p_role: 'staff',
      p_role_label: 'Miembro de organización',
      p_relationship_type: null,
      p_discipline_id: null,
      p_modality_id: null,
      p_target_team_id: null,
    })
    setLoading(false)
    if (error) return setMessage(error.message)
    setSelectedProfile(null)
    setProfiles([])
    setQuery('')
    setMessage('Invitación enviada. La persona deberá aceptarla desde sus notificaciones.')
  }

  const availableProfiles = profiles.filter((profile) => !people.some((person) => person.user_id === profile.id))

  return <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8">
    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
      <div>
        <p className="font-heading text-sm uppercase tracking-[.2em] text-[#b4ff45]">Afiliaciones directas</p>
        <h2 className="mt-2 font-heading text-3xl font-black uppercase">Personas de la organización</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Busca por nombre, usuario o código AthlonX y administra las personas vinculadas directamente.</p>
      </div>
      <UserRound className="text-[#b4ff45]" size={28} />
    </div>

    <div className="relative mt-6">
      <label className="block text-sm font-bold text-white">Buscar persona
        <div className="mt-2 flex items-center gap-3 rounded-[5px] border border-[#31556b] bg-[#07131e] px-4 py-3 focus-within:border-[#b4ff45]">
          <Search size={18} className="text-[#b4ff45]" />
          <input value={selectedProfile?.full_name || query} onChange={(event) => { const value = event.target.value; setSelectedProfile(null); setQuery(value); setMessage(''); void searchProfiles(value) }} className="w-full bg-transparent text-white outline-none placeholder:text-slate-500" placeholder="Nombre, @usuario o AX-PER-..." />
        </div>
      </label>
      {!selectedProfile && query.trim().length >= 2 && <div className="absolute left-0 right-0 top-[78px] z-10 overflow-hidden rounded-[5px] border border-[#31556b] bg-[#0b1d2c] shadow-xl">
        {searching && <p className="px-4 py-3 text-sm text-slate-400">Buscando perfiles...</p>}
        {!searching && availableProfiles.map((profile) => <button type="button" key={profile.id} onClick={() => { setSelectedProfile(profile); setQuery(''); setProfiles([]) }} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-white/5"><span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-[#b4ff45]/10 text-[#b4ff45]">{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound size={17} />}</span><span className="min-w-0"><strong className="block truncate text-white">{profile.full_name || 'Usuario sin nombre'}</strong><span className="block truncate text-xs text-slate-400">{profile.username ? `@${profile.username}` : 'Sin usuario'}{profile.athlonx_code ? ` · ${profile.athlonx_code}` : ''}</span></span></button>)}
        {!searching && !availableProfiles.length && <p className="px-4 py-3 text-sm text-slate-500">No se encontraron perfiles.</p>}
      </div>}
      {selectedProfile && <div className="mt-3 rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/10 px-4 py-3 text-sm text-[#dfffba]">Seleccionado: <strong>{selectedProfile.full_name}</strong><span className="ml-2 text-xs text-slate-300">{selectedProfile.athlonx_code || selectedProfile.username || ''}</span></div>}
    </div>

    <button type="button" onClick={() => void sendRequest()} disabled={loading} className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[5px] bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] disabled:cursor-wait disabled:opacity-60"><Send size={17} />{loading ? 'Enviando...' : 'Enviar invitación'}</button>
    {message && <p role="status" className="mt-4 rounded-[5px] bg-[#07131e] px-4 py-3 text-sm font-semibold text-slate-200">{message}</p>}

    <div className="mt-8 border-t border-white/10 pt-6">
      <div className="flex items-center justify-between gap-3"><h3 className="font-heading text-xl font-black uppercase">Vinculaciones directas</h3><span className="rounded-[5px] border border-[#31556b] px-2 py-1 text-xs text-slate-400">{people.length}</span></div>
      {people.length ? <div className="mt-4 space-y-3">{people.map((person) => <article key={person.user_id} className="flex items-center gap-3 rounded-[5px] border border-[#29485d] bg-[#07131e] p-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-[#b4ff45] font-bold text-[#07131e]">{person.avatar_url ? <img src={person.avatar_url} alt={`Foto de ${person.full_name}`} className="h-full w-full object-cover" /> : person.full_name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate font-bold text-white">{person.full_name}</p><p className="mt-1 text-xs text-[#b4ff45]">{person.role_label}</p></div></article>)}</div> : <p className="mt-4 text-sm text-slate-500">No hay personas vinculadas directamente.</p>}
    </div>
  </section>
}

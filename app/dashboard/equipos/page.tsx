'use client'

import Link from 'next/link'
import { MapPin, Search, SlidersHorizontal, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { loadOrganizationScope } from '../../../lib/organization-hierarchy'

type Organization = { id: string; name: string }
type Discipline = { id: string; name: string; code: string }
type Modality = { id: string; name: string; code: string; discipline_id: string }
type Team = { id: string; name: string; country: string | null; city: string | null; logo_url: string | null; organization_id: string | null; discipline_id: string | null; modality_id: string | null; athlonx_code: string | null; handle: string | null }
type Player = { id: string; full_name: string; shirt_number: number | null; position: string | null; division: string | null }

export default function TeamsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [modalities, setModalities] = useState<Modality[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [organizationId, setOrganizationId] = useState('')
  const [disciplineId, setDisciplineId] = useState('')
  const [modalityId, setModalityId] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadBaseData() {
      if (!supabase) return
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return setMessage('Debes iniciar sesión para consultar los equipos.')
      const [{ data: contexts }, { data: memberships }, { data: sports }, { data: modalityRows }] = await Promise.all([
        supabase.from('user_contexts').select('organization_id').eq('user_id', userData.user.id).eq('context_type', 'organization').eq('status', 'active'),
        supabase.from('organization_members').select('organization_id').eq('user_id', userData.user.id).in('role', ['owner', 'directivo']).eq('status', 'active'),
        supabase.from('disciplines').select('id, name, code').eq('is_active', true).in('code', ['rugby', 'baloncesto']).order('name'),
        supabase.from('sport_modalities').select('id, name, code, discipline_id').eq('is_active', true).order('name'),
      ])
      const organizationIds = Array.from(new Set([...(contexts ?? []).map((context) => context.organization_id).filter((id): id is string => Boolean(id)), ...(memberships ?? []).map((membership) => membership.organization_id)]))
      if (!organizationIds.length) return setMessage('No hay una organización activa para consultar sus equipos.')
      const scopes = await Promise.all(organizationIds.map((id) => loadOrganizationScope(id)))
      const visibleOrganizationIds = Array.from(new Set(scopes.flatMap((scope) => scope.ids)))
      const [{ data: orgs }, { data: storedContext }] = await Promise.all([
        supabase.from('organizations').select('id, name').in('id', visibleOrganizationIds).order('name'),
        supabase.from('user_contexts').select('organization_id').eq('id', window.localStorage.getItem('athlonx-active-context-id') || '').maybeSingle(),
      ])
      const selectedOrganizationId = storedContext?.organization_id && visibleOrganizationIds.includes(storedContext.organization_id) ? storedContext.organization_id : orgs?.[0]?.id || ''
      setOrganizations(orgs ?? [])
      setOrganizationId(selectedOrganizationId)
      setDisciplines((sports ?? []) as Discipline[])
      setModalities((modalityRows ?? []) as Modality[])
    }
    void loadBaseData()
  }, [])

  useEffect(() => {
    async function loadTeams() {
      if (!supabase || !organizationId) { setTeams([]); setSelectedTeamId(''); return }
      const scope = await loadOrganizationScope(organizationId)
      if (scope.error) return setMessage(scope.error.message)
      const { data, error } = await supabase.from('teams').select('id, name, country, city, logo_url, organization_id, discipline_id, modality_id, athlonx_code, handle').in('organization_id', scope.ids).order('name')
      if (error) return setMessage(error.message)
      setTeams((data ?? []) as Team[])
      setSelectedTeamId((current) => data?.some((team) => team.id === current) ? current : data?.[0]?.id ?? '')
    }
    void loadTeams()
  }, [organizationId])

  useEffect(() => {
    async function loadPlayers() {
      if (!supabase || !selectedTeamId) { setPlayers([]); return }
      const { data, error } = await supabase.from('team_players').select('players(id, full_name, shirt_number, position, division)').eq('team_id', selectedTeamId)
      if (error) return setMessage(error.message)
      setPlayers((data ?? []).map((row: { players: Player | Player[] | null }) => Array.isArray(row.players) ? row.players[0] : row.players).filter(Boolean) as Player[])
    }
    void loadPlayers()
  }, [selectedTeamId])

  const visibleModalities = useMemo(() => modalities.filter((modality) => !disciplineId || modality.discipline_id === disciplineId), [disciplineId, modalities])
  const filteredTeams = useMemo(() => {
    const term = query.trim().toLowerCase()
    return teams.filter((team) => {
      const searchValues = [team.name, team.athlonx_code, team.handle, team.city].filter(Boolean).join(' ').toLowerCase()
      return (!term || searchValues.includes(term)) && (!disciplineId || team.discipline_id === disciplineId) && (!modalityId || team.modality_id === modalityId)
    })
  }, [disciplineId, modalityId, query, teams])
  const selectedTeam = teams.find((team) => team.id === selectedTeamId)

  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10"><div className="mx-auto max-w-7xl space-y-6">
    <header><p className="font-heading text-sm uppercase tracking-[.28em] text-[#b4ff45]">Afiliaciones deportivas</p><h1 className="mt-2 font-heading text-5xl font-black uppercase">Equipos</h1><p className="mt-2 max-w-3xl text-slate-400">Consulta los equipos afiliados a tu organización y revisa sus plantillas.</p></header>
    <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-6"><div className="flex flex-col gap-4 xl:flex-row xl:items-end"><label className="min-w-56 font-bold">Organización<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="mt-2 w-full cursor-pointer rounded-[5px] border border-[#31556b] bg-[#07131e] px-4 py-3 text-white"><option value="">Seleccionar organización</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label><div className="relative min-w-64 flex-1"><label htmlFor="team-search" className="font-bold">Buscar equipo</label><Search className="pointer-events-none absolute left-3 top-[42px] text-[#b4ff45]" size={18} /><input id="team-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, código AthlonX o @usuario" className="mt-2 h-12 w-full rounded-[5px] border border-[#31556b] bg-[#07131e] pl-10 pr-10 text-white outline-none placeholder:text-slate-500 focus:border-[#b4ff45]" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda" className="absolute right-3 top-[42px] translate-y-1/2 cursor-pointer text-slate-500 hover:text-white"><X size={16} /></button>}</div><label className="min-w-48 font-bold">Disciplina<select value={disciplineId} onChange={(event) => { setDisciplineId(event.target.value); setModalityId('') }} className="mt-2 w-full cursor-pointer rounded-[5px] border border-[#31556b] bg-[#07131e] px-4 py-3 text-white"><option value="">Todas las disciplinas</option>{disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}</select></label><label className="min-w-48 font-bold">Modalidad<select value={modalityId} onChange={(event) => setModalityId(event.target.value)} className="mt-2 w-full cursor-pointer rounded-[5px] border border-[#31556b] bg-[#07131e] px-4 py-3 text-white"><option value="">Todas las modalidades</option>{visibleModalities.map((modality) => <option key={modality.id} value={modality.id}>{modality.name}</option>)}</select></label><button type="button" onClick={() => { setQuery(''); setDisciplineId(''); setModalityId('') }} className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-[#31556b] px-4 font-bold text-slate-300 hover:border-[#b4ff45] hover:text-white"><SlidersHorizontal size={16} />Limpiar</button></div><p className="mt-4 text-sm text-slate-500">{filteredTeams.length} equipos encontrados dentro de la organización seleccionada.</p></section>
    <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]"><section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6"><div className="flex items-center justify-between gap-3 border-b border-white/10 pb-5"><div><p className="font-heading text-sm uppercase tracking-[.2em] text-[#b4ff45]">Directorio interno</p><h2 className="mt-2 font-heading text-2xl font-black uppercase">Equipos afiliados</h2></div><Users className="text-[#b4ff45]" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{filteredTeams.map((team) => { const discipline = disciplines.find((item) => item.id === team.discipline_id); const modality = modalities.find((item) => item.id === team.modality_id); return <article key={team.id} className={`rounded-[5px] border p-4 transition ${selectedTeamId === team.id ? 'border-[#b4ff45]/70 bg-[#122a2d]' : 'border-[#29485d] bg-[#07131e]'}`}><button type="button" onClick={() => setSelectedTeamId(team.id)} className="w-full cursor-pointer text-left"><div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-[#b4ff45] font-heading text-lg text-[#07131e]">{team.logo_url ? <img src={team.logo_url} alt={`Logo de ${team.name}`} className="h-full w-full object-cover" /> : team.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><h3 className="truncate text-lg font-bold text-slate-100">{team.name}</h3><p className="mt-1 text-sm text-[#b4ff45]">{discipline?.name || 'Disciplina pendiente'}{modality ? ` · ${modality.name}` : ''}</p></div></div><p className="mt-4 text-sm text-slate-400"><MapPin className="mr-1 inline" size={15} />{team.city || 'Ciudad no publicada'}</p><p className="mt-2 font-mono text-xs text-slate-500">{team.athlonx_code || 'Código pendiente'}</p></button><Link href={`/dashboard/equipos/${team.id}`} className="mt-4 inline-flex cursor-pointer text-sm font-bold text-[#b4ff45] hover:text-white">Ver perfil del equipo</Link></article> })}{!filteredTeams.length && <div className="rounded-[5px] border border-dashed border-[#31556b] p-6 text-sm text-slate-400 sm:col-span-2">{teams.length ? 'No hay equipos afiliados con estos filtros.' : 'Todavía no hay equipos afiliados a esta organización.'}</div>}</div></section>
      <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6"><div className="border-b border-white/10 pb-5"><p className="font-heading text-sm uppercase tracking-[.2em] text-[#b4ff45]">Plantilla</p><h2 className="mt-2 font-heading text-2xl font-black uppercase">{selectedTeam?.name || 'Selecciona un equipo'}</h2><p className="mt-2 text-sm text-slate-400">Consulta los atletas registrados en la plantilla.</p></div>{selectedTeam ? <div className="mt-5 space-y-3">{players.map((player) => <article key={player.id} className="rounded-[5px] border border-[#29485d] bg-[#07131e] p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-slate-100">{player.full_name}</p><p className="mt-1 text-sm text-slate-400">{player.position || 'Posición pendiente'}{player.division ? ` · ${player.division}` : ''}</p></div><span className="rounded-[5px] border border-[#31556b] px-2 py-1 font-mono text-sm text-[#b4ff45]">#{player.shirt_number ?? '--'}</span></div></article>)}{!players.length && <p className="text-sm text-slate-500">No hay atletas registrados en esta plantilla.</p>}</div> : <p className="mt-5 text-sm text-slate-500">Selecciona un equipo para ver su plantilla.</p>}</section></div>
  </div></main>
}

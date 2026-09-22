'use client'

import { FormEvent, useEffect, useState } from 'react'
import { MapPin, Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import { LocationFields } from '../../../Components/location-fields'
import { normalizePanamaCity } from '../../../lib/location-options'
import { supabase } from '../../../lib/supabase'

type Organization = { id: string; name: string }
type Discipline = { id: string; name: string; code: string }
type Team = { id: string; name: string; country: string; city: string | null; logo_url: string | null; organization_id: string | null; discipline_id: string | null; contact_email: string | null; contact_phone: string | null }
type Player = { id: string; full_name: string; shirt_number: number | null; position: string | null }

export default function TeamsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [organizationId, setOrganizationId] = useState('')
  const [disciplineId, setDisciplineId] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [name, setName] = useState('')
  const [country, setCountry] = useState('Panamá')
  const [city, setCity] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [playerNumber, setPlayerNumber] = useState('')
  const [playerPosition, setPlayerPosition] = useState('')
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadBaseData() {
      if (!supabase) return
      const [{ data: orgs }, { data: sports }] = await Promise.all([
        supabase.from('organizations').select('id, name').order('name'),
        supabase.from('disciplines').select('id, name, code').eq('is_active', true).in('code', ['rugby', 'baloncesto']).order('name'),
      ])
      setOrganizations(orgs ?? [])
      setDisciplines(sports ?? [])
      const { data: userData } = await supabase.auth.getUser()
      const storedContextId = window.localStorage.getItem('athlonx-active-context-id')
      const { data: activeContext } = storedContextId
        ? await supabase.from('user_contexts').select('organization_id, context_type').eq('id', storedContextId).maybeSingle()
        : { data: null }
      const { data: membership } = userData.user
        ? await supabase.from('organization_members').select('organization_id').eq('user_id', userData.user.id).in('role', ['owner', 'directivo']).eq('status', 'active').limit(1).maybeSingle()
        : { data: null }
      const activeOrganizationId = activeContext?.context_type === 'organization'
        ? activeContext.organization_id
        : membership?.organization_id
      const selectedOrganization = orgs?.find((organization) => organization.id === activeOrganizationId) ?? orgs?.[0]
      if (selectedOrganization) setOrganizationId(selectedOrganization.id)
      if (sports?.[0]) setDisciplineId(sports[0].id)
    }
    void loadBaseData()
  }, [])

  async function loadTeams() {
    if (!supabase || !organizationId) return
    const { data, error } = await supabase.from('teams').select('id,name,country,city,logo_url,organization_id,discipline_id,contact_email,contact_phone').eq('organization_id', organizationId).order('name')
    if (error) return setMessage(error.message)
    setTeams(data ?? [])
    setSelectedTeamId((current) => data?.some((team) => team.id === current) ? current : data?.[0]?.id ?? '')
  }

  useEffect(() => { void loadTeams() }, [organizationId])

  useEffect(() => {
    const refreshTeams = () => { void loadTeams() }
    window.addEventListener('athlonx-affiliation-updated', refreshTeams)
    return () => window.removeEventListener('athlonx-affiliation-updated', refreshTeams)
  }, [organizationId])

  useEffect(() => {
    async function loadPlayers() {
      if (!supabase || !selectedTeamId) return setPlayers([])
      const { data, error } = await supabase.from('team_players').select('players(id,full_name,shirt_number,position)').eq('team_id', selectedTeamId)
      if (error) return setMessage(error.message)
      setPlayers((data ?? []).map((row: any) => row.players).filter(Boolean))
    }
    void loadPlayers()
  }, [selectedTeamId])

  function resetTeamForm() {
    setEditingId(null)
    setName('')
    setCity('')
    setContactEmail('')
    setContactPhone('')
  }

  async function saveTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !organizationId || !disciplineId || !name.trim()) return
    const values = { name: name.trim(), country, city: city.trim() || null, contact_email: contactEmail.trim() || null, contact_phone: contactPhone.trim() || null, organization_id: organizationId, discipline_id: disciplineId }
    const query = editingId ? supabase.from('teams').update(values).eq('id', editingId).select('*').single() : supabase.from('teams').insert(values).select('*').single()
    const { data, error } = await query
    if (error || !data) return setMessage(error?.message || 'No se pudo guardar el equipo.')
    setTeams((current) => editingId ? current.map((team) => team.id === editingId ? data : team) : [...current, data])
    setSelectedTeamId(data.id)
    resetTeamForm()
    setMessage('Equipo guardado correctamente en Supabase.')
  }

  function startEditing(team: Team) {
    setEditingId(team.id)
    setName(team.name)
    setCountry(team.country || 'Panamá')
    setCity(normalizePanamaCity(team.city))
    setContactEmail(team.contact_email || '')
    setContactPhone(team.contact_phone || '')
    setDisciplineId(team.discipline_id || disciplineId)
  }

  async function removeTeam(team: Team) {
    if (!supabase || !window.confirm(`¿Eliminar ${team.name} de la organización?`)) return
    const { error } = await supabase.from('teams').delete().eq('id', team.id)
    if (error) return setMessage(error.message)
    setTeams((current) => current.filter((item) => item.id !== team.id))
    if (selectedTeamId === team.id) setSelectedTeamId('')
    setMessage('Equipo eliminado de Supabase.')
  }

  async function addPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !selectedTeamId || !playerName.trim()) return
    const userId = (await supabase.auth.getUser()).data.user?.id
    const { data: player, error: playerError } = await supabase.from('players').insert({ full_name: playerName.trim(), shirt_number: playerNumber ? Number(playerNumber) : null, position: playerPosition.trim() || null, created_by: userId }).select('id,full_name,shirt_number,position').single()
    if (playerError || !player) return setMessage(playerError?.message || 'No se pudo crear el jugador.')
    const { error: linkError } = await supabase.from('team_players').insert({ team_id: selectedTeamId, player_id: player.id, is_substitute: false })
    if (linkError) return setMessage(linkError.message)
    setPlayers((current) => [...current, player])
    setPlayerName('')
    setPlayerNumber('')
    setPlayerPosition('')
    setMessage('Jugador agregado correctamente.')
  }

  async function removePlayer(player: Player) {
    if (!supabase || !selectedTeamId) return
    const { error } = await supabase.from('team_players').delete().eq('team_id', selectedTeamId).eq('player_id', player.id)
    if (error) return setMessage(error.message)
    setPlayers((current) => current.filter((item) => item.id !== player.id))
    setMessage('Jugador retirado del equipo.')
  }

  const selectedTeam = teams.find((team) => team.id === selectedTeamId)
  return <main className="min-h-screen bg-[#f3f6f8] px-5 py-8 text-[#17212b] lg:ml-64 lg:px-10"><div className="mx-auto max-w-7xl space-y-6"><header><p className="font-heading text-sm uppercase tracking-[.28em] text-[#4c8500]">Gestión deportiva</p><h1 className="mt-2 font-heading text-5xl font-black uppercase text-[#081522]">Equipos</h1><p className="mt-2 text-slate-600">Registra equipos y jugadores por organización y disciplina.</p></header><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="grid gap-4 md:grid-cols-2"><label className="font-bold">Organización<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 px-4 py-3"><option value="">Seleccionar organización</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label><label className="font-bold">Disciplina<select value={disciplineId} onChange={(event) => setDisciplineId(event.target.value)} className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 px-4 py-3"><option value="">Seleccionar disciplina</option>{disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}</select></label></div></section><div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><form onSubmit={saveTeam} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-heading text-2xl font-black uppercase">{editingId ? 'Editar equipo' : 'Nuevo equipo'}</h2>{editingId && <button type="button" onClick={resetTeamForm} className="cursor-pointer text-slate-500" aria-label="Cancelar"><X size={20} /></button>}</div><div className="mt-5 space-y-4"><label className="block font-bold">Nombre<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Titanes" /></label><LocationFields country={country} city={city} onCountryChange={setCountry} onCityChange={setCity} variant="light" /><div className="grid gap-4 sm:grid-cols-2"><label className="font-bold">Teléfono<input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label><label className="font-bold">Correo de contacto<input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label></div></div><button type="submit" className="mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#B4FF45] px-5 py-3 font-bold text-[#081522]"><Plus size={18} />{editingId ? 'Guardar cambios' : 'Crear equipo'}</button></form><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-heading text-2xl font-black uppercase">Equipos registrados</h2><div className="mt-5 space-y-3">{teams.map((team) => <article key={team.id} className={`rounded-xl border p-4 ${selectedTeamId === team.id ? 'border-[#70b719] bg-[#f7fff0]' : 'border-slate-200'}`}><button type="button" onClick={() => setSelectedTeamId(team.id)} className="w-full cursor-pointer text-left"><h3 className="text-xl font-bold">{team.name}</h3><p className="mt-1 text-sm text-[#4c8500]">{disciplines.find((discipline) => discipline.id === team.discipline_id)?.name || 'Disciplina pendiente'}</p><p className="mt-2 text-sm text-slate-500"><MapPin className="mr-1 inline" size={15} />{team.city || 'Sin ciudad'} <Users className="ml-3 mr-1 inline" size={15} />{selectedTeamId === team.id ? players.length : 'ver jugadores'}</p></button><div className="mt-3 flex gap-2"><button type="button" onClick={() => startEditing(team)} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"><Pencil size={15} className="mr-1 inline" />Editar</button><button type="button" onClick={() => void removeTeam(team)} className="cursor-pointer rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-600"><Trash2 size={15} className="mr-1 inline" />Eliminar</button></div></article>)}{!teams.length && <p className="text-sm text-slate-500">No hay equipos para esta organización.</p>}</div></section></div><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="font-heading text-sm uppercase tracking-[.2em] text-[#70b719]">Plantilla global</p><h2 className="font-heading text-2xl font-black uppercase">Jugadores {selectedTeam ? `· ${selectedTeam.name}` : ''}</h2></div><Users className="text-[#70b719]" /></div>{selectedTeam && <><form onSubmit={addPlayer} className="mt-5 grid gap-3 md:grid-cols-[1.4fr_.5fr_1fr_auto]"><input required value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Nombre completo" className="rounded-lg border border-slate-300 px-4 py-3" /><input type="number" min="0" max="99" value={playerNumber} onChange={(event) => setPlayerNumber(event.target.value)} placeholder="Número" className="rounded-lg border border-slate-300 px-4 py-3" /><input value={playerPosition} onChange={(event) => setPlayerPosition(event.target.value)} placeholder="Posición" className="rounded-lg border border-slate-300 px-4 py-3" /><button type="submit" className="cursor-pointer rounded-lg bg-[#B4FF45] px-4 py-3 font-bold">Agregar</button></form><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{players.map((player) => <article key={player.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4"><div><p className="font-semibold">{player.full_name}</p><p className="text-sm text-slate-500">#{player.shirt_number ?? '--'} · {player.position || 'Posición pendiente'}</p></div><button type="button" onClick={() => void removePlayer(player)} className="cursor-pointer text-red-500" aria-label={`Eliminar ${player.full_name}`}><Trash2 size={18} /></button></article>)}{!players.length && <p className="text-sm text-slate-500">No hay jugadores registrados para este equipo.</p>}</div></>}</section>{message && <div role="status" className="rounded-xl bg-[#081522] p-4 font-semibold text-white">{message}</div>}</div></main>
}

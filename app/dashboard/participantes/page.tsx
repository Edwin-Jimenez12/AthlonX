'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Organization = { id: string; name: string; type: string }
type Team = { id: string; name: string }
type Division = { id: string; name: string }
type PendingProfile = { id: string; full_name: string; participation_type: string; status: string }

export default function ParticipantsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [people, setPeople] = useState<PendingProfile[]>([])
  const [organizationId, setOrganizationId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [divisionId, setDivisionId] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('entrenador')
  const [email, setEmail] = useState('')
  const [selectedPerson, setSelectedPerson] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      if (!supabase) return
      const [{ data: orgs }, { data: profiles }] = await Promise.all([
        supabase.from('organizations').select('id, name, type').order('name'),
        supabase.from('pending_profiles').select('id, full_name, participation_type, status').order('created_at', { ascending: false }),
      ])
      setOrganizations(orgs ?? [])
      setPeople(profiles ?? [])
      if (orgs?.[0]) setOrganizationId(orgs[0].id)
    }
    void load()
  }, [])

  useEffect(() => {
    async function loadTeams() {
      if (!supabase || !organizationId) return
      const { data } = await supabase.from('organizations').select('id, name').eq('parent_organization_id', organizationId).in('type', ['equipo', 'club']).order('name')
      setTeams(data ?? [])
      setTeamId('')
      setDivisionId('')
    }
    void loadTeams()
  }, [organizationId])

  useEffect(() => {
    async function loadDivisions() {
      if (!supabase || !teamId) return
      const { data } = await supabase.from('team_divisions').select('id, name').eq('team_id', teamId).order('name')
      setDivisions(data ?? [])
    }
    void loadDivisions()
  }, [teamId])

  async function createPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    if (!supabase || !organizationId) return setMessage('Selecciona una organización.')
    const { data, error } = await supabase.from('pending_profiles').insert({ full_name: name.trim(), participation_type: role, email: email.trim() || null, created_by: (await supabase.auth.getUser()).data.user?.id }).select('id, full_name, participation_type, status').single()
    if (error) return setMessage(error.message)
    if (data) {
      setPeople((current) => [data, ...current])
      setSelectedPerson(data.id)
      setName('')
      setEmail('')
      setMessage('Perfil provisional creado. Ahora genera su invitación.')
    }
  }

  async function generateInvite() {
    setMessage('')
    if (!supabase || !organizationId || !selectedPerson) return setMessage('Selecciona la organización y la persona.')
    const { data, error } = await supabase.rpc('create_participation_invite', { p_organization_id: organizationId, p_pending_profile_id: selectedPerson, p_role: role === 'entrenador' ? 'coach' : role, p_team_id: role === 'entrenador' ? teamId || null : null, p_division_id: role === 'entrenador' ? divisionId || null : null })
    if (error) return setMessage(error.message)
    const invite = Array.isArray(data) ? data[0] : data
    setCode(invite?.invitation_code ?? '')
    setMessage('Invitación generada. El código expira en 3 minutos y solo puede utilizarse una vez.')
  }

  return (
    <main className="min-h-screen bg-[#f3f6f8] px-5 py-8 lg:ml-64 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header><p className="font-heading text-sm uppercase tracking-[.28em] text-[#4c8500]">Gestión directiva</p><h1 className="mt-2 font-heading text-5xl font-black uppercase text-[#081522]">Participantes</h1><p className="mt-2 text-slate-600">Registra perfiles antes de que las personas creen su cuenta.</p></header>
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={createPerson} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-heading text-2xl font-black uppercase text-[#081522]">Crear perfil provisional</h2>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-bold">Organización<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"><option value="">Seleccionar</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
              <label className="block text-sm font-bold">Nombre completo<input value={name} onChange={(event) => setName(event.target.value)} required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
              <label className="block text-sm font-bold">Tipo de participación<select value={role} onChange={(event) => setRole(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"><option value="entrenador">Entrenador</option><option value="directivo">Directivo</option><option value="staff">Staff</option><option value="atleta">Jugador</option></select></label>
              <label className="block text-sm font-bold">Correo opcional<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Se usará cuando reclame su cuenta" /></label>
              {role === 'entrenador' && <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold">Equipo<select value={teamId} onChange={(event) => setTeamId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3"><option value="">Seleccionar</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label className="block text-sm font-bold">División<select value={divisionId} onChange={(event) => setDivisionId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3"><option value="">Seleccionar</option>{divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}</select></label></div>}
            </div>
            <button className="mt-6 w-full rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#081522]">Crear perfil</button>
          </form>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-heading text-2xl font-black uppercase text-[#081522]">Generar invitación</h2><p className="mt-2 text-slate-600">Selecciona un perfil provisional para crear su código.</p><select value={selectedPerson} onChange={(event) => setSelectedPerson(event.target.value)} className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3"><option value="">Seleccionar persona</option>{people.filter((person) => person.status === 'pending_claim').map((person) => <option key={person.id} value={person.id}>{person.full_name} · {person.participation_type}</option>)}</select><button type="button" onClick={generateInvite} className="mt-4 w-full rounded-xl border border-[#72b800] px-5 py-3 font-bold text-[#4c8500]">Generar código</button>{code && <div className="mt-6 rounded-2xl bg-[#081522] p-6 text-center text-white"><p className="text-xs uppercase tracking-widest text-[#b4ff45]">Código temporal</p><strong className="mt-2 block font-mono text-4xl tracking-widest">{code}</strong></div>}</section>
        </div>
        {message && <div role="status" className="rounded-xl bg-[#081522] p-4 font-semibold text-white">{message}</div>}
      </div>
    </main>
  )
}

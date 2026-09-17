'use client'

import { CalendarDays, Check, Dumbbell, Megaphone, Trophy, Users } from 'lucide-react'
import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { LocationFields } from './location-fields'
import { PANAMA_COUNTRY } from '../lib/location-options'
import { supabase } from '../lib/supabase'

type Discipline = { id: string; name: string; code: string }
type Team = { id: string; name: string; city: string | null }
type EventOption = { id: string; title: string; description: string; icon: LucideIcon; enabled: boolean }

const eventOptions: EventOption[] = [
  { id: 'torneo', title: 'Crear torneo', description: 'Organiza una competencia e invita a los equipos participantes.', icon: Trophy, enabled: true },
  { id: 'jornada', title: 'Crear jornada', description: 'Planifica una jornada deportiva con varias actividades.', icon: CalendarDays, enabled: false },
  { id: 'entrenamiento', title: 'Crear entrenamiento', description: 'Coordina una sesión para tus equipos vinculados.', icon: Dumbbell, enabled: false },
  { id: 'convocatoria', title: 'Crear convocatoria', description: 'Publica una convocatoria institucional.', icon: Megaphone, enabled: false },
]

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function OrganizationEventsPanel({ organizationId, sourceTeamId, disciplines }: { organizationId?: string; sourceTeamId?: string; disciplines: Discipline[] }) {
  const [selectedEvent, setSelectedEvent] = useState('torneo')
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [name, setName] = useState('')
  const [disciplineId, setDisciplineId] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [message, setMessage] = useState('')
  const [createdTournament, setCreatedTournament] = useState<{ id: string; slug: string } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setDisciplineId((current) => current || disciplines[0]?.id || '')
  }, [disciplines])

  useEffect(() => {
    async function loadTeams() {
      if (!supabase || (!organizationId && !sourceTeamId)) {
        setTeams([])
        return
      }
      let query = supabase.from('teams').select('id, name, city').order('name')
      if (organizationId) query = query.eq('organization_id', organizationId)
      if (sourceTeamId) query = query.neq('id', sourceTeamId)
      const { data } = await query
      setTeams(data ?? [])
    }
    void loadTeams()
  }, [organizationId, sourceTeamId])

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((current) => current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId])
  }

  async function createTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setCreatedTournament(null)
    if (!supabase || (!organizationId && !sourceTeamId)) return setMessage('Selecciona o crea un perfil organizador antes de crear un evento.')
    if (!name.trim() || !disciplineId || !startDate || !endDate) return setMessage('Completa el nombre, la disciplina y las fechas del torneo.')
    if (new Date(endDate) < new Date(startDate)) return setMessage('La fecha final no puede ser anterior a la fecha inicial.')

    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setLoading(false)
      return setMessage('Debes iniciar sesión para crear un evento.')
    }

    const baseSlug = slugify(name) || 'torneo'
    const slug = `${baseSlug}-${Date.now().toString(36)}`
    const { data: tournament, error } = await supabase.from('tournaments').insert({
      name: name.trim(),
      slug,
      season: new Date(startDate).getFullYear().toString(),
      start_date: startDate,
      end_date: endDate,
      country: PANAMA_COUNTRY,
      location: location.trim() || null,
      status: 'draft',
      created_by: userData.user.id,
      organization_id: organizationId || null,
      organizer_team_id: sourceTeamId || null,
      discipline_id: disciplineId,
    }).select('id, slug').single()

    if (error || !tournament) {
      setLoading(false)
      return setMessage(error?.message || 'No se pudo crear el torneo.')
    }

    const { data: division, error: divisionError } = await supabase.from('tournament_divisions').insert({ tournament_id: tournament.id, name: 'General', sort_order: 0 }).select('id').single()
    if (divisionError || !division) {
      setLoading(false)
      return setMessage(divisionError?.message || 'El torneo se creó, pero no se pudo preparar su división.')
    }

    if (selectedTeamIds.length) {
      const { error: invitationError } = await supabase.from('tournament_team_invitations').insert(selectedTeamIds.map((teamId) => ({ tournament_id: tournament.id, team_id: teamId, invited_by: userData.user.id, status: 'pending', division_id: division.id })))
      if (invitationError) {
        setLoading(false)
        return setMessage(`Torneo creado, pero no se pudieron enviar las invitaciones: ${invitationError.message}`)
      }
    }

    setLoading(false)
    setCreatedTournament(tournament)
    setMessage(selectedTeamIds.length ? `Torneo creado con ${selectedTeamIds.length} invitaciones pendientes.` : 'Torneo creado. Puedes invitar equipos desde su gestión.')
    setName('')
    setLocation('')
    setStartDate('')
    setEndDate('')
    setSelectedTeamIds([])
  }

  return (
    <section id="eventos" className="overflow-hidden rounded-3xl bg-[#081522] text-white shadow-xl">
      <div className="border-b border-white/10 px-6 py-6 sm:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.3em] text-[#b4ff45]">Centro de actividad</p>
            <h2 className="mt-2 font-heading text-3xl font-black uppercase sm:text-4xl">Crear evento</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Centraliza torneos y futuras actividades de la organización desde un solo lugar.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#b4ff45]/30 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#d8ffad]"><CalendarDays size={15} />Gestión institucional</span>
        </div>
      </div>

      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[.85fr_1.15fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-slate-400">Selecciona una opción</p>
          <div className="mt-4 grid gap-3">
            {eventOptions.map(({ id, title, description, icon: Icon, enabled }) => (
              <button key={id} type="button" disabled={!enabled} onClick={() => setSelectedEvent(id)} className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 text-left transition ${selectedEvent === id ? 'border-[#b4ff45] bg-[#b4ff45] text-[#081522]' : 'border-white/10 bg-white/[.03] text-white hover:border-white/30'} disabled:cursor-not-allowed disabled:opacity-55`}>
                <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedEvent === id ? 'bg-[#081522]/10' : 'bg-white/10'}`}><Icon size={20} /></span>
                <span><strong className="block text-sm font-bold">{title}</strong><span className={`mt-1 block text-xs leading-5 ${selectedEvent === id ? 'text-[#254600]' : 'text-slate-400'}`}>{description}</span>{!enabled && <span className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-[#b4ff45]">Próximamente</span>}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedEvent === 'torneo' && <form onSubmit={createTournament} className="rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Nuevo torneo</p><h3 className="mt-2 font-heading text-2xl font-black uppercase">Configuración inicial</h3></div><Trophy className="text-[#b4ff45]" size={24} /></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold sm:col-span-2">Nombre del torneo<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d2232] px-4 py-3 outline-none placeholder:text-slate-500 focus:border-[#b4ff45]" placeholder="Copa AthlonX" /></label>
            <label className="block text-sm font-semibold">Disciplina<select required value={disciplineId} onChange={(event) => setDisciplineId(event.target.value)} className="mt-2 w-full cursor-pointer rounded-xl border border-white/15 bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]"><option value="">Seleccionar</option>{disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}</select></label>
            <LocationFields country={PANAMA_COUNTRY} city={location} onCityChange={setLocation} className="sm:col-span-2" />
            <label className="block text-sm font-semibold">Fecha inicial<input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label>
            <label className="block text-sm font-semibold">Fecha final<input required type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold">Invitar equipos</p><p className="mt-1 text-xs text-slate-400">Selecciona los equipos que recibirán la invitación.</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">{selectedTeamIds.length} seleccionados</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{teams.length ? teams.map((team) => <button key={team.id} type="button" onClick={() => toggleTeam(team.id)} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition ${selectedTeamIds.includes(team.id) ? 'border-[#b4ff45] bg-[#b4ff45]/15 text-[#e2ffc0]' : 'border-white/10 bg-[#0d2232] text-slate-300 hover:border-white/30'}`}><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${selectedTeamIds.includes(team.id) ? 'bg-[#b4ff45] text-[#081522]' : 'bg-white/10'}`}>{selectedTeamIds.includes(team.id) ? <Check size={15} /> : <Users size={15} />}</span><span><strong className="block">{team.name}</strong><small className="text-xs text-slate-500">{team.city || 'Ciudad pendiente'}</small></span></button>) : <div className="sm:col-span-2 rounded-xl border border-dashed border-white/15 px-4 py-4 text-sm text-slate-400">No hay equipos vinculados a esta organización todavía.</div>}</div></div>
          {message && <p role="status" className="mt-5 rounded-xl border border-[#b4ff45]/30 bg-[#b4ff45]/10 p-3 text-sm text-[#dfffba]">{message}</p>}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">El torneo se guardará como borrador para completar su configuración.</p><button type="submit" disabled={loading} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#081522] transition hover:bg-[#c8ff7a] disabled:cursor-wait disabled:opacity-60">{loading ? 'Creando...' : 'Crear torneo'}</button></div>
          {createdTournament && <Link href={`/dashboard/torneos/${createdTournament.slug}`} className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-[#b4ff45] hover:text-white">Abrir gestión del torneo <span aria-hidden="true">→</span></Link>}
        </form>}
      </div>
    </section>
  )
}

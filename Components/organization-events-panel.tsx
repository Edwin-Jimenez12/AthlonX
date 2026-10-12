'use client'

import { CalendarDays, Dumbbell, Megaphone, Trophy } from 'lucide-react'
import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { LocationFields } from './location-fields'
import { StyledSelect } from './styled-select'
import { PANAMA_COUNTRY } from '../lib/location-options'
import { supabase } from '../lib/supabase'
import { footballEight } from '../lib/football-eight'

type Discipline = { id: string; name: string; code: string }
type Modality = { id: string; name: string; code: string; discipline_id: string }
type ModalityRule = { id: string; modality_id: string; players_on_field: number; max_roster_size: number; substitutions_allowed: number | null; substitutions_unlimited: boolean; half_duration_minutes: number; halftime_duration_minutes: number; extra_time_allowed: boolean; draws_allowed: boolean }
type EventOption = { id: string; title: string; description: string; icon: LucideIcon; enabled: boolean }

const eventOptions: EventOption[] = [
  { id: 'torneo', title: 'Crear torneo', description: 'Organiza una competencia e invita a los equipos participantes.', icon: Trophy, enabled: true },
  { id: 'torneo-rapido', title: 'Crear torneo rápido', description: 'Crea una competencia no oficial con equipos registrados o temporales.', icon: Trophy, enabled: true },
  { id: 'jornada', title: 'Crear jornada', description: 'Planifica una jornada deportiva con varias actividades.', icon: CalendarDays, enabled: false },
  { id: 'entrenamiento', title: 'Crear entrenamiento', description: 'Coordina una sesión para tus equipos vinculados.', icon: Dumbbell, enabled: false },
  { id: 'convocatoria', title: 'Crear convocatoria', description: 'Publica una convocatoria institucional.', icon: Megaphone, enabled: false },
]

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function OrganizationEventsPanel({ organizationId, sourceTeamId, disciplines, onCreated }: { organizationId?: string; sourceTeamId?: string; disciplines: Discipline[]; onCreated?: () => void }) {
  const [selectedEvent, setSelectedEvent] = useState('torneo')
  const [name, setName] = useState('')
  const [disciplineId, setDisciplineId] = useState('')
  const [modalities, setModalities] = useState<Modality[]>([])
  const [modalityError, setModalityError] = useState('')
  const [rulesError, setRulesError] = useState('')
  const [modalityId, setModalityId] = useState('')
  const [modalityRules, setModalityRules] = useState<ModalityRule[]>([])
  const [competitionFormat, setCompetitionFormat] = useState('quick_league')
  const [courtsCount, setCourtsCount] = useState('1')
  const [maxTeams, setMaxTeams] = useState('14')
  const [maxRosterSize, setMaxRosterSize] = useState('12')
  const [halfDuration, setHalfDuration] = useState('')
  const [halftimeDuration, setHalftimeDuration] = useState('')
  const [intervalDuration, setIntervalDuration] = useState('')
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
    async function loadModalities() {
      if (!supabase) return
      const [{ data, error }, rulesResult] = await Promise.all([
        supabase.from('sport_modalities').select('id, name, code, discipline_id').eq('is_active', true).order('name'),
        supabase.from('sport_modality_rules').select('id, modality_id, players_on_field, max_roster_size, substitutions_allowed, substitutions_unlimited, half_duration_minutes, halftime_duration_minutes, extra_time_allowed, draws_allowed'),
      ])
      setModalities((data ?? []) as Modality[])
      setModalityRules((rulesResult.data ?? []) as ModalityRule[])
      setModalityError(error ? 'No se pudieron cargar las modalidades. Ejecuta la migración de disciplinas y modalidades en Supabase.' : !data?.length ? 'No hay modalidades activas disponibles. Ejecuta la migración de disciplinas y modalidades en Supabase.' : '')
      setRulesError(rulesResult.error ? 'No se pudieron cargar las reglas de las modalidades. Ejecuta la migración de reglas de fútbol en Supabase.' : '')
    }
    void loadModalities()
  }, [])

  const availableModalities = modalities.filter((modality) => modality.discipline_id === disciplineId)
  const selectableModalities = availableModalities.filter(
    (modality) => !['futbol-7', 'futbol-11'].includes(modality.code),
  )
  const selectedDiscipline = disciplines.find((discipline) => discipline.id === disciplineId)
  const selectedModality = modalities.find((modality) => modality.id === modalityId)
  const selectedRule = modalityRules.find((rule) => rule.modality_id === modalityId)
  const isFootball = selectedDiscipline?.code === 'futbol'
  const isFootball5 = selectedModality?.code === 'futbol-5'
  const isFootball8 = isFootball && selectedModality?.code === 'futbol-8'

  // Mantiene la configuración de tiempos editable por torneo y modalidad.
  useEffect(() => {
    if (selectedRule) setMaxRosterSize(String(selectedRule.max_roster_size || 12))
    if (selectedModality?.code === 'futbol-5') setMaxTeams('10')
    if (isFootball8) {
      setMaxTeams(String(footballEight.maxTeams))
      setCompetitionFormat(footballEight.format)
      setHalfDuration(String(footballEight.halfMinutes))
      setHalftimeDuration(String(footballEight.halftimeMinutes))
      setIntervalDuration('10')
      return
    }
    setMaxTeams((current) => ['10', '16'].includes(current) && !isFootball5 ? '14' : current)
    setCompetitionFormat('quick_league')
    setHalfDuration('')
    setHalftimeDuration('')
    setIntervalDuration('')
  }, [modalityId, selectedModality, selectedRule, isFootball8, isFootball5])

  useEffect(() => {
    setModalityId((current) => selectableModalities.some((modality) => modality.id === current)
      ? current
      : selectableModalities[0]?.id || '')
  }, [disciplineId, modalities])

  async function createTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setCreatedTournament(null)
    if (!supabase || (!organizationId && !sourceTeamId)) return setMessage('Selecciona o crea un perfil organizador antes de crear un evento.')
    if (!name.trim() || !disciplineId || !modalityId || !startDate || !endDate) return setMessage('Completa el nombre, la disciplina, la modalidad y las fechas del torneo.')
    const parsedCourts = Number(courtsCount)
    const parsedMaxTeams = Number(maxTeams)
    const parsedMaxRosterSize = Number(maxRosterSize)
    const parsedHalfDuration = Number(halfDuration)
    const parsedHalftimeDuration = Number(halftimeDuration)
    const parsedIntervalDuration = Number(intervalDuration)
    if (isFootball8 && (parsedMaxTeams !== 16 || competitionFormat !== 'knockout' || parsedHalfDuration !== 20 || parsedHalftimeDuration !== 5)) {
      return setMessage('Fútbol 8 vs 8 requiere 16 equipos, eliminación directa, tiempos de 20 minutos y descanso de 5 minutos.')
    }
    if (isFootball && (
      !selectedRule
      || !competitionFormat
      || !Number.isInteger(parsedCourts)
      || ![1, 2].includes(parsedCourts)
      || !Number.isInteger(parsedMaxTeams)
      || (isFootball5 ? parsedMaxTeams !== 10 : parsedMaxTeams < 2)
      || !Number.isInteger(parsedMaxRosterSize)
      || parsedMaxRosterSize < 1
      || !Number.isInteger(parsedHalfDuration)
      || parsedHalfDuration < 1
      || parsedHalfDuration > 120
      || !Number.isInteger(parsedHalftimeDuration)
      || parsedHalftimeDuration < 0
      || parsedHalftimeDuration > 60
      || !Number.isInteger(parsedIntervalDuration)
      || parsedIntervalDuration < 0
      || parsedIntervalDuration > 120
    )) return setMessage(rulesError || 'Completa correctamente la configuración de la modalidad de fútbol.')
    if (new Date(endDate) < new Date(startDate)) return setMessage('La fecha final no puede ser anterior a la fecha inicial.')

    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setLoading(false)
      return setMessage('Debes iniciar sesión para crear un evento.')
    }

    const baseSlug = slugify(name) || 'torneo'
    const slug = `${baseSlug}-${Date.now().toString(36)}`
    const isQuick = selectedEvent === 'torneo-rapido'
    const { data: tournament, error } = await supabase.from('tournaments').insert({
      name: name.trim(),
      slug,
      season: new Date(startDate).getFullYear().toString(),
      start_date: startDate,
      end_date: endDate,
      country: PANAMA_COUNTRY,
      location: location.trim() || null,
      status: 'draft',
      is_quick: isQuick,
      created_by: userData.user.id,
      organization_id: organizationId || null,
      organizer_team_id: sourceTeamId || null,
      discipline_id: disciplineId,
      modality_id: modalityId,
    }).select('id, slug').single()

    if (error || !tournament) {
      setLoading(false)
      return setMessage(error?.message || 'No se pudo crear el torneo.')
    }

    const { data: division, error: divisionError } = await supabase
      .from('tournament_divisions')
      .insert({
        tournament_id: tournament.id,
        name: 'Primera división',
        sort_order: 0,
      })
      .select('id')
      .single()
    if (divisionError || !division) {
      setLoading(false)
      return setMessage(divisionError?.message || 'El torneo se creó, pero no se pudo preparar su división.')
    }

    if (isFootball) {
      const { error: settingsError } = await supabase.from('tournament_competition_settings').insert({
        tournament_id: tournament.id,
        competition_format: competitionFormat,
        courts_count: parsedCourts,
        modality_rules_id: selectedRule?.id || null,
        max_teams: parsedMaxTeams,
        max_roster_size: parsedMaxRosterSize,
        half_duration_minutes: parsedHalfDuration,
        halftime_duration_minutes: parsedHalftimeDuration,
        interval_between_matches_minutes: parsedIntervalDuration,
      })
      if (settingsError) {
        setLoading(false)
        return setMessage(settingsError.message)
      }
    }

    setLoading(false)
    setCreatedTournament(tournament)
    setMessage('Torneo creado. Puedes completar sus equipos y fixtures desde la gestión del torneo.')
    onCreated?.()
    setName('')
    setModalityId('')
    setCompetitionFormat('quick_league')
    setCourtsCount('1')
    setMaxTeams('14')
    setMaxRosterSize('12')
    setHalfDuration('')
    setHalftimeDuration('')
    setIntervalDuration('')
    setLocation('')
    setStartDate('')
    setEndDate('')
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

        {(selectedEvent === 'torneo' || selectedEvent === 'torneo-rapido') && <form onSubmit={createTournament} className="rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">{selectedEvent === 'torneo-rapido' ? 'Torneo no oficial' : 'Nuevo torneo'}</p><h3 className="mt-2 font-heading text-2xl font-black uppercase">Configuración inicial</h3><p className="mt-2 text-sm leading-6 text-slate-400">{selectedEvent === 'torneo-rapido' ? 'Podrás agregar equipos oficiales y equipos temporales para esta competencia.' : 'Solo podrás agregar equipos registrados en AthlonX.'}</p></div><Trophy className="text-[#b4ff45]" size={24} /></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold sm:col-span-2">Nombre del torneo<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d2232] px-4 py-3 outline-none placeholder:text-slate-500 focus:border-[#b4ff45]" placeholder="Copa AthlonX" /></label>
            <StyledSelect label="Disciplina" value={disciplineId} onChange={setDisciplineId} options={disciplines.map((discipline) => ({ value: discipline.id, label: discipline.name }))} placeholder="Seleccionar disciplina" required />
              <StyledSelect
                label="Modalidad"
                value={modalityId}
                onChange={setModalityId}
                options={availableModalities.map((modality) => ({
                  value: modality.id,
                  label: modality.name,
                  disabled: ['futbol-7', 'futbol-11'].includes(modality.code),
                }))}
                placeholder={disciplineId ? 'Seleccionar modalidad' : 'Selecciona una disciplina'}
                disabled={!disciplineId || !availableModalities.length}
                required
              />
            {disciplineId && !availableModalities.length && <p className="text-xs leading-5 text-amber-200 sm:col-span-2">{modalityError || 'Cargando modalidades...'}</p>}
            {isFootball && rulesError && <p className="text-xs leading-5 text-amber-200 sm:col-span-2">{rulesError}</p>}
            {isFootball && <>
              <StyledSelect label="Formato del torneo" value={competitionFormat} onChange={setCompetitionFormat} options={isFootball8 ? [{ value: 'knockout', label: 'Eliminación directa · 16 equipos' }] : [{ value: 'quick_league', label: 'Todos contra todos' }, { value: 'group_stage', label: 'Fase de grupos' }, { value: 'knockout', label: 'Eliminación directa' }]} disabled={isFootball8} required />
              <label className="block text-sm font-semibold">Número de canchas<select required value={courtsCount} onChange={(event) => setCourtsCount(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]"><option value="1">1 cancha</option><option value="2">2 canchas</option></select></label>
              <label className="block text-sm font-semibold">Máximo de equipos<input required type="number" min={isFootball8 ? 16 : isFootball5 ? 10 : 2} max={isFootball8 ? 16 : isFootball5 ? 10 : undefined} value={maxTeams} readOnly={isFootball5 || isFootball8} onChange={(event) => setMaxTeams(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d2232] px-4 py-3 outline-none placeholder:text-slate-500 focus:border-[#b4ff45] read-only:cursor-not-allowed read-only:opacity-70" />{isFootball5 && <span className="mt-1 block text-xs text-slate-400">Fútbol 5 vs 5 requiere exactamente 10 equipos.</span>}</label>
              <label className="block text-sm font-semibold">Plantilla máxima<input required type="number" min="1" value={maxRosterSize} onChange={(event) => setMaxRosterSize(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label>
              <label className="block text-sm font-semibold">Minutos por tiempo<input required readOnly={isFootball8} type="number" min="1" max="120" value={halfDuration} onChange={(event) => setHalfDuration(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label>
              <label className="block text-sm font-semibold">Descanso entre tiempos<input required readOnly={isFootball8} type="number" min="0" max="60" value={halftimeDuration} onChange={(event) => setHalftimeDuration(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label>
              {isFootball8 && <p className="text-sm text-[#d8ffad] sm:col-span-2">Octavos → cuartos → semifinales → final. Si hay empate: 10 minutos extra y, si persiste, penales directos.</p>}
              <label className="block text-sm font-semibold">Intervalo entre partidos<input required type="number" min="0" max="120" value={intervalDuration} onChange={(event) => setIntervalDuration(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label>
              {selectedRule && <div className="rounded-xl border border-[#b4ff45]/25 bg-[#b4ff45]/10 p-3 text-xs leading-5 text-[#d8ffad] sm:col-span-2">{selectedRule.players_on_field} jugadores en cancha · {selectedRule.substitutions_unlimited ? 'Cambios ilimitados' : `${selectedRule.substitutions_allowed} cambios`}.</div>}
            </>}
            <LocationFields country={PANAMA_COUNTRY} city={location} onCityChange={setLocation} className="sm:col-span-2" />
            <label className="block text-sm font-semibold">Fecha inicial<input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label>
            <label className="block text-sm font-semibold">Fecha final<input required type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label>
          </div>

          {message && <p role="status" className="mt-5 rounded-xl border border-[#b4ff45]/30 bg-[#b4ff45]/10 p-3 text-sm text-[#dfffba]">{message}</p>}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">El torneo se guardará como borrador para completar su configuración.</p><button type="submit" disabled={loading} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#081522] transition hover:bg-[#c8ff7a] disabled:cursor-wait disabled:opacity-60">{loading ? 'Creando...' : 'Crear torneo'}</button></div>
          {createdTournament && <Link href={`/dashboard/torneos/ver/${createdTournament.id}`} className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-[#b4ff45] hover:text-white">Ver torneo <span aria-hidden="true">→</span></Link>}
        </form>}
      </div>
    </section>
  )
}

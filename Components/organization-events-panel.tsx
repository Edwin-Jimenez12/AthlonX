'use client'

import { AlertTriangle, CalendarPlus, CheckCircle2, Dumbbell, Info, Megaphone, Trophy, X, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Button, Card, CardHeader, FieldLabel, IconButton, Notice, Select, cx, inputClass } from './mi-equipo/ui'
import { PANAMA_CITIES, PANAMA_COUNTRY } from '../lib/location-options'
import { supabase } from '../lib/supabase'
import { footballEight } from '../lib/football-eight'
import { validateBasketballSettings } from '../lib/basketball'
import { isLeagueFormat, leagueFormats } from '../lib/league'

type Discipline = { id: string; name: string; code: string }
type Modality = { id: string; name: string; code: string; discipline_id: string }
type ModalityRule = { id: string; modality_id: string; players_on_field: number; max_roster_size: number; substitutions_allowed: number | null; substitutions_unlimited: boolean; half_duration_minutes: number; halftime_duration_minutes: number; extra_time_allowed: boolean; draws_allowed: boolean }
type EventOption = { id: string; title: string; description: string; icon: LucideIcon; enabled: boolean }

const eventOptions: EventOption[] = [
  { id: 'torneo', title: 'Torneo', description: 'Competencia oficial con equipos registrados en AthlonX.', icon: Trophy, enabled: true },
  { id: 'torneo-rapido', title: 'Torneo rápido', description: 'No oficial: admite equipos registrados y temporales.', icon: Zap, enabled: true },
  { id: 'jornada', title: 'Jornada', description: 'Varias actividades deportivas en un mismo día.', icon: CalendarPlus, enabled: false },
  { id: 'entrenamiento', title: 'Entrenamiento', description: 'Sesión para tus equipos vinculados.', icon: Dumbbell, enabled: false },
  { id: 'convocatoria', title: 'Convocatoria', description: 'Anuncio institucional para tus equipos.', icon: Megaphone, enabled: false },
]

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function OrganizationEventsPanel({ organizationId, sourceTeamId, disciplines, onCreated, onClose }: { organizationId?: string; sourceTeamId?: string; disciplines: Discipline[]; onCreated?: () => void; onClose?: () => void }) {
  const router = useRouter()
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
  const [legs, setLegs] = useState('1')
  const [playoffTeams, setPlayoffTeams] = useState('4')
  const [maxTeams, setMaxTeams] = useState(String(footballEight.maxTeams))
  const [maxRosterSize, setMaxRosterSize] = useState('12')
  const [halfDuration, setHalfDuration] = useState('')
  const [halftimeDuration, setHalftimeDuration] = useState('')
  const [intervalDuration, setIntervalDuration] = useState('')
  const [overtimeDuration, setOvertimeDuration] = useState('')
  const [opensAt, setOpensAt] = useState('08:00')
  const [closesAt, setClosesAt] = useState('17:00')
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
  const selectedDiscipline = disciplines.find((discipline) => discipline.id === disciplineId)
  const selectableModalities = availableModalities.filter(
    (modality) => selectedDiscipline?.code === 'futbol'
      ? modality.code === 'futbol-8'
      : selectedDiscipline?.code === 'baloncesto' ? modality.code === '3x3'
      : !['futbol-7', 'futbol-11'].includes(modality.code),
  )
  const selectedModality = modalities.find((modality) => modality.id === modalityId)
  const selectedRule = modalityRules.find((rule) => rule.modality_id === modalityId)
  const isFootball = selectedDiscipline?.code === 'futbol'
  const isFootball8 = isFootball && selectedModality?.code === 'futbol-8'
  const isBasketball3 = selectedDiscipline?.code === 'baloncesto' && selectedModality?.code === '3x3'
  const isRugby = selectedDiscipline?.code === 'rugby'

  // Rugby se juega por liga: todos contra todos por defecto.
  useEffect(() => {
    if (isRugby) setCompetitionFormat((current) => isLeagueFormat(current) ? current : 'round_robin')
  }, [isRugby])

  useEffect(() => {
    if (!isBasketball3) return
    setHalfDuration(''); setIntervalDuration(''); setOvertimeDuration('')
    setLocation('Universidad Tecnológica de Panamá (UTP)')
  }, [isBasketball3])

  // Aplica los valores iniciales de la modalidad seleccionada.
  useEffect(() => {
    if (!isFootball) return
    if (isFootball8) {
      setMaxRosterSize(String(footballEight.maxRosterSize))
    } else if (selectedRule) {
      setMaxRosterSize(String(selectedRule.max_roster_size || 12))
    }
    if (isFootball8) {
      setMaxTeams(String(footballEight.maxTeams))
      setCompetitionFormat(footballEight.format)
      setHalfDuration(String(footballEight.halfMinutes))
      setHalftimeDuration(String(footballEight.halftimeMinutes))
      setIntervalDuration('10')
      return
    }
    setMaxTeams(String(footballEight.maxTeams))
    setCompetitionFormat('quick_league')
    setHalfDuration('')
    setHalftimeDuration('')
    setIntervalDuration('')
  }, [modalityId, selectedModality, selectedRule, isFootball, isFootball8])

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
    if (isBasketball3) {
      const settings = { period_minutes: Number(halfDuration), interval_minutes: Number(intervalDuration), overtime_minutes: Number(overtimeDuration), opens_at: opensAt, closes_at: closesAt, venue: location }
      const issue = !intervalDuration.trim() ? 'Completa el intervalo entre partidos.' : validateBasketballSettings(settings)
      if (issue) return setMessage(issue)
      if (new Date(endDate) < new Date(startDate)) return setMessage('La fecha final no puede ser anterior a la inicial.')
      setLoading(true)
      try {
        const { data, error } = await supabase.rpc('create_basketball_tournament', {
          p_values: { name: name.trim(), start_date: startDate, end_date: endDate, organization_id: organizationId || null, organizer_team_id: sourceTeamId || null, is_quick: selectedEvent === 'torneo-rapido' }, p_settings: settings,
        })
        if (error) throw error
        setCreatedTournament(data); setMessage('Torneo 3x3 creado. Abriendo su configuración…'); onCreated?.(); router.push(`/torneos/ver/${data.id}?editar=1`)
      } catch (e) { setMessage((e as Error).message || 'No se pudo crear el torneo.') } finally { setLoading(false) }
      return
    }
    if (isFootball && !isFootball8) {
      return setMessage('Actualmente solo está disponible la modalidad Fútbol 8 vs 8.')
    }
    if (isFootball8 && (
      parsedMaxTeams !== footballEight.maxTeams
      || competitionFormat !== footballEight.format
    )) {
      return setMessage('Fútbol 8 vs 8 requiere 16 equipos y eliminación directa.')
    }
    if (isFootball && (
      !selectedRule
      || !competitionFormat
      || !Number.isInteger(parsedCourts)
      || ![1, 2].includes(parsedCourts)
      || !Number.isInteger(parsedMaxTeams)
      || parsedMaxTeams !== footballEight.maxTeams
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

    if (isRugby) {
      const sevens = selectedModality?.code !== 'xv'
      const { error: settingsError } = await supabase.from('tournament_competition_settings').insert({
        tournament_id: tournament.id,
        competition_format: isLeagueFormat(competitionFormat) ? competitionFormat : 'round_robin',
        round_robin_legs: Number(legs),
        qualifying_teams_per_group: Number(playoffTeams),
        courts_count: Number(courtsCount),
        half_duration_minutes: sevens ? 7 : 40,
        halftime_duration_minutes: sevens ? 2 : 10,
        interval_between_matches_minutes: 10,
      })
      if (settingsError) {
        setLoading(false)
        return setMessage(settingsError.message)
      }
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
    setMessage('Torneo creado. Abriendo su configuración…')
    onCreated?.()
    router.push(`/torneos/ver/${tournament.id}?editar=1`)
    setName('')
    setModalityId('')
    setCompetitionFormat('quick_league')
    setCourtsCount('1')
    setLegs('1')
    setPlayoffTeams('4')
    setMaxTeams('14')
    setMaxRosterSize('12')
    setHalfDuration('')
    setHalftimeDuration('')
    setIntervalDuration('')
    setLocation('')
    setStartDate('')
    setEndDate('')
  }

  const field = (label: string, input: ReactNode, className?: string) => <label className={cx('block min-w-0', className)}><FieldLabel>{label}</FieldLabel>{input}</label>
  const numberInput = (value: string, onChange: (value: string) => void, min: string, max?: string) => <input required type="number" min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
  const isQuickEvent = selectedEvent === 'torneo-rapido'

  return (
    <Card labelledBy="create-event-title" className="ax-drop-in space-y-5">
      <CardHeader id="create-event-title" title="Crear evento" size="lg" actions={onClose && <IconButton icon={X} label="Cerrar" size={36} onClick={onClose} className="border-transparent" />} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Tipo de evento">
        {eventOptions.map(({ id, title, description, icon: Icon, enabled }) => {
          const active = selectedEvent === id
          return <button key={id} type="button" role="radio" aria-checked={active} disabled={!enabled} onClick={() => setSelectedEvent(id)} className={cx(
            'flex cursor-pointer items-start gap-3 rounded-[14px] border p-4 text-left transition-[background-color,border-color] duration-150 disabled:cursor-not-allowed',
            active ? 'border-[var(--ax-accent-line)] bg-[var(--ax-accent-soft)]' : 'border-[var(--ax-line)] hover:border-[var(--ax-line-strong)] hover:bg-[var(--ax-hover)]',
          )}>
            <span aria-hidden="true" className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]', active ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : enabled ? 'bg-[var(--ax-accent-soft)] text-[var(--ax-accent-text)]' : 'bg-[var(--ax-surface-raised)] text-[var(--ax-muted)]')}><Icon size={18} /></span>
            <span className="min-w-0 space-y-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <strong className={cx('text-sm font-semibold', enabled ? 'text-[var(--ax-text)]' : 'text-[var(--ax-text-secondary)]')}>{title}</strong>
                {!enabled && <Badge>Próximamente</Badge>}
              </span>
              <span className="block text-[13px] leading-[18px] text-[var(--ax-muted)]">{description}</span>
            </span>
          </button>
        })}
      </div>

      {(selectedEvent === 'torneo' || isQuickEvent) && <form onSubmit={createTournament} className="space-y-4 rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-sunken)] p-4 sm:p-5">
        <p className="text-[13px] text-[var(--ax-text-secondary)]">{isQuickEvent ? 'Torneo no oficial: podrás agregar equipos registrados y equipos temporales.' : 'Nuevo torneo: solo podrás agregar equipos registrados en AthlonX.'}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          {field('Nombre del torneo', <input required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Copa AthlonX" />, 'sm:col-span-2 lg:col-span-1')}
          <Select label="Disciplina" value={disciplineId} onChange={setDisciplineId} options={disciplines.map((discipline) => ({ value: discipline.id, label: discipline.name }))} placeholder="Seleccionar disciplina" />
          <Select label="Modalidad" value={modalityId} onChange={setModalityId} options={selectableModalities.map((modality) => ({ value: modality.id, label: modality.name }))} placeholder={disciplineId ? 'Seleccionar modalidad' : 'Selecciona una disciplina'} disabled={!disciplineId || !selectableModalities.length} />
        </div>
        {disciplineId && !selectableModalities.length && <Notice tone="warning" icon={AlertTriangle}>{modalityError || 'Cargando modalidades…'}</Notice>}
        {isFootball && rulesError && <Notice tone="warning" icon={AlertTriangle}>{rulesError}</Notice>}

        {isBasketball3 && <div className="space-y-4">
          <Notice tone="success" icon={Info}>16 equipos · eliminación directa · una cancha · un periodo. Plantillas de 3 a 6 jugadores.</Notice>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {field('Duración del periodo (min)', numberInput(halfDuration, setHalfDuration, '1', '120'))}
            {field('Intervalo entre partidos (min)', numberInput(intervalDuration, setIntervalDuration, '0', '120'))}
            {field('Duración de cada prórroga (min)', numberInput(overtimeDuration, setOvertimeDuration, '1', '120'))}
            {field('Inicio de la jornada', <input required type="time" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} className={inputClass} />)}
            {field('Cierre de la jornada', <input required type="time" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} className={inputClass} />)}
          </div>
          <p className="text-xs leading-5 text-[var(--ax-muted)]">El calendario reserva periodo e intervalo. Las prórrogas pueden retrasarlo. En prórroga se requieren 2 puntos de ventaja; si se agota un bloque sin esa ventaja, continúa otro de la misma duración.</p>
        </div>}

        {isFootball8 && <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select label="Formato de juego" value={competitionFormat} onChange={setCompetitionFormat} options={[{ value: 'knockout', label: 'Eliminación directa' }]} />
            <Select label="Número de canchas" value={courtsCount} onChange={setCourtsCount} options={[{ value: '1', label: '1 cancha' }, { value: '2', label: '2 canchas' }]} />
            <Select label="Máximo de equipos" value={maxTeams} onChange={setMaxTeams} options={[{ value: String(footballEight.maxTeams), label: '16 equipos' }]} />
            {field('Plantilla máxima', numberInput(maxRosterSize, setMaxRosterSize, '1'))}
            {field('Minutos por tiempo', numberInput(halfDuration, setHalfDuration, '1', '120'))}
            {field('Descanso entre tiempos', numberInput(halftimeDuration, setHalftimeDuration, '0', '60'))}
            {field('Intervalo entre partidos', numberInput(intervalDuration, setIntervalDuration, '0', '120'))}
          </div>
          <Notice tone="success" icon={Info}>
            Octavos → cuartos → semifinales → final. Si hay empate: 10 minutos extra y, si persiste, penales directos.
            {selectedRule && <> {footballEight.playersOnField} jugadores en cancha · cambios ilimitados.</>}
          </Notice>
        </div>}

        {isRugby && <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Formato de juego" value={isLeagueFormat(competitionFormat) ? competitionFormat : 'round_robin'} onChange={setCompetitionFormat} options={Object.entries(leagueFormats).map(([value, label]) => ({ value, label }))} />
            <Select label="Vueltas" value={legs} onChange={setLegs} options={[{ value: '1', label: '1 vuelta' }, { value: '2', label: 'Ida y vuelta' }, { value: '3', label: '3 vueltas' }, { value: '4', label: '4 vueltas' }]} />
            {competitionFormat === 'league_playoffs' && <Select label="Fase final" value={playoffTeams} onChange={setPlayoffTeams} options={[{ value: '4', label: 'Semifinales y final (4)' }, { value: '2', label: 'Final directa (2)' }]} />}
            <Select label="Número de canchas" value={courtsCount} onChange={setCourtsCount} options={[{ value: '1', label: '1 cancha' }, { value: '2', label: '2 canchas' }, { value: '3', label: '3 canchas' }]} />
          </div>
          <Notice tone="success" icon={Info}>
            {competitionFormat === 'league_playoffs'
              ? `Todos contra todos${legs === '2' ? ' ida y vuelta' : legs === '1' ? '' : ` a ${legs} vueltas`} y luego ${playoffTeams === '4' ? 'semifinales (1.º–4.º y 2.º–3.º) y final' : 'una final entre el 1.º y el 2.º'}.`
              : `Cada equipo se enfrenta a todos los demás${legs === '2' ? ' dos veces (ida y vuelta)' : legs === '1' ? ' una vez' : ` ${legs} veces`}. Gana la liga el primero de la tabla.`}
            {' '}Los partidos por fecha, los horarios y los recesos se definen al generar el fixture.
          </Notice>
        </div>}

        <div className="grid gap-4 sm:grid-cols-3">
          {field('Fecha inicial', <input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass} />)}
          {field('Fecha final', <input required type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={inputClass} />)}
          {isBasketball3
            ? field('Sede', <input required value={location} onChange={(event) => setLocation(event.target.value)} className={inputClass} />)
            : <Select label="Ciudad" value={location} onChange={setLocation} options={PANAMA_CITIES.map((city) => ({ value: city, label: city }))} placeholder="Seleccionar ciudad" />}
        </div>

        {message && <Notice tone={createdTournament ? 'success' : 'warning'} icon={createdTournament ? CheckCircle2 : AlertTriangle}>{message}</Notice>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--ax-muted)]">Se guarda como borrador para completar equipos y fixtures.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {onClose && <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>}
            <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Guardando…' : 'Guardar borrador y continuar'}</Button>
          </div>
        </div>
      </form>}
    </Card>
  )
}

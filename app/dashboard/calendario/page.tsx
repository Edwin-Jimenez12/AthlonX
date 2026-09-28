'use client'

import Link from 'next/link'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Gamepad2,
  MapPin,
  NotebookPen,
  Plus,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { loadAccountContexts } from '../../../lib/account-contexts'
import { loadManagedTeams, ManagedTeam } from '../../../lib/team-access'
import { supabase } from '../../../lib/supabase'

type EventType = 'training' | 'match' | 'game' | 'meeting' | 'other'
type EventSourceType = 'team' | 'organization'

type CalendarEvent = {
  id: string
  team_id: string | null
  organization_id: string | null
  created_by: string
  event_type: EventType
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string
  all_day: boolean
  created_at: string
  updated_at: string
  source_type: EventSourceType
  source_name: string
  source_id: string
  discipline_id: string | null
  discipline_name: string | null
  editable: boolean
}

type EventUpdateInput = {
  event_type: EventType
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string
  all_day: boolean
}

type EventOption = {
  value: EventType
  label: string
  icon: LucideIcon
  color: string
}

type Discipline = {
  id: string
  name: string
  code: string
}

type OrganizationSource = {
  id: string
  name: string
  canManage: boolean
}

type CalendarScope = {
  type: 'global' | 'team' | 'organization'
  id: string | null
  name: string
}

const eventOptions: EventOption[] = [
  { value: 'training', label: 'Entrenamiento', icon: Dumbbell, color: 'text-cyan-300' },
  { value: 'match', label: 'Partido', icon: Trophy, color: 'text-amber-300' },
  { value: 'game', label: 'Juego adicional', icon: Gamepad2, color: 'text-violet-300' },
  { value: 'meeting', label: 'Reunión', icon: Users, color: 'text-emerald-300' },
  { value: 'other', label: 'Otra actividad', icon: NotebookPen, color: 'text-slate-300' },
]

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const calendarEventFields = 'id, created_by, event_type, title, description, location, starts_at, ends_at, all_day, created_at, updated_at'
const teamCalendarEventSelect = `team_id, ${calendarEventFields}`
const organizationCalendarEventSelect = `organization_id, ${calendarEventFields}`

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
}

function toDateTimeInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000)
  return localDate.toISOString().slice(0, 16)
}

function dateStart(value: string) {
  return new Date(`${value}T00:00:00`).toISOString()
}

function dateEnd(value: string) {
  return new Date(`${value}T23:59:59`).toISOString()
}

function formatEventTime(event: CalendarEvent) {
  if (event.all_day) return 'Todo el día'
  return new Intl.DateTimeFormat('es-PA', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(event.starts_at))
}

function formatEventDate(event: CalendarEvent) {
  return new Intl.DateTimeFormat('es-PA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(event.starts_at))
}

function formatTimeRange(event: CalendarEvent) {
  if (event.all_day) return 'Todo el día'
  const formatter = new Intl.DateTimeFormat('es-PA', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${formatter.format(new Date(event.starts_at))} - ${formatter.format(new Date(event.ends_at))}`
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

function eventOverlapsDay(event: CalendarEvent, day: Date) {
  return new Date(event.ends_at) > startOfDay(day) && new Date(event.starts_at) < endOfDay(day)
}

function eventOption(value: EventType) {
  return eventOptions.find((option) => option.value === value) || eventOptions[eventOptions.length - 1]
}

function eventIndicator(event: Pick<CalendarEvent, 'event_type' | 'source_type'>) {
  if (event.event_type === 'match') {
    return { label: 'Partido o torneo', dotClass: 'bg-amber-300' }
  }

  if (event.event_type === 'meeting') {
    return { label: 'Reunión importante', dotClass: 'bg-red-400' }
  }

  if (event.event_type === 'game') {
    return { label: 'Otra actividad', dotClass: 'bg-violet-300' }
  }

  if (event.event_type === 'other') {
    return { label: 'Otra actividad', dotClass: 'bg-cyan-300' }
  }

  return event.source_type === 'organization'
    ? { label: 'Organización', dotClass: 'bg-blue-400' }
    : { label: 'Equipo', dotClass: 'bg-[#b4ff45]' }
}

export default function TeamCalendarPage() {
  const [teams, setTeams] = useState<ManagedTeam[]>([])
  const [organizations, setOrganizations] = useState<OrganizationSource[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState('all')
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [disciplineFilter, setDisciplineFilter] = useState('all')
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | 'all'>('all')
  const [calendarScope, setCalendarScope] = useState<CalendarScope>({ type: 'global', id: null, name: 'Todas mis entidades' })
  const [monthCursor, setMonthCursor] = useState(() => startOfDay(new Date()))
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showComposer, setShowComposer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadCalendar() {
    if (!supabase) {
      setError('Supabase no está configurado.')
      setLoading(false)
      return
    }

    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError('Debes iniciar sesión para ver tu calendario.')
      setLoading(false)
      return
    }

    const [managedTeams, accountContexts] = await Promise.all([
      loadManagedTeams(userData.user.id),
      loadAccountContexts(userData.user.id),
    ])
    const teamIds = managedTeams.map((team) => team.id)
    const organizationContexts = accountContexts.filter((context) => context.contextType === 'organization' && context.organizationId)
    const organizationIds = Array.from(new Set(organizationContexts.map((context) => context.organizationId as string)))
    const [teamEventsResult, organizationEventsResult, disciplinesResult, tournamentsResult, tournamentTeamsResult] = await Promise.all([
      teamIds.length
        ? supabase.from('team_calendar_events').select(teamCalendarEventSelect).in('team_id', teamIds).order('starts_at', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      organizationIds.length
        ? supabase.from('organization_calendar_events').select(organizationCalendarEventSelect).in('organization_id', organizationIds).order('starts_at', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      supabase.from('disciplines').select('id, name, code').eq('is_active', true),
      supabase.from('tournaments').select('id, name, status, start_date, end_date, discipline_id, organization_id, organizer_team_id, created_by').neq('status', 'draft'),
      teamIds.length
        ? supabase.from('tournament_teams').select('tournament_id, team_id').in('team_id', teamIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (teamEventsResult.error) {
      setError(teamEventsResult.error.message)
      setLoading(false)
      return
    }

    const teamById = new Map(managedTeams.map((team) => [team.id, team]))
    const organizationById = new Map<string, OrganizationSource>()
    organizationContexts.forEach((context) => {
      if (!context.organizationId) return
      const existing = organizationById.get(context.organizationId)
      organizationById.set(context.organizationId, {
        id: context.organizationId,
        name: context.name,
        canManage: Boolean(existing?.canManage || context.role === 'directivo'),
      })
    })
    const disciplineRows = (disciplinesResult.data ?? []) as Discipline[]
    const disciplineById = new Map(disciplineRows.map((discipline) => [discipline.id, discipline]))
    const tournamentTeamIds = new Set((tournamentTeamsResult.data ?? []).map((item) => item.tournament_id))
    const mappedTeamEvents = (teamEventsResult.data ?? []).map((event) => {
      const team = teamById.get(event.team_id)
      return {
        ...event,
        organization_id: null,
        source_type: 'team' as const,
        source_name: team?.name || 'Equipo',
        source_id: event.team_id,
        discipline_id: team?.disciplineId || null,
        discipline_name: team?.discipline || null,
        editable: Boolean(team && ['owner', 'directivo', 'entrenador', 'staff'].includes(team.role)),
      }
    })
    const mappedOrganizationEvents = (organizationEventsResult.data ?? []).map((event) => {
      const organization = organizationById.get(event.organization_id)
      const discipline = event.discipline_id ? disciplineById.get(event.discipline_id) : null
      return {
        ...event,
        team_id: null,
        source_type: 'organization' as const,
        source_name: organization?.name || 'Organización',
        source_id: event.organization_id,
        discipline_name: discipline?.name || null,
        editable: Boolean(organization?.canManage),
      }
    })
    const mappedTournamentEvents = (tournamentsResult.data ?? [])
      .filter((tournament) => {
        return Boolean(
          (tournament.organization_id && organizationById.has(tournament.organization_id))
          || (tournament.organizer_team_id && teamById.has(tournament.organizer_team_id))
          || tournamentTeamIds.has(tournament.id),
        )
      })
      .filter((tournament) => Boolean(tournament.start_date))
      .map((tournament) => {
        const team = tournament.organizer_team_id ? teamById.get(tournament.organizer_team_id) : null
        const organization = tournament.organization_id ? organizationById.get(tournament.organization_id) : null
        const discipline = tournament.discipline_id ? disciplineById.get(tournament.discipline_id) : null
        const sourceType: EventSourceType = organization ? 'organization' : 'team'
        const sourceId = organization?.id || team?.id || ''
        return {
          id: `tournament:${tournament.id}`,
          team_id: sourceType === 'team' ? team?.id || null : null,
          organization_id: sourceType === 'organization' ? organization?.id || null : null,
          created_by: tournament.created_by,
          event_type: 'match' as const,
          title: tournament.name,
          description: 'Torneo registrado en AthlonX.',
          location: null,
          starts_at: dateStart(tournament.start_date),
          ends_at: dateEnd(tournament.end_date || tournament.start_date),
          all_day: true,
          created_at: dateStart(tournament.start_date),
          updated_at: dateStart(tournament.start_date),
          source_type: sourceType,
          source_name: organization?.name || team?.name || 'Torneo',
          source_id: sourceId,
          discipline_id: tournament.discipline_id || null,
          discipline_name: discipline?.name || null,
          editable: false,
        }
      })

    setTeams(managedTeams)
    setOrganizations(Array.from(organizationById.values()).sort((left, right) => left.name.localeCompare(right.name)))
    setDisciplines(disciplineRows)
    const storedContextId = window.localStorage.getItem('athlonx-active-context-id')
    const activeContext = accountContexts.find((context) => context.id === storedContextId && context.contextType !== 'personal')
      || accountContexts.find((context) => context.contextType !== 'personal')
    const storedTeamId = window.localStorage.getItem('athlonx-active-team-id')
    const storedTeam = managedTeams.find((team) => team.id === storedTeamId)
    const defaultTeam = storedTeam || managedTeams.find((team) => ['owner', 'directivo', 'entrenador', 'staff'].includes(team.role))
    setSelectedTeamId(defaultTeam?.id || '')
    setSelectedOrganizationId(organizationContexts.find((context) => context.organizationId)?.organizationId || '')
    const isTeamAccount = userData.user.user_metadata?.account_type === 'equipo'
    const nextScope: CalendarScope = activeContext?.contextType === 'team' && activeContext.teamId
      ? { type: 'team', id: activeContext.teamId, name: activeContext.name }
      : activeContext?.contextType === 'organization' && activeContext.organizationId
        ? { type: 'organization', id: activeContext.organizationId, name: activeContext.name }
        : isTeamAccount && defaultTeam
          ? { type: 'team', id: defaultTeam.id, name: defaultTeam.name }
          : { type: 'global', id: null, name: 'Todas mis entidades' }
    setCalendarScope(nextScope)
    setSourceFilter(nextScope.type === 'global' ? 'all' : `${nextScope.type}:${nextScope.id}`)
    if (nextScope.type === 'team') setSelectedTeamId(nextScope.id || '')
    if (nextScope.type === 'organization') setSelectedOrganizationId(nextScope.id || '')
    setEvents([
      ...mappedTeamEvents,
      ...mappedOrganizationEvents,
      ...mappedTournamentEvents,
    ].sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime()) as CalendarEvent[])
    setError('')
    setLoading(false)
  }

  useEffect(() => {
    void loadCalendar()
  }, [])

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) || null
  const selectedOrganization = organizations.find((organization) => organization.id === selectedOrganizationId) || null
  const canManageSelectedTeam = Boolean(
    selectedTeam
      && ['owner', 'directivo', 'entrenador', 'staff'].includes(selectedTeam.role),
  )
  const canManageSelectedOrganization = Boolean(selectedOrganization?.canManage)
  const activeSourceTeam = calendarScope.type === 'team' ? selectedTeam : null
  const activeSourceOrganization = calendarScope.type === 'organization' ? selectedOrganization : null
  const canManageSelectedSource = calendarScope.type === 'team'
    ? Boolean(activeSourceTeam && canManageSelectedTeam)
    : calendarScope.type === 'organization' && canManageSelectedOrganization

  const visibleEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSource = sourceFilter === 'all' || `${event.source_type}:${event.source_id}` === sourceFilter
      const matchesDiscipline = disciplineFilter === 'all' || event.discipline_id === disciplineFilter
      const matchesType = eventTypeFilter === 'all' || event.event_type === eventTypeFilter
      return matchesSource && matchesDiscipline && matchesType
    })
  }, [disciplineFilter, eventTypeFilter, events, sourceFilter])

  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return visibleEvents
      .filter((event) => new Date(event.ends_at) >= now)
      .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime())
      .slice(0, 8)
  }, [visibleEvents])

  const calendarDays = useMemo(() => {
    const firstDay = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
    const mondayOffset = (firstDay.getDay() + 6) % 7
    return Array.from({ length: 42 }, (_, index) => {
      return new Date(
        monthCursor.getFullYear(),
        monthCursor.getMonth(),
        index - mondayOffset + 1,
      )
    })
  }, [monthCursor])

  function changeMonth(offset: number) {
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  function goToToday() {
    setMonthCursor(startOfDay(new Date()))
  }

  function handleSourceChange(source: string) {
    setSourceFilter(source)
    setSelectedEvent(null)
    setShowComposer(false)
  }

  async function createEvent(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (!supabase || !canManageSelectedSource) return

    const form = formEvent.currentTarget
    const formData = new FormData(form)
    const title = String(formData.get('title') || '').trim()
    const eventType = String(formData.get('event_type') || 'other') as EventType
    const disciplineId = String(formData.get('discipline_id') || '')
    const startsAt = String(formData.get('starts_at') || '')
    const endsAt = String(formData.get('ends_at') || '')
    const description = String(formData.get('description') || '').trim()
    const location = String(formData.get('location') || '').trim()
    const allDay = formData.get('all_day') === 'on'

    if (!title || !startsAt || !endsAt) {
      setError('Completa el título, la fecha inicial y la fecha final.')
      return
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      setError('La fecha final debe ser posterior a la fecha inicial.')
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError('Debes iniciar sesión para crear una actividad.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    const isOrganizationEvent = calendarScope.type === 'organization'
    const source = isOrganizationEvent ? activeSourceOrganization : activeSourceTeam
    if (!source) {
      setSaving(false)
      setError('Selecciona un equipo u organización administrable para crear la actividad.')
      return
    }
    const sourceName = isOrganizationEvent ? activeSourceOrganization?.name : activeSourceTeam?.name
    const sourceDisciplineId = activeSourceTeam?.disciplineId || null
    const sourceDisciplineName = activeSourceTeam?.discipline || null
    const selectedDiscipline = disciplines.find((discipline) => discipline.id === disciplineId)

    const insertPayload = isOrganizationEvent
      ? {
          organization_id: source.id,
          created_by: userData.user.id,
          discipline_id: disciplineId || null,
          event_type: eventType,
          title,
          description: description || null,
          location: location || null,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          all_day: allDay,
        }
      : {
          team_id: source.id,
          created_by: userData.user.id,
          event_type: eventType,
          title,
          description: description || null,
          location: location || null,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          all_day: allDay,
        }
    const { data: createdEvent, error: createError } = await supabase
      .from(isOrganizationEvent ? 'organization_calendar_events' : 'team_calendar_events')
      .insert(insertPayload as never)
      .select(isOrganizationEvent ? organizationCalendarEventSelect : teamCalendarEventSelect)
      .single()

    if (createError || !createdEvent) {
      setSaving(false)
      setError(createError?.message || 'No se pudo crear la actividad.')
      return
    }

    const eventWithSource = {
      ...createdEvent,
      source_type: isOrganizationEvent ? 'organization' as const : 'team' as const,
      source_name: sourceName || 'Entidad',
      source_id: source.id,
      discipline_id: isOrganizationEvent ? disciplineId || null : sourceDisciplineId,
      discipline_name: isOrganizationEvent ? selectedDiscipline?.name || null : sourceDisciplineName,
      editable: true,
    } as CalendarEvent
    setEvents((current) => [...current, eventWithSource].sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime()))
    setSelectedEvent(eventWithSource)
    setShowComposer(false)
    setSuccess(`Actividad guardada. Los miembros activos de ${source.name} recibirán una notificación.`)
    setSaving(false)
    form.reset()
  }

  function canManageEvent(event: CalendarEvent) {
    return event.editable
  }

  async function updateEvent(eventId: string, input: EventUpdateInput) {
    if (!supabase) return false

    const currentEvent = events.find((event) => event.id === eventId)
    if (!currentEvent || !canManageEvent(currentEvent)) return false

    setSaving(true)
    setError('')
    setSuccess('')

    const tableName = currentEvent.source_type === 'organization'
      ? 'organization_calendar_events'
      : 'team_calendar_events'
    const { data: updatedEvent, error: updateError } = await supabase
      .from(tableName)
      .update(input)
      .eq('id', eventId)
      .select(currentEvent.source_type === 'organization' ? organizationCalendarEventSelect : teamCalendarEventSelect)
      .single()

    if (updateError || !updatedEvent) {
      setError(updateError?.message || 'No se pudo actualizar la actividad.')
      setSaving(false)
      return false
    }

    const eventWithSource = {
      ...updatedEvent,
      source_type: currentEvent.source_type,
      source_name: currentEvent.source_name,
      source_id: currentEvent.source_id,
      discipline_id: currentEvent.discipline_id,
      discipline_name: currentEvent.discipline_name,
      editable: currentEvent.editable,
    } as CalendarEvent
    setEvents((current) => current
      .map((event) => event.id === eventId ? eventWithSource : event)
      .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime()))
    setSelectedEvent(eventWithSource)
    setSuccess('Actividad actualizada correctamente.')
    setSaving(false)
    return true
  }

  async function deleteEvent(eventId: string) {
    if (!supabase) return false

    const currentEvent = events.find((event) => event.id === eventId)
    if (!currentEvent || !canManageEvent(currentEvent)) return false

    const confirmed = window.confirm(`¿Eliminar la actividad "${currentEvent.title}"?`)
    if (!confirmed) return false

    setSaving(true)
    setError('')
    const tableName = currentEvent.source_type === 'organization'
      ? 'organization_calendar_events'
      : 'team_calendar_events'
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('id', eventId)

    if (deleteError) {
      setError(deleteError.message)
      setSaving(false)
      return false
    }

    setEvents((current) => current.filter((event) => event.id !== eventId))
    setSelectedEvent(null)
    setSuccess('Actividad eliminada correctamente.')
    setSaving(false)
    return true
  }

  const monthLabel = new Intl.DateTimeFormat('es-PA', {
    month: 'long',
    year: 'numeric',
  }).format(monthCursor)

  return (
    <main className="min-h-screen bg-[#07131e] text-white lg:ml-64">
      <section className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
        <header className="flex flex-col justify-between gap-6 border-b border-[#1f4057] pb-8 xl:flex-row xl:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.24em] text-[#b4ff45]">
              Actividad deportiva
            </p>
            <h1 className="mt-3 font-display text-5xl uppercase leading-none sm:text-6xl">
              Calendario
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
              {calendarScope.type === 'global'
                ? 'Consulta todos tus entrenamientos, partidos, torneos y compromisos desde una sola agenda.'
                : `Consulta y organiza las actividades de ${calendarScope.name}. Cada actividad se comparte automáticamente con sus miembros.`}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {(teams.length > 0 || organizations.length > 0) && (
              <label className="flex items-center gap-3 rounded-xl border border-[#31556b] bg-[#0b1d2c] px-4 py-3 text-sm font-semibold text-slate-200">
                <Users size={18} className="text-[#b4ff45]" />
                <span className="sr-only">Origen del calendario</span>
                <select
                  value={sourceFilter}
                  onChange={(event) => handleSourceChange(event.target.value)}
                  className="cursor-pointer bg-transparent outline-none"
                >
                  <option value="all" className="bg-[#0b1d2c]">Todas mis entidades</option>
                  {teams.map((team) => (
                    <option key={`team:${team.id}`} value={`team:${team.id}`} className="bg-[#0b1d2c]">
                      {team.name}
                    </option>
                  ))}
                  {organizations.map((organization) => (
                    <option key={`organization:${organization.id}`} value={`organization:${organization.id}`} className="bg-[#0b1d2c]">
                      {organization.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {canManageSelectedSource && (
              <button
                type="button"
                onClick={() => {
                  setShowComposer((current) => !current)
                  setError('')
                  setSuccess('')
                }}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] transition hover:bg-[#d0ff8c]"
              >
                {showComposer ? <X size={18} /> : <Plus size={18} />}
                {showComposer ? 'Cerrar formulario' : 'Crear evento'}
              </button>
            )}
          </div>
        </header>

        <div className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-[#29485d] bg-[#0b1d2c] p-4">
          <label className="flex min-w-[190px] flex-1 flex-col gap-2 text-xs font-bold uppercase tracking-[.12em] text-slate-500">
            Disciplina
            <select value={disciplineFilter} onChange={(event) => setDisciplineFilter(event.target.value)} className="h-11 cursor-pointer rounded-lg border border-[#31556b] bg-[#07131e] px-3 text-sm font-semibold normal-case tracking-normal text-white outline-none focus:border-[#b4ff45]">
              <option value="all" className="bg-[#0b1d2c]">Todas las disciplinas</option>
              {disciplines.map((discipline) => <option key={discipline.id} value={discipline.id} className="bg-[#0b1d2c]">{discipline.name}</option>)}
            </select>
          </label>
          <label className="flex min-w-[190px] flex-1 flex-col gap-2 text-xs font-bold uppercase tracking-[.12em] text-slate-500">
            Tipo de actividad
            <select value={eventTypeFilter} onChange={(event) => setEventTypeFilter(event.target.value as EventType | 'all')} className="h-11 cursor-pointer rounded-lg border border-[#31556b] bg-[#07131e] px-3 text-sm font-semibold normal-case tracking-normal text-white outline-none focus:border-[#b4ff45]">
              <option value="all" className="bg-[#0b1d2c]">Todas las actividades</option>
              {eventOptions.map((option) => <option key={option.value} value={option.value} className="bg-[#0b1d2c]">{option.label}</option>)}
            </select>
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-6 rounded-xl border border-[#ff7d88]/40 bg-[#ff7d88]/10 p-4 text-sm text-[#ffb0b7]">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="mt-6 rounded-xl border border-[#b4ff45]/30 bg-[#b4ff45]/10 p-4 text-sm text-[#dfffba]">
            {success}
          </p>
        )}

        {showComposer && canManageSelectedSource && (
          <EventComposer sourceName={calendarScope.name} disciplines={disciplines} saving={saving} onSubmit={createEvent} onCancel={() => setShowComposer(false)} />
        )}

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-[#1f4057] pb-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">
                  Agenda mensual
                </p>
                <h2 className="mt-2 font-display text-3xl uppercase sm:text-4xl">
                  {monthLabel}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToToday}
                  className="cursor-pointer rounded-lg border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-[#b4ff45] hover:text-white"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  aria-label="Mes anterior"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#31556b] text-slate-300 transition hover:border-[#b4ff45] hover:text-[#b4ff45]"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  aria-label="Mes siguiente"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#31556b] text-slate-300 transition hover:border-[#b4ff45] hover:text-[#b4ff45]"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <CalendarLegend />

            {loading ? (
              <div className="flex min-h-[520px] items-center justify-center text-sm text-slate-400">
                Cargando calendario...
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-7 border-b border-[#29485d]">
                    {weekDays.map((day) => (
                      <div key={day} className="px-3 pb-3 text-center text-xs font-bold uppercase tracking-[.16em] text-slate-500">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 overflow-hidden rounded-b-2xl border-l border-t border-[#29485d]">
                    {calendarDays.map((day) => {
                      const dayEvents = visibleEvents.filter((event) => eventOverlapsDay(event, day))
                      const isCurrentMonth = day.getMonth() === monthCursor.getMonth()
                      const isToday = isSameDay(day, new Date())
                      return (
                        <div
                          key={day.toISOString()}
                          className={`min-h-[132px] border-b border-r border-[#29485d] p-2 ${isCurrentMonth ? 'bg-[#0b1d2c]' : 'bg-[#07131e]/60'} ${isToday ? 'bg-[#b4ff45]/[.06]' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${isToday ? 'bg-[#b4ff45] text-[#07131e]' : isCurrentMonth ? 'text-slate-200' : 'text-slate-600'}`}>
                              {day.getDate()}
                            </span>
                            {dayEvents.length > 0 && <span className="text-[10px] text-slate-500">{dayEvents.length}</span>}
                          </div>
                          <div className="mt-2 space-y-1">
                            {dayEvents.slice(0, 3).map((event) => {
                              const option = eventOption(event.event_type)
                              const indicator = eventIndicator(event)
                              const Icon = option.icon
                              return (
                                <button
                                  key={event.id}
                                  type="button"
                                  onClick={() => setSelectedEvent(event)}
                                  className="flex w-full cursor-pointer items-center gap-1.5 truncate rounded-md border border-white/10 bg-[#122b3d] px-2 py-1.5 text-left text-[11px] font-semibold text-slate-200 transition hover:border-[#b4ff45]/60 hover:text-white"
                                >
                                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${indicator.dotClass}`} aria-label={indicator.label} />
                                  <Icon size={12} className={`shrink-0 ${option.color}`} />
                                  <span className="truncate">
                                    {!event.all_day && <span className="mr-1 text-slate-500">{formatEventTime(event)}</span>}
                                    {event.title}
                                  </span>
                                </button>
                              )
                            })}
                            {dayEvents.length > 3 && (
                              <button
                                type="button"
                                onClick={() => setSelectedEvent(dayEvents[3])}
                                className="cursor-pointer px-2 text-[11px] font-bold text-[#b4ff45] hover:text-white"
                              >
                                +{dayEvents.length - 3} más
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6">
              <div className="flex items-center justify-between gap-3 border-b border-[#1f4057] pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Agenda</p>
                  <h2 className="mt-2 font-display text-2xl uppercase">Próximas actividades</h2>
                </div>
                <CalendarDays className="text-[#b4ff45]" size={26} />
              </div>
              <div className="mt-5 space-y-3">
                {upcomingEvents.length ? upcomingEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      setSelectedEvent(event)
                      setMonthCursor(new Date(new Date(event.starts_at).getFullYear(), new Date(event.starts_at).getMonth(), 1))
                    }}
                    className="w-full cursor-pointer rounded-2xl border border-[#29485d] bg-[#07131e] p-4 text-left transition hover:border-[#b4ff45]/60"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 rounded-lg bg-[#b4ff45]/10 p-2 text-[#b4ff45]">
                        {(() => {
                          const Icon = eventOption(event.event_type).icon
                          return <Icon size={17} />
                        })()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-white">{event.title}</span>
                        <span className="mt-1 block text-xs capitalize text-slate-400">{formatEventDate(event)}</span>
                        <span className="mt-1 flex items-center gap-1 text-xs text-[#b4ff45]"><Clock3 size={13} />{formatTimeRange(event)}</span>
                        <span className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                          <span className={`h-1.5 w-1.5 rounded-full ${eventIndicator(event).dotClass}`} />
                          {event.source_name}
                        </span>
                      </span>
                    </div>
                  </button>
                )) : (
                  <div className="rounded-2xl border border-dashed border-[#31556b] p-5 text-sm leading-6 text-slate-400">
                    No hay próximas actividades registradas.
                  </div>
                )}
              </div>
            </section>

            {selectedEvent && (
              <EventDetails
                event={selectedEvent}
                canManage={canManageEvent(selectedEvent)}
                saving={saving}
                onClose={() => setSelectedEvent(null)}
                onSave={updateEvent}
                onDelete={deleteEvent}
              />
            )}
          </aside>
        </div>

        {!loading && !teams.length && !organizations.length && (
          <div className="mt-6 rounded-2xl border border-dashed border-[#31556b] bg-[#0b1d2c] p-8 text-center text-sm leading-6 text-slate-400">
            Esta cuenta todavía no está vinculada a un equipo u organización. Cuando aceptes una vinculación, sus actividades aparecerán aquí.
          </div>
        )}
      </section>
    </main>
  )
}

function CalendarLegend() {
  const indicators = [
    { label: 'Equipo', dotClass: 'bg-[#b4ff45]' },
    { label: 'Organización', dotClass: 'bg-blue-400' },
    { label: 'Partido o torneo', dotClass: 'bg-amber-300' },
    { label: 'Reunión', dotClass: 'bg-red-400' },
    { label: 'Otra actividad', dotClass: 'bg-violet-300' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/5 py-4 text-[11px] text-slate-400" aria-label="Indicadores del calendario">
      {indicators.map((indicator) => (
        <span key={indicator.label} className="inline-flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${indicator.dotClass}`} />
          {indicator.label}
        </span>
      ))}
    </div>
  )
}

function EventComposer({ sourceName, disciplines, saving, onSubmit, onCancel }: { sourceName: string; disciplines: Discipline[]; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const defaultStart = toDateTimeInputValue(new Date(Date.now() + 60 * 60 * 1000))
  const defaultEnd = toDateTimeInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000))

  return (
    <section className="mt-8 rounded-3xl border border-[#b4ff45]/40 bg-[#0d2730] p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Nueva actividad</p>
          <h2 className="mt-2 font-display text-3xl uppercase">Crear evento</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            El evento quedará visible para los miembros activos del contexto seleccionado y generará una notificación.
          </p>
          <p className="mt-3 text-sm font-semibold text-[#dfffba]">Se guardará en: {sourceName}</p>
        </div>
        <CalendarDays className="text-[#b4ff45]" size={28} />
      </div>

      <form onSubmit={onSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-semibold sm:col-span-2">
          Título de la actividad
          <input name="title" required maxLength={160} placeholder="Entrenamiento general" className="mt-2 h-12 w-full rounded-xl border border-[#31556b] bg-[#071d2c] px-4 text-white outline-none placeholder:text-slate-500 focus:border-[#b4ff45]" />
        </label>

        <label className="block text-sm font-semibold">
          Tipo de actividad
          <select name="event_type" defaultValue="training" className="mt-2 h-12 w-full cursor-pointer rounded-xl border border-[#31556b] bg-[#071d2c] px-4 text-white outline-none focus:border-[#b4ff45]">
            {eventOptions.map((option) => <option key={option.value} value={option.value} className="bg-[#0b1d2c]">{option.label}</option>)}
          </select>
        </label>

        <label className="block text-sm font-semibold">
          Disciplina
          <select name="discipline_id" defaultValue="" className="mt-2 h-12 w-full cursor-pointer rounded-xl border border-[#31556b] bg-[#071d2c] px-4 text-white outline-none focus:border-[#b4ff45]">
            <option value="" className="bg-[#0b1d2c]">General</option>
            {disciplines.map((discipline) => <option key={discipline.id} value={discipline.id} className="bg-[#0b1d2c]">{discipline.name}</option>)}
          </select>
        </label>

        <label className="block text-sm font-semibold">
          Lugar
          <input name="location" placeholder="Cancha o estadio" className="mt-2 h-12 w-full rounded-xl border border-[#31556b] bg-[#071d2c] px-4 text-white outline-none placeholder:text-slate-500 focus:border-[#b4ff45]" />
        </label>

        <label className="block text-sm font-semibold">
          Inicio
          <input name="starts_at" required type="datetime-local" defaultValue={defaultStart} className="mt-2 h-12 w-full rounded-xl border border-[#31556b] bg-[#071d2c] px-4 text-white outline-none focus:border-[#b4ff45]" />
        </label>

        <label className="block text-sm font-semibold">
          Finalización
          <input name="ends_at" required type="datetime-local" defaultValue={defaultEnd} className="mt-2 h-12 w-full rounded-xl border border-[#31556b] bg-[#071d2c] px-4 text-white outline-none focus:border-[#b4ff45]" />
        </label>

        <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2">
          <input name="all_day" type="checkbox" className="h-4 w-4 accent-[#b4ff45]" />
          Actividad de todo el día
        </label>

        <label className="block text-sm font-semibold sm:col-span-2">
          Descripción
          <textarea name="description" rows={4} placeholder="Agrega indicaciones, materiales o información importante." className="mt-2 w-full resize-y rounded-xl border border-[#31556b] bg-[#071d2c] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-[#b4ff45]" />
        </label>

        <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="cursor-pointer rounded-xl border border-[#31556b] px-5 py-3 font-bold text-slate-300 transition hover:border-white/50 hover:text-white">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] transition hover:bg-[#d0ff8c] disabled:cursor-wait disabled:opacity-60">
            <Plus size={18} />
            {saving ? 'Guardando...' : 'Guardar evento'}
          </button>
        </div>
      </form>
    </section>
  )
}

function EventDetails({
  event,
  canManage,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  event: CalendarEvent
  canManage: boolean
  saving: boolean
  onClose: () => void
  onSave: (eventId: string, input: EventUpdateInput) => Promise<boolean>
  onDelete: (eventId: string) => Promise<boolean>
}) {
  const option = eventOption(event.event_type)
  const Icon = option.icon
  const tournamentId = event.id.startsWith('tournament:') ? event.id.slice('tournament:'.length) : null
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(event.title)
  const [eventType, setEventType] = useState<EventType>(event.event_type)
  const [startsAt, setStartsAt] = useState(toDateTimeInputValue(new Date(event.starts_at)))
  const [endsAt, setEndsAt] = useState(toDateTimeInputValue(new Date(event.ends_at)))
  const [location, setLocation] = useState(event.location || '')
  const [description, setDescription] = useState(event.description || '')
  const [allDay, setAllDay] = useState(event.all_day)

  useEffect(() => {
    setEditing(false)
    setTitle(event.title)
    setEventType(event.event_type)
    setStartsAt(toDateTimeInputValue(new Date(event.starts_at)))
    setEndsAt(toDateTimeInputValue(new Date(event.ends_at)))
    setLocation(event.location || '')
    setDescription(event.description || '')
    setAllDay(event.all_day)
  }, [event])

  async function submitUpdate(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (!title.trim() || !startsAt || !endsAt) return
    if (new Date(endsAt) <= new Date(startsAt)) return

    const saved = await onSave(event.id, {
      event_type: eventType,
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      all_day: allDay,
    })

    if (saved) setEditing(false)
  }

  if (editing) {
    return (
      <section className="rounded-3xl border border-[#b4ff45]/30 bg-[#0d2730] p-6">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Editar actividad</p>
            <h2 className="mt-2 font-heading text-xl font-bold">Actualizar información</h2>
          </div>
          <button type="button" onClick={() => setEditing(false)} aria-label="Cerrar edición" className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submitUpdate} className="mt-5 space-y-4">
          <label className="block text-sm font-semibold">
            Título
            <input value={title} onChange={(formEvent) => setTitle(formEvent.target.value)} required maxLength={160} className="mt-2 h-11 w-full rounded-lg border border-[#31556b] bg-[#071d2c] px-3 text-white outline-none focus:border-[#b4ff45]" />
          </label>
          <label className="block text-sm font-semibold">
            Tipo de actividad
            <select value={eventType} onChange={(formEvent) => setEventType(formEvent.target.value as EventType)} className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-[#31556b] bg-[#071d2c] px-3 text-white outline-none focus:border-[#b4ff45]">
              {eventOptions.map((item) => <option key={item.value} value={item.value} className="bg-[#0b1d2c]">{item.label}</option>)}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Inicio
              <input value={startsAt} onChange={(formEvent) => setStartsAt(formEvent.target.value)} required type="datetime-local" className="mt-2 h-11 w-full rounded-lg border border-[#31556b] bg-[#071d2c] px-3 text-white outline-none focus:border-[#b4ff45]" />
            </label>
            <label className="block text-sm font-semibold">
              Finalización
              <input value={endsAt} onChange={(formEvent) => setEndsAt(formEvent.target.value)} required type="datetime-local" className="mt-2 h-11 w-full rounded-lg border border-[#31556b] bg-[#071d2c] px-3 text-white outline-none focus:border-[#b4ff45]" />
            </label>
          </div>
          <label className="block text-sm font-semibold">
            Lugar
            <input value={location} onChange={(formEvent) => setLocation(formEvent.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#31556b] bg-[#071d2c] px-3 text-white outline-none focus:border-[#b4ff45]" />
          </label>
          <label className="block text-sm font-semibold">
            Descripción
            <textarea value={description} onChange={(formEvent) => setDescription(formEvent.target.value)} rows={4} className="mt-2 w-full resize-y rounded-lg border border-[#31556b] bg-[#071d2c] px-3 py-2 text-white outline-none focus:border-[#b4ff45]" />
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input checked={allDay} onChange={(formEvent) => setAllDay(formEvent.target.checked)} type="checkbox" className="h-4 w-4 accent-[#b4ff45]" />
            Actividad de todo el día
          </label>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setEditing(false)} className="cursor-pointer rounded-lg border border-[#31556b] px-4 py-2.5 text-sm font-bold text-slate-300 hover:border-white/50 hover:text-white">Cancelar</button>
            <button type="submit" disabled={saving} className="cursor-pointer rounded-lg bg-[#b4ff45] px-4 py-2.5 text-sm font-bold text-[#07131e] disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </form>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-[#b4ff45]/30 bg-[#0d2730] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={`relative rounded-xl bg-white/10 p-3 ${option.color}`}>
            <Icon size={22} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Detalle de actividad</p>
            <h2 className="mt-2 font-heading text-xl font-bold">{event.title}</h2>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar detalle" className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
          <X size={18} />
        </button>
      </div>
      <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-sm text-slate-300">
        <p className="flex items-start gap-3"><CalendarDays size={17} className="mt-0.5 shrink-0 text-[#b4ff45]" /><span className="capitalize">{formatEventDate(event)}</span></p>
        <p className="flex items-start gap-3"><Clock3 size={17} className="mt-0.5 shrink-0 text-[#b4ff45]" /><span>{formatTimeRange(event)}</span></p>
        <p className="flex items-start gap-3">
          <Users size={17} className="mt-0.5 shrink-0 text-[#b4ff45]" />
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${eventIndicator(event).dotClass}`} />
            {event.source_name}
          </span>
        </p>
        {event.location && <p className="flex items-start gap-3"><MapPin size={17} className="mt-0.5 shrink-0 text-[#b4ff45]" /><span>{event.location}</span></p>}
      </div>
      {event.description && <p className="mt-5 border-t border-white/10 pt-5 text-sm leading-6 text-slate-400">{event.description}</p>}
      {tournamentId && (
        <div className="mt-5 border-t border-white/10 pt-5">
          <Link href={`/dashboard/torneos/ver/${tournamentId}?tab=convocatorias`} className="inline-flex w-full items-center justify-center rounded-lg bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e] transition hover:bg-[#d0ff8c]">
            Gestionar convocatoria
          </Link>
        </div>
      )}
      {canManage && (
        <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setEditing(true)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#31556b] px-4 py-2.5 text-sm font-bold text-slate-200 hover:border-[#b4ff45] hover:text-white">
            Editar
          </button>
          <button type="button" onClick={() => void onDelete(event.id)} disabled={saving} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#ff7d88]/50 px-4 py-2.5 text-sm font-bold text-[#ff9ca5] hover:border-[#ff7d88] hover:text-white disabled:opacity-50">
            Eliminar
          </button>
        </div>
      )}
    </section>
  )
}

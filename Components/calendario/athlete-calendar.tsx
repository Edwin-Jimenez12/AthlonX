'use client'

import { ChevronDown, ChevronUp, Info, Pencil, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useLiveRefresh } from '../../lib/live-refresh'
import { loadAccountPlan, type AccountPlan } from '../../lib/account-plans'
import {
  addDays, dayKey, findClashes, formatDayLabel, formatTime, groupByDay, itemKind, monthGridDays, rangeFor, reminderLabels, startOfDay, startOfWeek,
  type CalendarView, type FeedItem,
} from '../../lib/athlete-calendar'
import Link from 'next/link'
import { LockedFeature, downloadCsv, printReport, upgradeHref } from '../organizacion/plan-ui'
import { Button, ButtonLink, Card, CardHeader, FieldLabel, Notice, PageHeader, Segment, inputClass } from '../mi-equipo/ui'
import { PersonalType, PersonalTypesSheet } from './personal-types-sheet'

const views: Array<{ id: CalendarView; label: string }> = [
  { id: 'mes', label: 'Mes' },
  { id: 'semana', label: 'Semana' },
  { id: 'dia', label: 'Día' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'linea', label: 'Línea de tiempo' },
]


const responses = [
  { id: 'voy', label: 'Voy' },
  { id: 'tal_vez', label: 'Tal vez' },
  { id: 'no_voy', label: 'No voy' },
] as const

type ManagedTeam = { id: string; name: string; role: string }

// Colores de los filtros de equipo y organización: los mismos de los predefinidos de la cuenta personal.
const teamChipColor: Record<string, string> = { training: '#4ea8ff', match: '#b4ff45', meeting: '#a78bfa', other: '#ff9f43' }

const teamEventTypes = [
  { id: 'training', label: 'Entrenamiento' },
  { id: 'match', label: 'Partido' },
  { id: 'meeting', label: 'Reunión' },
  { id: 'other', label: 'Otro' },
] as const

type Editor = {
  scope: string
  eventType: string
  typeId: string | null
  id: string | null
  title: string
  description: string
  location: string
  date: string
  start: string
  end: string
  repeat: 'none' | 'weekly' | 'monthly'
  repeatUntil: string
  division: string
  // Destinatario de un evento de equipo: toda la plantilla, una división, el cuerpo técnico o una persona vinculada al equipo.
  audience: 'team' | 'division' | 'staff' | 'person'
  personIds: string[]
  reminders: number[]
}

type AudienceOption = { user_id: string; name: string }
type AudienceOptions = {
  divisions: Array<{ id: string; name: string }>
  staff: Array<AudienceOption & { role: string }>
  players: AudienceOption[]
}

const audienceLabels: Record<string, string> = { division: 'División', staff: 'Cuerpo técnico', person: 'Persona específica' }

// Colores de Figma: Partido lima, Entrenamiento azul, Torneo naranja, Convocatoria violeta, Personal gris, Organización blanco.
// Color de cada evento: en actividades personales, el del tipo que eligió la persona; si no, el de su categoría.
function colorOf(item: FeedItem) {
  if (item.source === 'personal' && item.type_color) return item.type_color
  return kindColor[itemKind(item)]
}

const kindColor: Record<string, string> = {
  partido: '#b4ff45',
  entrenamiento: '#7fc8ff',
  torneo: '#ffb45c',
  convocatoria: '#c9a7ff',
  personal: '#91a8ba',
  organizacion: '#e8eef3',
  otro: '#91a8ba',
}


function monthLabel(date: Date) {
  const name = date.toLocaleDateString('es-PA', { month: 'long' })
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${date.getFullYear()}`
}

// Lista de asistencia por jugador, para el cuerpo técnico (entrenador, directivo y dueño).
function TeamAttendance({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<Array<{ user_id: string; name: string; response: string }> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.rpc('calendar_team_attendance', { p_event_id: eventId }).then(({ data, error: rpcError }) => {
      if (rpcError) return setError(rpcError.message)
      setRows((data ?? []) as Array<{ user_id: string; name: string; response: string }>)
    })
  }, [eventId])

  const labels: Record<string, string> = { voy: 'Voy', tal_vez: 'Tal vez', no_voy: 'No voy' }
  return (
    <div className="mt-5">
      <FieldLabel>Respuestas de los jugadores</FieldLabel>
      {error && <p className="text-sm text-[var(--ax-muted)]">{error}</p>}
      {rows && rows.length === 0 && <p className="text-sm text-[var(--ax-muted)]">Todavía no hay respuestas.</p>}
      {rows && rows.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {rows.map((row) => (
            <li key={row.user_id} className="flex items-center justify-between">
              <span className="text-[var(--ax-text)]">{row.name}</span>
              <span className="text-[var(--ax-muted)]">{labels[row.response] ?? row.response}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function toEditor(item: FeedItem | null, anchor: Date): Editor {
  const start = item ? new Date(item.starts_at) : new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 18, 0)
  const end = item ? new Date(item.ends_at) : new Date(start.getTime() + 60 * 60 * 1000)
  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return {
    scope: item?.source === 'team' || item?.source === 'organization' ? (item.owner_id ?? 'personal') : 'personal',
    eventType: item?.source === 'team' || item?.source === 'organization' ? item.event_type : 'training',
    typeId: item?.source === 'personal' ? item.type_id ?? null : null,
    id: item ? item.id : null,
    title: item?.title ?? '',
    description: item?.description ?? '',
    location: item?.location ?? '',
    date: dayKey(start),
    start: hhmm(start),
    end: hhmm(end),
    repeat: item?.repeat_rule ?? 'none',
    repeatUntil: item?.repeat_until ? dayKey(new Date(item.repeat_until)) : '',
    reminders: item?.reminder_minutes?.length ? item.reminder_minutes : [240],
    division: item?.division_id ?? '',
    audience: (item?.audience ?? 'team') as Editor['audience'],
    personIds: item?.audience_user_ids ?? [],
  }
}

type OrgUsage = { limits: Record<string, number | null>; usage: Record<string, number> }

// Sin organización: calendario del atleta. Con organización: calendario de la cuenta de organización, según su plan.
export default function AthleteCalendar({ organization = null, team = null }: { organization?: { id: string; name: string } | null; team?: { id: string; name: string } | null } = {}) {
  const isOrg = organization !== null
  const isTeam = team !== null
  // Organización y cuenta de equipo comparten el modo de gestión (eventos de la cuenta, plan y límites).
  const isMgmt = isOrg || isTeam
  const mgmtId = organization?.id ?? team?.id ?? ''
  const [userId, setUserId] = useState<string | null>(null)
  const [plan, setPlan] = useState<AccountPlan | null>(null)
  const [orgUsage, setOrgUsage] = useState<OrgUsage | null>(null)
  const [orgTeams, setOrgTeams] = useState<Array<{ id: string; name: string }>>([])
  const [divisions, setDivisions] = useState<Array<{ id: string; name: string }>>([])
  const [syncOn, setSyncOn] = useState(false)
  const [usage, setUsage] = useState(0)
  const [view, setView] = useState<CalendarView>('mes')
  // Filtro: 'todos', el id de un tipo de evento de la persona, o 'equipos' (solo organización).
  const [filter, setFilter] = useState<string>('todos')
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [items, setItems] = useState<FeedItem[]>([])
  const [audienceOptions, setAudienceOptions] = useState<AudienceOptions | null>(null)
  const [personQuery, setPersonQuery] = useState('')
  // Persona elegida en el buscador, pendiente de agregar a la lista.
  const [pendingPersonId, setPendingPersonId] = useState('')
  // Cambios en vivo: si otra sesión crea, edita o elimina una actividad, o responde a una convocatoria, el calendario se actualiza solo.
  useLiveRefresh('calendar-live', [
    { table: 'personal_activities' },
    { table: 'team_calendar_events' },
    { table: 'organization_calendar_events' },
    { table: 'calendar_attendance' },
  ], () => {
    void loadFeed()
    void loadAccount()
  })
  const [selected, setSelected] = useState<FeedItem | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  // Borrador aparcado: si abres otro evento o uno nuevo, lo que estabas escribiendo no se pierde.
  const [parkedDraft, setParkedDraft] = useState<Editor | null>(null)
  const [editorMinimized, setEditorMinimized] = useState(false)
  const [types, setTypes] = useState<PersonalType[]>([])
  const [typesOpen, setTypesOpen] = useState(false)
  const defaultPersonalId = types.find((type) => type.default_key === 'personal')?.id ?? null
  // Al abrir el formulario (nuevo o editar) siempre aparece completo.
  const editorOpen = editor !== null
  useEffect(() => { if (editorOpen) setEditorMinimized(false) }, [editorOpen, editor?.id])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)
  const [upcoming, setUpcoming] = useState<FeedItem[]>([])
  const [managedTeams, setManagedTeams] = useState<ManagedTeam[]>([])

  const unlimited = plan?.personal_activity_monthly_limit === null && plan !== null
  const limit = plan?.personal_activity_monthly_limit ?? null
  const orgEventLimit = orgUsage ? (orgUsage.limits?.eventos_mes ?? null) : null
  const orgEventsUsed = orgUsage?.usage?.eventos_mes ?? 0
  const orgFlag = (key: string) => plan?.feature_flags?.[key] === true
  const orgReminderLimit = plan?.limits?.recordatorios_evento ?? null
  // Cuenta personal: Libre permite algunas actividades repetidas (2); Pro y Élite, sin límite.
  const personalRepeatLimit = plan?.limits?.eventos_repetidos ?? null
  const personalRepeatAllowed = unlimited || (personalRepeatLimit ?? 0) > 0
  // Repetir: Free y Pro por cantidad de eventos repetidos (Free: 2); Pro sin límite. La organización necesita además su función.
  const canRepeat = (ed: Editor) => {
    if (!isTeam && !orgFlag('repetir_eventos')) return false
    const lim = orgUsage?.limits?.eventos_repetidos ?? null
    if (lim === null) return true
    const editingRepeat = Boolean(ed.id) && items.some((i) => i.id === ed.id && i.repeat_rule !== 'none')
    return editingRepeat || (orgUsage?.usage?.eventos_repetidos ?? 0) < lim
  }

  // Opciones de destinatario (divisiones, cuerpo técnico y jugadores con cuenta) del equipo que se gestiona.
  useEffect(() => {
    if (!supabase || !team) return setAudienceOptions(null)
    void supabase.rpc('calendar_team_audience_options', { p_team: team.id }).then(({ data }) => {
      setAudienceOptions((data ?? null) as AudienceOptions | null)
    })
  }, [team?.id])

  // Tipos de evento de la persona. Si no tiene, se crean los 5 predefinidos.
  async function loadTypes() {
    if (!supabase) return
    const { data } = await supabase.rpc('personal_types_ensure')
    setTypes((data ?? []) as PersonalType[])
  }

  async function loadAccount() {
    if (!supabase) return
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    setUserId(data.user.id)
    void loadTypes()
    if (team) {
      setPlan(await loadAccountPlan('equipo', team.id))
      const { data: usageData } = await supabase.rpc('platform_team_usage', { p_team: team.id })
      setOrgUsage((usageData ?? null) as OrgUsage | null)
      const { data: divs } = await supabase.from('team_division_catalog').select('id, name').eq('team_id', team.id).order('created_at')
      setDivisions((divs ?? []) as Array<{ id: string; name: string }>)
      return
    }
    if (organization) {
      setPlan(await loadAccountPlan('organizacion', organization.id))
      const { data: usageData } = await supabase.rpc('platform_org_usage', { p_org: organization.id })
      setOrgUsage((usageData ?? null) as OrgUsage | null)
      const { data: teamRows } = await supabase.rpc('platform_org_teams', { p_org: organization.id })
      setOrgTeams(((teamRows ?? []) as Array<{ team_id: string; team_name: string; team_group: string }>)
        .filter((team) => team.team_group !== 'vinculado')
        .map((team) => ({ id: team.team_id, name: team.team_name })))
      return
    }
    setPlan(await loadAccountPlan('persona', data.user.id))
    const { data: memberships } = await supabase
      .from('team_user_memberships')
      .select('team_id, role, teams(name)')
      .eq('user_id', data.user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'directivo', 'entrenador', 'staff'])
    setManagedTeams(((memberships ?? []) as unknown as Array<{ team_id: string; role: string; teams: { name: string } | Array<{ name: string }> | null }>).map((m) => ({
      id: m.team_id,
      role: m.role,
      name: (Array.isArray(m.teams) ? m.teams[0]?.name : m.teams?.name) ?? 'Equipo',
    })))
    const { data: count } = await supabase.rpc('calendar_personal_usage')
    setUsage(typeof count === 'number' ? count : 0)
  }

  function feed(from: Date, to: Date) {
    if (team) return supabase!.rpc('calendar_team_feed', { p_team: team.id, p_from: from.toISOString(), p_to: to.toISOString() })
    if (organization) return supabase!.rpc('calendar_org_feed', { p_org: organization.id, p_from: from.toISOString(), p_to: to.toISOString() })
    return supabase!.rpc('calendar_my_feed', { p_from: from.toISOString(), p_to: to.toISOString() })
  }

  async function loadFeed() {
    if (!supabase) return
    const { from, to } = rangeFor(view, anchor)
    const { data, error } = await feed(from, to)
    if (error) return setMessage({ tone: 'danger', text: error.message })
    setItems((data ?? []) as FeedItem[])
  }

  useEffect(() => {
    void loadAccount()
  }, [])

  // Próximos 60 días para el panel derecho (próximo partido y próximas actividades).
  async function loadUpcoming() {
    if (!supabase) return
    const from = startOfDay(new Date())
    const { data } = await feed(from, addDays(from, 60))
    setUpcoming(((data ?? []) as FeedItem[]).sort((a, b) => a.starts_at.localeCompare(b.starts_at)))
  }

  useEffect(() => {
    void loadUpcoming()
    // Se carga al entrar; las acciones que cambian eventos recargan el calendario visible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void loadFeed()
    // Recarga al cambiar de vista o de periodo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor])

  // Tipo de cada evento: el propio (actividades personales) o el predefinido de su categoría.
  const defaultTypeId = (category: string) => types.find((type) => type.default_key === category)?.id ?? null
  const typeIdOf = (item: FeedItem) => (item.source === 'personal' && item.type_id ? item.type_id : defaultTypeId(item.event_type))
  // Equipo y organización filtran por sus cuatro categorías; la cuenta personal, por sus tipos.
  const keyOf = (item: FeedItem) => (isMgmt && item.source !== 'personal' ? item.event_type : typeIdOf(item))
  const validFilters = isMgmt ? teamEventTypes.map((type) => type.id as string) : types.map((type) => type.id)
  // Si el filtro seleccionado ya no existe (se borró un tipo o se cambió de cuenta), vuelve a Todos.
  useEffect(() => {
    if (filter !== 'todos' && filter !== 'equipos' && !validFilters.includes(filter)) setFilter('todos')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types, filter, isMgmt])
  const visible = useMemo(
    () => items.filter((item) => filter === 'todos' || (filter === 'equipos' ? item.source === 'team' : keyOf(item) === filter)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, filter, types, isMgmt],
  )
  const byDay = useMemo(() => groupByDay(visible), [visible])

  function moveAnchor(step: number) {
    if (view === 'mes') setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + step, 1))
    else if (view === 'semana') setAnchor(addDays(anchor, 7 * step))
    else setAnchor(addDays(anchor, step))
  }

  function navLabel() {
    if (view === 'mes') return anchor.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' })
    if (view === 'semana') return 'Semana del ' + anchor.toLocaleDateString('es-PA', { day: 'numeric', month: 'short' })
    if (view === 'dia') return formatDayLabel(anchor)
    return 'Próximos 60 días'
  }

  async function respond(item: FeedItem, response: 'voy' | 'tal_vez' | 'no_voy') {
    if (!supabase || (item.source !== 'team' && item.source !== 'organization')) return
    const { error } = await supabase.rpc('calendar_set_attendance', { p_source: item.source, p_event_id: item.id, p_response: response })
    if (error) return setMessage({ tone: 'danger', text: error.message })
    setMessage({ tone: 'success', text: 'Tu respuesta quedó guardada.' })
    await loadFeed()
    setSelected((current) => (current ? { ...current, my_response: response } : current))
  }

  async function removeActivity(item: FeedItem) {
    if (!supabase) return
    const { error } = item.source === 'organization'
      ? await supabase.from('organization_calendar_events').delete().eq('id', item.id)
      : organization && item.source === 'team'
      ? await supabase.rpc('calendar_org_delete_team_event', { p_org: organization.id, p_id: item.id })
      : item.source === 'team'
      ? await supabase.rpc('calendar_delete_team_event', { p_id: item.id })
      : await supabase.rpc('calendar_delete_personal_activity', { p_id: item.id })
    if (error) return setMessage({ tone: 'danger', text: error.message })
    setSelected(null)
    // Solo se cierra el formulario si era justo ese evento; un borrador de otra actividad se conserva.
    if (editor?.id === item.id) setEditor(null)
    setMessage({ tone: 'success', text: 'Actividad eliminada.' })
    await loadAccount()
    await loadFeed()
  }

  async function saveEditor() {
    if (!editor || !supabase || !plan) return
    if (!editor.title.trim()) return setMessage({ tone: 'danger', text: 'La actividad necesita un título.' })
    const starts = new Date(`${editor.date}T${editor.start}`)
    const ends = new Date(`${editor.date}T${editor.end}`)
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()) || ends < starts) {
      return setMessage({ tone: 'danger', text: 'Revisa la fecha y la hora: el fin debe ser posterior al inicio.' })
    }
    setSaving(true)
    setMessage(null)
    if (team && editor.audience === 'person' && editor.personIds.length === 0) {
      return setMessage({ tone: 'danger', text: 'Elige al menos una persona para este evento.' })
    }
    if (team) {
      const teamRepeat = canRepeat(editor) ? editor.repeat : 'none'
      const { error: teamError } = await supabase.rpc('calendar_save_team_event_v4', {
        p_id: editor.id,
        p_team: team.id,
        p_title: editor.title.trim(),
        p_description: editor.description,
        p_location: editor.location,
        p_event_type: editor.eventType,
        p_starts: starts.toISOString(),
        p_ends: ends.toISOString(),
        p_division: editor.audience === 'division' ? editor.division || null : null,
        p_audience: editor.audience,
        p_audience_users: editor.audience === 'person' ? editor.personIds : null,
        p_repeat: teamRepeat,
        p_repeat_until: teamRepeat === 'none' || !editor.repeatUntil ? null : new Date(`${editor.repeatUntil}T23:59:59`).toISOString(),
        p_reminders: orgReminderLimit === 1 ? [240] : editor.reminders,
      })
      setSaving(false)
      if (teamError) return setMessage({ tone: 'danger', text: teamError.message })
      setEditor(null)
      setMessage({ tone: 'success', text: editor.id ? 'Evento actualizado.' : 'Evento creado en el calendario del equipo.' })
      await loadAccount()
      await loadFeed()
      await loadUpcoming()
      return
    }
    if (organization && userId && editor.scope !== organization.id) {
      const { error: teamError } = await supabase.rpc('calendar_org_save_team_event', {
        p_org: organization.id,
        p_id: editor.id,
        p_team: editor.scope,
        p_title: editor.title.trim(),
        p_description: editor.description,
        p_location: editor.location,
        p_event_type: editor.eventType,
        p_starts: starts.toISOString(),
        p_ends: ends.toISOString(),
      })
      setSaving(false)
      if (teamError) return setMessage({ tone: 'danger', text: teamError.message })
      setEditor(null)
      setMessage({ tone: 'success', text: editor.id ? 'Evento del equipo actualizado.' : 'Evento creado en el calendario del equipo.' })
      await loadFeed()
      await loadUpcoming()
      return
    }
    if (organization && userId) {
      const orgRepeat = orgFlag('repetir_eventos') ? editor.repeat : 'none'
      const row = {
        title: editor.title.trim(),
        description: editor.description || null,
        location: editor.location || null,
        event_type: editor.eventType,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        all_day: false,
        repeat_rule: orgRepeat,
        repeat_until: orgRepeat === 'none' || !editor.repeatUntil ? null : new Date(`${editor.repeatUntil}T23:59:59`).toISOString(),
        reminder_minutes: orgReminderLimit === 1 ? [240] : editor.reminders,
      }
      const { error: orgError } = editor.id
        ? await supabase.from('organization_calendar_events').update(row).eq('id', editor.id)
        : await supabase.from('organization_calendar_events').insert({ ...row, organization_id: organization.id, created_by: userId })
      setSaving(false)
      if (orgError) return setMessage({ tone: 'danger', text: orgError.message })
      setEditor(null)
      setMessage({ tone: 'success', text: editor.id ? 'Evento actualizado.' : 'Evento creado en el calendario de la organización.' })
      await loadAccount()
      await loadFeed()
      await loadUpcoming()
      return
    }
    if (editor.scope !== 'personal') {
      const { error: teamError } = await supabase.rpc('calendar_save_team_event', {
        p_id: editor.id,
        p_team: editor.scope,
        p_title: editor.title.trim(),
        p_description: editor.description,
        p_location: editor.location,
        p_event_type: editor.eventType,
        p_starts: starts.toISOString(),
        p_ends: ends.toISOString(),
        p_all_day: false,
      })
      setSaving(false)
      if (teamError) return setMessage({ tone: 'danger', text: teamError.message })
      setEditor(null)
      setMessage({ tone: 'success', text: editor.id ? 'Evento del equipo actualizado.' : 'Evento creado en el calendario del equipo.' })
      await loadFeed()
      await loadUpcoming()
      return
    }
    const repeat = unlimited ? editor.repeat : 'none'
    const { error } = await supabase.rpc('calendar_save_personal_activity', {
      p_id: editor.id,
      p_title: editor.title.trim(),
      p_description: editor.description,
      p_location: editor.location,
      p_event_type: types.find((type) => type.id === (editor.typeId ?? defaultPersonalId))?.category ?? 'personal',
      p_type_id: editor.typeId ?? defaultPersonalId,
      p_starts: starts.toISOString(),
      p_ends: ends.toISOString(),
      p_all_day: false,
      p_repeat: repeat,
      p_repeat_until: repeat === 'none' || !editor.repeatUntil ? null : new Date(`${editor.repeatUntil}T23:59:59`).toISOString(),
      p_reminders: unlimited ? editor.reminders : [240],
    })
    setSaving(false)
    if (error) return setMessage({ tone: 'danger', text: error.message })
    setEditor(null)
    setMessage({ tone: 'success', text: editor.id ? 'Actividad actualizada.' : 'Actividad creada.' })
    await loadAccount()
    await loadFeed()
  }

  function toggleReminder(minutes: number) {
    if (!editor) return
    const has = editor.reminders.includes(minutes)
    if (!has && isMgmt && orgReminderLimit !== null && editor.reminders.length >= orgReminderLimit) {
      return setMessage({ tone: 'danger', text: `Tu plan permite hasta ${orgReminderLimit} recordatorios por evento.` })
    }
    setEditor({ ...editor, reminders: has ? editor.reminders.filter((m) => m !== minutes) : [...editor.reminders, minutes] })
  }

  // Exportar (organización, Pro): CSV del periodo visible y PDF por la impresión del navegador.
  function exportOrg() {
    const header = ['Fecha', 'Inicio', 'Fin', 'Evento', 'Calendario', 'Lugar']
    const rows = visible.map((item) => [new Date(item.starts_at).toLocaleDateString('es-PA'), formatTime(item.starts_at), formatTime(item.ends_at), item.title, item.owner_name ?? '', item.location ?? ''])
    downloadCsv('calendario.csv', header, rows)
    printReport(`Calendario · ${organization?.name ?? team?.name ?? ''}`, header, rows)
  }

  // Abre un formulario sin tirar el que está abierto: el anterior queda aparcado y se puede reanudar.
  function openDraft(next: Editor) {
    if (editor && (!next.id || editor.id !== next.id)) setParkedDraft(editor)
    setEditor(next)
    setMessage(null)
  }

  function resumeParkedDraft() {
    const parked = parkedDraft
    setParkedDraft(editor)
    setEditor(parked)
    setEditorMinimized(false)
  }

  function openNew() {
    setSelected(null)
    openDraft(isMgmt ? { ...toEditor(null, anchor), scope: mgmtId } : toEditor(null, anchor))
  }

  function ItemButton({ item }: { item: FeedItem }) {
    const time = item.all_day ? 'Todo el día' : `${formatTime(item.starts_at)} – ${formatTime(item.ends_at)}`
    return (
      <button
        type="button"
        onClick={() => setSelected(item)}
        className="flex w-full flex-col gap-0.5 rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface)] px-3 py-2 text-left hover:border-[var(--ax-line-strong)]"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[.12em]" style={{ color: colorOf(item) }}>{time}</span>
        <span className="text-sm font-semibold text-[var(--ax-text)]">{item.title}</span>
      </button>
    )
  }

  // Chip de evento: color del tipo, fondo tintado y hora.
  function EventChip({ item }: { item: FeedItem }) {
    const color = colorOf(item)
    return (
      <button
        type="button"
        onClick={() => setSelected(item)}
        className="flex h-5 w-full items-center rounded-[6px] px-1.5 text-left text-[11px] font-medium"
        style={{ color, background: `${color}29` }}
      >
        <span className="truncate" title={item.all_day ? item.title : `${formatTime(item.starts_at)} · ${item.title}`}>{item.title}</span>
      </button>
    )
  }

  function renderMonth() {
    const days = monthGridDays(anchor)
    const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7">
            {weekdays.map((d) => (
              <p key={d} className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--ax-muted)]">{d}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 border-l border-t border-[var(--ax-line)]">
            {days.map((day) => {
              const key = dayKey(day)
              const list = byDay.get(key) ?? []
              const outside = day.getMonth() !== anchor.getMonth()
              const isToday = key === dayKey(new Date())
              return (
                <div key={key} className={`flex min-h-[112px] flex-col gap-1 border-b border-r border-[var(--ax-line)] bg-[var(--ax-surface)] p-[7px] ${outside ? 'opacity-50' : ''}`}>
                  <button
                    type="button"
                    onClick={() => { setAnchor(startOfDay(day)); setView('dia') }}
                    className={`flex h-[26px] w-[26px] items-center justify-center rounded-full text-[13px] font-semibold ${isToday ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'text-[var(--ax-text)]'}`}
                  >
                    {day.getDate()}
                  </button>
                  {list.slice(0, 2).map((item) => <EventChip key={item.id + item.starts_at} item={item} />)}
                  {list.length > 2 && <span className="text-[11px] text-[var(--ax-muted)]">+{list.length - 2} más</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  function renderBody() {
    if (view === 'mes') return renderMonth()
    if (view === 'semana') {
      return (
        <div className="grid gap-3 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i)).map((day) => {
            const list = byDay.get(dayKey(day)) ?? []
            return (
              <div key={dayKey(day)} className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--ax-muted)]">{day.toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric' })}</p>
                {list.length === 0 ? <p className="text-xs text-[var(--ax-muted)]">Sin actividades</p> : list.map((item) => <ItemButton key={item.id + item.starts_at} item={item} />)}
              </div>
            )
          })}
        </div>
      )
    }
    if (view === 'dia') {
      const list = byDay.get(dayKey(anchor)) ?? []
      return list.length === 0
        ? <p className="text-sm text-[var(--ax-muted)]">No hay actividades este día.</p>
        : <div className="flex flex-col gap-2">{list.map((item) => <ItemButton key={item.id + item.starts_at} item={item} />)}</div>
    }
    if (view === 'agenda') {
      const groups = [...byDay.entries()]
      return groups.length === 0
        ? <p className="text-sm text-[var(--ax-muted)]">No hay actividades en los próximos 60 días.</p>
        : (
          <div className="flex flex-col gap-5">
            {groups.map(([key, list]) => (
              <div key={key} className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--ax-muted)]">{formatDayLabel(new Date(list[0].starts_at))}</p>
                {list.map((item) => <ItemButton key={item.id + item.starts_at} item={item} />)}
              </div>
            ))}
          </div>
        )
    }
    return visible.length === 0
      ? <p className="text-sm text-[var(--ax-muted)]">No hay actividades en los próximos 60 días.</p>
      : (
        <ol className="relative flex flex-col gap-4 border-l border-[var(--ax-line)] pl-6">
          {visible.map((item) => (
            <li key={item.id + item.starts_at} className="relative">
              <span className="absolute -left-[31px] top-2 h-3 w-3 rounded-full" style={{ background: colorOf(item) }} aria-hidden="true" />
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--ax-muted)]">
                {new Date(item.starts_at).toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(item.starts_at)}
              </p>
              <ItemButton item={item} />
            </li>
          ))}
        </ol>
      )
  }

  // Panel derecho del diseño: próximo partido y próximas actividades.
  const now = new Date()
  const nextMatch = upcoming.find((item) => itemKind(item) === 'partido' && new Date(item.starts_at) >= now) ?? null
  const daysLeft = nextMatch
    ? Math.max(0, Math.round((startOfDay(new Date(nextMatch.starts_at)).getTime() - startOfDay(now).getTime()) / 86400000))
    : 0
  const nextActivities = upcoming.filter((item) => new Date(item.ends_at) >= now).slice(0, 5)
  const clashes = isOrg ? findClashes(upcoming.filter((item) => new Date(item.ends_at) >= now)) : []

  const panelClass = 'rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-5'

  return (
    <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
      <div className="mx-auto max-w-[1184px] space-y-5 px-4 pb-16 pt-5 sm:space-y-6 sm:px-8 sm:pt-8 lg:px-10">
        <PageHeader
          title="Calendario"
          actions={(
            <div className="flex flex-wrap gap-2">
              {isMgmt && orgFlag('reportes') && (
                <Button variant="secondary" onClick={() => exportOrg()}>Exportar PDF / CSV</Button>
              )}
              <Button variant="primary" onClick={openNew}>{isMgmt ? '+ Crear evento' : '+ Crear actividad'}</Button>
            </div>
          )}
        />

        {message && <Notice tone={message.tone === 'success' ? 'success' : 'danger'} icon={Info}>{message.text}</Notice>}
        {!isMgmt && plan && !unlimited && (
          <Notice tone="neutral" icon={Info}>Plan {plan.name}: {usage} de {limit} actividades personales este mes.</Notice>
        )}
        {isMgmt && plan && orgUsage && orgEventLimit !== null && (
          <Notice
            tone={orgEventsUsed >= orgEventLimit ? 'warning' : 'neutral'}
            icon={Info}
            action={<ButtonLink href="/mi-perfil?seccion=cuenta&mejorar=1" variant="secondary" size="sm">Mejorar plan</ButtonLink>}
          >
            Plan {plan.name}: {orgEventsUsed} de {orgEventLimit} eventos {isTeam ? 'del equipo' : 'de la organización'} este mes.
            {isOrg && !orgFlag('vista_equipos') && ' Los eventos de tus equipos se ven desde el plan Pro.'}
          </Notice>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={view === v.id}
                onClick={() => setView(v.id)}
                className={`h-9 rounded-[9px] px-4 text-[13px] font-medium transition-colors ${view === v.id ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'text-[var(--ax-text-secondary)] hover:text-[var(--ax-text)]'}`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => moveAnchor(-1)} aria-label="Anterior" className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface)] text-[var(--ax-text)]">‹</button>
            <button type="button" onClick={() => setAnchor(startOfDay(new Date()))} className="h-10 rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface)] px-5 text-sm font-semibold text-[var(--ax-text)]">Hoy</button>
            <button type="button" onClick={() => moveAnchor(1)} aria-label="Siguiente" className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface)] text-[var(--ax-text)]">›</button>
            <p className="ml-3 text-lg font-semibold text-[var(--ax-text)]">{view === 'mes' ? monthLabel(anchor) : navLabel()}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'todos', label: 'Todos', color: '#e8eef3' },
            ...(isMgmt
              ? teamEventTypes.map((type) => ({ id: type.id as string, label: type.label, color: teamChipColor[type.id] }))
              : types.map((type) => ({ id: type.id, label: type.label, color: type.color }))),
            ...(isOrg && orgFlag('vista_equipos') ? [{ id: 'equipos', label: 'Todos los equipos', color: '' }] : []),
          ].map((f) => {
            const on = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(f.id)}
                className={`inline-flex h-[34px] items-center gap-2 rounded-full border px-4 text-[13px] font-medium text-[var(--ax-text)] ${on ? 'border-[var(--ax-accent)] bg-[var(--ax-surface-raised)]' : 'border-[var(--ax-line)] bg-[var(--ax-surface)]'}`}
              >
                {f.color && <span className="h-2 w-2 rounded-full" style={{ background: f.color }} aria-hidden="true" />}
                {f.label}
              </button>
            )
          })}
          {isOrg && plan && !orgFlag('vista_equipos') && (
            <Link href={upgradeHref} className="inline-flex h-[34px] items-center rounded-full bg-[var(--ax-accent-soft)] px-3.5 text-xs font-semibold text-[var(--ax-accent-text)]">Todos los equipos · Pro</Link>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-0">
              <div className="p-3">{renderBody()}</div>
            </div>
      {selected && (
        <Card>
          <CardHeader id="evento-detalle" title={selected.title} actions={<Button variant="secondary" onClick={() => setSelected(null)}>Cerrar</Button>} />
          <div className="mt-4 flex flex-col gap-2 text-sm text-[var(--ax-text)]">
            <p>{selected.all_day ? 'Todo el día' : `${formatDayLabel(new Date(selected.starts_at))} · ${formatTime(selected.starts_at)} – ${formatTime(selected.ends_at)}`}</p>
            {selected.location && <p className="text-[var(--ax-muted)]">{selected.location}</p>}
            {selected.description && <p className="whitespace-pre-line text-[var(--ax-muted)]">{selected.description}</p>}
            {selected.source === 'team' && selected.audience && selected.audience !== 'team' && (
              <p className="text-sm text-[var(--ax-text-secondary)]"><span className="text-[var(--ax-muted)]">Dirigido a:</span> {selected.audience_label ?? audienceLabels[selected.audience] ?? 'equipo'}</p>
            )}
            <p className="text-[var(--ax-muted)]">{selected.source === 'personal' ? (selected.type_label ?? 'Actividad personal') : selected.owner_name ?? ''}</p>
          </div>
          {!isMgmt && (selected.source === 'team' || selected.source === 'organization') && (
            <div className="mt-5">
              <FieldLabel>Tu asistencia</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {responses.map((r) => (
                  <Segment key={r.id} active={selected.my_response === r.id} label={r.label} onClick={() => void respond(selected, r.id)} />
                ))}
              </div>
            </div>
          )}
          {selected.source === 'team' && (isTeam || !isOrg) && (isTeam || managedTeams.some((t) => t.id === selected.owner_id && t.role !== 'staff')) && (
            <TeamAttendance eventId={selected.id} />
          )}
          {(selected.source === 'personal' || ((selected.source === 'team' || selected.source === 'organization') && selected.can_edit)) && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => { openDraft(toEditor(selected, anchor)); setSelected(null) }}>Editar</Button>
              <Button variant="secondary" onClick={() => void removeActivity(selected)}>Eliminar</Button>
            </div>
          )}
        </Card>
      )}

      {parkedDraft && (
        <button
          type="button"
          onClick={resumeParkedDraft}
          className="fixed bottom-4 left-4 z-40 flex cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--ax-line-strong)] bg-[var(--ax-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--ax-text)] shadow-[var(--ax-shadow-pop)] hover:bg-[var(--ax-hover)] sm:bottom-6 sm:left-6"
        >
          <span className="text-[var(--ax-accent)]" aria-hidden="true">●</span>
          Reanudar borrador{parkedDraft.title.trim() ? ` · ${parkedDraft.title.trim()}` : ''}
        </button>
      )}

      {editor && (
        // Panel flotante tipo borrador: abajo a la derecha en escritorio y como hoja inferior en móvil.
        // Se puede minimizar a su barra de título sin perder lo escrito.
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="actividad-editor"
          className="ax-drop-in fixed inset-x-0 bottom-0 z-40 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[14px] border border-b-0 border-[var(--ax-line-strong)] bg-[var(--ax-surface)] shadow-[var(--ax-shadow-pop)] sm:inset-x-auto sm:right-6 sm:w-[560px] sm:max-h-[min(80vh,720px)]"
        >
          <header className="flex shrink-0 items-center gap-2 border-b border-[var(--ax-line)] bg-[var(--ax-surface-raised)] py-2 pl-4 pr-2">
            <button type="button" onClick={() => setEditorMinimized(!editorMinimized)} aria-expanded={!editorMinimized} className="flex min-w-0 flex-1 cursor-pointer items-center text-left">
              <h2 id="actividad-editor" className="truncate font-display text-[22px] uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">
                {isMgmt ? (editor.id ? 'Editar evento' : 'Nuevo evento') : (editor.id ? 'Editar actividad' : 'Nueva actividad')}
                {editorMinimized && editor.title.trim() ? <span className="ml-2 font-sans text-sm normal-case tracking-normal text-[var(--ax-muted)]">· {editor.title.trim()}</span> : null}
              </h2>
            </button>
            <button type="button" onClick={() => setEditorMinimized(!editorMinimized)} aria-label={editorMinimized ? 'Expandir formulario' : 'Minimizar formulario'} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-[var(--ax-text-secondary)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]">
              {editorMinimized ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
            </button>
            <button type="button" onClick={() => setEditor(null)} aria-label="Cerrar formulario" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-[var(--ax-text-secondary)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]">
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <div hidden={editorMinimized} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {isOrg && organization && (
              <div className="md:col-span-2">
                {orgEventLimit !== null && editor.scope === organization.id && !editor.id && (
                  <div className="mb-5"><Notice tone="neutral" icon={Info}>Plan {plan?.name}: te quedan {Math.max(0, orgEventLimit - orgEventsUsed)} de {orgEventLimit} eventos este mes.</Notice></div>
                )}
                <FieldLabel>Calendario</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  <Segment active={editor.scope === organization.id} label="Organización" disabled={Boolean(editor.id)} onClick={() => setEditor({ ...editor, scope: organization.id })} />
                  {orgTeams.map((team) => (
                    <Segment key={team.id} active={editor.scope === team.id} label={team.name} disabled={Boolean(editor.id)} onClick={() => setEditor({ ...editor, scope: team.id })} />
                  ))}
                </div>
              </div>
            )}
            {isTeam && team && (
              <div className="md:col-span-2">
                {orgEventLimit !== null && !editor.id && (
                  <div className="mb-5"><Notice tone="neutral" icon={Info}>Plan {plan?.name}: te quedan {Math.max(0, orgEventLimit - orgEventsUsed)} de {orgEventLimit} eventos este mes.</Notice></div>
                )}
                <FieldLabel>Dirigido a</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  <Segment active={editor.audience === 'team'} label="Todo el equipo" onClick={() => setEditor({ ...editor, audience: 'team', division: '', personIds: [] })} />
                  {divisions.map((d) => <Segment key={d.id} active={editor.audience === 'division' && editor.division === d.id} label={d.name} onClick={() => setEditor({ ...editor, audience: 'division', division: d.id, personIds: [] })} />)}
                  <Segment active={editor.audience === 'staff'} label="Cuerpo técnico" onClick={() => setEditor({ ...editor, audience: 'staff', division: '', personIds: [] })} />
                  <Segment active={editor.audience === 'person'} label="Persona" onClick={() => { setEditor({ ...editor, audience: 'person', division: '' }); setPendingPersonId('') }} />
                </div>
                {editor.audience === 'person' && (() => {
                  const people = [...(audienceOptions?.staff ?? []), ...(audienceOptions?.players ?? [])]
                    .filter((o, i, all) => all.findIndex((x) => x.user_id === o.user_id) === i)
                  const nameOf = (id: string) => people.find((o) => o.user_id === id)?.name ?? 'Persona'
                  const query = personQuery.trim().toLowerCase()
                  const results = people
                    .filter((o) => !editor.personIds.includes(o.user_id))
                    .filter((o) => !query || o.name.toLowerCase().includes(query))
                    .slice(0, 6)
                  return (
                    <div className="mt-3 space-y-3">
                      <div>
                        <FieldLabel>Personas seleccionadas</FieldLabel>
                        {editor.personIds.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {editor.personIds.map((id) => (
                              <span key={id} className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--ax-accent-line)] bg-[var(--ax-accent)]/10 py-1.5 pl-3 pr-1.5 text-sm font-semibold text-[var(--ax-text)]">
                                {nameOf(id)}
                                <button type="button" aria-label={`Quitar a ${nameOf(id)}`} onClick={() => setEditor({ ...editor, personIds: editor.personIds.filter((x) => x !== id) })} className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-[8px] text-[var(--ax-muted)] hover:bg-[var(--ax-hover)]"><X size={13} /></button>
                              </span>
                            ))}
                          </div>
                        ) : <p className="mt-2 text-sm text-[var(--ax-muted)]">Todavía no hay personas. Busca y agrega.</p>}
                      </div>
                      <div>
                        <input className={inputClass} placeholder="Buscar jugador, directivo o staff" value={personQuery} onChange={(e) => { setPersonQuery(e.target.value); setPendingPersonId('') }} />
                        <div className="mt-2 flex flex-col gap-1">
                          {results.map((o) => (
                            <button key={o.user_id} type="button" onClick={() => setPendingPersonId(o.user_id)} className={`cursor-pointer rounded-[10px] px-3 py-2 text-left text-sm ${pendingPersonId === o.user_id ? 'bg-[var(--ax-hover)] font-semibold text-[var(--ax-text)]' : 'text-[var(--ax-text-secondary)] hover:bg-[var(--ax-hover)]'}`}>{o.name}</button>
                          ))}
                          {!results.length && <p className="px-3 py-2 text-sm text-[var(--ax-muted)]">No hay más personas con ese nombre.</p>}
                        </div>
                        {pendingPersonId && (
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3 py-2.5">
                            <span className="text-sm text-[var(--ax-text)]">{nameOf(pendingPersonId)}</span>
                            <Button variant="secondary" onClick={() => { setEditor({ ...editor, personIds: [...editor.personIds, pendingPersonId] }); setPendingPersonId(''); setPersonQuery('') }}>Agregar a la lista</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
            {!isMgmt && managedTeams.length > 0 && (
              <div className="md:col-span-2">
                <FieldLabel>Calendario</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  <Segment active={editor.scope === 'personal'} label="Personal" onClick={() => setEditor({ ...editor, scope: 'personal' })} />
                  {managedTeams.map((team) => (
                    <Segment key={team.id} active={editor.scope === team.id} label={team.name} onClick={() => setEditor({ ...editor, scope: team.id })} />
                  ))}
                </div>
              </div>
            )}
            {editor.scope === 'personal' && (
              <div className="md:col-span-2">
                <FieldLabel>Tipo de evento</FieldLabel>
                <div className="flex flex-wrap items-center gap-2">
                  {types.map((type) => {
                    const active = (editor.typeId ?? defaultPersonalId) === type.id
                    return (
                      <button
                        key={type.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setEditor({ ...editor, typeId: type.id })}
                        className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors ${active ? 'border-[var(--ax-accent-line)] bg-[var(--ax-accent-soft)] text-[var(--ax-text)]' : 'border-[var(--ax-line-strong)] text-[var(--ax-text-secondary)] hover:bg-[var(--ax-hover)]'}`}
                      >
                        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: type.color }} />
                        {type.label}
                      </button>
                    )
                  })}
                  <button type="button" onClick={() => setTypesOpen(true)} aria-label="Editar tipos de evento" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--ax-line-strong)] text-[var(--ax-text-secondary)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]">
                    <Pencil size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
            {editor.scope !== 'personal' && (
              <div className="md:col-span-2">
                <FieldLabel>Tipo de evento</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {teamEventTypes.map((t) => (
                    <Segment key={t.id} active={editor.eventType === t.id} label={t.label} onClick={() => setEditor({ ...editor, eventType: t.id })} />
                  ))}
                </div>
              </div>
            )}
            <label className="block md:col-span-2">
              <FieldLabel>Título</FieldLabel>
              <input className={inputClass} value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} />
            </label>
            <label className="block">
              <FieldLabel>Fecha</FieldLabel>
              <input className={inputClass} type="date" value={editor.date} onChange={(e) => setEditor({ ...editor, date: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <FieldLabel>Inicio</FieldLabel>
                <input className={inputClass} type="time" value={editor.start} onChange={(e) => setEditor({ ...editor, start: e.target.value })} />
              </label>
              <label className="block">
                <FieldLabel>Fin</FieldLabel>
                <input className={inputClass} type="time" value={editor.end} onChange={(e) => setEditor({ ...editor, end: e.target.value })} />
              </label>
            </div>
            <label className="block md:col-span-2">
              <FieldLabel>Lugar</FieldLabel>
              <input className={inputClass} value={editor.location} onChange={(e) => setEditor({ ...editor, location: e.target.value })} />
            </label>
            <label className="block md:col-span-2">
              <FieldLabel>Descripción</FieldLabel>
              <textarea className={`${inputClass} min-h-24 py-3`} value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} />
            </label>

            {isMgmt && editor.scope === mgmtId && (
              <>
                <div className="md:col-span-2">
                  <FieldLabel>Repetir</FieldLabel>
                  {canRepeat(editor) ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Segment active={editor.repeat === 'none'} label="No se repite" onClick={() => setEditor({ ...editor, repeat: 'none' })} />
                        <Segment active={editor.repeat === 'weekly'} label="Cada semana" onClick={() => setEditor({ ...editor, repeat: 'weekly' })} />
                        <Segment active={editor.repeat === 'monthly'} label="Cada mes" onClick={() => setEditor({ ...editor, repeat: 'monthly' })} />
                      </div>
                      {editor.repeat !== 'none' && (
                        <label className="mt-3 block">
                          <FieldLabel>Repetir hasta (vacío = sin fin)</FieldLabel>
                          <input className={inputClass} type="date" value={editor.repeatUntil} onChange={(e) => setEditor({ ...editor, repeatUntil: e.target.value })} />
                        </label>
                      )}
                      {isMgmt && orgUsage?.limits?.eventos_repetidos != null && (
                        <p className="mt-2 text-xs text-[var(--ax-muted)]">Plan {plan?.name}: {orgUsage.usage?.eventos_repetidos ?? 0} de {orgUsage.limits.eventos_repetidos} evento repetido en uso.</p>
                      )}
                    </>
                  ) : <LockedFeature label={isTeam ? `Tu plan permite ${orgUsage?.limits?.eventos_repetidos ?? 1} evento repetido` : 'Repetir eventos'} />}
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Recordatorios</FieldLabel>
                  {orgReminderLimit === 1 ? (
                    <p className="text-sm text-[var(--ax-text)]">{reminderLabels[240]} (fijo en el plan {plan?.name})</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(reminderLabels).map(([minutes, label]) => (
                          <Segment key={minutes} active={editor.reminders.includes(Number(minutes))} label={label.replace(' antes', '')} onClick={() => toggleReminder(Number(minutes))} />
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-[var(--ax-muted)]">{orgReminderLimit === null ? 'Recordatorios sin límite por evento.' : `Hasta ${orgReminderLimit} recordatorios por evento.`}</p>
                    </>
                  )}
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Sincronizar con Google y Outlook</FieldLabel>
                  {orgFlag('sincronizacion') ? (
                    <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-[var(--ax-text)]">
                      <input type="checkbox" className="peer sr-only" checked={syncOn} onChange={(e) => setSyncOn(e.target.checked)} />
                      <span className="relative h-6 w-11 rounded-full bg-[var(--ax-line-strong)] transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-[var(--ax-text)] after:transition-transform peer-checked:bg-[var(--ax-accent)] peer-checked:after:translate-x-5 peer-checked:after:bg-[var(--ax-on-accent)]" aria-hidden="true" />
                      {syncOn ? 'Activado' : 'Desactivado'}
                      <span className="text-xs text-[var(--ax-muted)]">Se aplicará al conectar Google u Outlook en Mi perfil → Conexiones.</span>
                    </label>
                  ) : <LockedFeature label="Sincronización automática" />}
                </div>
              </>
            )}
            {!isMgmt && editor.scope === 'personal' && (
              <>
            <div className="md:col-span-2">
              <FieldLabel>Repetir</FieldLabel>
              {personalRepeatAllowed ? (
                <div className="flex flex-wrap gap-2">
                  <Segment active={editor.repeat === 'none'} label="No se repite" onClick={() => setEditor({ ...editor, repeat: 'none' })} />
                  <Segment active={editor.repeat === 'weekly'} label="Cada semana" onClick={() => setEditor({ ...editor, repeat: 'weekly' })} />
                  <Segment active={editor.repeat === 'monthly'} label="Cada mes" onClick={() => setEditor({ ...editor, repeat: 'monthly' })} />
                </div>
              ) : (
                <p className="text-sm text-[var(--ax-muted)]">Repetir actividades es parte del plan Pro.</p>
              )}
              {!unlimited && personalRepeatAllowed && (
                <p className="mt-2 text-xs text-[var(--ax-muted)]">Plan {plan?.name}: hasta {personalRepeatLimit} actividades repetidas, dentro de tus {limit} del mes.</p>
              )}
              {personalRepeatAllowed && editor.repeat !== 'none' && (
                <label className="mt-3 block">
                  <FieldLabel>Repetir hasta (vacío = sin fin)</FieldLabel>
                  <input className={inputClass} type="date" value={editor.repeatUntil} onChange={(e) => setEditor({ ...editor, repeatUntil: e.target.value })} />
                </label>
              )}
            </div>

            <div className="md:col-span-2">
              <FieldLabel>Recordatorios</FieldLabel>
              {unlimited ? (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(reminderLabels).map(([minutes, label]) => (
                    <Segment key={minutes} active={editor.reminders.includes(Number(minutes))} label={label} onClick={() => toggleReminder(Number(minutes))} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--ax-muted)]">{reminderLabels[240]} (plan Libre)</p>
              )}
            </div>

              </>
            )}
            <div className="flex justify-end gap-3 md:col-span-2">
              <Button variant="primary" disabled={saving} onClick={() => void saveEditor()}>{saving ? 'Guardando…' : isMgmt ? 'Guardar evento' : 'Guardar actividad'}</Button>
            </div>
          </div>
          </div>
        </section>
      )}

      {typesOpen && userId && (
        <PersonalTypesSheet
          types={types}
          userId={userId}
          onChanged={async () => { await loadTypes(); await loadFeed() }}
          onClose={() => setTypesOpen(false)}
        />
      )}


          </div>

          <aside className="flex flex-col gap-4">
            <div className={panelClass}>
              <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--ax-muted)]">Próximo partido</p>
              <p className="mt-3 font-display text-[36px] uppercase leading-none text-[var(--ax-text)]">{nextMatch ? nextMatch.title : 'Sin partidos'}</p>
              {nextMatch && (
                <>
                  <p className="mt-3 text-sm text-[var(--ax-muted)]">
                    {new Date(nextMatch.starts_at).toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'short' })} · {formatTime(nextMatch.starts_at)}
                    {nextMatch.location ? ` · ${nextMatch.location}` : ''}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--ax-accent-text)]">{daysLeft === 0 ? 'Hoy' : `Faltan ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`}</p>
                </>
              )}
            </div>

            <div className={panelClass}>
              <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--ax-muted)]">Próximas actividades</p>
              {nextActivities.length === 0 && <p className="mt-3 text-sm text-[var(--ax-muted)]">No tienes actividades próximas.</p>}
              <ul className="mt-3 flex flex-col gap-3">
                {nextActivities.map((item) => (
                  <li key={item.id + item.starts_at}>
                    <button type="button" onClick={() => setSelected(item)} className="flex w-full gap-3 text-left">
                      <span className="w-[3px] shrink-0 rounded-full" style={{ background: colorOf(item) }} aria-hidden="true" />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-[11px] text-[var(--ax-muted)]">
                          {new Date(item.starts_at).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' })} · {item.source === 'personal' ? 'Personal' : item.event_type === 'training' ? 'Entrenamiento' : item.event_type === 'match' ? 'Partido' : 'Actividad'}
                        </span>
                        <span className="truncate text-sm font-semibold text-[var(--ax-text)]">{item.title}</span>
                        <span className="text-xs text-[var(--ax-muted)]">{formatTime(item.starts_at)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {isOrg && (
              <div className={panelClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--ax-muted)]">Choques de cancha y horario</p>
                {!orgFlag('vista_equipos') ? (
                  <div className="mt-3 flex flex-col gap-2.5">
                    <p className="text-[13px] text-[var(--ax-muted)]">Vista de todos los equipos · Disponible en Pro</p>
                    <ButtonLink href={upgradeHref} variant="secondary">Mejorar plan</ButtonLink>
                  </div>
                ) : clashes.length === 0 ? (
                  <p className="mt-3 text-sm text-[var(--ax-muted)]">Sin choques en los próximos 60 días.</p>
                ) : (
                  <div className="mt-3 flex flex-col gap-1.5">
                    <p className="text-sm font-semibold text-[var(--ax-text)]">
                      {new Date(clashes[0].second.starts_at).toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(clashes[0].second.starts_at)} · {clashes[0].second.location}
                    </p>
                    <p className="text-[13px] text-[var(--ax-muted)]">{clashes[0].first.title} y {clashes[0].second.title} usan la misma cancha.</p>
                    {clashes.length > 1 && <p className="text-xs text-[var(--ax-muted)]">{clashes.length - 1} {clashes.length === 2 ? 'choque más' : 'choques más'}.</p>}
                  </div>
                )}
              </div>
            )}
            {isMgmt && (
              <div className={panelClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--ax-muted)]">Conexiones</p>
                {!orgFlag('sincronizacion') ? (
                  <div className="mt-3 flex flex-col gap-2.5">
                    <p className="text-[13px] text-[var(--ax-muted)]">Sincronizar con Google y Outlook · Disponible en Pro</p>
                    <ButtonLink href={upgradeHref} variant="secondary">Mejorar plan</ButtonLink>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col gap-1.5 text-sm text-[var(--ax-text)]">
                    <p>Google Calendar · No conectado</p>
                    <p>Outlook · No conectado</p>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}

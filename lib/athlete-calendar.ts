// Reglas de fechas, vistas y filtros del calendario del atleta. Sin dependencias de React.

export type FeedSource = 'team' | 'organization' | 'personal'

export type FeedItem = {
  source: FeedSource
  id: string
  owner_id: string | null
  owner_name: string | null
  title: string
  description: string | null
  location: string | null
  event_type: string
  starts_at: string
  ends_at: string
  all_day: boolean
  occurrence: number
  repeat_rule: 'none' | 'weekly' | 'monthly'
  my_response: 'voy' | 'tal_vez' | 'no_voy' | null
}

export type CalendarView = 'mes' | 'semana' | 'dia' | 'agenda' | 'linea'
export type CalendarFilter = 'todos' | 'partidos' | 'entrenamientos' | 'personales' | 'organizacion'
export type ItemKind = 'partido' | 'entrenamiento' | 'personal' | 'organizacion' | 'otro'

export function startOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

// Lunes de la semana de la fecha dada.
export function startOfWeek(date: Date) {
  const day = startOfDay(date)
  const offset = (day.getDay() + 6) % 7
  return addDays(day, -offset)
}

// Rango que se pide a la base de datos para cada vista.
export function rangeFor(view: CalendarView, anchor: Date): { from: Date; to: Date } {
  if (view === 'mes') {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)
    return { from: addDays(startOfWeek(first), 0), to: addDays(startOfWeek(last), 7) }
  }
  if (view === 'semana') {
    const monday = startOfWeek(anchor)
    return { from: monday, to: addDays(monday, 7) }
  }
  if (view === 'dia') {
    const day = startOfDay(anchor)
    return { from: day, to: addDays(day, 1) }
  }
  const today = startOfDay(anchor)
  return { from: today, to: addDays(today, 60) }
}

// Celdas de la cuadrícula del mes: 6 semanas que empiezan el lunes.
export function monthGridDays(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export function dayKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function itemKind(item: FeedItem): ItemKind {
  if (item.source === 'personal') return 'personal'
  if (item.source === 'organization') return 'organizacion'
  if (item.event_type === 'match') return 'partido'
  if (item.event_type === 'training') return 'entrenamiento'
  return 'otro'
}

export function matchesFilter(item: FeedItem, filter: CalendarFilter) {
  if (filter === 'todos') return true
  const kind = itemKind(item)
  if (filter === 'partidos') return kind === 'partido'
  if (filter === 'entrenamientos') return kind === 'entrenamiento'
  if (filter === 'personales') return kind === 'personal'
  return kind === 'organizacion'
}

// Agrupa por día local, ordenado por hora.
export function groupByDay(items: FeedItem[]) {
  const groups = new Map<string, FeedItem[]>()
  const sorted = [...items].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  for (const item of sorted) {
    const key = dayKey(new Date(item.starts_at))
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return groups
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })
}

export function formatDayLabel(date: Date) {
  return date.toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long' })
}

// Minutos antes del evento que avisamos: 4 horas en Libre; en Pro se pueden elegir varios.
export const reminderLabels: Record<number, string> = {
  15: '15 minutos antes',
  30: '30 minutos antes',
  60: '1 hora antes',
  240: '4 horas antes',
  1440: '1 día antes',
}

'use client'

import { Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { loadAccountPlan, type AccountPlan } from '../../lib/account-plans'
import {
  addDays, dayKey, formatDayLabel, formatTime, groupByDay, itemKind, matchesFilter, monthGridDays, rangeFor, reminderLabels, startOfDay,
  type CalendarFilter, type CalendarView, type FeedItem,
} from '../../lib/athlete-calendar'
import { Button, Card, CardHeader, FieldLabel, Notice, PageHeader, Segment, inputClass } from '../mi-equipo/ui'

const views: Array<{ id: CalendarView; label: string }> = [
  { id: 'mes', label: 'Mes' },
  { id: 'semana', label: 'Semana' },
  { id: 'dia', label: 'Día' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'linea', label: 'Línea de tiempo' },
]

const filters: Array<{ id: CalendarFilter; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'partidos', label: 'Partidos' },
  { id: 'entrenamientos', label: 'Entrenamientos' },
  { id: 'personales', label: 'Personales' },
  { id: 'organizacion', label: 'Organización' },
]

const responses = [
  { id: 'voy', label: 'Voy' },
  { id: 'tal_vez', label: 'Tal vez' },
  { id: 'no_voy', label: 'No voy' },
] as const

type Editor = {
  id: string | null
  title: string
  description: string
  location: string
  date: string
  start: string
  end: string
  repeat: 'none' | 'weekly' | 'monthly'
  repeatUntil: string
  reminders: number[]
}

const kindColor: Record<string, string> = {
  partido: 'var(--ax-accent-text)',
  entrenamiento: 'var(--ax-text-secondary)',
  personal: 'var(--ax-muted)',
  organizacion: 'var(--ax-text)',
  otro: 'var(--ax-muted)',
}

function toEditor(item: FeedItem | null, anchor: Date): Editor {
  const start = item ? new Date(item.starts_at) : new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 18, 0)
  const end = item ? new Date(item.ends_at) : new Date(start.getTime() + 60 * 60 * 1000)
  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return {
    id: item?.source === 'personal' ? item.id : null,
    title: item?.title ?? '',
    description: item?.description ?? '',
    location: item?.location ?? '',
    date: dayKey(start),
    start: hhmm(start),
    end: hhmm(end),
    repeat: item?.repeat_rule ?? 'none',
    repeatUntil: '',
    reminders: [240],
  }
}

export default function AthleteCalendar() {
  const [userId, setUserId] = useState<string | null>(null)
  const [plan, setPlan] = useState<AccountPlan | null>(null)
  const [usage, setUsage] = useState(0)
  const [view, setView] = useState<CalendarView>('mes')
  const [filter, setFilter] = useState<CalendarFilter>('todos')
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [items, setItems] = useState<FeedItem[]>([])
  const [selected, setSelected] = useState<FeedItem | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [showConnections, setShowConnections] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  const unlimited = plan?.personal_activity_monthly_limit === null && plan !== null
  const limit = plan?.personal_activity_monthly_limit ?? null

  async function loadAccount() {
    if (!supabase) return
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    setUserId(data.user.id)
    setPlan(await loadAccountPlan('persona', data.user.id))
    const { data: count } = await supabase.rpc('calendar_personal_usage')
    setUsage(typeof count === 'number' ? count : 0)
  }

  async function loadFeed() {
    if (!supabase) return
    const { from, to } = rangeFor(view, anchor)
    const { data, error } = await supabase.rpc('calendar_my_feed', { p_from: from.toISOString(), p_to: to.toISOString() })
    if (error) return setMessage({ tone: 'danger', text: error.message })
    setItems((data ?? []) as FeedItem[])
  }

  useEffect(() => {
    void loadAccount()
  }, [])

  useEffect(() => {
    void loadFeed()
    // Recarga al cambiar de vista o de periodo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor])

  const visible = useMemo(() => items.filter((item) => matchesFilter(item, filter)), [items, filter])
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
    const { error } = await supabase.rpc('calendar_delete_personal_activity', { p_id: item.id })
    if (error) return setMessage({ tone: 'danger', text: error.message })
    setSelected(null)
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
    const repeat = unlimited ? editor.repeat : 'none'
    const { error } = await supabase.rpc('calendar_save_personal_activity', {
      p_id: editor.id,
      p_title: editor.title.trim(),
      p_description: editor.description,
      p_location: editor.location,
      p_event_type: 'personal',
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
    setEditor({ ...editor, reminders: has ? editor.reminders.filter((m) => m !== minutes) : [...editor.reminders, minutes] })
  }

  function openNew() {
    setSelected(null)
    setEditor(toEditor(null, anchor))
    setMessage(null)
  }

  function ItemButton({ item }: { item: FeedItem }) {
    const time = item.all_day ? 'Todo el día' : `${formatTime(item.starts_at)} – ${formatTime(item.ends_at)}`
    return (
      <button
        type="button"
        onClick={() => { setEditor(null); setSelected(item) }}
        className="flex w-full flex-col gap-0.5 rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface)] px-3 py-2 text-left hover:border-[var(--ax-line-strong)]"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[.12em]" style={{ color: kindColor[itemKind(item)] }}>{time}</span>
        <span className="text-sm font-semibold text-[var(--ax-text)]">{item.title}</span>
      </button>
    )
  }

  function renderBody() {
    if (view === 'mes') {
      const days = monthGridDays(anchor)
      return (
        <div className="grid grid-cols-7 gap-1.5">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
            <p key={d} className="px-1 text-center text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--ax-muted)]">{d}</p>
          ))}
          {days.map((day) => {
            const key = dayKey(day)
            const list = byDay.get(key) ?? []
            const outside = day.getMonth() !== anchor.getMonth()
            const isToday = key === dayKey(new Date())
            return (
              <button
                key={key}
                type="button"
                onClick={() => { setAnchor(startOfDay(day)); setView('dia') }}
                className={`flex min-h-[88px] flex-col gap-1 rounded-[10px] border p-1.5 text-left ${isToday ? 'border-[var(--ax-accent)]' : 'border-[var(--ax-line)]'} ${outside ? 'opacity-50' : ''}`}
              >
                <span className="text-xs font-semibold text-[var(--ax-text)]">{day.getDate()}</span>
                {list.slice(0, 2).map((item) => (
                  <span key={item.id + item.starts_at} className="truncate rounded px-1 text-[11px]" style={{ color: kindColor[itemKind(item)], background: 'var(--ax-accent-soft)' }}>
                    {formatTime(item.starts_at)} {item.title}
                  </span>
                ))}
                {list.length > 2 && <span className="text-[11px] text-[var(--ax-muted)]">+{list.length - 2} más</span>}
              </button>
            )
          })}
        </div>
      )
    }
    if (view === 'semana') {
      return (
        <div className="grid gap-3 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => addDays(startOfDay(anchor), i - ((anchor.getDay() + 6) % 7))).map((day) => {
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
    // Línea de tiempo
    return visible.length === 0
      ? <p className="text-sm text-[var(--ax-muted)]">No hay actividades en los próximos 60 días.</p>
      : (
        <ol className="relative flex flex-col gap-4 border-l border-[var(--ax-line)] pl-6">
          {visible.map((item) => (
            <li key={item.id + item.starts_at} className="relative">
              <span className="absolute -left-[31px] top-2 h-3 w-3 rounded-full" style={{ background: kindColor[itemKind(item)] }} aria-hidden="true" />
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--ax-muted)]">
                {new Date(item.starts_at).toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(item.starts_at)}
              </p>
              <ItemButton item={item} />
            </li>
          ))}
        </ol>
      )
  }

  return (
    <>
      <PageHeader
        title="Calendario"
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setShowConnections((open) => !open)}>Conexiones</Button>
            <Button variant="primary" onClick={openNew}>+ Crear actividad</Button>
          </div>
        )}
      />

      {message && <Notice tone={message.tone === 'success' ? 'success' : 'danger'} icon={Info}>{message.text}</Notice>}

      {plan && !unlimited && (
        <Notice tone="neutral" icon={Info}>Plan {plan.name}: {usage} de {limit} actividades personales este mes.</Notice>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {views.map((v) => <Segment key={v.id} active={view === v.id} label={v.label} onClick={() => setView(v.id)} />)}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => moveAnchor(-1)} aria-label="Anterior">‹</Button>
          <Button variant="secondary" onClick={() => setAnchor(startOfDay(new Date()))}>Hoy</Button>
          <Button variant="secondary" onClick={() => moveAnchor(1)} aria-label="Siguiente">›</Button>
          <p className="ml-2 text-sm font-semibold capitalize text-[var(--ax-text)]">{navLabel()}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => <Segment key={f.id} active={filter === f.id} label={f.label} onClick={() => setFilter(f.id)} />)}
      </div>

      <Card>{renderBody()}</Card>

      {selected && (
        <Card>
          <CardHeader id="evento-detalle" title={selected.title} actions={<Button variant="secondary" onClick={() => setSelected(null)}>Cerrar</Button>} />
          <div className="mt-4 flex flex-col gap-2 text-sm text-[var(--ax-text)]">
            <p>{selected.all_day ? 'Todo el día' : `${formatDayLabel(new Date(selected.starts_at))} · ${formatTime(selected.starts_at)} – ${formatTime(selected.ends_at)}`}</p>
            {selected.location && <p className="text-[var(--ax-muted)]">{selected.location}</p>}
            {selected.description && <p className="whitespace-pre-line text-[var(--ax-muted)]">{selected.description}</p>}
            <p className="text-[var(--ax-muted)]">{selected.source === 'personal' ? 'Actividad personal' : selected.owner_name ?? ''}</p>
          </div>
          {(selected.source === 'team' || selected.source === 'organization') && (
            <div className="mt-5">
              <FieldLabel>Tu asistencia</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {responses.map((r) => (
                  <Segment key={r.id} active={selected.my_response === r.id} label={r.label} onClick={() => void respond(selected, r.id)} />
                ))}
              </div>
            </div>
          )}
          {selected.source === 'personal' && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => { setEditor(toEditor(selected, anchor)); setSelected(null) }}>Editar</Button>
              <Button variant="secondary" onClick={() => void removeActivity(selected)}>Eliminar</Button>
            </div>
          )}
        </Card>
      )}

      {editor && (
        <Card>
          <CardHeader id="actividad-editor" title={editor.id ? 'Editar actividad' : 'Nueva actividad'} actions={<Button variant="secondary" onClick={() => setEditor(null)}>Cancelar</Button>} />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
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

            <div className="md:col-span-2">
              <FieldLabel>Repetir</FieldLabel>
              {unlimited ? (
                <div className="flex flex-wrap gap-2">
                  <Segment active={editor.repeat === 'none'} label="No se repite" onClick={() => setEditor({ ...editor, repeat: 'none' })} />
                  <Segment active={editor.repeat === 'weekly'} label="Cada semana" onClick={() => setEditor({ ...editor, repeat: 'weekly' })} />
                  <Segment active={editor.repeat === 'monthly'} label="Cada mes" onClick={() => setEditor({ ...editor, repeat: 'monthly' })} />
                </div>
              ) : (
                <p className="text-sm text-[var(--ax-muted)]">Repetir actividades es parte del plan Pro.</p>
              )}
              {unlimited && editor.repeat !== 'none' && (
                <label className="mt-3 block">
                  <FieldLabel>Repetir hasta</FieldLabel>
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

            <div className="flex justify-end gap-3 md:col-span-2">
              <Button variant="primary" disabled={saving} onClick={() => void saveEditor()}>{saving ? 'Guardando…' : 'Guardar actividad'}</Button>
            </div>
          </div>
        </Card>
      )}

      {showConnections && (
        <Card>
          <CardHeader id="conexiones" title="Conexiones" />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {['Google Calendar', 'Outlook'].map((name) => (
              <div key={name} className="flex flex-col gap-3 rounded-[14px] border border-[var(--ax-line)] p-5">
                <p className="font-display text-[28px] uppercase leading-none text-[var(--ax-accent-text)]">{name}</p>
                <p className="text-sm text-[var(--ax-muted)]">{unlimited ? 'Próximamente' : 'Disponible en Pro'}</p>
                <Button variant="secondary" disabled>Conectar</Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}

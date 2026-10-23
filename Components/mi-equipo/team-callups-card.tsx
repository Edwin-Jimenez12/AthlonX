'use client'

import { AlertTriangle, CalendarDays, ChevronRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTeamTournaments } from '../team-callups-panel'
import { Badge, BadgeTone, Card, CardHeader, EmptyState, Notice, SkeletonRows } from './ui'

type CallupRow = { fixture_id: string; division_id: string; status: string; deadline_at: string | null }

const statusLabels: Record<string, string> = { pending: 'Pendiente', editing: 'En edición', submitted: 'Enviada', locked: 'Bloqueada', reopened: 'Reabierta' }
const statusTones: Record<string, BadgeTone> = { Pendiente: 'warning', 'En edición': 'neutral', Enviada: 'success', Bloqueada: 'danger', Reabierta: 'warning' }
const MAX_DATES = 3

export type Jornada = {
  key: string
  href: string
  tournamentName: string
  dateNumber: number
  calendarDate: string | null
  deadline: Date | null
  divisions: Array<{ id: string; name: string; status: string }>
}

// Mismo criterio que TournamentCallupsPanel: una lista vencida pasa a Bloqueada salvo que se haya reabierto.
function statusOf(callup: CallupRow | undefined, deadline: Date | null) {
  const expired = deadline ? deadline.getTime() <= Date.now() : false
  if (!callup) return expired ? 'Bloqueada' : 'Pendiente'
  if (callup.status !== 'reopened' && callup.status !== 'locked' && callup.deadline_at && new Date(callup.deadline_at).getTime() <= Date.now()) return 'Bloqueada'
  return statusLabels[callup.status] || callup.status
}

function actionLabel(statuses: string[]) {
  if (statuses.every((status) => status === 'Bloqueada')) return 'Ver convocatoria'
  if (statuses.every((status) => status === 'Enviada' || status === 'Bloqueada')) return 'Revisar convocatoria'
  if (statuses.some((status) => status === 'En edición' || status === 'Reabierta')) return 'Continuar convocatoria'
  return 'Preparar convocatoria'
}

const shortDay = (date: Date) => new Intl.DateTimeFormat('es-PA', { weekday: 'short' }).format(date).replace('.', '')
const shortMonth = (date: Date) => new Intl.DateTimeFormat('es-PA', { month: 'short' }).format(date).replace('.', '')
const time = (date: Date) => new Intl.DateTimeFormat('es-PA', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)

export function formatDeadline(date: Date) {
  return `${shortDay(date)} ${date.getDate()} ${shortMonth(date)} · ${time(date)}`
}

export function TeamCallupsCard({ teamId, teamName }: { teamId: string; teamName: string }) {
  const { tournaments, loading, error } = useTeamTournaments(teamId, teamName)
  const [callups, setCallups] = useState<CallupRow[]>([])
  const [rules, setRules] = useState<Record<string, number>>({})
  const [fixtureDeadlines, setFixtureDeadlines] = useState<Record<string, string | null>>({})
  const [extraError, setExtraError] = useState('')
  const tournamentIds = tournaments.map((tournament) => tournament.id).join(',')

  useEffect(() => {
    if (!supabase || !tournamentIds) return
    let active = true
    const ids = tournamentIds.split(',')
    void Promise.all([
      supabase.from('tournament_fixture_callups').select('fixture_id, division_id, status, deadline_at').eq('team_id', teamId).in('tournament_id', ids),
      supabase.from('tournament_callup_rules').select('tournament_id, lock_hours_before').in('tournament_id', ids),
      supabase.from('fixtures').select('id, callup_deadline_at').in('tournament_id', ids),
    ]).then(([callupResult, ruleResult, fixtureResult]) => {
      if (!active) return
      setCallups((callupResult.data ?? []) as CallupRow[])
      setRules(Object.fromEntries(((ruleResult.data ?? []) as Array<{ tournament_id: string; lock_hours_before: number }>).map((rule) => [rule.tournament_id, rule.lock_hours_before])))
      setFixtureDeadlines(Object.fromEntries(((fixtureResult.data ?? []) as Array<{ id: string; callup_deadline_at: string | null }>).map((fixture) => [fixture.id, fixture.callup_deadline_at])))
      setExtraError(callupResult.error?.message || '')
    })
    return () => { active = false }
  }, [teamId, tournamentIds])

  const jornadas = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const list: Jornada[] = []
    for (const tournament of tournaments) {
      const lockHours = rules[tournament.id] ?? 24
      const teamMatches = tournament.matches.filter((match) => match.local_team_id === teamId || match.visitor_team_id === teamId)
      const fixtureIds = [...new Set(teamMatches.map((match) => match.fixture_id))]
      for (const fixtureId of fixtureIds) {
        const own = teamMatches.filter((match) => match.fixture_id === fixtureId)
        const first = own[0]
        const calendarDate = first.calendar_date
        if (calendarDate && new Date(`${calendarDate}T12:00:00`) < today) continue
        const times = tournament.matches.filter((match) => match.fixture_id === fixtureId).map((match) => match.scheduled_time).filter((value): value is string => Boolean(value)).sort()
        const fixtureCallups = callups.filter((callup) => callup.fixture_id === fixtureId)
        const explicit = fixtureCallups.find((callup) => callup.deadline_at)?.deadline_at || fixtureDeadlines[fixtureId]
        const base = calendarDate || tournament.start_date
        const deadline = explicit ? new Date(explicit) : base ? new Date(new Date(`${base}T${(times[0] || '23:59:59').slice(0, 8)}`).getTime() - lockHours * 3600000) : null
        const divisionNames = [...new Set(own.map((match) => match.division_name).filter((name): name is string => Boolean(name)))]
        const divisions = divisionNames.map((name) => {
          const division = tournament.divisions.find((item) => item.name === name)
          return { id: division?.id || name, name, status: statusOf(fixtureCallups.find((callup) => callup.division_id === division?.id), deadline && !Number.isNaN(deadline.getTime()) ? deadline : null) }
        })
        list.push({ key: `${tournament.id}-${fixtureId}`, href: `/equipo/convocatoria?torneo=${tournament.id}&partido=${first.id}`, tournamentName: tournament.name, dateNumber: first.date_number, calendarDate, deadline: deadline && !Number.isNaN(deadline.getTime()) ? deadline : null, divisions })
      }
    }
    return list.sort((a, b) => (a.calendarDate || '9999').localeCompare(b.calendarDate || '9999') || a.dateNumber - b.dateNumber).slice(0, MAX_DATES)
  }, [tournaments, callups, rules, fixtureDeadlines, teamId])

  return <Card labelledBy="convocatorias-titulo" className="space-y-4">
    <CardHeader id="convocatorias-titulo" title="Convocatorias" subtitle={loading ? 'Cargando…' : jornadas.length ? `${jornadas.length} ${jornadas.length === 1 ? 'próxima fecha' : 'próximas fechas'}` : 'Sin fechas próximas'} />
    {loading ? <SkeletonRows count={2} />
      : error ? <Notice tone="danger" icon={AlertTriangle}>{error}</Notice>
      : jornadas.length ? <div className="space-y-3">{jornadas.map((jornada) => <JornadaCard key={jornada.key} jornada={jornada} />)}</div>
      : <EmptyState icon={CalendarDays} title="No hay convocatorias pendientes" description="Cuando el equipo tenga fechas programadas en un torneo, aquí podrás preparar la lista de cada jornada." />}
    {extraError && <Notice tone="warning" icon={AlertTriangle}>{extraError}</Notice>}
  </Card>
}

export function JornadaCard({ jornada }: { jornada: Jornada }) {
  const date = jornada.calendarDate ? new Date(`${jornada.calendarDate}T12:00:00`) : null
  const statuses = jornada.divisions.map((division) => division.status)
  const sent = statuses.filter((status) => status === 'Enviada').length
  const closed = jornada.deadline ? jornada.deadline.getTime() <= Date.now() : false
  return <article className="rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-sunken)] p-4">
    <div className="flex items-start gap-3.5">
      <div className="flex w-[52px] shrink-0 flex-col items-center rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface)] py-2">
        {date ? <>
          <span className="text-[11px] font-bold uppercase tracking-[.06em] text-[var(--ax-muted)]">{shortDay(date)}</span>
          <span className="font-display text-[28px] leading-[30px] text-[var(--ax-text)]">{date.getDate()}</span>
          <span className="text-[11px] font-bold uppercase tracking-[.06em] text-[var(--ax-muted)]">{shortMonth(date)}</span>
        </> : <span className="py-3 text-[11px] font-bold uppercase text-[var(--ax-muted)]">Por definir</span>}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[15px] font-semibold text-[var(--ax-text)]">Fecha {jornada.dateNumber}</p>
        <p className="truncate text-[13px] text-[var(--ax-muted)]">{jornada.tournamentName}</p>
        {jornada.deadline && <p className="flex items-center gap-1.5 text-[13px] text-[var(--ax-muted)]"><Clock size={13} aria-hidden="true" />{closed ? 'Cerró' : 'Cierra'} {formatDeadline(jornada.deadline)}</p>}
      </div>
    </div>
    {jornada.divisions.length > 0 && <ul className="mt-3.5 space-y-2 border-t border-[var(--ax-line)] pt-3">
      {jornada.divisions.map((division) => <li key={division.id} className="flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-medium text-[var(--ax-text-secondary)]">{division.name}</span>
        <Badge tone={statusTones[division.status] || 'neutral'}>{division.status}</Badge>
      </li>)}
    </ul>}
    <div className="mt-3.5 flex items-center justify-between gap-3">
      <span className="text-xs text-[var(--ax-muted)]">{sent} de {jornada.divisions.length} enviadas</span>
      <Link href={jornada.href} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--ax-accent-text)] hover:underline">
        {actionLabel(statuses)}<ChevronRight size={16} aria-hidden="true" />
      </Link>
    </div>
  </article>
}

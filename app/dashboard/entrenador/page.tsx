'use client'

import {
  ArrowUpRight,
  CalendarDays,
  Search,
  Shield,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadManagedTeams, ManagedTeam } from '../../../lib/team-access'
import { supabase } from '../../../lib/supabase'
import { TeamDivisionSettings } from '../../../Components/team-division-settings'
import { TeamCallupsPanel } from '../../../Components/team-callups-panel'

export default function TrainerDashboard() {
  const [teams, setTeams] = useState<ManagedTeam[]>([])
  const [activeTeamId, setActiveTeamId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTrainerTeams() {
      if (!supabase) return setLoading(false)
      const { data } = await supabase.auth.getUser()
      if (!data.user) return setLoading(false)

      const managedTeams = await loadManagedTeams(data.user.id)
      const requestedTeamId = new URLSearchParams(window.location.search).get('teamId')
      const storedTeamId = window.localStorage.getItem('athlonx-active-team-id')
      const selectedTeamId = [requestedTeamId, storedTeamId, managedTeams[0]?.id].find(
        (id) => id && managedTeams.some((team) => team.id === id),
      ) || ''

      setTeams(managedTeams)
      setActiveTeamId(selectedTeamId)
      if (selectedTeamId) window.localStorage.setItem('athlonx-active-team-id', selectedTeamId)
      setLoading(false)
    }

    void loadTrainerTeams()
    const syncTeam = (event: Event) => setActiveTeamId((event as CustomEvent<string>).detail)
    window.addEventListener('athlonx-team-change', syncTeam)
    return () => window.removeEventListener('athlonx-team-change', syncTeam)
  }, [])

  const team = teams.find((item) => item.id === activeTeamId)

  return (
    <main className="min-h-screen bg-[#07131e] text-white lg:ml-64">
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
        <div className="flex flex-col justify-between gap-6 border-b border-[#1f4057] pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.24em] text-[#b4ff45]">Área técnica</p>
            <h2 className="mt-3 font-display text-5xl uppercase leading-none sm:text-6xl">Panel del entrenador</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
              Organiza el trabajo deportivo y acompaña el rendimiento de tu equipo.
            </p>
          </div>
          <Link
            href="/dashboard/busqueda"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#31556b] px-5 py-3 font-semibold text-slate-200 transition hover:border-[#b4ff45] hover:text-[#b4ff45]"
          >
            <Search size={18} />
            Buscar perfiles
          </Link>
        </div>

        {loading ? <LoadingState /> : team ? <TrainerWorkspace team={team} /> : <NoTeamState />}
      </section>
    </main>
  )
}

function TrainerWorkspace({ team }: { team: ManagedTeam }) {
  const initials = team.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'EQ'

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#b4ff45] font-display text-3xl text-[#07131e]">
              {initials}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-slate-400">Equipo activo</p>
              <h3 className="mt-1 font-display text-4xl uppercase">{team.name}</h3>
              <p className="mt-2 text-slate-400">
                {team.discipline} <span className="mx-2 text-[#b4ff45]">•</span> {team.city || 'Ubicación pendiente'}
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#b4ff45]/30 bg-[#b4ff45]/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#cfff91]">
            <Shield size={15} />
            Entrenador
          </span>
        </div>
      </section>

      <TeamDivisionSettings teamId={team.id} canManageDivisions={false} canManageRoster />

      <TeamCallupsPanel teamId={team.id} teamName={team.name} />

      <section className="rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Actividad del equipo</p>
            <h3 className="mt-2 font-display text-3xl uppercase">Calendario</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Consulta los compromisos y actividades del equipo desde el calendario.</p>
          </div>
          <Link href={`/dashboard/calendario?teamId=${team.id}`} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e]"><CalendarDays size={18} />Abrir calendario<ArrowUpRight size={16} /></Link>
        </div>
      </section>

    </div>
  )
}

type TrainerTournament = {
  id: string
  name: string
  status: string
  start_date: string | null
  end_date: string | null
  divisions: TrainerTournamentDivision[]
}

type TrainerTournamentDivision = {
  id: string
  name: string
  matchdays: TrainerMatchday[]
}

type TrainerMatchday = {
  id: string
  dateNumber: number
  calendarDate: string | null
  scheduledTime: string | null
  opponentName: string
  status: string
  deadlineAt: string | null
}

type TrainerCallup = { match_id: string; status: string; deadline_at: string }

function formatTrainerDate(calendarDate: string | null, dateNumber: number) {
  return calendarDate
    ? new Intl.DateTimeFormat('es-PA', { day: 'numeric', month: 'short' }).format(new Date(`${calendarDate}T12:00:00`))
    : `Fecha ${dateNumber}`
}

function trainerCallupStatus(callup: TrainerCallup | undefined, deadlineAt: string | null) {
  if (!callup) return 'Pendiente'
  if (callup.status !== 'reopened' && callup.status !== 'locked' && deadlineAt && new Date(deadlineAt).getTime() <= Date.now()) return 'Bloqueada'
  return { pending: 'Pendiente', editing: 'En edición', submitted: 'Enviada', locked: 'Bloqueada', reopened: 'Reabierta' }[callup.status] || callup.status
}

function TrainerCallupsAccess({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [tournaments, setTournaments] = useState<TrainerTournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTournaments() {
      if (!supabase) {
        setLoading(false)
        return
      }

      const { data: links } = await supabase
        .from('tournament_teams')
        .select('tournament_id, division_id, tournament_divisions(name)')
        .eq('team_id', teamId)

      const tournamentIds = Array.from(new Set((links ?? []).map((link) => link.tournament_id)))
      if (!tournamentIds.length) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('tournaments')
        .select('id, name, status, start_date, end_date')
        .in('id', tournamentIds)
        .neq('status', 'finished')
        .order('start_date', { ascending: true })

      const activeTournaments = (data ?? []) as Array<Omit<TrainerTournament, 'divisions'>>
      const activeTournamentIds = activeTournaments.map((tournament) => tournament.id)
      const { data: fixtures } = activeTournamentIds.length
        ? await supabase.from('fixtures').select('id, tournament_id, date_number, calendar_date').in('tournament_id', activeTournamentIds).order('date_number')
        : { data: [] }
      const fixtureIds = (fixtures ?? []).map((fixture) => fixture.id)
      const { data: matches } = fixtureIds.length
        ? await supabase.from('matches').select('id, fixture_id, division_id, scheduled_time, local_team_id, visitor_team_id, local_team:teams!matches_local_team_id_fkey(name), visitor:teams!matches_visitor_team_id_fkey(name)').in('fixture_id', fixtureIds)
        : { data: [] }
      const { data: callups } = activeTournamentIds.length
        ? await supabase.from('tournament_callups').select('match_id, status, deadline_at').eq('team_id', teamId).in('tournament_id', activeTournamentIds)
        : { data: [] }
      const fixtureById = new Map((fixtures ?? []).map((fixture) => [fixture.id, fixture]))
      const callupByMatchId = new Map(((callups ?? []) as TrainerCallup[]).map((callup) => [callup.match_id, callup]))
      const tournamentById = new Map(activeTournaments.map((tournament) => [tournament.id, { ...tournament, divisions: [] as TrainerTournamentDivision[] }]))

      for (const link of (links ?? []) as Array<{ tournament_id: string; division_id: string; tournament_divisions: { name: string } | Array<{ name: string }> | null }>) {
        const tournament = tournamentById.get(link.tournament_id)
        if (!tournament) continue
        const linkedDivision = Array.isArray(link.tournament_divisions) ? link.tournament_divisions[0] : link.tournament_divisions
        const divisionMatches = (matches ?? []).filter((match) => {
          const fixture = fixtureById.get(match.fixture_id)
          return fixture?.tournament_id === link.tournament_id && match.division_id === link.division_id && (match.local_team_id === teamId || match.visitor_team_id === teamId)
        })
        const matchdays = divisionMatches
          .map((match) => {
            const fixture = fixtureById.get(match.fixture_id)
            const opponent = match.local_team_id === teamId ? match.visitor : match.local
            const callup = callupByMatchId.get(match.id)
            return {
              id: match.id,
              dateNumber: fixture?.date_number ?? 0,
              calendarDate: fixture?.calendar_date ?? null,
              scheduledTime: match.scheduled_time,
              opponentName: opponent?.name || 'Rival pendiente',
              status: trainerCallupStatus(callup, callup?.deadline_at || null),
              deadlineAt: callup?.deadline_at || null,
            }
          })
          .sort((a, b) => a.dateNumber - b.dateNumber || (a.calendarDate || '').localeCompare(b.calendarDate || ''))
        const division = tournament.divisions.find((item) => item.id === link.division_id)
        if (division) division.matchdays = matchdays
        else tournament.divisions.push({ id: link.division_id, name: linkedDivision?.name || 'División', matchdays })
      }

      setTournaments(Array.from(tournamentById.values()))
      setLoading(false)
    }

    void loadTournaments()
  }, [teamId])

  return (
    <section className="rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Competencias del equipo</p>
          <h3 className="mt-2 font-display text-3xl uppercase">Convocatorias</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Selecciona un torneo para preparar la lista de jugadores de cada jornada.
          </p>
        </div>
        <Users className="text-[#b4ff45]" size={25} />
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-slate-400">Cargando competencias...</p>
      ) : tournaments.length ? (
        <div className="mt-5 space-y-5">
          {tournaments.map((tournament) => (
            <article key={tournament.id} className="rounded-2xl border border-[#31556b] bg-[#07131e] p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center">
                <div>
                  <h4 className="font-bold text-white">{tournament.name}</h4>
                  <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">{tournament.status} · {teamName}</p>
                </div>
                <Link href={`/dashboard/torneos/ver/${tournament.id}?tab=convocatorias`} className="inline-flex items-center gap-2 text-sm font-bold text-[#b4ff45] hover:text-white">
                  Ver competencia <ArrowUpRight size={16} />
                </Link>
              </div>
              <div className="mt-4 space-y-4">
                {tournament.divisions.map((division) => (
                  <div key={division.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-[#dfffba]">{division.name}</p>
                      <span className="text-xs text-slate-500">{division.matchdays.length} {division.matchdays.length === 1 ? 'jornada' : 'jornadas'}</span>
                    </div>
                    {division.matchdays.length ? <div className="mt-2 grid gap-2 lg:grid-cols-2">{division.matchdays.map((matchday) => (
                      <Link key={matchday.id} href={`/dashboard/torneos/ver/${tournament.id}?tab=convocatorias&matchId=${matchday.id}&teamId=${teamId}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#29485d] p-3 transition hover:border-[#b4ff45]">
                        <span className="min-w-0">
                          <span className="block font-semibold text-white">Jornada {matchday.dateNumber} · {formatTrainerDate(matchday.calendarDate, matchday.dateNumber)}</span>
                          <span className="mt-1 block truncate text-xs text-slate-400">Rival: {matchday.opponentName}{matchday.scheduledTime ? ` · ${matchday.scheduledTime.slice(0, 5)}` : ''}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${matchday.status === 'Bloqueada' ? 'bg-red-400/10 text-red-200' : matchday.status === 'Enviada' ? 'bg-[#b4ff45]/10 text-[#dfffba]' : 'bg-white/5 text-slate-300'}`}>{matchday.status}</span>
                          <ArrowUpRight className="text-[#b4ff45]" size={16} />
                        </span>
                      </Link>
                    ))}</div> : <p className="mt-2 rounded-xl border border-dashed border-[#31556b] p-3 text-xs text-slate-500">El organizador todavía no genera partidos para esta división.</p>}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-[#31556b] p-4 text-sm text-slate-400">
          No hay torneos activos asociados a este equipo.
        </p>
      )}
    </section>
  )
}

function LoadingState() {
  return <div className="mt-8 rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-10 text-center text-slate-400">Cargando equipos asignados...</div>
}

function NoTeamState() {
  return (
    <div className="mt-8 rounded-3xl border border-dashed border-[#31556b] bg-[#0b1d2c] p-8 text-center sm:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#b4ff45]/10 text-[#b4ff45]"><Users size={28} /></div>
      <h3 className="mt-5 font-display text-3xl uppercase">Aún no tienes equipos asignados</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">Cuando un directivo te invite como entrenador, el equipo aparecerá aquí y podrás empezar a gestionarlo.</p>
      <Link href="/dashboard/busqueda" className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e]">Buscar equipos <ArrowUpRight size={17} /></Link>
    </div>
  )
}

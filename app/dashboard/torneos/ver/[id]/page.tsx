'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Building2, CalendarDays, Clock3, MapPin, Trophy, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../../lib/supabase'

type Discipline = { id: string; code: string; name: string }
type OrganizationSummary = { id: string; name: string; athlonx_code: string | null; handle: string | null }
type TeamSummary = { id: string; name: string; athlonx_code: string | null; handle: string | null }
type Tournament = { id: string; name: string; slug: string; season: string | null; status: string; start_date: string | null; end_date: string | null; location: string | null; country: string | null; cover_url: string | null; athlonx_code: string | null; discipline: Discipline | null; organization: OrganizationSummary | null; organizer_team: TeamSummary | null }
type Division = { id: string; name: string; sort_order: number }
type TournamentTeam = { id: string; name: string; logo_url: string | null; city: string | null; division_id: string; division_name: string; athlonx_code: string | null; handle: string | null }
type Match = { id: string; fixture_id: string; date_number: number; calendar_date: string | null; division_name: string | null; scheduled_time: string | null; status: string; local_team_id: string; local_team_name: string; local_logo_url: string | null; visitor_team_id: string; visitor_team_name: string; visitor_logo_url: string | null; local_score: number; visitor_score: number }
type TournamentPayload = { tournament: Tournament | null; divisions: Division[]; teams: TournamentTeam[]; matches: Match[] }

const statusNames: Record<string, string> = { published: 'Publicado', in_progress: 'En curso', finished: 'Finalizado' }

export default function PublicTournamentPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<TournamentPayload | null>(null)
  const [section, setSection] = useState<'resumen' | 'equipos' | 'partidos'>('resumen')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadTournament() {
      if (!supabase || !params.id) {
        setError('No se pudo identificar el torneo.')
        setLoading(false)
        return
      }
      const { data: response, error: tournamentError } = await supabase.rpc('get_public_tournament_profile', { p_tournament_id: params.id })
      if (tournamentError) {
        setError(tournamentError.message)
        setLoading(false)
        return
      }
      const payload = response as TournamentPayload
      setData(payload)
      if (!payload.tournament) setError('Este torneo no está disponible.')
      setLoading(false)
    }
    void loadTournament()
  }, [params.id])

  if (loading) return <TournamentShell><p className="text-slate-400">Cargando torneo...</p></TournamentShell>
  if (error || !data?.tournament) return <TournamentShell><div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-red-200">{error || 'Este torneo no está disponible.'}</div></TournamentShell>

  const tournament = data.tournament
  const teams = data.teams ?? []
  const matches = data.matches ?? []
  const dates = Array.from(new Set(matches.map((match) => match.date_number)))
  const dateRange = formatDateRange(tournament.start_date, tournament.end_date)

  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10"><div className="mx-auto max-w-6xl space-y-6">
    <button type="button" onClick={() => router.back()} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-[#b4ff45]"><ArrowLeft size={18} />Volver</button>

    <section className="overflow-hidden rounded-3xl border border-[#29485d] bg-[#0b1d2c]"><div className="grid gap-0 lg:grid-cols-[.8fr_1.2fr]"><div className="flex min-h-64 items-center justify-center bg-[#102a3d] p-6">{tournament.cover_url ? <img src={tournament.cover_url} alt={`Portada de ${tournament.name}`} className="max-h-72 w-full rounded-2xl object-contain" /> : <Trophy className="text-[#b4ff45]" size={92} />}</div><div className="p-6 sm:p-8"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#b4ff45] px-3 py-1 text-xs font-bold uppercase text-[#07131e]">{statusNames[tournament.status] || tournament.status}</span>{tournament.discipline && <span className="rounded-full border border-[#b4ff45]/40 px-3 py-1 text-xs font-semibold text-[#dcffb6]">{tournament.discipline.name}</span>}</div><p className="mt-5 text-xs font-bold uppercase tracking-[.24em] text-[#b4ff45]">Información pública del torneo</p><h1 className="mt-2 font-display text-4xl uppercase sm:text-5xl">{tournament.name}</h1><p className="mt-3 text-lg text-slate-400">Temporada {tournament.season || 'pendiente'}</p><div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-300"><span className="inline-flex items-center gap-2"><CalendarDays size={17} className="text-[#b4ff45]" />{dateRange}</span>{tournament.location && <span className="inline-flex items-center gap-2"><MapPin size={17} className="text-[#b4ff45]" />{tournament.location}</span>}</div><p className="mt-5 font-mono text-xs text-[#b4ff45]">{tournament.athlonx_code || 'Código pendiente'}</p></div></div></section>

    <div className="grid gap-6 sm:grid-cols-3"><StatCard title="Equipos" value={String(teams.length)} icon={<Users size={20} />} /><StatCard title="Divisiones" value={String(data.divisions?.length ?? 0)} icon={<Trophy size={20} />} /><StatCard title="Partidos" value={String(matches.length)} icon={<CalendarDays size={20} />} /></div>

    <section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-8"><nav className="flex flex-wrap gap-2 border-b border-white/10 pb-5">{([['resumen', 'Resumen'], ['equipos', 'Equipos'], ['partidos', 'Partidos']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setSection(value)} className={`cursor-pointer rounded-full px-4 py-2 text-sm font-bold transition ${section === value ? 'bg-[#b4ff45] text-[#07131e]' : 'border border-[#29485d] text-slate-300 hover:border-[#b4ff45] hover:text-white'}`}>{label}</button>)}</nav>{section === 'resumen' && <Summary tournament={tournament} divisions={data.divisions ?? []} teams={teams} matches={matches} />}{section === 'equipos' && <TeamsSection teams={teams} />}{section === 'partidos' && <MatchesSection matches={matches} dates={dates} />}</section>
  </div></main>
}

function Summary({ tournament, divisions, teams, matches }: { tournament: Tournament; divisions: Division[]; teams: TournamentTeam[]; matches: Match[] }) {
  return <div className="grid gap-6 pt-6 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Organización responsable</p>{tournament.organization ? <Link href={`/dashboard/organizaciones/${tournament.organization.id}`} className="mt-3 block rounded-2xl border border-[#29485d] bg-[#07131e] p-5 transition hover:border-[#b4ff45]/60"><p className="font-heading text-xl font-bold">{tournament.organization.name}</p><p className="mt-2 font-mono text-xs text-[#b4ff45]">{tournament.organization.athlonx_code || 'Código pendiente'}</p></Link> : <p className="mt-3 rounded-2xl border border-[#29485d] bg-[#07131e] p-5 text-sm text-slate-400">Torneo independiente.</p>}{tournament.organizer_team && <><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Equipo organizador</p><Link href={`/dashboard/equipos/${tournament.organizer_team.id}`} className="mt-3 block rounded-2xl border border-[#29485d] bg-[#07131e] p-5 transition hover:border-[#b4ff45]/60"><p className="font-bold">{tournament.organizer_team.name}</p><p className="mt-2 font-mono text-xs text-[#b4ff45]">{tournament.organizer_team.athlonx_code || 'Código pendiente'}</p></Link></>}</div><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Configuración deportiva</p><div className="mt-3 space-y-3"><InfoRow label="Disciplina" value={tournament.discipline?.name || 'No especificada'} /><InfoRow label="Divisiones" value={divisions.map((division) => division.name).join(' · ') || 'Sin divisiones'} /><InfoRow label="Próximos encuentros" value={`${matches.filter((match) => match.status !== 'finished').length} partidos`} /><InfoRow label="Equipos inscritos" value={`${teams.length} equipos`} /></div></div></div>
}

function TeamsSection({ teams }: { teams: TournamentTeam[] }) {
  return <div className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-3">{teams.length ? teams.map((team) => <Link key={`${team.id}-${team.division_id}`} href={`/dashboard/equipos/${team.id}`} className="rounded-2xl border border-[#29485d] bg-[#07131e] p-5 transition hover:border-[#b4ff45]/60"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#b4ff45]/15 font-bold text-[#b4ff45]">{team.logo_url ? <img src={team.logo_url} alt="" className="h-full w-full object-cover" /> : team.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate font-bold">{team.name}</p><p className="mt-1 text-xs text-slate-400">{team.division_name}</p></div></div><p className="mt-4 font-mono text-xs text-slate-500">{team.athlonx_code || 'Código pendiente'}</p></Link>) : <p className="pt-6 text-sm text-slate-500">Todavía no hay equipos inscritos.</p>}</div>
}

function MatchesSection({ matches, dates }: { matches: Match[]; dates: number[] }) {
  return <div className="space-y-6 pt-6">{matches.length ? dates.map((date) => <div key={date}><div className="flex items-center gap-2 border-b border-white/10 pb-3"><CalendarDays className="text-[#b4ff45]" size={18} /><h3 className="font-heading text-xl uppercase">Fecha {date}</h3></div><div className="mt-3 grid gap-3 lg:grid-cols-2">{matches.filter((match) => match.date_number === date).map((match) => <article key={match.id} className="rounded-2xl border border-[#29485d] bg-[#07131e] p-5"><div className="flex items-center justify-between gap-3 text-xs text-slate-500"><span>{match.division_name || 'Sin división'}</span><span className="inline-flex items-center gap-1">{match.scheduled_time ? <><Clock3 size={13} />{match.scheduled_time.slice(0, 5)}</> : 'Horario pendiente'}</span></div><div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center"><TeamMatchName name={match.local_team_name} logo={match.local_logo_url} /><div><p className="font-display text-2xl text-[#b4ff45]">{match.status === 'scheduled' ? 'VS' : `${match.local_score} - ${match.visitor_score}`}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{match.status === 'finished' ? 'Finalizado' : match.status === 'live' ? 'En vivo' : 'Programado'}</p></div><TeamMatchName name={match.visitor_team_name} logo={match.visitor_logo_url} /></div></article>)}</div></div>) : <p className="text-sm text-slate-500">Todavía no hay partidos programados.</p>}</div>
}

function TeamMatchName({ name, logo }: { name: string; logo: string | null }) {
  return <div className="min-w-0"><div className="mx-auto flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-[#b4ff45]/15 font-bold text-[#b4ff45]">{logo ? <img src={logo} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}</div><p className="mt-2 truncate text-sm font-bold">{name || 'Equipo pendiente'}</p></div>
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-[#29485d] bg-[#0b1d2c] p-5"><div className="flex items-center justify-between gap-3 text-[#b4ff45]"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{title}</p>{icon}</div><p className="mt-3 font-display text-4xl">{value}</p></div>
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#29485d] bg-[#07131e] p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">{label}</p><p className="mt-2 font-semibold text-white">{value}</p></div>
}

function TournamentShell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10"><div className="mx-auto max-w-6xl">{children}</div></main>
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return 'Fechas por definir'
  const format = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Por definir'
  return start && end ? `${format(start)} - ${format(end)}` : format(start || end)
}

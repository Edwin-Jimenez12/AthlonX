'use client'

import { ArrowUpRight, Users } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadManagedTeams, ManagedTeam } from '../../../lib/team-access'
import { supabase } from '../../../lib/supabase'
import { PersonaViewSwitcher } from '../../../Components/persona-view-switcher'

type TournamentRow = { id: string; name: string; cover_url: string | null; status: string; start_date: string | null }
type TeamLogo = { id: string; logo_url: string | null }

const statusLabels: Record<string, string> = { in_progress: 'En curso', finished: 'Finalizado' }

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'EQ'
}

export default function TrainerDashboard() {
  const [userName, setUserName] = useState('Entrenador')
  const [coachedTeams, setCoachedTeams] = useState<(ManagedTeam & { logo_url: string | null })[]>([])
  const [tournaments, setTournaments] = useState<TournamentRow[]>([])
  const [athleteCount, setAthleteCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) {
        setError('Supabase no está configurado.')
        setLoading(false)
        return
      }
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) {
        setError('Debes iniciar sesión para ver tu panel de entrenador.')
        setLoading(false)
        return
      }
      const [{ data: profile }, managedTeams] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        loadManagedTeams(user.id),
      ])
      const coached = managedTeams.filter((team) => team.role === 'entrenador')
      const teamIds = coached.map((team) => team.id)

      let logos: TeamLogo[] = []
      let tournamentRows: TournamentRow[] = []
      let athletes: number | null = 0
      if (teamIds.length) {
        const [{ data: logoRows }, { data: links }, { data: players }] = await Promise.all([
          supabase.from('teams').select('id, logo_url').in('id', teamIds),
          supabase.from('tournament_teams').select('tournament_id').in('team_id', teamIds),
          supabase.from('team_players').select('player_id').in('team_id', teamIds),
        ])
        logos = (logoRows ?? []) as TeamLogo[]
        athletes = new Set((players ?? []).map((row) => row.player_id)).size
        const tournamentIds = Array.from(new Set((links ?? []).map((link) => link.tournament_id)))
        if (tournamentIds.length) {
          const { data } = await supabase
            .from('tournaments')
            .select('id, name, cover_url, status, start_date')
            .in('id', tournamentIds)
            .neq('status', 'draft')
            .order('start_date', { ascending: true })
          tournamentRows = (data ?? []) as TournamentRow[]
        }
      } else {
        athletes = null
      }

      if (!active) return
      const logoById = new Map(logos.map((logo) => [logo.id, logo.logo_url]))
      setUserName(profile?.full_name || user.user_metadata?.full_name || 'Entrenador')
      setCoachedTeams(coached.map((team) => ({ ...team, logo_url: logoById.get(team.id) ?? null })))
      setTournaments(tournamentRows)
      setAthleteCount(athletes)
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [])

  const value = (number: number | null) => (loading || number === null ? '—' : String(number))
  const firstName = userName.trim().split(/\s+/)[0]?.toUpperCase() || 'ENTRENADOR'

  return (
    <main className="ax-panel-enter min-h-screen bg-transparent text-white lg:ml-64">
      <section className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-[#1f4057] pb-8">
          <PersonaViewSwitcher active="entrenador" />
          <div>
            <p className="text-sm font-bold uppercase tracking-[.24em] text-[#b4ff45]">Mi vista · Entrenador</p>
            <h1 className="mt-3 font-display text-5xl uppercase leading-none sm:text-6xl">Hola, {firstName}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">Tus equipos a cargo, su plantilla y sus convocatorias por torneo y jornada.</p>
          </div>
        </header>

        {error && <p role="alert" className="rounded-2xl border border-[#ff7d88]/40 bg-[#ff7d88]/10 p-4 text-sm text-[#ffb0b7]">{error}</p>}

        <section className="grid grid-cols-3 gap-4">
          {[
            ['Equipos a cargo', value(loading ? null : coachedTeams.length)],
            ['Atletas en plantilla', value(athleteCount)],
            ['Torneos', value(loading ? null : tournaments.length)],
          ].map(([label, figure]) => (
            <article key={label} className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6">
              <p className="font-display text-5xl leading-none">{figure}</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-[.2em] text-slate-400">{label}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div className="space-y-4">
            <h2 className="font-display text-3xl uppercase">Mis equipos</h2>
            {coachedTeams.length ? coachedTeams.map((team) => (
              <article key={team.id} className="space-y-5 rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#b4ff45] font-display text-2xl text-[#07131e]">
                    {team.logo_url ? <img src={team.logo_url} alt="" className="h-full w-full object-cover" /> : initials(team.name)}
                  </div>
                  <div>
                    <h3 className="font-display text-3xl uppercase">{team.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{team.discipline}{team.city ? ` · ${team.city}` : ''}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/entrenador/equipo/${team.id}`} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] transition hover:brightness-110"><Users size={18} />Administrar equipo</Link>
                  <Link href={`/entrenador/equipo/${team.id}?tab=convocatorias`} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#31556b] px-5 py-3 font-semibold text-slate-200 transition hover:border-[#b4ff45] hover:text-[#b4ff45]">Convocatorias</Link>
                </div>
              </article>
            )) : !loading && <p className="rounded-3xl border border-dashed border-[#31556b] p-6 text-sm text-slate-400">Aún no tienes equipos asignados como entrenador.</p>}
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-3xl uppercase">Torneos de mis equipos</h2>
            {tournaments.length ? tournaments.map((tournament) => (
              <article key={tournament.id} className="overflow-hidden rounded-3xl border border-[#29485d] bg-[#0b1d2c]">
                <div className="flex h-28 items-center justify-center bg-[#1b3b50]">
                  {tournament.cover_url ? <img src={tournament.cover_url} alt="" className="h-full w-full object-cover" /> : <span className="font-display text-3xl text-slate-300">{initials(tournament.name)}</span>}
                </div>
                <div className="space-y-3 p-5">
                  <h3 className="font-display text-2xl uppercase">{tournament.name}</h3>
                  {statusLabels[tournament.status] && <span className="inline-flex rounded-full border border-[#b4ff45]/30 bg-[#b4ff45]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#cfff91]">{statusLabels[tournament.status]}</span>}
                  <Link href={`/torneos/ver/${tournament.id}`} className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-[#b4ff45] hover:text-white">Ver evento<ArrowUpRight size={16} /></Link>
                </div>
              </article>
            )) : !loading && <p className="rounded-3xl border border-dashed border-[#31556b] p-6 text-sm text-slate-400">Tus equipos aún no están inscritos en torneos.</p>}
          </div>
        </section>
      </section>
    </main>
  )
}

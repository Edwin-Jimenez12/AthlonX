'use client'

import { AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { loadManagedTeams, ManagedTeam } from '../../../../lib/team-access'
import { supabase } from '../../../../lib/supabase'
import { useTeamTournaments } from '../../../../Components/team-callups-panel'
import { TournamentCallupsPanel } from '../../../../Components/tournament-callups-panel'
import { Notice, SkeletonRows } from '../../../../Components/mi-equipo/ui'

// Convocatoria de una fecha, abierta desde la tarjeta "Convocatorias" de Mi equipo.
// Reutiliza TournamentCallupsPanel hasta que llegue el rediseño de titulares y reservas.
export default function TeamCallupPage() {
  return <Suspense fallback={null}><TeamCallup /></Suspense>
}

function TeamCallup() {
  const params = useSearchParams()
  const tournamentId = params.get('torneo') || ''
  const matchId = params.get('partido') || ''
  const [team, setTeam] = useState<ManagedTeam | null>(null)
  const [loadingTeam, setLoadingTeam] = useState(true)

  useEffect(() => {
    async function loadTeam() {
      if (!supabase) return setLoadingTeam(false)
      const { data } = await supabase.auth.getUser()
      const managedTeams = data.user ? await loadManagedTeams(data.user.id) : []
      const storedTeamId = window.localStorage.getItem('athlonx-active-team-id')
      setTeam(managedTeams.find((item) => item.id === storedTeamId) || managedTeams[0] || null)
      setLoadingTeam(false)
    }
    void loadTeam()
  }, [])

  const { tournaments, loading, error } = useTeamTournaments(team?.id || '', team?.name || '')
  const tournament = tournaments.find((item) => item.id === tournamentId)
  const match = tournament?.matches.find((item) => item.id === matchId)
  const busy = loadingTeam || (Boolean(team) && loading)

  return <main className="min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
    <div className="mx-auto max-w-[1184px] space-y-5 px-4 pb-16 pt-5 sm:space-y-6 sm:px-8 sm:pt-8 lg:px-10">
      {/* El panel heredado queda fuera de .ax-v2 para conservar sus estilos actuales. */}
      <div className="ax-v2 space-y-5 sm:space-y-6">
        <Link href="/equipo" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ax-text-secondary)] hover:text-[var(--ax-text)]"><ArrowLeft size={16} aria-hidden="true" />Mi equipo</Link>
        <header className="space-y-1.5">
          <h1 className="font-display text-[32px] uppercase leading-[34px] tracking-[.02em] text-[var(--ax-text)] sm:text-[38px] sm:leading-[40px] lg:text-[44px] lg:leading-[46px]">Convocatoria{match ? ` · Fecha ${match.date_number}` : ''}</h1>
          {tournament && <p className="text-sm text-[var(--ax-text-secondary)]">{tournament.name}{match?.calendar_date ? ` · ${new Intl.DateTimeFormat('es-PA', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${match.calendar_date}T12:00:00`))}` : ''}</p>}
        </header>
        {busy ? <SkeletonRows count={4} />
          : error ? <Notice tone="danger" icon={AlertTriangle}>{error}</Notice>
          : (!team || !tournament) && <Notice tone="neutral" icon={AlertTriangle}>No encontramos esta convocatoria. Vuelve a Mi equipo y elige la fecha desde la tarjeta Convocatorias.</Notice>}
      </div>
      {!busy && !error && team && tournament && <TournamentCallupsPanel tournamentId={tournament.id} divisions={tournament.divisions} teams={tournament.teams} matches={tournament.matches} rosters={tournament.rosters} isOwner={false} managedTeamId={team.id} initialMatchId={matchId || undefined} initialTeamId={team.id} tournamentStartDate={tournament.start_date} />}
    </div>
  </main>
}

'use client'

import { Shuffle, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BasketballTournamentPanels } from './basketball-tournament-panels'
import { Card, CardHeader, cx } from './mi-equipo/ui'
import { TournamentKnockoutBracket } from './tournament-knockout-bracket'
import { LeagueGenerator, type LeagueSettings, type ScheduleDate } from './torneo/league-generator'

type Division = { id: string; name: string }
type Team = { id: string; name: string; division_id: string; division_name: string; logo_url: string | null }
type FixtureMatch = { id: string; fixture_id: string; date_number: number; calendar_date: string | null; division_id: string | null; division_name: string | null; local_team_id: string; local_team_name: string; visitor_team_id: string; visitor_team_name: string; scheduled_time: string | null; court_number?: number | null; status: string; local_score: number; visitor_score: number }
type MatchEvent = { match_id: string; team_id?: string | null; event_type: string; points: number; is_corrected?: boolean }
type Mode = 'automatic' | 'manual'

// Textos de cada modo según el formato de la disciplina.
function modeCopy(knockout: boolean, basketball: boolean) {
  if (basketball) return {
    automatic: 'Sorteo aleatorio de los 16 equipos en octavos. Puedes ajustar los cruces antes de publicar.',
    manual: 'Ubicas tú a cada equipo en los 8 cruces de octavos.',
  }
  if (knockout) return {
    automatic: 'AthlonX ordena los cruces de octavos y asigna cancha y hora a cada ronda.',
    manual: 'Defines los 8 cruces de octavos con su hora y cancha.',
  }
  return {
    automatic: 'Indicas cuántos partidos se juegan por fecha y AthlonX crea las fechas hasta completar la liga.',
    manual: 'Eliges cada enfrentamiento de una fecha. AthlonX calcula los horarios.',
  }
}

export function TournamentFixtureGenerator({ tournamentId, tournamentName, tournamentStatus, competitionFormat, footballEight = false, discipline, divisions, teams, matches, events = [], stageByFixture, leagueSettings, adjustments, startDate, canManage, onQueueSchedule, onOpenCalendar }: { tournamentId: string; tournamentName: string; tournamentStatus: string; competitionFormat: string; footballEight?: boolean; discipline?: string; divisions: Division[]; teams: Team[]; matches: FixtureMatch[]; events?: MatchEvent[]; stageByFixture: Record<string, string>; leagueSettings: LeagueSettings; adjustments: Record<string, number>; startDate: string | null; canManage: boolean; onQueueSchedule: (dates: ScheduleDate[], settings: LeagueSettings, summary: string) => void; onOpenCalendar?: () => void }) {
  const [mode, setMode] = useState<Mode>('automatic')
  const basketball = discipline === 'baloncesto'
  const knockout = basketball || (footballEight && competitionFormat === 'knockout')
  const copy = modeCopy(knockout, basketball)
  const divisionRows = useMemo(() => {
    const known = new Map(divisions.map((division) => [division.id, division]))
    for (const team of teams) if (!known.has(team.division_id)) known.set(team.division_id, { id: team.division_id, name: team.division_name })
    return Array.from(known.values())
  }, [divisions, teams])
  const teamCount = new Set(teams.map((team) => team.id)).size

  const modePicker = <div role="radiogroup" aria-label="Modo de generación" className="grid gap-3 sm:grid-cols-2">
    {(['automatic', 'manual'] as const).map((value) => {
      const selected = mode === value
      const Icon = value === 'automatic' ? Wand2 : Shuffle
      return <button key={value} type="button" role="radio" aria-checked={selected} onClick={() => setMode(value)} className={cx(
        'flex cursor-pointer items-start gap-3 rounded-[14px] border p-4 text-left transition-[background-color,border-color] duration-150',
        selected ? 'border-[var(--ax-accent-line)] bg-[var(--ax-accent-soft)]' : 'border-[var(--ax-line-strong)] hover:border-[var(--ax-accent-text)] hover:bg-[var(--ax-hover)]',
      )}>
        <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]', selected ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'bg-[var(--ax-surface-raised)] text-[var(--ax-text-secondary)]')}><Icon size={17} aria-hidden="true" /></span>
        <span className="min-w-0">
          <span className={cx('block text-sm font-semibold', selected ? 'text-[var(--ax-accent-text)]' : 'text-[var(--ax-text)]')}>{value === 'automatic' ? (knockout ? 'Sorteo automático' : 'Generación automática') : (knockout ? 'Cruces manuales' : 'Generación manual')}</span>
          <span className="mt-1 block text-[13px] leading-5 text-[var(--ax-muted)]">{copy[value]}</span>
        </span>
      </button>
    })}
  </div>

  // Fútbol 8 y baloncesto 3x3: la llave tiene su propio flujo de generación.
  if (knockout) return <div className="space-y-5">
    <div className="ax-v2"><Card labelledBy="generator-title">
      <CardHeader id="generator-title" size="lg" title="Generar llave" subtitle={`${tournamentName} · ${teamCount} equipo${teamCount === 1 ? '' : 's'} inscrito${teamCount === 1 ? '' : 's'}${tournamentStatus === 'finished' ? ' · torneo finalizado' : ''}`} />
      <div className="mt-5">{modePicker}</div>
    </Card></div>
    <div>
      {basketball
        ? <BasketballTournamentPanels tournamentId={tournamentId} tournamentName={tournamentName} section="llaves" canManage={canManage} drawMode={mode} />
        : <TournamentKnockoutBracket tournamentId={tournamentId} teams={teams} matches={matches} events={events} canManage={canManage} footballEight discipline={discipline} tournamentName={tournamentName} generationMode={mode} />}
    </div>
  </div>

  // Ligas: todos contra todos y liga con fase final.
  return <div className="ax-v2"><LeagueGenerator mode={mode} modePicker={modePicker} divisions={divisionRows} teams={teams} matches={matches} stageByFixture={stageByFixture} settings={leagueSettings} adjustments={adjustments} startDate={startDate} canManage={canManage} onQueue={onQueueSchedule} onOpenCalendar={onOpenCalendar} /></div>
}

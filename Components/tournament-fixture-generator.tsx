'use client'

import { CalendarDays, CircleAlert, Info, Plus, Shuffle, Wand2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BasketballTournamentPanels } from './basketball-tournament-panels'
import { Badge, Button, Card, CardHeader, cx, EmptyState, FieldLabel, inputClass, Notice, Select } from './mi-equipo/ui'
import { TournamentKnockoutBracket } from './tournament-knockout-bracket'

type Division = { id: string; name: string }
type Team = { id: string; name: string; division_id: string; division_name: string; logo_url: string | null }
type AutomaticDivisionConfig = { divisionId: string; matchesPerDate: number; matchesPerTeam?: number; restTeamsPerDate?: number }
type ManualPairing = { divisionId: string; localTeamId: string; visitorTeamId: string }
type FixtureMatch = { id: string; date_number: number; calendar_date: string | null; division_id: string | null; division_name: string | null; local_team_id: string; local_team_name: string; visitor_team_id: string; visitor_team_name: string; scheduled_time: string | null; court_number?: number | null; status: string; local_score: number; visitor_score: number }
type MatchEvent = { match_id: string; team_id?: string | null; event_type: string; points: number; is_corrected?: boolean }
type Mode = 'automatic' | 'manual'

function minimumDatesForDivision(teamCount: number, matchesPerTeam: number) {
  return matchesPerTeam > 0 ? 1 : 0
}

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
    automatic: 'Todos contra todos por división. AthlonX arma las fechas, el orden y los horarios.',
    manual: 'Eliges cada enfrentamiento de una fecha, división por división.',
  }
}

export function TournamentFixtureGenerator({ tournamentId, tournamentName, tournamentStatus, competitionFormat, footballEight = false, discipline, divisions, teams, dates, matches, events = [], canManage, onGenerate, onOpenCalendar }: { tournamentId: string; tournamentName: string; tournamentStatus: string; competitionFormat: string; footballEight?: boolean; discipline?: string; divisions: Division[]; teams: Team[]; dates: number[]; matches: FixtureMatch[]; events?: MatchEvent[]; canManage: boolean; onGenerate: (teamIds: string[], mode: Mode, pairings?: ManualPairing[], divisionConfigs?: AutomaticDivisionConfig[], numberOfDates?: number, firstMatchTime?: string) => void; onOpenCalendar?: () => void }) {
  const [mode, setMode] = useState<Mode>('automatic')
  const [matchesPerDivision, setMatchesPerDivision] = useState<Record<string, string>>({})
  const [numberOfDates, setNumberOfDates] = useState('1')
  const [firstMatchTime, setFirstMatchTime] = useState('08:00')
  const [manualDivisionId, setManualDivisionId] = useState('')
  const [localTeamId, setLocalTeamId] = useState('')
  const [visitorTeamId, setVisitorTeamId] = useState('')
  const [manualPairings, setManualPairings] = useState<ManualPairing[]>([])
  const [error, setError] = useState('')
  const [queued, setQueued] = useState(false)

  const basketball = discipline === 'baloncesto'
  const knockout = basketball || (footballEight && competitionFormat === 'knockout')
  const copy = modeCopy(knockout, basketball)
  const divisionRows = useMemo(() => {
    const known = new Map(divisions.map((division) => [division.id, division]))
    for (const team of teams) if (!known.has(team.division_id)) known.set(team.division_id, { id: team.division_id, name: team.division_name })
    return Array.from(known.values())
  }, [divisions, teams])
  const teamIds = useMemo(() => Array.from(new Set(teams.map((team) => team.id))), [teams])
  const automaticConfigs = divisionRows.map((division) => ({ divisionId: division.id, matchesPerDate: 0, matchesPerTeam: Number(matchesPerDivision[division.id] ?? 0) }))
  const manualTeams = teams.filter((team) => team.division_id === manualDivisionId)
  const configuredDateCount = Number(numberOfDates)
  const teamName = (id: string) => teams.find((team) => team.id === id)?.name || 'Equipo'

  useEffect(() => {
    setManualDivisionId((current) => current || divisionRows[0]?.id || '')
    setMatchesPerDivision((current) => Object.fromEntries(divisionRows.map((division) => {
      const count = teams.filter((team) => team.division_id === division.id).length
      return [division.id, current[division.id] ?? String(Math.max(count - 1, 0))]
    })))
  }, [divisionRows, teams])

  function addManualPairing() {
    if (!manualDivisionId || !localTeamId || !visitorTeamId || localTeamId === visitorTeamId) return
    const busy = manualPairings.some((pairing) => pairing.divisionId === manualDivisionId
      && [pairing.localTeamId, pairing.visitorTeamId].some((id) => id === localTeamId || id === visitorTeamId))
    if (busy) return setError('Un equipo no puede jugar dos veces en la misma fecha.')
    setManualPairings((current) => [...current, { divisionId: manualDivisionId, localTeamId, visitorTeamId }])
    setLocalTeamId('')
    setVisitorTeamId('')
    setError('')
  }

  function generate() {
    setError('')
    if (!canManage) return
    if (mode === 'manual') {
      if (!manualPairings.length) return setError('Agrega al menos un enfrentamiento.')
      onGenerate(teamIds, mode, manualPairings, [], 1, firstMatchTime)
      setManualPairings([])
      setQueued(true)
      return
    }
    if (!teamIds.length) return setError('El torneo todavía no tiene equipos inscritos.')
    if (!Number.isInteger(configuredDateCount) || configuredDateCount < 1) return setError('Indica una cantidad válida de fechas.')
    for (const config of automaticConfigs) {
      const name = divisionRows.find((division) => division.id === config.divisionId)?.name || 'La división'
      const count = teams.filter((team) => team.division_id === config.divisionId).length
      const matchesPerTeam = config.matchesPerTeam || 0
      const maximumMatches = Math.max(count - 1, 0)
      if (!Number.isInteger(matchesPerTeam) || matchesPerTeam < 0 || matchesPerTeam > maximumMatches) return setError(`${name} permite entre 0 y ${maximumMatches} partidos por equipo.`)
      if ((count * matchesPerTeam) % 2 !== 0) return setError(`${name} necesita una cantidad par de participaciones: con ${count} equipos, cada uno debe jugar un número par de partidos.`)
      if (configuredDateCount < minimumDatesForDivision(count, matchesPerTeam)) return setError(`${name} necesita al menos una fecha.`)
    }
    if (!automaticConfigs.some((config) => (config.matchesPerTeam || 0) > 0)) return setError('Configura al menos un partido por equipo.')
    onGenerate(teamIds, mode, [], automaticConfigs, configuredDateCount, firstMatchTime)
    setQueued(true)
  }

  const modePicker = <div role="radiogroup" aria-label="Modo de generación" className="grid gap-3 sm:grid-cols-2">
    {(['automatic', 'manual'] as const).map((value) => {
      const selected = mode === value
      const Icon = value === 'automatic' ? Wand2 : Shuffle
      return <button key={value} type="button" role="radio" aria-checked={selected} onClick={() => { setMode(value); setError(''); setQueued(false) }} className={cx(
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

  const header = <Card labelledBy="generator-title">
    <CardHeader id="generator-title" size="lg" title={knockout ? 'Generar llave' : 'Generar fixture'} subtitle={`${tournamentName} · ${teamIds.length} equipo${teamIds.length === 1 ? '' : 's'} inscrito${teamIds.length === 1 ? '' : 's'}${tournamentStatus === 'finished' ? ' · torneo finalizado' : ''}`} />
    <div className="mt-5">{modePicker}</div>
  </Card>

  // Fútbol 8 y baloncesto 3x3: la llave tiene su propio flujo de generación.
  if (knockout) return <div className="space-y-5">
    <div className="ax-v2">{header}</div>
    <div>
      {basketball
        ? <BasketballTournamentPanels tournamentId={tournamentId} tournamentName={tournamentName} section="llaves" canManage={canManage} drawMode={mode} />
        : <TournamentKnockoutBracket tournamentId={tournamentId} teams={teams} matches={matches} events={events} canManage={canManage} footballEight discipline={discipline} tournamentName={tournamentName} generationMode={mode} />}
    </div>
  </div>

  const automaticInvalid = !automaticConfigs.some((config) => (config.matchesPerTeam || 0) > 0)
  return <div className="ax-v2 space-y-5">
    {header}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      <Card labelledBy="generator-config">
        <CardHeader id="generator-config" title={mode === 'automatic' ? 'Configuración' : 'Enfrentamientos'} subtitle={mode === 'automatic' ? 'Partidos por equipo en cada fecha y horario de inicio.' : 'Una fecha nueva con los cruces que elijas.'} />
        <div className="mt-5 space-y-4">
          {mode === 'automatic' && <div className="grid grid-cols-2 gap-3">
            <label className="block"><FieldLabel>Cantidad de fechas</FieldLabel><input type="number" min="1" inputMode="numeric" value={numberOfDates} onChange={(event) => setNumberOfDates(event.target.value)} className={inputClass} /></label>
            <label className="block"><FieldLabel>Primer partido</FieldLabel><input type="time" value={firstMatchTime} onChange={(event) => setFirstMatchTime(event.target.value)} className={inputClass} /></label>
          </div>}
          {mode === 'automatic' && divisionRows.map((division) => {
            const count = teams.filter((team) => team.division_id === division.id).length
            const maximum = Math.max(count - 1, 0)
            const perTeam = Number(matchesPerDivision[division.id] || 0)
            const total = count * perTeam / 2
            return <div key={division.id} className="rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-sunken)] p-3">
              <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[var(--ax-text)]">{division.name}</p><Badge>{count} equipos</Badge></div>
              <label className="mt-3 block"><FieldLabel>Partidos por equipo en cada fecha (máx. {maximum})</FieldLabel><input type="number" min="0" max={maximum} inputMode="numeric" value={matchesPerDivision[division.id] ?? '0'} onChange={(event) => setMatchesPerDivision((current) => ({ ...current, [division.id]: event.target.value }))} className={inputClass} /></label>
              <p className="mt-2 text-xs text-[var(--ax-muted)]">{Number.isInteger(total) ? `${total} partido${total === 1 ? '' : 's'} por fecha` : 'Cantidad impar: ajusta los partidos por equipo'}</p>
            </div>
          })}
          {mode === 'manual' && <>
            <label className="block"><FieldLabel>Primer partido</FieldLabel><input type="time" value={firstMatchTime} onChange={(event) => setFirstMatchTime(event.target.value)} className={inputClass} /></label>
            <Select label="División" value={manualDivisionId} onChange={(value) => { setManualDivisionId(value); setLocalTeamId(''); setVisitorTeamId('') }} options={divisionRows.map((division) => ({ value: division.id, label: division.name }))} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Local" value={localTeamId} onChange={setLocalTeamId} placeholder="Elegir" options={manualTeams.map((team) => ({ value: team.id, label: team.name }))} />
              <Select label="Visitante" value={visitorTeamId} onChange={setVisitorTeamId} placeholder="Elegir" options={manualTeams.filter((team) => team.id !== localTeamId).map((team) => ({ value: team.id, label: team.name }))} />
            </div>
            <Button icon={Plus} onClick={addManualPairing} disabled={!localTeamId || !visitorTeamId} className="w-full">Agregar enfrentamiento</Button>
            {manualPairings.length > 0 && <ul className="divide-y divide-[var(--ax-line)] rounded-[14px] border border-[var(--ax-line)]">
              {manualPairings.map((pairing, index) => <li key={`${pairing.localTeamId}-${pairing.visitorTeamId}`} className="flex items-center gap-2 px-3 py-2.5 text-sm">
                <span className="w-6 text-xs font-semibold text-[var(--ax-muted)]">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-[var(--ax-text)]">{teamName(pairing.localTeamId)} <span className="px-1 text-[var(--ax-muted)]">vs</span> {teamName(pairing.visitorTeamId)}</span>
                <button type="button" onClick={() => setManualPairings((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Quitar enfrentamiento" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--ax-muted)] hover:bg-[var(--ax-danger-soft)] hover:text-[var(--ax-danger-text)]"><X size={15} /></button>
              </li>)}
            </ul>}
          </>}
          {error && <Notice tone="danger" icon={CircleAlert}>{error}</Notice>}
          {queued && !error && <Notice tone="success" icon={Info}>Quedó en la barra de cambios sin guardar. Confírmalo con tu contraseña para crear las fechas.</Notice>}
          <Button variant="primary" icon={Wand2} onClick={generate} disabled={mode === 'automatic' ? automaticInvalid : !manualPairings.length} className="w-full">{mode === 'automatic' ? 'Generar fixture' : `Crear fecha con ${manualPairings.length} partido${manualPairings.length === 1 ? '' : 's'}`}</Button>
          {dates.length > 0 && <p className="text-xs leading-5 text-[var(--ax-muted)]">Las fechas nuevas se agregan después de la fecha {Math.max(...dates)}. Las que ya existen no cambian.</p>}
        </div>
      </Card>

      <Card labelledBy="generator-calendar">
        <CardHeader id="generator-calendar" title="Calendario actual" subtitle={dates.length ? `${dates.length} fecha${dates.length === 1 ? '' : 's'} · ${matches.length} partidos` : 'Todavía no hay fechas'} actions={onOpenCalendar && matches.length > 0 ? <Button size="sm" icon={CalendarDays} onClick={onOpenCalendar}>Ver fixtures</Button> : undefined} />
        <div className="mt-5 space-y-3">
          {matches.length ? dates.map((date) => <div key={date} className="rounded-[14px] bg-[var(--ax-surface-sunken)] px-4 py-3">
            <p className="text-xs font-semibold text-[var(--ax-muted)]">Fecha {date}</p>
            <ul className="mt-1 divide-y divide-[var(--ax-line)]">
              {matches.filter((match) => match.date_number === date).map((match) => <li key={match.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-12 shrink-0 text-xs tabular-nums text-[var(--ax-muted)]">{match.scheduled_time?.slice(0, 5) || '--:--'}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-[var(--ax-text)]">{match.local_team_name} <span className="px-1 text-[var(--ax-muted)]">vs</span> {match.visitor_team_name}</span>
                <span className="hidden shrink-0 text-xs text-[var(--ax-muted)] sm:block">{match.division_name || 'General'}</span>
              </li>)}
            </ul>
          </div>) : <EmptyState icon={CalendarDays} title="Sin fechas todavía" description={mode === 'automatic' ? 'Configura los partidos por equipo y genera el fixture.' : 'Agrega enfrentamientos para crear la primera fecha.'} />}
        </div>
      </Card>
    </div>
  </div>
}

'use client'

import { CalendarDays, CircleAlert, Coffee, Info, Plus, Trophy, Wand2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge, Button, Card, CardHeader, cx, EmptyState, FieldLabel, inputClass, Notice, Select } from '../mi-equipo/ui'
import { DateField, Switch } from '../mi-perfil/ui'
import { leagueFormats, leaguePool, leagueStandings, orderDate, pairKey, scheduleBlocks, splitIntoDates, type LeagueFormat, type LeaguePairing } from '../../lib/league'
import { RugbyOvertimePanel } from '../rugby-overtime-panel'

// Generador de fixtures para ligas (rugby): todos contra todos y liga con fase final.

type Division = { id: string; name: string }
type Team = { id: string; name: string; division_id: string }
type LeagueMatch = { id: string; fixture_id: string; date_number: number; division_id: string | null; local_team_id: string; visitor_team_id: string; local_score: number; visitor_score: number; status: string; is_paused?: boolean; match_phase?: string; overtime_minutes?: number; overtime_started_at?: string | null }
export type LeagueSettings = { format: LeagueFormat; legs: number; playoffTeams: number; courts: number; halfMinutes: number; halftimeMinutes: number; intervalMinutes: number }
export type ScheduleDate = { calendarDate: string | null; stage: 'league' | 'quarterfinal' | 'semifinal' | 'final'; recesses: { time: string; minutes: number }[]; matches: (LeaguePairing & { time: string; court: number })[] }
type Mode = 'automatic' | 'manual'

// El formato se elige al crear la liga; aquí solo se muestra.
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0">
    <FieldLabel>{label}</FieldLabel>
    <p className="mt-1 flex h-10 items-center rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-sunken)] px-3 text-sm font-semibold text-[var(--ax-text)]">{value}</p>
  </div>
}

function addDays(date: string, days: number) {
  if (!date) return null
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function dateLabel(date: string | null) {
  return date ? new Date(`${date}T00:00:00`).toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Sin día'
}

export function LeagueGenerator({ mode, modePicker, divisions, teams, matches, stageByFixture, settings: initialSettings, adjustments, startDate, canManage, onQueue, onOpenCalendar }: {
  mode: Mode
  modePicker: React.ReactNode
  divisions: Division[]
  teams: Team[]
  matches: LeagueMatch[]
  stageByFixture: Record<string, string>
  settings: LeagueSettings
  adjustments: Record<string, number>
  startDate: string | null
  canManage: boolean
  onQueue: (dates: ScheduleDate[], settings: LeagueSettings, summary: string) => void
  onOpenCalendar?: () => void
}) {
  const [settings, setSettings] = useState<LeagueSettings>(initialSettings)
  const [matchesPerDate, setMatchesPerDate] = useState('')
  const [maxPerTeam, setMaxPerTeam] = useState('2')
  const [allowBackToBack, setAllowBackToBack] = useState(false)
  const [firstDate, setFirstDate] = useState(startDate || '')
  const [daysBetween, setDaysBetween] = useState('7')
  // Con "Personalizado" cada fecha tiene su propio día (por defecto, una por semana).
  const [customDates, setCustomDates] = useState<Record<number, string>>({})
  const custom = daysBetween === 'custom'
  const thisYear = new Date().getFullYear()
  const dateLimits = { min: `${thisYear - 1}-01-01`, max: `${thisYear + 3}-12-31` }
  const [firstTime, setFirstTime] = useState('08:00')
  const [recesses, setRecesses] = useState<{ id: number; afterBlock: string; minutes: string }[]>([])
  const [manualDivisionId, setManualDivisionId] = useState(divisions[0]?.id || '')
  const [localTeamId, setLocalTeamId] = useState('')
  const [visitorTeamId, setVisitorTeamId] = useState('')
  const [manualPairings, setManualPairings] = useState<LeaguePairing[]>([])
  const [finalWinners, setFinalWinners] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [queued, setQueued] = useState('')

  const update = (patch: Partial<LeagueSettings>) => { setSettings((current) => ({ ...current, ...patch })); setQueued('') }
  const teamName = (id: string) => teams.find((team) => team.id === id)?.name || 'Equipo'
  const divisionName = (id: string) => divisions.find((division) => division.id === id)?.name || 'División'
  const leagueMatches = matches.filter((match) => (stageByFixture[match.fixture_id] || 'league') === 'league')
  const divisionTeams = divisions.map((division) => ({ id: division.id, name: division.name, teamIds: teams.filter((team) => team.division_id === division.id).map((team) => team.id) })).filter((division) => division.teamIds.length > 1)
  const existingPairings = leagueMatches.map((match) => ({ divisionId: match.division_id || '', localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }))
  const pool = useMemo(() => leaguePool(divisionTeams, settings.legs, existingPairings), [JSON.stringify(divisionTeams), settings.legs, existingPairings.length])
  const totalLeague = divisionTeams.reduce((total, division) => total + division.teamIds.length * (division.teamIds.length - 1) / 2 * settings.legs, 0)
  const perTeam = divisionTeams.length ? (Math.max(...divisionTeams.map((division) => division.teamIds.length)) - 1) * settings.legs : 0
  const teamCount = divisionTeams.reduce((total, division) => total + division.teamIds.length, 0)
  const cap = Math.max(1, Number(maxPerTeam) || 1)
  const suggested = Math.max(1, Math.min(pool.length || 1, Math.floor(teamCount * cap / 2)))
  const perDate = Number(matchesPerDate) || suggested
  const timing = {
    firstTime,
    halfMinutes: settings.halfMinutes,
    halftimeMinutes: settings.halftimeMinutes,
    intervalMinutes: settings.intervalMinutes,
    courts: settings.courts,
    recesses: recesses.filter((recess) => Number(recess.afterBlock) > 0 && Number(recess.minutes) > 0).map((recess) => ({ afterBlock: Number(recess.afterBlock), minutes: Number(recess.minutes) })),
  }

  // Vista previa: fechas parejas, orden por tandas y horarios.
  const preview = useMemo(() => {
    const groups: LeaguePairing[][] | null = mode === 'automatic' ? splitIntoDates(pool, perDate, cap) : manualPairings.length ? [manualPairings] : []
    if (!groups) return { dates: [] as ScheduleDate[], issue: 'Con ese máximo por equipo no se pueden armar las fechas. Sube el máximo de partidos por equipo.' }
    const dates: ScheduleDate[] = []
    for (const [index, group] of groups.entries()) {
      const blocks = orderDate(group, settings.courts, allowBackToBack)
      const ordered = blocks.flat()
      const times = scheduleBlocks(blocks.map((block) => block.length), timing)
      dates.push({ calendarDate: mode === 'automatic' ? (custom && index > 0 ? customDates[index] || addDays(firstDate, index * 7) : addDays(firstDate, index * (Number(daysBetween) || 7))) : firstDate || null, stage: 'league', recesses: times.recesses, matches: ordered.map((pairing, position) => ({ ...pairing, ...times.slots[position] })) })
    }
    return { dates, issue: '' }
  }, [mode, pool, perDate, cap, manualPairings, settings.courts, allowBackToBack, JSON.stringify(timing), firstDate, daysBetween, custom, JSON.stringify(customDates)])

  function addManual() {
    if (!manualDivisionId || !localTeamId || !visitorTeamId || localTeamId === visitorTeamId) return
    const key = pairKey(localTeamId, visitorTeamId)
    const played = existingPairings.filter((pairing) => pairKey(pairing.localTeamId, pairing.visitorTeamId) === key).length
    const pending = manualPairings.filter((pairing) => pairKey(pairing.localTeamId, pairing.visitorTeamId) === key).length
    if (played + pending >= settings.legs) return setError(`${teamName(localTeamId)} y ${teamName(visitorTeamId)} ya tienen ${settings.legs === 1 ? 'su partido' : `sus ${settings.legs} partidos`} de la liga.`)
    setManualPairings((current) => [...current, { divisionId: manualDivisionId, localTeamId, visitorTeamId }])
    setLocalTeamId('')
    setVisitorTeamId('')
    setError('')
  }

  function queue(dates: ScheduleDate[], summary: string) {
    setError('')
    if (!canManage || !dates.length) return
    if (dates.some((date) => !date.calendarDate)) return setError('Elige el día de la fecha.')
    onQueue(dates, settings, summary)
    setQueued(summary)
    setManualPairings([])
  }

  // Fase final: cuartos (8), semifinales (4 o 2), o final directa (2).
  const playoffDates = matches.filter((match) => ['quarterfinal', 'semifinal', 'final'].includes(stageByFixture[match.fixture_id] || ''))
  const quarters = playoffDates.filter((match) => stageByFixture[match.fixture_id] === 'quarterfinal')
  const semis = playoffDates.filter((match) => stageByFixture[match.fixture_id] === 'semifinal')
  const finals = playoffDates.filter((match) => stageByFixture[match.fixture_id] === 'final')
  const pendingLeague = leagueMatches.filter((match) => match.status !== 'finished').length + pool.length
  const standingsByDivision = divisionTeams.map((division) => ({ ...division, rows: leagueStandings(division.teamIds, leagueMatches.filter((match) => match.division_id === division.id), adjustments) }))
  function playoffSchedule(stage: 'quarterfinal' | 'semifinal' | 'final', pairings: LeaguePairing[]): ScheduleDate[] {
    const blocks = orderDate(pairings, settings.courts, false)
    const ordered = blocks.flat()
    const times = scheduleBlocks(blocks.map((block) => block.length), { ...timing, recesses: [] })
    return [{ calendarDate: firstDate || null, stage, recesses: [], matches: ordered.map((pairing, position) => ({ ...pairing, ...times.slots[position] })) }]
  }
  const winnerOf = (match: LeagueMatch) => match.status !== 'finished' ? '' : match.local_score > match.visitor_score ? match.local_team_id : match.visitor_score > match.local_score ? match.visitor_team_id : finalWinners[match.id] || ''

  // Cuartos: 1.º vs 8.º, 2.º vs 7.º, 3.º vs 6.º, 4.º vs 5.º
  const quarterPairings = standingsByDivision.flatMap((division) => settings.playoffTeams === 8 && division.rows.length >= 8
    ? [
      { divisionId: division.id, localTeamId: division.rows[0].teamId, visitorTeamId: division.rows[7].teamId },
      { divisionId: division.id, localTeamId: division.rows[1].teamId, visitorTeamId: division.rows[6].teamId },
      { divisionId: division.id, localTeamId: division.rows[2].teamId, visitorTeamId: division.rows[5].teamId },
      { divisionId: division.id, localTeamId: division.rows[3].teamId, visitorTeamId: division.rows[4].teamId },
    ]
    : [])

  // Semifinales: 1.º vs 4.º y 2.º vs 3.º (desde tabla si 4 equipos, desde cuartos si 8)
  const semiPairings = settings.playoffTeams === 8
    ? standingsByDivision.flatMap((division) => {
      const divisionQuarters = quarters.filter((match) => match.division_id === division.id)
      if (divisionQuarters.length < 4) return []
      const winners = [
        winnerOf(divisionQuarters[0]), // 1.º vs 8.º
        winnerOf(divisionQuarters[1]), // 2.º vs 7.º
        winnerOf(divisionQuarters[2]), // 3.º vs 6.º
        winnerOf(divisionQuarters[3]), // 4.º vs 5.º
      ]
      return winners.every(Boolean) ? [
        { divisionId: division.id, localTeamId: winners[0], visitorTeamId: winners[3] },
        { divisionId: division.id, localTeamId: winners[1], visitorTeamId: winners[2] },
      ] : []
    })
    : standingsByDivision.flatMap((division) => settings.playoffTeams === 4 && division.rows.length >= 4
      ? [{ divisionId: division.id, localTeamId: division.rows[0].teamId, visitorTeamId: division.rows[3].teamId }, { divisionId: division.id, localTeamId: division.rows[1].teamId, visitorTeamId: division.rows[2].teamId }]
      : [])

  // Final: ganadores de semifinal o 1.º vs 2.º
  const finalPairings = settings.playoffTeams === 2
    ? standingsByDivision.filter((division) => division.rows.length >= 2).map((division) => ({ divisionId: division.id, localTeamId: division.rows[0].teamId, visitorTeamId: division.rows[1].teamId }))
    : divisionTeams.flatMap((division) => {
      const divisionSemis = semis.filter((match) => match.division_id === division.id)
      const winners = divisionSemis.map(winnerOf)
      return divisionSemis.length === 2 && winners.every(Boolean) ? [{ divisionId: division.id, localTeamId: winners[0], visitorTeamId: winners[1] }] : []
    })
  const tiedSemis = semis.filter((match) => match.status === 'finished' && match.local_score === match.visitor_score)

  const numberField = (label: string, value: number, onChange: (value: number) => void, min: number, max: number) => <label className="block min-w-0"><FieldLabel>{label}</FieldLabel><input type="number" inputMode="numeric" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className={inputClass} /></label>
  const blockLabel = settings.courts > 1 ? 'de la tanda' : 'del partido'
  const totalPreviewMatches = preview.dates.reduce((total, date) => total + date.matches.length, 0)

  return <div className="space-y-5">
    <Card labelledBy="league-format">
      <CardHeader id="league-format" title="Formato de juego" subtitle={`${teamCount} equipos · cada equipo juega ${perTeam} partido${perTeam === 1 ? '' : 's'} de liga · ${totalLeague} partidos en total, ${pool.length} por programar`} />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <ReadOnlyField label="Formato" value={leagueFormats[settings.format]} />
        <ReadOnlyField label="Vueltas" value={settings.legs === 1 ? '1 vuelta' : `${settings.legs} vueltas`} />
        {settings.format === 'league_playoffs' && <ReadOnlyField label="Fase final" value={({ 8: 'Cuartos, semis y final (8)', 4: 'Semifinales y final (4)', 2: 'Final directa (2)' } as Record<number, string>)[settings.playoffTeams] ?? String(settings.playoffTeams)} />}
      </div>
      <div className="mt-5">{modePicker}</div>
    </Card>

    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <Card labelledBy="league-config">
        <CardHeader id="league-config" title={mode === 'automatic' ? 'Partidos y horarios' : 'Enfrentamientos'} subtitle={`${mode === 'automatic' ? 'Las fechas se crean solas hasta completar la liga.' : 'Una fecha con los partidos que elijas.'} ${settings.courts} cancha${settings.courts === 1 ? '' : 's'}, según la configuración del torneo.`} />
        <div className="mt-5 space-y-4">
          {mode === 'automatic' && <div className="grid grid-cols-2 gap-3">
            <label className="block"><FieldLabel>Partidos por fecha</FieldLabel><input type="number" min="1" inputMode="numeric" value={matchesPerDate} placeholder={String(suggested)} onChange={(event) => setMatchesPerDate(event.target.value)} className={inputClass} /></label>
            <Select label="Máximo por equipo en una fecha" value={maxPerTeam} onChange={setMaxPerTeam} options={['1', '2', '3', '4'].map((value) => ({ value, label: `${value} partido${value === '1' ? '' : 's'}` }))} />
          </div>}
          {mode === 'manual' && <>
            <Select label="División" value={manualDivisionId} onChange={(value) => { setManualDivisionId(value); setLocalTeamId(''); setVisitorTeamId('') }} options={divisions.map((division) => ({ value: division.id, label: division.name }))} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Local" value={localTeamId} onChange={setLocalTeamId} placeholder="Elegir" options={teams.filter((team) => team.division_id === manualDivisionId).map((team) => ({ value: team.id, label: team.name }))} />
              <Select label="Visitante" value={visitorTeamId} onChange={setVisitorTeamId} placeholder="Elegir" options={teams.filter((team) => team.division_id === manualDivisionId && team.id !== localTeamId).map((team) => ({ value: team.id, label: team.name }))} />
            </div>
            <Button icon={Plus} onClick={addManual} disabled={!localTeamId || !visitorTeamId} className="w-full">Agregar enfrentamiento</Button>
            {manualPairings.length > 0 && <ul className="divide-y divide-[var(--ax-line)] rounded-[14px] border border-[var(--ax-line)]">
              {manualPairings.map((pairing, index) => <li key={`${pairing.localTeamId}-${pairing.visitorTeamId}-${index}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium text-[var(--ax-text)]">{teamName(pairing.localTeamId)} <span className="px-1 text-[var(--ax-muted)]">vs</span> {teamName(pairing.visitorTeamId)}</span>
                <button type="button" onClick={() => setManualPairings((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Quitar enfrentamiento" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--ax-muted)] hover:bg-[var(--ax-danger-soft)] hover:text-[var(--ax-danger-text)]"><X size={15} /></button>
              </li>)}
            </ul>}
          </>}

          <div className="flex items-start justify-between gap-3 rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-sunken)] p-3">
            <div className="min-w-0"><p className="text-sm font-semibold text-[var(--ax-text)]">Permitir partidos seguidos</p><p className="mt-0.5 text-xs leading-[18px] text-[var(--ax-muted)]">{allowBackToBack ? 'Un equipo puede jugar dos partidos uno tras otro.' : `Cada equipo descansa al menos un partido entre los suyos.${settings.courts > 1 ? ' Si hace falta, una cancha queda libre en esa tanda.' : ''}`}</p></div>
            <Switch label="Permitir partidos seguidos" checked={allowBackToBack} onChange={setAllowBackToBack} />
          </div>


          <div className="grid grid-cols-2 gap-3">
            <div className={mode === 'automatic' ? 'col-span-2' : ''}><DateField label={mode === 'automatic' ? 'Día de la primera fecha' : 'Día de la fecha'} value={firstDate} onChange={setFirstDate} min={dateLimits.min} max={dateLimits.max} /></div>
            {mode === 'automatic' && <div className="col-span-2">
              <Select label="¿Cada cuánto se juega una fecha?" value={daysBetween} onChange={setDaysBetween} options={[{ value: '7', label: 'Cada semana' }, { value: '14', label: 'Cada 2 semanas' }, { value: '1', label: 'Todos los días (días seguidos)' }, { value: 'custom', label: 'Personalizado (eliges cada día)' }]} />
              {custom && preview.dates.length > 1 && <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {preview.dates.slice(1).map((date, offset) => <DateField key={offset + 1} label={`Día de la fecha ${offset + 2}`} value={date.calendarDate || ''} onChange={(value) => setCustomDates((current) => ({ ...current, [offset + 1]: value }))} min={firstDate || dateLimits.min} max={dateLimits.max} />)}
              </div>}
              {custom && preview.dates.some((date, index) => index > 0 && (date.calendarDate || '') <= (preview.dates[index - 1].calendarDate || '')) && <p className="mt-2 text-xs font-medium text-[var(--ax-warning-text)]">Hay fechas en el mismo día o antes de la anterior. Revisa el orden.</p>}
              {!custom && firstDate && preview.dates.length > 1 && <p className="mt-1.5 text-xs text-[var(--ax-muted)]">{preview.dates.slice(0, 3).map((date, index) => `Fecha ${index + 1}: ${dateLabel(date.calendarDate)}`).join(' · ')}{preview.dates.length > 3 ? ' …' : ''}</p>}
            </div>}
            <label className="block"><FieldLabel>Primer partido</FieldLabel><input type="time" value={firstTime} onChange={(event) => setFirstTime(event.target.value)} className={cx(inputClass, 'cursor-pointer')} /></label>
            {numberField('Minutos por tiempo', settings.halfMinutes, (value) => update({ halfMinutes: value }), 1, 60)}
            {numberField('Medio tiempo (min)', settings.halftimeMinutes, (value) => update({ halftimeMinutes: value }), 0, 30)}
            {numberField('Intervalo entre partidos', settings.intervalMinutes, (value) => update({ intervalMinutes: value }), 0, 120)}
          </div>

          <div className="space-y-2">
            {recesses.map((recess) => <div key={recess.id} className="grid grid-cols-[minmax(0,1fr)_96px_36px] items-end gap-2">
              <label className="block"><FieldLabel>Receso después {blockLabel}</FieldLabel><input type="number" min="1" inputMode="numeric" value={recess.afterBlock} onChange={(event) => setRecesses((current) => current.map((item) => item.id === recess.id ? { ...item, afterBlock: event.target.value } : item))} className={inputClass} /></label>
              <label className="block"><FieldLabel>Minutos</FieldLabel><input type="number" min="1" inputMode="numeric" value={recess.minutes} onChange={(event) => setRecesses((current) => current.map((item) => item.id === recess.id ? { ...item, minutes: event.target.value } : item))} className={inputClass} /></label>
              <button type="button" onClick={() => setRecesses((current) => current.filter((item) => item.id !== recess.id))} aria-label="Quitar receso" className="flex h-10 w-9 cursor-pointer items-center justify-center rounded-[10px] text-[var(--ax-muted)] hover:bg-[var(--ax-danger-soft)] hover:text-[var(--ax-danger-text)]"><X size={15} /></button>
            </div>)}
            <Button size="sm" variant="ghost" icon={Coffee} onClick={() => setRecesses((current) => [...current, { id: Date.now(), afterBlock: '3', minutes: '60' }])}>Agregar receso</Button>
            {recesses.length > 0 && <p className="text-xs leading-[18px] text-[var(--ax-muted)]">Después de un receso el siguiente partido empieza al terminar el receso, sin sumar el intervalo.</p>}
          </div>

          {teamCount < 2 && <Notice tone="warning" icon={CircleAlert}>El torneo todavía no tiene equipos suficientes. Inscribe al menos 2 equipos en una división (pestaña Equipos y plantillas) para generar el fixture.</Notice>}
          {teamCount >= 2 && mode === 'automatic' && !pool.length && <Notice icon={Info}>Todos los partidos de la liga ya tienen fecha. No hay nada nuevo que generar.</Notice>}
          {(error || preview.issue) && <Notice tone="danger" icon={CircleAlert}>{error || preview.issue}</Notice>}
          {queued && !error && <Notice tone="success" icon={Info}>{queued}. Quedó en la barra de cambios sin guardar: confírmalo con tu contraseña.</Notice>}
          <Button variant="primary" icon={Wand2} disabled={!preview.dates.length || Boolean(preview.issue)} onClick={() => queue(preview.dates, `${preview.dates.length} fecha${preview.dates.length === 1 ? '' : 's'} con ${totalPreviewMatches} partidos`)} className="w-full">
            {mode === 'automatic' ? (preview.dates.length ? `Generar ${preview.dates.length} fecha${preview.dates.length === 1 ? '' : 's'}` : 'Nada por generar') : `Crear fecha con ${manualPairings.length} partido${manualPairings.length === 1 ? '' : 's'}`}
          </Button>
        </div>
      </Card>

      <Card labelledBy="league-preview">
        <CardHeader id="league-preview" title="Vista previa" subtitle={preview.dates.length ? `${preview.dates.length} fecha${preview.dates.length === 1 ? '' : 's'} · ${totalPreviewMatches} partidos` : 'Nada por programar'} actions={onOpenCalendar && matches.length > 0 ? <Button size="sm" icon={CalendarDays} onClick={onOpenCalendar}>Ver fixtures</Button> : undefined} />
        <div className="mt-4 space-y-3">
          {preview.dates.length ? preview.dates.map((date, index) => {
            const divisionIds = new Set(date.matches.map((match) => match.divisionId))
            const perTeamCount = new Map<string, number>(teams.filter((team) => divisionIds.has(team.division_id)).map((team) => [team.id, 0]))
            for (const match of date.matches) for (const id of [match.localTeamId, match.visitorTeamId]) perTeamCount.set(id, (perTeamCount.get(id) || 0) + 1)
            const counts = [...perTeamCount.values()]
            return <div key={index} className="rounded-[14px] bg-[var(--ax-surface-sunken)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--ax-text)]">{mode === 'automatic' ? `Fecha ${index + 1}` : 'Nueva fecha'} <span className="font-normal text-[var(--ax-muted)]">· {dateLabel(date.calendarDate)}</span></p>
                <span className="text-xs text-[var(--ax-muted)]">{date.matches.length} partidos · {Math.min(...counts)}–{Math.max(...counts)} por equipo</span>
              </div>
              <ul className="mt-1.5 divide-y divide-[var(--ax-line)]">
                {date.matches.map((match, position) => {
                  const recess = date.recesses.find((item) => item.time > (date.matches[position - 1]?.time || '') && item.time <= match.time && position > 0)
                  return <li key={`${match.localTeamId}-${match.visitorTeamId}-${position}`}>
                    {recess && <p className="flex items-center gap-2 py-2 text-xs font-semibold text-[var(--ax-warning-text)]"><Coffee size={13} aria-hidden="true" />Receso · {recess.time} · {recess.minutes} min</p>}
                    <div className="flex items-center gap-3 py-2 text-sm">
                      <span className="w-11 shrink-0 text-xs tabular-nums text-[var(--ax-muted)]">{match.time}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-[var(--ax-text)]">{teamName(match.localTeamId)} <span className="px-1 text-[var(--ax-muted)]">vs</span> {teamName(match.visitorTeamId)}</span>
                        {divisions.length > 1 && <span className="block truncate text-xs text-[var(--ax-muted)] sm:hidden">{divisionName(match.divisionId)}</span>}
                      </span>
                      {divisions.length > 1 && <span className="hidden max-w-[40%] shrink-0 truncate text-xs text-[var(--ax-muted)] sm:block">{divisionName(match.divisionId)}</span>}
                      {settings.courts > 1 && <Badge>Cancha {match.court}</Badge>}
                    </div>
                    {(() => {
                      // Tanda con canchas sin usar: los equipos que podían jugar están descansando.
                      if (settings.courts < 2 || date.matches[position + 1]?.time === match.time) return null
                      const used = date.matches.filter((item) => item.time === match.time).length
                      if (used >= settings.courts) return null
                      const free = Array.from({ length: settings.courts - used }, (_, index) => used + index + 1)
                      return <p className="flex items-center gap-3 py-1.5 text-xs text-[var(--ax-muted)]"><span className="w-11 shrink-0 tabular-nums">{match.time}</span><span className="min-w-0 flex-1">{free.length === 1 ? `Cancha ${free[0]} libre` : `Canchas ${free.join(' y ')} libres`}{position === date.matches.length - 1 ? ' · no quedan más partidos en la fecha' : ' · los equipos disponibles están descansando'}</span></p>
                    })()}
                  </li>
                })}
              </ul>
            </div>
          }) : <EmptyState icon={CalendarDays} title={pool.length || mode === 'manual' ? 'Sin partidos en la vista previa' : 'La liga ya está programada'} description={mode === 'manual' ? 'Agrega enfrentamientos para ver sus horarios.' : pool.length ? 'Ajusta los partidos por fecha.' : 'Todos los enfrentamientos de la liga ya tienen fecha.'} />}
        </div>
      </Card>
    </div>

    {settings.format === 'league_playoffs' && <Card labelledBy="league-playoffs">
      <CardHeader id="league-playoffs" title="Fase final" subtitle={settings.playoffTeams === 8 ? 'Cuartos: 1.º vs 8.º, 2.º vs 7.º, 3.º vs 6.º, 4.º vs 5.º. Semifinales: ganadores. Final: ganadores de semifinal.' : settings.playoffTeams === 4 ? 'Semifinales: 1.º contra 4.º y 2.º contra 3.º. La final la juegan los ganadores.' : 'Final directa entre el 1.º y el 2.º de la tabla.'} />
      <div className="mt-4 space-y-4">
        {pendingLeague > 0 && <Notice tone="warning" icon={CircleAlert}>Faltan {pendingLeague} partido{pendingLeague === 1 ? '' : 's'} de liga por jugar o programar: la tabla todavía puede cambiar.</Notice>}
        <div className="grid gap-3 md:grid-cols-2">
          {standingsByDivision.map((division) => <div key={division.id} className="rounded-[14px] border border-[var(--ax-line)] p-3">
            <p className="text-sm font-semibold text-[var(--ax-text)]">{division.name}</p>
            <ol className="mt-2 space-y-1">{division.rows.slice(0, settings.playoffTeams).map((row, index) => <li key={row.teamId} className="flex items-center gap-2 text-[13px]"><span className="w-5 font-semibold tabular-nums text-[var(--ax-accent-text)]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-[var(--ax-text)]">{teamName(row.teamId)}</span><span className="tabular-nums text-[var(--ax-muted)]">{row.points} pts</span></li>)}</ol>
          </div>)}
        </div>
        {tiedSemis.map((match) => {
          const localTeam = match.local_team_id ? { id: match.local_team_id, name: teamName(match.local_team_id) } : null
          const visitorTeam = match.visitor_team_id ? { id: match.visitor_team_id, name: teamName(match.visitor_team_id) } : null
          return <RugbyOvertimePanel
            key={match.id}
            match={match}
            localTeam={localTeam}
            visitorTeam={visitorTeam}
            onOvertimeFinished={async () => {
              // Refresh the component to reflect the finished overtime
              // This will be handled by the parent component that renders the league-generator
            }}
          />
        })}
        <div className="flex flex-wrap gap-2">
          {settings.playoffTeams === 8 && !quarters.length && <Button variant="primary" icon={Trophy} disabled={!quarterPairings.length} onClick={() => queue(playoffSchedule('quarterfinal', quarterPairings), 'Cuartos de final')}>Generar cuartos</Button>}
          {settings.playoffTeams === 4 && !semis.length && <Button variant="primary" icon={Trophy} disabled={!semiPairings.length} onClick={() => queue(playoffSchedule('semifinal', semiPairings), 'Semifinales')}>Generar semifinales</Button>}
          {settings.playoffTeams === 8 && !semis.length && quarters.length > 0 && <Button variant="primary" icon={Trophy} disabled={!semiPairings.length} onClick={() => queue(playoffSchedule('semifinal', semiPairings), 'Semifinales')}>Generar semifinales</Button>}
          {!finals.length && (settings.playoffTeams === 2 || semis.length > 0) && <Button variant="primary" icon={Trophy} disabled={!finalPairings.length} onClick={() => queue(playoffSchedule('final', finalPairings), 'Final')}>Generar final</Button>}
          {finals.length > 0 && <Badge tone="success">Final programada</Badge>}
        </div>
        <p className="text-xs text-[var(--ax-muted)]">Usa el día, la hora y los tiempos de "Partidos y horarios", con las canchas del torneo. Los cuartos, semifinales y la final no suman en la tabla.</p>
      </div>
    </Card>}
  </div>
}

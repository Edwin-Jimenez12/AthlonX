'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, CircleAlert, FileDown, FileText, Minus, Plus, SlidersHorizontal, Table2, X } from 'lucide-react'
import { Button, Card, cx, EmptyState, FieldLabel, IconButton, inputClass, Notice } from '../mi-equipo/ui'
import { Switch } from '../mi-perfil/ui'
import { supabase } from '../../lib/supabase'
import {
  compactHtml, downloadBlob, initialsOf, officialHtml, openPrintWindow, shareImage, signed,
  type PrintDivision, type PrintDocument, type PrintOptions, type ResultLetter,
} from '../../lib/standings-print'

// Tabla de posiciones del rediseño (Figma, página "Claude", fila "Tabla de posiciones · rediseño").
// Solo usa tokens --ax-*, así que funciona igual en tema claro y oscuro.

type StandingsTeam = { id: string; name: string; logo_url: string | null; division_id: string; division_name: string }
type StandingsMatch = {
  id: string
  date_number: number
  calendar_date: string | null
  division_id: string | null
  scheduled_time: string | null
  court_number?: number | null
  status: string
  local_team_id: string
  local_team_name: string
  visitor_team_id: string
  visitor_team_name: string
  local_score: number
  visitor_score: number
  stage?: string
}
type StandingsTournament = {
  id: string
  name: string
  season: string | null
  status?: string
  athlonx_code: string | null
  cover_url: string | null
  discipline: { code: string } | null
  modality: { id: string; name: string } | null
  organization: { id: string; name: string } | null
  organizer_team: { name: string } | null
}
type StandingAdjustment = { division_id: string; team_id: string; points_adjustment: number; reason: string }
type AdjustmentHistory = { id: string; division_id: string; team_id: string; points_adjustment: number; reason: string; created_at: string; created_by: string }
type Row = {
  team: StandingsTeam
  played: number
  wins: number
  draws: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  points: number
  adjustment: number
  totalPoints: number
  recent: ResultLetter[]
}
type PdfDesign = 'oficial' | 'compacto' | 'compartir'

const tiebreakNames: Record<string, [string, string]> = {
  points: ['puntos', 'puntos'],
  goal_difference: ['diferencia de puntos', 'diferencia de goles'],
  goals_for: ['puntos a favor', 'goles a favor'],
  wins: ['victorias', 'victorias'],
}

// Ajustes: verde si suman, rojo si restan.
function adjustmentTone(value: number) {
  return value > 0 ? 'text-[var(--ax-accent-text)]' : value < 0 ? 'text-[var(--ax-danger-text)]' : 'text-[var(--ax-muted)]'
}

function shortDate(date: string | null) {
  return date ? new Intl.DateTimeFormat('es-PA', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`)) : ''
}

function ResultPills({ recent, size = 'md' }: { recent: ResultLetter[]; size?: 'sm' | 'md' }) {
  if (!recent.length) return <span className="text-[13px] text-[var(--ax-muted)]">—</span>
  const tones = {
    G: 'bg-[var(--ax-accent-soft)] text-[var(--ax-accent-text)]',
    E: 'bg-[var(--ax-warning-soft)] text-[var(--ax-warning-text)]',
    P: 'bg-[var(--ax-danger-soft)] text-[var(--ax-danger-text)]',
  }
  const labels = { G: 'Ganó', E: 'Empató', P: 'Perdió' }
  return <span className="inline-flex items-center gap-1" aria-label={`Últimos: ${recent.map((letter) => labels[letter]).join(', ')}`}>
    {recent.map((letter, index) => <span key={index} aria-hidden="true" className={cx('flex items-center justify-center font-bold', size === 'sm' ? 'h-4 w-4 rounded text-[9px]' : 'h-[22px] w-[22px] rounded-md text-[10px]', tones[letter])}>{letter}</span>)}
  </span>
}

function TeamCrest({ team, size = 32 }: { team: StandingsTeam; size?: 32 | 28 }) {
  return <span className={cx('flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] font-bold text-[var(--ax-text)]', size === 28 ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-xs')}>
    {team.logo_url ? <img src={team.logo_url} alt="" className="h-full w-full object-cover" /> : initialsOf(team.name)}
  </span>
}

function OptionRow({ selected, label, detail, onSelect, preview }: { selected: boolean; label: string; detail: string; onSelect: () => void; preview?: React.ReactNode }) {
  return <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className={cx(
    'flex w-full cursor-pointer items-center gap-3 rounded-[10px] border px-3.5 py-3 text-left transition-[background-color,border-color] duration-150',
    selected ? 'border-[var(--ax-accent-line)] bg-[var(--ax-accent-soft)]' : 'border-[var(--ax-line)] bg-[var(--ax-surface-raised)] hover:border-[var(--ax-line-strong)]',
  )}>
    {preview}
    <span className="min-w-0 flex-1">
      <span className="block text-[13px] font-semibold text-[var(--ax-text)]">{label}</span>
      <span className="mt-0.5 block text-xs text-[var(--ax-muted)]">{detail}</span>
    </span>
    <span aria-hidden="true" className={cx('h-[18px] w-[18px] shrink-0 rounded-full', selected ? 'border-[5px] border-[var(--ax-accent)]' : 'border-[1.5px] border-[var(--ax-line-strong)]')} />
  </button>
}

// Miniaturas de los tres diseños de PDF (mismas que en Figma). Representan papel e imagen,
// así que usan colores fijos y no los tokens del tema.
const paper = { navy: '#0b1d2c', night: '#061019', lime: '#b4ff45', line: '#d1dbe6', faint: '#e6ebf0', dim: '#33495c', dimmer: '#1f3342' }

function DesignThumb({ design }: { design: PdfDesign }) {
  const bar = (color: string, width: number | string, height = 2, extra?: React.CSSProperties) => ({ display: 'block', width, height, borderRadius: 1, background: color, ...extra })
  if (design === 'compartir') return <span aria-hidden="true" style={{ display: 'block', width: 52, height: 64, borderRadius: 4, padding: 6, background: paper.night }}>
    <span style={bar(paper.lime, 18, 4)} />
    <span style={bar('#ffffff', 30, 5, { marginTop: 3 })} />
    {[0, 1, 2, 3, 4, 5].map((index) => <span key={index} style={bar(index < 4 ? paper.dim : paper.dimmer, 40, 3, { marginTop: 3 })} />)}
  </span>
  return <span aria-hidden="true" style={{ display: 'block', width: 50, height: 70, overflow: 'hidden', borderRadius: 4, background: '#ffffff' }}>
    <span style={bar(paper.navy, '100%', design === 'oficial' ? 14 : 8, { borderRadius: 0 })} />
    <span style={{ display: 'block', padding: '6px 5px 0' }}>
      {design === 'oficial'
        ? [0, 1, 2, 3, 4, 5, 6].map((index) => <span key={index} style={bar(index < 4 ? paper.line : paper.faint, '100%', 2, { marginBottom: 4, boxShadow: index === 0 ? `-3px 0 0 ${paper.lime}` : undefined })} />)
        : [0, 1, 2].map((block) => <span key={block} style={{ display: 'block', marginBottom: 6 }}><span style={bar(paper.navy, 16, 2, { marginBottom: 2 })} />{[0, 1, 2].map((line) => <span key={line} style={bar(paper.line, '100%', 2, { marginBottom: 2 })} />)}</span>)}
    </span>
  </span>
}

export function calculateDivisionRows({ teams, matches, divisionId, adjustments, tiebreakers, points }: { teams: StandingsTeam[]; matches: StandingsMatch[]; divisionId: string; adjustments: StandingAdjustment[]; tiebreakers: string[]; points: { win: number; draw: number; loss: number } }): Row[] {
  const played = matches.filter((match) => match.division_id === divisionId)
    .filter((match) => match.status === 'finished')
    .sort((left, right) => left.date_number - right.date_number || (left.scheduled_time || '').localeCompare(right.scheduled_time || ''))
  return teams.filter((team) => team.division_id === divisionId).map((team) => {
    const adjustment = adjustments.find((item) => item.division_id === divisionId && item.team_id === team.id)?.points_adjustment || 0
    const row: Row = { team, played: 0, wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, points: 0, adjustment, totalPoints: 0, recent: [] }
    for (const match of played) {
      if (match.local_team_id !== team.id && match.visitor_team_id !== team.id) continue
      const local = match.local_team_id === team.id
      const scored = local ? match.local_score : match.visitor_score
      const conceded = local ? match.visitor_score : match.local_score
      row.played += 1
      row.pointsFor += scored
      row.pointsAgainst += conceded
      if (scored > conceded) { row.wins += 1; row.points += points.win; row.recent.push('G') }
      else if (scored === conceded) { row.draws += 1; row.points += points.draw; row.recent.push('E') }
      else { row.losses += 1; row.points += points.loss; row.recent.push('P') }
    }
    row.recent = row.recent.slice(-3)
    row.totalPoints = row.points + row.adjustment
    return row
  }).sort((a, b) => {
    for (const criterion of tiebreakers) {
      if (criterion === 'points' && b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
      if (criterion === 'goal_difference' && b.pointsFor - b.pointsAgainst !== a.pointsFor - a.pointsAgainst) return (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst)
      if (criterion === 'goals_for' && b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor
      if (criterion === 'wins' && b.wins !== a.wins) return b.wins - a.wins
    }
    // Sin diferencias (por ejemplo, antes de la primera fecha) se ordena alfabéticamente.
    return b.totalPoints - a.totalPoints || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst) || b.pointsFor - a.pointsFor || a.team.name.localeCompare(b.team.name, 'es')
  })
}

export function DivisionWinners({ tournament, teams, matches }: { tournament: StandingsTournament; teams: StandingsTeam[]; matches: StandingsMatch[] }) {
  const [adjustments, setAdjustments] = useState<StandingAdjustment[]>([])
  const [tiebreakers, setTiebreakers] = useState<string[]>([])
  const [pointValues, setPointValues] = useState<{ win: number; draw: number; loss: number } | null>(null)

  useEffect(() => {
    if (!supabase || tournament.status !== 'finished') return
    let active = true
    void (async () => {
      const [{ data: settings }, { data: rules }, { data: rows }] = await Promise.all([
        supabase.from('tournament_competition_settings').select('points_for_win, points_for_draw, points_for_loss').eq('tournament_id', tournament.id).maybeSingle(),
        tournament.modality?.id
          ? supabase.from('sport_modality_rules').select('tiebreakers').eq('modality_id', tournament.modality.id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('tournament_standing_adjustments').select('division_id, team_id, points_adjustment, reason').eq('tournament_id', tournament.id),
      ])
      if (!active) return
      if (settings?.points_for_win != null) setPointValues({ win: settings.points_for_win, draw: settings.points_for_draw ?? 0, loss: settings.points_for_loss ?? 0 })
      setTiebreakers(Array.isArray(rules?.tiebreakers) ? rules.tiebreakers : [])
      setAdjustments((rows ?? []) as StandingAdjustment[])
    })()
    return () => { active = false }
  }, [tournament.id, tournament.modality?.id, tournament.status])

  if (tournament.status !== 'finished') return null
  const isFootball = tournament.discipline?.code === 'futbol'
  const points = pointValues ?? (isFootball ? { win: 3, draw: 1, loss: 0 } : { win: 4, draw: 2, loss: 0 })
  const divisions = Array.from(new Map(teams.map((team) => [team.division_id, team.division_name])).entries())
  const winners = divisions.flatMap(([divisionId, divisionName]) => {
    const first = calculateDivisionRows({ teams, matches, divisionId, adjustments, tiebreakers, points })[0]
    return first ? [{ divisionId, divisionName, row: first }] : []
  })
  if (!winners.length) return null

  return <section className="ax-v2 rounded-[20px] border border-[var(--ax-accent-line)] bg-[var(--ax-surface)] p-5 sm:p-6">
    <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-accent-text)]">Torneo finalizado</p>
    <h3 className="mt-1.5 font-display text-2xl uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">Ganadores por división</h3>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {winners.map(({ divisionId, divisionName, row }) => <div key={divisionId} className="rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] p-4">
        <p className="text-[11px] font-bold uppercase tracking-[.1em] text-[var(--ax-muted)]">{divisionName}</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface)] text-sm font-bold text-[var(--ax-text)]">{row.team.logo_url ? <img src={row.team.logo_url} alt="" className="h-full w-full object-cover" /> : row.team.name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--ax-text)]">{row.team.name}</p>
            <p className="mt-0.5 text-xs text-[var(--ax-muted)]">{row.totalPoints} pts · {row.wins} G · {row.draws} E · {row.losses} P</p>
          </div>
        </div>
      </div>)}
    </div>
  </section>
}

export function StandingsSection({ tournament, teams, matches, playoffMatches = [], zoneSize }: { tournament: StandingsTournament; teams: StandingsTeam[]; matches: StandingsMatch[]; playoffMatches?: StandingsMatch[]; zoneSize?: number }) {
  const [selectedDivisionId, setSelectedDivisionId] = useState(teams[0]?.division_id || '')
  const [isOwner, setIsOwner] = useState(false)
  const [adjustments, setAdjustments] = useState<StandingAdjustment[]>([])
  const [adjustmentHistory, setAdjustmentHistory] = useState<AdjustmentHistory[]>([])
  const [tiebreakers, setTiebreakers] = useState<string[]>([])
  const [qualifyingTeams, setQualifyingTeams] = useState(4)
  const [pointValues, setPointValues] = useState<{ win: number; draw: number; loss: number } | null>(null)
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null)
  const [panel, setPanel] = useState<'pdf' | 'adjust' | null>(null)
  const [draftAdjustments, setDraftAdjustments] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'warning'; text: string } | null>(null)
  const [pdfScopeChoice, setPdfScope] = useState<'current' | 'all'>('all')
  const [pdfDesign, setPdfDesign] = useState<PdfDesign>('oficial')
  const [pdfOptions, setPdfOptions] = useState<PrintOptions>({ recent: true, notes: true, zone: true, next: false })
  const [generating, setGenerating] = useState(false)
  const historyRef = useRef<HTMLDivElement>(null)
  const isFootball = tournament.discipline?.code === 'futbol'
  const divisions = Array.from(new Map(teams.map((team) => [team.division_id, team.division_name])).entries())
  const zone = zoneSize ?? (isFootball ? qualifyingTeams : 0)
  const pdfScope = divisions.length > 1 ? pdfScopeChoice : 'current'

  useEffect(() => {
    if (!teams.some((team) => team.division_id === selectedDivisionId)) setSelectedDivisionId(teams[0]?.division_id || '')
  }, [selectedDivisionId, teams])

  useEffect(() => {
    let active = true
    async function loadStandingsData() {
      if (!supabase) return
      const [{ data: owner }, { data: userData }, { data: settings }, { data: rules }, { data: rows }, { data: organization }, { data: history }] = await Promise.all([
        supabase.from('tournaments').select('created_by').eq('id', tournament.id).maybeSingle(),
        supabase.auth.getUser(),
        supabase.from('tournament_competition_settings').select('qualifying_teams_per_group, points_for_win, points_for_draw, points_for_loss').eq('tournament_id', tournament.id).maybeSingle(),
        tournament.modality?.id
          ? supabase.from('sport_modality_rules').select('tiebreakers').eq('modality_id', tournament.modality.id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('tournament_standing_adjustments').select('division_id, team_id, points_adjustment, reason').eq('tournament_id', tournament.id),
        tournament.organization?.id
          ? supabase.from('organizations').select('logo_url').eq('id', tournament.organization.id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('tournament_standing_adjustment_history').select('id, division_id, team_id, points_adjustment, reason, created_at, created_by').eq('tournament_id', tournament.id).order('created_at', { ascending: false }),
      ])
      if (!active) return
      setIsOwner(Boolean(owner?.created_by && owner.created_by === userData.user?.id))
      if (settings?.qualifying_teams_per_group) setQualifyingTeams(settings.qualifying_teams_per_group)
      if (settings?.points_for_win != null) setPointValues({ win: settings.points_for_win, draw: settings.points_for_draw ?? 0, loss: settings.points_for_loss ?? 0 })
      setTiebreakers(Array.isArray(rules?.tiebreakers) ? rules.tiebreakers : [])
      setAdjustments((rows ?? []) as StandingAdjustment[])
      setOrganizationLogo((organization as { logo_url?: string | null } | null)?.logo_url || null)
      setAdjustmentHistory((history ?? []) as AdjustmentHistory[])
    }
    void loadStandingsData()
    return () => { active = false }
  }, [matches, tournament.id, tournament.modality?.id, tournament.organization?.id])

  function divisionMatches(divisionId: string) {
    return matches.filter((match) => match.division_id === divisionId)
  }

  function calculateStandings(divisionId: string): Row[] {
    return calculateDivisionRows({ teams, matches, divisionId, adjustments, tiebreakers, points: pointValues ?? (isFootball ? { win: 3, draw: 1, loss: 0 } : { win: 4, draw: 2, loss: 0 }) })
  }

  // Las fechas pueden no empezar en 1 (fixtures borrados o fases nuevas): se cuenta hasta la última.
  const lastScheduledDate = Math.max(0, ...matches.map((match) => match.date_number))

  // Datos de una división para la tabla y para los documentos.
  function divisionSummary(divisionId: string, divisionName: string) {
    const rows = calculateStandings(divisionId)
    const own = divisionMatches(divisionId)
    const finished = own.filter((match) => match.status === 'finished')
    const lastDate = Math.max(0, ...finished.map((match) => match.date_number))
    const started = finished.length > 0
    const cutLabel = !own.length ? 'Sin fixture' : started ? `Fecha ${lastDate} de ${lastScheduledDate}` : 'Antes de la fecha 1'
    const divisionZone = zone > 0 && zone < rows.length ? zone : 0
    const projection: [string, string][] = started && divisionZone === 4 && rows.length >= 4
      ? [[rows[0].team.name, rows[3].team.name], [rows[1].team.name, rows[2].team.name]]
      : started && divisionZone === 2 && rows.length >= 2 ? [[rows[0].team.name, rows[1].team.name]] : []
    const leagueDone = own.length > 0 && own.every((match) => match.status === 'finished')
    const playoffZone = zone > 0 && rows.length >= zone ? zone : 0
    const placeLabels = ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto', 'Sexto', 'Séptimo', 'Octavo']
    const slotName = (index: number, teamName: string) => leagueDone ? teamName : `${placeLabels[index]} lugar`
    const seeds = rows.slice(0, playoffZone).map((row, index) => ({ name: slotName(index, row.team.name), points: leagueDone ? row.totalPoints : null }))
    const scoreOf = (match: StandingsMatch, teamId: string) => match.local_team_id === teamId ? match.local_score : match.visitor_score
    const winnerName = (match: StandingsMatch) => {
      if (match.status !== 'finished' || match.local_score === match.visitor_score) return null
      return match.local_score > match.visitor_score ? match.local_team_name : match.visitor_team_name
    }
    const playoffOf = (stage: string) => playoffMatches.filter((match) => match.division_id === divisionId && match.stage === stage)
    const findPlayoff = (stage: string, idA: string, idB: string) => playoffOf(stage).find((match) =>
      (match.local_team_id === idA && match.visitor_team_id === idB) || (match.local_team_id === idB && match.visitor_team_id === idA))

    // Cuartos (8 equipos): 1.º vs 8.º, 2.º vs 7.º, 3.º vs 6.º, 4.º vs 5.º
    const quarters = playoffZone === 8 && rows.length >= 8
      ? ([[0, 7], [1, 6], [2, 5], [3, 4]] as const).map(([a, b]) => {
        const left = rows[a]
        const right = rows[b]
        const match = findPlayoff('quarterfinal', left.team.id, right.team.id)
        return {
          left: { name: slotName(a, left.team.name), score: match ? scoreOf(match, left.team.id) : null },
          right: { name: slotName(b, right.team.name), score: match ? scoreOf(match, right.team.id) : null },
          finished: Boolean(match && match.status === 'finished'),
          winner: match ? winnerName(match) : null,
        }
      })
      : []

    // Semifinales: si hay cuartos, desde ganadores de cuartos; si no, desde tabla
    const semis = playoffZone === 8 && quarters.length === 4
      ? ([[0, 3], [1, 2]] as const).map(([a, b]) => {
        const quarterWinners = quarters.map((q) => q.winner).filter(Boolean)
        if (quarterWinners.length < 4) return { left: { name: 'Por definir', score: null }, right: { name: 'Por definir', score: null }, finished: false, winner: null }
        const left = quarterWinners[a]
        const right = quarterWinners[b]
        const match = findPlayoff('semifinal', left, right)
        return {
          left: { name: left, score: match ? scoreOf(match, left) : null },
          right: { name: right, score: match ? scoreOf(match, right) : null },
          finished: Boolean(match && match.status === 'finished'),
          winner: match ? winnerName(match) : null,
        }
      })
      : playoffZone === 4 && rows.length >= 4
      ? ([[0, 3], [1, 2]] as const).map(([a, b]) => {
        const left = rows[a]
        const right = rows[b]
        const match = findPlayoff('semifinal', left.team.id, right.team.id)
        return {
          left: { name: slotName(a, left.team.name), score: match ? scoreOf(match, left.team.id) : null },
          right: { name: slotName(b, right.team.name), score: match ? scoreOf(match, right.team.id) : null },
          finished: Boolean(match && match.status === 'finished'),
          winner: match ? winnerName(match) : null,
        }
      })
      : []
    const finalMatch = playoffOf('final')[0]
    const semiWinners = semis.map((semi) => semi.winner)
    const finalTeams: [string, string] | null = playoffZone === 2 && rows.length >= 2
      ? [slotName(0, rows[0].team.name), slotName(1, rows[1].team.name)]
      : semis.length === 2 && semiWinners.every(Boolean) ? [semiWinners[0] as string, semiWinners[1] as string] : null
    const final = {
      left: { name: finalMatch ? finalMatch.local_team_name : finalTeams?.[0] ?? 'Por definir', score: finalMatch ? finalMatch.local_score : null },
      right: { name: finalMatch ? finalMatch.visitor_team_name : finalTeams?.[1] ?? 'Por definir', score: finalMatch ? finalMatch.visitor_score : null },
      finished: Boolean(finalMatch && finalMatch.status === 'finished'),
      winner: finalMatch ? winnerName(finalMatch) : null,
    }
    const champion = final.finished ? final.winner : null
    const nextDate = Math.min(...own.filter((match) => match.status !== 'finished').map((match) => match.date_number))
    const nextMatches = Number.isFinite(nextDate) ? own.filter((match) => match.date_number === nextDate && match.status !== 'finished')
      .sort((left, right) => (left.scheduled_time || '').localeCompare(right.scheduled_time || ''))
      .map((match) => ({ local: match.local_team_name, visitor: match.visitor_team_name, detail: [match.scheduled_time?.slice(0, 5), match.court_number ? `Cancha ${match.court_number}` : ''].filter(Boolean).join(' · ') })) : []
    const nextCalendar = own.find((match) => match.date_number === nextDate)?.calendar_date || null
    const latestAdjustmentByTeam = new Map<string, AdjustmentHistory>()
    for (const adj of adjustmentHistory.filter((h) => h.division_id === divisionId)) {
      if (!latestAdjustmentByTeam.has(adj.team_id) || new Date(adj.created_at) > new Date(latestAdjustmentByTeam.get(adj.team_id)!.created_at)) {
        latestAdjustmentByTeam.set(adj.team_id, adj)
      }
    }
    return {
      id: divisionId,
      name: divisionName || 'División',
      rows,
      started,
      lastDate,
      finished: finished.length,
      total: own.length,
      cutLabel,
      zone: divisionZone,
      zoneLabel: isFootball ? 'Zona de clasificación' : divisionZone === 2 ? 'Clasifican a la final' : 'Clasifican a semifinales',
      projectionTitle: divisionZone === 2 ? 'Camino a la final' : 'Camino a semifinales',
      projection,
      leagueDone,
      playoffZone,
      seeds,
      quarters,
      semis,
      final,
      champion,
      divisionName: divisionName,
      nextDateLabel: Number.isFinite(nextDate) ? `Fecha ${nextDate}${nextCalendar ? ` · ${shortDate(nextCalendar)}` : ''}` : '',
      nextMatches,
      adjustments: rows.filter((row) => row.adjustment).map((row) => {
        const latest = latestAdjustmentByTeam.get(row.team.id)
        return {
          team: row.team.name,
          amount: row.adjustment,
          reason: latest?.reason || adjustments.find((item) => item.division_id === divisionId && item.team_id === row.team.id)?.reason || '',
        }
      }),
    }
  }

  const selectedName = divisions.find(([id]) => id === selectedDivisionId)?.[1] || 'División'
  const current = divisionSummary(selectedDivisionId, selectedName)
  const scoringPoints = pointValues ?? (isFootball ? { win: 3, draw: 1, loss: 0 } : { win: 4, draw: 2, loss: 0 })
  const scoring: [string, string][] = [['Victoria', String(scoringPoints.win)], ['Empate', String(scoringPoints.draw)], ['Derrota', String(scoringPoints.loss)]]
  const tiebreakLabel = (tiebreakers.filter((item) => item !== 'points').map((item) => tiebreakNames[item]?.[isFootball ? 1 : 0]).filter(Boolean).join(', ')
    || (isFootball ? 'diferencia de goles, goles a favor' : 'diferencia de puntos, puntos a favor'))
  const scored = isFootball ? ['GF', 'GC'] : ['PF', 'PC']
  const shownZone = current.started ? current.zone : 0
  const hasAdjustments = current.adjustments.length > 0

  function openPanel(next: 'pdf' | 'adjust') {
    setMessage(null)
    if (next === 'adjust') {
      setDraftAdjustments(Object.fromEntries(current.rows.map((row) => [row.team.id, row.adjustment])))
      setReason('')
      setPassword('')
    }
    setPanel((value) => value === next ? null : next)
  }

  async function saveAdjustments() {
    if (!supabase || !selectedDivisionId) return
    if (!reason.trim()) return setMessage({ tone: 'warning', text: 'Indica el motivo del ajuste.' })
    if (reason.trim().length < 3) return setMessage({ tone: 'warning', text: 'El motivo debe tener al menos 3 caracteres.' })
    if (!password) return setMessage({ tone: 'warning', text: 'Escribe la contraseña de la cuenta organizadora.' })
    setSaving(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user?.email) return setMessage({ tone: 'warning', text: 'No se pudo identificar la cuenta.' })
      const { error: authError } = await supabase.auth.signInWithPassword({ email: userData.user.email, password })
      if (authError) return setMessage({ tone: 'warning', text: 'La contraseña no es correcta.' })
      const { error } = await supabase.rpc('save_tournament_standing_adjustments', {
        p_tournament_id: tournament.id,
        p_division_id: selectedDivisionId,
        p_adjustments: current.rows.map((row) => ({ team_id: row.team.id, points_adjustment: Number(draftAdjustments[row.team.id] || 0) })),
        p_reason: reason.trim(),
      })
      if (error) return setMessage({ tone: 'warning', text: error.message })
      const [{ data: adjustmentsData }, { data: historyData }] = await Promise.all([
        supabase.from('tournament_standing_adjustments').select('division_id, team_id, points_adjustment, reason').eq('tournament_id', tournament.id),
        supabase.from('tournament_standing_adjustment_history').select('id, division_id, team_id, points_adjustment, reason, created_at, created_by').eq('tournament_id', tournament.id).order('created_at', { ascending: false }),
      ])
      setAdjustments((adjustmentsData ?? []) as StandingAdjustment[])
      setAdjustmentHistory((historyData ?? []) as AdjustmentHistory[])
      setPanel(null)
      setPassword('')
      setReason('')
      setMessage({ tone: 'success', text: 'Ajustes guardados y registrados en el historial.' })
    } finally {
      setSaving(false)
    }
  }

  function printDocument(): PrintDocument {
    const scope = pdfScope === 'current' ? divisions.filter(([id]) => id === selectedDivisionId) : divisions
    const organizationName = tournament.organization?.name || tournament.organizer_team?.name || 'Torneo independiente'
    const now = new Date()
    const printDivisions: PrintDivision[] = scope.map(([id, name]) => {
      const summary = divisionSummary(id, name)
      return {
        name: summary.name,
        rows: summary.rows.map((row) => ({
          name: row.team.name, logoUrl: row.team.logo_url, played: row.played, wins: row.wins, draws: row.draws, losses: row.losses,
          pointsFor: row.pointsFor, pointsAgainst: row.pointsAgainst, points: row.totalPoints, adjustment: row.adjustment, recent: row.recent,
        })),
        zone: summary.zone,
        zoneLabel: summary.zoneLabel,
        cutLabel: summary.cutLabel,
        progressLabel: `${summary.finished} de ${summary.total}`,
        started: summary.started,
        adjustments: summary.adjustments,
        projectionTitle: summary.projectionTitle,
        projection: summary.projection,
        nextDateLabel: summary.nextDateLabel,
        nextMatches: summary.nextMatches,
      }
    })
    return {
      tournamentName: tournament.name,
      organizationName,
      subtitle: [tournament.modality?.name, tournament.season ? `Temporada ${tournament.season}` : '', tournament.athlonx_code ? `Código ${tournament.athlonx_code}` : ''].filter(Boolean).join(' · '),
      // Escudo de la liga: logo de la organización; sin logo, el escudo de la UPR que ya usaba el PDF.
      crestUrl: organizationLogo || tournament.cover_url || `${window.location.origin}/upr-escudo.png`,
      monogram: initialsOf(tournament.name),
      isFootball,
      scoring,
      tiebreakLabel,
      updatedLabel: new Intl.DateTimeFormat('es-PA', { day: 'numeric', month: 'short', year: 'numeric' }).format(now),
      printedLabel: `Impreso el ${new Intl.DateTimeFormat('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(now)}`,
      divisions: printDivisions,
      options: pdfOptions,
    }
  }

  async function generate() {
    const doc = printDocument()
    if (!doc.divisions.length) return
    setGenerating(true)
    try {
      if (pdfDesign === 'compartir') {
        for (const division of doc.divisions) {
          const blob = await shareImage(doc, division)
          if (!blob) return setMessage({ tone: 'warning', text: 'No se pudo crear la imagen. Inténtalo de nuevo.' })
          downloadBlob(blob, `${tournament.name} - ${division.name}.png`.replace(/[\\/:*?"<>|]/g, ''))
        }
        setMessage({ tone: 'success', text: doc.divisions.length > 1 ? `Se descargaron ${doc.divisions.length} imágenes.` : 'Imagen descargada.' })
      } else if (!openPrintWindow(pdfDesign === 'oficial' ? officialHtml(doc) : compactHtml(doc))) {
        return setMessage({ tone: 'warning', text: 'Permite las ventanas emergentes para generar el PDF.' })
      }
      setPanel(null)
    } finally {
      setGenerating(false)
    }
  }

  const scopeCount = pdfScope === 'current' ? 1 : divisions.length
  const outputLabel = pdfDesign === 'compartir'
    ? `Se descarga${scopeCount > 1 ? 'n' : ''} ${scopeCount} imagen${scopeCount > 1 ? 'es' : ''} PNG de 1080 × 1350`
    : pdfDesign === 'compacto'
      ? `Se genera 1 documento A4 con ${scopeCount} división${scopeCount > 1 ? 'es' : ''}`
      : `Se genera${scopeCount > 1 ? 'n' : ''} ${scopeCount} hoja${scopeCount > 1 ? 's' : ''} A4${scopeCount > 1 ? ` · ${divisions.map(([, name]) => name).join(', ')}` : ''}`
  const designs: [PdfDesign, string, string][] = [
    ['oficial', 'Oficial', 'A4 vertical · una división por hoja'],
    ['compacto', 'Compacto', 'A4 · todas en una hoja'],
    ['compartir', 'Para compartir', 'Imagen 1080 × 1350 · redes'],
  ]
  const includeOptions: [keyof PrintOptions, string][] = [['recent', 'Últimos resultados'], ['notes', 'Ajustes y notas'], ['zone', 'Zona de clasificación'], ['next', 'Próxima fecha']]

  if (!divisions.length) return <div className="ax-v2"><Card><EmptyState icon={Table2} title="Todavía no hay divisiones" description="La tabla aparece cuando el torneo tenga divisiones con equipos inscritos." /></Card></div>

  return <div className="ax-v2 space-y-5">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap md:pb-0" role="tablist" aria-label="Divisiones">
        {divisions.map(([id, name]) => {
          const active = id === selectedDivisionId
          const count = teams.filter((team) => team.division_id === id).length
          return <button key={id} type="button" role="tab" aria-selected={active} onClick={() => { setSelectedDivisionId(id); if (panel === 'adjust') setPanel(null) }} className={cx(
            'inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-[10px] pl-3.5 pr-2 text-[13px] font-semibold whitespace-nowrap transition-[background-color,border-color,color] duration-150',
            active ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'border border-[var(--ax-line-strong)] text-[var(--ax-text-secondary)] hover:border-[var(--ax-accent-text)] hover:text-[var(--ax-text)]',
          )}>
            {name}
            <span className={cx('rounded-md px-[7px] py-0.5 text-[11px] font-bold tabular-nums', active ? 'bg-[var(--ax-on-accent)] text-[var(--ax-accent)]' : 'bg-[var(--ax-surface-raised)] text-[var(--ax-muted)]')}>{count}</span>
          </button>
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 md:flex">
        <Button size="sm" icon={FileDown} aria-expanded={panel === 'pdf'} onClick={() => openPanel('pdf')} className={cx(panel === 'pdf' && 'border-[var(--ax-accent-text)]')}>Generar PDF</Button>
        {isOwner && <Button size="sm" icon={SlidersHorizontal} aria-expanded={panel === 'adjust'} onClick={() => openPanel('adjust')} className={cx(panel === 'adjust' && 'border-[var(--ax-accent-text)]')}>Ajustar puntos</Button>}
      </div>
    </div>

    {message && <Notice tone={message.tone} icon={message.tone === 'success' ? Check : CircleAlert}>{message.text}</Notice>}

    {panel === 'pdf' && <section aria-labelledby="pdf-panel-title" className="ax-drop-in rounded-[14px] border border-[var(--ax-accent-line)] bg-[var(--ax-surface)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="pdf-panel-title" className="font-display text-2xl uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">Generar PDF de la tabla</h2>
          <p className="mt-1.5 text-[13px] text-[var(--ax-muted)]">El documento lleva el logo de AthlonX y el escudo de tu liga. Elige qué divisiones, el diseño y qué incluir.</p>
        </div>
        <IconButton icon={X} label="Cerrar" size={36} onClick={() => setPanel(null)} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)_240px] lg:gap-6">
        <div role="radiogroup" aria-label="Divisiones">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-muted)]">Divisiones</p>
          <div className="space-y-2">
            <OptionRow selected={pdfScope === 'current'} onSelect={() => setPdfScope('current')} label={`Solo ${selectedName}`} detail="La que estás viendo" />
            {divisions.length > 1 && <OptionRow selected={pdfScope === 'all'} onSelect={() => setPdfScope('all')} label="Todas las divisiones" detail={`${divisions.length} divisiones · ${teams.length} equipos`} />}
          </div>
        </div>
        <div role="radiogroup" aria-label="Diseño">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-muted)]">Diseño</p>
          <div className="hidden gap-2.5 sm:grid sm:grid-cols-3">
            {designs.map(([value, label, detail]) => <button key={value} type="button" role="radio" aria-checked={pdfDesign === value} onClick={() => setPdfDesign(value)} className={cx(
              'flex cursor-pointer flex-col gap-2.5 rounded-[14px] border p-3 text-left transition-[background-color,border-color] duration-150',
              pdfDesign === value ? 'border-[var(--ax-accent-line)] bg-[var(--ax-accent-soft)]' : 'border-[var(--ax-line)] bg-[var(--ax-surface-raised)] hover:border-[var(--ax-line-strong)]',
            )}>
              <span className="flex items-center justify-center rounded-[10px] bg-[var(--ax-surface-sunken)] py-2.5"><DesignThumb design={value} /></span>
              <span className="text-[13px] font-semibold text-[var(--ax-text)]">{label}</span>
              <span className="-mt-1.5 text-xs text-[var(--ax-muted)]">{detail}</span>
            </button>)}
          </div>
          <div className="space-y-2 sm:hidden">
            {designs.map(([value, label, detail]) => <OptionRow key={value} selected={pdfDesign === value} onSelect={() => setPdfDesign(value)} label={label} detail={detail} preview={<span className="flex h-14 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--ax-surface-sunken)]"><span className="block origin-center scale-[.7]"><DesignThumb design={value} /></span></span>} />)}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-muted)]">Incluir</p>
          {includeOptions.map(([key, label]) => <div key={key} className="flex items-center justify-between gap-3 py-2">
            <span className="text-[13px] font-medium text-[var(--ax-text-secondary)]">{label}</span>
            <Switch label={label} checked={pdfOptions[key]} onChange={(value) => setPdfOptions((currentOptions) => ({ ...currentOptions, [key]: value }))} />
          </div>)}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t border-[var(--ax-line)] pt-4 sm:flex-row sm:items-center">
        <p className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-[var(--ax-muted)]"><FileText size={16} aria-hidden="true" className="shrink-0" />{outputLabel}</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>Cancelar</Button>
          <Button size="sm" variant="primary" icon={FileDown} disabled={generating} onClick={() => void generate()}>{generating ? 'Generando…' : pdfDesign === 'compartir' ? 'Descargar imagen' : 'Descargar PDF'}</Button>
        </div>
      </div>
    </section>}

    {panel === 'adjust' && <section aria-labelledby="adjust-panel-title" className="ax-drop-in rounded-[14px] border border-[var(--ax-accent-line)] bg-[var(--ax-surface)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="adjust-panel-title" className="font-display text-2xl uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">Ajustar puntos · {current.name}</h2>
          <p className="mt-1.5 text-[13px] text-[var(--ax-muted)]">Los puntos de los partidos no cambian: el ajuste se suma o resta al total y queda en el historial.</p>
        </div>
        <IconButton icon={X} label="Cerrar" size={36} onClick={() => setPanel(null)} />
      </div>
      <div className="mt-4 divide-y divide-[var(--ax-line)]">
        {current.rows.map((row) => {
          const value = Number(draftAdjustments[row.team.id] ?? row.adjustment)
          const set = (next: number) => setDraftAdjustments((currentDraft) => ({ ...currentDraft, [row.team.id]: next }))
          return <div key={row.team.id} className="flex items-center gap-3 py-2.5">
            <TeamCrest team={row.team} size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--ax-text)]">{row.team.name}</p>
              <p className="text-xs text-[var(--ax-muted)]">{row.points} de partidos · total <b className="font-semibold text-[var(--ax-text)]">{row.points + value}</b></p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <IconButton icon={Minus} label={`Restar un punto a ${row.team.name}`} size={36} onClick={() => set(value - 1)} />
              <input type="number" aria-label={`Ajuste de ${row.team.name}`} value={value} onChange={(event) => set(Number(event.target.value))} className={cx(inputClass.replace('w-full', ''), 'h-9 w-14 shrink-0 px-1 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none', value < 0 && 'text-[var(--ax-danger-text)]', value > 0 && 'text-[var(--ax-accent-text)]')} />
              <IconButton icon={Plus} label={`Sumar un punto a ${row.team.name}`} size={36} onClick={() => set(value + 1)} />
            </div>
          </div>
        })}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block"><FieldLabel>Motivo del ajuste</FieldLabel><textarea autoComplete="off" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ejemplo: alineación indebida en la fecha 2" maxLength={200} rows={3} className={cx(inputClass, 'resize-none')} /></label>
        <label className="block"><FieldLabel>Contraseña de la cuenta</FieldLabel><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className={inputClass} /></label>
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 border-t border-[var(--ax-line)] pt-4 sm:flex-row sm:justify-end">
        <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>Cancelar</Button>
        <Button size="sm" variant="primary" icon={Check} disabled={saving} onClick={() => void saveAdjustments()}>{saving ? 'Guardando…' : 'Guardar ajustes'}</Button>
      </div>
    </section>}

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6">
      <Card labelledBy="standings-title" className="sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[var(--ax-accent-text)]">{current.name}</p>
            <h2 id="standings-title" className="mt-1 font-display text-[26px] uppercase leading-none tracking-[.02em] text-[var(--ax-text)] sm:text-[30px]">Tabla de posiciones</h2>
            <p className="mt-1.5 text-[13px] text-[var(--ax-muted)]">
              {current.total
                ? `${current.started ? `Después de la fecha ${current.lastDate} de ${lastScheduledDate}` : 'Antes de la primera fecha'} · ${current.finished} de ${current.total} partidos jugados`
                : 'Todavía no hay fixture para esta división'}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {scoring.map(([label, value]) => <span key={label} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ax-surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--ax-muted)]">{label}<b className="font-bold text-[var(--ax-text)]">{value}</b></span>)}
          </div>
        </div>

        {current.rows.length ? <>
          {/* Escritorio y tablet */}
          <table className="mt-5 hidden w-full table-fixed border-collapse text-sm md:table">
            <colgroup>
              <col className="w-10" /><col /><col className="w-9" /><col className="w-9" /><col className="w-9" /><col className="w-9" />
              <col className="w-11" /><col className="w-11" /><col className="w-[52px]" />{hasAdjustments && <col className="w-[52px]" />}<col className="w-[60px]" /><col className="w-24" />
            </colgroup>
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-[.04em] text-[var(--ax-muted)]">
                <th scope="col" className="rounded-l-[10px] bg-[var(--ax-surface-sunken)] py-2.5 font-semibold">#</th>
                <th scope="col" className="bg-[var(--ax-surface-sunken)] py-2.5 text-left font-semibold">Equipo</th>
                {['PJ', 'G', 'E', 'P', scored[0], scored[1], 'Dif'].map((label) => <th key={label} scope="col" className="bg-[var(--ax-surface-sunken)] py-2.5 font-semibold">{label}</th>)}
                {hasAdjustments && <th scope="col" title="Ajuste administrativo" className="bg-[var(--ax-surface-sunken)] py-2.5 font-semibold">Ajuste</th>}
                <th scope="col" className="bg-[var(--ax-surface-sunken)] py-2.5 font-semibold text-[var(--ax-accent-text)]">Pts</th>
                <th scope="col" className="rounded-r-[10px] bg-[var(--ax-surface-sunken)] py-2.5 font-semibold">Últimos</th>
              </tr>
            </thead>
            <tbody>
              {current.rows.map((row, index) => {
                const qualified = index < shownZone
                const diff = row.pointsFor - row.pointsAgainst
                return [
                  shownZone > 0 && index === shownZone && <tr key="cut" aria-hidden="true"><td colSpan={hasAdjustments ? 12 : 11} className="py-1.5">
                    <span className="flex items-center gap-2.5"><span className="h-px flex-1 border-t border-dashed border-[var(--ax-accent-line)]" /><span className="text-[11px] font-semibold text-[var(--ax-accent-text)]">{current.zoneLabel}</span></span>
                  </td></tr>,
                  <tr key={row.team.id} className={cx(index > 0 && index !== shownZone && 'border-t border-[var(--ax-line)]')}>
                    <td className="h-14">
                      <span className="flex items-center gap-2.5">
                        <span aria-hidden="true" className={cx('h-6 w-[3px] rounded-sm', qualified && 'bg-[var(--ax-accent)]')} />
                        <span className={cx('text-[13px] font-bold tabular-nums', qualified ? 'text-[var(--ax-accent-text)]' : 'text-[var(--ax-muted)]')}>{index + 1}</span>
                      </span>
                    </td>
                    <td>
                      <span className="flex min-w-0 items-center gap-3">
                        <TeamCrest team={row.team} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-[var(--ax-text)]">{row.team.name}</span>
                        </span>
                      </span>
                    </td>
                    {[row.played, row.wins, row.draws, row.losses].map((value, cell) => <td key={cell} className="text-center tabular-nums text-[var(--ax-text-secondary)]">{value}</td>)}
                    <td className="text-center tabular-nums text-[var(--ax-muted)]">{row.pointsFor}</td>
                    <td className="text-center tabular-nums text-[var(--ax-muted)]">{row.pointsAgainst}</td>
                    <td className={cx('text-center font-semibold tabular-nums', diff > 0 ? 'text-[var(--ax-accent-text)]' : diff < 0 ? 'text-[var(--ax-danger-text)]' : 'text-[var(--ax-muted)]')}>{signed(diff)}</td>
                    {hasAdjustments && <td className={cx('text-center font-semibold tabular-nums', adjustmentTone(row.adjustment))}>{row.adjustment ? signed(row.adjustment) : '—'}</td>}
                    <td className="bg-[var(--ax-accent-soft)] text-center text-base font-bold tabular-nums text-[var(--ax-text)]">{row.totalPoints < 0 ? `−${Math.abs(row.totalPoints)}` : row.totalPoints}</td>
                    <td className="text-center"><ResultPills recent={row.recent} /></td>
                  </tr>,
                ]
              })}
            </tbody>
          </table>

          {/* Móvil */}
          <div className="mt-4 md:hidden">
            <div className="flex items-center rounded-[10px] bg-[var(--ax-surface-sunken)] py-2 text-[11px] font-semibold uppercase tracking-[.04em] text-[var(--ax-muted)]">
              <span className="w-7 text-center">#</span><span className="flex-1">Equipo</span><span className="w-[30px] text-center">PJ</span><span className="w-11 text-center">Dif</span><span className="w-12 text-center text-[var(--ax-accent-text)]">Pts</span>
            </div>
            {current.rows.map((row, index) => {
              const qualified = index < shownZone
              const diff = row.pointsFor - row.pointsAgainst
              return <div key={row.team.id}>
                {shownZone > 0 && index === shownZone && <div aria-hidden="true" className="flex items-center gap-2 py-1.5"><span className="h-px flex-1 border-t border-dashed border-[var(--ax-accent-line)]" /><span className="text-[11px] font-semibold text-[var(--ax-accent-text)]">{current.zoneLabel}</span></div>}
                <div className={cx('flex h-16 items-center', index > 0 && index !== shownZone && 'border-t border-[var(--ax-line)]')}>
                  <span className="flex w-7 items-center gap-[7px]">
                    <span aria-hidden="true" className={cx('h-6 w-[3px] rounded-sm', qualified && 'bg-[var(--ax-accent)]')} />
                    <span className={cx('text-[13px] font-bold tabular-nums', qualified ? 'text-[var(--ax-accent-text)]' : 'text-[var(--ax-muted)]')}>{index + 1}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    <TeamCrest team={row.team} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--ax-text)]">{row.team.name}</span>
                      <span className="mt-1 flex items-center gap-2"><ResultPills recent={row.recent} size="sm" />{row.adjustment !== 0 && <span className={cx('text-[11px] font-medium', adjustmentTone(row.adjustment))}>Ajuste {signed(row.adjustment)}</span>}</span>
                    </span>
                  </span>
                  <span className="w-[30px] text-center text-sm tabular-nums text-[var(--ax-text-secondary)]">{row.played}</span>
                  <span className={cx('w-11 text-center text-[13px] font-semibold tabular-nums', diff > 0 ? 'text-[var(--ax-accent-text)]' : diff < 0 ? 'text-[var(--ax-danger-text)]' : 'text-[var(--ax-muted)]')}>{signed(diff)}</span>
                  <span className="flex h-full w-12 items-center justify-center bg-[var(--ax-accent-soft)] text-base font-bold tabular-nums text-[var(--ax-text)]">{row.totalPoints < 0 ? `−${Math.abs(row.totalPoints)}` : row.totalPoints}{row.adjustment !== 0 && <span className={cx('text-[13px]', adjustmentTone(row.adjustment))}>*</span>}</span>
                </div>
              </div>
            })}
          </div>

          <div className="mt-4 flex flex-col gap-1.5 text-xs text-[var(--ax-muted)] md:flex-row md:flex-wrap md:gap-x-5">
            {shownZone > 0 && <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px] bg-[var(--ax-accent)]" />{current.zoneLabel}</span>}
            {current.adjustments.length > 0 && <span>Pts incluye los ajustes administrativos</span>}
            {!current.started && <span>Sin partidos jugados: orden alfabético</span>}
            <span>Desempate: {tiebreakLabel}</span>
          </div>
        </> : <div className="mt-5"><EmptyState icon={Table2} title="Sin equipos en esta división" description="Cuando se inscriban equipos aparecerán aquí con sus puntos." /></div>}
      </Card>

      <div className="grid content-start gap-5 md:grid-cols-2 xl:grid-cols-1 xl:gap-6">
        <Card labelledBy="adjustments-title" className={cx(current.adjustments.length > 0 && 'cursor-pointer transition-[border-color] hover:border-[var(--ax-accent-text)]')} onClick={() => current.adjustments.length > 0 && historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} role={current.adjustments.length > 0 ? 'button' : undefined} tabIndex={current.adjustments.length > 0 ? 0 : undefined} onKeyDown={(event) => current.adjustments.length > 0 && (event.key === 'Enter' || event.key === ' ') && historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <h2 id="adjustments-title" className="font-display text-[26px] uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">Ajustes de puntos</h2>
          <p className="mt-1.5 text-[13px] text-[var(--ax-muted)]">{current.adjustments.length > 0 ? 'Último ajuste · Presiona para ver el historial completo.' : 'Se suman o restan a la tabla y quedan en el historial.'}</p>
          <div className="mt-4 space-y-2">
            {current.adjustments.length ? current.adjustments.slice(0, 1).map((item) => {
              const team = current.rows.find((row) => row.team.name === item.team)?.team
              return <div key={item.team} className="flex items-center gap-3 rounded-[10px] bg-[var(--ax-surface-raised)] p-3">
                {team && <TeamCrest team={team} />}
                <div className="min-w-0">
                  <p className={cx('truncate text-sm font-semibold', item.amount < 0 ? 'text-[var(--ax-danger-text)]' : 'text-[var(--ax-accent-text)]')}>{item.team} · {signed(item.amount)}</p>
                  {item.reason && <p className="mt-0.5 text-xs text-[var(--ax-muted)]">{item.reason}</p>}
                </div>
              </div>
            }) : <p className="rounded-[10px] bg-[var(--ax-surface-raised)] p-3 text-[13px] text-[var(--ax-muted)]">Sin ajustes en esta división.</p>}
          </div>
        </Card>
      </div>
    </div>

    {current.playoffZone > 0 && <Card labelledBy="bracket-title" className="mt-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-accent-text)]">Fase final · {current.divisionName}</p>
      <h2 id="bracket-title" className="mt-1 font-display text-[26px] uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">Llave de campeonato</h2>
      <p className="mt-1.5 text-[13px] text-[var(--ax-muted)]">{current.leagueDone ? 'Fase de liga terminada · la llave se actualiza con cada resultado.' : 'Se arma con la tabla final de la liga. Los lugares son provisionales hasta terminar la fase.'}</p>
      <div className={cx('mt-5 grid gap-4', current.playoffZone === 8 ? 'lg:grid-cols-5' : current.playoffZone === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-muted)]">Clasificados</p>
          {current.seeds.map((seed, index) => <div key={seed.name} className="flex items-center gap-2 rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3 py-2.5">
            <span className="rounded-[6px] border border-[var(--ax-line)] bg-[var(--ax-surface)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--ax-accent-text)]">{index + 1}.º</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ax-text)]">{seed.name}</span>
            {seed.points !== null && <span className="text-xs font-bold text-[var(--ax-muted)]">{seed.points} pts</span>}
          </div>)}
        </div>
        {current.playoffZone === 8 && <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-muted)]">Cuartos</p>
          {current.quarters.map((quarter, index) => <div key={index} className="rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-3">
            <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-bold uppercase tracking-[.1em] text-[var(--ax-muted)]">Cuarto {index + 1}</span><span className={cx('text-[11px] font-semibold', quarter.finished ? 'text-[var(--ax-accent-text)]' : 'text-amber-300')}>{quarter.finished ? 'Finalizado' : 'Por jugar'}</span></div>
            {[quarter.left, quarter.right].map((team) => <div key={team.name} className={cx('mt-2 flex items-center justify-between gap-2 text-sm font-semibold', quarter.winner === team.name ? 'text-[var(--ax-accent-text)]' : 'text-[var(--ax-text)]')}>
              <span className="truncate">{team.name}</span><span className="tabular-nums">{team.score ?? '—'}</span>
            </div>)}
          </div>)}
        </div>}
        {(current.playoffZone === 4 || current.playoffZone === 8) && <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-muted)]">Semifinales</p>
          {current.semis.map((semi, index) => <div key={index} className="rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-3">
            <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-bold uppercase tracking-[.1em] text-[var(--ax-muted)]">Semifinal {index + 1}</span><span className={cx('text-[11px] font-semibold', semi.finished ? 'text-[var(--ax-accent-text)]' : 'text-amber-300')}>{semi.finished ? 'Finalizada' : 'Por jugar'}</span></div>
            {[semi.left, semi.right].map((team) => <div key={team.name} className={cx('mt-2 flex items-center justify-between gap-2 text-sm font-semibold', semi.winner === team.name ? 'text-[var(--ax-accent-text)]' : 'text-[var(--ax-text)]')}>
              <span className="truncate">{team.name}</span><span className="tabular-nums">{team.score ?? '—'}</span>
            </div>)}
          </div>)}
        </div>}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-muted)]">Final</p>
          <div className="rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-3">
            {[current.final.left, current.final.right].map((team) => <div key={team.name} className={cx('flex items-center justify-between gap-2 text-sm font-semibold', current.final.winner === team.name ? 'text-[var(--ax-accent-text)]' : team.name === 'Por definir' ? 'text-[var(--ax-muted)]' : 'text-[var(--ax-text)]')}>
              <span className="truncate">{team.name}</span><span className="tabular-nums">{team.score ?? '—'}</span>
            </div>)}
            <span className={cx('mt-2 inline-block text-[11px] font-semibold', current.final.finished ? 'text-[var(--ax-accent-text)]' : 'text-amber-300')}>{current.final.finished ? 'Finalizada' : 'Pendiente'}</span>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-muted)]">Campeón</p>
          <div className="rounded-[14px] border border-[var(--ax-accent-line)] bg-[var(--ax-accent)]/10 p-4">
            <p className="font-display text-[26px] uppercase leading-none text-[var(--ax-text)]">{current.champion ?? 'Por definir'}</p>
            <p className="mt-2 text-[12px] text-[var(--ax-muted)]">{current.champion ? 'Ganó la final' : 'Se confirma al jugar la final'}</p>
          </div>
        </div>
      </div>
    </Card>}
    {adjustmentHistory.filter((h) => h.division_id === selectedDivisionId).length > 0 && <div ref={historyRef} className="pt-6">
      <Card labelledBy="history-title">
        <h2 id="history-title" className="font-display text-[26px] uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">Historial de ajustes</h2>
        <p className="mt-1.5 text-[13px] text-[var(--ax-muted)]">Todos los ajustes realizados en esta división, en orden cronológico inverso.</p>
        <div className="mt-4 divide-y divide-[var(--ax-line)]">
          {adjustmentHistory.filter((h) => h.division_id === selectedDivisionId).map((item) => {
            const team = teams.find((t) => t.id === item.team_id)
            return <div key={item.id} className="flex items-start gap-3 py-3">
              {team && <TeamCrest team={team} />}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-[var(--ax-text)]">{team?.name || '?'}</p>
                  <p className={cx('shrink-0 text-sm font-bold tabular-nums', item.points_adjustment < 0 ? 'text-[var(--ax-danger-text)]' : 'text-[var(--ax-accent-text)]')}>{signed(item.points_adjustment)}</p>
                </div>
                {item.reason && <p className="mt-0.5 text-xs text-[var(--ax-muted)]">{item.reason}</p>}
                <p className="mt-0.5 text-[11px] text-[var(--ax-muted)]">{new Intl.DateTimeFormat('es-PA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(item.created_at))}</p>
              </div>
            </div>
          })}
        </div>
      </Card>
    </div>}
  </div>
}

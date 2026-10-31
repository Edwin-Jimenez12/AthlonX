'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Brain,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Cog,
  FileDown,
  HeartPulse,
  Pencil,
  Play,
  Search,
  ShieldCheck,
  Table2,
  Trash2,
  Users,
  Wand2,
  X,
} from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { LocationFields } from '../../../../../Components/location-fields'
import { QuickTournamentTeamsSection } from '../../../../../Components/quick-tournament-teams-section'
import { TournamentTeamsSection } from '../../../../../Components/torneo/teams-section'
import { StyledSelect } from '../../../../../Components/styled-select'
import { TournamentCallupsPanel } from '../../../../../Components/tournament-callups-panel'
import { TournamentFixtureGenerator } from '../../../../../Components/tournament-fixture-generator'
import { TournamentKnockoutBracket } from '../../../../../Components/tournament-knockout-bracket'
import { BasketballTournamentPanels } from '../../../../../Components/basketball-tournament-panels'
import { RugbyOvertimePanel } from '../../../../../Components/rugby-overtime-panel'
import { EarlyFinishNotice, PhaseBar } from '../../../../../Components/match-clock-ui'
import { earlyFinishRemaining, isHalftime as isHalftimeState, matchClockLabel, periodActionLabel, phaseSteps, sportClocks } from '../../../../../lib/match-clock'
import { basketball } from '../../../../../lib/basketball'
import { DateField } from '../../../../../Components/mi-perfil/ui'
import { Badge, Button, buttonClass, Card, initialsOf, CardHeader, cx, EmptyState, FieldLabel, inputClass, Notice, Select } from '../../../../../Components/mi-equipo/ui'
import { footballNextYellowIsRed, footballPlayerCards } from '../../../../../lib/football'
import { rugbyActiveSinBins, rugbySinBinSeconds } from '../../../../../lib/rugby'
import { isLeagueFormat, leagueFormats } from '../../../../../lib/league'
import type { LeagueSettings, ScheduleDate } from '../../../../../Components/torneo/league-generator'
import { SaveBar, StatTile, StatusBadge, TournamentHero, TournamentTabs, defaultMeta, sportOf, type SaveBarItem } from '../../../../../Components/torneo/ui'
import { DivisionWinners, StandingsSection } from '../../../../../Components/torneo/standings'
import { supabase } from '../../../../../lib/supabase'
import {
  footballEightNextPhase,
  footballEightScoreFromEvents,
} from '../../../../../lib/football-eight'

type Discipline = { id: string; code: string; name: string }
type Modality = { id: string; code: string; name: string; discipline_id?: string }
type OrganizationSummary = { id: string; name: string; athlonx_code: string | null; handle: string | null }
type TeamSummary = { id: string; name: string; athlonx_code: string | null; handle: string | null; organization_id?: string | null; discipline_id?: string | null; created_by?: string | null; divisionNames?: string[] }
type PlayerSummary = { id: string; full_name: string; shirt_number: number | null; position: string | null; user_id: string | null }
type Tournament = { id: string; name: string; slug: string; season: string | null; status: string; is_quick: boolean; start_date: string | null; end_date: string | null; location: string | null; country: string | null; cover_url: string | null; athlonx_code: string | null; discipline: Discipline | null; modality: Modality | null; organization: OrganizationSummary | null; organizer_team: TeamSummary | null; fixtureMatches?: Match[] }
type Division = { id: string; name: string; sort_order: number }
type TournamentTeam = { id: string; name: string; logo_url: string | null; city: string | null; division_id: string; division_name: string; athlonx_code: string | null; handle: string | null; is_official: boolean; contact_phone: string | null }
type ManualPairing = { divisionId: string; localTeamId: string; visitorTeamId: string }
type AutomaticDivisionConfig = { divisionId: string; matchesPerDate: number; matchesPerTeam?: number; restTeamsPerDate?: number }
type Match = {
  id: string
  fixture_id: string
  date_number: number
  calendar_date: string | null
  division_id: string | null
  division_name: string | null
  scheduled_time: string | null
  court_number?: number | null
  status: string
  local_team_id: string
  local_team_name: string
  local_logo_url: string | null
  visitor_team_id: string
  visitor_team_name: string
  visitor_logo_url: string | null
  local_score: number
  visitor_score: number
  shootout_local_score?: number | null
  shootout_visitor_score?: number | null
  elapsed_seconds?: number | null
  first_half_seconds?: number | null
  second_half_seconds?: number | null
  started_at?: string | null
  is_paused?: boolean
  period?: 'first_half' | 'second_half'
  match_phase?: string
  overtime_minutes?: number | null
  overtime_started_at?: string | null
}
type FixtureRecess = { id: string; time: string | null; label?: string | null }
type FixtureRecord = { id: string; date_number: number; calendar_date: string | null; recesses: FixtureRecess[] | null }
type TournamentFixtureDate = { fixtureId: string; dateNumber: number; calendarDate: string | null }
type TournamentFixtureCallup = { id: string; fixture_id: string; team_id: string; division_id: string; status: string; deadline_at: string | null }
type TournamentFixtureCallupPlayer = { callup_id: string; player_id: string; state: string; shirt_number: number | null }
type MatchEvent = {
  id: string
  match_id: string
  team_id?: string | null
  player_id?: string | null
  event_type: string
  points: number
  match_second?: number | null
  created_at?: string | null
  is_corrected?: boolean
  correction_reason?: string | null
  corrected_at?: string | null
}
type ShootoutKick = {
  id: string
  round_number: number
  team_id: string
  result: 'goal' | 'miss'
}
type MatchRules = {
  half_duration_minutes: number
  halftime_duration_minutes: number
  extra_time_allowed: boolean
  extra_time_half_minutes: number
  penalty_shootout_allowed: boolean
  draws_allowed: boolean
}
type MatchEventCorrection = {
  id: string
  match_event_id: string
  match_id: string
  event_type: string
  points_removed: number
  reason: string
  created_at: string
}
type StandingAdjustment = { tournament_id: string; division_id: string; team_id: string; points_adjustment: number; reason: string }
type RosterEntry = { team_id: string; division_id: string | null; division_name?: string | null; player_id: string; user_id: string | null; full_name: string; shirt_number: number | null; position: string | null; is_substitute: boolean; is_official: boolean; claimed_player_id: string | null }
type TournamentInvitation = { id: string; team_id: string; division_id: string | null; status: 'pending' | 'accepted' | 'declined' | 'cancelled'; created_at: string; responded_at: string | null }
type EditHistory = { id: string; edited_by: string; changes: Record<string, any>; created_at: string }
type TournamentPayload = { tournament: Tournament | null; divisions: Division[]; teams: TournamentTeam[]; matches: Match[] }
type ModalityRule = { modality_id: string; players_on_field: number; max_roster_size: number; substitutions_allowed: number; substitutions_unlimited: boolean }
type EditValues = { name: string; season: string; status: string; start_date: string; end_date: string; country: string; location: string; discipline_id: string; modality_id: string }
type PendingChange = { label: string; before: string; after: string; beforeValue: string | null; afterValue: string | null }
type PointRules = { win: number; draw: number; loss: number }
type FixtureDateChange = { fixtureId: string; calendarDate: string | null }
type FixtureTimeChange = { matchId: string; scheduledTime: string | null }
type FixtureMatchChange = { matchId: string; localTeamId: string; visitorTeamId: string }
type FixtureNewMatch = { fixtureId: string; divisionId: string; localTeamId: string; visitorTeamId: string; scheduledTime: string | null }
type DraftNewFixtureMatch = { divisionId: string; localTeamId: string; visitorTeamId: string; scheduledTime: string }
type PendingOperation = { id: string; title: string; changes: PendingChange[]; kind: 'invite-team' | 'add-team' | 'remove-team' | 'add-quick-team' | 'add-quick-player' | 'add-existing-player' | 'claim-guest-player' | 'generate-fixture' | 'update-fixture'; payload: Record<string, string> }

const statusNames: Record<string, string> = { draft: 'Borrador', published: 'Publicado', in_progress: 'En curso', finished: 'Finalizado' }
const statusOptions = Object.entries(statusNames).map(([value, label]) => ({ value, label }))
const defaultDivisionOptions = [
  'Primera división',
  'Segunda división',
  'Tercera división',
  'Femenina',
]

function shuffle<T>(items: T[]) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

// Calcula el horario de cada partido respetando el intervalo configurado.
function addMinutesToTime(time: string, minutes: number) {
  const [hours, initialMinutes] = time.split(':').map(Number)
  const totalMinutes = hours * 60 + initialMinutes + minutes
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440
  const nextHours = Math.floor(normalizedMinutes / 60)
  const nextMinutes = normalizedMinutes % 60
  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}:00`
}

function buildRoundRobinRounds(teamIds: string[]) {
  const rotation: (string | null)[] = shuffle(teamIds)
  if (rotation.length % 2 === 1) rotation.push(null)
  const rounds: { localTeamId: string; visitorTeamId: string }[][] = []

  for (let round = 0; round < rotation.length - 1; round += 1) {
    const pairings: { localTeamId: string; visitorTeamId: string }[] = []
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const first = rotation[index]
      const second = rotation[rotation.length - 1 - index]
      if (first && second) pairings.push(Math.random() < 0.5 ? { localTeamId: first, visitorTeamId: second } : { localTeamId: second, visitorTeamId: first })
    }
    rounds.push(shuffle(pairings))
    const last = rotation.pop()
    if (last !== undefined) rotation.splice(1, 0, last)
  }

  return shuffle(rounds)
}

// Genera calendarios de fútbol sin repetir rivales entre las fechas.
function buildFootballDivisionSchedule(divisionId: string, teamIds: string[], matchesPerTeam: number, dateCount: number) {
  const dates: ManualPairing[][] = Array.from({ length: dateCount }, () => [])
  if (matchesPerTeam === 0) return dates

  // Genera cada ronda una sola vez para evitar rivales repetidos entre fechas.
  const rounds = buildRoundRobinRounds(teamIds).slice(0, matchesPerTeam * dateCount)
  rounds.forEach((round, roundIndex) => {
    const dateIndex = roundIndex % dateCount
    dates[dateIndex].push(...round.map((pairing) => ({ divisionId, ...pairing })))
  })
  return dates
}

// Conserva la distribución histórica utilizada por los torneos de rugby.
function buildRugbyDivisionSchedule(divisionId: string, teamIds: string[], matchesPerTeam: number, dateCount: number) {
  const dates: ManualPairing[][] = Array.from({ length: dateCount }, () => [])
  if (matchesPerTeam === 0) return dates

  if (teamIds.length % 2 === 0) {
    for (let dateIndex = 0; dateIndex < dateCount; dateIndex += 1) {
      const rounds = buildRoundRobinRounds(teamIds).slice(0, matchesPerTeam)
      dates[dateIndex].push(...rounds.flat().map((pairing) => ({ divisionId, ...pairing })))
    }
    return dates
  }

  for (let dateIndex = 0; dateIndex < dateCount; dateIndex += 1) {
    const orderedTeams = shuffle(teamIds)
    const edges = new Map<string, { localTeamId: string; visitorTeamId: string }>()
    for (let offset = 1; offset <= matchesPerTeam / 2; offset += 1) {
      for (let index = 0; index < orderedTeams.length; index += 1) {
        const opponentIndex = (index + offset) % orderedTeams.length
        const ids = [orderedTeams[index], orderedTeams[opponentIndex]].sort()
        edges.set(ids.join(':'), Math.random() < 0.5
          ? { localTeamId: ids[0], visitorTeamId: ids[1] }
          : { localTeamId: ids[1], visitorTeamId: ids[0] })
      }
    }
    dates[dateIndex].push(
      ...shuffle(Array.from(edges.values())).map((edge) => ({ divisionId, ...edge })),
    )
  }
  return dates
}

function sameTeam(left: ManualPairing, right: ManualPairing) {
  return left.localTeamId === right.localTeamId
    || left.localTeamId === right.visitorTeamId
    || left.visitorTeamId === right.localTeamId
    || left.visitorTeamId === right.visitorTeamId
}

function orderMatchesWithRest(matches: ManualPairing[]) {
  if (matches.length < 2) return matches
  const maxNodes = Math.min(250000, Math.max(10000, matches.length * matches.length * 100))

  for (let attempt = 0; attempt < 12; attempt += 1) {
    let visitedNodes = 0
    const shuffledMatches = shuffle(matches)

    function search(sequence: ManualPairing[], remaining: ManualPairing[]): ManualPairing[] | null {
      if (!remaining.length) return sequence
      visitedNodes += 1
      if (visitedNodes > maxNodes) return null
      const previous = sequence.at(-1)
      const candidates = shuffle(remaining).filter((candidate) => !previous || !sameTeam(previous, candidate))
      candidates.sort((left, right) => {
        const leftDivisionPenalty = previous && left.divisionId === previous.divisionId ? 1 : 0
        const rightDivisionPenalty = previous && right.divisionId === previous.divisionId ? 1 : 0
        if (leftDivisionPenalty !== rightDivisionPenalty) return leftDivisionPenalty - rightDivisionPenalty
        const leftOptions = remaining.filter((item) => item !== left && !sameTeam(left, item)).length
        const rightOptions = remaining.filter((item) => item !== right && !sameTeam(right, item)).length
        return leftOptions - rightOptions
      })
      for (const candidate of candidates) {
        const nextRemaining = remaining.filter((item) => item !== candidate)
        const result = search([...sequence, candidate], nextRemaining)
        if (result) return result
      }
      return null
    }

    const result = search([], shuffledMatches)
    if (result) return result
  }
  return null
}

function orderDivisionSchedules(schedules: ManualPairing[][][], dateCount: number) {
  const orderedDates: ManualPairing[][] = []
  for (let dateIndex = 0; dateIndex < dateCount; dateIndex += 1) {
    const matchesForDate = schedules.flatMap((schedule) => schedule[dateIndex] ?? [])
    const orderedMatches = orderMatchesWithRest(matchesForDate)
    if (!orderedMatches) return null
    orderedDates.push(orderedMatches)
  }
  return orderedDates
}

function addWeeksToDate(date: string | null, weeks: number) {
  if (!date) return null
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + (weeks * 7))
  return value.toISOString().slice(0, 10)
}

function normalizeFixtureRecesses(value: unknown, key: string): FixtureRecess[] {
  if (!Array.isArray(value) || !value.length) return [{ id: `${key}-recess-1`, time: null }]
  return value.map((item, index) => {
    const row = item as { id?: unknown; time?: unknown; label?: unknown }
    return {
      id: typeof row.id === 'string' && row.id ? row.id : `${key}-recess-${index + 1}`,
      time: typeof row.time === 'string' && row.time ? row.time : null,
      label: typeof row.label === 'string' ? row.label : null,
    }
  })
}

export default function PublicTournamentPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<TournamentPayload | null>(null)
  const [history, setHistory] = useState<EditHistory[]>([])
  const [rosters, setRosters] = useState<RosterEntry[]>([])
  const [fixtureCallups, setFixtureCallups] = useState<TournamentFixtureCallup[]>([])
  const [fixtureCallupPlayers, setFixtureCallupPlayers] = useState<TournamentFixtureCallupPlayer[]>([])
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([])
  const [matchEventCorrections, setMatchEventCorrections] = useState<MatchEventCorrection[]>([])
  const [standingAdjustments, setStandingAdjustments] = useState<StandingAdjustment[]>([])
  const [ownerId, setOwnerId] = useState('')
  const [availableDisciplines, setAvailableDisciplines] = useState<Discipline[]>([])
  const [availableModalities, setAvailableModalities] = useState<Modality[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<PlayerSummary[]>([])
  const [modalityRule, setModalityRule] = useState<ModalityRule | null>(null)
  const [officialPlayerId, setOfficialPlayerId] = useState('')
  const [section, setSection] = useState<'resumen' | 'tablas' | 'llaves' | 'equipos' | 'convocatorias' | 'fixtures' | 'generador' | 'partidos' | 'general' | 'historial'>('resumen')
  const [editMode, setEditMode] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isFootball, setIsFootball] = useState(false)
  const [tiebreakers, setTiebreakers] = useState<string[]>([])
  const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChange> | null>(null)
  const [pendingDivisionNames, setPendingDivisionNames] = useState<string[] | null>(null)
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([])
  const [showOperationSave, setShowOperationSave] = useState(false)
  const [savingOperations, setSavingOperations] = useState(false)
  const [dirtySection, setDirtySection] = useState<string | null>(null)
  const [pendingSection, setPendingSection] = useState<typeof section | null>(null)
  const [saveDestination, setSaveDestination] = useState<typeof section | null>(null)
  const [availableTeams, setAvailableTeams] = useState<TeamSummary[]>([])
  const [tournamentInvitations, setTournamentInvitations] = useState<TournamentInvitation[]>([])
  const [maxTeamsLimit, setMaxTeamsLimit] = useState<number | null>(null)
  const [maxRosterLimit, setMaxRosterLimit] = useState<number | null>(null)
  const [competitionFormat, setCompetitionFormat] = useState('')
  const [pointRules, setPointRules] = useState<PointRules | null>(null)
  const [storedFixtureDates, setStoredFixtureDates] = useState<number[]>([])
  const [stageByFixture, setStageByFixture] = useState<Record<string, string>>({})
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null)
  const [numberRequest, setNumberRequest] = useState<{ teamId: string; playerId: string; playerName: string; currentNumber: number | null } | null>(null)
  const isFootballEightKnockout = competitionFormat === 'knockout'
    && data?.tournament?.discipline?.code === 'futbol'
    && data?.tournament?.modality?.code === 'futbol-8'
  const isBasketball = data?.tournament?.discipline?.code === 'baloncesto' && data?.tournament?.modality?.code === '3x3'

  async function loadTournament() {
    if (!supabase || !params.id) {
      setError('No se pudo identificar el torneo.')
      setLoading(false)
      return
    }
    setLoading(true)
    const [{ data: response, error: tournamentError }, { data: historyRows }, { data: ownerRow }, { data: userData }, { data: disciplineRows }, { data: modalityRows }, { data: teamRows }, { data: teamDivisionRows }, { data: playerRows }, { data: adjustmentRows }, { data: fixtureRows }] = await Promise.all([
      supabase.rpc('get_public_tournament_profile', { p_tournament_id: params.id }),
      supabase.from('tournament_edit_history').select('id, edited_by, changes, created_at').eq('tournament_id', params.id).order('created_at', { ascending: false }),
      supabase.from('tournaments').select('created_by, is_quick').eq('id', params.id).maybeSingle(),
      supabase.auth.getUser(),
      supabase.from('disciplines').select('id, code, name').eq('is_active', true).order('name'),
      supabase.from('sport_modalities').select('id, code, name, discipline_id').eq('is_active', true).order('name'),
      supabase.from('teams').select('id, name, athlonx_code, handle, organization_id, discipline_id, created_by').eq('is_public', true).eq('is_official', true).order('name'),
      supabase.from('team_division_catalog').select('id, team_id, name').order('name'),
      supabase.from('players').select('id, full_name, shirt_number, position, user_id').eq('is_official', true).order('full_name'),
      supabase.from('tournament_standing_adjustments').select('tournament_id, division_id, team_id, points_adjustment, reason').eq('tournament_id', params.id),
      supabase.from('fixtures').select('id, date_number, stage').eq('tournament_id', params.id).order('date_number'),
    ])
    if (tournamentError) {
      setError(tournamentError.message)
      setLoading(false)
      return
    }
    const payload = response as TournamentPayload
    const tournamentTeamIds = (payload.teams ?? []).map((team) => team.id)
    const { data: tournamentTeamMetadata } = tournamentTeamIds.length
      ? await supabase
          .from('teams')
          .select('id, is_official, contact_phone')
          .in('id', tournamentTeamIds)
      : { data: [] }
    const teamMetadataById = new Map(
      (tournamentTeamMetadata ?? []).map((team) => [
        team.id,
        {
          is_official: team.is_official,
          contact_phone: team.contact_phone,
        },
      ]),
    )
    // Evita mostrar varias veces el mismo equipo temporal creado por reintentos anteriores.
    const temporaryTeamKeys = new Set<string>()
    const deduplicatedTeams = (payload.teams ?? []).filter((team) => {
      if (team.is_official) return true
      const key = `${normalizeDivisionName(team.name)}|${team.division_id}`
      if (temporaryTeamKeys.has(key)) return false
      temporaryTeamKeys.add(key)
      return true
    })
    const normalizedTeams = deduplicatedTeams.map((team) => ({
      ...team,
      is_official: teamMetadataById.get(team.id)?.is_official ?? team.is_official ?? true,
      contact_phone: teamMetadataById.get(team.id)?.contact_phone ?? team.contact_phone ?? null,
    }))
    const tournamentWithQuickFlag = payload.tournament
      ? {
          ...payload.tournament,
          is_quick: Boolean(ownerRow?.is_quick ?? payload.tournament.is_quick),
        }
      : null
    const normalizedPayload: TournamentPayload = {
      ...payload,
      tournament: tournamentWithQuickFlag,
      teams: normalizedTeams,
    }
    const selectedModalityId = normalizedPayload.tournament?.modality?.id || ''
    const { data: competitionSettings } = await supabase
      .from('tournament_competition_settings')
        .select('competition_format, max_teams, max_roster_size, round_robin_legs, qualifying_teams_per_group, courts_count, half_duration_minutes, halftime_duration_minutes, interval_between_matches_minutes, points_for_win, points_for_draw, points_for_loss')
      .eq('tournament_id', params.id)
      .maybeSingle()
    const { data: modalityRuleRow } = selectedModalityId
      ? await supabase
          .from('sport_modality_rules')
          .select('modality_id, players_on_field, max_roster_size, substitutions_allowed, substitutions_unlimited')
          .eq('modality_id', selectedModalityId)
          .maybeSingle()
      : { data: null }
    const matchIds = (normalizedPayload.matches ?? []).map((match) => match.id)
    const { data: courtRows } = matchIds.length
      ? await supabase
        .from('matches')
        .select(
          'id, court_number, period, elapsed_seconds, first_half_seconds, '
          + 'second_half_seconds, started_at, is_paused, '
          + 'shootout_local_score, shootout_visitor_score, '
          + 'match_phase, overtime_minutes, overtime_started_at',
        )
        .in('id', matchIds)
      : { data: [] }
    const courtByMatch = new Map(
      (courtRows ?? []).map((row) => [row.id, row.court_number]),
    )
    normalizedPayload.matches = normalizedPayload.matches.map((match) => ({
      ...match,
      ...(courtRows ?? []).find((row) => row.id === match.id),
      court_number: courtByMatch.get(match.id) ?? null,
    })) as Match[]
    setData(normalizedPayload)
    const basketballTournament = normalizedPayload.tournament?.discipline?.code === 'baloncesto' && normalizedPayload.tournament?.modality?.code === '3x3'
    setMaxTeamsLimit(basketballTournament ? basketball.teams : Number(competitionSettings?.max_teams) || null)
    setMaxRosterLimit(basketballTournament ? basketball.maxRoster : Number(competitionSettings?.max_roster_size) || null)
    setCompetitionFormat(competitionSettings?.competition_format || '')
    const footballRules = normalizedPayload.tournament?.discipline?.code === 'futbol'
    setPointRules({ win: Number(competitionSettings?.points_for_win ?? (footballRules ? 3 : 4)), draw: Number(competitionSettings?.points_for_draw ?? (footballRules ? 1 : 2)), loss: Number(competitionSettings?.points_for_loss ?? 0) })
    setStageByFixture(Object.fromEntries((fixtureRows ?? []).map((fixture) => [fixture.id, fixture.stage || 'league'])))
    // Rugby sin configuración guardada: todos contra todos a una vuelta y tiempos de la modalidad.
    const sevens = normalizedPayload.tournament?.modality?.code !== 'xv'
    setLeagueSettings({
      format: isLeagueFormat(competitionSettings?.competition_format) ? competitionSettings.competition_format : 'round_robin',
      legs: Number(competitionSettings?.round_robin_legs) || 1,
      playoffTeams: Number(competitionSettings?.qualifying_teams_per_group) === 2 ? 2 : 4,
      courts: Number(competitionSettings?.courts_count) || 1,
      halfMinutes: Number(competitionSettings?.half_duration_minutes) || (sevens ? 7 : 40),
      halftimeMinutes: competitionSettings?.halftime_duration_minutes ?? (sevens ? 2 : 10),
      intervalMinutes: competitionSettings?.interval_between_matches_minutes ?? 10,
    })
    setStoredFixtureDates(Array.from(new Set(
      (fixtureRows ?? []).map((fixture) => Number(fixture.date_number)),
    )).filter(Number.isFinite).sort((left, right) => left - right))
    setModalityRule((modalityRuleRow as ModalityRule | null) || null)
    setHistory((historyRows ?? []) as EditHistory[])
    setStandingAdjustments((adjustmentRows ?? []) as StandingAdjustment[])
    setCurrentUserId(userData.user?.id || '')
    setOwnerId(ownerRow?.created_by || '')
    setAvailableDisciplines((disciplineRows ?? []) as Discipline[])
    setAvailableModalities((modalityRows ?? []) as Modality[])
    const officialPlayers = (playerRows ?? []) as PlayerSummary[]
    setAvailablePlayers(officialPlayers)
    setOfficialPlayerId(officialPlayers.find((player) => player.user_id === userData.user?.id)?.id || '')
    const teamIds = (teamRows ?? []).map((team) => team.id)
    const { data: legacyDivisionRows } = teamIds.length
      ? await supabase.from('team_players').select('team_id, players(division)').in('team_id', teamIds)
      : { data: [] }
    const divisionNamesByTeam = new Map<string, Set<string>>()
    for (const row of (teamDivisionRows ?? []) as Array<{ team_id: string; name: string }>) {
      if (!divisionNamesByTeam.has(row.team_id)) divisionNamesByTeam.set(row.team_id, new Set())
      divisionNamesByTeam.get(row.team_id)?.add(row.name)
    }
    for (const row of (legacyDivisionRows ?? []) as Array<{ team_id: string; players: { division: string | null } | null }>) {
      const name = row.players?.division?.trim()
      if (!name) continue
      if (!divisionNamesByTeam.has(row.team_id)) divisionNamesByTeam.set(row.team_id, new Set())
      divisionNamesByTeam.get(row.team_id)?.add(name)
    }
    setAvailableTeams(mergeTeamSummaries((teamRows ?? []).map((team) => ({ ...team, divisionNames: Array.from(divisionNamesByTeam.get(team.id) ?? []) })) as TeamSummary[]))
    const { data: invitationRows } = await supabase
      .from('tournament_team_invitations')
      .select('id, team_id, division_id, status, created_at, responded_at')
      .eq('tournament_id', params.id)
      .order('created_at', { ascending: false })
    setTournamentInvitations((invitationRows ?? []) as TournamentInvitation[])
    if (ownerRow?.created_by === userData.user?.id) setEditMode(new URLSearchParams(window.location.search).get('editar') === '1')
    if (normalizedPayload.tournament) {
      const matchIds = (payload.matches ?? []).map((match) => match.id)
      if (matchIds.length) {
        const { data: eventRows } = await supabase
          .from('match_events')
          .select(
            'id, match_id, team_id, player_id, event_type, points, match_second, '
            + 'created_at, is_corrected, correction_reason, corrected_at'
          )
          .in('match_id', matchIds)
        setMatchEvents((eventRows ?? []) as unknown as MatchEvent[])
        const { data: correctionRows } = await supabase
          .from('match_event_corrections')
          .select(
            'id, match_event_id, match_id, event_type, points_removed, reason, created_at'
          )
          .in('match_id', matchIds)
          .order('created_at', { ascending: false })
        setMatchEventCorrections((correctionRows ?? []) as MatchEventCorrection[])
      } else {
        setMatchEvents([])
        setMatchEventCorrections([])
      }
      const teamIds = (payload.teams ?? []).map((team) => team.id)
      if (teamIds.length) {
        const { data: links } = await supabase.from('team_players').select('team_id, division_id, player_id, is_substitute').in('team_id', teamIds)
        const playerIds = (links ?? []).map((link) => link.player_id)
        const { data: players } = playerIds.length ? await supabase.from('players').select('id, user_id, full_name, shirt_number, position, is_official, claimed_player_id').in('id', playerIds) : { data: [] }
        const claimedIds = (players ?? []).map((player) => player.claimed_player_id).filter(Boolean) as string[]
        const { data: claimedPlayers } = claimedIds.length ? await supabase.from('players').select('id, user_id, full_name, shirt_number, position, is_official, claimed_player_id').in('id', claimedIds) : { data: [] }
        const playerMap = new Map([...(players ?? []), ...(claimedPlayers ?? [])].map((player) => [player.id, player]))
        const teamDivisionNameById = new Map((teamDivisionRows ?? []).map((division) => [`${division.team_id}:${division.id}`, division.name]))
        setRosters((links ?? []).flatMap((link) => { const player = playerMap.get(link.player_id); const displayPlayer = player?.claimed_player_id ? playerMap.get(player.claimed_player_id) || player : player; return displayPlayer ? [{ team_id: link.team_id, division_id: link.division_id || null, division_name: teamDivisionNameById.get(`${link.team_id}:${link.division_id}`) || null, player_id: player.id, user_id: displayPlayer.user_id || null, full_name: displayPlayer.full_name, shirt_number: displayPlayer.shirt_number, position: displayPlayer.position || null, is_substitute: link.is_substitute, is_official: player.is_official, claimed_player_id: player.claimed_player_id || null }] : [] }))
      } else setRosters([])
      const fixtureIds = Array.from(new Set((payload.matches ?? []).map((match) => match.fixture_id)))
      if (fixtureIds.length) {
        const { data: callupRows } = await supabase
          .from('tournament_fixture_callups')
          .select('id, fixture_id, team_id, division_id, status, deadline_at')
          .eq('tournament_id', params.id)
          .in('fixture_id', fixtureIds)
        const callupIds = (callupRows ?? []).map((callup) => callup.id)
        const { data: callupPlayerRows } = callupIds.length
          ? await supabase.from('tournament_fixture_callup_players').select('callup_id, player_id, state, shirt_number').in('callup_id', callupIds)
          : { data: [] }
        setFixtureCallups((callupRows ?? []) as TournamentFixtureCallup[])
        setFixtureCallupPlayers((callupPlayerRows ?? []) as TournamentFixtureCallupPlayer[])
      } else {
        setFixtureCallups([])
        setFixtureCallupPlayers([])
      }
    }
    if (!normalizedPayload.tournament) setError('Este torneo no está disponible.')
    setLoading(false)
  }

  useEffect(() => { void loadTournament() }, [params.id])

  // Limpia modales y operaciones temporales al cambiar de torneo o abrir la ruta.
  useEffect(() => {
    setMessage('')
    setPendingChanges(null)
    setPendingDivisionNames(null)
    setPendingOperations([])
    setShowOperationSave(false)
    setDirtySection(null)
    setPendingSection(null)
    setSaveDestination(null)
    setNumberRequest(null)
  }, [params.id])

  useEffect(() => {
    const refreshTournament = () => void loadTournament()
    window.addEventListener('athlonx-tournament-updated', refreshTournament)
    return () => window.removeEventListener('athlonx-tournament-updated', refreshTournament)
  }, [params.id])

  useEffect(() => {
    if (searchParams.get('tab') === 'convocatorias') {
      setSection('convocatorias')
    }
  }, [searchParams])

  useEffect(() => {
    if (section === 'generador' && (!currentUserId || currentUserId !== ownerId)) setSection('resumen')
  }, [currentUserId, ownerId, section])

  // Redirige a las tablas cuando el formato no utiliza eliminación directa.
  useEffect(() => {
    // Rugby se juega por tabla; solo fútbol y baloncesto usan llaves.
    if ((competitionFormat === 'quick_league' || data?.tournament?.discipline?.code === 'rugby') && section === 'llaves') {
      setSection('tablas')
    }
    if (isFootballEightKnockout && section === 'fixtures') {
      setSection('llaves')
    }
    if (data?.tournament?.is_quick && section === 'convocatorias') {
      setSection('resumen')
    }
  }, [competitionFormat, data?.tournament?.discipline?.code, data?.tournament?.is_quick, isFootballEightKnockout, section])

  useEffect(() => {
    if (!currentUserId || currentUserId !== ownerId) setEditMode(false)
  }, [currentUserId, ownerId])

  if (loading) return <TournamentShell><div aria-busy="true" aria-label="Cargando torneo" className="space-y-5"><div className="h-[120px] animate-pulse rounded-2xl bg-[var(--ax-surface-raised)] sm:h-[200px] sm:rounded-[20px]" /><div className="flex gap-5 px-4 sm:px-6"><div className="-mt-10 h-[76px] w-[76px] shrink-0 animate-pulse rounded-[14px] bg-[var(--ax-surface)] ring-4 ring-[var(--ax-bg)] sm:-mt-16 sm:h-[120px] sm:w-[120px]" /><div className="flex-1 space-y-3 pt-3"><div className="h-4 w-40 animate-pulse rounded-md bg-[var(--ax-surface-raised)]" /><div className="h-8 w-72 max-w-full animate-pulse rounded-md bg-[var(--ax-surface-raised)]" /></div></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-[104px] animate-pulse rounded-[14px] bg-[var(--ax-surface)]" />)}</div></div></TournamentShell>
  if (error || !data?.tournament) return <TournamentShell><Notice tone="danger" icon={CircleAlert}>{error || 'Este torneo no está disponible.'}</Notice></TournamentShell>
  if (data.tournament.discipline?.code === 'baloncesto' && data.tournament.modality?.code !== '3x3') return <TournamentShell><Notice icon={CircleAlert}>La gestión de baloncesto está disponible para la modalidad 3x3. Esta modalidad todavía no tiene reglas habilitadas.</Notice></TournamentShell>

  const tournament = { ...data.tournament, fixtureMatches: data.matches ?? [] }
  const teams = data.teams ?? []
  const uniqueTeams = Array.from(new Map(teams.map((team) => [team.id, team])).values())
  const matches = data.matches ?? []
  const dates = Array.from(new Set([
    ...matches.map((match) => match.date_number),
    ...storedFixtureDates,
  ])).sort((left, right) => left - right)
  const fixtureDates = Array.from(new Map(matches.map((match) => [match.fixture_id, { fixtureId: match.fixture_id, dateNumber: match.date_number, calendarDate: match.calendar_date }])).values()).sort((left, right) => left.dateNumber - right.dateNumber)
  const showKnockout = competitionFormat !== 'quick_league'
  const showFixtureSections = !isFootballEightKnockout
  const canManage = Boolean(currentUserId && currentUserId === ownerId)
  const basketballPanel = (value: 'resumen' | 'tablas' | 'fixtures' | 'partidos' | 'equipos' | 'general') => <BasketballTournamentPanels tournamentId={tournament.id} tournamentName={tournament.name} section={value} canManage={canManage && (value !== 'partidos' || editMode)} />
  const disciplines = availableDisciplines.length ? availableDisciplines : tournament.discipline ? [tournament.discipline] : []
  const modalities = availableModalities.length ? availableModalities : tournament.modality ? [{ ...tournament.modality, discipline_id: tournament.discipline?.id }] : []

  function requestSave(values: EditValues, divisionNames: string[], rules: PointRules) {
    const before: EditValues = { name: tournament.name, season: tournament.season || '', status: tournament.status, start_date: tournament.start_date || '', end_date: tournament.end_date || '', country: tournament.country || 'Panamá', location: tournament.location || '', discipline_id: tournament.discipline?.id || '', modality_id: tournament.modality?.id || '' }
    const labels: Record<keyof EditValues, string> = { name: 'Nombre', season: 'Temporada', status: 'Estado', start_date: 'Fecha inicial', end_date: 'Fecha final', country: 'País', location: 'Ciudad', discipline_id: 'Disciplina', modality_id: 'Modalidad' }
    const changes = Object.keys(values).reduce<Record<string, PendingChange>>((current, key) => { const field = key as keyof EditValues; if (before[field] !== values[field]) current[field] = { label: labels[field], before: formatEditValue(field, before[field], disciplines, modalities), after: formatEditValue(field, values[field], disciplines, modalities), beforeValue: before[field] || null, afterValue: values[field] || null }; return current }, {})
    if (!values.name.trim() || !values.start_date) return setMessage('Completa el nombre y la fecha de inicio del torneo.')
    if (![rules.win, rules.draw, rules.loss].every((value) => Number.isInteger(value) && value >= 0)) return setMessage('Los puntos deben ser números enteros de 0 o más.')
    const currentRules = pointRules ?? { win: 4, draw: 2, loss: 0 }
    const ruleFields: [keyof PointRules, string][] = [['win', 'Puntos por victoria'], ['draw', 'Puntos por empate'], ['loss', 'Puntos por derrota']]
    for (const [key, label] of ruleFields) {
      if (rules[key] !== currentRules[key]) changes[`points_${key}`] = { label, before: String(currentRules[key]), after: String(rules[key]), beforeValue: String(currentRules[key]), afterValue: String(rules[key]) }
    }
    const currentDivisionNames = data.divisions.map((division) => division.name)
    const divisionChanged = currentDivisionNames.length !== divisionNames.length || currentDivisionNames.some((name, index) => normalizeDivisionName(name) !== normalizeDivisionName(divisionNames[index] || ''))
    const selectedNames = new Set(divisionNames.map(normalizeDivisionName))
    const removedDivisions = data.divisions.filter((division) => !selectedNames.has(normalizeDivisionName(division.name)))
    if (removedDivisions.some((division) => teams.some((team) => team.division_id === division.id) || matches.some((match) => normalizeDivisionName(match.division_name || '') === normalizeDivisionName(division.name)))) return setMessage('No se puede eliminar una división que ya tiene equipos o partidos vinculados.')
    if (!Object.keys(changes).length && !divisionChanged) return setMessage('No hay cambios nuevos para guardar.')
    if (divisionChanged) changes.divisions = { label: 'Divisiones', before: currentDivisionNames.join(' · ') || 'Sin divisiones', after: divisionNames.join(' · ') || 'Sin divisiones', beforeValue: null, afterValue: null }
    setMessage('')
    setPendingDivisionNames(divisionNames)
    setPendingChanges(changes)
  }

  function requestSection(nextSection: typeof section) {
    if (nextSection === section) return
    if (editMode && dirtySection === section) {
      setPendingSection(nextSection)
      return
    }
    setSection(nextSection)
  }

  function discardUnsavedChanges() {
    if (!pendingSection) return
    setDirtySection(null)
    setSection(pendingSection)
    setPendingSection(null)
    setMessage('')
  }

  function saveBeforeNavigate() {
    if (section === 'general') {
      setSaveDestination(pendingSection)
      setPendingSection(null)
      const form = document.getElementById('edit-tournament-form') as HTMLFormElement | null
      form?.requestSubmit()
    }
  }

  async function confirmSave(password: string) {
    if (!supabase || !pendingChanges || !tournament) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user?.email) return setMessage('No se pudo identificar el correo de la cuenta.')
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: userData.user.email, password })
    if (reauthError) return setMessage('La contraseña no es correcta. No se guardaron cambios.')
    const changes: Partial<EditValues> = Object.fromEntries(Object.entries(pendingChanges).filter(([field]) => field !== 'divisions' && !field.startsWith('points_')).map(([field, change]) => [field, change.afterValue]))
    if (Object.keys(changes).length) {
      const { error: updateError } = await supabase.from('tournaments').update(changes).eq('id', tournament.id).eq('created_by', userData.user.id)
      if (updateError) return setMessage(updateError.message)
    }
    if (Object.keys(pendingChanges).some((field) => field.startsWith('points_'))) {
      const next: PointRules = { win: Number(pendingChanges.points_win?.afterValue ?? pointRules?.win ?? 4), draw: Number(pendingChanges.points_draw?.afterValue ?? pointRules?.draw ?? 2), loss: Number(pendingChanges.points_loss?.afterValue ?? pointRules?.loss ?? 0) }
      const pointColumns = { points_for_win: next.win, points_for_draw: next.draw, points_for_loss: next.loss }
      const { data: settingsRow, error: lookupError } = await supabase.from('tournament_competition_settings').select('tournament_id').eq('tournament_id', tournament.id).maybeSingle()
      if (lookupError) return setMessage(lookupError.message)
      const { error: rulesError } = settingsRow
        ? await supabase.from('tournament_competition_settings').update(pointColumns).eq('tournament_id', tournament.id)
        : await supabase.from('tournament_competition_settings').insert({ tournament_id: tournament.id, competition_format: 'round_robin', ...pointColumns })
      if (rulesError) return setMessage(rulesError.message)
      setPointRules(next)
    }
    if (pendingDivisionNames) {
      const currentDivisions = data?.divisions ?? []
      const selectedNames = new Set(pendingDivisionNames.map(normalizeDivisionName))
      const removedDivisionIds = currentDivisions.filter((division) => !selectedNames.has(normalizeDivisionName(division.name))).map((division) => division.id)
      const currentNames = new Set(currentDivisions.map((division) => normalizeDivisionName(division.name)))
      const addedDivisionNames = pendingDivisionNames.filter((name) => !currentNames.has(normalizeDivisionName(name)))
      if (removedDivisionIds.length) {
        const { error: deleteError } = await supabase.from('tournament_divisions').delete().eq('tournament_id', tournament.id).in('id', removedDivisionIds)
        if (deleteError) return setMessage(deleteError.message)
      }
      if (addedDivisionNames.length) {
        const { error: insertError } = await supabase.from('tournament_divisions').insert(addedDivisionNames.map((name, index) => ({ tournament_id: tournament.id, name, sort_order: currentDivisions.length + index })))
        if (insertError) return setMessage(insertError.message)
      }
    }
    setPendingChanges(null)
    setPendingDivisionNames(null)
    setDirtySection(null)
    const destination = saveDestination || pendingSection
    setPendingSection(null)
    setSaveDestination(null)
    setMessage('Cambios guardados correctamente.')
    await loadTournament()
    if (destination) setSection(destination)
  }

  function queueOperation(operation: Omit<PendingOperation, 'id'>) {
    setPendingOperations((current) => [
      ...current,
      { ...operation, id: `${operation.kind}-${Date.now()}-${current.length}` },
    ])
    setMessage('')
  }

  function requestScheduleFixture(scheduleDates: ScheduleDate[], settings: LeagueSettings, summary: string) {
    queueOperation({
      title: summary === 'Semifinales' || summary === 'Final' ? `Generar ${summary.toLowerCase()}` : 'Generar fixture de liga',
      kind: 'generate-fixture',
      payload: { mode: 'schedule', dates: JSON.stringify(scheduleDates), settings: JSON.stringify(settings) },
      changes: [
        { label: 'Fixture', before: 'Sin cambios', after: summary, beforeValue: null, afterValue: summary },
        { label: 'Formato', before: 'Sin cambios', after: `${leagueFormats[settings.format]} · ${settings.legs === 2 ? 'ida y vuelta' : `${settings.legs} vuelta${settings.legs === 1 ? '' : 's'}`} · ${settings.courts} cancha${settings.courts === 1 ? '' : 's'}`, beforeValue: null, afterValue: settings.format },
      ],
    })
  }

  // Crea las fechas calculadas por el generador de liga y guarda formato y tiempos.
  async function performScheduleFixture(operation: PendingOperation): Promise<string | null> {
    if (!supabase || !canManage) return 'No tienes permisos para generar fixtures.'
    const scheduleDates = JSON.parse(operation.payload.dates || '[]') as ScheduleDate[]
    const settings = JSON.parse(operation.payload.settings || '{}') as LeagueSettings
    if (!scheduleDates.length) return 'No hay partidos para programar.'
    const { error: settingsError } = await supabase.from('tournament_competition_settings').upsert({
      tournament_id: tournament.id,
      competition_format: settings.format,
      round_robin_legs: settings.legs,
      qualifying_teams_per_group: settings.playoffTeams,
      courts_count: settings.courts,
      half_duration_minutes: settings.halfMinutes,
      halftime_duration_minutes: settings.halftimeMinutes,
      interval_between_matches_minutes: settings.intervalMinutes,
    }, { onConflict: 'tournament_id' })
    if (settingsError) return settingsError.message
    const { data: existingFixtureRows, error: lookupError } = await supabase.from('fixtures').select('date_number').eq('tournament_id', tournament.id)
    if (lookupError) return lookupError.message
    const nextDate = Math.max(0, ...(existingFixtureRows ?? []).map((fixture) => Number(fixture.date_number) || 0)) + 1
    const generatedAt = new Date().toISOString()
    const { data: fixtures, error: fixtureError } = await supabase.from('fixtures').insert(scheduleDates.map((date, index) => ({
      tournament_id: tournament.id,
      date_number: nextDate + index,
      calendar_date: date.calendarDate,
      stage: date.stage,
      recesses: date.recesses.length ? date.recesses.map((recess, recessIndex) => ({ id: `recess-${nextDate + index}-${recessIndex + 1}`, time: recess.time, label: `Receso · ${recess.minutes} min` })) : [{ id: `recess-${nextDate + index}-1`, time: null }],
      generated_at: generatedAt,
    }))).select('id, date_number')
    if (fixtureError || !fixtures?.length) return fixtureError?.message || 'No se pudieron crear las fechas.'
    const fixtureByDate = new Map(fixtures.map((fixture) => [fixture.date_number, fixture.id]))
    const rows = scheduleDates.flatMap((date, index) => date.matches.map((match, order) => ({
      fixture_id: fixtureByDate.get(nextDate + index),
      division_id: match.divisionId,
      fixture_order: order,
      local_team_id: match.localTeamId,
      visitor_team_id: match.visitorTeamId,
      court_number: match.court,
      scheduled_time: `${match.time}:00`,
    })))
    const { error: matchesError } = await supabase.from('matches').insert(rows)
    if (matchesError) {
      await supabase.from('fixtures').delete().in('id', fixtures.map((fixture) => fixture.id))
      return matchesError.message
    }
    return null
  }

  function requestUpdateFixture(dateChanges: FixtureDateChange[], timeChanges: FixtureTimeChange[], matchChanges: FixtureMatchChange[], newMatches: FixtureNewMatch[] = [], deletedMatchIds: string[] = []) {
    if (!dateChanges.length && !timeChanges.length && !matchChanges.length && !newMatches.length && !deletedMatchIds.length) return setMessage('No hay cambios nuevos para guardar.')
    const dateSummary = dateChanges.length ? `${dateChanges.length} fecha${dateChanges.length === 1 ? '' : 's'}` : ''
    const timeSummary = timeChanges.length ? `${timeChanges.length} horario${timeChanges.length === 1 ? '' : 's'}` : ''
    const matchSummary = matchChanges.length ? `${matchChanges.length} enfrentamiento${matchChanges.length === 1 ? '' : 's'}` : ''
    const addedSummary = newMatches.length ? `${newMatches.length} enfrentamiento${newMatches.length === 1 ? '' : 's'} agregado${newMatches.length === 1 ? '' : 's'}` : ''
    const deletedSummary = deletedMatchIds.length ? `${deletedMatchIds.length} enfrentamiento${deletedMatchIds.length === 1 ? '' : 's'} eliminado${deletedMatchIds.length === 1 ? '' : 's'}` : ''
    const summary = [dateSummary, timeSummary, matchSummary, addedSummary, deletedSummary].filter(Boolean).join(', ')
    queueOperation({
      title: 'Actualizar fixture',
      kind: 'update-fixture',
      payload: { dateChanges: JSON.stringify(dateChanges), timeChanges: JSON.stringify(timeChanges), matchChanges: JSON.stringify(matchChanges), newMatches: JSON.stringify(newMatches), deletedMatchIds: JSON.stringify(deletedMatchIds) },
      changes: [{ label: 'Fixture', before: 'Configuración actual', after: `${summary} modificados`, beforeValue: null, afterValue: summary }],
    })
    setShowOperationSave(true)
  }

  async function deleteFixture(dateNumber: number) {
    if (!supabase || !canManage) {
      setMessage('No tienes permisos para eliminar fixtures.')
      return
    }
    // Consulta la fecha directamente para incluir fixtures sin partidos asociados.
    const { data: fixtureRows, error: fixtureLookupError } = await supabase
      .from('fixtures')
      .select('id')
      .eq('tournament_id', tournament.id)
      .eq('date_number', dateNumber)
    if (fixtureLookupError) {
      setMessage(fixtureLookupError.message)
      return
    }
    const fixtureIds = (fixtureRows ?? []).map((fixture) => fixture.id)
    if (!fixtureIds.length) {
      setMessage('No se encontró el fixture seleccionado.')
      return
    }
    const { error: matchesError } = await supabase.from('matches').delete().in('fixture_id', fixtureIds)
    if (matchesError) {
      setMessage(matchesError.message)
      return
    }
    const { error: fixtureError } = await supabase.from('fixtures').delete().in('id', fixtureIds)
    if (fixtureError) {
      setMessage(fixtureError.message)
      return
    }
    setMessage(`Fecha ${dateNumber} eliminada correctamente.`)
    await loadTournament()
  }

  async function performGenerateFixture(operation: PendingOperation): Promise<string | null> {
    if (operation.payload.mode === 'schedule') return performScheduleFixture(operation)
    if (isBasketball) return 'Publica el cuadro desde Llaves para generar el fixture 3x3.'
    if (!supabase || !canManage) return 'No tienes permisos para generar fixtures.'
    if (uniqueTeams.length < 2) return 'Agrega al menos dos equipos antes de generar un fixture.'
    const selectedTeamIds = operation.payload.teamIds ? operation.payload.teamIds.split(',').filter(Boolean) : teams.map((team) => team.id)
    const mode = operation.payload.mode || 'automatic'
    const firstMatchTime = operation.payload.firstMatchTime || '08:00'
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(firstMatchTime)) return 'La hora inicial no es válida.'
    const requestedDateCount = mode === 'manual' ? 1 : Number(operation.payload.numberOfDates || 1)
    if (!Number.isInteger(requestedDateCount) || requestedDateCount < 1) return 'La cantidad de fechas no es válida.'
    const datePairings: ManualPairing[][] = Array.from({ length: requestedDateCount }, () => [])

    if (mode === 'manual') {
      const manualPairings = JSON.parse(operation.payload.pairings || '[]') as ManualPairing[]
      const pairsInDate = new Set<string>()
      const teamsInDate = new Set<string>()
      for (const pairing of manualPairings) {
        const localTeam = teams.find((team) => team.id === pairing.localTeamId)
        const visitorTeam = teams.find((team) => team.id === pairing.visitorTeamId)
        if (!localTeam || !visitorTeam || localTeam.id === visitorTeam.id) {
          return 'Todos los enfrentamientos manuales deben tener dos equipos válidos.'
        }
        if (localTeam.division_id !== pairing.divisionId
          || visitorTeam.division_id !== pairing.divisionId) {
          return 'Los equipos de un enfrentamiento deben pertenecer a la misma división.'
        }
        if (teamsInDate.has(localTeam.id) || teamsInDate.has(visitorTeam.id)) {
          return 'Un equipo no puede jugar dos veces en la misma fecha.'
        }
        const pairKey = [localTeam.id, visitorTeam.id].sort().join(':')
        if (pairsInDate.has(pairKey)) return 'Ese enfrentamiento está repetido en la fecha.'
        if (competitionFormat === 'quick_league' && matches.some((match) => {
          const existingKey = [match.local_team_id, match.visitor_team_id].sort().join(':')
          return match.division_id === pairing.divisionId && existingKey === pairKey
        })) {
          return 'Ese enfrentamiento ya existe en otra fecha del todos contra todos.'
        }
        pairsInDate.add(pairKey)
        teamsInDate.add(localTeam.id)
        teamsInDate.add(visitorTeam.id)
      }
      datePairings[0].push(...manualPairings)
    } else {
      const configuredDivision = JSON.parse(operation.payload.divisionConfigs || '[]') as AutomaticDivisionConfig[]
      const divisionSchedules: ManualPairing[][][] = []
      for (const division of data.divisions) {
        const divisionTeams = teams.filter((team) => selectedTeamIds.includes(team.id) && team.division_id === division.id)
        const config = configuredDivision.find((item) => item.divisionId === division.id)
        const requestedMatches = config?.matchesPerTeam ?? config?.matchesPerDate ?? Math.max(divisionTeams.length - 1, 0)
        if (!Number.isInteger(requestedMatches) || requestedMatches < 0 || requestedMatches > Math.max(divisionTeams.length - 1, 0)) return `${division.name} tiene una cantidad inválida de partidos por equipo.`
        if ((divisionTeams.length * requestedMatches) % 2 !== 0) return `${division.name} necesita una cantidad par de participaciones.`
        if (competitionFormat === 'quick_league'
          && requestedMatches * requestedDateCount > Math.max(divisionTeams.length - 1, 0)) {
          return `${division.name} no puede completar todos los enfrentamientos en esas fechas.`
        }
        const minimumDates = requestedMatches > 0 ? 1 : 0
        if (requestedDateCount < minimumDates) return `${division.name} necesita al menos ${minimumDates} fechas.`
        const sportCode = data.tournament?.discipline?.code
        const scheduleBuilder = sportCode === 'futbol' ? buildFootballDivisionSchedule : sportCode === 'rugby' ? buildRugbyDivisionSchedule : null
        if (!scheduleBuilder) return 'Esta disciplina todavía no tiene generador de fixtures.'
        const schedule = scheduleBuilder(
          division.id,
          divisionTeams.map((team) => team.id),
          requestedMatches,
          requestedDateCount,
        )
        if (!schedule) return `No se pudo distribuir aleatoriamente los partidos de ${division.name} en las fechas indicadas.`
        divisionSchedules.push(schedule)
      }
      const orderedDates = orderDivisionSchedules(divisionSchedules, requestedDateCount)
      if (!orderedDates) return 'No se pudo ordenar los partidos sin que un equipo juegue dos veces seguidas. Ajusta la cantidad de partidos, agrega otra división o utiliza un receso manual.'
      orderedDates.forEach((pairings, dateIndex) => datePairings[dateIndex].push(...pairings))
    }

    const totalPairings = datePairings.reduce((total, pairings) => total + pairings.length, 0)
    if (!totalPairings) return 'No se generaron enfrentamientos con la configuración indicada.'
    const { data: competitionSettings } = await supabase
      .from('tournament_competition_settings')
      .select('courts_count, max_teams, half_duration_minutes, halftime_duration_minutes, interval_between_matches_minutes')
      .eq('tournament_id', tournament.id)
      .maybeSingle()
    const courtsCount = Math.max(1, Number(competitionSettings?.courts_count || 1))
    const { data: modalityRules } = tournament.modality?.id
      ? await supabase
          .from('sport_modality_rules')
          .select('half_duration_minutes, halftime_duration_minutes')
          .eq('modality_id', tournament.modality.id)
          .maybeSingle()
      : { data: null }
    const maxTeams = Number(competitionSettings?.max_teams || 0)
    if (maxTeams > 0 && selectedTeamIds.length > maxTeams) {
      return `Este torneo permite un máximo de ${maxTeams} equipos.`
    }
    const halfDuration = Number(
      competitionSettings?.half_duration_minutes
      ?? modalityRules?.half_duration_minutes
      ?? 0,
    )
    const halftimeDuration = Number(
      competitionSettings?.halftime_duration_minutes
      ?? modalityRules?.halftime_duration_minutes
      ?? 0,
    )
    const intervalDuration = Number(
      competitionSettings?.interval_between_matches_minutes ?? 10,
    )
    const matchInterval = halfDuration > 0
      ? halfDuration * 2 + halftimeDuration + intervalDuration
      : intervalDuration
    // Consulta las fechas reales para evitar colisiones con fechas vacías o pendientes.
    const { data: existingFixtureRows, error: existingFixturesError } = await supabase
      .from('fixtures')
      .select('date_number')
      .eq('tournament_id', tournament.id)
      .order('date_number', { ascending: false })
    if (existingFixturesError) return existingFixturesError.message
    const lastFixtureDate = Math.max(
      0,
      ...(existingFixtureRows ?? []).map((fixture) => Number(fixture.date_number) || 0),
    )
    const nextDate = lastFixtureDate + 1
    const generatedAt = new Date().toISOString()
    const fixtureRows = datePairings.map((_, index) => ({ tournament_id: tournament.id, date_number: nextDate + index, calendar_date: addWeeksToDate(tournament.start_date, index), recesses: [{ id: `recess-${nextDate + index}-1`, time: null }], generated_at: generatedAt }))
    const { data: fixtures, error: fixtureError } = await supabase.from('fixtures').insert(fixtureRows).select('id, date_number')
    if (fixtureError || !fixtures?.length) return fixtureError?.message || 'No se pudieron crear las fechas.'

    const fixtureByDate = new Map(fixtures.map((fixture) => [fixture.date_number, fixture.id]))
    const pairs = datePairings.flatMap((pairings, index) => pairings.map((pairing, pairingIndex) => ({
      fixture_id: fixtureByDate.get(nextDate + index),
      division_id: pairing.divisionId,
      fixture_order: pairingIndex,
      local_team_id: pairing.localTeamId,
      visitor_team_id: pairing.visitorTeamId,
      court_number: (pairingIndex % courtsCount) + 1,
      scheduled_time: addMinutesToTime(
        firstMatchTime,
        Math.floor(pairingIndex / courtsCount) * matchInterval,
      ),
    })))
    const { error: matchesError } = await supabase.from('matches').insert(pairs)
    if (matchesError) {
      await supabase.from('fixtures').delete().in('id', fixtures.map((fixture) => fixture.id))
      return matchesError.message
    }
    return null
  }

  function requestAddTeam(teamId: string, divisionId: string) {
    requestInviteTeam(teamId, divisionId)
  }

  function requestInviteTeam(teamId: string, divisionId: string) {
    const team = availableTeams.find((item) => item.id === teamId)
    const division = data.divisions.find((item) => item.id === divisionId)
    if (tournament.status !== 'published') return setMessage('El torneo debe estar publicado para enviar invitaciones.')
    if (!team || !division) return setMessage('Selecciona un equipo y una división válidos.')
    const pendingTeamAdds = pendingOperations.filter((operation) => (
      operation.kind === 'invite-team' || operation.kind === 'add-quick-team'
    )).length
    if (maxTeamsLimit && uniqueTeams.length + pendingTeamAdds >= maxTeamsLimit) {
      return setMessage(`El torneo ya alcanzó el máximo de ${maxTeamsLimit} equipos.`)
    }
    if (teams.some((item) => item.id === teamId && item.division_id === divisionId)) return setMessage('Este equipo ya forma parte de esta división.')
    if (tournamentInvitations.some((invitation) => invitation.team_id === teamId && invitation.division_id === divisionId && invitation.status === 'pending')) return setMessage('Este equipo ya tiene una invitación pendiente para esta división.')
    if (team.divisionNames?.length && !team.divisionNames.some((name) => normalizeDivisionName(name) === normalizeDivisionName(division.name))) {
      return setMessage(`La división ${division.name} no corresponde al equipo ${team.name}.`)
    }
    queueOperation({ title: 'Enviar invitación a equipo', kind: 'invite-team', payload: { teamId, divisionId }, changes: [{ label: 'Equipo invitado', before: 'Sin invitación', after: `${team.name} · ${division.name}`, beforeValue: null, afterValue: teamId }] })
  }

  function requestRemoveTeam(team: TournamentTeam) {
    queueOperation({ title: 'Retirar equipo del torneo', kind: 'remove-team', payload: { teamId: team.id, divisionId: team.division_id }, changes: [{ label: 'Equipo', before: `${team.name} · ${team.division_name}`, after: 'Retirado del torneo', beforeValue: team.id, afterValue: null }] })
  }

  function requestAddQuickTeam(values: { name: string; logoUrl: string; phone: string; divisionId: string }) {
    const division = data.divisions.find((item) => item.id === values.divisionId)
    if (!tournament.is_quick) return setMessage('Los equipos temporales solo están disponibles en torneos rápidos.')
    if (!division || !values.name.trim()) return setMessage('Completa el nombre y la división del equipo.')
    const normalizedName = normalizeDivisionName(values.name)
    const alreadyExists = uniqueTeams.some((team) => (
      !team.is_official
      && normalizeDivisionName(team.name) === normalizedName
      && team.division_id === values.divisionId
    ))
    const alreadyPending = pendingOperations.some((operation) => (
      operation.kind === 'add-quick-team'
      && normalizeDivisionName(operation.payload.name) === normalizedName
      && operation.payload.divisionId === values.divisionId
    ))
    if (alreadyExists || alreadyPending) {
      return setMessage('Ya existe un equipo temporal con ese nombre en esta división.')
    }
    const pendingTeamAdds = pendingOperations.filter((operation) => (
      operation.kind === 'invite-team' || operation.kind === 'add-quick-team'
    )).length
    if (maxTeamsLimit && uniqueTeams.length + pendingTeamAdds >= maxTeamsLimit) {
      return setMessage(`El torneo ya alcanzó el máximo de ${maxTeamsLimit} equipos.`)
    }
    queueOperation({ title: 'Agregar equipo temporal', kind: 'add-quick-team', payload: { name: values.name.trim(), logoUrl: values.logoUrl.trim(), phone: values.phone.trim(), divisionId: values.divisionId }, changes: [{ label: `Equipo temporal: ${values.name.trim()}`, before: 'No registrado', after: `${values.name.trim()} · ${division.name}`, beforeValue: null, afterValue: values.name.trim() }] })
  }

  async function requestAddQuickPlayer(teamId: string, values: { name: string; shirtNumber: string; position: string }) {
    if (!tournament.is_quick) return setMessage('Los jugadores temporales solo están disponibles en torneos rápidos.')
    if (!values.name.trim()) return setMessage('Escribe el nombre del jugador.')
    const team = teams.find((item) => item.id === teamId)
    if (!team) return setMessage('No se pudo identificar el equipo.')
    const operation: PendingOperation = { id: crypto.randomUUID(), title: 'Agregar jugador temporal', kind: 'add-quick-player', payload: { teamId, name: values.name.trim(), shirtNumber: values.shirtNumber.trim(), position: values.position.trim() }, changes: [{ label: 'Jugador temporal', before: 'No registrado', after: `${values.name.trim()} · ${team.name}`, beforeValue: null, afterValue: values.name.trim() }] }
    const error = await applyOperation(operation, currentUserId)
    if (error) return setMessage(error)
    window.location.reload()
  }

  async function requestAddExistingPlayer(teamId: string, playerId: string) {
    const player = availablePlayers.find((item) => item.id === playerId)
    const team = teams.find((item) => item.id === teamId)
    if (!player || !team) return setMessage('Selecciona un jugador y un equipo válidos.')
    const operation: PendingOperation = { id: crypto.randomUUID(), title: 'Agregar jugador registrado', kind: 'add-existing-player', payload: { teamId, playerId }, changes: [{ label: 'Jugador registrado', before: 'No inscrito', after: `${player.full_name} · ${team.name}`, beforeValue: null, afterValue: playerId }] }
    const error = await applyOperation(operation, currentUserId)
    if (error) return setMessage(error)
    window.location.reload()
  }

  function requestClaimGuestPlayer(guestPlayerId: string, guestPlayerName: string) {
    if (!officialPlayerId) return setMessage('Tu cuenta todavía no tiene un perfil oficial de jugador para reclamar este registro.')
    queueOperation({ title: 'Reclamar perfil temporal', kind: 'claim-guest-player', payload: { guestPlayerId, officialPlayerId }, changes: [{ label: 'Perfil', before: guestPlayerName, after: 'Vinculado a tu perfil oficial', beforeValue: guestPlayerId, afterValue: officialPlayerId }] })
  }

  async function applyOperation(operation: PendingOperation, userId: string): Promise<string | null> {
    if (!supabase || !tournament) return 'No se pudo identificar el torneo.'

    if (operation.kind === 'invite-team') {
      const { error } = await supabase.from('tournament_team_invitations').insert({ tournament_id: tournament.id, team_id: operation.payload.teamId, division_id: operation.payload.divisionId, invited_by: userId })
      return error?.message || null
    }

    if (operation.kind === 'add-team') {
      const { error } = await supabase.from('tournament_teams').insert({ tournament_id: tournament.id, team_id: operation.payload.teamId, division_id: operation.payload.divisionId })
      return error?.message || null
    }

    if (operation.kind === 'remove-team') {
      const { error } = await supabase.from('tournament_teams').delete().eq('tournament_id', tournament.id).eq('team_id', operation.payload.teamId).eq('division_id', operation.payload.divisionId)
      return error?.message || null
    }

    if (operation.kind === 'add-quick-team') {
      const { data: temporaryTeam, error: teamError } = await supabase.from('teams').insert({ name: operation.payload.name, logo_url: operation.payload.logoUrl || null, contact_phone: operation.payload.phone || null, country: tournament.country || 'Panama', city: tournament.location || null, discipline_id: tournament.discipline?.id || null, created_by: userId, is_public: true, is_official: false, temporary_tournament_id: tournament.id }).select('id').single()
      if (teamError || !temporaryTeam) return teamError?.message || 'No se pudo crear el equipo temporal.'
      const { error: linkError } = await supabase.from('tournament_teams').insert({ tournament_id: tournament.id, team_id: temporaryTeam.id, division_id: operation.payload.divisionId })
      if (linkError) await supabase.from('teams').delete().eq('id', temporaryTeam.id)
      return linkError?.message || null
    }

    if (operation.kind === 'add-quick-player') {
      const { data: temporaryPlayer, error: playerError } = await supabase.from('players').insert({ full_name: operation.payload.name, shirt_number: operation.payload.shirtNumber ? Number(operation.payload.shirtNumber) : null, position: operation.payload.position || null, created_by: userId, is_official: false, temporary_tournament_id: tournament.id }).select('id').single()
      if (playerError || !temporaryPlayer) return playerError?.message || 'No se pudo crear el jugador temporal.'
      const { error: linkError } = await supabase.from('team_players').insert({ team_id: operation.payload.teamId, player_id: temporaryPlayer.id })
      if (linkError) await supabase.from('players').delete().eq('id', temporaryPlayer.id)
      return linkError?.message || null
    }

    if (operation.kind === 'add-existing-player') {
      const { error } = await supabase.from('team_players').insert({ team_id: operation.payload.teamId, player_id: operation.payload.playerId })
      return error?.message || null
    }

    if (operation.kind === 'claim-guest-player') {
      const { error } = await supabase.rpc('claim_tournament_guest_player', { p_guest_player_id: operation.payload.guestPlayerId, p_official_player_id: operation.payload.officialPlayerId })
      return error?.message || null
    }

    if (operation.kind === 'update-fixture') {
      const dateChanges = JSON.parse(operation.payload.dateChanges || '[]') as FixtureDateChange[]
      const timeChanges = JSON.parse(operation.payload.timeChanges || '[]') as FixtureTimeChange[]
      const matchChanges = JSON.parse(operation.payload.matchChanges || '[]') as FixtureMatchChange[]
      const newMatches = JSON.parse(operation.payload.newMatches || '[]') as FixtureNewMatch[]
      const deletedMatchIds = JSON.parse(operation.payload.deletedMatchIds || '[]') as string[]
      for (const change of dateChanges) {
        const { error } = await supabase.from('fixtures').update({ calendar_date: change.calendarDate }).eq('id', change.fixtureId)
        if (error) return error.message
      }
      for (const change of timeChanges) {
        const { error } = await supabase.from('matches').update({ scheduled_time: change.scheduledTime }).eq('id', change.matchId)
        if (error) return error.message
      }
      for (const change of matchChanges) {
        const { error } = await supabase.from('matches').update({ local_team_id: change.localTeamId, visitor_team_id: change.visitorTeamId }).eq('id', change.matchId)
        if (error) return error.message
      }
      if (deletedMatchIds.length) {
        const { error } = await supabase.from('matches').delete().in('id', deletedMatchIds)
        if (error) return error.message
      }
      if (newMatches.length) {
        const { error } = await supabase.from('matches').insert(newMatches.map((match) => ({ fixture_id: match.fixtureId, division_id: match.divisionId, local_team_id: match.localTeamId, visitor_team_id: match.visitorTeamId, scheduled_time: match.scheduledTime })))
        if (error) return error.message
      }
      return null
    }

    return performGenerateFixture(operation)
  }

  async function confirmOperations(password: string) {
    if (savingOperations || !supabase || !pendingOperations.length || !tournament) return

    setSavingOperations(true)
    const operations = pendingOperations
    const pendingTeamAdds = operations.filter((operation) => (
      operation.kind === 'invite-team' || operation.kind === 'add-quick-team'
    )).length
    try {
      if (maxTeamsLimit && uniqueTeams.length + pendingTeamAdds > maxTeamsLimit) {
        setMessage(`No se pueden guardar los cambios: el torneo permite máximo ${maxTeamsLimit} equipos.`)
        return
      }
      let remainingOperations = [...operations]
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user?.email) {
        setMessage('No se pudo identificar el correo de la cuenta.')
        return
      }
      const { error: reauthError } = await supabase.auth.signInWithPassword({ email: userData.user.email, password })
      if (reauthError) {
        setMessage('La contraseña no es correcta. No se guardaron cambios.')
        return
      }

      for (const operation of operations) {
        const operationError = await applyOperation(operation, userData.user.id)
        if (operationError) {
          setPendingOperations(remainingOperations)
          setMessage(`No se pudo guardar "${operation.title}": ${operationError}`)
          return
        }

        const { error: auditError } = await supabase.rpc('record_tournament_edit', {
          p_tournament_id: tournament.id,
          p_changes: Object.fromEntries(operation.changes.map((change, index) => [`${operation.kind}_${index}`, { before: change.before, after: change.after }])),
        })
        if (auditError) {
          setPendingOperations(remainingOperations.slice(1))
          setMessage(auditError.message)
          return
        }
        remainingOperations = remainingOperations.slice(1)
        setPendingOperations(remainingOperations)
      }

      setPendingOperations([])
      setShowOperationSave(false)
      setDirtySection(null)
      setMessage(`${operations.length} cambio${operations.length === 1 ? '' : 's'} guardado${operations.length === 1 ? '' : 's'} correctamente.`)
      await loadTournament()
    } finally {
      setSavingOperations(false)
    }
  }

  async function requestPlayerNumber(teamId: string, playerId: string, playerName: string, currentNumber: number | null, requestedNumber: number) {
    if (!supabase) return
    if (!Number.isInteger(requestedNumber) || requestedNumber < 0 || requestedNumber > 99) return setMessage('El número debe ser un entero entre 0 y 99.')
    const { error: requestError } = await supabase.rpc('create_player_number_change_request', { p_team_id: teamId, p_player_id: playerId, p_requested_number: requestedNumber, p_league_name: tournament.name, p_tournament_id: tournament.id })
    if (requestError) return setMessage(requestError.message)
    setNumberRequest(null)
    setMessage(`Solicitud enviada para cambiar el número de ${playerName}.`)
  }

  const sport = sportOf(tournament.discipline?.code)
  const isKnockoutFormat = isFootballEightKnockout || isBasketball
  const finishedMatches = matches.filter((match) => match.status === 'finished').length
  const liveMatches = matches.filter((match) => match.status === 'live').length
  const activeMatchEvents = matchEvents.filter((event) => !event.is_corrected)
  const scoringTotal = sport === 'baloncesto'
    ? activeMatchEvents.reduce((total, event) => total + (event.points || 0), 0)
    : activeMatchEvents.filter((event) => (sport === 'rugby' ? ['try'] : ['goal', 'penalty_kick']).includes(event.event_type)).length
  const divisionCount = data.divisions?.length ?? 0
  const stats = [
    { label: 'Equipos', value: String(uniqueTeams.length), detail: maxTeamsLimit ? `de ${maxTeamsLimit} cupos` : `${divisionCount} división${divisionCount === 1 ? '' : 'es'}` },
    isKnockoutFormat
      ? { label: 'Formato', value: 'Llave', detail: 'eliminación directa' }
      : { label: 'Fechas', value: String(dates.length), detail: dates.length ? `${divisionCount} división${divisionCount === 1 ? '' : 'es'}` : 'sin fixture' },
    { label: 'Partidos', value: matches.length ? `${finishedMatches} de ${matches.length}` : '0', detail: liveMatches ? `${liveMatches} en vivo` : 'jugados' },
    { label: sport === 'rugby' ? 'Tries' : sport === 'futbol' ? 'Goles' : 'Puntos', value: String(scoringTotal), detail: finishedMatches ? `${(scoringTotal / finishedMatches).toLocaleString('es-PA', { maximumFractionDigits: 1 })} por partido` : 'registrados' },
  ]
  // Rugby se juega todos contra todos: no muestra llaves. Fútbol y baloncesto sí.
  const showBracketTab = showKnockout && sport !== 'rugby'
  const tabs = ([
    ['resumen', 'Resumen'],
    ['tablas', isBasketball ? 'Clasificación' : 'Tablas'],
    ['llaves', 'Llaves'],
    ['equipos', 'Equipos y plantillas'],
    ['convocatorias', 'Convocatorias'],
    ['fixtures', isBasketball ? 'Cronograma' : 'Fixtures'],
    ['generador', 'Generador'],
    ['partidos', 'Partidos'],
    ['general', 'Información'],
    ['historial', 'Historial'],
  ] as const)
    .filter(([value]) => (
      (value !== 'generador' || (canManage && editMode))
      && (value !== 'tablas' || !isFootballEightKnockout)
      && (value !== 'llaves' || showBracketTab)
      && (value !== 'convocatorias' || !tournament.is_quick)
      && (value !== 'fixtures' || showFixtureSections)
    ))
    .map(([value, label]) => ({ value, label }))
  const operationItems: SaveBarItem[] = pendingOperations.map((operation) => ({
    id: operation.id,
    label: operation.title,
    detail: operation.changes.map((change) => change.after).join(' · '),
    onRemove: () => setPendingOperations((current) => current.filter((item) => item.id !== operation.id)),
  }))
  const generalItems: SaveBarItem[] = Object.entries(pendingChanges ?? {}).map(([key, change]) => ({ id: key, label: change.label, detail: `${change.before} → ${change.after}` }))
  const legacyPanel = 'rounded-[20px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-4 sm:p-6'

  function exitEditMode() {
    if (pendingOperations.length || dirtySection || pendingChanges) return setMessage('Guarda o descarta los cambios antes de salir del modo edición.')
    setEditMode(false)
    setMessage('')
    if (section === 'generador') setSection('resumen')
  }

  return <main className="min-h-screen px-4 py-6 sm:px-6 lg:ml-64 lg:px-10"><div className="mx-auto max-w-6xl space-y-5">
    <div className="ax-v2 space-y-5">
      <button type="button" onClick={() => router.back()} className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-1 text-sm font-semibold text-[var(--ax-muted)] transition-colors hover:text-[var(--ax-text)]"><ArrowLeft size={17} aria-hidden="true" />Volver</button>
      <TournamentHero
        name={tournament.name}
        sport={sport}
        photoUrl={tournament.cover_url}
        code={tournament.athlonx_code}
        badges={<>
          <StatusBadge status={tournament.status} />
          {tournament.modality && <Badge tone="success" dot={false}>{tournament.modality.name}</Badge>}
          {tournament.is_quick ? <Badge tone="warning">Torneo rápido</Badge> : <Badge>Oficial</Badge>}
          {tournament.season && <Badge>Temporada {tournament.season}</Badge>}
        </>}
        meta={defaultMeta(formatDateRange(tournament.start_date, tournament.end_date), [tournament.location, tournament.country].filter(Boolean).join(', '), tournament.organization?.name || tournament.organizer_team?.name)}
        actions={canManage && (editMode
          ? <><Badge tone="warning">Modo edición</Badge><Button variant="ghost" icon={X} onClick={exitEditMode}>Salir de edición</Button></>
          : <Button variant="primary" icon={Pencil} onClick={() => { setEditMode(true); setMessage('') }}>Editar torneo</Button>)}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">{stats.map((stat) => <StatTile key={stat.label} {...stat} />)}</div>
      <TournamentTabs tabs={tabs} active={section} onChange={(value) => requestSection(value)} />
      {pendingSection && <Notice tone="warning" icon={CircleAlert} action={<div className="flex shrink-0 gap-2"><Button size="sm" variant="ghost" onClick={() => setPendingSection(null)}>Seguir editando</Button><Button size="sm" variant="danger" onClick={discardUnsavedChanges}>Descartar</Button><Button size="sm" variant="primary" onClick={saveBeforeNavigate}>Guardar</Button></div>}>Tienes cambios sin guardar en esta sección. Guárdalos o descártalos antes de cambiar de pestaña.</Notice>}
      {message && !pendingChanges && !showOperationSave && <Notice tone={/no se|no es|no puede|no hay|error|debe|necesita|máximo|completa|selecciona|guarda o descarta/i.test(message) ? 'warning' : 'success'} icon={/no se|no es|no puede|error/i.test(message) ? CircleAlert : Check}>{message}</Notice>}
    </div>

    {isBasketball && section === 'partidos' && <div className={legacyPanel}>{basketballPanel('partidos')}</div>}
    {isBasketball && section === 'equipos' && <div className={legacyPanel}>{basketballPanel('equipos')}</div>}
    {isBasketball && section === 'general' && <div className={legacyPanel}>{basketballPanel('general')}</div>}

    {section === 'resumen' && !isBasketball && <SummarySection
      tournament={tournament}
      divisions={data.divisions ?? []}
      teams={teams}
      matches={matches}
      events={matchEvents}
      corrections={matchEventCorrections}
      rosters={rosters}
      onOpenFixtures={() => requestSection(canManage ? 'generador' : isFootballEightKnockout ? 'llaves' : 'fixtures')}
      directKnockout={isFootballEightKnockout}
      canManage={canManage && editMode}
    />}

    {section === 'tablas' && !isBasketball && <StandingsSection
      tournament={tournament}
      teams={teams}
      matches={matches.filter((match) => (stageByFixture[match.fixture_id] || 'league') === 'league')}
      playoffMatches={matches.filter((match) => ['semifinal', 'final'].includes(stageByFixture[match.fixture_id] || '')).map((match) => ({ ...match, stage: stageByFixture[match.fixture_id] }))}
      zoneSize={sport === 'rugby' ? (leagueSettings?.format === 'league_playoffs' ? leagueSettings.playoffTeams : 0) : undefined}
    />}

    {section === 'llaves' && showBracketTab && <TournamentKnockoutBracket
      tournamentId={tournament.id}
      teams={teams}
      matches={matches}
      events={matchEvents}
      canManage={canManage && editMode}
      footballEight={isFootballEightKnockout}
      discipline={tournament.discipline?.code}
      tournamentName={tournament.name}
    />}

    {section === 'equipos' && <div className={legacyPanel}>{tournament.is_quick
      ? <QuickTournamentTeamsSection
        teams={teams}
        rosters={rosters}
        divisions={data.divisions ?? []}
        availableTeams={availableTeams.filter((team) => (
          (!isBasketball || team.discipline_id === tournament.discipline?.id) &&
          !teams.some((current) => (
            teamIdentityKey(current) === teamIdentityKey(team)
          ))
        ))}
        availablePlayers={availablePlayers}
        modality={tournament.modality}
        officialPlayerId={officialPlayerId}
        maxTeams={maxTeamsLimit}
        maxRoster={isBasketball ? basketball.maxRoster : undefined}
        canManage={canManage}
        editMode={editMode}
        currentUserId={currentUserId}
        onAddTeam={requestAddTeam}
        onAddQuickTeam={requestAddQuickTeam}
        onRemoveTeam={requestRemoveTeam}
        onAddQuickPlayer={requestAddQuickPlayer}
        onAddExistingPlayer={requestAddExistingPlayer}
        onClaimGuestPlayer={requestClaimGuestPlayer}
        onNumberRequest={(request) => setNumberRequest(request)}
      />
      : <TournamentTeamsSection
        teams={teams}
        allDivisions={data.divisions ?? []}
        availableTeams={availableTeams.filter((team) => (
          (!isBasketball || team.discipline_id === tournament.discipline?.id) &&
          !teams.some((current) => (
            teamIdentityKey(current) === teamIdentityKey(team)
          ))
        ))}
        fixtureDates={fixtureDates}
        callups={fixtureCallups}
        callupPlayers={fixtureCallupPlayers}
        rosters={rosters}
        canManage={canManage}
        editMode={editMode}
        onAddTeam={requestAddTeam}
        onRemoveTeam={requestRemoveTeam}
        renderTeamDetails={(team, teamRoster) => (
          <TeamFixtureCallupDates
            team={team}
            fixtureDates={fixtureDates}
            callups={fixtureCallups}
            callupPlayers={fixtureCallupPlayers}
            rosters={teamRoster}
            canManage={canManage}
          />
        )}
      />}</div>}

    {section === 'convocatorias' && !tournament.is_quick
      && <div className={legacyPanel}><TournamentCallupsPanel
        tournamentId={tournament.id}
        divisions={data.divisions ?? []}
        teams={teams}
        matches={matches}
        rosters={rosters}
        isOwner={canManage}
        initialMatchId={searchParams.get('matchId') || undefined}
        initialTeamId={searchParams.get('teamId') || undefined}
      /></div>}

    {section === 'fixtures' && showFixtureSections && !isBasketball && <div className={legacyPanel}><FixtureListSection
      tournament={tournament}
      teams={teams}
      dates={dates}
      matches={matches}
    /></div>}

    {section === 'generador' && canManage
      && <TournamentFixtureGenerator
        tournamentId={tournament.id}
        tournamentName={tournament.name}
        tournamentStatus={tournament.status}
        competitionFormat={competitionFormat}
        footballEight={isFootballEightKnockout}
        discipline={tournament.discipline?.code}
        divisions={data.divisions ?? []}
        teams={teams}
        matches={matches}
        events={matchEvents}
        stageByFixture={stageByFixture}
        leagueSettings={leagueSettings ?? { format: 'round_robin', legs: 1, playoffTeams: 4, courts: 1, halfMinutes: 7, halftimeMinutes: 2, intervalMinutes: 10 }}
        adjustments={Object.fromEntries(standingAdjustments.map((item) => [item.team_id, item.points_adjustment]))}
        startDate={tournament.start_date}
        canManage={canManage}
        onQueueSchedule={requestScheduleFixture}
        onOpenCalendar={() => requestSection(isKnockoutFormat ? (isBasketball ? 'fixtures' : 'llaves') : 'fixtures')}
      />}

    {section === 'partidos' && !isBasketball && <MatchesSection
      matches={matches}
      dates={dates}
      events={matchEvents}
      corrections={matchEventCorrections}
      rosters={rosters}
      onOpenFixtures={() => requestSection(canManage ? 'generador' : 'fixtures')}
      canManage={canManage && editMode}
    />}

    {section === 'general' && <div className={legacyPanel}><GeneralInfoSection
      tournament={tournament}
      divisions={data.divisions ?? []}
      disciplines={disciplines}
      modalities={modalities}
      pointRules={pointRules}
      competition={{ courts: leagueSettings?.courts ?? 1, intervalMinutes: leagueSettings?.intervalMinutes ?? 10, format: leagueSettings?.format ?? '', legs: leagueSettings?.legs ?? 1, playoffTeams: leagueSettings?.playoffTeams ?? 0, maxTeams: maxTeamsLimit, maxRoster: maxRosterLimit }}
      playersOnField={modalityRule?.players_on_field ?? null}
      canManage={canManage}
      editMode={editMode && canManage}
      onRequestSave={requestSave}
      onDirtyChange={(dirty) => setDirtySection(dirty ? 'general' : null)}
      onCancel={() => {
        setEditMode(false)
        setDirtySection(null)
        setMessage('')
      }}
      onEdit={() => {
        if (canManage) setEditMode(true)
      }}
    /></div>}

    {section === 'historial' && <EditHistorySection history={history} />}

    {pendingChanges && Object.keys(pendingChanges).length > 0 && <div className="ax-v2"><SaveBar key="general" initiallyConfirming items={generalItems} error={message} onDiscard={() => { setPendingChanges(null); setPendingDivisionNames(null); setMessage('') }} onConfirm={confirmSave} /></div>}
    {!pendingChanges && pendingOperations.length > 0 && <div className="ax-v2"><SaveBar key={`operations-${showOperationSave}`} initiallyConfirming={showOperationSave} items={operationItems} error={showOperationSave ? message : ''} saving={savingOperations} onDiscard={() => { setPendingOperations([]); setShowOperationSave(false); setMessage('') }} onConfirm={(password) => { setShowOperationSave(true); return confirmOperations(password) }} /></div>}
  </div>{numberRequest && <PlayerNumberRequestModal request={numberRequest} onCancel={() => setNumberRequest(null)} onSubmit={(requestedNumber) => void requestPlayerNumber(numberRequest.teamId, numberRequest.playerId, numberRequest.playerName, numberRequest.currentNumber, requestedNumber)} />}</main>
}

function SummarySection({ tournament, divisions, teams, matches, events, corrections, rosters, onOpenFixtures, directKnockout, canManage }: { tournament: Tournament; divisions: Division[]; teams: TournamentTeam[]; matches: Match[]; events: MatchEvent[]; corrections: MatchEventCorrection[]; rosters: RosterEntry[]; onOpenFixtures: () => void; directKnockout: boolean; canManage: boolean }) {
  const featuredMatch = getFeaturedMatch(matches)
  const uniqueTeamCount = new Set(teams.map((team) => team.id)).size
  const upcoming = matches.filter((match) => match.status === 'scheduled' && match.id !== featuredMatch?.id)
    .sort((left, right) => left.date_number - right.date_number || (left.scheduled_time || '').localeCompare(right.scheduled_time || '')).slice(0, 5)
  const recent = matches.filter((match) => match.status === 'finished' && match.id !== featuredMatch?.id)
    .sort((left, right) => right.date_number - left.date_number || (right.scheduled_time || '').localeCompare(left.scheduled_time || '')).slice(0, 5)
  const facts = [
    ['Tipo', tournament.is_quick ? 'Torneo rápido · por invitación o equipos creados aquí' : 'Oficial · solo por invitación'],
    ['Organiza', tournament.organization?.name || tournament.organizer_team?.name || 'Torneo independiente'],
    ['Disciplina', [tournament.discipline?.name, tournament.modality?.name].filter(Boolean).join(' · ') || 'No especificada'],
    ['Divisiones', divisions.map((division) => division.name).join(' · ') || 'Sin divisiones'],
    ['Participación', `${uniqueTeamCount} equipos · ${matches.length} partidos`],
  ]
  const list = (title: string, id: string, rows: Match[], empty: string) => <Card labelledBy={id}>
    <CardHeader id={id} title={title} />
    {rows.length ? <div className="mt-3 space-y-0.5">{rows.map((match) => <MatchRow key={match.id} match={match} selected={false} onPreview={onOpenFixtures} />)}</div> : <p className="mt-3 text-[13px] text-[var(--ax-muted)]">{empty}</p>}
  </Card>
  return <div className="ax-v2 space-y-5">
    <DivisionWinners tournament={tournament} teams={teams} matches={matches} />
    {featuredMatch
      ? <MatchHighlight match={featuredMatch} events={events.filter((event) => event.match_id === featuredMatch.id)} corrections={corrections.filter((correction) => correction.match_id === featuredMatch.id)} rosters={rosters} />
      : <Card><EmptyState icon={CalendarDays} title="Aún no hay partidos" description={directKnockout ? 'La llave todavía no se ha generado.' : 'Todavía no se ha generado el fixture.'} action={canManage ? <Button variant="primary" onClick={onOpenFixtures}>{directKnockout ? 'Generar llave' : 'Generar fixture'}</Button> : undefined} /></Card>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      <div className="space-y-5">
        {list('Próximos partidos', 'summary-upcoming', upcoming, 'No hay partidos programados.')}
        {list('Últimos resultados', 'summary-recent', recent, 'Todavía no hay resultados.')}
      </div>
      <Card labelledBy="summary-facts">
        <CardHeader id="summary-facts" title="Datos del torneo" />
        <dl className="mt-3 divide-y divide-[var(--ax-line)]">{facts.map(([label, value]) => <div key={label} className="py-2.5"><dt className="text-xs text-[var(--ax-muted)]">{label}</dt><dd className="mt-0.5 text-sm font-medium text-[var(--ax-text)]">{value}</dd></div>)}</dl>
      </Card>
    </div>
  </div>
}

function formatTournamentFixtureDateLabel(fixture: TournamentFixtureDate) {
  const dateLabel = fixture.calendarDate ? new Intl.DateTimeFormat('es-PA', { day: 'numeric', month: 'short' }).format(new Date(`${fixture.calendarDate}T12:00:00`)) : ''
  return `Fecha ${fixture.dateNumber}${dateLabel ? ` · ${dateLabel}` : ''}`
}

function TeamsSection({ teams, rosters, fixtureDates, divisions: allDivisions, availableTeams, maxTeams, callups, callupPlayers, canManage, editMode, onAddTeam, onRemoveTeam }: { teams: TournamentTeam[]; rosters: RosterEntry[]; dates: number[]; fixtureDates: TournamentFixtureDate[]; divisions: Division[]; availableTeams: TeamSummary[]; maxTeams?: number | null; callups: TournamentFixtureCallup[]; callupPlayers: TournamentFixtureCallupPlayer[]; canManage: boolean; editMode: boolean; currentUserId: string; onAddTeam: (teamId: string, divisionId: string) => void; onRemoveTeam: (team: TournamentTeam) => void; onNumberRequest: (request: { teamId: string; playerId: string; playerName: string; currentNumber: number | null }) => void }) {
  const [expandedTeams, setExpandedTeams] = useState<string[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showRemove, setShowRemove] = useState(false)
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<Record<string, string>>({})
  const [teamQuery, setTeamQuery] = useState('')
  const filteredTeams = availableTeams.filter((team) => !selectedTeamIds.includes(team.id) && `${team.name} ${team.handle || ''} ${team.athlonx_code || ''}`.toLowerCase().includes(teamQuery.toLowerCase()))
  const hasTeamCapacity = !maxTeams || teams.length < maxTeams
  function getCompatibleDivisions(team: TeamSummary) {
    return team.divisionNames?.length ? allDivisions.filter((division) => team.divisionNames?.some((name) => normalizeDivisionName(name) === normalizeDivisionName(division.name))) : allDivisions
  }
  const groupedTeams = teams.map((team) => ({ ...team, divisions: [team.division_name] }))
  return <div className="pt-6"><div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Participantes</p><h2 className="mt-2 font-display text-3xl uppercase">Equipos y plantillas</h2><p className="mt-2 text-sm text-slate-400">Despliega un equipo y pulsa una fecha para consultar los jugadores convocados de esa jornada.</p></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300">{groupedTeams.length} equipos</span>{canManage && editMode && <><button type="button" onClick={() => { setShowAdd(!showAdd); setShowRemove(false) }} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-3 py-2 text-xs font-bold text-[#07131e]"><Users size={15} />Invitar equipo</button><button type="button" onClick={() => { setShowRemove(!showRemove); setShowAdd(false) }} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#ff7d88]/50 px-3 py-2 text-xs font-bold text-[#ff9ca5]"><X size={15} />Expulsar</button></>}</div></div>{canManage && editMode && showAdd && <form onSubmit={(event) => { event.preventDefault(); selectedTeamIds.forEach((teamId) => onAddTeam(teamId, selectedDivisionIds[teamId] || '')); setSelectedTeamIds([]); setSelectedDivisionIds({}); setTeamQuery(''); setShowAdd(false) }} className="mt-5 grid gap-3 rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/5 p-4 sm:grid-cols-[1fr_1fr_auto]"><label className="text-sm font-semibold sm:col-span-2">Buscar equipo registrado<div className="relative mt-2"><Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" /><input value={teamQuery} onChange={(event) => setTeamQuery(event.target.value)} placeholder="Nombre, @usuario o código AthlonX" className="w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] py-3 pl-10 pr-3 outline-none focus:border-[#b4ff45]" /></div>{teamQuery && <div className="mt-2 max-h-40 overflow-y-auto rounded-[5px] border border-[#31556b] bg-[#0d2232]">{filteredTeams.map((team) => <button key={team.id} type="button" onClick={() => { setSelectedTeamIds((current) => current.includes(team.id) ? current : [...current, team.id]); setSelectedDivisionIds((current) => ({ ...current, [team.id]: getCompatibleDivisions(team)[0]?.id || '' })); setTeamQuery('') }} className={`block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-[#b4ff45]/10 ${selectedTeamIds.includes(team.id) ? 'bg-[#b4ff45]/10 text-[#dfffba]' : 'text-slate-200'}`}>{team.name}<span className="ml-2 text-xs text-slate-500">{team.athlonx_code || team.handle || ''}</span></button>)}{!filteredTeams.length && <p className="px-3 py-3 text-sm text-slate-500">No se encontraron equipos.</p>}</div>}</label>{selectedTeamIds.length > 0 && <div className="mt-4 space-y-2">{selectedTeamIds.map((selectedId) => { const team = availableTeams.find((item) => item.id === selectedId); if (!team) return null; const options = getCompatibleDivisions(team); return <div key={selectedId} className="rounded-[5px] border border-[#31556b] bg-[#0d2232] p-3"><div className="flex items-center justify-between gap-3"><span className="font-semibold">{team.name}</span><button type="button" onClick={() => { setSelectedTeamIds((current) => current.filter((id) => id !== selectedId)); setSelectedDivisionIds((current) => { const next = { ...current }; delete next[selectedId]; return next }) }} className="cursor-pointer text-xs font-bold text-[#ff9ca5]">Quitar</button></div><StyledSelect label="División" value={selectedDivisionIds[selectedId] || ''} onChange={(value) => setSelectedDivisionIds((current) => ({ ...current, [selectedId]: value }))} options={[{ value: '', label: 'Seleccionar división' }, ...options.map((division) => ({ value: division.id, label: division.name }))]} required /></div> })}</div>}<button type="submit" disabled={!selectedTeamIds.length || selectedTeamIds.some((selectedId) => !selectedDivisionIds[selectedId])} className="self-end rounded-[5px] bg-[#b4ff45] px-4 py-3 font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50">Enviar invitación</button></form>}{canManage && editMode && showRemove && <p className="mt-5 rounded-[5px] border border-[#ff7d88]/30 bg-[#ff7d88]/5 p-4 text-sm text-[#ffb0b7]">Selecciona “Expulsar del torneo” en el equipo que deseas retirar.</p>}
    <div className="mt-6 space-y-3">
      {groupedTeams.length ? groupedTeams.map((team) => {
        const teamKey = `${team.id}-${team.division_id}`
        const expanded = expandedTeams.includes(teamKey)
        const teamRoster = rosters.filter((player) => player.team_id === team.id && (!player.division_id || player.division_id === team.division_id || normalizeDivisionName(player.division_name || '') === normalizeDivisionName(team.division_name)))
        return (
          <article key={teamKey} className="rounded-[5px] border border-[#29485d] bg-[#07131e]">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={`team-dates-${teamKey}`}
              onClick={() => setExpandedTeams((current) => current.includes(teamKey) ? current.filter((id) => id !== teamKey) : [...current, teamKey])}
              className="flex w-full cursor-pointer items-center gap-3 p-4 text-left sm:p-5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-[#b4ff45]/15 font-bold text-[#b4ff45]">
                {team.logo_url ? <img src={team.logo_url} alt="" className="h-full w-full object-cover" /> : team.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{team.name}</p>
                <p className="mt-1 text-xs text-slate-400">{team.divisions.join(' · ')} · {team.athlonx_code || 'Código pendiente'}</p>
              </div>
              <ChevronDown size={18} className={`shrink-0 text-[#b4ff45] transition ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {showRemove && canManage && editMode && (
              <div className="border-t border-white/10 px-4 pb-4 pt-3 sm:px-5">
                <button type="button" onClick={() => onRemoveTeam(team)} className="rounded-[5px] border border-[#ff7d88]/50 px-3 py-2 text-xs font-bold text-[#ffb0b7]">Expulsar del torneo</button>
              </div>
            )}
            {expanded && (
              <div id={`team-dates-${teamKey}`} className="border-t border-white/10 p-4 sm:p-5">
                <TeamFixtureCallupDates team={team} fixtureDates={fixtureDates} callups={callups} callupPlayers={callupPlayers} rosters={teamRoster} canManage={canManage} />
              </div>
            )}
          </article>
        )
      }) : <p className="text-sm text-slate-500">Todavía no hay equipos inscritos.</p>}
    </div>
  </div>
}

function TeamFixtureCallupDates({ team, fixtureDates, callups, callupPlayers, rosters, canManage }: {
  team: TournamentTeam
  fixtureDates: TournamentFixtureDate[]
  callups: TournamentFixtureCallup[]
  callupPlayers: TournamentFixtureCallupPlayer[]
  rosters: RosterEntry[]
  canManage: boolean
}) {
  const [editingCallupId, setEditingCallupId] = useState<string | null>(null)
  const [shirtDrafts, setShirtDrafts] = useState<Record<string, string>>({})
  const [shirtOverrides, setShirtOverrides] = useState<Record<string, number | null>>({})
  const [saving, setSaving] = useState(false)

  if (!fixtureDates.length) return <p className="text-sm text-slate-400">Todavía no hay fechas generadas para este torneo.</p>

  async function saveShirtNumber(callupId: string, playerId: string) {
    if (!supabase || !canManage) return
    const raw = shirtDrafts[`${callupId}:${playerId}`] ?? ''
    const value = raw === '' ? null : Number(raw)
    if (value !== null && (!Number.isInteger(value) || value < 0 || value > 99)) return window.alert('El número debe estar entre 0 y 99.')
    setSaving(true)
    const { error } = await supabase.rpc('update_tournament_fixture_callup_player_number', { p_callup_id: callupId, p_player_id: playerId, p_shirt_number: value })
    setSaving(false)
    if (error) return window.alert(error.message)
    setShirtOverrides((current) => ({ ...current, [`${callupId}:${playerId}`]: value }))
  }

  async function confirmInactive(callupId: string, playerId: string, playerName: string) {
    if (!supabase || !canManage || !window.confirm(`¿Confirmar a ${playerName} como jugador 13? Esta decisión no se podrá cambiar.`)) return
    setSaving(true)
    const { error } = await supabase.rpc('set_tournament_fixture_callup_non_participant_by_organizer', { p_callup_id: callupId, p_player_id: playerId })
    setSaving(false)
    if (error) return window.alert(error.message)
    window.location.reload()
  }

  return (
    <div className="space-y-3">
      {[...fixtureDates].sort((left, right) => left.dateNumber - right.dateNumber).map((fixture) => {
        const callup = callups.find((item) => item.fixture_id === fixture.fixtureId && item.team_id === team.id && item.division_id === team.division_id)
        const players = callup ? callupPlayers.filter((player) => player.callup_id === callup.id && player.state !== 'no_convocado') : []
        const isInactiveConfirmed = Boolean(callupPlayers.find((player) => player.callup_id === callup?.id && player.state === 'no_participante'))
        const editing = editingCallupId === callup?.id

        return (
          <details key={`${team.id}-${team.division_id}-${fixture.fixtureId}`} className="group/fixture overflow-hidden rounded-[5px] border border-[#29485d] bg-[#0b1d2c]">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 transition hover:bg-[#b4ff45]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b4ff45] [&::-webkit-details-marker]:hidden">
              <CalendarDays size={18} aria-hidden="true" className="shrink-0 text-[#b4ff45]" />
              <span className="min-w-0 flex-1 font-bold text-slate-100">{formatTournamentFixtureDateLabel(fixture)}</span>
              <span className="text-xs text-slate-400">{players.length} convocados</span>
              <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-[#b4ff45] transition group-open/fixture:rotate-180" />
            </summary>
            <div className="border-t border-white/10 p-4">
              {players.length ? (
                <>
                  {canManage && callup && <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-400">El organizador puede editar los números. La decisión del jugador 13 se gestiona por separado.</p><button type="button" onClick={() => setEditingCallupId(editing ? null : callup.id)} className="rounded-[5px] border border-[#b4ff45]/60 px-3 py-2 text-xs font-bold text-[#dfffba]">{editing ? 'Cancelar edición' : 'Editar números'}</button></div>}
                  <ul aria-label={`Convocados de ${team.name}, ${team.division_name}, Fecha ${fixture.dateNumber}`} className="grid gap-2 sm:grid-cols-2">
                  {players.map((callupPlayer) => {
                    const player = rosters.find((item) => item.player_id === callupPlayer.player_id)
                    const playerKey = `${callupPlayer.callup_id}:${callupPlayer.player_id}`
                    const number = shirtOverrides[playerKey] ?? callupPlayer.shirt_number
                    const isInactive = callupPlayer.state === 'no_participante'
                    return (
                      <li key={callupPlayer.player_id} className={`flex items-center justify-between gap-3 rounded-[5px] border px-3 py-2 text-sm ${isInactive ? 'border-red-300/30 bg-red-300/10' : 'border-[#b4ff45]/20 bg-[#b4ff45]/5'}`}>
                        <span className="min-w-0 break-words">{player?.full_name || 'Jugador convocado'}{isInactive && <span className="ml-2 rounded-full border border-red-300/30 px-2 py-0.5 text-[10px] font-bold uppercase text-red-200">No participante</span>}</span>
                        {editing ? <div className="flex items-center gap-2"><input type="number" min="0" max="99" value={shirtDrafts[playerKey] ?? (number === null ? '' : String(number))} onChange={(event) => setShirtDrafts((current) => ({ ...current, [playerKey]: event.target.value }))} className="w-16 rounded-[5px] border border-[#31556b] bg-[#07131e] px-2 py-1 text-center text-xs text-white" /><button type="button" disabled={saving} onClick={() => void saveShirtNumber(callupPlayer.callup_id, callupPlayer.player_id)} className="rounded-[5px] border border-[#b4ff45]/60 px-2 py-1 text-[10px] font-bold text-[#dfffba]">Guardar</button></div> : <span className="shrink-0 text-xs text-slate-400">#{number ?? '--'}</span>}
                      </li>
                    )
                  })}
                  </ul>
                  {canManage && callup && players.length < 13 && <p className="mt-4 rounded-[5px] border border-[#ffb45c]/30 bg-[#ffb45c]/5 p-3 text-xs text-[#ffd09b]">Este equipo no cuenta con los 13 jugadores convocados; no se puede definir un jugador 13.</p>}
                  {canManage && callup && editing && players.length >= 13 && !isInactiveConfirmed && <div className="mt-4 rounded-[5px] border border-[#ffb45c]/30 bg-[#ffb45c]/5 p-3"><p className="text-xs font-bold uppercase tracking-wider text-[#ffd09b]">Jugador 13</p><p className="mt-1 text-xs text-slate-400">Una vez confirmado, esta decisión bloqueará únicamente al jugador 13 y no podrá cambiarse. Los números seguirán siendo editables.</p><div className="mt-3 flex flex-wrap items-center gap-2"><select defaultValue="" className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-3 py-2 text-xs text-slate-200"><option value="">Seleccionar jugador</option>{players.filter((player) => player.state !== 'no_participante').map((player) => <option key={player.player_id} value={player.player_id}>{rosters.find((item) => item.player_id === player.player_id)?.full_name || 'Jugador'}</option>)}</select><button type="button" onClick={(event) => { const select = event.currentTarget.previousElementSibling as HTMLSelectElement | null; if (select?.value) void confirmInactive(callup.id, select.value, select.options[select.selectedIndex]?.text || 'el jugador') }} className="rounded-[5px] bg-[#ffb45c] px-3 py-2 text-xs font-bold text-[#07131e]">Confirmar jugador 13</button></div></div>}
                </>
              ) : (
                <p className="text-sm text-slate-400">{callup ? 'Todavía no hay jugadores convocados en esta lista.' : 'Este equipo todavía no ha enviado la lista para esta fecha.'}</p>
              )}
            </div>
          </details>
        )
      })}
    </div>
  )
}

function LegacyFixtureListSection({ tournament, teams, dates, matches }: { tournament: Tournament; teams: TournamentTeam[]; dates: number[]; matches: Match[] }) {
  const [canManage, setCanManage] = useState(false)
  const [editingDate, setEditingDate] = useState<number | null>(null)
  const [draftDates, setDraftDates] = useState<Record<string, string>>({})
  const [draftTimes, setDraftTimes] = useState<Record<string, string>>({})
  const [draftCourts, setDraftCourts] = useState<Record<string, string>>({})
  const [courtsCount, setCourtsCount] = useState(1)
  const [draftPairs, setDraftPairs] = useState<Record<string, { localTeamId: string; visitorTeamId: string }>>({})
  const [deletedMatchIds, setDeletedMatchIds] = useState<string[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      const { data: tournamentRow } = await supabase.from('tournaments').select('created_by').eq('id', tournament.id).maybeSingle()
      if (active) setCanManage(tournamentRow?.created_by === userData.user.id)
    })()
    return () => { active = false }
  }, [tournament.id])

  useEffect(() => {
    setDraftDates(Object.fromEntries(dates.map((date) => [String(date), matches.find((match) => match.date_number === date)?.calendar_date || tournament.start_date || ''])))
    setDraftTimes(Object.fromEntries(matches.map((match) => [match.id, match.scheduled_time || ''])))
    setDraftPairs(Object.fromEntries(matches.map((match) => [match.id, { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }])))
  }, [dates.join(','), matches.map((match) => `${match.id}:${match.calendar_date || ''}:${match.scheduled_time || ''}:${match.local_team_id}:${match.visitor_team_id}`).join('|'), tournament.start_date])

  async function saveDate(date: number) {
    const dateMatches = matches.filter((match) => match.date_number === date && !deletedMatchIds.includes(match.id))
    const source = matches.find((match) => match.date_number === date)
    if (!source) return
    setMessage('')
    const occupiedTeams = new Set<string>()
    for (const match of dateMatches) {
      const nextPair = draftPairs[match.id] || { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }
      if (!nextPair.localTeamId || !nextPair.visitorTeamId || nextPair.localTeamId === nextPair.visitorTeamId) return setMessage('Cada enfrentamiento debe tener dos equipos diferentes.')
      if (occupiedTeams.has(nextPair.localTeamId) || occupiedTeams.has(nextPair.visitorTeamId)) return setMessage('Un equipo no puede jugar dos veces en la misma fecha.')
      occupiedTeams.add(nextPair.localTeamId)
      occupiedTeams.add(nextPair.visitorTeamId)
    }
    if (draftDates[String(date)] !== (source.calendar_date || '')) {
      const { error } = await supabase.from('fixtures').update({ calendar_date: draftDates[String(date)] || null }).eq('id', source.fixture_id)
      if (error) return setMessage(error.message)
    }
    for (const match of dateMatches) {
      const nextPair = draftPairs[match.id] || { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }
      const nextTime = draftTimes[match.id] || null
      if (nextTime !== match.scheduled_time || nextPair.localTeamId !== match.local_team_id || nextPair.visitorTeamId !== match.visitor_team_id) {
        const { error } = await supabase.from('matches').update({ scheduled_time: nextTime, local_team_id: nextPair.localTeamId, visitor_team_id: nextPair.visitorTeamId }).eq('id', match.id)
        if (error) return setMessage(error.message)
      }
    }
    if (deletedMatchIds.length) {
      const { error } = await supabase.from('matches').delete().in('id', deletedMatchIds)
      if (error) return setMessage(error.message)
    }
    setMessage(`Fecha ${date} actualizada correctamente.`)
    setDeletedMatchIds([])
    setEditingDate(null)
    window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
    window.setTimeout(() => window.location.reload(), 250)
  }

  async function deleteDate(date: number) {
    if (!window.confirm(`¿Seguro que deseas eliminar la Fecha ${date} completa?`)) return
    const fixtureIds = Array.from(new Set(matches.filter((match) => match.date_number === date).map((match) => match.fixture_id)))
    if (!fixtureIds.length) return
    const { error: matchesError } = await supabase.from('matches').delete().in('fixture_id', fixtureIds)
    if (matchesError) return setMessage(matchesError.message)
    const { error } = await supabase.from('fixtures').delete().in('id', fixtureIds)
    if (error) return setMessage(error.message)
    window.location.reload()
  }

  async function deleteMatch(matchId: string) {
    if (!window.confirm('¿Seguro que deseas eliminar este enfrentamiento?')) return
    setDeletedMatchIds((current) => [...current, matchId])
  }

  const fixtureGroups = dates.map((date) => ({ date, matches: matches.filter((match) => match.date_number === date) }))

  return <section className="pt-6 print:hidden"><div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Consulta</p><h2 className="mt-2 font-display text-3xl uppercase">Fixtures</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">Edita equipos, horarios y fechas. Los cambios se guardan directamente en Supabase.</p></div></div>{!matches.length && <div className="mt-6 rounded-[5px] border border-dashed border-[#31556b] bg-[#07131e] p-6 text-sm text-slate-400">Todavía no hay fixtures creados.</div>}<div className="mt-6 space-y-5">{fixtureGroups.map((fixture) => { const isEditing = editingDate === fixture.date; const visibleMatches = fixture.matches.filter((match) => !deletedMatchIds.includes(match.id)); const calendarDate = draftDates[String(fixture.date)] || fixture.matches[0]?.calendar_date || tournament.start_date || ''; return <article key={fixture.date} className="rounded-[5px] border border-[#31556b] bg-[#07131e] p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Fecha {fixture.date}</p>{isEditing ? <input type="date" value={calendarDate} onChange={(event) => setDraftDates((current) => ({ ...current, [String(fixture.date)]: event.target.value }))} className="mt-2 rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-3 py-2 text-sm text-slate-200" /> : <p className="mt-2 text-sm capitalize text-slate-300">{calendarDate ? new Date(`${calendarDate}T00:00:00`).toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha por definir'}</p>}</div>{canManage && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setEditingDate(isEditing ? null : fixture.date); setDeletedMatchIds([]) }} className="rounded-[5px] border border-[#b4ff45]/60 px-3 py-2 text-xs font-bold text-[#dfffba]">{isEditing ? 'Cancelar' : 'Editar'}</button>{isEditing && <><button type="button" onClick={() => void saveDate(fixture.date)} className="inline-flex items-center gap-2 rounded-[5px] bg-[#b4ff45] px-3 py-2 text-xs font-bold text-[#07131e]"><Check size={15} />Guardar</button><button type="button" onClick={() => void deleteDate(fixture.date)} className="inline-flex items-center gap-2 rounded-[5px] border border-[#ff7d88]/60 px-3 py-2 text-xs font-bold text-[#ffb0b7]"><Trash2 size={15} />Eliminar fecha</button></>}</div>}</div><div className="mt-3 divide-y divide-white/10">{visibleMatches.map((match) => { const pair = draftPairs[match.id] || { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }; const divisionId = teams.find((team) => team.id === pair.localTeamId)?.division_id || teams.find((team) => team.id === pair.visitorTeamId)?.division_id; const options = teams.filter((team) => team.division_id === divisionId); return <div key={match.id} className="grid gap-3 py-4 sm:grid-cols-[120px_1fr_180px] sm:items-center"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{match.division_name || 'General'}</span>{isEditing ? <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select value={pair.localTeamId} onChange={(event) => setDraftPairs((current) => ({ ...current, [match.id]: { ...pair, localTeamId: event.target.value } }))} className="rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-2 py-2 text-sm text-slate-200"><option value="">Local</option>{options.map((team) => <option key={`local-${match.id}-${team.id}`} value={team.id}>{team.name}</option>)}</select><select value={pair.visitorTeamId} onChange={(event) => setDraftPairs((current) => ({ ...current, [match.id]: { ...pair, visitorTeamId: event.target.value } }))} className="rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-2 py-2 text-sm text-slate-200"><option value="">Visitante</option>{options.filter((team) => team.id !== pair.localTeamId).map((team) => <option key={`visitor-${match.id}-${team.id}`} value={team.id}>{team.name}</option>)}</select><button type="button" onClick={() => void deleteMatch(match.id)} className="rounded-[5px] border border-[#ff7d88]/50 px-2 py-2 text-[#ffb0b7]"><Trash2 size={15} /></button><div className={`grid gap-2 sm:col-span-3 ${courtsCount > 1 ? 'grid-cols-2' : ''}`}><input type="time" value={draftTimes[match.id] || ''} onChange={(event) => setDraftTimes((current) => ({ ...current, [match.id]: event.target.value }))} className="rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-2 py-2 text-sm text-slate-200" />{courtsCount > 1 && <select aria-label="Cancha" value={draftCourts[match.id] || ''} onChange={(event) => setDraftCourts((current) => ({ ...current, [match.id]: event.target.value }))} className="rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-2 py-2 text-sm text-slate-200"><option value="">Sin cancha</option>{Array.from({ length: courtsCount }, (_, index) => index + 1).map((court) => <option key={court} value={court}>Cancha {court}</option>)}</select>}</div></div> : <><div className="font-semibold text-slate-100"><span>{match.local_team_name}</span><span className="px-2 text-slate-500">vs.</span><span>{match.visitor_team_name}</span></div><span className="flex items-center gap-2 text-sm text-slate-400 sm:justify-end">{match.scheduled_time ? match.scheduled_time.slice(0, 5) : 'Hora por definir'}{courtsCount > 1 && <span className="rounded-full border border-[#31556b] px-2 py-0.5 text-xs font-semibold text-slate-200">{match.court_number ? `Cancha ${match.court_number}` : 'Sin cancha'}</span>}</span></>}</div> })}</div></article> })}</div>{message && <p role="status" className="mt-4 rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/10 p-4 text-sm text-[#dfffba]">{message}</p>}</section>
}

const axField = 'rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3 py-2.5 text-sm text-[var(--ax-text)] outline-none focus:border-[var(--ax-accent-text)]'
const axBtnGhost = 'inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--ax-line)] px-3.5 text-[13px] font-bold text-[var(--ax-text)] transition hover:bg-[var(--ax-hover)]'
const axBtnOutline = 'inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--ax-accent-line)] px-3.5 text-[13px] font-bold text-[var(--ax-text)] transition hover:border-[var(--ax-accent-text)]'
const axBtnPrimary = 'inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] bg-[var(--ax-accent)] px-3.5 text-[13px] font-bold text-[var(--ax-on-accent)] transition hover:opacity-90'
const axBtnDanger = 'inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--ax-danger-line)] px-3.5 text-[13px] font-bold text-[var(--ax-danger-text)] transition hover:bg-[var(--ax-danger-text)]/10'

function FixtureListSection({ tournament, teams, dates, matches }: { tournament: Tournament; teams: TournamentTeam[]; dates: number[]; matches: Match[] }) {
  const [fixtureRecords, setFixtureRecords] = useState<FixtureRecord[]>([])
  const [canManage, setCanManage] = useState(false)
  const [editingDate, setEditingDate] = useState<number | null>(null)
  const [draftDates, setDraftDates] = useState<Record<string, string>>({})
  const [draftTimes, setDraftTimes] = useState<Record<string, string>>({})
  const [draftCourts, setDraftCourts] = useState<Record<string, string>>({})
  const [courtsCount, setCourtsCount] = useState(1)
  const [draftPairs, setDraftPairs] = useState<Record<string, { localTeamId: string; visitorTeamId: string }>>({})
  const [draftRecesses, setDraftRecesses] = useState<Record<string, FixtureRecess[]>>({})
  const [deletedMatchIds, setDeletedMatchIds] = useState<string[]>([])
  const [addingDate, setAddingDate] = useState<number | null>(null)
  const [newMatch, setNewMatch] = useState<DraftNewFixtureMatch>({ divisionId: '', localTeamId: '', visitorTeamId: '', scheduledTime: '' })
  const [message, setMessage] = useState('')
  const [printTarget, setPrintTarget] = useState<number | null>(null)
  const [activeDate, setActiveDate] = useState<number | null>(null)
  const fixtureDateNumbers = Array.from(new Set([
    ...dates,
    ...fixtureRecords.map((fixture) => fixture.date_number),
  ])).sort((left, right) => left - right)

  useEffect(() => {
    let active = true
    void (async () => {
      if (!supabase) return
      const [{ data: userData }, { data: tournamentRow }, { data: rows }, { data: settings }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('tournaments').select('created_by').eq('id', tournament.id).maybeSingle(),
        supabase.from('fixtures').select('id, date_number, calendar_date, recesses').eq('tournament_id', tournament.id).order('date_number'),
        supabase.from('tournament_competition_settings').select('courts_count').eq('tournament_id', tournament.id).maybeSingle(),
      ])
      if (!active) return
      setCanManage(tournamentRow?.created_by === userData.user?.id)
      setFixtureRecords((rows ?? []) as FixtureRecord[])
      setCourtsCount(Math.max(1, Number(settings?.courts_count || 1)))
    })()
    return () => { active = false }
  }, [tournament.id])

  useEffect(() => {
    setDraftDates(Object.fromEntries(fixtureDateNumbers.map((date) => [
      String(date),
      matches.find((match) => match.date_number === date)?.calendar_date
        || fixtureRecords.find((fixture) => fixture.date_number === date)?.calendar_date
        || tournament.start_date
        || '',
    ])))
    setDraftTimes(Object.fromEntries(matches.map((match) => [match.id, match.scheduled_time || ''])))
    setDraftCourts(Object.fromEntries(matches.map((match) => [match.id, String(match.court_number || '')])))
    setDraftPairs(Object.fromEntries(matches.map((match) => [match.id, { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }])))
    setDraftRecesses(Object.fromEntries(fixtureDateNumbers.map((date) => {
      const fixture = fixtureRecords.find((item) => item.date_number === date)
      return [String(date), normalizeFixtureRecesses(fixture?.recesses, fixture?.id || `date-${date}`)]
    })))
  }, [fixtureDateNumbers.join(','), matches.map((match) => `${match.id}:${match.calendar_date || ''}:${match.scheduled_time || ''}:${match.local_team_id}:${match.visitor_team_id}`).join('|'), fixtureRecords.map((fixture) => `${fixture.id}:${fixture.date_number}:${JSON.stringify(fixture.recesses)}`).join('|'), tournament.start_date])

  function addRecess(date: number) {
    setDraftRecesses((current) => ({
      ...current,
      [String(date)]: [...(current[String(date)] || normalizeFixtureRecesses([], `date-${date}`)), { id: `${date}-recess-${Date.now()}`, time: null }],
    }))
  }

  function removeRecess(date: number, recessId: string) {
    setDraftRecesses((current) => {
      const recesses = current[String(date)] || normalizeFixtureRecesses([], `date-${date}`)
      if (recesses.length <= 1) return current
      return { ...current, [String(date)]: recesses.filter((recess) => recess.id !== recessId) }
    })
  }

  function startAddingMatch(date: number) {
    const firstMatch = matches.find((match) => match.date_number === date)
    const firstDivisionId = firstMatch ? teams.find((team) => team.id === firstMatch.local_team_id)?.division_id || '' : ''
    setAddingDate(date)
    setNewMatch({ divisionId: firstDivisionId || teams[0]?.division_id || '', localTeamId: '', visitorTeamId: '', scheduledTime: '' })
    setMessage('')
  }

  async function saveNewMatch(date: number) {
    if (!supabase) return setMessage('Supabase no está disponible.')
    const source = matches.find((match) => match.date_number === date)
    const fixture = fixtureRecords.find((item) => item.date_number === date)
    const fixtureId = fixture?.id || source?.fixture_id
    if (!fixtureId) return setMessage('No se encontró el fixture de esta fecha.')
    if (!newMatch.divisionId || !newMatch.localTeamId || !newMatch.visitorTeamId) return setMessage('Selecciona la división y los dos equipos.')
    if (newMatch.localTeamId === newMatch.visitorTeamId) return setMessage('El equipo local y visitante deben ser diferentes.')
    const localDivisionId = teams.find((team) => team.id === newMatch.localTeamId)?.division_id
    const visitorDivisionId = teams.find((team) => team.id === newMatch.visitorTeamId)?.division_id
    if (localDivisionId !== newMatch.divisionId || visitorDivisionId !== newMatch.divisionId) return setMessage('Los dos equipos deben pertenecer a la división seleccionada.')
    const { data: lastMatch, error: orderError } = await supabase.from('matches').select('fixture_order').eq('fixture_id', fixtureId).order('fixture_order', { ascending: false, nullsFirst: false }).limit(1).maybeSingle()
    if (orderError) return setMessage(orderError.message)
    const nextOrder = typeof lastMatch?.fixture_order === 'number' ? lastMatch.fixture_order + 1 : matches.filter((match) => match.date_number === date).length
    const { error } = await supabase.from('matches').insert({ fixture_id: fixtureId, division_id: newMatch.divisionId, fixture_order: nextOrder, local_team_id: newMatch.localTeamId, visitor_team_id: newMatch.visitorTeamId, scheduled_time: newMatch.scheduledTime || null })
    if (error) return setMessage(error.message)
    setMessage(`Enfrentamiento añadido a la Fecha ${date}.`)
    setAddingDate(null)
    window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
    window.setTimeout(() => window.location.reload(), 250)
  }

  async function saveDate(date: number) {
    if (!supabase) return setMessage('Supabase no está disponible.')
    const dateMatches = matches.filter((match) => match.date_number === date && !deletedMatchIds.includes(match.id))
    const source = matches.find((match) => match.date_number === date)
    const sourceFixture = fixtureRecords.find((fixture) => fixture.date_number === date)
      || (source ? { id: source.fixture_id } : null)
    if (!sourceFixture) return setMessage('No se encontró la fecha para guardar.')
    setMessage('')
    const recesses = draftRecesses[String(date)]?.length ? draftRecesses[String(date)] : normalizeFixtureRecesses([], sourceFixture.id)
    const { error: fixtureError } = await supabase.from('fixtures').update({ calendar_date: draftDates[String(date)] || null, recesses }).eq('id', sourceFixture.id)
    if (fixtureError) return setMessage(fixtureError.message)
    const occupiedSlots = new Set<string>()
    for (const match of dateMatches) {
      const nextPair = draftPairs[match.id] || { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }
      if (!nextPair.localTeamId || !nextPair.visitorTeamId || nextPair.localTeamId === nextPair.visitorTeamId) return setMessage('Cada enfrentamiento debe tener dos equipos diferentes.')
      const nextTime = draftTimes[match.id] || null
      const rawCourt = draftCourts[match.id] || ''
      const nextCourt = rawCourt ? Number(rawCourt) : null
      if (nextCourt !== null && (!Number.isInteger(nextCourt) || nextCourt < 1 || nextCourt > courtsCount)) {
        return setMessage(`La cancha debe estar entre 1 y ${courtsCount}.`)
      }
      const slotKey = `${nextTime || 'sin-hora'}:${nextCourt || 'sin-cancha'}`
      if (nextTime && nextCourt && occupiedSlots.has(slotKey)) {
        return setMessage(`La cancha ${nextCourt} tiene dos partidos a las ${nextTime.slice(0, 5)}.`)
      }
      if (nextTime && nextCourt) occupiedSlots.add(slotKey)
      if (nextTime !== match.scheduled_time || nextCourt !== (match.court_number || null) || nextPair.localTeamId !== match.local_team_id || nextPair.visitorTeamId !== match.visitor_team_id) {
        const { error } = await supabase.from('matches').update({ scheduled_time: nextTime, court_number: nextCourt, local_team_id: nextPair.localTeamId, visitor_team_id: nextPair.visitorTeamId }).eq('id', match.id)
        if (error) return setMessage(error.message)
      }
    }
    if (deletedMatchIds.length) {
      const { error } = await supabase.from('matches').delete().in('id', deletedMatchIds)
      if (error) return setMessage(error.message)
    }
    setMessage(`Fecha ${date} actualizada correctamente.`)
    setDeletedMatchIds([])
    setEditingDate(null)
    window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
    window.setTimeout(() => window.location.reload(), 250)
  }

  async function deleteDate(date: number) {
    if (!supabase || !window.confirm(`¿Seguro que deseas eliminar la Fecha ${date} completa?`)) return
    // Usa la tabla de fixtures como fuente de verdad, aunque la fecha esté vacía.
    const { data: fixtureRows, error: fixtureLookupError } = await supabase
      .from('fixtures')
      .select('id')
      .eq('tournament_id', tournament.id)
      .eq('date_number', date)
    if (fixtureLookupError) return setMessage(fixtureLookupError.message)
    const fixtureIds = (fixtureRows ?? []).map((fixture) => fixture.id)
    if (!fixtureIds.length) {
      setMessage('No se encontró la fecha seleccionada en Supabase.')
      return
    }
    const { error: matchesError } = await supabase.from('matches').delete().in('fixture_id', fixtureIds)
    if (matchesError) return setMessage(matchesError.message)
    const { error } = await supabase.from('fixtures').delete().in('id', fixtureIds)
    if (error) return setMessage(error.message)
    setMessage(`Fecha ${date} eliminada correctamente.`)
    window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
    window.location.reload()
  }

  async function deleteMatch(matchId: string) {
    if (!supabase || !window.confirm('¿Seguro que deseas eliminar este enfrentamiento?')) return
    const { error } = await supabase.from('matches').delete().eq('id', matchId)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('Enfrentamiento eliminado correctamente.')
    window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
    window.setTimeout(() => window.location.reload(), 250)
  }

  // Escapa valores dinámicos antes de insertarlos en el documento de impresión.
  function escapePrintValue(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }[character] || character))
  }

  // Genera el fixture en una ventana independiente para excluir el layout del torneo.
  function printFixture(date: number, showListings: boolean) {
    const fixture = fixtureGroups.find((item) => item.date === date)
    if (!fixture) return
    const fixtureRecord = fixtureRecords.find((item) => item.date_number === date)
    const recesses = normalizeFixtureRecesses(
      fixtureRecord?.recesses,
      fixtureRecord?.id || `date-${date}`
    ).filter((recess) => recess.time)
    const divisionGroups = Array.from(new Map(
      fixture.matches.map((match) => [match.division_id, match.division_name || 'General'])
    ).entries())
    const divisionMarkup = showListings ? divisionGroups.map(([divisionId, divisionName]) => {
      const divisionTeams = teams.filter((team) => (
        team.division_id === divisionId &&
        fixture.matches.some((match) => (
          match.local_team_id === team.id || match.visitor_team_id === team.id
        ))
      ))
      const teamMarkup = divisionTeams.map((team) => (
        `<div class="team">${escapePrintValue(team.name)}</div>`
      )).join('')
      return `<div class="division"><h2>${escapePrintValue(divisionName)}</h2>${teamMarkup}</div>`
    }).join('') : ''
    const matchMarkup = fixture.matches.map((match, index) => `<tr>
      <td>Partido ${index + 1}</td>
      <td>${escapePrintValue(match.scheduled_time?.slice(0, 5) || 'Hora por definir')}</td>
      ${courtsCount > 1 ? `<td>${match.court_number ? `Cancha ${match.court_number}` : 'Sin cancha'}</td>` : ''}
      <td>${escapePrintValue(match.division_name || 'General')}</td>
      <td class="bold">${escapePrintValue(match.local_team_name)} vs. ${escapePrintValue(match.visitor_team_name)}</td>
    </tr>`).join('')
    const recessMarkup = recesses.map((recess) => (
      `<p class="recess">RECESO · ${escapePrintValue(recess.time || '')}</p>`
    )).join('')
    const isFootballFixture = tournament.discipline?.code === 'futbol'
    const headerLogoMarkup = isFootballFixture
      ? '<div class="logos football-logo"><img src="/MarcaAthlonX/MarcaNegro.svg" alt="AthlonX" /></div>'
      : '<div class="logos"><img src="/MarcaAthlonX/MarcaNegro.svg" alt="AthlonX" />'
        + '<img src="/upr.png" alt="Organización" /></div>'
    const calendarDate = fixture.matches[0]?.calendar_date
      ? new Date(`${fixture.matches[0].calendar_date}T00:00:00`).toLocaleDateString('es-PA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      : 'Fecha por definir'
    const printWindow = window.open('', '_blank', 'width=900,height=1100')
    if (!printWindow) {
      setMessage('Permite las ventanas emergentes para generar el PDF.')
      return
    }
    printWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8" />
      <title>Fixture ${escapePrintValue(tournament.name)}</title>
      <style>
        @page { size: letter; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #fff; color: #111827; font-family: Arial, sans-serif; }
        .page { width: 8.5in; min-height: 11in; padding: 0.42in 0.45in; }
        .logos { display: flex; justify-content: space-between; align-items: flex-start; }
        .football-logo { justify-content: center; }
        .logos img:first-child { width: 1.35in; height: 0.6in; object-fit: contain; object-position: left; }
        .football-logo img:first-child { object-position: center; }
        .logos img:last-child { width: 1.1in; height: 0.6in; object-fit: contain; object-position: right; }
        h1 { margin: 0.32in 0 0.08in; text-align: center; color: #111827; font-size: 22px; font-weight: 900; text-transform: uppercase; }
        .subtitle { margin: 0; text-align: center; color: #111827; font-size: 14px; }
        .divisions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.16in; margin-top: 0.48in; }
        .division h2 { margin: 0 0 8px; text-align: center; color: #111827; font-size: 11px; font-weight: 900; text-transform: uppercase; }
        .team { border: 1px solid #b8c9dc; padding: 6px 4px; text-align: center; color: #111827; font-size: 12px; }
        .schedule-title { margin: 0.42in 0 0; padding-bottom: 8px; border-bottom: 2px solid #111827; text-align: center; color: #111827; font-size: 11px; font-weight: 900; text-transform: uppercase; }
        table { width: 100%; margin-top: 0.18in; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
        th, td { padding: 7px 6px; border-bottom: 1px solid #b8c9dc; text-align: left; vertical-align: middle; }
        th { border-bottom: 2px solid #111827; color: #111827; font-weight: 900; }
        th:nth-child(1), td:nth-child(1) { width: 18%; }
        th:nth-child(2), td:nth-child(2) { width: 18%; }
        th:nth-child(3), td:nth-child(3) { width: 16%; }
        th:nth-child(4), td:nth-child(4) { width: 16%; }
        .bold { font-weight: 700; }
        .recess { margin: 14px 0 0; text-align: center; color: #111827; font-size: 11px; font-weight: 900; }
        @media print { .page { page-break-inside: avoid; } tr, .division { page-break-inside: avoid; } }
      </style></head><body><main class="page">
      ${headerLogoMarkup}
      <h1>Fixture ${escapePrintValue(tournament.name)}</h1>
      <p class="subtitle">${escapePrintValue(tournament.modality?.name || 'Competencia')} · Fecha ${date} · ${escapePrintValue(calendarDate)}</p>
      ${showListings ? `<div class="divisions">${divisionMarkup}</div>` : ''}
      <h2 class="schedule-title">Cronograma de partidos</h2>
      <table><thead><tr><th>Partido</th><th>Horario</th>${courtsCount > 1 ? '<th>Cancha</th>' : ''}<th>División</th><th>Enfrentamiento</th></tr></thead>
      <tbody>${matchMarkup}</tbody></table>${recessMarkup}</main></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    window.setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 400)
  }

  const fixtureGroups = fixtureDateNumbers.map((date) => ({
    date,
    matches: matches.filter((match) => match.date_number === date),
  }))

  const shownDate = activeDate !== null && fixtureDateNumbers.includes(activeDate) ? activeDate : (fixtureDateNumbers[0] ?? null)
  return <>
  <div className="ax-v2 pt-6 print:hidden">
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-accent-text)]">Consulta</p>
      <h2 className="mt-2 font-display text-3xl uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">Fixtures</h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[var(--ax-muted)]">Edita partidos, horarios, fechas y recesos. Los cambios se guardan directamente en Supabase.</p>
    </div>
    {!fixtureDateNumbers.length && <div className="mt-6 rounded-[14px] border border-dashed border-[var(--ax-line-strong)] bg-[var(--ax-surface)] p-6 text-sm text-[var(--ax-muted)]">Todavía no hay fixtures creados.</div>}
    {shownDate !== null && <>
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">{fixtureDateNumbers.map((date) => <button key={date} type="button" onClick={() => { setActiveDate(date); setEditingDate(null) }} className={`inline-flex h-9 cursor-pointer items-center rounded-[10px] border px-3.5 text-[13px] font-bold transition ${date === shownDate ? 'border-[var(--ax-accent)] bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'border-[var(--ax-line)] bg-[var(--ax-surface)] text-[var(--ax-text-secondary)] hover:border-[var(--ax-accent-line)]'}`}>Fecha {date}</button>)}</div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => printFixture(shownDate, false)} className={axBtnGhost}><FileDown size={15} />PDF sin plantillas</button>
          <button type="button" onClick={() => printFixture(shownDate, true)} className={axBtnGhost}><FileDown size={15} />PDF con plantillas</button>
        </div>
      </div>
      {fixtureGroups.filter((fixture) => fixture.date === shownDate).map((fixture) => {
        const isEditing = editingDate === fixture.date
        const visibleMatches = fixture.matches.filter((match) => !deletedMatchIds.includes(match.id))
        const fixtureRecord = fixtureRecords.find((item) => item.date_number === fixture.date)
        const calendarDate = draftDates[String(fixture.date)]
          || fixture.matches[0]?.calendar_date
          || fixtureRecord?.calendar_date
          || tournament.start_date
          || ''
        const recesses = draftRecesses[String(fixture.date)] || normalizeFixtureRecesses([], `date-${fixture.date}`)
        return <article key={fixture.date} className="mt-5 rounded-[20px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-muted)]">Fecha {fixture.date}</p>
              {isEditing
                ? <input type="date" value={calendarDate} onChange={(event) => setDraftDates((current) => ({ ...current, [String(fixture.date)]: event.target.value }))} className={`mt-2 ${axField}`} />
                : <h3 className="mt-1.5 font-display text-2xl uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">{calendarDate ? new Date(`${calendarDate}T00:00:00`).toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha por definir'}</h3>}
              <p className="mt-1.5 text-[13px] text-[var(--ax-muted)]">{visibleMatches.length} partido{visibleMatches.length === 1 ? '' : 's'}</p>
            </div>
            {canManage && <div className="flex flex-wrap gap-2">
              {!isEditing && <button type="button" onClick={() => { setEditingDate(fixture.date); setDeletedMatchIds([]) }} className={axBtnOutline}><Pencil size={15} />Editar</button>}
              {isEditing && <>
                <button type="button" onClick={() => { setEditingDate(null); setAddingDate(null); setDeletedMatchIds([]) }} className={axBtnGhost}>Cancelar</button>
                <button type="button" onClick={() => void deleteDate(fixture.date)} className={axBtnDanger}><Trash2 size={15} />Eliminar fecha</button>
                <button type="button" onClick={() => void saveDate(fixture.date)} className={axBtnPrimary}><Check size={15} />Guardar</button>
              </>}
            </div>}
          </div>
          <div className="mt-5 divide-y divide-[var(--ax-line)]">{visibleMatches.map((match) => {
            const pair = draftPairs[match.id] || { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }
            const divisionId = teams.find((team) => team.id === pair.localTeamId)?.division_id || teams.find((team) => team.id === pair.visitorTeamId)?.division_id
            const options = teams.filter((team) => team.division_id === divisionId)
            if (isEditing) return <div key={match.id} className="grid gap-3 py-4 sm:grid-cols-[110px_1fr] sm:items-start">
              <span className="pt-2 text-[11px] font-bold uppercase tracking-[.08em] text-[var(--ax-muted)]">{match.division_name || 'General'}</span>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <select value={pair.localTeamId} onChange={(event) => setDraftPairs((current) => ({ ...current, [match.id]: { ...pair, localTeamId: event.target.value } }))} className={axField}><option value="">Local</option>{options.map((team) => <option key={`local-${match.id}-${team.id}`} value={team.id}>{team.name}</option>)}</select>
                <select value={pair.visitorTeamId} onChange={(event) => setDraftPairs((current) => ({ ...current, [match.id]: { ...pair, visitorTeamId: event.target.value } }))} className={axField}><option value="">Visitante</option>{options.filter((team) => team.id !== pair.localTeamId).map((team) => <option key={`visitor-${match.id}-${team.id}`} value={team.id}>{team.name}</option>)}</select>
                <button type="button" onClick={() => deleteMatch(match.id)} className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[var(--ax-danger-line)] px-3 text-[var(--ax-danger-text)]" title="Eliminar enfrentamiento"><Trash2 size={15} /></button>
                <input type="time" value={draftTimes[match.id] || ''} onChange={(event) => setDraftTimes((current) => ({ ...current, [match.id]: event.target.value }))} className={`${axField} sm:col-span-3`} />
              </div>
            </div>
            return <div key={match.id} className="grid items-center gap-3 py-3 sm:grid-cols-[96px_170px_1fr_56px_1fr]">
              <div>
                <p className="text-sm font-semibold text-[var(--ax-text)]">{match.scheduled_time ? match.scheduled_time.slice(0, 5) : 'Por definir'}</p>
                <p className="text-xs text-[var(--ax-muted)]">{match.court_number ? `Cancha ${match.court_number}` : 'Cancha principal'}</p>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[.08em] text-[var(--ax-muted)]">{match.division_name || 'General'}</span>
              <div className="flex min-w-0 items-center justify-end gap-2.5">
                <span className="truncate text-sm font-semibold text-[var(--ax-text)]">{match.local_team_name}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] text-xs font-bold text-[var(--ax-text)]">{match.local_team_name.slice(0, 2).toUpperCase()}</span>
              </div>
              <span className="flex h-8 items-center justify-center rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] text-[13px] font-medium text-[var(--ax-muted)]">vs</span>
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] text-xs font-bold text-[var(--ax-text)]">{match.visitor_team_name.slice(0, 2).toUpperCase()}</span>
                <span className="truncate text-sm font-semibold text-[var(--ax-text)]">{match.visitor_team_name}</span>
              </div>
            </div>
          })}</div>
          {canManage && isEditing && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--ax-accent-line)] bg-[var(--ax-accent)]/5 p-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-accent-text)]">Nuevo enfrentamiento</p>
              <p className="mt-1 text-[13px] text-[var(--ax-muted)]">Añade otro partido a esta fecha.</p>
            </div>
            {addingDate !== fixture.date && <button type="button" onClick={() => startAddingMatch(fixture.date)} className={axBtnPrimary}>Añadir enfrentamiento</button>}
            {addingDate === fixture.date && <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <select value={newMatch.divisionId} onChange={(event) => setNewMatch({ divisionId: event.target.value, localTeamId: '', visitorTeamId: '', scheduledTime: newMatch.scheduledTime })} className={axField}><option value="">División</option>{Array.from(new Map(teams.map((team) => [team.division_id, team.division_name])).entries()).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
              <select value={newMatch.localTeamId} onChange={(event) => setNewMatch((current) => ({ ...current, localTeamId: event.target.value }))} className={axField}><option value="">Local</option>{teams.filter((team) => team.division_id === newMatch.divisionId).map((team) => <option key={`new-local-${team.id}`} value={team.id}>{team.name}</option>)}</select>
              <select value={newMatch.visitorTeamId} onChange={(event) => setNewMatch((current) => ({ ...current, visitorTeamId: event.target.value }))} className={axField}><option value="">Visitante</option>{teams.filter((team) => team.division_id === newMatch.divisionId && team.id !== newMatch.localTeamId).map((team) => <option key={`new-visitor-${team.id}`} value={team.id}>{team.name}</option>)}</select>
              <input type="time" value={newMatch.scheduledTime} onChange={(event) => setNewMatch((current) => ({ ...current, scheduledTime: event.target.value }))} className={axField} />
              <div className="flex gap-2"><button type="button" onClick={() => void saveNewMatch(fixture.date)} className={axBtnPrimary}>Guardar</button><button type="button" onClick={() => setAddingDate(null)} className={axBtnGhost}>Cancelar</button></div>
            </div>}
          </div>}
          <div className="mt-5 rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-accent-text)]">Recesos</p>
                <p className="mt-1 text-[13px] text-[var(--ax-muted)]">Define la hora de cada descanso de esta fecha.</p>
              </div>
              {isEditing && <button type="button" onClick={() => addRecess(fixture.date)} className={axBtnOutline}>Añadir receso</button>}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{recesses.map((recess, index) => <div key={recess.id} className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface)] px-3.5 py-2.5">
              <span className="min-w-24 text-sm font-semibold text-[var(--ax-text)]">Receso {index + 1}</span>
              {isEditing
                ? <input type="time" value={recess.time || ''} onChange={(event) => setDraftRecesses((current) => ({ ...current, [String(fixture.date)]: recesses.map((item) => item.id === recess.id ? { ...item, time: event.target.value || null } : item) }))} className={axField} />
                : <span className="text-sm text-[var(--ax-muted)]">{recess.time ? recess.time.slice(0, 5) : 'Hora por definir'}</span>}
              {isEditing && index > 0 && <button type="button" onClick={() => removeRecess(fixture.date, recess.id)} className="ml-auto text-xs font-bold text-[var(--ax-danger-text)]">Quitar</button>}
            </div>)}</div>
          </div>
        </article>
      })}
    </>}
    {message && <p role="status" className="mt-4 rounded-[10px] border border-[var(--ax-accent-line)] bg-[var(--ax-accent)]/10 p-4 text-sm text-[var(--ax-accent-text)]">{message}</p>}
  </div>{printTarget !== null && <section className="fixture-print-document hidden bg-white p-8 text-black print:block"><div className="flex items-start justify-between"><img src="/MarcaAthlonX/MarcaNegro.svg" alt="AthlonX" className="h-16 w-48 object-contain object-left" /><img src="/upr.png" alt="Organización" className="h-20 w-36 object-contain object-right" /></div><h1 className="mt-8 text-center font-display text-3xl uppercase">Fixture {tournament.name}</h1>{fixtureGroups.filter((fixture) => fixture.date === printTarget).map((fixture) => { const divisionGroups = Array.from(new Map(fixture.matches.map((match) => [match.division_id, match.division_name || 'General'])).entries()); const fixtureRecord = fixtureRecords.find((item) => item.date_number === fixture.date); const printRecesses = normalizeFixtureRecesses(fixtureRecord?.recesses, fixtureRecord?.id || `date-${fixture.date}`); return <div key={fixture.date} className="mt-8"><p className="text-center text-xl font-bold">{tournament.modality?.name || 'Competencia'} · Fecha {fixture.date}</p><p className="mt-1 text-center text-sm">{fixture.matches[0]?.calendar_date ? new Date(`${fixture.matches[0].calendar_date}T00:00:00`).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha por definir'}</p><div className="mt-6 grid grid-cols-3 gap-4">{divisionGroups.map(([divisionId, divisionName]) => { const divisionTeams = teams.filter((team) => team.division_id === divisionId && fixture.matches.some((match) => match.local_team_id === team.id || match.visitor_team_id === team.id)); return <div key={divisionId} className="text-center"><h2 className="text-xs font-black uppercase">{divisionName}</h2><div className="mt-2 border border-slate-300">{divisionTeams.map((team) => <p key={team.id} className="border-b border-slate-300 p-2 text-sm last:border-b-0">{team.name}</p>)}</div></div>})}</div><h2 className="mt-6 border-b-2 border-slate-800 pb-2 text-center text-sm font-black uppercase">Cronograma de partidos</h2><table className="mt-4 w-full border-collapse text-sm"><thead><tr className="border-b-2 border-slate-800 text-left"><th className="p-2">Partido</th><th className="p-2">Horario</th><th className="p-2">División</th><th className="p-2">Enfrentamiento</th></tr></thead><tbody>{fixture.matches.map((match, index) => <tr key={match.id} className="border-b border-slate-300"><td className="p-2">Partido {index + 1}</td><td className="p-2">{match.scheduled_time ? match.scheduled_time.slice(0, 5) : 'Hora por definir'}</td><td className="p-2">{match.division_name || 'General'}</td><td className="p-2 font-bold">{match.local_team_name} vs. {match.visitor_team_name}</td></tr>)}</tbody></table>{printRecesses.filter((recess) => recess.time).map((recess) => <p key={recess.id} className="mt-4 text-center text-sm font-black uppercase">Receso · {recess.time}</p>)}</div>})}</section>}</>
}

function ReadOnlyFixtureListSection({ tournament, teams, dates, matches }: { tournament: Tournament; teams: TournamentTeam[]; dates: number[]; matches: Match[] }) {
  const [editingDate, setEditingDate] = useState<number | null>(null)
  const [draftDates, setDraftDates] = useState<Record<string, string>>({})
  const [draftTimes, setDraftTimes] = useState<Record<string, string>>({})
  const [draftPairs, setDraftPairs] = useState<Record<string, { localTeamId: string; visitorTeamId: string }>>({})
  const [editError, setEditError] = useState('')
  const [printTarget, setPrintTarget] = useState<number | 'all' | null>(null)
  const datesSignature = dates.join(',')
  const fixtureSignature = matches.map((match) => `${match.id}:${match.calendar_date || ''}:${match.scheduled_time || ''}:${match.local_team_id}:${match.visitor_team_id}`).join('|')

  useEffect(() => {
    setDraftDates(Object.fromEntries(dates.map((date) => [String(date), matches.find((match) => match.date_number === date)?.calendar_date || tournament.start_date || ''])))
    setDraftTimes(Object.fromEntries(matches.map((match) => [match.id, match.scheduled_time || ''])))
    setDraftPairs(Object.fromEntries(matches.map((match) => [match.id, { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }])))
  }, [datesSignature, fixtureSignature, tournament.start_date])

  useEffect(() => {
    const clearPrintTarget = () => setPrintTarget(null)
    window.addEventListener('afterprint', clearPrintTarget)
    return () => window.removeEventListener('afterprint', clearPrintTarget)
  }, [])

  const fixtureGroups = dates.map((date) => ({ date, matches: matches.filter((match) => match.date_number === date), calendarDate: draftDates[String(date)] || '' }))
  const dateChanges = fixtureGroups.flatMap((fixture) => {
    const sourceMatch = fixture.matches[0]
    const sourceDate = sourceMatch?.calendar_date || tournament.start_date || ''
    return sourceMatch?.fixture_id && fixture.calendarDate !== sourceDate ? [{ fixtureId: sourceMatch.fixture_id, calendarDate: fixture.calendarDate || null }] : []
  })
  const timeChanges = matches.flatMap((match) => {
    const nextTime = draftTimes[match.id] || ''
    return nextTime !== (match.scheduled_time || '') ? [{ matchId: match.id, scheduledTime: nextTime || null }] : []
  })
  const matchChanges = matches.flatMap((match) => {
    const nextPair = draftPairs[match.id] || { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }
    return nextPair.localTeamId !== match.local_team_id || nextPair.visitorTeamId !== match.visitor_team_id ? [{ matchId: match.id, localTeamId: nextPair.localTeamId, visitorTeamId: nextPair.visitorTeamId }] : []
  })
  const hasDraftChanges = dateChanges.length > 0 || timeChanges.length > 0 || matchChanges.length > 0
  const printDates = printTarget === 'all' ? dates : typeof printTarget === 'number' ? [printTarget] : []

  function printFixture(target: number | 'all') {
    setPrintTarget(target)
    window.setTimeout(() => window.print(), 0)
  }

  return <>
    <section className="pt-6 print:hidden">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Consulta</p><h2 className="mt-2 font-display text-3xl uppercase">Fixtures</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Consulta las fechas y los partidos creados para este torneo.</p></div>
        {matches.length > 0 && <button type="button" onClick={() => printFixture('all')} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-[#31556b] px-4 py-3 text-sm font-bold text-slate-200 hover:border-[#b4ff45]"><FileDown size={17} />Generar PDF</button>}
      </div>
      {!matches.length && <div className="mt-6 rounded-[5px] border border-dashed border-[#31556b] bg-[#07131e] p-6 text-sm text-slate-400">Todavía no hay fixtures creados.</div>}
      <div className="mt-6 space-y-5">
        {fixtureGroups.map((fixture) => {
          const isEditing = false
          return <article key={fixture.date} className="rounded-[5px] border border-[#31556b] bg-[#07131e] p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start">
              <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Fecha {fixture.date}</p>{isEditing ? <input type="date" value={fixture.calendarDate} onChange={(event) => setDraftDates((current) => ({ ...current, [String(fixture.date)]: event.target.value }))} className="mt-2 rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#b4ff45]" /> : <p className="mt-2 text-sm capitalize text-slate-300">{fixture.calendarDate ? new Date(`${fixture.calendarDate}T00:00:00`).toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha por definir'}</p>}</div>
              <div className="flex flex-wrap gap-2">
<button type="button" onClick={() => printFixture(fixture.date)} data-viewer-fixture="true" className="inline-flex items-center justify-center gap-2 rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-200 hover:border-[#b4ff45]"><FileDown size={15} />Generar PDF</button>
              </div>
            </div>
            {new Set(fixture.matches.map((match) => match.court_number).filter(Boolean)).size > 1 && <div className="mb-2 flex flex-wrap gap-2 text-xs text-slate-400">{Array.from(new Set(fixture.matches.map((match) => match.court_number).filter(Boolean))).map((court) => <span key={court} className="rounded border border-[#31556b] px-2 py-1">Cancha {court}</span>)}</div>}
            <div className="mt-3 divide-y divide-white/10">{fixture.matches.map((match) => {
              const pair = draftPairs[match.id] || { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }
              const divisionId = teams.find((team) => team.id === match.local_team_id)?.division_id || teams.find((team) => team.id === match.visitor_team_id)?.division_id
              const divisionOptions = Array.from(new Map(teams.filter((team) => team.division_id === divisionId).map((team) => [team.id, team])).values())
              return <div key={match.id} className="grid gap-3 py-4 sm:grid-cols-[120px_1fr_140px] sm:items-center"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{match.division_name || 'General'}</span>{isEditing ? <div className="grid gap-2 sm:grid-cols-2"><select value={pair.localTeamId} onChange={(event) => setDraftPairs((current) => ({ ...current, [match.id]: { ...pair, localTeamId: event.target.value } }))} className="rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-2 py-2 text-sm text-slate-200 outline-none focus:border-[#b4ff45]"><option value="">Local</option>{divisionOptions.map((team) => <option key={`local-${match.id}-${team.id}`} value={team.id}>{team.name}</option>)}</select><select value={pair.visitorTeamId} onChange={(event) => setDraftPairs((current) => ({ ...current, [match.id]: { ...pair, visitorTeamId: event.target.value } }))} className="rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-2 py-2 text-sm text-slate-200 outline-none focus:border-[#b4ff45]"><option value="">Visitante</option>{divisionOptions.filter((team) => team.id !== pair.localTeamId).map((team) => <option key={`visitor-${match.id}-${team.id}`} value={team.id}>{team.name}</option>)}</select></div> : <div className="font-semibold text-slate-100"><span>{match.local_team_name}</span><span className="px-2 text-slate-500">vs.</span><span>{match.visitor_team_name}</span></div>}{isEditing ? <input type="time" value={draftTimes[match.id] ?? ''} onChange={(event) => setDraftTimes((current) => ({ ...current, [match.id]: event.target.value }))} className="rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#b4ff45]" /> : <span className="text-sm text-slate-400">{match.scheduled_time ? match.scheduled_time.slice(0, 5) : 'Hora por definir'}</span>}</div>
            })}</div>
          </article>
        })}
      </div>
    </section>
    {printTarget !== null && <section className="hidden min-h-screen bg-white p-10 text-black print:block"><div className="flex items-start justify-between"><img src="/MarcaAthlonX/MarcaNegro.svg" alt="AthlonX" className="h-16 w-48 object-contain object-left" /><img src="/upr.png" alt="Organización" className="h-20 w-36 object-contain object-right" /></div><h1 className="mt-8 text-center font-display text-3xl uppercase">Fixture del torneo</h1><p className="mt-2 text-center text-xl font-bold">{tournament.name}</p>{printDates.map((date) => { const printMatches = matches.filter((match) => match.date_number === date); const calendarDate = printMatches[0]?.calendar_date; return <div key={date} className="mt-8 break-inside-avoid"><div className="flex items-baseline justify-between border-b-2 border-slate-800 pb-2"><h2 className="text-xl font-black uppercase">Fecha {date}</h2><p className="text-sm">{calendarDate ? new Date(`${calendarDate}T00:00:00`).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha por definir'}</p></div><div className="mt-3 space-y-2">{printMatches.map((match) => <div key={match.id} className="grid grid-cols-[120px_1fr_120px] gap-3 border-b border-slate-300 py-3 text-sm"><span>{match.division_name || 'General'}</span><span className="font-bold">{match.local_team_name} vs. {match.visitor_team_name}</span><span className="text-right">{match.scheduled_time ? match.scheduled_time.slice(0, 5) : 'Hora por definir'}</span></div>)}</div></div>})}</section>}
  </>
}

function FixturesSection({ tournament, teams, dates, canManage, onGenerate, onSaveChanges, onDeleteFixture }: { tournament: Tournament; teams: TournamentTeam[]; dates: number[]; canManage: boolean; onGenerate: (teamIds: string[], mode: 'automatic' | 'manual', pairings?: ManualPairing[], divisionConfigs?: AutomaticDivisionConfig[]) => void; onSaveChanges: (dateChanges: FixtureDateChange[], timeChanges: FixtureTimeChange[], matchChanges: FixtureMatchChange[], newMatches?: FixtureNewMatch[], deletedMatchIds?: string[]) => void; onDeleteFixture: (dateNumber: number) => Promise<void> }) {
  const [mode, setMode] = useState<'automatic' | 'manual'>('automatic')
  const [query, setQuery] = useState('')
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(Array.from(new Set(teams.map((team) => team.id))))
  const [manualPairings, setManualPairings] = useState<ManualPairing[]>([])
  const [manualDivisionId, setManualDivisionId] = useState(teams[0]?.division_id || '')
  const [localTeamId, setLocalTeamId] = useState('')
  const [visitorTeamId, setVisitorTeamId] = useState('')
  const [matchesPerDivision, setMatchesPerDivision] = useState<Record<string, string>>({})
  const [editingDate, setEditingDate] = useState<number | null>(null)
  const [draftDates, setDraftDates] = useState<Record<string, string>>({})
  const [draftTimes, setDraftTimes] = useState<Record<string, string>>({})
  const [draftPairs, setDraftPairs] = useState<Record<string, { localTeamId: string; visitorTeamId: string }>>({})
  const [draftNewMatches, setDraftNewMatches] = useState<Record<string, DraftNewFixtureMatch[]>>({})
  const [deletedMatchIds, setDeletedMatchIds] = useState<string[]>([])
  const [deleteDate, setDeleteDate] = useState<number | null>(null)
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null)
  const [editError, setEditError] = useState('')
  const [printTarget, setPrintTarget] = useState<number | 'all' | null>(null)
  const fixtureMatches = tournament.fixtureMatches ?? []
  const divisionRows = Array.from(new Map(teams.map((team) => [team.division_id, { id: team.division_id, name: team.division_name }])).values())
  const groupedTeams = teams.reduce<Array<TournamentTeam & { divisions: string[] }>>((groups, team) => { const existing = groups.find((item) => item.id === team.id); if (existing) { if (!existing.divisions.includes(team.division_name)) existing.divisions.push(team.division_name) } else groups.push({ ...team, divisions: [team.division_name] }); return groups }, [])
  const filteredTeams = groupedTeams.filter((team) => `${team.name} ${team.handle || ''} ${team.athlonx_code || ''}`.toLowerCase().includes(query.toLowerCase()))
  const divisionTeams = Array.from(new Map(teams.filter((team) => team.division_id === manualDivisionId && selectedTeamIds.includes(team.id)).map((team) => [team.id, team])).values())
  const automaticConfigs = divisionRows.map((division) => ({ divisionId: division.id, matchesPerDate: Number(matchesPerDivision[division.id] ?? Math.floor(teams.filter((team) => team.division_id === division.id && selectedTeamIds.includes(team.id)).length / 2)) }))
  const canGenerate = mode === 'automatic' ? selectedTeamIds.length >= 2 && automaticConfigs.some((config) => config.matchesPerDate > 0) : manualPairings.length > 0
  const fixtureGroups = dates.map((date) => ({ date, matches: fixtureMatches.filter((match) => match.date_number === date), calendarDate: draftDates[String(date)] || '' }))
  const datesSignature = dates.join(',')
  const fixtureSignature = fixtureMatches.map((match) => `${match.id}:${match.calendar_date || ''}:${match.scheduled_time || ''}:${match.local_team_id}:${match.visitor_team_id}`).join('|')

  useEffect(() => {
    setDraftDates(Object.fromEntries(dates.map((date) => [String(date), fixtureMatches.find((match) => match.date_number === date)?.calendar_date || tournament.start_date || ''])))
    setDraftTimes(Object.fromEntries(fixtureMatches.map((match) => [match.id, match.scheduled_time || ''])))
    setDraftPairs(Object.fromEntries(fixtureMatches.map((match) => [match.id, { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }])))
    setDraftNewMatches({})
    setDeletedMatchIds([])
    setEditingDate(null)
  }, [datesSignature, fixtureSignature, tournament.start_date])

  useEffect(() => {
    setMatchesPerDivision((current) => Object.fromEntries(divisionRows.map((division) => [division.id, current[division.id] ?? String(Math.floor(teams.filter((team) => team.division_id === division.id && selectedTeamIds.includes(team.id)).length / 2))])))
  }, [divisionRows.map((division) => division.id).join('|'), selectedTeamIds.join(','), teams.length])

  useEffect(() => {
    const clearPrintTarget = () => setPrintTarget(null)
    window.addEventListener('afterprint', clearPrintTarget)
    return () => window.removeEventListener('afterprint', clearPrintTarget)
  }, [])

  function toggleTeam(teamId: string) { setSelectedTeamIds((current) => current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId]) }
  function addManualPairing() { if (!manualDivisionId || !localTeamId || !visitorTeamId || localTeamId === visitorTeamId) return; setManualPairings((current) => [...current, { divisionId: manualDivisionId, localTeamId, visitorTeamId }]); setLocalTeamId(''); setVisitorTeamId('') }
  function generateFixture() {
    setEditError('')
    if (mode === 'automatic') {
      for (const config of automaticConfigs) {
        const selectedDivisionTeams = teams.filter((team) => team.division_id === config.divisionId && selectedTeamIds.includes(team.id))
        const maximumMatches = Math.floor(selectedDivisionTeams.length / 2)
        if (!Number.isInteger(config.matchesPerDate) || config.matchesPerDate < 0 || config.matchesPerDate > maximumMatches) {
          setEditError(`${divisionRows.find((division) => division.id === config.divisionId)?.name || 'La división'} permite entre 0 y ${maximumMatches} partidos con los equipos seleccionados.`)
          return
        }
      }
      if (!automaticConfigs.some((config) => config.matchesPerDate > 0)) return setEditError('Configura al menos un partido para generar la fecha.')
    }
    onGenerate(selectedTeamIds, mode, manualPairings, automaticConfigs)
  }
  function startEditing(date: number) { setEditError(''); setEditingDate(date) }
  function cancelEditing() { setEditError(''); setEditingDate(null); setDraftNewMatches({}); setDeletedMatchIds([]); setDraftDates(Object.fromEntries(dates.map((date) => [String(date), fixtureMatches.find((match) => match.date_number === date)?.calendar_date || tournament.start_date || '']))); setDraftTimes(Object.fromEntries(fixtureMatches.map((match) => [match.id, match.scheduled_time || '']))); setDraftPairs(Object.fromEntries(fixtureMatches.map((match) => [match.id, { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }]))) }
  function addNewMatch(date: number) { const divisionId = divisionRows[0]?.id || ''; if (!divisionId) return; setDraftNewMatches((current) => ({ ...current, [String(date)]: [...(current[String(date)] || []), { divisionId, localTeamId: '', visitorTeamId: '', scheduledTime: '' }] })) }
  function saveDate(date: number) {
    setEditError('')
    const fixture = fixtureGroups.find((item) => item.date === date)
    if (!fixture?.matches[0]?.fixture_id) return setEditError('No se pudo identificar el fixture de esta fecha.')
    const deletedForDate = deletedMatchIds.filter((id) => fixture.matches.some((match) => match.id === id))
    const visibleMatches = fixture.matches.filter((match) => !deletedForDate.includes(match.id))
    const newMatchesForDate = draftNewMatches[String(date)] || []
    const usedTeams = new Set<string>()
    for (const match of visibleMatches) {
      const pair = draftPairs[match.id] || { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }
      if (!pair.localTeamId || !pair.visitorTeamId || pair.localTeamId === pair.visitorTeamId || usedTeams.has(pair.localTeamId) || usedTeams.has(pair.visitorTeamId)) return setEditError(`Revisa los enfrentamientos de la Fecha ${date}: los equipos deben ser diferentes y no repetirse.`)
      usedTeams.add(pair.localTeamId); usedTeams.add(pair.visitorTeamId)
    }
    for (const match of newMatchesForDate) {
      if (!match.localTeamId || !match.visitorTeamId || match.localTeamId === match.visitorTeamId || usedTeams.has(match.localTeamId) || usedTeams.has(match.visitorTeamId)) return setEditError(`Revisa los nuevos enfrentamientos de la Fecha ${date}: los equipos deben ser diferentes y no repetirse.`)
      usedTeams.add(match.localTeamId); usedTeams.add(match.visitorTeamId)
    }
    const sourceDate = fixture.matches[0].calendar_date || tournament.start_date || ''
    const dateChanges = fixture.calendarDate !== sourceDate ? [{ fixtureId: fixture.matches[0].fixture_id, calendarDate: fixture.calendarDate || null }] : []
    const timeChanges = visibleMatches.flatMap((match) => { const nextTime = draftTimes[match.id] || ''; return nextTime !== (match.scheduled_time || '') ? [{ matchId: match.id, scheduledTime: nextTime || null }] : [] })
    const matchChanges = visibleMatches.flatMap((match) => { const nextPair = draftPairs[match.id] || { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }; return nextPair.localTeamId !== match.local_team_id || nextPair.visitorTeamId !== match.visitor_team_id ? [{ matchId: match.id, localTeamId: nextPair.localTeamId, visitorTeamId: nextPair.visitorTeamId }] : [] })
    const addedMatches = newMatchesForDate.map((match) => ({ fixtureId: fixture.matches[0].fixture_id, divisionId: match.divisionId, localTeamId: match.localTeamId, visitorTeamId: match.visitorTeamId, scheduledTime: match.scheduledTime || null }))
    if (!dateChanges.length && !timeChanges.length && !matchChanges.length && !addedMatches.length && !deletedForDate.length) return setEditError('No hay cambios nuevos para guardar.')
    onSaveChanges(dateChanges, timeChanges, matchChanges, addedMatches, deletedForDate)
    setEditingDate(null)
    setDraftNewMatches((current) => ({ ...current, [String(date)]: [] }))
    setDeletedMatchIds([])
  }
  function printFixture(target: number | 'all') { setPrintTarget(target); window.setTimeout(() => window.print(), 0) }

  return <>
    <div className="pt-6 print:hidden"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Planificación</p><h2 className="mt-2 font-display text-3xl uppercase">Generador de fixtures</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Genera fechas y administra sus enfrentamientos desde cada contenedor.</p></div><div className="flex flex-wrap gap-2">{fixtureMatches.length > 0 && <button type="button" onClick={() => printFixture('all')} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#31556b] px-4 py-3 text-sm font-bold text-slate-200 hover:border-[#b4ff45]"><FileDown size={17} />Generar PDF</button>}{canManage && <button type="button" onClick={generateFixture} disabled={!canGenerate} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50"><Wand2 size={17} />Generar fecha</button>}</div></div><div className="mt-6 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setMode('automatic')} className={`rounded-[5px] border px-4 py-3 text-left ${mode === 'automatic' ? 'border-[#b4ff45] bg-[#b4ff45]/10 text-[#dfffba]' : 'border-[#31556b] text-slate-400'}`}><span className="block font-bold">Generación automática</span><span className="mt-1 block text-xs">Empareja equipos dentro de cada división.</span></button><button type="button" onClick={() => setMode('manual')} className={`rounded-[5px] border px-4 py-3 text-left ${mode === 'manual' ? 'border-[#b4ff45] bg-[#b4ff45]/10 text-[#dfffba]' : 'border-[#31556b] text-slate-400'}`}><span className="block font-bold">Generación manual</span><span className="mt-1 block text-xs">Define cada enfrentamiento manualmente.</span></button></div>{mode === 'automatic' && <div className="mt-6 rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/5 p-4"><p className="text-sm font-bold text-[#dfffba]">Partidos por división en esta fecha</p><p className="mt-1 text-xs text-slate-400">Define cuántos enfrentamientos se crearán por división.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{divisionRows.map((division) => { const count = teams.filter((team) => team.division_id === division.id && selectedTeamIds.includes(team.id)).length; const maximum = Math.floor(count / 2); return <label key={division.id} className="rounded-[5px] border border-[#31556b] bg-[#07131e] p-3 text-sm font-semibold"><span className="flex justify-between"><span>{division.name}</span><span className="text-xs font-normal text-slate-500">Máximo: {maximum}</span></span><input type="number" min="0" max={maximum} value={matchesPerDivision[division.id] ?? String(maximum)} onChange={(event) => setMatchesPerDivision((current) => ({ ...current, [division.id]: event.target.value }))} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-2 outline-none focus:border-[#b4ff45]" /></label> })}</div></div>}{editError && <p role="alert" className="mt-4 rounded-[5px] border border-[#ff7d88]/40 bg-[#ff7d88]/10 p-3 text-sm text-[#ffb0b7]">{editError}</p>}<div className="mt-6 rounded-[5px] border border-[#31556b] bg-[#07131e] p-4"><label className="block text-sm font-semibold">Buscar equipos<div className="relative mt-2"><Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, @usuario o código AthlonX" className="w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] py-3 pl-10 pr-3 outline-none focus:border-[#b4ff45]" /></div></label><div className="mt-3 grid gap-2 sm:grid-cols-2">{filteredTeams.map((team) => <label key={team.id} className={`flex cursor-pointer items-center gap-3 rounded-[5px] border px-3 py-3 text-sm ${selectedTeamIds.includes(team.id) ? 'border-[#b4ff45]/60 bg-[#b4ff45]/10' : 'border-white/10'}`}><input type="checkbox" checked={selectedTeamIds.includes(team.id)} onChange={() => toggleTeam(team.id)} className="accent-[#b4ff45]" /><span className="min-w-0 flex-1 truncate">{team.name}</span><span className="text-xs text-slate-500">{team.divisions.join(' · ')}</span></label>)}</div></div>{mode === 'manual' && <div className="mt-6 rounded-[5px] border border-[#31556b] bg-[#07131e] p-4"><p className="text-sm font-bold text-[#dfffba]">Partidos manuales</p><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"><select value={manualDivisionId} onChange={(event) => { setManualDivisionId(event.target.value); setLocalTeamId(''); setVisitorTeamId('') }} className="rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3"><option value="">División</option>{divisionRows.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}</select><select value={localTeamId} onChange={(event) => setLocalTeamId(event.target.value)} className="rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3"><option value="">Local</option>{divisionTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select value={visitorTeamId} onChange={(event) => setVisitorTeamId(event.target.value)} className="rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3"><option value="">Visitante</option>{divisionTeams.filter((team) => team.id !== localTeamId).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><button type="button" onClick={addManualPairing} className="rounded-[5px] border border-[#b4ff45] px-4 py-3 font-bold text-[#dfffba]">Agregar</button></div><div className="mt-4 space-y-2">{manualPairings.map((pairing, index) => <div key={`${pairing.localTeamId}-${pairing.visitorTeamId}-${index}`} className="flex justify-between rounded-[5px] border border-white/10 px-3 py-2 text-sm"><span>{teams.find((team) => team.id === pairing.localTeamId)?.name} vs {teams.find((team) => team.id === pairing.visitorTeamId)?.name}</span><button type="button" onClick={() => setManualPairings((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-[#ff9ca5]">Quitar</button></div>)}</div></div>}<div className="mt-6 grid gap-4 sm:grid-cols-3"><InfoRow label="Fechas generadas" value={String(dates.length)} /><InfoRow label="Equipos seleccionados" value={String(selectedTeamIds.length)} /><InfoRow label="Estado" value={tournament.status === 'finished' ? 'Torneo finalizado' : 'Configuración abierta'} /></div><section className="mt-6 rounded-[5px] border border-[#31556b] bg-[#07131e] p-4 sm:p-5">{fixtureMatches.length > 0 ? <><div className="border-b border-white/10 pb-4"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Fixture creado</p><h3 className="mt-1 font-display text-2xl uppercase">Calendario de partidos</h3><p className="mt-1 text-sm text-slate-400">Edita cada fecha desde su propio contenedor.</p></div><div className="mt-5 space-y-5">{fixtureGroups.map((fixture) => { const isEditing = editingDate === fixture.date; const deletedForDate = deletedMatchIds.filter((id) => fixture.matches.some((match) => match.id === id)); const visibleMatches = fixture.matches.filter((match) => !deletedForDate.includes(match.id)); const newRows = draftNewMatches[String(fixture.date)] || []; return <article key={fixture.date} className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-4"><div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Fecha {fixture.date}</p>{isEditing ? <input type="date" value={fixture.calendarDate} onChange={(event) => setDraftDates((current) => ({ ...current, [String(fixture.date)]: event.target.value }))} className="mt-2 rounded-[5px] border border-[#31556b] bg-[#07131e] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#b4ff45]" /> : <p className="mt-2 text-sm capitalize text-slate-300">{fixture.calendarDate ? new Date(`${fixture.calendarDate}T00:00:00`).toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha por definir'}</p>}</div><div className="flex flex-col items-stretch gap-2 sm:items-end"><button type="button" onClick={() => printFixture(fixture.date)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-200 hover:border-[#b4ff45]"><FileDown size={15} />Generar PDF</button>{canManage && !isEditing && <button type="button" onClick={() => startEditing(fixture.date)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-[#b4ff45]/60 px-3 py-2 text-xs font-bold text-[#dfffba] hover:bg-[#b4ff45]/10"><Pencil size={15} />Editar</button>}{canManage && isEditing && <><button type="button" onClick={cancelEditing} className="rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300">Cancelar</button><button type="button" onClick={() => setDeleteDate(fixture.date)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-[#ff7d88]/60 px-3 py-2 text-xs font-bold text-[#ffb0b7] hover:bg-[#ff7d88]/10"><Trash2 size={15} />Eliminar fecha</button></>}</div></div><div className="mt-3 divide-y divide-white/10">{visibleMatches.map((match) => { const pair = draftPairs[match.id] || { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }; const divisionId = teams.find((team) => team.id === match.local_team_id)?.division_id || teams.find((team) => team.id === match.visitor_team_id)?.division_id; const options = Array.from(new Map(teams.filter((team) => team.division_id === divisionId).map((team) => [team.id, team])).values()); return <div key={match.id} className="grid gap-3 py-3 sm:grid-cols-[120px_1fr_140px] sm:items-center"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{match.division_name || 'General'}</span>{isEditing ? <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select value={pair.localTeamId} onChange={(event) => setDraftPairs((current) => ({ ...current, [match.id]: { ...pair, localTeamId: event.target.value } }))} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-2 py-2 text-sm text-slate-200"><option value="">Local</option>{options.map((team) => <option key={`local-${match.id}-${team.id}`} value={team.id}>{team.name}</option>)}</select><select value={pair.visitorTeamId} onChange={(event) => setDraftPairs((current) => ({ ...current, [match.id]: { ...pair, visitorTeamId: event.target.value } }))} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-2 py-2 text-sm text-slate-200"><option value="">Visitante</option>{options.filter((team) => team.id !== pair.localTeamId).map((team) => <option key={`visitor-${match.id}-${team.id}`} value={team.id}>{team.name}</option>)}</select><button type="button" onClick={() => setDeleteMatchId(match.id)} className="rounded-[5px] border border-[#ff7d88]/50 px-2 py-2 text-[#ffb0b7]" title="Eliminar enfrentamiento"><Trash2 size={15} /></button><input type="time" value={draftTimes[match.id] || ''} onChange={(event) => setDraftTimes((current) => ({ ...current, [match.id]: event.target.value }))} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-2 py-2 text-sm text-slate-200 sm:col-span-3" /></div> : <><div className="font-semibold text-slate-100"><span>{match.local_team_name}</span><span className="px-2 text-slate-500">vs.</span><span>{match.visitor_team_name}</span></div><span className="text-sm text-slate-400">{match.scheduled_time ? match.scheduled_time.slice(0, 5) : 'Hora por definir'}</span></>}</div> })}</div>{isEditing && <div className="mt-4 space-y-3 border-t border-white/10 pt-4"><p className="text-sm font-bold text-[#dfffba]">Nuevos enfrentamientos</p>{newRows.map((row, index) => { const options = teams.filter((team) => team.division_id === row.divisionId); return <div key={`${fixture.date}-new-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"><select value={row.divisionId} onChange={(event) => setDraftNewMatches((current) => ({ ...current, [String(fixture.date)]: (current[String(fixture.date)] || []).map((item, itemIndex) => itemIndex === index ? { ...item, divisionId: event.target.value, localTeamId: '', visitorTeamId: '' } : item) }))} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-2 py-2 text-sm text-slate-200">{divisionRows.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}</select><select value={row.localTeamId} onChange={(event) => setDraftNewMatches((current) => ({ ...current, [String(fixture.date)]: (current[String(fixture.date)] || []).map((item, itemIndex) => itemIndex === index ? { ...item, localTeamId: event.target.value } : item) }))} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-2 py-2 text-sm text-slate-200"><option value="">Local</option>{options.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select value={row.visitorTeamId} onChange={(event) => setDraftNewMatches((current) => ({ ...current, [String(fixture.date)]: (current[String(fixture.date)] || []).map((item, itemIndex) => itemIndex === index ? { ...item, visitorTeamId: event.target.value } : item) }))} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-2 py-2 text-sm text-slate-200"><option value="">Visitante</option>{options.filter((team) => team.id !== row.localTeamId).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><button type="button" onClick={() => setDraftNewMatches((current) => ({ ...current, [String(fixture.date)]: (current[String(fixture.date)] || []).filter((_, itemIndex) => itemIndex !== index) }))} className="rounded-[5px] border border-[#ff7d88]/50 px-2 py-2 text-[#ffb0b7]"><X size={15} /></button><input type="time" value={row.scheduledTime} onChange={(event) => setDraftNewMatches((current) => ({ ...current, [String(fixture.date)]: (current[String(fixture.date)] || []).map((item, itemIndex) => itemIndex === index ? { ...item, scheduledTime: event.target.value } : item) }))} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-2 py-2 text-sm text-slate-200 sm:col-span-3" /></div>})}<div className="flex flex-wrap justify-between gap-3"><button type="button" onClick={() => addNewMatch(fixture.date)} className="rounded-[5px] border border-[#b4ff45]/60 px-3 py-2 text-sm font-bold text-[#dfffba]">Agregar enfrentamiento</button>{(isEditing && (draftNewMatches[String(fixture.date)]?.length || deletedForDate.length || draftDates[String(fixture.date)] !== (fixture.matches[0]?.calendar_date || tournament.start_date || '') || visibleMatches.some((match) => (draftTimes[match.id] || '') !== (match.scheduled_time || '') || (draftPairs[match.id]?.localTeamId || match.local_team_id) !== match.local_team_id || (draftPairs[match.id]?.visitorTeamId || match.visitor_team_id) !== match.visitor_team_id))) && <button type="button" onClick={() => saveDate(fixture.date)} className="inline-flex items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-2 text-sm font-bold text-[#07131e]"><Check size={16} />Guardar cambios</button>}</div></div>}</article>})}</div></> : <div className="rounded-[5px] border border-dashed border-[#31556b] p-5 text-sm text-slate-400">Todavía no hay fixtures creados. Genera una fecha para comenzar.</div>}</section></div>{(deleteDate !== null || deleteMatchId !== null) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02070c]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-[5px] border border-[#31556b] bg-[#0b1d2c] p-6 text-white shadow-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Confirmar eliminación</p><h2 className="mt-2 font-display text-2xl uppercase">¿Seguro que deseas eliminarlo?</h2><p className="mt-3 text-sm leading-6 text-slate-400">{deleteDate !== null ? `Se eliminará la Fecha ${deleteDate} completa.` : 'Se eliminará este enfrentamiento del fixture.'}</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setDeleteDate(null); setDeleteMatchId(null) }} className="rounded-[5px] border border-[#31556b] px-4 py-3 font-bold text-slate-300">No, cancelar</button><button type="button" onClick={() => { if (deleteDate !== null) { const target = deleteDate; setDeleteDate(null); setEditingDate(null); void onDeleteFixture(target) } else if (deleteMatchId) { setDeletedMatchIds((current) => [...current, deleteMatchId]); setDeleteMatchId(null) } }} className="rounded-[5px] bg-[#ff7d88] px-4 py-3 font-bold text-[#07131e]">Sí, eliminar</button></div></div></div>}{printTarget !== null && <section className="hidden min-h-screen bg-white p-10 text-black print:block"><div className="flex items-start justify-between"><img src="/MarcaAthlonX/MarcaNegro.svg" alt="AthlonX" className="h-16 w-48 object-contain object-left" /><img src="/upr.png" alt="Organización" className="h-20 w-36 object-contain object-right" /></div><h1 className="mt-8 text-center font-display text-3xl uppercase">Fixture del torneo</h1><p className="mt-2 text-center text-xl font-bold">{tournament.name}</p>{(printTarget === 'all' ? dates : [printTarget]).map((date) => { const printMatches = fixtureMatches.filter((match) => match.date_number === date); return <div key={date} className="mt-8 break-inside-avoid"><div className="flex items-baseline justify-between border-b-2 border-slate-800 pb-2"><h2 className="text-xl font-black uppercase">Fecha {date}</h2><p className="text-sm">{printMatches[0]?.calendar_date || 'Fecha por definir'}</p></div><div className="mt-3 space-y-2">{printMatches.map((match) => <div key={match.id} className="grid grid-cols-[120px_1fr_120px] gap-3 border-b border-slate-300 py-3 text-sm"><span>{match.division_name || 'General'}</span><span className="font-bold">{match.local_team_name} vs. {match.visitor_team_name}</span><span className="text-right">{match.scheduled_time ? match.scheduled_time.slice(0, 5) : 'Hora por definir'}</span></div>)}</div></div>})}</section>}
  </>
}

function LegacyFixturesSection({ tournament, teams, dates, canManage, onGenerate, onSaveChanges, onDeleteFixture }: { tournament: Tournament; teams: TournamentTeam[]; dates: number[]; canManage: boolean; onGenerate: (teamIds: string[], mode: 'automatic' | 'manual', pairings?: ManualPairing[], divisionConfigs?: AutomaticDivisionConfig[]) => void; onSaveChanges: (dateChanges: FixtureDateChange[], timeChanges: FixtureTimeChange[], matchChanges: FixtureMatchChange[], newMatches?: FixtureNewMatch[], deletedMatchIds?: string[]) => void; onDeleteFixture: (dateNumber: number) => Promise<void> }) {
  const [mode, setMode] = useState<'automatic' | 'manual'>('automatic')
  const [query, setQuery] = useState('')
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(Array.from(new Set(teams.map((team) => team.id))))
  const [manualPairings, setManualPairings] = useState<ManualPairing[]>([])
  const [manualDivisionId, setManualDivisionId] = useState(teams[0]?.division_id || '')
  const [localTeamId, setLocalTeamId] = useState('')
  const [visitorTeamId, setVisitorTeamId] = useState('')
  const [matchesPerDivision, setMatchesPerDivision] = useState<Record<string, string>>({})
  const [draftDates, setDraftDates] = useState<Record<string, string>>({})
  const [draftTimes, setDraftTimes] = useState<Record<string, string>>({})
  const [draftPairs, setDraftPairs] = useState<Record<string, { localTeamId: string; visitorTeamId: string }>>({})
  const [editError, setEditError] = useState('')
  const [printTarget, setPrintTarget] = useState<number | 'all' | null>(null)
  const [deleteConfirmationDate, setDeleteConfirmationDate] = useState<number | null>(null)
  const fixtureMatches = tournament.fixtureMatches ?? []
  const divisionRows = Array.from(new Map(teams.map((team) => [team.division_id, { id: team.division_id, name: team.division_name }])).values())
  const datesSignature = dates.join(',')
  const fixtureSignature = fixtureMatches.map((match) => `${match.id}:${match.calendar_date || ''}:${match.scheduled_time || ''}`).join('|')
  const divisionSignature = divisionRows.map((division) => division.id).join('|')

  useEffect(() => {
    setDraftDates(Object.fromEntries(dates.map((date) => [String(date), fixtureMatches.find((match) => match.date_number === date)?.calendar_date || tournament.start_date || ''])))
    setDraftTimes(Object.fromEntries(fixtureMatches.map((match) => [match.id, match.scheduled_time || ''])))
    setDraftPairs(Object.fromEntries(fixtureMatches.map((match) => [match.id, { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }])))
  }, [datesSignature, fixtureSignature, tournament.start_date])

  useEffect(() => {
    setMatchesPerDivision((current) => Object.fromEntries(divisionRows.map((division) => [division.id, current[division.id] ?? String(Math.floor(teams.filter((team) => team.division_id === division.id && selectedTeamIds.includes(team.id)).length / 2))])))
  }, [divisionSignature, selectedTeamIds.join(','), teams.length])

  useEffect(() => {
    const clearPrintTarget = () => setPrintTarget(null)
    window.addEventListener('afterprint', clearPrintTarget)
    return () => window.removeEventListener('afterprint', clearPrintTarget)
  }, [])

  const groupedTeams = teams.reduce<Array<TournamentTeam & { divisions: string[] }>>((groups, team) => { const existing = groups.find((item) => item.id === team.id); if (existing) { if (!existing.divisions.includes(team.division_name)) existing.divisions.push(team.division_name) } else groups.push({ ...team, divisions: [team.division_name] }); return groups }, [])
  const filteredTeams = groupedTeams.filter((team) => `${team.name} ${team.handle || ''} ${team.athlonx_code || ''}`.toLowerCase().includes(query.toLowerCase()))
  const divisionTeams = Array.from(new Map(teams.filter((team) => team.division_id === manualDivisionId && selectedTeamIds.includes(team.id)).map((team) => [team.id, team])).values())
  const fixtureGroups = dates.map((date) => ({ date, matches: fixtureMatches.filter((match) => match.date_number === date), calendarDate: draftDates[String(date)] || '' }))
  const dateChanges = fixtureGroups.flatMap((fixture) => {
    const sourceMatch = fixture.matches[0]
    const sourceDate = sourceMatch?.calendar_date || tournament.start_date || ''
    return sourceMatch?.fixture_id && fixture.calendarDate !== sourceDate ? [{ fixtureId: sourceMatch.fixture_id, calendarDate: fixture.calendarDate || null }] : []
  })
  const timeChanges = fixtureMatches.flatMap((match) => {
    const nextTime = draftTimes[match.id] || ''
    return nextTime !== (match.scheduled_time || '') ? [{ matchId: match.id, scheduledTime: nextTime || null }] : []
  })
  const matchChanges = fixtureMatches.flatMap((match) => {
    const nextPair = draftPairs[match.id] || { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }
    return nextPair.localTeamId !== match.local_team_id || nextPair.visitorTeamId !== match.visitor_team_id ? [{ matchId: match.id, localTeamId: nextPair.localTeamId, visitorTeamId: nextPair.visitorTeamId }] : []
  })
  const hasDraftChanges = dateChanges.length > 0 || timeChanges.length > 0 || matchChanges.length > 0
  const printDates = printTarget === 'all' ? dates : typeof printTarget === 'number' ? [printTarget] : []
  const toggleTeam = (teamId: string) => setSelectedTeamIds((current) => current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId])
  const addManualPairing = () => { if (!manualDivisionId || !localTeamId || !visitorTeamId || localTeamId === visitorTeamId) return; setManualPairings((current) => [...current, { divisionId: manualDivisionId, localTeamId, visitorTeamId }]); setLocalTeamId(''); setVisitorTeamId('') }
  const automaticConfigs = divisionRows.map((division) => ({ divisionId: division.id, matchesPerDate: Number(matchesPerDivision[division.id] ?? 0) }))
  const canGenerate = mode === 'automatic' ? selectedTeamIds.length >= 2 && automaticConfigs.some((config) => config.matchesPerDate > 0) : manualPairings.length > 0
  const generateFixture = () => {
    setEditError('')
    if (mode === 'automatic') {
      for (const config of automaticConfigs) {
        const selectedDivisionTeams = teams.filter((team) => team.division_id === config.divisionId && selectedTeamIds.includes(team.id))
        const maximumMatches = Math.floor(selectedDivisionTeams.length / 2)
        if (!Number.isInteger(config.matchesPerDate) || config.matchesPerDate < 0 || config.matchesPerDate > maximumMatches) {
          const division = divisionRows.find((item) => item.id === config.divisionId)
          setEditError(`${division?.name || 'La división'} permite entre 0 y ${maximumMatches} partidos con los equipos seleccionados.`)
          return
        }
      }
      if (!automaticConfigs.some((config) => config.matchesPerDate > 0)) {
        setEditError('Configura al menos un partido para generar la fecha.')
        return
      }
    }
    onGenerate(selectedTeamIds, mode, manualPairings, automaticConfigs)
  }
  const saveFixtureChanges = () => {
    setEditError('')
    for (const fixture of fixtureGroups) {
      const usedTeams = new Set<string>()
      for (const match of fixture.matches) {
        const pair = draftPairs[match.id] || { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }
        if (!pair.localTeamId || !pair.visitorTeamId || pair.localTeamId === pair.visitorTeamId) {
          setEditError(`El partido de la Fecha ${fixture.date} debe tener dos equipos diferentes.`)
          return
        }
        if (usedTeams.has(pair.localTeamId) || usedTeams.has(pair.visitorTeamId)) {
          setEditError(`Un equipo no puede jugar dos veces en la Fecha ${fixture.date}.`)
          return
        }
        usedTeams.add(pair.localTeamId)
        usedTeams.add(pair.visitorTeamId)
      }
    }
    onSaveChanges(dateChanges, timeChanges, matchChanges)
  }
  const printFixture = (target: number | 'all') => {
    setPrintTarget(target)
    window.setTimeout(() => window.print(), 0)
  }
  return (
    <>
      <div className="pt-6 print:hidden">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Planificación</p>
            <h2 className="mt-2 font-display text-3xl uppercase">Generador de fixtures</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Elige si quieres crear los emparejamientos automáticamente o definir cada partido manualmente.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {fixtureMatches.length > 0 && <button type="button" onClick={() => printFixture('all')} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-[#31556b] px-4 py-3 text-sm font-bold text-slate-200 hover:border-[#b4ff45]"><FileDown size={17} />Generar PDF</button>}
            {canManage && <button type="button" onClick={generateFixture} disabled={!canGenerate} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50"><Wand2 size={17} />Generar fecha</button>}
          </div>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => setMode('automatic')} className={`rounded-[5px] border px-4 py-3 text-left ${mode === 'automatic' ? 'border-[#b4ff45] bg-[#b4ff45]/10 text-[#dfffba]' : 'border-[#31556b] text-slate-400'}`}><span className="block font-bold">Generación automática</span><span className="mt-1 block text-xs">Empareja equipos consecutivos dentro de cada división.</span></button>
          <button type="button" onClick={() => setMode('manual')} className={`rounded-[5px] border px-4 py-3 text-left ${mode === 'manual' ? 'border-[#b4ff45] bg-[#b4ff45]/10 text-[#dfffba]' : 'border-[#31556b] text-slate-400'}`}><span className="block font-bold">Generación manual</span><span className="mt-1 block text-xs">Define local, visitante y división partido por partido.</span></button>
        </div>

        {mode === 'automatic' && <div className="mt-6 rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/5 p-4"><div><p className="text-sm font-bold text-[#dfffba]">Partidos por división en esta fecha</p><p className="mt-1 text-xs text-slate-400">Define cuántos enfrentamientos se crearán por división. Cada equipo solo puede jugar una vez en la misma fecha.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{divisionRows.map((division) => { const selectedCount = teams.filter((team) => team.division_id === division.id && selectedTeamIds.includes(team.id)).length; const maximumMatches = Math.floor(selectedCount / 2); return <label key={division.id} className="rounded-[5px] border border-[#31556b] bg-[#07131e] p-3 text-sm font-semibold"><span className="flex items-center justify-between gap-3"><span>{division.name}</span><span className="text-xs font-normal text-slate-500">Máximo: {maximumMatches}</span></span><input type="number" min="0" max={maximumMatches} value={matchesPerDivision[division.id] ?? String(maximumMatches)} onChange={(event) => setMatchesPerDivision((current) => ({ ...current, [division.id]: event.target.value }))} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-2 text-white outline-none focus:border-[#b4ff45]" /></label> })}</div></div>}
        {editError && <p role="alert" className="mt-4 rounded-[5px] border border-[#ff7d88]/40 bg-[#ff7d88]/10 p-3 text-sm text-[#ffb0b7]">{editError}</p>}
        {canManage && fixtureMatches.length > 0 && <div className="mt-4 rounded-[5px] border border-[#ff7d88]/20 bg-[#ff7d88]/5 p-4"><p className="text-sm font-bold text-[#ffb0b7]">Gestionar fechas</p><div className="mt-3 flex flex-wrap gap-2">{dates.map((date) => <button key={date} type="button" onClick={() => setDeleteConfirmationDate(date)} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#ff7d88]/60 px-3 py-2 text-sm font-bold text-[#ffb0b7] hover:bg-[#ff7d88]/10"><Trash2 size={15} />Eliminar Fecha {date}</button>)}</div></div>}
        {deleteConfirmationDate !== null && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02070c]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-[5px] border border-[#31556b] bg-[#0b1d2c] p-6 text-white shadow-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Eliminar fixture</p><h2 className="mt-2 font-display text-2xl uppercase">¿Seguro que deseas eliminar este fixture?</h2><p className="mt-3 text-sm leading-6 text-slate-400">Se eliminarán los partidos de la Fecha {deleteConfirmationDate}. Esta acción no solicita contraseña.</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setDeleteConfirmationDate(null)} className="cursor-pointer rounded-[5px] border border-[#31556b] px-4 py-3 font-bold text-slate-300">No, cancelar</button><button type="button" onClick={() => { const target = deleteConfirmationDate; setDeleteConfirmationDate(null); void onDeleteFixture(target) }} className="cursor-pointer rounded-[5px] bg-[#ff7d88] px-4 py-3 font-bold text-[#07131e]">Sí, eliminar</button></div></div></div>}

        <div className="mt-6 grid gap-4 sm:grid-cols-3"><InfoRow label="Fechas generadas" value={String(dates.length)} /><InfoRow label="Equipos seleccionados" value={String(selectedTeamIds.length)} /><InfoRow label="Estado" value={tournament.status === 'finished' ? 'Torneo finalizado' : 'Configuración abierta'} /></div>

        <div className="mt-6 rounded-[5px] border border-[#31556b] bg-[#07131e] p-4">
          <label className="block text-sm font-semibold">Buscar equipos<div className="relative mt-2"><Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, @usuario o código AthlonX" className="w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] py-3 pl-10 pr-3 outline-none focus:border-[#b4ff45]" /></div></label>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{filteredTeams.map((team) => <label key={team.id} className={`flex cursor-pointer items-center gap-3 rounded-[5px] border px-3 py-3 text-sm ${selectedTeamIds.includes(team.id) ? 'border-[#b4ff45]/60 bg-[#b4ff45]/10' : 'border-white/10'}`}><input type="checkbox" checked={selectedTeamIds.includes(team.id)} onChange={() => toggleTeam(team.id)} className="accent-[#b4ff45]" /><span className="min-w-0 flex-1 truncate">{team.name}</span><span className="text-xs text-slate-500">{team.divisions.join(' · ')}</span></label>)}{!filteredTeams.length && <p className="text-sm text-slate-500">No se encontraron equipos.</p>}</div>
        </div>

        {mode === 'manual' && <div className="mt-6 rounded-[5px] border border-[#31556b] bg-[#07131e] p-4"><p className="text-sm font-bold text-[#dfffba]">Partidos manuales</p><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"><select value={manualDivisionId} onChange={(event) => { setManualDivisionId(event.target.value); setLocalTeamId(''); setVisitorTeamId('') }} className="rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3"><option value="">División</option>{Array.from(new Map(teams.map((team) => [team.division_id, team.division_name])).entries()).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select value={localTeamId} onChange={(event) => setLocalTeamId(event.target.value)} className="rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3"><option value="">Local</option>{divisionTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select value={visitorTeamId} onChange={(event) => setVisitorTeamId(event.target.value)} className="rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3"><option value="">Visitante</option>{divisionTeams.filter((team) => team.id !== localTeamId).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><button type="button" onClick={addManualPairing} className="rounded-[5px] border border-[#b4ff45] px-4 py-3 font-bold text-[#dfffba]">Agregar</button></div><div className="mt-4 space-y-2">{manualPairings.map((pairing, index) => { const local = teams.find((team) => team.id === pairing.localTeamId); const visitor = teams.find((team) => team.id === pairing.visitorTeamId); const division = teams.find((team) => team.division_id === pairing.divisionId)?.division_name || 'División'; return <div key={`${pairing.localTeamId}-${pairing.visitorTeamId}-${index}`} className="flex items-center justify-between rounded-[5px] border border-white/10 px-3 py-2 text-sm"><span>{division}: {local?.name} vs {visitor?.name}</span><button type="button" onClick={() => setManualPairings((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-[#ff9ca5]">Quitar</button></div> })}{!manualPairings.length && <p className="text-sm text-slate-500">Agrega al menos un partido manual.</p>}</div></div>}

        {fixtureMatches.length > 0 ? <section className="mt-6 rounded-[5px] border border-[#31556b] bg-[#07131e] p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Fixture creado</p><h3 className="mt-1 font-display text-2xl uppercase">Calendario de partidos</h3><p className="mt-1 text-sm text-slate-400">Aquí puedes revisar y editar las fechas, horarios y enfrentamientos guardados.</p></div>{canManage && hasDraftChanges && <button type="button" onClick={saveFixtureChanges} className="inline-flex items-center justify-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]"><Check size={17} />Guardar cambios</button>}</div><div className="mt-5 space-y-5">{fixtureGroups.map((fixture) => <article key={fixture.date} className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-4"><div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Fecha {fixture.date}</p>{canManage ? <input type="date" value={fixture.calendarDate} onChange={(event) => setDraftDates((current) => ({ ...current, [String(fixture.date)]: event.target.value }))} className="mt-2 rounded-[5px] border border-[#31556b] bg-[#07131e] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#b4ff45]" /> : <p className="mt-2 text-sm text-slate-300">{fixture.calendarDate ? new Date(`${fixture.calendarDate}T00:00:00`).toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha por definir'}</p>}</div><button type="button" onClick={() => printFixture(fixture.date)} className="inline-flex items-center justify-center gap-2 rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-200 hover:border-[#b4ff45]"><FileDown size={15} />Generar PDF</button></div><div className="mt-3 divide-y divide-white/10">{fixture.matches.map((match) => { const pair = draftPairs[match.id] || { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }; const divisionOptions = Array.from(new Map(teams.filter((team) => team.division_id === teams.find((item) => item.id === match.local_team_id)?.division_id).map((team) => [team.id, team])).values()); return <div key={match.id} className="grid gap-3 py-3 sm:grid-cols-[120px_1fr_140px] sm:items-center"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{match.division_name || 'General'}</span>{canManage ? <div className="grid gap-2 sm:grid-cols-2"><select value={pair.localTeamId} onChange={(event) => setDraftPairs((current) => ({ ...current, [match.id]: { ...pair, localTeamId: event.target.value } }))} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-2 py-2 text-sm text-slate-200 outline-none focus:border-[#b4ff45]"><option value="">Local</option>{divisionOptions.map((team) => <option key={`local-${match.id}-${team.id}`} value={team.id}>{team.name}</option>)}</select><select value={pair.visitorTeamId} onChange={(event) => setDraftPairs((current) => ({ ...current, [match.id]: { ...pair, visitorTeamId: event.target.value } }))} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-2 py-2 text-sm text-slate-200 outline-none focus:border-[#b4ff45]"><option value="">Visitante</option>{divisionOptions.filter((team) => team.id !== pair.localTeamId).map((team) => <option key={`visitor-${match.id}-${team.id}`} value={team.id}>{team.name}</option>)}</select></div> : <div className="font-semibold text-slate-100"><span>{match.local_team_name}</span><span className="px-2 text-slate-500">vs.</span><span>{match.visitor_team_name}</span></div>}{canManage ? <input type="time" value={draftTimes[match.id] ?? ''} onChange={(event) => setDraftTimes((current) => ({ ...current, [match.id]: event.target.value }))} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#b4ff45]" /> : <span className="text-sm text-slate-400">{match.scheduled_time ? match.scheduled_time.slice(0, 5) : 'Hora por definir'}</span>}</div> })}</div></article>)}</div></section> : <div className="mt-6 rounded-[5px] border border-dashed border-[#31556b] bg-[#07131e] p-5 text-sm text-slate-400">Todavía no hay fixtures creados. Cuando confirmes la generación, aparecerán aquí automáticamente.</div>}
      </div>

      {printTarget !== null && <section className="hidden min-h-screen bg-white p-10 text-black print:block"><div className="flex items-start justify-between"><img src="/MarcaAthlonX/MarcaNegro.svg" alt="AthlonX" className="h-16 w-48 object-contain object-left" /><img src="/upr.png" alt="Organización" className="h-20 w-36 object-contain object-right" /></div><h1 className="mt-8 text-center font-display text-3xl uppercase">Fixture del torneo</h1><p className="mt-2 text-center text-xl font-bold">{tournament.name}</p>{printDates.map((date) => { const printMatches = fixtureMatches.filter((match) => match.date_number === date); const calendarDate = printMatches[0]?.calendar_date; return <div key={date} className="mt-8 break-inside-avoid"><div className="flex items-baseline justify-between border-b-2 border-slate-800 pb-2"><h2 className="text-xl font-black uppercase">Fecha {date}</h2><p className="text-sm">{calendarDate ? new Date(`${calendarDate}T00:00:00`).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha por definir'}</p></div><div className="mt-3 space-y-2">{printMatches.map((match) => <div key={match.id} className="grid grid-cols-[120px_1fr_120px] gap-3 border-b border-slate-300 py-3 text-sm"><span>{match.division_name || 'General'}</span><span className="font-bold">{match.local_team_name} vs. {match.visitor_team_name}</span><span className="text-right">{match.scheduled_time ? match.scheduled_time.slice(0, 5) : 'Hora por definir'}</span></div>)}</div></div>})}</section>}
    </>
  )
}

function MatchesSection({ matches, dates, events, corrections, rosters, onOpenFixtures, canManage }: { matches: Match[]; dates: number[]; events: MatchEvent[]; corrections: MatchEventCorrection[]; rosters: RosterEntry[]; onOpenFixtures: () => void; canManage: boolean }) {
  const featuredMatch = getFeaturedMatch(matches)
  const [selectedMatchId, setSelectedMatchId] = useState(featuredMatch?.id || '')
  const selectedMatch = matches.find((match) => match.id === selectedMatchId) || featuredMatch || null
  const [openDate, setOpenDate] = useState<number | null>(selectedMatch?.date_number ?? dates[0] ?? null)
  useEffect(() => { if (selectedMatch && !matches.some((match) => match.id === selectedMatch.id)) setSelectedMatchId(featuredMatch?.id || '') }, [featuredMatch, matches, selectedMatch])
  return <div className="ax-v2 space-y-5">
    {selectedMatch
      ? <MatchHighlight match={selectedMatch} events={events.filter((event) => event.match_id === selectedMatch.id)} corrections={corrections.filter((correction) => correction.match_id === selectedMatch.id)} rosters={rosters} canManage={canManage} />
      : <Card><EmptyState icon={CalendarDays} title="Sin partidos todavía" description="Los partidos aparecen aquí cuando generas el fixture o la llave." action={canManage ? <Button variant="primary" onClick={onOpenFixtures}>Ir al generador</Button> : undefined} /></Card>}
    {matches.length > 0 && <Card labelledBy="matches-by-date">
      <CardHeader id="matches-by-date" title="Partidos por fecha" subtitle="Elige un partido para ver su marcador y registrar acciones." />
      <div className="mt-3 divide-y divide-[var(--ax-line)]">
        {dates.map((date) => {
          const dateMatches = matches.filter((match) => match.date_number === date)
          if (!dateMatches.length) return null
          const open = openDate === date
          const live = dateMatches.some((match) => match.status === 'live')
          return <div key={date} className="py-1">
            <button type="button" aria-expanded={open} onClick={() => setOpenDate(open ? null : date)} className="flex w-full cursor-pointer items-center gap-3 py-2.5 text-left">
              <span className="text-sm font-semibold text-[var(--ax-text)]">Fecha {date}</span>
              <span className="text-xs text-[var(--ax-muted)]">{dateMatches[0]?.calendar_date ? new Date(`${dateMatches[0].calendar_date}T00:00:00`).toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Sin día asignado'} · {dateMatches.length} partido{dateMatches.length === 1 ? '' : 's'}</span>
              {live && <Badge tone="success">En vivo</Badge>}
              <ChevronDown size={16} aria-hidden="true" className={cx('ml-auto shrink-0 text-[var(--ax-muted)] transition-transform duration-150', open && 'rotate-180')} />
            </button>
            {open && <div className="pb-2">{dateMatches.map((match) => <MatchRow key={match.id} match={match} selected={match.id === selectedMatch?.id} onPreview={() => setSelectedMatchId(match.id)} />)}</div>}
          </div>
        })}
      </div>
    </Card>}
  </div>
}

function MatchHighlight({ match, events: initialEvents = [], corrections = [], rosters = [], canManage = false, rules = null }: { match: Match; events?: MatchEvent[]; corrections?: MatchEventCorrection[]; rosters?: RosterEntry[]; canManage?: boolean; rules?: MatchRules | null }) {
  const [seconds, setSeconds] = useState(match.elapsed_seconds || 0)
  const [loadedRules, setLoadedRules] = useState<MatchRules | null>(rules)
  const [isFootball, setIsFootball] = useState(false)
  const [isFootball8, setIsFootball8] = useState(false)
  const [disciplineCode, setDisciplineCode] = useState('')
  // Duraciones de la configuración del torneo, por si la modalidad no trae reglas propias.
  const [competitionTimes, setCompetitionTimes] = useState<{ half?: number | null; halftime?: number | null }>({})
  const [matchPhase, setMatchPhase] = useState('regular')
  const [shootoutScore, setShootoutScore] = useState<string | null>(null)
  // Controla la tanda visual y sus tiros registrados en Supabase.
  const [shootoutKicks, setShootoutKicks] = useState<ShootoutKick[]>([])
  const [showShootout, setShowShootout] = useState(false)
  const isRugbyDiscipline = disciplineCode === 'rugby'
  const regularPeriodLimit = (loadedRules?.half_duration_minutes || competitionTimes.half || 7) * 60
  const extraPeriodLimit = isFootball8 ? 600 : (loadedRules?.extra_time_half_minutes || 5) * 60
  const periodLimit = String(match.period).startsWith('extra_') ? extraPeriodLimit : regularPeriodLimit
  const [saving, setSaving] = useState(false)
  // Controla el tiempo transcurrido durante el descanso.
  const [breakElapsedSeconds, setBreakElapsedSeconds] = useState(0)
  const [events, setEvents] = useState<MatchEvent[]>(initialEvents)
  const [eventCorrections, setEventCorrections] = useState<MatchEventCorrection[]>(corrections)
  const [pendingScoreAction, setPendingScoreAction] = useState<{
    teamId: string
    playerId: string | null
    label: string
    eventType: 'try' | 'conversion' | 'penalty' | 'goal' | 'penalty_kick'
    points: number
  } | null>(null)
  const [correctionEvent, setCorrectionEvent] = useState<MatchEvent | null>(null)
  const [correctionReason, setCorrectionReason] = useState('')
  const [correctionMode, setCorrectionMode] = useState(false)
  const [modalityCode, setModalityCode] = useState('')
  const [actionError, setActionError] = useState('')
  const [confirmEarlyFinish, setConfirmEarlyFinish] = useState<string | null>(null)
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, string>>({})
  const [mobileTeam, setMobileTeam] = useState<'local' | 'visitor'>('local')
  const [shootoutDraft, setShootoutDraft] = useState<{ local: string; visitor: string } | null>(null)
  // Tarjeta o incidencia que se está registrando: abre el panel inline del equipo.
  const [cardDraft, setCardDraft] = useState<{ teamId: string; type: 'yellow_card' | 'red_card' | 'injured' | 'concussion'; playerId: string } | null>(null)
  const [overtimeFinished, setOvertimeFinished] = useState(false)
  const scoringEventTypes = isFootball
    ? ['goal', 'penalty_kick']
    : ['try', 'conversion', 'penalty']

  // Mantiene los eventos de puntuación separados por disciplina.
  function isScoringEvent(eventType: string) {
    return scoringEventTypes.includes(eventType)
  }

  // Devuelve el nombre visible de cada evento según la disciplina.
  function getEventTypeLabel(eventType: string) {
    const labels: Record<string, string> = {
      try: 'Try',
      conversion: 'Conversión',
      penalty: 'Penal',
      goal: 'Gol',
      penalty_kick: 'Penal',
    }
    return labels[eventType] || eventType
  }

  useEffect(() => {
    let active = true
    if (!supabase) return () => { active = false }
    void (async () => {
      setLoadedRules(null)
      setIsFootball8(false)
      setDisciplineCode('')
      setCompetitionTimes({})
      setMatchPhase('regular')
      setShootoutScore(null)
      setShootoutKicks([])
      setShowShootout(false)
      const { data } = await supabase
        .from('matches')
        .select('match_phase, shootout_local_score, shootout_visitor_score, fixtures!inner(tournament_id)')
        .eq('id', match.id)
        .maybeSingle()
      const tournamentId = (data?.fixtures as { tournament_id?: string } | null)?.tournament_id
      if (active && data) {
        setMatchPhase(data.match_phase || 'regular')
        if (data.shootout_local_score != null && data.shootout_visitor_score != null) setShootoutScore(`${data.shootout_local_score} - ${data.shootout_visitor_score}`)
      }
      const { data: kickData } = await supabase
        .from('match_shootout_kicks')
        .select('id, round_number, team_id, result')
        .eq('match_id', match.id)
        .order('round_number', { ascending: true })
        .order('created_at', { ascending: true })
      if (active) setShootoutKicks((kickData || []) as ShootoutKick[])
      if (!tournamentId) return
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('modality_id, discipline_id')
        .eq('id', tournamentId)
        .maybeSingle()
      if (tournament?.discipline_id) {
        const { data: discipline } = await supabase.from('disciplines')
          .select('code').eq('id', tournament.discipline_id).maybeSingle()
        if (active) {
          setIsFootball(discipline?.code === 'futbol')
          setDisciplineCode(discipline?.code || '')
        }
      }
      if (!tournament?.modality_id) return
      const [{ data: modalityRules }, { data: modality }, { data: settings }] = await Promise.all([supabase
        .from('sport_modality_rules')
        .select('half_duration_minutes, extra_time_allowed, extra_time_half_minutes, penalty_shootout_allowed, draws_allowed')
        .eq('modality_id', tournament.modality_id)
        .maybeSingle(),
        supabase.from('sport_modalities').select('code').eq('id', tournament.modality_id).maybeSingle(),
        supabase.from('tournament_competition_settings')
          .select('half_duration_minutes, halftime_duration_minutes')
          .eq('tournament_id', tournamentId)
          .maybeSingle(),
      ])
      if (active) {
        const football8 = modality?.code === 'futbol-8'
        setIsFootball8(football8)
        setModalityCode(modality?.code || '')
        setCompetitionTimes({ half: settings?.half_duration_minutes, halftime: settings?.halftime_duration_minutes })
        setLoadedRules(modalityRules ? {
          ...modalityRules,
          half_duration_minutes: settings?.half_duration_minutes
            ?? modalityRules.half_duration_minutes,
          halftime_duration_minutes: settings?.halftime_duration_minutes
            ?? 5,
          draws_allowed: football8 ? false : modalityRules.draws_allowed,
        } as MatchRules : null)
      }
    })()
    return () => { active = false }
  }, [match.id, rules])
  const secondsRef = useRef(0)
  useEffect(() => { const initialSeconds = match.elapsed_seconds || 0; secondsRef.current = initialSeconds; setSeconds(initialSeconds) }, [match.id, match.elapsed_seconds])
  useEffect(() => { setEvents(initialEvents) }, [initialEvents, match.id])
  useEffect(() => { setEventCorrections(corrections) }, [corrections, match.id])
  useEffect(() => {
    if (match.status !== 'live' || match.is_paused) return
    const inOvertime = match.match_phase === 'overtime' && Boolean(match.overtime_started_at)
    const startedAt = inOvertime
      ? new Date(match.overtime_started_at as string).getTime()
      : match.started_at ? new Date(match.started_at).getTime() : Date.now()
    const baseSeconds = inOvertime ? 0 : (match.elapsed_seconds || 0)
    const updateClock = () => {
      const nextSeconds = baseSeconds + Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      secondsRef.current = nextSeconds
      setSeconds(nextSeconds)
    }
    updateClock()
    const timer = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(timer)
  }, [match.id, match.status, match.is_paused, match.started_at, match.elapsed_seconds, match.match_phase, match.overtime_started_at])
  const halftimeSeconds = (loadedRules?.halftime_duration_minutes || competitionTimes.halftime || 5) * 60
  // Fútbol 8 y rugby comparten barra de fases y descanso con reloj.
  const clockPhases = isFootball8 ? sportClocks.football8 : isRugbyDiscipline ? sportClocks.rugby : null
  const isHalftime = Boolean(clockPhases)
    && isHalftimeState({ status: match.status, period: match.period, isPaused: match.is_paused })
  // Actualiza el reloj del descanso usando la hora en que terminó el primer tiempo.
  useEffect(() => {
    if (!isHalftime || !match.started_at) {
      setBreakElapsedSeconds(0)
      return
    }
    const startedAt = new Date(match.started_at).getTime()
    const updateBreakClock = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      setBreakElapsedSeconds(Math.min(halftimeSeconds, Math.max(0, elapsed)))
    }
    updateBreakClock()
    const timer = window.setInterval(updateBreakClock, 1000)
    return () => window.clearInterval(timer)
  }, [halftimeSeconds, isHalftime, match.started_at])
  async function changeStatus(status: 'live' | 'finished') {
    if (!supabase || !canManage) return
    setSaving(true)
    const { error } = await supabase.from('matches').update({ status, period: 'first_half', is_paused: status === 'finished', elapsed_seconds: secondsRef.current, started_at: status === 'live' ? new Date().toISOString() : match.started_at }).eq('id', match.id)
    setSaving(false)
    if (error) return setActionError(error.message)
    window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
    window.location.reload()
  }
  async function transitionPeriod(earlyFinishApproved = false) {
    if (!supabase || !canManage || match.status !== 'live') return
    if (isFootball8) {
      if (!loadedRules || matchPhase === 'penalty_shootout') return
      const period = String(match.period || 'first_half')
      const elapsedSeconds = secondsRef.current
      const isExtraTime = period.startsWith('extra_')
      const isEarlyFinish = !isExtraTime
        && !match.is_paused
        && elapsedSeconds < periodLimit
      const earlyFinishConfirmed = isEarlyFinish && earlyFinishApproved
      if (isEarlyFinish && !earlyFinishApproved) {
        // Pide confirmación inline antes de cortar un tiempo que no ha terminado.
        setConfirmEarlyFinish(formatSeconds(Math.max(0, periodLimit - elapsedSeconds)))
        return
      }
      const { data: scoringEvents, error: scoreError } = await supabase
        .from('match_events')
        .select('team_id, event_type, points, is_corrected')
        .eq('match_id', match.id)
        .eq('is_corrected', false)
        .in('event_type', ['goal', 'penalty_kick'])
      if (scoreError) {
        return setActionError(scoreError.message || 'No se pudo consultar el marcador.')
      }
      const currentScore = footballEightScoreFromEvents(
        (scoringEvents || []).map((event) => ({
          teamId: event.team_id,
          eventType: event.event_type,
          points: event.points,
          isCorrected: event.is_corrected,
        })),
        match.local_team_id,
        match.visitor_team_id,
      )
      const nextPhase = footballEightNextPhase(
        period,
        Boolean(match.is_paused),
        currentScore.local === currentScore.visitor,
      )
      const scoreUpdate = {
        local_score: currentScore.local,
        visitor_score: currentScore.visitor,
      }
      const now = new Date().toISOString()
      const next = nextPhase === 'halftime'
        ? {
            ...scoreUpdate,
            early_finish_confirmed: earlyFinishConfirmed,
            period: 'second_half',
            is_paused: true,
            started_at: now,
            elapsed_seconds: 0,
            first_half_seconds: secondsRef.current,
          }
        : nextPhase === 'second_half'
          ? {
              ...scoreUpdate,
              early_finish_confirmed: earlyFinishConfirmed,
              is_paused: false,
              started_at: now,
              elapsed_seconds: 0,
            }
          : nextPhase === 'extra_time_ready'
            ? {
                ...scoreUpdate,
                early_finish_confirmed: earlyFinishConfirmed,
                period: 'extra_first_half',
                match_phase: 'extra_time',
                is_paused: true,
                elapsed_seconds: 0,
                second_half_seconds: secondsRef.current,
              }
            : nextPhase === 'extra_time'
              ? {
                  ...scoreUpdate,
                  early_finish_confirmed: earlyFinishConfirmed,
                  is_paused: false,
                  started_at: now,
                  elapsed_seconds: 0,
                }
              : nextPhase === 'penalty_shootout'
                ? {
                    ...scoreUpdate,
                    early_finish_confirmed: earlyFinishConfirmed,
                    match_phase: 'penalty_shootout',
                    is_paused: true,
                    extra_time_seconds: secondsRef.current,
                    elapsed_seconds: secondsRef.current,
                  }
                : {
                    ...scoreUpdate,
                    early_finish_confirmed: earlyFinishConfirmed,
                    status: 'finished',
                    is_paused: true,
                    finished_at: now,
                    elapsed_seconds: secondsRef.current,
                    ...(period === 'second_half'
                      ? { second_half_seconds: secondsRef.current }
                      : { extra_time_seconds: secondsRef.current }),
                  }
      setSaving(true)
      const { error } = await supabase.from('matches').update(next).eq('id', match.id)
      setSaving(false)
      if (error) return setActionError(error.message)
      window.location.reload()
      return
    }
    const currentPeriod = String(match.period || 'first_half')
    const isSecondHalf = currentPeriod === 'second_half'
    const isExtraFirstHalf = currentPeriod === 'extra_first_half'
    const isExtraSecondHalf = currentPeriod === 'extra_second_half'
    const isStartingSecond = Boolean(match.is_paused && isSecondHalf)
    const isStartingExtra = Boolean(match.is_paused && (isExtraFirstHalf || isExtraSecondHalf))
    const scoredEvents = events.filter((event) => !event.is_corrected).reduce((score, event) => {
      if (event.team_id === match.local_team_id) score.local += event.points || 0
      if (event.team_id === match.visitor_team_id) score.visitor += event.points || 0
      return score
    }, { local: 0, visitor: 0 })
    const isTied = scoredEvents.local === scoredEvents.visitor
    // Rugby avisa antes de cortar un tiempo que aún no termina, igual que fútbol 8.
    const rugbyRemaining = isRugbyDiscipline
      ? earlyFinishRemaining(currentPeriod, match.is_paused, secondsRef.current, periodLimit)
      : null
    if (rugbyRemaining !== null && !earlyFinishApproved) {
      setConfirmEarlyFinish(formatSeconds(rugbyRemaining))
      return
    }
    const rugbyFlag = isRugbyDiscipline ? { early_finish_confirmed: rugbyRemaining !== null && earlyFinishApproved } : {}
    const next = isStartingSecond
        ? { is_paused: false, started_at: new Date().toISOString(), elapsed_seconds: 0, second_half_seconds: 0, period: 'second_half', ...rugbyFlag }
      : isStartingExtra
        ? { is_paused: false, started_at: new Date().toISOString(), elapsed_seconds: 0, period: isExtraFirstHalf ? 'extra_first_half' : 'extra_second_half' }
      : currentPeriod === 'first_half'
        // En rugby el descanso empieza ahora: el reloj del descanso cuenta desde started_at.
        ? { is_paused: true, started_at: isRugbyDiscipline ? new Date().toISOString() : match.started_at, elapsed_seconds: isRugbyDiscipline ? 0 : secondsRef.current, first_half_seconds: secondsRef.current, period: 'second_half', ...rugbyFlag }
      : isExtraFirstHalf
        ? { is_paused: true, started_at: match.started_at, elapsed_seconds: secondsRef.current, period: 'extra_second_half' }
      : isExtraSecondHalf
        ? { status: 'finished', is_paused: true, started_at: match.started_at, elapsed_seconds: secondsRef.current, period: 'extra_second_half', local_score: scoredEvents.local, visitor_score: scoredEvents.visitor }
      // Las ligas permiten empates; la prórroga solo aplica cuando el empate
      // no está permitido, como ocurre en una fase eliminatoria.
      // En rugby el desempate es la prórroga de muerte súbita, que se inicia desde el partido finalizado.
      : isTied && loadedRules?.extra_time_allowed && !loadedRules.draws_allowed && !isRugbyDiscipline
        ? { is_paused: true, started_at: match.started_at, elapsed_seconds: 0, period: 'extra_first_half' }
        : { status: 'finished', is_paused: true, started_at: match.started_at, elapsed_seconds: secondsRef.current, second_half_seconds: secondsRef.current, period: 'second_half', local_score: scoredEvents.local, visitor_score: scoredEvents.visitor, ...rugbyFlag }
    const { error } = await supabase.from('matches').update(next).eq('id', match.id)
    if (error) return setActionError(error.message)
    window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
    window.location.reload()
  }
  async function togglePause() {
    if (!supabase || !canManage || match.status !== 'live') return
    const paused = !match.is_paused
    const { error } = await supabase.from('matches').update({ is_paused: paused, elapsed_seconds: secondsRef.current, started_at: paused ? match.started_at : new Date().toISOString() }).eq('id', match.id)
    if (error) return setActionError(error.message)
    window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
    window.location.reload()
  }

  async function registerShootout() {
    if (!supabase || !canManage || !loadedRules?.penalty_shootout_allowed) return
    if (isFootball8 && (matchPhase !== 'penalty_shootout' || match.status !== 'live')) return
    if (!shootoutDraft) return
    const local = Number(shootoutDraft.local)
    const visitor = Number(shootoutDraft.visitor)
    if (!Number.isInteger(local) || !Number.isInteger(visitor) || local < 0 || visitor < 0 || local === visitor) {
      setActionError('La tanda debe tener marcadores enteros y un ganador.')
      return
    }
    const { error } = await supabase.from('matches').update({
      match_phase: 'penalty_shootout',
      shootout_local_score: local,
      shootout_visitor_score: visitor,
      status: 'finished',
      is_paused: true,
      finished_at: new Date().toISOString(),
    }).eq('id', match.id)
    if (error) return setActionError(error.message)
    window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
    window.location.reload()
  }

  // Registra un tiro y deja que Supabase determine si ya existe un ganador.
  async function recordShootoutKick(
    teamId: string,
    result: 'goal' | 'miss',
  ) {
    if (!supabase || !canManage || !isFootball8) return
    if (matchPhase !== 'penalty_shootout' || match.status !== 'live') return

    setSaving(true)
    const { data, error } = await supabase.rpc(
      'register_football_shootout_kick',
      {
        p_match_id: match.id,
        p_team_id: teamId,
        p_result: result,
      },
    )
    setSaving(false)

    if (error) return setActionError(error.message)

    const { data: kickData, error: kickError } = await supabase
      .from('match_shootout_kicks')
      .select('id, round_number, team_id, result')
      .eq('match_id', match.id)
      .order('round_number', { ascending: true })
      .order('created_at', { ascending: true })
    if (kickError) return setActionError(kickError.message)

    setShootoutKicks((kickData || []) as ShootoutKick[])
    window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))

    const resultData = data as { finished?: boolean }
    if (resultData?.finished) window.location.reload()
  }
  async function recordEvent(
    teamId: string,
    playerId: string | null,
    eventType: 'try' | 'conversion' | 'penalty' | 'goal' | 'penalty_kick'
      | 'yellow_card' | 'red_card' | 'injured' | 'concussion',
    points: number,
  ) {
    if (!supabase || !canManage || match.status !== 'live') return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    const newEvent = { match_id: match.id, team_id: teamId, player_id: playerId, event_type: eventType, points }
    const { data: savedEvent, error } = await supabase
      .from('match_events')
      .insert({ ...newEvent, match_second: secondsRef.current, created_by: user.id })
      .select(
        'id, match_id, team_id, player_id, event_type, points, match_second, '
        + 'created_at, is_corrected, correction_reason, corrected_at'
      )
      .single()
    setSaving(false)
    if (error) return setActionError(error.message)
    if (isScoringEvent(eventType)) {
      const nextLocalScore = events
        .filter((event) => !event.is_corrected
          && event.team_id === match.local_team_id
          && isScoringEvent(event.event_type))
        .reduce((total, event) => total + (event.points || 0), 0)
        + (teamId === match.local_team_id ? points : 0)
      const nextVisitorScore = events
        .filter((event) => !event.is_corrected
          && event.team_id === match.visitor_team_id
          && isScoringEvent(event.event_type))
        .reduce((total, event) => total + (event.points || 0), 0)
        + (teamId === match.visitor_team_id ? points : 0)
      const { error: scoreError } = await supabase.from('matches').update({ local_score: nextLocalScore, visitor_score: nextVisitorScore }).eq('id', match.id)
      if (scoreError) return setActionError(scoreError.message)
    }
    setEvents((current) => [...current, (savedEvent ?? newEvent) as MatchEvent])
    window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
  }

  // Corrige un evento de puntuacion sin borrar su registro original.
  async function correctScoringEvent() {
    if (!supabase || !canManage || !correctionEvent) return
    if (!correctionReason.trim()) return setActionError('Indica el motivo de la correccion.')

    setSaving(true)
    const { error } = await supabase.rpc('correct_match_scoring_event', {
      p_event_id: correctionEvent.id,
      p_reason: correctionReason.trim(),
    })
    setSaving(false)

    if (error) return setActionError(error.message)

    const correctedAt = new Date().toISOString()
    setEvents((current) => current.map((event) => (
      event.id === correctionEvent.id
        ? {
            ...event,
            is_corrected: true,
            correction_reason: correctionReason.trim(),
            corrected_at: correctedAt,
          }
        : event
    )))
    setEventCorrections((current) => [
      {
        id: `local-${correctionEvent.id}`,
        match_event_id: correctionEvent.id,
        match_id: match.id,
        event_type: correctionEvent.event_type,
        points_removed: correctionEvent.points,
        reason: correctionReason.trim(),
        created_at: correctedAt,
      },
      ...current,
    ])
    setCorrectionEvent(null)
    setCorrectionReason('')
    setCorrectionMode(false)
    window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
  }
  function confirmScoreAction() {
    if (!pendingScoreAction) return
    void recordEvent(pendingScoreAction.teamId, pendingScoreAction.playerId, pendingScoreAction.eventType, pendingScoreAction.points)
    setPendingScoreAction(null)
  }

  // Registra la tarjeta o incidencia elegida. En fútbol, la segunda amarilla suma también la roja.
  async function confirmCard() {
    if (!cardDraft) return
    const { teamId, type, playerId } = cardDraft
    const secondYellow = isFootball && type === 'yellow_card' && playerId
      ? footballNextYellowIsRed(events.filter((event) => !event.is_corrected), playerId)
      : false
    await recordEvent(teamId, playerId || null, type, 0)
    if (secondYellow) await recordEvent(teamId, playerId, 'red_card', 0)
    setCardDraft(null)
  }
  const status = match.match_phase === 'overtime' ? 'En prórroga' : match.match_phase === 'overtime_finished' ? 'Prórroga finalizada' : match.status === 'live' ? 'En vivo' : match.status === 'finished' ? 'Finalizado' : match.status === 'cancelled' ? 'Cancelado' : 'Programado'
  const activeEvents = events.filter((event) => !event.is_corrected)
  const points = activeEvents.reduce((total, event) => total + (event.points || 0), 0)
  const inOvertimeClock = match.match_phase === 'overtime'
  const regularSeconds = inOvertimeClock ? seconds : Math.min(seconds, periodLimit)
  const stoppageSeconds = inOvertimeClock ? 0 : Math.max(0, seconds - periodLimit)
  const timer = `${String(Math.floor(regularSeconds / 60)).padStart(2, '0')}:${String(regularSeconds % 60).padStart(2, '0')}`
  const stoppageTimer = `+${String(Math.floor(stoppageSeconds / 60)).padStart(2, '0')}:${String(stoppageSeconds % 60).padStart(2, '0')}`
  const periodLabel = String(match.period).startsWith('extra_') ? 'tiempo extra' : match.period === 'second_half' ? 'segundo tiempo' : 'primer tiempo'
  const firstHalfSummary = match.period === 'first_half' ? seconds : (match.first_half_seconds ?? 0)
  const firstHalfTimer = `${String(Math.floor(Math.min(firstHalfSummary, regularPeriodLimit) / 60)).padStart(2, '0')}:${String(Math.min(firstHalfSummary, regularPeriodLimit) % 60).padStart(2, '0')}`
  const firstHalfStoppage = `+${String(Math.floor(Math.max(0, firstHalfSummary - regularPeriodLimit) / 60)).padStart(2, '0')}:${String(Math.max(0, firstHalfSummary - regularPeriodLimit) % 60).padStart(2, '0')}`
  const secondHalfSummary = match.status === 'finished' || String(match.period).startsWith('extra_') ? (match.second_half_seconds ?? 0) : seconds
  const secondHalfTimer = `${String(Math.floor(Math.min(secondHalfSummary, regularPeriodLimit) / 60)).padStart(2, '0')}:${String(Math.min(secondHalfSummary, regularPeriodLimit) % 60).padStart(2, '0')}`
  const secondHalfStoppage = `+${String(Math.floor(Math.max(0, secondHalfSummary - regularPeriodLimit) / 60)).padStart(2, '0')}:${String(Math.max(0, secondHalfSummary - regularPeriodLimit) % 60).padStart(2, '0')}`
  const secondHalfLabel = match.period !== 'second_half' && !String(match.period).startsWith('extra_') ? 'Pendiente' : match.is_paused && match.period === 'second_half' && match.status !== 'finished' ? 'Pendiente' : `${secondHalfTimer}${secondHalfSummary > regularPeriodLimit ? ` ${secondHalfStoppage}` : ''}`
  const breakRemainingSeconds = Math.max(0, halftimeSeconds - breakElapsedSeconds)
  const breakTimer = `${String(Math.floor(breakRemainingSeconds / 60)).padStart(2, '0')}:${String(breakRemainingSeconds % 60).padStart(2, '0')}`
  const periodActionClass = match.is_paused && match.period === 'second_half' ? 'rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]' : 'rounded-[5px] border border-[#ff7d88] px-4 py-3 text-sm font-bold text-[#ffb0b7]'

  // Filtra únicamente los eventos de puntuación que todavía afectan el marcador.
  const scoringEvents = events.filter((event) => (
    !event.is_corrected &&
    isScoringEvent(event.event_type)
  ))

  // Identifica el equipo asociado a cada evento para mostrarlo en la corrección.
  function getEventTeamName(teamId: string) {
    return teamId === match.local_team_id
      ? match.local_team_name
      : match.visitor_team_name
  }

  const localScore = activeEvents
    .filter((event) => event.team_id === match.local_team_id
      && isScoringEvent(event.event_type))
    .reduce((total, event) => total + (event.points || 0), 0)
  const visitorScore = activeEvents
    .filter((event) => event.team_id === match.visitor_team_id
      && isScoringEvent(event.event_type))
    .reduce((total, event) => total + (event.points || 0), 0)
  const scoreLabel = match.status === 'scheduled' ? 'VS' : `${localScore} - ${visitorScore}`
  const statRows = isFootball
    ? [
        { label: 'Goles', type: 'goal' },
        { label: 'Penales', type: 'penalty_kick' },
        { label: 'Tarjetas amarillas', type: 'yellow_card' },
        { label: 'Tarjetas rojas', type: 'red_card' },
      ]
    : [
        { label: 'Tries', type: 'try' },
        { label: 'Conversiones', type: 'conversion' },
        { label: 'Tarjetas amarillas', type: 'yellow_card' },
        { label: 'Tarjetas rojas', type: 'red_card' },
      ]

  // Cuenta los eventos activos de un tipo y equipo específico.
  function count(teamId: string | null, eventType: string) {
    return activeEvents.filter(
      (event) => event.team_id === teamId && event.event_type === eventType
    ).length
  }

  const isRugby = !isFootball
  const sinBinSeconds = rugbySinBinSeconds(modalityCode)
  const live = match.status === 'live'
  const inShootout = isFootball8 && matchPhase === 'penalty_shootout'
  const canRecord = canManage && live && !inShootout
  const sides = [
    { id: match.local_team_id, name: match.local_team_name, logo: match.local_logo_url, score: localScore, role: 'Local' },
    { id: match.visitor_team_id, name: match.visitor_team_name, logo: match.visitor_logo_url, score: visitorScore, role: 'Visitante' },
  ]
  const rosterOf = (teamId: string) => rosters.filter((player) => player.team_id === teamId)
    .sort((left, right) => (left.shirt_number ?? 999) - (right.shirt_number ?? 999))
  const playerById = (playerId?: string | null) => rosters.find((player) => player.player_id === playerId)
  const playerLabel = (playerId?: string | null) => {
    const player = playerById(playerId)
    return player ? `${player.shirt_number != null ? `#${player.shirt_number} ` : ''}${player.full_name}` : ''
  }
  const activeSinBins = isRugby && live ? rugbyActiveSinBins(activeEvents, seconds, sinBinSeconds) : []
  const isSentOff = (playerId: string) => isFootball
    ? footballPlayerCards(activeEvents, playerId).sentOff
    : activeEvents.some((event) => event.player_id === playerId && event.event_type === 'red_card')
  const yellowCount = (playerId: string) => activeEvents.filter((event) => event.player_id === playerId && event.event_type === 'yellow_card').length
  const minuteOf = (second?: number | null) => `${Math.floor((second ?? 0) / 60)}'`
  const clockLabel = matchClockLabel({
    status: match.status,
    scheduledTime: match.scheduled_time,
    matchPhase: match.match_phase,
    isPaused: match.is_paused,
    inShootout,
    isHalftime,
    breakTimer,
    periodLabel,
    timer,
  })
  const scoreButtons = isFootball
    ? [{ label: 'Gol', eventType: 'goal' as const, points: 1 }, { label: 'Gol de penal', eventType: 'penalty_kick' as const, points: 1 }]
    : [{ label: 'Try', eventType: 'try' as const, points: 5 }, { label: 'Conversión', eventType: 'conversion' as const, points: 2 }]
  const disciplineButtons = [
    { type: 'yellow_card' as const, label: 'Amarilla' },
    { type: 'red_card' as const, label: 'Roja' },
    { type: 'injured' as const, label: 'Lesión' },
    ...(isRugby ? [{ type: 'concussion' as const, label: 'Conmoción' }] : []),
  ]
  // Recorre los eventos en orden para mostrar el marcador después de cada anotación.
  const timeline = (() => {
    let local = 0
    let visitor = 0
    const ordered = [...events].sort((left, right) => (Date.parse(left.created_at || '') || 0) - (Date.parse(right.created_at || '') || 0))
    return ordered.map((event) => {
      if (!event.is_corrected && isScoringEvent(event.event_type)) {
        if (event.team_id === match.local_team_id) local += event.points || 0
        if (event.team_id === match.visitor_team_id) visitor += event.points || 0
      }
      return { event, score: `${local} – ${visitor}` }
    }).reverse()
  })()
  const steps = clockPhases
    ? phaseSteps(clockPhases, {
      status: match.status,
      period: match.period,
      // El estado de fase se lee de la base de datos; el de la fila llega con el partido.
      matchPhase: match.match_phase && match.match_phase !== 'regular' ? match.match_phase : matchPhase,
      isPaused: match.is_paused,
      hasShootoutScore: Boolean(shootoutScore),
    })
    : null
  const periodActionText = periodActionLabel(match.period, match.is_paused)

  function openCard(teamId: string, type: NonNullable<typeof cardDraft>['type']) {
    setPendingScoreAction(null)
    setCardDraft({ teamId, type, playerId: selectedPlayers[teamId] || '' })
  }

  function cardPanel(teamId: string, teamName: string) {
    if (!cardDraft || cardDraft.teamId !== teamId) return null
    const yellow = cardDraft.type === 'yellow_card'
    const red = cardDraft.type === 'red_card'
    const players = rosterOf(teamId)
    const chosen = cardDraft.playerId
    const secondYellow = yellow && isFootball && chosen ? footballNextYellowIsRed(activeEvents, chosen) : false
    const title = yellow ? 'Tarjeta amarilla' : red ? 'Tarjeta roja' : cardDraft.type === 'injured' ? 'Jugador lesionado' : 'Conmoción cerebral'
    const confirmLabel = yellow ? (secondYellow ? 'Mostrar amarilla y roja' : 'Mostrar amarilla') : red ? 'Mostrar roja' : 'Registrar'
    const note = yellow
      ? isRugby
        ? `Expulsión temporal de ${sinBinSeconds / 60} minutos. ${teamName} juega con uno menos hasta que vuelva.`
        : secondYellow ? 'Es su segunda amarilla: también se registra la roja y queda expulsado.' : 'Si recibe una segunda amarilla, queda expulsado.'
      : red
        ? 'Expulsión definitiva: no puede volver a este partido.'
        : cardDraft.type === 'concussion'
          ? 'Sale del campo para la evaluación médica (HIA) y queda registrado en su ficha.'
          : 'Queda registrado en la ficha del jugador.'
    return <div role="group" aria-label={`${title} para ${teamName}`} className={cx(
      'ax-drop-in space-y-3 rounded-[14px] border p-3.5',
      yellow ? 'border-[var(--ax-card-yellow-line)] bg-[var(--ax-card-yellow-soft)]' : red ? 'border-[var(--ax-danger-line)] bg-[var(--ax-danger-soft)]' : 'border-[var(--ax-line-strong)] bg-[var(--ax-surface-sunken)]',
    )}>
      <div className="flex items-start gap-2.5">
        {yellow || red
          ? <span aria-hidden="true" className={cx('mt-0.5 h-[18px] w-[13px] shrink-0 rounded-[3px] shadow-sm', yellow ? 'bg-[var(--ax-card-yellow)]' : 'bg-[var(--ax-card-red)]')} />
          : cardDraft.type === 'injured' ? <HeartPulse size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--ax-danger-text)]" /> : <Brain size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--ax-text-secondary)]" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--ax-text)]">{title}</p>
          <p className="text-xs text-[var(--ax-muted)]">Minuto {minuteOf(seconds)} · {periodLabel}</p>
        </div>
        <button type="button" onClick={() => setCardDraft(null)} aria-label="Cerrar" className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--ax-muted)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]"><X size={15} /></button>
      </div>
      <div>
        <FieldLabel>¿A qué jugador?</FieldLabel>
        {players.length ? <div role="radiogroup" aria-label="Jugador" className="grid max-h-60 gap-1.5 overflow-y-auto">
          {players.map((player) => {
            const out = isSentOff(player.player_id)
            const yellows = yellowCount(player.player_id)
            const binned = activeSinBins.find((bin) => bin.player_id === player.player_id)
            const selected = chosen === player.player_id
            return <button key={player.player_id} type="button" role="radio" aria-checked={selected} disabled={out && (yellow || red)} onClick={() => setCardDraft({ ...cardDraft, playerId: player.player_id })} className={cx(
              'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] border px-2.5 py-1.5 text-left transition-[background-color,border-color] duration-150 disabled:cursor-not-allowed disabled:opacity-45',
              selected ? 'border-[var(--ax-text)] bg-[var(--ax-surface)]' : 'border-transparent bg-[var(--ax-surface)]/60 hover:border-[var(--ax-line-strong)]',
            )}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--ax-surface-raised)] text-xs font-bold tabular-nums text-[var(--ax-text)]">{player.shirt_number ?? '–'}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-[var(--ax-text)]">{player.full_name}</span>
                {(out || yellows > 0 || binned) && <span className="block truncate text-[11px] text-[var(--ax-muted)]">{out ? 'Expulsado' : binned ? `Fuera · vuelve en ${formatSeconds(binned.remaining)}` : `${yellows} amarilla${yellows === 1 ? '' : 's'}`}</span>}
              </span>
              {yellows > 0 && !out && <span aria-hidden="true" className="h-3.5 w-2.5 shrink-0 rounded-[2px] bg-[var(--ax-card-yellow)]" />}
              {out && <span aria-hidden="true" className="h-3.5 w-2.5 shrink-0 rounded-[2px] bg-[var(--ax-card-red)]" />}
            </button>
          })}
        </div> : <p className="rounded-[10px] bg-[var(--ax-surface)] px-3 py-2.5 text-[13px] text-[var(--ax-muted)]">La plantilla no tiene jugadores. Se registra para el equipo.</p>}
      </div>
      <p className={cx('text-xs leading-[18px]', secondYellow ? 'font-semibold text-[var(--ax-danger-text)]' : 'text-[var(--ax-text-secondary)]')}>{note}</p>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setCardDraft(null)}>Cancelar</Button>
        <button type="button" disabled={saving || (players.length > 0 && !chosen)} onClick={() => void confirmCard()} className={cx(
          buttonClass('primary', 'sm'),
          yellow && 'bg-[var(--ax-card-yellow)] text-[#1b1400]',
          red && 'bg-[var(--ax-card-red)] text-white',
        )}>{saving ? 'Guardando…' : confirmLabel}</button>
      </div>
    </div>
  }

  function actionCard(side: (typeof sides)[number], index: number) {
    const players = rosterOf(side.id)
    const pending = pendingScoreAction?.teamId === side.id ? pendingScoreAction : null
    return <div key={side.id} className={cx(index === 0 ? (mobileTeam === 'local' ? '' : 'hidden lg:block') : (mobileTeam === 'visitor' ? '' : 'hidden lg:block'), 'min-w-0')}>
      <Card labelledBy={`actions-${side.id}`} className="h-full">
        <CardHeader id={`actions-${side.id}`} title={side.name} subtitle="Registrar una acción" />
        <div className="mt-4 space-y-3">
          <Select label="Jugador" value={selectedPlayers[side.id] || ''} onChange={(value) => setSelectedPlayers((current) => ({ ...current, [side.id]: value }))} placeholder="Evento del equipo" options={[{ value: '', label: 'Evento del equipo' }, ...players.map((player) => ({ value: player.player_id, label: `${player.shirt_number != null ? `#${player.shirt_number} ` : ''}${player.full_name}` }))]} />
          <div className={cx('grid gap-2', scoreButtons.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
            {scoreButtons.map((button, buttonIndex) => <button key={button.eventType} type="button" disabled={saving} onClick={() => { setCardDraft(null); setPendingScoreAction({ teamId: side.id, playerId: selectedPlayers[side.id] || null, label: button.label, eventType: button.eventType, points: button.points }) }} className={cx(
              'flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-[12px] px-2 py-2 text-center transition-[background-color,border-color,transform] duration-150 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50',
              buttonIndex === 0 ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)] hover:brightness-[1.05]' : 'border border-[var(--ax-line-strong)] bg-[var(--ax-surface-raised)] text-[var(--ax-text)] hover:border-[var(--ax-accent-text)]',
            )}>
              <span className="text-[13px] font-semibold leading-4">{button.label}</span>
              <span className="font-display text-xl leading-6">+{button.points}</span>
            </button>)}
          </div>
          {pending && <div role="group" aria-label="Confirmar anotación" className="ax-drop-in flex flex-wrap items-center gap-2 rounded-[12px] border border-[var(--ax-accent-line)] bg-[var(--ax-accent-soft)] p-2.5 pl-3">
            <p className="min-w-0 flex-1 text-[13px] text-[var(--ax-text)]"><span className="font-semibold">{pending.label} +{pending.points}</span>{pending.playerId ? ` · ${playerLabel(pending.playerId)}` : ` · ${side.name}`}</p>
            <Button size="sm" variant="ghost" onClick={() => setPendingScoreAction(null)}>Cancelar</Button>
            <Button size="sm" variant="primary" disabled={saving} onClick={confirmScoreAction}>Confirmar</Button>
          </div>}
          {cardDraft?.teamId === side.id ? cardPanel(side.id, side.name) : <div className="grid grid-cols-2 gap-2">
            {disciplineButtons.map((button) => <button key={button.type} type="button" disabled={saving} onClick={() => openCard(side.id, button.type)} className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[var(--ax-line-strong)] px-2 text-[13px] font-semibold text-[var(--ax-text)] transition-colors duration-150 hover:bg-[var(--ax-hover)] disabled:cursor-not-allowed disabled:opacity-50">
              {button.type === 'yellow_card' && <span aria-hidden="true" className="h-3.5 w-2.5 rounded-[2px] bg-[var(--ax-card-yellow)]" />}
              {button.type === 'red_card' && <span aria-hidden="true" className="h-3.5 w-2.5 rounded-[2px] bg-[var(--ax-card-red)]" />}
              {button.type === 'injured' && <HeartPulse size={15} aria-hidden="true" className="text-[var(--ax-danger-text)]" />}
              {button.type === 'concussion' && <Brain size={15} aria-hidden="true" className="text-[var(--ax-text-secondary)]" />}
              {button.label}
            </button>)}
          </div>}
        </div>
      </Card>
    </div>
  }

  const eventTile = (event: MatchEvent) => {
    const base = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold'
    if (event.is_corrected) return <span className={cx(base, 'bg-[var(--ax-danger-soft)] text-[var(--ax-danger-text)]')}><X size={13} /></span>
    if (event.event_type === 'yellow_card') return <span className={cx(base, 'bg-[var(--ax-card-yellow-soft)]')}><span className="h-3.5 w-2.5 rounded-[2px] bg-[var(--ax-card-yellow)]" /></span>
    if (event.event_type === 'red_card') return <span className={cx(base, 'bg-[var(--ax-danger-soft)]')}><span className="h-3.5 w-2.5 rounded-[2px] bg-[var(--ax-card-red)]" /></span>
    if (event.event_type === 'injured') return <span className={cx(base, 'bg-[var(--ax-danger-soft)] text-[var(--ax-danger-text)]')}><HeartPulse size={14} /></span>
    if (event.event_type === 'concussion') return <span className={cx(base, 'bg-[var(--ax-surface-raised)] text-[var(--ax-text-secondary)]')}><Brain size={14} /></span>
    return <span className={cx(base, 'bg-[var(--ax-accent-soft)] text-[var(--ax-accent-text)]')}>+{event.points}</span>
  }
  const eventName = (eventType: string) => ({ yellow_card: 'Amarilla', red_card: 'Roja', injured: 'Lesión', concussion: 'Conmoción' } as Record<string, string>)[eventType] || getEventTypeLabel(eventType)

  const timelineCard = <Card labelledBy={`timeline-${match.id}`} className="min-w-0">
    <CardHeader id={`timeline-${match.id}`} title="Cronología" subtitle={canManage ? 'Toca Anular en una anotación para corregirla con motivo.' : `${activeEvents.length} evento${activeEvents.length === 1 ? '' : 's'}`} />
    {timeline.length ? <ul className="mt-3 divide-y divide-[var(--ax-line)]">
      {timeline.map(({ event, score }) => {
        const scoring = isScoringEvent(event.event_type)
        const correcting = correctionEvent?.id === event.id
        return <li key={event.id || `${event.event_type}-${event.match_second}`} className="py-2.5">
          <div className="flex items-center gap-3">
            <span className="w-8 shrink-0 text-[13px] font-semibold tabular-nums text-[var(--ax-muted)]">{minuteOf(event.match_second)}</span>
            {eventTile(event)}
            <div className="min-w-0 flex-1">
              <p className={cx('truncate text-[13px] font-semibold', event.is_corrected ? 'text-[var(--ax-muted)] line-through' : 'text-[var(--ax-text)]')}>{eventName(event.event_type)}{event.player_id ? ` · ${playerById(event.player_id)?.full_name || 'Jugador'}` : ''}</p>
              <p className="truncate text-xs text-[var(--ax-muted)]">{event.is_corrected ? `Anulado${event.correction_reason ? ` · ${event.correction_reason}` : ''}` : `${event.team_id ? getEventTeamName(event.team_id) : ''}${scoring ? ` · ${score}` : ''}`}</p>
            </div>
            {canManage && scoring && !event.is_corrected && event.id && <button type="button" onClick={() => { setCorrectionEvent(correcting ? null : event); setCorrectionReason('') }} className="shrink-0 cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-[var(--ax-danger-text)] hover:bg-[var(--ax-danger-soft)]">{correcting ? 'Cerrar' : 'Anular'}</button>}
          </div>
          {correcting && <form onSubmit={(formEvent) => { formEvent.preventDefault(); void correctScoringEvent() }} className="ax-drop-in mt-2.5 flex flex-col gap-2 rounded-[12px] border border-[var(--ax-danger-line)] bg-[var(--ax-danger-soft)] p-2.5 sm:flex-row">
            <label className="min-w-0 flex-1"><span className="sr-only">Motivo de la anulación</span><input autoFocus value={correctionReason} onChange={(changeEvent) => setCorrectionReason(changeEvent.target.value)} placeholder="Motivo: pase adelantado, error de registro…" className={inputClass} /></label>
            <Button type="submit" size="md" variant="danger" disabled={saving || !correctionReason.trim()}>Anular {getEventTypeLabel(event.event_type).toLowerCase()}</Button>
          </form>}
        </li>
      })}
    </ul> : <p className="mt-4 rounded-[12px] bg-[var(--ax-surface-sunken)] px-4 py-6 text-center text-[13px] text-[var(--ax-muted)]">{match.status === 'scheduled' ? 'El partido todavía no empieza.' : 'Aún no hay acciones registradas.'}</p>}
  </Card>

  const statsCard = <Card labelledBy={`stats-${match.id}`}>
    <CardHeader id={`stats-${match.id}`} title="Estadísticas" />
    <table className="mt-3 w-full text-sm">
      <thead><tr className="text-xs text-[var(--ax-muted)]"><th className="w-1/3 py-2 text-left font-semibold">{match.local_team_name}</th><th className="py-2 font-medium" /><th className="w-1/3 py-2 text-right font-semibold">{match.visitor_team_name}</th></tr></thead>
      <tbody className="divide-y divide-[var(--ax-line)]">{statRows.map((row) => <tr key={row.type}><td className="py-2.5 font-display text-xl tabular-nums text-[var(--ax-text)]">{count(match.local_team_id, row.type)}</td><td className="py-2.5 text-center text-[13px] text-[var(--ax-muted)]">{row.label}</td><td className="py-2.5 text-right font-display text-xl tabular-nums text-[var(--ax-text)]">{count(match.visitor_team_id, row.type)}</td></tr>)}</tbody>
    </table>
  </Card>

  const shouldShowOvertimePanel = match.match_phase === 'overtime'
    || match.match_phase === 'overtime_finished'
    || (match.status === 'finished' && match.local_score === match.visitor_score && (!match.match_phase || match.match_phase === 'regular'))
  const localTeam = { id: match.local_team_id || '', name: match.local_team_name || 'Equipo Local' }
  const visitorTeam = { id: match.visitor_team_id || '', name: match.visitor_team_name || 'Equipo Visitante' }

  return <article aria-label={`${match.local_team_name} contra ${match.visitor_team_name}`} className="ax-v2 space-y-5">
    <section className={cx('rounded-2xl border bg-[var(--ax-surface)] p-4 sm:rounded-[20px] sm:p-7', live ? 'border-[var(--ax-accent-line)]' : 'border-[var(--ax-line)]')}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ax-muted)]">
        <span>Fecha {match.date_number}{match.division_name ? ` · ${match.division_name}` : ''}{match.scheduled_time ? ` · ${match.scheduled_time.slice(0, 5)}` : ''}{match.court_number ? ` · Cancha ${match.court_number}` : ''}</span>
        <Badge tone={live ? 'success' : match.status === 'finished' ? 'neutral' : 'warning'}>{status}</Badge>
      </div>
      {steps && <PhaseBar steps={steps} />}
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
        {sides.map((side, index) => <div key={side.id} className={cx('flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:gap-4', index === 0 ? 'sm:flex-row-reverse sm:text-right' : 'sm:text-left', index === 1 && 'order-3')}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] text-sm font-bold text-[var(--ax-text)] sm:h-16 sm:w-16">{side.logo ? <img src={side.logo} alt="" className="h-full w-full object-cover" /> : initialsOf(side.name || 'Equipo')}</span>
          <div className="min-w-0">
            <p className="line-clamp-2 font-display text-lg uppercase leading-5 tracking-[.02em] text-[var(--ax-text)] sm:text-[30px] sm:leading-8">{side.name || 'Por definir'}</p>
            <p className="mt-0.5 hidden text-[13px] text-[var(--ax-muted)] sm:block">{side.role}</p>
          </div>
        </div>)}
        <div className="order-2 flex flex-col items-center gap-2">
          <p className="font-display text-[48px] leading-none tracking-[.02em] text-[var(--ax-text)] tabular-nums sm:text-[76px]">{match.status === 'scheduled' ? 'VS' : `${localScore} – ${visitorScore}`}</p>
          <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold sm:text-[13px]', live && !match.is_paused ? 'bg-[var(--ax-accent-soft)] text-[var(--ax-accent-text)]' : 'bg-[var(--ax-surface-raised)] text-[var(--ax-text-secondary)]')}>
            {live && !match.is_paused && <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
            {clockLabel}{stoppageSeconds > 0 && live && <span className="text-[var(--ax-danger-text)]">{stoppageTimer}</span>}
          </span>
          {shootoutScore && <span className="text-xs font-semibold text-[var(--ax-warning-text)]">Penales {shootoutScore}</span>}
        </div>
      </div>
      {activeSinBins.length > 0 && <ul aria-label="Expulsiones temporales" className="mt-5 flex flex-wrap justify-center gap-2">
        {activeSinBins.map((bin) => <li key={bin.id || `${bin.player_id}-${bin.match_second}`} className="inline-flex items-center gap-2 rounded-full border border-[var(--ax-card-yellow-line)] bg-[var(--ax-card-yellow-soft)] py-1 pl-2 pr-3 text-xs font-semibold text-[var(--ax-text)]">
          <span aria-hidden="true" className="h-3.5 w-2.5 rounded-[2px] bg-[var(--ax-card-yellow)]" />
          {playerLabel(bin.player_id) || 'Jugador'} · vuelve en <span className="tabular-nums">{formatSeconds(bin.remaining)}</span>
        </li>)}
      </ul>}
      {canManage && (match.status === 'scheduled' || (live && !inShootout)) && <div className="mt-5 flex flex-wrap justify-center gap-2">
        {match.status === 'scheduled' && <Button variant="primary" icon={Play} disabled={saving} onClick={() => void changeStatus('live')}>Iniciar primer tiempo</Button>}
        {live && !inShootout && match.match_phase !== 'overtime' && <Button variant={match.is_paused ? 'primary' : 'secondary'} icon={Clock3} disabled={saving} onClick={() => void transitionPeriod()}>{periodActionText}</Button>}
        {live && <Button variant="ghost" icon={Pencil} onClick={() => { setCorrectionEvent(null); setCorrectionMode((current) => !current) }}>{correctionMode ? 'Cerrar corrección' : 'Corregir marcador'}</Button>}
      </div>}
      {confirmEarlyFinish && <EarlyFinishNotice remaining={confirmEarlyFinish} onKeepPlaying={() => setConfirmEarlyFinish(null)} onFinishNow={() => { setConfirmEarlyFinish(null); void transitionPeriod(true) }} />}
      {correctionMode && canManage && <p className="mx-auto mt-4 max-w-lg rounded-[12px] bg-[var(--ax-surface-sunken)] px-3 py-2.5 text-center text-[13px] text-[var(--ax-text-secondary)]">Elige en la cronología la anotación que quieres anular. Queda registrada con su motivo.</p>}
      {canManage && loadedRules?.penalty_shootout_allowed && match.is_paused && isFootball8 && inShootout && live && <div className="mt-4 flex justify-center"><Button variant="accent" onClick={() => setShowShootout((current) => !current)}>{showShootout ? 'Ocultar tanda de penales' : 'Registrar tanda de penales'}</Button></div>}
      {canManage && loadedRules?.penalty_shootout_allowed && match.is_paused && !isFootball8 && (String(match.period) === 'second_half' || String(match.period) === 'extra_second_half') && <div className="mx-auto mt-4 max-w-lg">
        {shootoutDraft
          ? <form onSubmit={(formEvent) => { formEvent.preventDefault(); void registerShootout() }} className="ax-drop-in grid grid-cols-2 gap-2 rounded-[12px] border border-[var(--ax-line-strong)] p-3 sm:grid-cols-[1fr_1fr_auto]">
            <label><FieldLabel>{match.local_team_name}</FieldLabel><input type="number" min="0" inputMode="numeric" required value={shootoutDraft.local} onChange={(changeEvent) => setShootoutDraft({ ...shootoutDraft, local: changeEvent.target.value })} className={inputClass} /></label>
            <label><FieldLabel>{match.visitor_team_name}</FieldLabel><input type="number" min="0" inputMode="numeric" required value={shootoutDraft.visitor} onChange={(changeEvent) => setShootoutDraft({ ...shootoutDraft, visitor: changeEvent.target.value })} className={inputClass} /></label>
            <div className="col-span-2 flex items-end justify-end gap-2 sm:col-span-1"><Button variant="ghost" onClick={() => setShootoutDraft(null)}>Cancelar</Button><Button type="submit" variant="primary" disabled={saving}>Guardar tanda</Button></div>
          </form>
          : <div className="flex justify-center"><Button variant="accent" onClick={() => setShootoutDraft({ local: '0', visitor: '0' })}>Registrar tanda de penales</Button></div>}
      </div>}
      {actionError && <div className="mx-auto mt-4 max-w-lg"><Notice tone="danger" icon={CircleAlert} action={<button type="button" onClick={() => setActionError('')} aria-label="Cerrar aviso" className="cursor-pointer"><X size={15} /></button>}>{actionError}</Notice></div>}
    </section>

    {isFootball8 && showShootout && inShootout && <ShootoutPanel
      localTeamId={match.local_team_id}
      localTeamName={match.local_team_name}
      visitorTeamId={match.visitor_team_id}
      visitorTeamName={match.visitor_team_name}
      kicks={shootoutKicks}
      canManage={canManage}
      saving={saving}
      onRecord={recordShootoutKick}
    />}

    {shouldShowOvertimePanel && canManage && <RugbyOvertimePanel
      match={match}
      localTeam={localTeam}
      visitorTeam={visitorTeam}
      onOvertimeStarted={async () => {
        window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
        window.location.reload()
      }}
      onOvertimeFinished={async () => {
        setOvertimeFinished(true)
        window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
        window.location.reload()
      }}
    />}

    {canRecord
      ? <>
        <div className="flex gap-2 lg:hidden" role="group" aria-label="Equipo">
          {sides.map((side, index) => <button key={side.id} type="button" aria-pressed={(index === 0 ? 'local' : 'visitor') === mobileTeam} onClick={() => setMobileTeam(index === 0 ? 'local' : 'visitor')} className={cx('h-10 min-w-0 flex-1 cursor-pointer truncate rounded-full px-3 text-[13px] font-semibold', (index === 0 ? 'local' : 'visitor') === mobileTeam ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'border border-[var(--ax-line-strong)] text-[var(--ax-text-secondary)]')}>{side.name}</button>)}
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)_minmax(0,1fr)]">
          {actionCard(sides[0], 0)}
          <div className="order-last space-y-5 lg:order-none">{timelineCard}</div>
          {actionCard(sides[1], 1)}
        </div>
        {statsCard}
      </>
      : match.status === 'scheduled' && !events.length
        // Antes del partido no hay cronología ni estadísticas que mostrar.
        ? null
        : <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">{timelineCard}{statsCard}</div>}
  </article>
}

type ShootoutTeamColumnProps = {
  teamId: string
  teamName: string
  kicks: ShootoutKick[]
  rounds: number[]
  canManage: boolean
  saving: boolean
  onRecord: (teamId: string, result: 'goal' | 'miss') => Promise<void>
}

// Muestra los tiros de un equipo y permite registrar el siguiente lanzamiento.
function ShootoutTeamColumn({ teamId, teamName, kicks, rounds, canManage, saving, onRecord }: ShootoutTeamColumnProps) {
  const goals = kicks.filter((kick) => kick.result === 'goal').length
  const nextRound = kicks.length + 1
  return <div className="min-w-0 rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-sunken)] p-3.5">
    <div className="flex items-center justify-between gap-3">
      <p className="truncate text-sm font-semibold text-[var(--ax-text)]">{teamName}</p>
      <p className="shrink-0 text-[13px] font-semibold tabular-nums text-[var(--ax-accent-text)]">{goals} / {kicks.length}</p>
    </div>
    <ol className="mt-3 flex flex-wrap gap-1.5" aria-label={`Tiros de ${teamName}`}>
      {rounds.map((round) => {
        const kick = kicks.find((item) => item.round_number === round)
        return <li key={round} title={round <= 5 ? `Tiro ${round}` : `Muerte súbita ${round - 5}`} className={cx(
          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
          kick?.result === 'goal' ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : kick ? 'bg-[var(--ax-danger-soft)] text-[var(--ax-danger-text)]' : round === nextRound ? 'border-2 border-dashed border-[var(--ax-accent-line)] text-[var(--ax-muted)]' : 'border border-[var(--ax-line-strong)] text-[var(--ax-muted)]',
        )}>{kick ? (kick.result === 'goal' ? <Check size={14} aria-label="Gol" /> : <X size={14} aria-label="Fallo" />) : round}</li>
      })}
    </ol>
    {canManage && <div className="mt-3 grid grid-cols-2 gap-2">
      <Button size="sm" variant="primary" disabled={saving} onClick={() => void onRecord(teamId, 'goal')}>Gol</Button>
      <Button size="sm" variant="danger" disabled={saving} onClick={() => void onRecord(teamId, 'miss')}>Fallo</Button>
    </div>}
  </div>
}

type ShootoutPanelProps = {
  localTeamId: string
  localTeamName: string
  visitorTeamId: string
  visitorTeamName: string
  kicks: ShootoutKick[]
  canManage: boolean
  saving: boolean
  onRecord: (teamId: string, result: 'goal' | 'miss') => Promise<void>
}

// Organiza los cinco tiros reglamentarios y las rondas de muerte súbita.
function ShootoutPanel({ localTeamId, localTeamName, visitorTeamId, visitorTeamName, kicks, canManage, saving, onRecord }: ShootoutPanelProps) {
  const localKicks = kicks.filter((kick) => kick.team_id === localTeamId)
  const visitorKicks = kicks.filter((kick) => kick.team_id === visitorTeamId)
  const localGoals = localKicks.filter((kick) => kick.result === 'goal').length
  const visitorGoals = visitorKicks.filter((kick) => kick.result === 'goal').length
  const highestRound = kicks.reduce((highest, kick) => Math.max(highest, kick.round_number), 0)
  const tiedAfterFive = localKicks.length >= 5 && visitorKicks.length >= 5 && localGoals === visitorGoals
  const visibleRounds = Math.max(5, highestRound, tiedAfterFive ? highestRound + 1 : 5)
  const rounds = Array.from({ length: visibleRounds }, (_, index) => index + 1)
  return <Card labelledBy="shootout-title">
    <CardHeader id="shootout-title" title="Tanda de penales" subtitle="Cinco tiros por equipo. Si siguen empatados, sigue la muerte súbita." actions={<span className="font-display text-[28px] leading-none tabular-nums text-[var(--ax-text)]">{localGoals} – {visitorGoals}</span>} />
    {tiedAfterFive && <div className="mt-4"><Notice tone="warning" icon={CircleAlert}>Muerte súbita: un tiro por equipo en cada ronda.</Notice></div>}
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <ShootoutTeamColumn teamId={localTeamId} teamName={localTeamName} kicks={localKicks} rounds={rounds} canManage={canManage} saving={saving} onRecord={onRecord} />
      <ShootoutTeamColumn teamId={visitorTeamId} teamName={visitorTeamName} kicks={visitorKicks} rounds={rounds} canManage={canManage} saving={saving} onRecord={onRecord} />
    </div>
  </Card>
}

function formatSeconds(totalSeconds: number) {
  const value = Math.max(0, Math.floor(totalSeconds))
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

function MatchRow({ match, selected, onPreview }: { match: Match; selected: boolean; onPreview: () => void }) {
  const status = match.status === 'finished' ? 'Final' : match.status === 'live' ? 'En vivo' : match.status === 'cancelled' ? 'Cancelado' : 'Programado'
  return <button type="button" onClick={onPreview} aria-pressed={selected} className={cx(
    'grid w-full cursor-pointer grid-cols-[48px_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-[12px] px-2 py-2.5 text-left transition-colors duration-150 sm:grid-cols-[64px_minmax(0,1fr)_auto_minmax(0,1fr)_96px] sm:gap-3 sm:px-3',
    selected ? 'bg-[var(--ax-accent-soft)]' : 'hover:bg-[var(--ax-hover)]',
  )}>
    <span className="text-xs tabular-nums text-[var(--ax-muted)]">{match.scheduled_time?.slice(0, 5) || '--:--'}</span>
    <span className="truncate text-right text-[13px] font-semibold text-[var(--ax-text)] sm:text-sm">{match.local_team_name}</span>
    <span className={cx('min-w-[58px] rounded-[8px] px-2 py-1 text-center text-[13px] font-bold tabular-nums', match.status === 'live' ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : match.status === 'scheduled' ? 'bg-[var(--ax-surface-sunken)] font-medium text-[var(--ax-muted)]' : 'bg-[var(--ax-surface-raised)] text-[var(--ax-text)]')}>{match.status === 'scheduled' ? 'vs' : `${match.local_score} – ${match.visitor_score}`}</span>
    <span className="truncate text-[13px] font-semibold text-[var(--ax-text)] sm:text-sm">{match.visitor_team_name}</span>
    <span className="hidden justify-self-end sm:block"><Badge tone={match.status === 'live' ? 'success' : match.status === 'scheduled' ? 'neutral' : 'neutral'} dot={match.status === 'live'}>{status}</Badge></span>
  </button>
}

function getFeaturedMatch(matches: Match[]) {
  return matches.find((match) => match.status === 'live') || [...matches].filter((match) => match.status === 'finished').sort((a, b) => b.date_number - a.date_number).at(0) || [...matches].filter((match) => match.status === 'scheduled').sort((a, b) => a.date_number - b.date_number).at(0) || null
}

function EditHistorySection({ history }: { history: EditHistory[] }) {
  const labels: Record<string, string> = { name: 'Nombre', season: 'Temporada', status: 'Estado', start_date: 'Fecha inicial', end_date: 'Fecha final', country: 'País', location: 'Ciudad', discipline_id: 'Disciplina', modality_id: 'Modalidad', divisions: 'Divisiones' }
  const fieldLabel = (field: string) => labels[field] || field.replace(/_\d+$/, '').replace(/[-_]/g, ' ')
  const delta = (value: number) => value > 0 ? `+${value}` : String(value)
  return <div className="ax-v2"><Card labelledBy="history-title">
    <CardHeader id="history-title" title="Historial de cambios" subtitle="Cada cambio queda registrado con su fecha y sus valores anteriores." />
    {history.length ? <ol className="mt-4 divide-y divide-[var(--ax-line)]">
      {history.map((entry) => {
        const adjustment = entry.changes.type === 'standing_adjustment'
        const teams = Array.isArray(entry.changes.teams) ? entry.changes.teams : []
        return <li key={entry.id} className="flex gap-3 py-3.5">
          <span aria-hidden="true" className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]', adjustment ? 'bg-[var(--ax-warning-soft)] text-[var(--ax-warning-text)]' : 'bg-[var(--ax-accent-soft)] text-[var(--ax-accent-text)]')}>{adjustment ? <Table2 size={15} /> : <Pencil size={15} />}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-sm font-semibold text-[var(--ax-text)]">{adjustment ? 'Ajuste de puntos en la tabla' : 'Torneo actualizado'}</p>
              <time className="text-xs text-[var(--ax-muted)]">{new Date(entry.created_at).toLocaleString('es-PA', { dateStyle: 'medium', timeStyle: 'short' })}</time>
            </div>
            {adjustment
              ? <>
                <p className="mt-1 text-[13px] text-[var(--ax-text-secondary)]">Motivo: {entry.changes.reason}</p>
                <ul className="mt-1.5 space-y-0.5">{teams.map((change: { team_id: string; team_name?: string; before: number; after: number }) => <li key={change.team_id} className="text-[13px] text-[var(--ax-muted)]">{change.team_name || 'Equipo'}: <span className="tabular-nums">{delta(change.before)}</span> → <span className="font-semibold tabular-nums text-[var(--ax-text)]">{delta(change.after)}</span></li>)}</ul>
              </>
              : <ul className="mt-1 space-y-0.5">{Object.entries(entry.changes).map(([field, change]) => <li key={field} className="text-[13px] text-[var(--ax-muted)]"><span className="font-medium text-[var(--ax-text-secondary)]">{fieldLabel(field)}:</span> {change?.before || 'Sin valor'} → <span className="font-semibold text-[var(--ax-text)]">{change?.after || 'Sin valor'}</span></li>)}</ul>}
          </div>
        </li>
      })}
    </ol> : <div className="mt-4"><EmptyState icon={Clock3} title="Sin cambios registrados" description="Aquí verás cada edición del torneo, de su fixture y de la tabla." /></div>}
  </Card></div>
}

function InfoCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <div className="mt-6 rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] p-4 sm:p-5">
    <p className="font-display text-xl uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">{title}</p>
    {description && <p className="mt-1.5 text-[13px] text-[var(--ax-muted)]">{description}</p>}
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  </div>
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-3.5">
    <p className="text-[11px] font-bold uppercase tracking-[.1em] text-[var(--ax-muted)]">{label}</p>
    <p className="mt-1.5 text-[15px] font-semibold text-[var(--ax-text)]">{value}</p>
  </div>
}

function GeneralInfoSection({ tournament, divisions, disciplines, modalities, competition, playersOnField, pointRules, canManage, editMode, onRequestSave, onDirtyChange, onCancel, onEdit }: { tournament: Tournament; divisions: Division[]; disciplines: Discipline[]; modalities: Modality[]; competition: { courts: number; intervalMinutes: number; format: string; legs: number; playoffTeams: number; maxTeams: number | null; maxRoster: number | null }; playersOnField: number | null; pointRules: PointRules | null; canManage: boolean; editMode: boolean; onRequestSave: (values: EditValues, divisionNames: string[], rules: PointRules) => void; onDirtyChange: (dirty: boolean) => void; onCancel: () => void; onEdit: () => void }) {
  const legsLabel = competition.legs === 2 ? 'Ida y vuelta' : `${competition.legs} vuelta${competition.legs === 1 ? '' : 's'}`
  const formatLabel = (leagueFormats as Record<string, string>)[competition.format] ?? 'Sin formato'
  return <section className="ax-v2 rounded-[20px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--ax-line)] pb-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-accent-text)]">Configuración</p>
        <h2 className="mt-2 font-display text-3xl uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">Información general</h2>
        <p className="mt-2 text-[13px] text-[var(--ax-muted)]">Datos oficiales del torneo, sus divisiones y su organización responsable.</p>
      </div>
      {canManage && !editMode && <button type="button" onClick={onEdit} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] bg-[var(--ax-accent)] px-4 text-[13px] font-bold text-[var(--ax-on-accent)] transition hover:opacity-90"><Cog size={16} />Editar torneo</button>}
    </div>
    {editMode && canManage ? <EditTournamentForm tournament={tournament} divisions={divisions} disciplines={disciplines} modalities={modalities} pointRules={pointRules} onRequestSave={onRequestSave} onDirtyChange={onDirtyChange} onCancel={onCancel} /> : <>
      <InfoCard title="Datos del torneo">
        <InfoTile label="Nombre del torneo" value={tournament.name} />
        <InfoTile label="Código AthlonX" value={tournament.athlonx_code || 'Pendiente'} />
        <InfoTile label="Estado" value={statusNames[tournament.status] || tournament.status} />
        <InfoTile label="Temporada" value={tournament.season || 'Pendiente'} />
        <InfoTile label="Organización" value={tournament.organization?.name || 'Torneo independiente'} />
        <InfoTile label="Disciplina" value={tournament.discipline?.name || 'No especificada'} />
        <InfoTile label="Modalidad" value={tournament.modality?.name || 'No especificada'} />
        <InfoTile label="Ubicación" value={[tournament.country, tournament.location].filter(Boolean).join(' · ') || 'Pendiente'} />
        <InfoTile label="Fechas" value={formatDateRange(tournament.start_date, tournament.end_date)} />
        <InfoTile label="Equipo organizador" value={tournament.organizer_team?.name || 'Sin equipo organizador'} />
      </InfoCard>
      <InfoCard title="Canchas y competencia" description="Se configuran en el generador de fixtures.">
        <InfoTile label="Canchas" value={`${competition.courts} ${competition.courts === 1 ? 'cancha' : 'canchas'}`} />
        <InfoTile label="Intervalo entre partidos" value={`${competition.intervalMinutes} min`} />
        <InfoTile label="Formato" value={formatLabel} />
        <InfoTile label="Vueltas" value={legsLabel} />
        <InfoTile label="Clasificados a playoffs" value={competition.playoffTeams ? `${competition.playoffTeams} equipos` : 'Sin playoffs'} />
      </InfoCard>
      <InfoCard title="Cupos" description="Máximos definidos antes de abrir inscripciones.">
        <InfoTile label="Equipos máximos" value={competition.maxTeams ? `${competition.maxTeams} equipos` : 'Sin límite'} />
        <InfoTile label="Jugadores por plantilla" value={competition.maxRoster ? `Hasta ${competition.maxRoster} jugadores` : 'Sin límite'} />
        <InfoTile label="En cancha" value={playersOnField ? `${playersOnField} jugadores` : 'Pendiente'} />
      </InfoCard>
      <div className="mt-6 border-t border-[var(--ax-line)] pt-6">
        <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-accent-text)]">Categorías del torneo</p>
        <h3 className="mt-1.5 font-display text-2xl uppercase leading-none text-[var(--ax-text)]">Divisiones participantes</h3>
        <p className="mt-2 text-[13px] text-[var(--ax-muted)]">Los equipos solo podrán inscribirse en una división compatible con su catálogo.</p>
        <div className="mt-4 flex flex-wrap gap-2">{divisions.map((division) => <span key={division.id} className="rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3 py-2 text-[13px] font-semibold text-[var(--ax-text-secondary)]">{division.name}</span>)}{!divisions.length && <p className="text-[13px] text-[var(--ax-muted)]">Todavía no hay divisiones configuradas.</p>}</div>
      </div>
    </>}
  </section>
}

// Muestra y actualiza la configuración competitiva del torneo.
function CourtCountSettings({ tournamentId, footballEight = false }: { tournamentId: string; footballEight?: boolean }) {
  const [count, setCount] = useState('1')
  const [savedCount, setSavedCount] = useState('1')
  const [maxTeams, setMaxTeams] = useState(footballEight ? '16' : '14')
  const [savedMaxTeams, setSavedMaxTeams] = useState(footballEight ? '16' : '14')
  const [halfDuration, setHalfDuration] = useState('20')
  const [savedHalfDuration, setSavedHalfDuration] = useState('20')
  const [halftimeDuration, setHalftimeDuration] = useState('5')
  const [savedHalftimeDuration, setSavedHalftimeDuration] = useState('5')
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    async function loadSettings() {
      if (!supabase) return
      const { data } = await supabase.from('tournament_competition_settings')
        .select('courts_count, max_teams, half_duration_minutes, halftime_duration_minutes')
        .eq('tournament_id', tournamentId)
        .maybeSingle()
      if (active && data) {
        setCount(String(data.courts_count || 1))
        setSavedCount(String(data.courts_count || 1))
        setMaxTeams(String(data.max_teams || (footballEight ? 16 : 14)))
        setSavedMaxTeams(String(data.max_teams || (footballEight ? 16 : 14)))
        setHalfDuration(String(data.half_duration_minutes || 20))
        setSavedHalfDuration(String(data.half_duration_minutes || 20))
        setHalftimeDuration(String(data.halftime_duration_minutes || 5))
        setSavedHalftimeDuration(String(data.halftime_duration_minutes || 5))
      }
    }
    void loadSettings()
    return () => { active = false }
  }, [tournamentId])

  async function saveSettings() {
    if (!supabase) return
    const parsedMaxTeams = Number(maxTeams)
    const parsedHalfDuration = Number(halfDuration)
    const parsedHalftimeDuration = Number(halftimeDuration)
    if (footballEight && parsedMaxTeams !== 16) {
      return setMessage('Fútbol 8 vs 8 requiere exactamente 16 equipos.')
    }
    if (!Number.isInteger(parsedMaxTeams) || parsedMaxTeams < 2) {
      setMessage('El máximo de equipos debe ser un número entero mayor o igual a 2.')
      return
    }
    if (!Number.isInteger(parsedHalfDuration) || parsedHalfDuration < 1 || parsedHalfDuration > 120) {
      setMessage('La duración de cada tiempo debe estar entre 1 y 120 minutos.')
      return
    }
    if (!Number.isInteger(parsedHalftimeDuration)
      || parsedHalftimeDuration < 0
      || parsedHalftimeDuration > 60) {
      setMessage('El descanso debe estar entre 0 y 60 minutos.')
      return
    }
    setSaving(true)
    const { data: current } = await supabase.from('tournament_competition_settings')
      .select('competition_format, modality_rules_id')
      .eq('tournament_id', tournamentId)
      .maybeSingle()
    const { error } = await supabase.from('tournament_competition_settings').upsert({
      tournament_id: tournamentId,
      competition_format: current?.competition_format
        || (footballEight ? 'knockout' : 'quick_league'),
      courts_count: Number(count),
      modality_rules_id: current?.modality_rules_id || null,
      max_teams: parsedMaxTeams,
      half_duration_minutes: parsedHalfDuration,
      halftime_duration_minutes: parsedHalftimeDuration,
      interval_between_matches_minutes: 10,
    }, { onConflict: 'tournament_id' })
    if (!error) {
      setSavedCount(count)
      setSavedMaxTeams(maxTeams)
      setSavedHalfDuration(halfDuration)
      setSavedHalftimeDuration(halftimeDuration)
      setEditing(false)
      setConfirming(false)
    }
    setMessage(error ? error.message : 'Configuración del torneo guardada.')
    setSaving(false)
  }

  const hasChanges = count !== savedCount
    || maxTeams !== savedMaxTeams
    || halfDuration !== savedHalfDuration
    || halftimeDuration !== savedHalftimeDuration

  return <div className="mt-5 rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/5 p-4">
    <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">
      Configuración de fútbol
    </p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="block text-sm font-semibold">
        Máximo de equipos
        {editing ? <input readOnly={footballEight} type="number" min="2" value={maxTeams}
          onChange={(event) => setMaxTeams(event.target.value)}
          className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3" />
          : <span className="mt-2 block rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3">{savedMaxTeams}</span>}
      </label>
      <label className="block text-sm font-semibold">
        Minutos por tiempo
        {editing ? <input type="number" min="1" max="120" value={halfDuration}
          onChange={(event) => setHalfDuration(event.target.value)}
          className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3" />
          : <span className="mt-2 block rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3">{savedHalfDuration}</span>}
      </label>
      <label className="block text-sm font-semibold">
        Descanso
        {editing ? <input type="number" min="0" max="60" value={halftimeDuration}
          onChange={(event) => setHalftimeDuration(event.target.value)}
          className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3" />
          : <span className="mt-2 block rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3">{savedHalftimeDuration} minutos</span>}
      </label>
      <label className="block text-sm font-semibold">
        Número de canchas
        {editing ? <select value={count} onChange={(event) => setCount(event.target.value)}
          className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3">
          {[1, 2].map((value) => <option key={value} value={value}>
            {value} {value === 1 ? 'cancha' : 'canchas'}
          </option>)}
        </select> : <span className="mt-2 block rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3">{savedCount} {savedCount === '1' ? 'cancha' : 'canchas'}</span>}
      </label>
    </div>
    <div className="mt-4 flex flex-wrap gap-3">
      {!editing ? <button type="button" onClick={() => { setEditing(true); setMessage('') }}
        className="rounded-[5px] border border-[#b4ff45] px-4 py-3 font-bold text-[#dfffba]">Editar</button> : <>
        <button type="button" onClick={() => { setEditing(false); setCount(savedCount); setMaxTeams(savedMaxTeams); setHalfDuration(savedHalfDuration); setHalftimeDuration(savedHalftimeDuration) }}
          className="rounded-[5px] border border-[#31556b] px-4 py-3 font-bold text-slate-300">Cancelar</button>
        <button type="button" onClick={() => setConfirming(true)} disabled={saving || !hasChanges}
          className="rounded-[5px] bg-[#b4ff45] px-4 py-3 font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50">Guardar cambios</button>
      </>}
    </div>
    <p className="mt-2 text-xs text-slate-400">
      El fixture usa dos tiempos, el descanso y un intervalo fijo de 10 minutos entre bloques.
    </p>
    {message && <p className="mt-3 text-sm text-[#dfffba]">{message}</p>}
    {confirming && <div className="mt-4 rounded-[5px] border border-[#b4ff45]/40 bg-[#07131e] p-4">
      <p className="text-sm font-bold text-white">¿Confirmar la configuración del torneo?</p>
      <p className="mt-2 text-xs text-slate-400">Se aplicará al próximo fixture generado.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setConfirming(false)}
          className="rounded-[5px] border border-[#31556b] px-3 py-2 text-sm">Cancelar</button>
        <button type="button" onClick={() => void saveSettings()}
          className="rounded-[5px] bg-[#b4ff45] px-3 py-2 text-sm font-bold text-[#07131e]">Confirmar</button>
      </div>
    </div>}
  </div>
}

function EditTournamentForm({ tournament, divisions, disciplines, modalities, pointRules, onRequestSave, onDirtyChange, onCancel }: { tournament: Tournament; divisions: Division[]; disciplines: Discipline[]; modalities: Modality[]; pointRules: PointRules | null; onRequestSave: (values: EditValues, divisionNames: string[], rules: PointRules) => void; onDirtyChange: (dirty: boolean) => void; onCancel: () => void }) {
  const [values, setValues] = useState<EditValues>({ name: tournament.name, season: tournament.season || '', status: tournament.status, start_date: tournament.start_date || '', end_date: tournament.end_date || '', country: tournament.country || 'Panamá', location: tournament.location || '', discipline_id: tournament.discipline?.id || '', modality_id: tournament.modality?.id || '' })
  const [divisionToAdd, setDivisionToAdd] = useState('')
  const [rules, setRules] = useState<PointRules>(pointRules ?? { win: 4, draw: 2, loss: 0 })
  const basePoints = pointRules ?? { win: 4, draw: 2, loss: 0 }
  const rulesChanged = rules.win !== basePoints.win || rules.draw !== basePoints.draw || rules.loss !== basePoints.loss
  const [selectedDivisionNames, setSelectedDivisionNames] = useState(() => divisions.map((division) => division.name))
  const divisionOptions = Array.from(new Set([...defaultDivisionOptions, ...divisions.map((division) => division.name)]))
  useEffect(() => {
    const original = { name: tournament.name, season: tournament.season || '', status: tournament.status, start_date: tournament.start_date || '', end_date: tournament.end_date || '', country: tournament.country || 'Panamá', location: tournament.location || '', discipline_id: tournament.discipline?.id || '', modality_id: tournament.modality?.id || '' }
    const fieldsChanged = Object.keys(original).some((key) => original[key as keyof EditValues] !== values[key as keyof EditValues])
    const originalDivisions = divisions.map((division) => division.name)
    const divisionsChanged = originalDivisions.length !== selectedDivisionNames.length || originalDivisions.some((name, index) => normalizeDivisionName(name) !== normalizeDivisionName(selectedDivisionNames[index] || ''))
    onDirtyChange(fieldsChanged || divisionsChanged || rulesChanged)
  }, [values, selectedDivisionNames, rulesChanged, tournament, divisions, onDirtyChange])
  function addDivision() { const cleanName = divisionToAdd.trim(); if (!cleanName || selectedDivisionNames.some((name) => normalizeDivisionName(name) === normalizeDivisionName(cleanName))) return; setSelectedDivisionNames([...selectedDivisionNames, cleanName]); setDivisionToAdd('') }
  const automaticStatus = tournament.status === 'in_progress' || tournament.status === 'finished'
  const manualStatusOptions = statusOptions.filter((option) => option.value === 'draft' || option.value === 'published')
  const sectionLinks = [['tor-imagen', 'Imagen del torneo'], ['tor-datos', 'Datos generales'], ['tor-reglas', `Reglas de ${tournament.discipline?.name || 'la disciplina'}`], ['tor-divisiones', 'Divisiones']] as const
  return <div className="ax-v2 mt-6 grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
    <nav aria-label="Secciones de información" className="flex flex-wrap gap-2 lg:sticky lg:top-6 lg:flex-col lg:self-start">
      {sectionLinks.map(([id, label]) => <a key={id} href={`#${id}`} className="rounded-[10px] border border-[var(--ax-line)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--ax-text-secondary)] transition hover:border-[var(--ax-accent-line)] hover:text-[var(--ax-text)]">{label}</a>)}
    </nav>
    <form id="edit-tournament-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onRequestSave(values, selectedDivisionNames, rules) }} className="min-w-0 space-y-5">
      <section id="tor-imagen" className="scroll-mt-6 rounded-[20px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-accent-text)]">Identidad</p>
        <h3 className="mt-1.5 font-display text-2xl uppercase leading-none text-[var(--ax-text)]">Imagen del torneo</h3>
        <p className="mt-2 text-[13px] text-[var(--ax-muted)]">La foto identifica al torneo en búsquedas y tarjetas. El banner se muestra en la cabecera de la liga.</p>
        <div className="mt-5 flex h-36 items-end rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] p-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-[14px] bg-[var(--ax-accent)] font-display text-2xl text-[var(--ax-on-accent)]">{values.name.slice(0, 2).toUpperCase()}</span>
        </div>
        <p className="mt-3 text-[13px] text-[var(--ax-muted)]">La carga de imágenes todavía no está conectada. Se mantiene la imagen actual.</p>
      </section>

      <section id="tor-datos" className="scroll-mt-6 rounded-[20px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-accent-text)]">Configuración</p>
        <h3 className="mt-1.5 font-display text-2xl uppercase leading-none text-[var(--ax-text)]">Datos generales</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-[13px] font-semibold text-[var(--ax-text)] sm:col-span-2">Nombre del torneo<input required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} className={`mt-2 w-full ${axField}`} /></label>
          <div><p className="text-[13px] font-semibold text-[var(--ax-text)]">Tipo</p><p className="mt-2 rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3 py-2.5 text-sm text-[var(--ax-muted)]">{tournament.is_quick ? 'Rápido · no oficial' : 'Oficial · por invitación'}</p></div>
          {automaticStatus
            ? <div><p className="text-[13px] font-semibold text-[var(--ax-text)]">Estado</p><p className="mt-2 rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3 py-2.5 text-sm text-[var(--ax-muted)]">{statusNames[tournament.status]} <span className="text-xs">(se actualiza solo)</span></p></div>
            : <StyledSelect label="Estado" value={values.status} onChange={(status) => setValues({ ...values, status })} options={manualStatusOptions} required />}
          <div className="sm:col-span-2"><p className="text-[13px] font-semibold text-[var(--ax-text)]">Disciplina</p><p className="mt-2 rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3 py-2.5 text-sm text-[var(--ax-muted)]">{[tournament.discipline?.name, tournament.modality?.name].filter(Boolean).join(' · ') || 'Sin disciplina'} <span className="text-xs">(no se puede cambiar)</span></p></div>
          <label className="block text-[13px] font-semibold text-[var(--ax-text)]">Temporada<input value={values.season} onChange={(event) => setValues({ ...values, season: event.target.value })} className={`mt-2 w-full ${axField}`} /></label>
          <div><p className="text-[13px] font-semibold text-[var(--ax-text)]">Fecha de cierre</p><p className="mt-2 rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3 py-2.5 text-sm text-[var(--ax-muted)]">{values.end_date ? formatDateRange(values.end_date, null) : 'Se registra sola al terminar'}</p></div>
          <DateField label="Fecha de inicio" value={values.start_date} onChange={(start_date) => setValues({ ...values, start_date })} min="2020-01-01" max={`${new Date().getFullYear() + 3}-12-31`} hint={values.end_date ? `Terminó el ${formatDateRange(values.end_date, null)}.` : 'La fecha final se registra sola cuando termina el torneo.'} />
          <LocationFields country={values.country} city={values.location} onCountryChange={(country) => setValues({ ...values, country })} onCityChange={(location) => setValues({ ...values, location })} className="sm:col-span-2" />
        </div>
      </section>

      <section id="tor-reglas" className="scroll-mt-6 rounded-[20px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-accent-text)]">Puntaje</p>
        <h3 className="mt-1.5 font-display text-2xl uppercase leading-none text-[var(--ax-text)]">Reglas de {tournament.discipline?.name || 'la disciplina'}</h3>
        <p className="mt-2 text-[13px] text-[var(--ax-muted)]">Puntos por resultado para la tabla de posiciones de este torneo.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">{([['win', 'Victoria'], ['draw', 'Empate'], ['loss', 'Derrota']] as const).map(([key, label]) => <label key={key} className="block text-[13px] font-semibold text-[var(--ax-text)]">{label}<input type="number" min="0" step="1" required value={rules[key]} onChange={(event) => setRules({ ...rules, [key]: Number(event.target.value) })} className={`mt-2 w-full ${axField}`} /></label>)}</div>
        {rulesChanged && <div role="alert" className="mt-4 flex gap-2 rounded-[10px] border border-amber-300/40 bg-amber-300/10 p-3 text-[13px] text-amber-300"><span className="font-bold">Advertencia:</span><span>al guardar, la tabla de posiciones de todas las divisiones se recalculará con estos puntos.</span></div>}
      </section>

      <section id="tor-divisiones" className="scroll-mt-6 rounded-[20px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-accent-text)]">Categorías del torneo</p>
            <h3 className="mt-1.5 font-display text-2xl uppercase leading-none text-[var(--ax-text)]">Divisiones participantes</h3>
            <p className="mt-2 text-[13px] text-[var(--ax-muted)]">Selecciona las divisiones que podrán inscribirse en este torneo.</p>
          </div>
          <span className="rounded-[10px] border border-[var(--ax-line)] px-3 py-1.5 text-xs font-bold text-[var(--ax-text-secondary)]">{selectedDivisionNames.length} divisiones</span>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <select value={divisionToAdd} onChange={(event) => setDivisionToAdd(event.target.value)} className={`min-w-0 flex-1 cursor-pointer ${axField}`}><option value="">Seleccionar división</option>{divisionOptions.filter((name) => !selectedDivisionNames.some((selected) => normalizeDivisionName(selected) === normalizeDivisionName(name))).map((name) => <option key={name} value={name}>{name}</option>)}</select>
          <button type="button" onClick={addDivision} disabled={!divisionToAdd} className={`${axBtnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}>Agregar división</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{selectedDivisionNames.map((name) => <span key={name} className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3 py-2 text-[13px] font-semibold text-[var(--ax-text)]">{name}<button type="button" onClick={() => setSelectedDivisionNames(selectedDivisionNames.filter((current) => current !== name))} className="cursor-pointer text-[var(--ax-danger-text)]" aria-label={`Quitar división ${name}`}><X size={14} /></button></span>)}{!selectedDivisionNames.length && <p className="text-[13px] text-[var(--ax-muted)]">No hay divisiones seleccionadas.</p>}</div>
      </section>

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--ax-accent-line)] bg-[var(--ax-surface)] p-4 shadow-xl">
        <p className="min-w-0 flex-1 text-[13px] text-[var(--ax-muted)]">Se mostrarán los cambios y después se pedirá tu contraseña para confirmar.</p>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className={axBtnGhost}>Descartar</button>
          <button type="submit" className={axBtnPrimary}><Check size={16} />Guardar cambios</button>
        </div>
      </div>
    </form>
  </div>
}

function PlayerNumberRequestModal({ request, onCancel, onSubmit }: { request: { playerName: string; currentNumber: number | null }; onCancel: () => void; onSubmit: (number: number) => void }) {
  const [number, setNumber] = useState(String(request.currentNumber ?? ''))
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02070c]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true"><form onSubmit={(event) => { event.preventDefault(); onSubmit(Number(number)) }} className="w-full max-w-md rounded-[5px] border border-[#31556b] bg-[#0b1d2c] p-6 text-white shadow-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Solicitud de plantilla</p><h2 className="mt-2 font-display text-2xl uppercase">Cambiar número</h2><p className="mt-3 text-sm leading-6 text-slate-400">La solicitud de <strong className="text-white">{request.playerName}</strong> será enviada al equipo para su aprobación.</p><label className="mt-6 block text-sm font-semibold">Nuevo número<input required min="0" max="99" type="number" value={number} onChange={(event) => setNumber(event.target.value)} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-[5px] border border-[#31556b] px-4 py-3 text-sm font-bold text-slate-300">Cancelar</button><button type="submit" className="rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]">Enviar solicitud</button></div></form></div>
}

function InfoRow({ label, value }: { label: string; value: string }) { return <div className="rounded-[5px] border border-[#29485d] bg-[#07131e] p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">{label}</p><p className="mt-2 font-semibold text-white">{value}</p></div> }
function TournamentShell({ children }: { children: React.ReactNode }) { return <main className="min-h-screen px-4 py-6 sm:px-6 lg:ml-64 lg:px-10"><div className="ax-v2 mx-auto max-w-6xl">{children}</div></main> }
function normalizeDivisionName(value: string) { return value.trim().toLocaleLowerCase('es-PA') }
function teamIdentityKey(team: { name: string; handle: string | null; organization_id?: string | null; discipline_id?: string | null; created_by?: string | null; division_id?: string | null }) { return `${normalizeDivisionName(team.name)}|${team.handle || ''}|${team.organization_id || team.created_by || ''}|${team.discipline_id || ''}|${team.division_id || ''}` }
function mergeTeamSummaries(teams: TeamSummary[]) {
  const grouped = new Map<string, TeamSummary>()
  for (const team of teams) {
    const key = teamIdentityKey(team)
    const current = grouped.get(key)
    if (!current) {
      grouped.set(key, { ...team, divisionNames: Array.from(new Set(team.divisionNames ?? [])) })
      continue
    }
    current.divisionNames = Array.from(new Set([...(current.divisionNames ?? []), ...(team.divisionNames ?? [])]))
  }
  return Array.from(grouped.values())
}
function formatDateRange(start: string | null, end: string | null) { if (!start && !end) return 'Fechas por definir'; const format = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Por definir'; return start && end ? `${format(start)} - ${format(end)}` : start ? `Desde ${format(start)}` : format(end) }
function formatEditValue(field: keyof EditValues, value: string, disciplines: Discipline[], modalities: Modality[]) { if (!value) return 'Sin valor'; if (field === 'status') return statusNames[value] || value; if (field === 'discipline_id') return disciplines.find((discipline) => discipline.id === value)?.name || value; if (field === 'modality_id') return modalities.find((modality) => modality.id === value)?.name || value; return value }

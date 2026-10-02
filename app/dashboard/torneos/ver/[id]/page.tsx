'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Brain, CalendarDays, Check, ChevronDown, Clock3, Cog, FileDown, HeartPulse, LockKeyhole, MapPin, Pencil, Search, ShieldCheck, Square, Table2, Trash2, Trophy, UserPlus, Users, Wand2, X } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { LocationFields } from '../../../../../Components/location-fields'
import { QuickTournamentTeamsSection } from '../../../../../Components/quick-tournament-teams-section'
import { StyledSelect } from '../../../../../Components/styled-select'
import { TournamentCallupsPanel } from '../../../../../Components/tournament-callups-panel'
import { TournamentFixtureGenerator } from '../../../../../Components/tournament-fixture-generator'
import { supabase } from '../../../../../lib/supabase'

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
type Match = { id: string; fixture_id: string; date_number: number; calendar_date: string | null; division_id: string | null; division_name: string | null; scheduled_time: string | null; status: string; local_team_id: string; local_team_name: string; local_logo_url: string | null; visitor_team_id: string; visitor_team_name: string; visitor_logo_url: string | null; local_score: number; visitor_score: number; elapsed_seconds?: number | null; first_half_seconds?: number | null; second_half_seconds?: number | null; started_at?: string | null; is_paused?: boolean; period?: 'first_half' | 'second_half' }
type FixtureRecess = { id: string; time: string | null; label?: string | null }
type FixtureRecord = { id: string; date_number: number; calendar_date: string | null; recesses: FixtureRecess[] | null }
type TournamentFixtureDate = { fixtureId: string; dateNumber: number; calendarDate: string | null }
type TournamentFixtureCallup = { id: string; fixture_id: string; team_id: string; division_id: string; status: string; deadline_at: string | null }
type TournamentFixtureCallupPlayer = { callup_id: string; player_id: string; state: string; shirt_number: number | null }
type MatchEvent = { match_id: string; team_id?: string | null; player_id?: string | null; event_type: string; points: number }
type RosterEntry = { team_id: string; division_id: string | null; division_name?: string | null; player_id: string; user_id: string | null; full_name: string; shirt_number: number | null; position: string | null; is_substitute: boolean; is_official: boolean; claimed_player_id: string | null }
type TournamentInvitation = { id: string; team_id: string; division_id: string | null; status: 'pending' | 'accepted' | 'declined' | 'cancelled'; created_at: string; responded_at: string | null }
type EditHistory = { id: string; edited_by: string; changes: Record<string, { before: string | null; after: string | null }>; created_at: string }
type TournamentPayload = { tournament: Tournament | null; divisions: Division[]; teams: TournamentTeam[]; matches: Match[] }
type EditValues = { name: string; season: string; status: string; start_date: string; end_date: string; country: string; location: string; discipline_id: string; modality_id: string }
type PendingChange = { label: string; before: string; after: string; beforeValue: string | null; afterValue: string | null }
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

function buildRandomDivisionSchedule(divisionId: string, teamIds: string[], matchesPerTeam: number, dateCount: number) {
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
        edges.set(ids.join(':'), Math.random() < 0.5 ? { localTeamId: ids[0], visitorTeamId: ids[1] } : { localTeamId: ids[1], visitorTeamId: ids[0] })
      }
    }
    dates[dateIndex].push(...shuffle(Array.from(edges.values())).map((edge) => ({ divisionId, ...edge })))
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
  const [ownerId, setOwnerId] = useState('')
  const [availableDisciplines, setAvailableDisciplines] = useState<Discipline[]>([])
  const [availableModalities, setAvailableModalities] = useState<Modality[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<PlayerSummary[]>([])
  const [officialPlayerId, setOfficialPlayerId] = useState('')
  const [section, setSection] = useState<'resumen' | 'tablas' | 'equipos' | 'convocatorias' | 'fixtures' | 'generador' | 'partidos' | 'general' | 'historial'>('resumen')
  const [editMode, setEditMode] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChange> | null>(null)
  const [pendingDivisionNames, setPendingDivisionNames] = useState<string[] | null>(null)
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([])
  const [showOperationSave, setShowOperationSave] = useState(false)
  const [dirtySection, setDirtySection] = useState<string | null>(null)
  const [pendingSection, setPendingSection] = useState<typeof section | null>(null)
  const [saveDestination, setSaveDestination] = useState<typeof section | null>(null)
  const [availableTeams, setAvailableTeams] = useState<TeamSummary[]>([])
  const [tournamentInvitations, setTournamentInvitations] = useState<TournamentInvitation[]>([])
  const [numberRequest, setNumberRequest] = useState<{ teamId: string; playerId: string; playerName: string; currentNumber: number | null } | null>(null)

  async function loadTournament() {
    if (!supabase || !params.id) {
      setError('No se pudo identificar el torneo.')
      setLoading(false)
      return
    }
    setLoading(true)
    const [{ data: response, error: tournamentError }, { data: historyRows }, { data: ownerRow }, { data: userData }, { data: disciplineRows }, { data: modalityRows }, { data: teamRows }, { data: teamDivisionRows }, { data: playerRows }] = await Promise.all([
      supabase.rpc('get_public_tournament_profile', { p_tournament_id: params.id }),
      supabase.from('tournament_edit_history').select('id, edited_by, changes, created_at').eq('tournament_id', params.id).order('created_at', { ascending: false }),
      supabase.from('tournaments').select('created_by, is_quick').eq('id', params.id).maybeSingle(),
      supabase.auth.getUser(),
      supabase.from('disciplines').select('id, code, name').eq('is_active', true).order('name'),
      supabase.from('sport_modalities').select('id, code, name, discipline_id').eq('is_active', true).order('name'),
      supabase.from('teams').select('id, name, athlonx_code, handle, organization_id, discipline_id, created_by').eq('is_public', true).eq('is_official', true).order('name'),
      supabase.from('team_division_catalog').select('id, team_id, name').order('name'),
      supabase.from('players').select('id, full_name, shirt_number, position, user_id').eq('is_official', true).order('full_name'),
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
    const normalizedTeams = (payload.teams ?? []).map((team) => ({
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
    setData(normalizedPayload)
    setHistory((historyRows ?? []) as EditHistory[])
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
        const { data: eventRows } = await supabase.from('match_events').select('match_id, team_id, player_id, event_type, points').in('match_id', matchIds)
        setMatchEvents((eventRows ?? []) as MatchEvent[])
      } else setMatchEvents([])
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

  useEffect(() => {
    if (!currentUserId || currentUserId !== ownerId) setEditMode(false)
  }, [currentUserId, ownerId])

  if (loading) return <TournamentShell><p className="text-slate-400">Cargando torneo...</p></TournamentShell>
  if (error || !data?.tournament) return <TournamentShell><div className="rounded-[5px] border border-red-400/30 bg-red-500/10 p-5 text-red-200">{error || 'Este torneo no está disponible.'}</div></TournamentShell>

  const tournament = { ...data.tournament, fixtureMatches: data.matches ?? [] }
  const teams = data.teams ?? []
  const uniqueTeams = Array.from(new Map(teams.map((team) => [team.id, team])).values())
  const matches = data.matches ?? []
  const dates = Array.from(new Set(matches.map((match) => match.date_number))).sort((a, b) => a - b)
  const fixtureDates = Array.from(new Map(matches.map((match) => [match.fixture_id, { fixtureId: match.fixture_id, dateNumber: match.date_number, calendarDate: match.calendar_date }])).values()).sort((left, right) => left.dateNumber - right.dateNumber)
  const canManage = Boolean(currentUserId && currentUserId === ownerId)
  const disciplines = availableDisciplines.length ? availableDisciplines : tournament.discipline ? [tournament.discipline] : []
  const modalities = availableModalities.length ? availableModalities : tournament.modality ? [{ ...tournament.modality, discipline_id: tournament.discipline?.id }] : []

  function requestSave(values: EditValues, divisionNames: string[]) {
    const before: EditValues = { name: tournament.name, season: tournament.season || '', status: tournament.status, start_date: tournament.start_date || '', end_date: tournament.end_date || '', country: tournament.country || 'Panamá', location: tournament.location || '', discipline_id: tournament.discipline?.id || '', modality_id: tournament.modality?.id || '' }
    const labels: Record<keyof EditValues, string> = { name: 'Nombre', season: 'Temporada', status: 'Estado', start_date: 'Fecha inicial', end_date: 'Fecha final', country: 'País', location: 'Ciudad', discipline_id: 'Disciplina', modality_id: 'Modalidad' }
    const changes = Object.keys(values).reduce<Record<string, PendingChange>>((current, key) => { const field = key as keyof EditValues; if (before[field] !== values[field]) current[field] = { label: labels[field], before: formatEditValue(field, before[field], disciplines, modalities), after: formatEditValue(field, values[field], disciplines, modalities), beforeValue: before[field] || null, afterValue: values[field] || null }; return current }, {})
    if (!values.name.trim() || !values.start_date || !values.end_date) return setMessage('Completa el nombre y las fechas del torneo.')
    if (new Date(values.end_date) < new Date(values.start_date)) return setMessage('La fecha final no puede ser anterior a la fecha inicial.')
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
    const changes: Partial<EditValues> = Object.fromEntries(Object.entries(pendingChanges).filter(([field]) => field !== 'divisions').map(([field, change]) => [field, change.afterValue]))
    if (Object.keys(changes).length) {
      const { error: updateError } = await supabase.from('tournaments').update(changes).eq('id', tournament.id).eq('created_by', userData.user.id)
      if (updateError) return setMessage(updateError.message)
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

  function requestGenerateFixture(teamIds: string[] = uniqueTeams.map((team) => team.id), mode: 'automatic' | 'manual' = 'automatic', pairings: ManualPairing[] = [], divisionConfigs: AutomaticDivisionConfig[] = [], numberOfDates = 1) {
    const configurationLabel = divisionConfigs.length
      ? `${numberOfDates} fecha${numberOfDates === 1 ? '' : 's'} · ${divisionConfigs.map((config) => `${config.matchesPerTeam ?? config.matchesPerDate} partidos por equipo en ${data.divisions.find((division) => division.id === config.divisionId)?.name || 'división'}`).join(' · ')}`
      : `${teamIds.length} equipos seleccionados`
    queueOperation({ title: mode === 'automatic' ? 'Generar fixture automáticamente' : 'Generar fecha manualmente', kind: 'generate-fixture', payload: { teamIds: teamIds.join(','), mode, pairings: JSON.stringify(pairings), divisionConfigs: JSON.stringify(divisionConfigs), numberOfDates: String(numberOfDates) }, changes: [{ label: 'Modo', before: 'Sin cambios', after: mode === 'automatic' ? 'Automático' : 'Manual', beforeValue: null, afterValue: mode }, { label: 'Configuración', before: 'Sin cambios', after: mode === 'automatic' ? configurationLabel : `${pairings.length} enfrentamiento${pairings.length === 1 ? '' : 's'}`, beforeValue: null, afterValue: configurationLabel }] })
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
    const fixtureIds = Array.from(new Set(matches.filter((match) => match.date_number === dateNumber).map((match) => match.fixture_id)))
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
    if (!supabase || !canManage) return 'No tienes permisos para generar fixtures.'
    if (uniqueTeams.length < 2) return 'Agrega al menos dos equipos antes de generar un fixture.'
    const selectedTeamIds = operation.payload.teamIds ? operation.payload.teamIds.split(',').filter(Boolean) : teams.map((team) => team.id)
    const mode = operation.payload.mode || 'automatic'
    const requestedDateCount = mode === 'manual' ? 1 : Number(operation.payload.numberOfDates || 1)
    if (!Number.isInteger(requestedDateCount) || requestedDateCount < 1) return 'La cantidad de fechas no es válida.'
    const datePairings: ManualPairing[][] = Array.from({ length: requestedDateCount }, () => [])

    if (mode === 'manual') {
      const manualPairings = JSON.parse(operation.payload.pairings || '[]') as ManualPairing[]
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
        const minimumDates = requestedMatches > 0 ? 1 : 0
        if (requestedDateCount < minimumDates) return `${division.name} necesita al menos ${minimumDates} fechas.`
        const schedule = buildRandomDivisionSchedule(division.id, divisionTeams.map((team) => team.id), requestedMatches, requestedDateCount)
        if (!schedule) return `No se pudo distribuir aleatoriamente los partidos de ${division.name} en las fechas indicadas.`
        divisionSchedules.push(schedule)
      }
      const orderedDates = orderDivisionSchedules(divisionSchedules, requestedDateCount)
      if (!orderedDates) return 'No se pudo ordenar los partidos sin que un equipo juegue dos veces seguidas. Ajusta la cantidad de partidos, agrega otra división o utiliza un receso manual.'
      orderedDates.forEach((pairings, dateIndex) => datePairings[dateIndex].push(...pairings))
    }

    const totalPairings = datePairings.reduce((total, pairings) => total + pairings.length, 0)
    if (!totalPairings) return 'No se generaron enfrentamientos con la configuración indicada.'
    const nextDate = (dates.at(-1) || 0) + 1
    const generatedAt = new Date().toISOString()
    const fixtureRows = datePairings.map((_, index) => ({ tournament_id: tournament.id, date_number: nextDate + index, calendar_date: addWeeksToDate(tournament.start_date, index), recesses: [{ id: `recess-${nextDate + index}-1`, time: null }], generated_at: generatedAt }))
    const { data: fixtures, error: fixtureError } = await supabase.from('fixtures').insert(fixtureRows).select('id, date_number')
    if (fixtureError || !fixtures?.length) return fixtureError?.message || 'No se pudieron crear las fechas.'

    const fixtureByDate = new Map(fixtures.map((fixture) => [fixture.date_number, fixture.id]))
    const pairs = datePairings.flatMap((pairings, index) => pairings.map((pairing, pairingIndex) => ({ fixture_id: fixtureByDate.get(nextDate + index), division_id: pairing.divisionId, fixture_order: pairingIndex, local_team_id: pairing.localTeamId, visitor_team_id: pairing.visitorTeamId })))
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
    queueOperation({ title: 'Agregar equipo temporal', kind: 'add-quick-team', payload: { name: values.name.trim(), logoUrl: values.logoUrl.trim(), phone: values.phone.trim(), divisionId: values.divisionId }, changes: [{ label: 'Equipo temporal', before: 'No registrado', after: `${values.name.trim()} · ${division.name}`, beforeValue: null, afterValue: values.name.trim() }] })
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
    if (!supabase || !pendingOperations.length || !tournament) return

    const operations = pendingOperations
    let remainingOperations = [...operations]
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user?.email) return setMessage('No se pudo identificar el correo de la cuenta.')
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: userData.user.email, password })
    if (reauthError) return setMessage('La contraseña no es correcta. No se guardaron cambios.')

    for (const operation of operations) {
      const operationError = await applyOperation(operation, userData.user.id)
      if (operationError) {
        setPendingOperations(remainingOperations)
        return setMessage(`No se pudo guardar "${operation.title}": ${operationError}`)
      }

      const { error: auditError } = await supabase.rpc('record_tournament_edit', {
        p_tournament_id: tournament.id,
        p_changes: Object.fromEntries(operation.changes.map((change, index) => [`${operation.kind}_${index}`, { before: change.before, after: change.after }])),
      })
      if (auditError) {
        setPendingOperations(remainingOperations.slice(1))
        return setMessage(auditError.message)
      }
      remainingOperations = remainingOperations.slice(1)
      setPendingOperations(remainingOperations)
    }

    setPendingOperations([])
    setShowOperationSave(false)
    setDirtySection(null)
    setMessage(`${operations.length} cambio${operations.length === 1 ? '' : 's'} guardado${operations.length === 1 ? '' : 's'} correctamente.`)
    await loadTournament()
  }

  async function requestPlayerNumber(teamId: string, playerId: string, playerName: string, currentNumber: number | null, requestedNumber: number) {
    if (!supabase) return
    if (!Number.isInteger(requestedNumber) || requestedNumber < 0 || requestedNumber > 99) return setMessage('El número debe ser un entero entre 0 y 99.')
    const { error: requestError } = await supabase.rpc('create_player_number_change_request', { p_team_id: teamId, p_player_id: playerId, p_requested_number: requestedNumber, p_league_name: tournament.name, p_tournament_id: tournament.id })
    if (requestError) return setMessage(requestError.message)
    setNumberRequest(null)
    setMessage(`Solicitud enviada para cambiar el número de ${playerName}.`)
  }

  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10"><div className="mx-auto max-w-6xl space-y-6">
    <button type="button" onClick={() => router.back()} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-[#b4ff45]"><ArrowLeft size={18} />Volver</button>

    <section className="overflow-hidden rounded-[5px] border border-[#29485d] bg-[#0b1d2c]"><div className="grid gap-0 lg:grid-cols-[.8fr_1.2fr]"><div className="flex min-h-64 items-center justify-center bg-[#102a3d] p-6">{tournament.cover_url ? <img src={tournament.cover_url} alt={`Portada de ${tournament.name}`} className="max-h-72 w-full rounded-[5px] object-contain" /> : <Trophy className="text-[#b4ff45]" size={92} />}</div><div className="p-6 sm:p-8"><div className="flex flex-wrap items-center gap-2"><span className="rounded-[5px] bg-[#b4ff45] px-3 py-1 text-xs font-bold uppercase text-[#07131e]">{statusNames[tournament.status] || tournament.status}</span>{tournament.discipline && <span className="rounded-[5px] border border-[#b4ff45]/40 px-3 py-1 text-xs font-semibold text-[#dcffb6]">{tournament.discipline.name}</span>}{tournament.modality && <span className="rounded-[5px] border border-[#b4ff45]/40 bg-[#b4ff45]/10 px-3 py-1 text-xs font-semibold text-[#dcffb6]">{tournament.modality.name}</span>}</div><p className="mt-5 text-xs font-bold uppercase tracking-[.24em] text-[#b4ff45]">Información pública del torneo</p><h1 className="mt-2 font-display text-4xl uppercase sm:text-5xl">{tournament.name}</h1><p className="mt-3 text-lg text-slate-400">Temporada {tournament.season || 'pendiente'}</p><div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-300"><span className="inline-flex items-center gap-2"><CalendarDays size={17} className="text-[#b4ff45]" />{formatDateRange(tournament.start_date, tournament.end_date)}</span>{tournament.location && <span className="inline-flex items-center gap-2"><MapPin size={17} className="text-[#b4ff45]" />{tournament.location}</span>}</div><p className="mt-5 font-mono text-xs text-[#b4ff45]">{tournament.athlonx_code || 'Código pendiente'}</p></div></div></section>

    <div className="grid gap-4 sm:grid-cols-4"><StatCard title="Equipos" value={String(uniqueTeams.length)} icon={<Users size={20} />} /><StatCard title="Divisiones" value={String(data.divisions?.length ?? 0)} icon={<Trophy size={20} />} /><StatCard title="Partidos" value={String(matches.length)} icon={<CalendarDays size={20} />} /><StatCard title="Fechas" value={String(dates.length)} icon={<Table2 size={20} />} /></div>

    <section className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-8"><nav className="flex flex-wrap gap-2 border-b border-white/10 pb-5">{([['resumen', 'Resumen'], ['tablas', 'Tablas'], ['equipos', 'Equipos y plantillas'], ['convocatorias', 'Convocatorias'], ['fixtures', 'Fixtures'], ['generador', 'Generador de fixtures'], ['partidos', 'Partidos'], ['general', 'Información general'], ['historial', 'Historial']] as const).filter(([value]) => value !== 'generador' || canManage).map(([value, label]) => <button key={value} type="button" onClick={() => requestSection(value)} className={`cursor-pointer rounded-[5px] px-4 py-2.5 text-sm font-bold transition ${section === value ? 'bg-[#b4ff45] text-[#07131e]' : 'border border-[#29485d] text-slate-300 hover:border-[#b4ff45] hover:text-white'}`}>{label}</button>)}</nav>{section === 'resumen' && <SummarySection tournament={tournament} divisions={data.divisions ?? []} teams={teams} matches={matches} events={matchEvents} onOpenFixtures={() => requestSection('fixtures')} canManage={canManage && editMode} />}{section === 'tablas' && <StandingsSection teams={teams} matches={matches} />}{section === 'equipos' && (tournament.is_quick ? <QuickTournamentTeamsSection teams={teams} rosters={rosters} divisions={data.divisions ?? []} availableTeams={availableTeams.filter((team) => !teams.some((current) => teamIdentityKey(current) === teamIdentityKey(team)))} availablePlayers={availablePlayers} modality={tournament.modality} officialPlayerId={officialPlayerId} canManage={canManage} editMode={editMode} currentUserId={currentUserId} onAddTeam={requestAddTeam} onAddQuickTeam={requestAddQuickTeam} onRemoveTeam={requestRemoveTeam} onAddQuickPlayer={requestAddQuickPlayer} onAddExistingPlayer={requestAddExistingPlayer} onClaimGuestPlayer={requestClaimGuestPlayer} onNumberRequest={(request) => setNumberRequest(request)} /> : <TeamsSection teams={teams} rosters={rosters} dates={dates} fixtureDates={fixtureDates} divisions={data.divisions ?? []} availableTeams={availableTeams.filter((team) => !teams.some((current) => teamIdentityKey(current) === teamIdentityKey(team)))} callups={fixtureCallups} callupPlayers={fixtureCallupPlayers} canManage={canManage} editMode={editMode} currentUserId={currentUserId} onAddTeam={requestAddTeam} onRemoveTeam={requestRemoveTeam} onNumberRequest={(request) => setNumberRequest(request)} />)}{section === 'convocatorias' && <TournamentCallupsPanel tournamentId={tournament.id} divisions={data.divisions ?? []} teams={teams} matches={matches} rosters={rosters} isOwner={canManage} initialMatchId={searchParams.get('matchId') || undefined} initialTeamId={searchParams.get('teamId') || undefined} />}{section === 'fixtures' && <FixtureListSection tournament={tournament} teams={teams} dates={dates} matches={matches} />}{section === 'generador' && canManage && <TournamentFixtureGenerator tournamentName={tournament.name} tournamentStatus={tournament.status} divisions={data.divisions ?? []} teams={teams} dates={dates} matches={matches} canManage={canManage} onGenerate={requestGenerateFixture} />}{section === 'partidos' && <MatchesSection matches={matches} dates={dates} events={matchEvents} rosters={rosters} onOpenFixtures={() => requestSection('fixtures')} canManage={canManage && editMode} />}{section === 'general' && <GeneralInfoSection tournament={tournament} divisions={data.divisions ?? []} disciplines={disciplines} modalities={modalities} canManage={canManage} editMode={editMode && canManage} onRequestSave={requestSave} onDirtyChange={(dirty) => setDirtySection(dirty ? 'general' : null)} onCancel={() => { setEditMode(false); setDirtySection(null); setMessage('') }} onEdit={() => { if (canManage) setEditMode(true) }} />}{section === 'historial' && <EditHistorySection history={history} />}</section>
    {message && <p role="status" className="rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/10 p-4 text-sm text-[#dfffba]">{message}</p>}
    {pendingOperations.length > 0 && <PendingOperationsPanel operations={pendingOperations} onRemove={(operationId) => setPendingOperations((current) => current.filter((operation) => operation.id !== operationId))} onSave={() => { setMessage(''); setShowOperationSave(true) }} />}
  </div>{pendingChanges && <EditConfirmationOverlay changes={pendingChanges} onCancel={() => { setPendingChanges(null); setPendingDivisionNames(null) }} onConfirm={confirmSave} message={message} />}{showOperationSave && <EditConfirmationOverlay title="Guardar cambios" changes={Object.fromEntries(pendingOperations.flatMap((operation) => operation.changes.map((change, index) => [`${operation.id}-${index}`, { ...change, label: `${operation.title}: ${change.label}` }])))} onCancel={() => { setShowOperationSave(false); setMessage('') }} onConfirm={confirmOperations} message={message} />}{pendingSection && <UnsavedChangesOverlay onCancel={() => setPendingSection(null)} onDiscard={discardUnsavedChanges} onSave={saveBeforeNavigate} />}{numberRequest && <PlayerNumberRequestModal request={numberRequest} onCancel={() => setNumberRequest(null)} onSubmit={(requestedNumber) => void requestPlayerNumber(numberRequest.teamId, numberRequest.playerId, numberRequest.playerName, numberRequest.currentNumber, requestedNumber)} />}</main>
}

function PendingOperationsPanel({ operations, onRemove, onSave }: { operations: PendingOperation[]; onRemove: (operationId: string) => void; onSave: () => void }) {
  return (
    <section className="rounded-[5px] border border-[#b4ff45]/40 bg-[#b4ff45]/5 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Cambios pendientes</p>
          <h2 className="mt-2 font-display text-2xl uppercase">Cambios pendientes</h2>
          <p className="mt-2 text-sm text-slate-400">Revisa los cambios. La contraseña se solicitará únicamente al guardar.</p>
        </div>
        <button type="button" onClick={onSave} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e]">
          <Check size={17} />
          Guardar cambios
        </button>
      </div>
      <div className="mt-5 space-y-2">
        {operations.map((operation) => (
          <div key={operation.id} className="flex items-center justify-between gap-3 rounded-[5px] border border-white/10 bg-[#07131e] px-3 py-3 text-sm">
            <span className="min-w-0 truncate text-slate-200">{operation.title}</span>
            <button type="button" onClick={() => onRemove(operation.id)} className="shrink-0 cursor-pointer rounded-[5px] border border-[#ff7d88]/50 px-3 py-1.5 text-xs font-bold text-[#ff9ca5]">
              Quitar
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function SummarySection({ tournament, divisions, teams, matches, events, onOpenFixtures, canManage }: { tournament: Tournament; divisions: Division[]; teams: TournamentTeam[]; matches: Match[]; events: MatchEvent[]; onOpenFixtures: () => void; canManage: boolean }) {
  const featuredMatch = getFeaturedMatch(matches)
  const uniqueTeamCount = new Set(teams.map((team) => team.id)).size
  return <div className="space-y-8 pt-6"><div className="grid gap-6 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Resumen del torneo</p><h2 className="mt-2 font-display text-3xl uppercase">Actividad competitiva</h2><p className="mt-3 text-sm leading-6 text-slate-400">Consulta la estructura, el partido prioritario y la actividad registrada de esta competencia.</p><div className="mt-6 space-y-3"><InfoRow label="Tipo de torneo" value={tournament.is_quick ? 'Torneo rápido · No oficial' : 'Torneo normal · Oficial'} /><InfoRow label="Organización responsable" value={tournament.organization?.name || 'Torneo independiente'} /><InfoRow label="Equipo organizador" value={tournament.organizer_team?.name || 'No especificado'} /></div></div><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Configuración deportiva</p><div className="mt-3 space-y-3"><InfoRow label="Disciplina" value={tournament.discipline?.name || 'No especificada'} /><InfoRow label="Modalidad" value={tournament.modality?.name || 'No especificada'} /><InfoRow label="Divisiones" value={divisions.map((division) => division.name).join(' · ') || 'Sin divisiones'} /><InfoRow label="Equipos inscritos" value={`${uniqueTeamCount} equipos · ${matches.length} partidos`} /></div></div></div><div><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Estado competitivo</p><h2 className="mt-2 font-display text-3xl uppercase">Partido destacado</h2></div>{featuredMatch && <span className="rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300">{featuredMatch.status === 'live' ? 'En vivo' : featuredMatch.status === 'finished' ? 'Último partido' : 'Próximo partido'}</span>}</div>{featuredMatch ? <MatchHighlight match={featuredMatch} events={events.filter((event) => event.match_id === featuredMatch.id)} /> : <div className="mt-5 rounded-[5px] border border-dashed border-[#31556b] bg-[#07131e] p-6"><p className="text-sm leading-6 text-slate-400">No hay partidos programados porque todavía no se ha generado un fixture.</p>{canManage && <button type="button" onClick={onOpenFixtures} className="mt-4 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]">Generar fixture</button>}</div>}</div></div>
}

function StandingsSection({ teams, matches }: { teams: TournamentTeam[]; matches: Match[] }) {
  const [selectedDivisionId, setSelectedDivisionId] = useState(teams[0]?.division_id || '')
  useEffect(() => {
    if (!teams.some((team) => team.division_id === selectedDivisionId)) setSelectedDivisionId(teams[0]?.division_id || '')
  }, [selectedDivisionId, teams])
  const divisions = Array.from(new Map(teams.map((team) => [team.division_id, team.division_name])).entries())
  const divisionTeams = teams.filter((team) => team.division_id === selectedDivisionId)
  const standings = divisionTeams.map((team) => { const row = { team, played: 0, wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, points: 0 }; matches.filter((match) => match.status === 'finished' && match.division_id === team.division_id && (match.local_team_id === team.id || match.visitor_team_id === team.id)).forEach((match) => { const local = match.local_team_id === team.id; const scored = local ? match.local_score : match.visitor_score; const conceded = local ? match.visitor_score : match.local_score; row.played += 1; row.pointsFor += scored; row.pointsAgainst += conceded; if (scored > conceded) { row.wins += 1; row.points += 4 } else if (scored === conceded) { row.draws += 1; row.points += 2 } else row.losses += 1 }); return row }).sort((a, b) => b.points - a.points || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst))
  return <div className="pt-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Competencia</p><h2 className="mt-2 font-display text-3xl uppercase">Tabla de puntuación</h2><p className="mt-2 text-sm text-slate-400">Selecciona una división para consultar su tabla. Los puntos se calculan con los partidos finalizados: victoria 4, empate 2.</p></div><Table2 className="text-[#b4ff45]" /></div>{divisions.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{divisions.map(([id, name]) => <button type="button" key={id} onClick={() => setSelectedDivisionId(id)} className={`rounded-[5px] border px-4 py-2.5 text-sm font-bold transition ${selectedDivisionId === id ? 'border-[#b4ff45] bg-[#b4ff45] text-[#07131e]' : 'border-[#31556b] text-slate-300 hover:border-[#b4ff45] hover:text-white'}`}>{name}</button>)}</div>}{divisions.length > 0 ? <div className="mt-6 overflow-x-auto rounded-[5px] border border-[#29485d]"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-[#102a3d] text-xs uppercase tracking-wider text-slate-400"><tr><th className="p-4">Equipo</th><th className="p-4">PJ</th><th className="p-4">PG</th><th className="p-4">PE</th><th className="p-4">PP</th><th className="p-4">PF</th><th className="p-4">PC</th><th className="p-4 text-[#b4ff45]">PTS</th></tr></thead><tbody>{standings.map((row, index) => <tr key={`${row.team.id}-${row.team.division_id}`} className="border-t border-[#29485d]"><td className="p-4 font-bold"><span className="mr-3 text-[#b4ff45]">{index + 1}</span>{row.team.name}</td><td className="p-4 text-slate-300">{row.played}</td><td className="p-4 text-slate-300">{row.wins}</td><td className="p-4 text-slate-300">{row.draws}</td><td className="p-4 text-slate-300">{row.losses}</td><td className="p-4 text-slate-300">{row.pointsFor}</td><td className="p-4 text-slate-300">{row.pointsAgainst}</td><td className="p-4 font-bold text-[#b4ff45]">{row.points}</td></tr>)}</tbody></table>{!standings.length && <p className="p-6 text-sm text-slate-400">Todavía no hay equipos en esta división.</p>}</div> : <div className="mt-6 rounded-[5px] border border-dashed border-[#31556b] p-6 text-sm text-slate-400">Todavía no hay divisiones configuradas.</div>}</div>
}

function formatTournamentFixtureDateLabel(fixture: TournamentFixtureDate) {
  const dateLabel = fixture.calendarDate ? new Intl.DateTimeFormat('es-PA', { day: 'numeric', month: 'short' }).format(new Date(`${fixture.calendarDate}T12:00:00`)) : ''
  return `Fecha ${fixture.dateNumber}${dateLabel ? ` · ${dateLabel}` : ''}`
}

function TeamsSection({ teams, rosters, fixtureDates, divisions: allDivisions, availableTeams, callups, callupPlayers, canManage, editMode, onAddTeam, onRemoveTeam }: { teams: TournamentTeam[]; rosters: RosterEntry[]; dates: number[]; fixtureDates: TournamentFixtureDate[]; divisions: Division[]; availableTeams: TeamSummary[]; callups: TournamentFixtureCallup[]; callupPlayers: TournamentFixtureCallupPlayer[]; canManage: boolean; editMode: boolean; currentUserId: string; onAddTeam: (teamId: string, divisionId: string) => void; onRemoveTeam: (team: TournamentTeam) => void; onNumberRequest: (request: { teamId: string; playerId: string; playerName: string; currentNumber: number | null }) => void }) {
  const [expandedTeams, setExpandedTeams] = useState<string[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showRemove, setShowRemove] = useState(false)
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<Record<string, string>>({})
  const [teamQuery, setTeamQuery] = useState('')
  const filteredTeams = availableTeams.filter((team) => !selectedTeamIds.includes(team.id) && `${team.name} ${team.handle || ''} ${team.athlonx_code || ''}`.toLowerCase().includes(teamQuery.toLowerCase()))
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

  return <section className="pt-6 print:hidden"><div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Consulta</p><h2 className="mt-2 font-display text-3xl uppercase">Fixtures</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">Edita equipos, horarios y fechas. Los cambios se guardan directamente en Supabase.</p></div></div>{!matches.length && <div className="mt-6 rounded-[5px] border border-dashed border-[#31556b] bg-[#07131e] p-6 text-sm text-slate-400">Todavía no hay fixtures creados.</div>}<div className="mt-6 space-y-5">{fixtureGroups.map((fixture) => { const isEditing = editingDate === fixture.date; const visibleMatches = fixture.matches.filter((match) => !deletedMatchIds.includes(match.id)); const calendarDate = draftDates[String(fixture.date)] || fixture.matches[0]?.calendar_date || tournament.start_date || ''; return <article key={fixture.date} className="rounded-[5px] border border-[#31556b] bg-[#07131e] p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Fecha {fixture.date}</p>{isEditing ? <input type="date" value={calendarDate} onChange={(event) => setDraftDates((current) => ({ ...current, [String(fixture.date)]: event.target.value }))} className="mt-2 rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-3 py-2 text-sm text-slate-200" /> : <p className="mt-2 text-sm capitalize text-slate-300">{calendarDate ? new Date(`${calendarDate}T00:00:00`).toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha por definir'}</p>}</div>{canManage && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setEditingDate(isEditing ? null : fixture.date); setDeletedMatchIds([]) }} className="rounded-[5px] border border-[#b4ff45]/60 px-3 py-2 text-xs font-bold text-[#dfffba]">{isEditing ? 'Cancelar' : 'Editar'}</button>{isEditing && <><button type="button" onClick={() => void saveDate(fixture.date)} className="inline-flex items-center gap-2 rounded-[5px] bg-[#b4ff45] px-3 py-2 text-xs font-bold text-[#07131e]"><Check size={15} />Guardar</button><button type="button" onClick={() => void deleteDate(fixture.date)} className="inline-flex items-center gap-2 rounded-[5px] border border-[#ff7d88]/60 px-3 py-2 text-xs font-bold text-[#ffb0b7]"><Trash2 size={15} />Eliminar fecha</button></>}</div>}</div><div className="mt-3 divide-y divide-white/10">{visibleMatches.map((match) => { const pair = draftPairs[match.id] || { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }; const divisionId = teams.find((team) => team.id === pair.localTeamId)?.division_id || teams.find((team) => team.id === pair.visitorTeamId)?.division_id; const options = teams.filter((team) => team.division_id === divisionId); return <div key={match.id} className="grid gap-3 py-4 sm:grid-cols-[120px_1fr_140px] sm:items-center"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{match.division_name || 'General'}</span>{isEditing ? <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select value={pair.localTeamId} onChange={(event) => setDraftPairs((current) => ({ ...current, [match.id]: { ...pair, localTeamId: event.target.value } }))} className="rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-2 py-2 text-sm text-slate-200"><option value="">Local</option>{options.map((team) => <option key={`local-${match.id}-${team.id}`} value={team.id}>{team.name}</option>)}</select><select value={pair.visitorTeamId} onChange={(event) => setDraftPairs((current) => ({ ...current, [match.id]: { ...pair, visitorTeamId: event.target.value } }))} className="rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-2 py-2 text-sm text-slate-200"><option value="">Visitante</option>{options.filter((team) => team.id !== pair.localTeamId).map((team) => <option key={`visitor-${match.id}-${team.id}`} value={team.id}>{team.name}</option>)}</select><button type="button" onClick={() => void deleteMatch(match.id)} className="rounded-[5px] border border-[#ff7d88]/50 px-2 py-2 text-[#ffb0b7]"><Trash2 size={15} /></button><input type="time" value={draftTimes[match.id] || ''} onChange={(event) => setDraftTimes((current) => ({ ...current, [match.id]: event.target.value }))} className="rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-2 py-2 text-sm text-slate-200 sm:col-span-3" /></div> : <><div className="font-semibold text-slate-100"><span>{match.local_team_name}</span><span className="px-2 text-slate-500">vs.</span><span>{match.visitor_team_name}</span></div><span className="text-sm text-slate-400">{match.scheduled_time ? match.scheduled_time.slice(0, 5) : 'Hora por definir'}</span></>}</div> })}</div></article> })}</div>{message && <p role="status" className="mt-4 rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/10 p-4 text-sm text-[#dfffba]">{message}</p>}</section>
}

function FixtureListSection({ tournament, teams, dates, matches }: { tournament: Tournament; teams: TournamentTeam[]; dates: number[]; matches: Match[] }) {
  const [fixtureRecords, setFixtureRecords] = useState<FixtureRecord[]>([])
  const [canManage, setCanManage] = useState(false)
  const [editingDate, setEditingDate] = useState<number | null>(null)
  const [draftDates, setDraftDates] = useState<Record<string, string>>({})
  const [draftTimes, setDraftTimes] = useState<Record<string, string>>({})
  const [draftPairs, setDraftPairs] = useState<Record<string, { localTeamId: string; visitorTeamId: string }>>({})
  const [draftRecesses, setDraftRecesses] = useState<Record<string, FixtureRecess[]>>({})
  const [deletedMatchIds, setDeletedMatchIds] = useState<string[]>([])
  const [addingDate, setAddingDate] = useState<number | null>(null)
  const [newMatch, setNewMatch] = useState<DraftNewFixtureMatch>({ divisionId: '', localTeamId: '', visitorTeamId: '', scheduledTime: '' })
  const [message, setMessage] = useState('')
  const [printTarget, setPrintTarget] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      if (!supabase) return
      const [{ data: userData }, { data: tournamentRow }, { data: rows }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('tournaments').select('created_by').eq('id', tournament.id).maybeSingle(),
        supabase.from('fixtures').select('id, date_number, calendar_date, recesses').eq('tournament_id', tournament.id).order('date_number'),
      ])
      if (!active) return
      setCanManage(tournamentRow?.created_by === userData.user?.id)
      setFixtureRecords((rows ?? []) as FixtureRecord[])
    })()
    return () => { active = false }
  }, [tournament.id])

  useEffect(() => {
    setDraftDates(Object.fromEntries(dates.map((date) => [String(date), matches.find((match) => match.date_number === date)?.calendar_date || tournament.start_date || ''])))
    setDraftTimes(Object.fromEntries(matches.map((match) => [match.id, match.scheduled_time || ''])))
    setDraftPairs(Object.fromEntries(matches.map((match) => [match.id, { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }])))
    setDraftRecesses(Object.fromEntries(dates.map((date) => {
      const fixture = fixtureRecords.find((item) => item.date_number === date)
      return [String(date), normalizeFixtureRecesses(fixture?.recesses, fixture?.id || `date-${date}`)]
    })))
  }, [dates.join(','), matches.map((match) => `${match.id}:${match.calendar_date || ''}:${match.scheduled_time || ''}:${match.local_team_id}:${match.visitor_team_id}`).join('|'), fixtureRecords.map((fixture) => `${fixture.id}:${fixture.date_number}:${JSON.stringify(fixture.recesses)}`).join('|'), tournament.start_date])

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
    const sourceFixture = fixtureRecords.find((fixture) => fixture.date_number === date) || (source ? { id: source.fixture_id } : null)
    if (!source || !sourceFixture) return setMessage('No se encontró la fecha para guardar.')
    setMessage('')
    const recesses = draftRecesses[String(date)]?.length ? draftRecesses[String(date)] : normalizeFixtureRecesses([], sourceFixture.id)
    const { error: fixtureError } = await supabase.from('fixtures').update({ calendar_date: draftDates[String(date)] || null, recesses }).eq('id', sourceFixture.id)
    if (fixtureError) return setMessage(fixtureError.message)
    for (const match of dateMatches) {
      const nextPair = draftPairs[match.id] || { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }
      if (!nextPair.localTeamId || !nextPair.visitorTeamId || nextPair.localTeamId === nextPair.visitorTeamId) return setMessage('Cada enfrentamiento debe tener dos equipos diferentes.')
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
    if (!supabase || !window.confirm(`¿Seguro que deseas eliminar la Fecha ${date} completa?`)) return
    const fixtureIds = Array.from(new Set(matches.filter((match) => match.date_number === date).map((match) => match.fixture_id)))
    if (!fixtureIds.length) return
    const { error: matchesError } = await supabase.from('matches').delete().in('fixture_id', fixtureIds)
    if (matchesError) return setMessage(matchesError.message)
    const { error } = await supabase.from('fixtures').delete().in('id', fixtureIds)
    if (error) return setMessage(error.message)
    window.location.reload()
  }

  function deleteMatch(matchId: string) {
    if (!window.confirm('¿Seguro que deseas eliminar este enfrentamiento?')) return
    setDeletedMatchIds((current) => [...current, matchId])
  }

  function printFixture(date: number) {
    setPrintTarget(date)
    window.setTimeout(() => window.print(), 0)
  }

  const fixtureGroups = dates.map((date) => ({ date, matches: matches.filter((match) => match.date_number === date) }))

  return <><section className="pt-6 print:hidden">
    <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Consulta</p><h2 className="mt-2 font-display text-3xl uppercase">Fixtures</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">Edita partidos, horarios, fechas y recesos. Los cambios se guardan directamente en Supabase.</p></div></div>
    {!matches.length && <div className="mt-6 rounded-[5px] border border-dashed border-[#31556b] bg-[#07131e] p-6 text-sm text-slate-400">Todavía no hay fixtures creados.</div>}
    <div className="mt-6 space-y-5">{fixtureGroups.map((fixture) => {
      const isEditing = editingDate === fixture.date
      const visibleMatches = fixture.matches.filter((match) => !deletedMatchIds.includes(match.id))
      const calendarDate = draftDates[String(fixture.date)] || fixture.matches[0]?.calendar_date || tournament.start_date || ''
      const recesses = draftRecesses[String(fixture.date)] || normalizeFixtureRecesses([], `date-${fixture.date}`)
      return <article key={fixture.date} className="rounded-[5px] border border-[#31556b] bg-[#07131e] p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Fecha {fixture.date}</p>{isEditing ? <input type="date" value={calendarDate} onChange={(event) => setDraftDates((current) => ({ ...current, [String(fixture.date)]: event.target.value }))} className="mt-2 rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-3 py-2 text-sm text-slate-200" /> : <p className="mt-2 text-sm capitalize text-slate-300">{calendarDate ? new Date(`${calendarDate}T00:00:00`).toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha por definir'}</p>}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => printFixture(fixture.date)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-200 hover:border-[#b4ff45]"><FileDown size={15} />Generar PDF</button>{canManage && <><button type="button" onClick={() => { setEditingDate(isEditing ? null : fixture.date); setDeletedMatchIds([]) }} className="rounded-[5px] border border-[#b4ff45]/60 px-3 py-2 text-xs font-bold text-[#dfffba]">{isEditing ? 'Cancelar' : 'Editar'}</button>{isEditing && <><button type="button" onClick={() => void saveDate(fixture.date)} className="inline-flex items-center gap-2 rounded-[5px] bg-[#b4ff45] px-3 py-2 text-xs font-bold text-[#07131e]"><Check size={15} />Guardar</button><button type="button" onClick={() => void deleteDate(fixture.date)} className="inline-flex items-center gap-2 rounded-[5px] border border-[#ff7d88]/60 px-3 py-2 text-xs font-bold text-[#ffb0b7]"><Trash2 size={15} />Eliminar fecha</button></>}</>}</div></div>
        <div className="mt-3 divide-y divide-white/10">{visibleMatches.map((match) => { const pair = draftPairs[match.id] || { localTeamId: match.local_team_id, visitorTeamId: match.visitor_team_id }; const divisionId = teams.find((team) => team.id === pair.localTeamId)?.division_id || teams.find((team) => team.id === pair.visitorTeamId)?.division_id; const options = teams.filter((team) => team.division_id === divisionId); return <div key={match.id} className="grid gap-3 py-4 sm:grid-cols-[120px_1fr_140px] sm:items-center"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{match.division_name || 'General'}</span>{isEditing ? <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select value={pair.localTeamId} onChange={(event) => setDraftPairs((current) => ({ ...current, [match.id]: { ...pair, localTeamId: event.target.value } }))} className="rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-2 py-2 text-sm text-slate-200"><option value="">Local</option>{options.map((team) => <option key={`local-${match.id}-${team.id}`} value={team.id}>{team.name}</option>)}</select><select value={pair.visitorTeamId} onChange={(event) => setDraftPairs((current) => ({ ...current, [match.id]: { ...pair, visitorTeamId: event.target.value } }))} className="rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-2 py-2 text-sm text-slate-200"><option value="">Visitante</option>{options.filter((team) => team.id !== pair.localTeamId).map((team) => <option key={`visitor-${match.id}-${team.id}`} value={team.id}>{team.name}</option>)}</select><button type="button" onClick={() => deleteMatch(match.id)} className="rounded-[5px] border border-[#ff7d88]/50 px-2 py-2 text-[#ffb0b7]"><Trash2 size={15} /></button><input type="time" value={draftTimes[match.id] || ''} onChange={(event) => setDraftTimes((current) => ({ ...current, [match.id]: event.target.value }))} className="rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-2 py-2 text-sm text-slate-200 sm:col-span-3" /></div> : <><div className="font-semibold text-slate-100"><span>{match.local_team_name}</span><span className="px-2 text-slate-500">vs.</span><span>{match.visitor_team_name}</span></div><span className="text-sm text-slate-400">{match.scheduled_time ? match.scheduled_time.slice(0, 5) : 'Hora por definir'}</span></>}</div> })}</div>
        {canManage && <div className="mt-5 rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/5 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Nuevo enfrentamiento</p><p className="mt-1 text-sm text-slate-400">Añade otro partido a esta fecha y quedará guardado en Supabase.</p></div>{addingDate !== fixture.date && <button type="button" onClick={() => startAddingMatch(fixture.date)} className="rounded-[5px] bg-[#b4ff45] px-3 py-2 text-xs font-bold text-[#07131e]">Añadir enfrentamiento</button>}</div>{addingDate === fixture.date && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><select value={newMatch.divisionId} onChange={(event) => setNewMatch({ divisionId: event.target.value, localTeamId: '', visitorTeamId: '', scheduledTime: newMatch.scheduledTime })} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-3 py-2 text-sm text-slate-200"><option value="">División</option>{Array.from(new Map(teams.map((team) => [team.division_id, team.division_name])).entries()).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select value={newMatch.localTeamId} onChange={(event) => setNewMatch((current) => ({ ...current, localTeamId: event.target.value }))} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-3 py-2 text-sm text-slate-200"><option value="">Local</option>{teams.filter((team) => team.division_id === newMatch.divisionId).map((team) => <option key={`new-local-${team.id}`} value={team.id}>{team.name}</option>)}</select><select value={newMatch.visitorTeamId} onChange={(event) => setNewMatch((current) => ({ ...current, visitorTeamId: event.target.value }))} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-3 py-2 text-sm text-slate-200"><option value="">Visitante</option>{teams.filter((team) => team.division_id === newMatch.divisionId && team.id !== newMatch.localTeamId).map((team) => <option key={`new-visitor-${team.id}`} value={team.id}>{team.name}</option>)}</select><input type="time" value={newMatch.scheduledTime} onChange={(event) => setNewMatch((current) => ({ ...current, scheduledTime: event.target.value }))} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-3 py-2 text-sm text-slate-200" /><div className="flex gap-2"><button type="button" onClick={() => void saveNewMatch(fixture.date)} className="rounded-[5px] bg-[#b4ff45] px-3 py-2 text-xs font-bold text-[#07131e]">Guardar</button><button type="button" onClick={() => setAddingDate(null)} className="rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300">Cancelar</button></div></div>}</div>}
        <div className="mt-5 rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Recesos</p><p className="mt-1 text-sm text-slate-400">Define la hora de cada descanso de esta fecha.</p></div>{isEditing && <button type="button" onClick={() => addRecess(fixture.date)} className="rounded-[5px] border border-[#b4ff45]/60 px-3 py-2 text-xs font-bold text-[#dfffba]">Añadir receso</button>}</div><div className="mt-3 space-y-2">{recesses.map((recess, index) => <div key={recess.id} className="flex flex-wrap items-center gap-3 rounded-[5px] border border-white/10 px-3 py-3"><span className="min-w-24 text-sm font-semibold text-white">Receso {index + 1}</span>{isEditing ? <input type="time" value={recess.time || ''} onChange={(event) => setDraftRecesses((current) => ({ ...current, [String(fixture.date)]: recesses.map((item) => item.id === recess.id ? { ...item, time: event.target.value || null } : item) }))} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-3 py-2 text-sm text-slate-200" /> : <span className="text-sm text-slate-400">{recess.time ? recess.time.slice(0, 5) : 'Hora por definir'}</span>}{isEditing && index > 0 && <button type="button" onClick={() => removeRecess(fixture.date, recess.id)} className="ml-auto text-xs font-bold text-[#ffb0b7]">Quitar</button>}</div>)}</div></div>
      </article>
    })}</div>{message && <p role="status" className="mt-4 rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/10 p-4 text-sm text-[#dfffba]">{message}</p>}
  </section>{printTarget !== null && <section className="hidden min-h-screen bg-white p-10 text-black print:block"><div className="flex items-start justify-between"><img src="/MarcaAthlonX/MarcaNegro.svg" alt="AthlonX" className="h-16 w-48 object-contain object-left" /><img src="/upr.png" alt="Organización" className="h-20 w-36 object-contain object-right" /></div><h1 className="mt-8 text-center font-display text-3xl uppercase">Fixture del torneo</h1><p className="mt-2 text-center text-xl font-bold">{tournament.name}</p>{fixtureGroups.filter((fixture) => fixture.date === printTarget).map((fixture) => <div key={fixture.date} className="mt-8"><div className="flex items-baseline justify-between border-b-2 border-slate-800 pb-2"><h2 className="text-xl font-black uppercase">Fecha {fixture.date}</h2><p className="text-sm">{fixture.matches[0]?.calendar_date ? new Date(`${fixture.matches[0].calendar_date}T00:00:00`).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha por definir'}</p></div><div className="mt-3 space-y-2">{fixture.matches.map((match) => <div key={match.id} className="grid grid-cols-[120px_1fr_120px] gap-3 border-b border-slate-300 py-3 text-sm"><span>{match.division_name || 'General'}</span><span className="font-bold">{match.local_team_name} vs. {match.visitor_team_name}</span><span className="text-right">{match.scheduled_time ? match.scheduled_time.slice(0, 5) : 'Hora por definir'}</span></div>)}</div></div>)}</section>}</>
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

function MatchesSection({ matches, dates, events, rosters, onOpenFixtures, canManage }: { matches: Match[]; dates: number[]; events: MatchEvent[]; rosters: RosterEntry[]; onOpenFixtures: () => void; canManage: boolean }) {
  const featuredMatch = getFeaturedMatch(matches)
  const [selectedMatchId, setSelectedMatchId] = useState(featuredMatch?.id || '')
  const selectedMatch = matches.find((match) => match.id === selectedMatchId) || featuredMatch || null
  useEffect(() => { if (selectedMatch && !matches.some((match) => match.id === selectedMatch.id)) setSelectedMatchId(featuredMatch?.id || '') }, [featuredMatch, matches, selectedMatch])
  return <div className="space-y-8 pt-6"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Seguimiento</p><h2 className="mt-2 font-display text-3xl uppercase">Partidos</h2><p className="mt-2 text-sm text-slate-400">Selecciona un enfrentamiento para ver su vista previa, cronómetro, estadísticas y acciones.</p></div>{selectedMatch ? <MatchHighlight match={selectedMatch} events={events.filter((event) => event.match_id === selectedMatch.id)} rosters={rosters} canManage={canManage} /> : <div className="rounded-[5px] border border-dashed border-[#31556b] bg-[#07131e] p-6"><p className="text-sm text-slate-400">No hay partidos programados porque todavía no se ha generado un fixture.</p>{canManage && <button type="button" onClick={onOpenFixtures} className="mt-4 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]">Generar fixture</button>}</div>}<div><div className="flex items-center gap-2 border-b border-white/10 pb-3"><CalendarDays className="text-[#b4ff45]" size={18} /><h3 className="font-heading text-xl uppercase">Cronograma por fecha</h3></div>{matches.length ? <div className="mt-5 space-y-6">{dates.map((date) => <details key={date} open={date === dates[0]} className="group"><summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-[.2em] text-slate-500">Fecha {date}</summary><div className="mt-3 grid gap-3 lg:grid-cols-2">{matches.filter((match) => match.date_number === date).map((match) => <MatchCard key={match.id} match={match} selected={match.id === selectedMatch?.id} onPreview={() => setSelectedMatchId(match.id)} />)}</div></details>)}</div> : <p className="mt-5 text-sm text-slate-500">Genera un fixture para ver el cronograma.</p>}</div></div>
}

function MatchHighlight({ match, events: initialEvents = [], rosters = [], canManage = false }: { match: Match; events?: MatchEvent[]; rosters?: RosterEntry[]; canManage?: boolean }) {
  const [seconds, setSeconds] = useState(match.elapsed_seconds || 0)
  const periodLimit = 7 * 60
  const [saving, setSaving] = useState(false)
  const [events, setEvents] = useState<MatchEvent[]>(initialEvents)
  const [pendingScoreAction, setPendingScoreAction] = useState<{ teamId: string; label: 'Try' | 'Conversión'; points: number } | null>(null)
  const secondsRef = useRef(0)
  useEffect(() => { const initialSeconds = match.elapsed_seconds || 0; secondsRef.current = initialSeconds; setSeconds(initialSeconds) }, [match.id, match.elapsed_seconds])
  useEffect(() => { setEvents(initialEvents) }, [initialEvents, match.id])
  useEffect(() => {
    if (match.status !== 'live' || match.is_paused) return
    const startedAt = match.started_at ? new Date(match.started_at).getTime() : Date.now()
    const updateClock = () => {
      const nextSeconds = (match.elapsed_seconds || 0) + Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      secondsRef.current = nextSeconds
      setSeconds(nextSeconds)
    }
    updateClock()
    const timer = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(timer)
  }, [match.id, match.status, match.is_paused, match.started_at, match.elapsed_seconds])
  async function changeStatus(status: 'live' | 'finished') {
    if (!supabase || !canManage) return
    setSaving(true)
    const { error } = await supabase.from('matches').update({ status, period: 'first_half', is_paused: status === 'finished', elapsed_seconds: secondsRef.current, started_at: status === 'live' ? new Date().toISOString() : match.started_at }).eq('id', match.id)
    setSaving(false)
    if (error) return window.alert(error.message)
    window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
    window.location.reload()
  }
  async function transitionPeriod() {
    if (!supabase || !canManage || match.status !== 'live') return
    const currentPeriod = match.period || 'first_half'
    const isSecondHalf = currentPeriod === 'second_half'
    const isStartingSecond = Boolean(match.is_paused && isSecondHalf)
    const scoredEvents = events.reduce((score, event) => {
      if (event.team_id === match.local_team_id) score.local += event.points || 0
      if (event.team_id === match.visitor_team_id) score.visitor += event.points || 0
      return score
    }, { local: 0, visitor: 0 })
    const next = isStartingSecond
        ? { is_paused: false, started_at: new Date().toISOString(), elapsed_seconds: 0, second_half_seconds: 0, period: 'second_half' }
      : !isSecondHalf
        ? { is_paused: true, started_at: match.started_at, elapsed_seconds: secondsRef.current, first_half_seconds: secondsRef.current, period: 'second_half' }
        : { status: 'finished', is_paused: true, started_at: match.started_at, elapsed_seconds: secondsRef.current, second_half_seconds: secondsRef.current, period: 'second_half', local_score: scoredEvents.local, visitor_score: scoredEvents.visitor }
    const { error } = await supabase.from('matches').update(next).eq('id', match.id)
    if (error) return window.alert(error.message)
    window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
    window.location.reload()
  }
  async function togglePause() {
    if (!supabase || !canManage || match.status !== 'live') return
    const paused = !match.is_paused
    const { error } = await supabase.from('matches').update({ is_paused: paused, elapsed_seconds: secondsRef.current, started_at: paused ? match.started_at : new Date().toISOString() }).eq('id', match.id)
    if (error) return window.alert(error.message)
    window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
    window.location.reload()
  }
  async function recordEvent(teamId: string, playerId: string | null, eventType: 'try' | 'conversion' | 'yellow_card' | 'red_card' | 'injured' | 'concussion', points: number) {
    if (!supabase || !canManage || match.status !== 'live') return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    const newEvent = { match_id: match.id, team_id: teamId, player_id: playerId, event_type: eventType, points }
    const { error } = await supabase.from('match_events').insert({ ...newEvent, match_second: secondsRef.current, created_by: user.id })
    setSaving(false)
    if (error) return window.alert(error.message)
    if (eventType === 'try' || eventType === 'conversion') {
      const nextLocalScore = events.filter((event) => event.team_id === match.local_team_id).reduce((total, event) => total + (event.points || 0), 0) + (teamId === match.local_team_id ? points : 0)
      const nextVisitorScore = events.filter((event) => event.team_id === match.visitor_team_id).reduce((total, event) => total + (event.points || 0), 0) + (teamId === match.visitor_team_id ? points : 0)
      const { error: scoreError } = await supabase.from('matches').update({ local_score: nextLocalScore, visitor_score: nextVisitorScore }).eq('id', match.id)
      if (scoreError) return window.alert(scoreError.message)
    }
    setEvents((current) => [...current, newEvent])
    window.dispatchEvent(new CustomEvent('athlonx-tournament-updated'))
  }
  function confirmScoreAction() {
    if (!pendingScoreAction) return
    void recordEvent(pendingScoreAction.teamId, null, pendingScoreAction.label === 'Try' ? 'try' : 'conversion', pendingScoreAction.points)
    setPendingScoreAction(null)
  }
  const status = match.status === 'live' ? 'En vivo' : match.status === 'finished' ? 'Finalizado' : match.status === 'cancelled' ? 'Cancelado' : 'Programado'
  const points = events.reduce((total, event) => total + (event.points || 0), 0)
  const regularSeconds = Math.min(seconds, periodLimit)
  const stoppageSeconds = Math.max(0, seconds - periodLimit)
  const timer = `${String(Math.floor(regularSeconds / 60)).padStart(2, '0')}:${String(regularSeconds % 60).padStart(2, '0')}`
  const stoppageTimer = `+${String(Math.floor(stoppageSeconds / 60)).padStart(2, '0')}:${String(stoppageSeconds % 60).padStart(2, '0')}`
  const periodLabel = match.period === 'second_half' ? 'segundo tiempo' : 'primer tiempo'
  const firstHalfSummary = match.period === 'first_half' ? seconds : (match.first_half_seconds ?? 0)
  const firstHalfTimer = `${String(Math.floor(Math.min(firstHalfSummary, periodLimit) / 60)).padStart(2, '0')}:${String(Math.min(firstHalfSummary, periodLimit) % 60).padStart(2, '0')}`
  const firstHalfStoppage = `+${String(Math.floor(Math.max(0, firstHalfSummary - periodLimit) / 60)).padStart(2, '0')}:${String(Math.max(0, firstHalfSummary - periodLimit) % 60).padStart(2, '0')}`
  const secondHalfSummary = match.status === 'finished' ? (match.second_half_seconds ?? 0) : seconds
  const secondHalfTimer = `${String(Math.floor(Math.min(secondHalfSummary, periodLimit) / 60)).padStart(2, '0')}:${String(Math.min(secondHalfSummary, periodLimit) % 60).padStart(2, '0')}`
  const secondHalfStoppage = `+${String(Math.floor(Math.max(0, secondHalfSummary - periodLimit) / 60)).padStart(2, '0')}:${String(Math.max(0, secondHalfSummary - periodLimit) % 60).padStart(2, '0')}`
  const secondHalfLabel = match.period !== 'second_half' ? 'Pendiente' : match.status === 'finished' ? `${secondHalfTimer}${secondHalfSummary > periodLimit ? ` ${secondHalfStoppage}` : ''}` : match.is_paused ? 'Pendiente' : `${secondHalfTimer}${secondHalfSummary > periodLimit ? ` ${secondHalfStoppage}` : ''}`
  const periodActionClass = match.is_paused && match.period === 'second_half' ? 'rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]' : 'rounded-[5px] border border-[#ff7d88] px-4 py-3 text-sm font-bold text-[#ffb0b7]'
  const homePlayers = rosters.filter((player) => player.team_id === match.local_team_id)
  const awayPlayers = rosters.filter((player) => player.team_id === match.visitor_team_id)
  const statRows = [{ label: 'Tries', type: 'try' }, { label: 'Conversiones', type: 'conversion' }, { label: 'Tarjetas amarillas', type: 'yellow_card' }, { label: 'Tarjetas rojas', type: 'red_card' }]
  const count = (teamId: string | null, type: string) => events.filter((event) => event.team_id === teamId && event.event_type === type).length
  const localScore = events.filter((event) => event.team_id === match.local_team_id).reduce((total, event) => total + (event.points || 0), 0)
  const visitorScore = events.filter((event) => event.team_id === match.visitor_team_id).reduce((total, event) => total + (event.points || 0), 0)
  const scoreLabel = match.status === 'scheduled' ? 'VS' : `${localScore} - ${visitorScore}`
  return <article className="mt-5 rounded-[5px] border border-[#b4ff45]/40 bg-[#b4ff45]/5 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><span className={`rounded-[5px] px-3 py-1 text-xs font-bold uppercase ${match.status === 'live' ? 'bg-[#ff7d88] text-[#07131e]' : 'bg-[#b4ff45] text-[#07131e]'}`}>{status}</span><span className="text-xs text-slate-400">Fecha {match.date_number}{match.scheduled_time ? ` · ${match.scheduled_time.slice(0, 5)}` : ''}</span></div><div className="mt-5 text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-slate-400">Cronómetro</p><p className="mt-1 font-display text-4xl tracking-wider text-white">{timer}</p>{stoppageSeconds > 0 && <p className="mt-1 text-xl font-bold text-[#ff7d88]">{stoppageTimer}</p>}</div><div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-start gap-3 text-center"><div><TeamMatchName name={match.local_team_name} logo={match.local_logo_url} />{canManage && match.status === 'live' && <div className="mt-3 flex justify-center gap-2"><button type="button" disabled={saving} onClick={() => setPendingScoreAction({ teamId: match.local_team_id, label: 'Try', points: 5 })} className="rounded-[5px] border border-[#b4ff45]/60 px-3 py-1.5 text-xs font-bold text-[#dfffba]">Try</button><button type="button" disabled={saving} onClick={() => setPendingScoreAction({ teamId: match.local_team_id, label: 'Conversión', points: 2 })} className="rounded-[5px] border border-[#b4ff45]/60 px-3 py-1.5 text-xs font-bold text-[#dfffba]">Conversión</button></div>}</div><div><p className="font-display text-3xl text-[#b4ff45]">{scoreLabel}</p><p className="mt-2 text-xs text-slate-400">{events.length} eventos · {points} puntos registrados</p><div className="mt-2 text-xs text-slate-400"><p>1er tiempo: <span className="text-white">{firstHalfTimer}</span> {firstHalfSummary > periodLimit && <span className="text-[#ff7d88]">{firstHalfStoppage}</span>}</p><p className="mt-1">2do tiempo: <span className="text-white">{secondHalfLabel}</span></p></div></div><div><TeamMatchName name={match.visitor_team_name} logo={match.visitor_logo_url} />{canManage && match.status === 'live' && <div className="mt-3 flex justify-center gap-2"><button type="button" disabled={saving} onClick={() => setPendingScoreAction({ teamId: match.visitor_team_id, label: 'Try', points: 5 })} className="rounded-[5px] border border-[#b4ff45]/60 px-3 py-1.5 text-xs font-bold text-[#dfffba]">Try</button><button type="button" disabled={saving} onClick={() => setPendingScoreAction({ teamId: match.visitor_team_id, label: 'Conversión', points: 2 })} className="rounded-[5px] border border-[#b4ff45]/60 px-3 py-1.5 text-xs font-bold text-[#dfffba]">Conversión</button></div>}</div></div>{pendingScoreAction && <div className="mt-4 flex items-center justify-center gap-3 text-xs text-slate-300">Confirmar {pendingScoreAction.label}?<button type="button" disabled={saving} onClick={confirmScoreAction} className="rounded-[5px] bg-[#b4ff45] px-3 py-1 font-bold text-[#07131e]">Confirmar</button><button type="button" onClick={() => setPendingScoreAction(null)} className="rounded-[5px] border border-white/20 px-3 py-1">Cancelar</button></div>}{canManage && <div className="mt-6 flex flex-wrap justify-center gap-3">{match.status === 'scheduled' && <button type="button" disabled={saving} onClick={() => void changeStatus('live')} className="rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]">Iniciar primer tiempo</button>}{match.status === 'live' && <button type="button" disabled={saving} onClick={() => void transitionPeriod()} className={periodActionClass}>{match.is_paused && match.period === 'second_half' ? 'Iniciar segundo tiempo' : match.period === 'second_half' ? 'Finalizar segundo tiempo' : 'Finalizar primer tiempo'}</button>}</div>}<div className="mt-8 overflow-hidden rounded-[5px] border border-white/10 bg-[#07131e]"><div className="border-b border-white/10 px-4 py-3 text-center text-xs font-bold uppercase tracking-[.2em] text-slate-400">Estadísticas</div><div className="grid grid-cols-[1fr_1.5fr_1fr] bg-[#0d2637] px-4 py-3 text-center text-xs font-bold uppercase"><span>{match.local_team_name}</span><span></span><span>{match.visitor_team_name}</span></div>{statRows.map((row) => <div key={row.type} className="grid grid-cols-[1fr_1.5fr_1fr] border-t border-white/10 px-4 py-3 text-center text-sm"><span>{count(match.local_team_id, row.type)}</span><span className="text-slate-400">{row.label}</span><span>{count(match.visitor_team_id, row.type)}</span></div>)}</div><div className="mt-8 grid gap-5 lg:grid-cols-2"><MatchPlayersColumn title={match.local_team_name} players={homePlayers} teamId={match.local_team_id} events={events} canManage={canManage && match.status === 'live'} saving={saving} onRecord={recordEvent} /><MatchPlayersColumn title={match.visitor_team_name} players={awayPlayers} teamId={match.visitor_team_id} events={events} canManage={canManage && match.status === 'live'} saving={saving} onRecord={recordEvent} /></div></article>
}

function MatchPlayersColumn({ title, players, teamId, events, canManage, saving, onRecord }: { title: string; players: RosterEntry[]; teamId: string | null; events: MatchEvent[]; canManage: boolean; saving: boolean; onRecord: (teamId: string, playerId: string | null, eventType: 'try' | 'conversion' | 'yellow_card' | 'red_card' | 'injured' | 'concussion', points: number) => void }) {
  const [open, setOpen] = useState(true)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [pendingIndicator, setPendingIndicator] = useState<'yellow_card' | 'red_card' | 'injured' | 'concussion' | null>(null)
  const selectedPlayer = players.find((player) => player.player_id === selectedPlayerId)
  const confirmedIndicators = (playerId: string) => events.filter((event) => event.player_id === playerId && event.team_id === teamId).map((event) => event.event_type)
  const indicatorConfig = [{ type: 'yellow_card' as const, label: 'Tarjeta amarilla', icon: <Square size={16} fill="#facc15" className="text-yellow-400" /> }, { type: 'red_card' as const, label: 'Tarjeta roja', icon: <Square size={16} fill="#ef4444" className="text-red-500" /> }, { type: 'injured' as const, label: 'Jugador lesionado', icon: <HeartPulse size={17} className="text-rose-400" /> }, { type: 'concussion' as const, label: 'Conmoción cerebral', icon: <Brain size={17} className="text-cyan-300" /> }]
  return <section className="rounded-[5px] border border-[#29485d] bg-[#07131e] p-4"><button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left"><h3 className="text-sm font-bold uppercase tracking-wider text-[#b4ff45]">Jugadores · {title}</h3><ChevronDown size={18} className={`transition ${open ? 'rotate-180' : ''}`} /></button>{open && <div className="mt-3 space-y-2">{players.length ? players.map((player) => { const selected = selectedPlayerId === player.player_id; const indicators = confirmedIndicators(player.player_id); return <div key={player.player_id} className={`rounded-[5px] border px-3 py-2 ${selected ? 'border-[#b4ff45] bg-[#b4ff45]/10' : 'border-white/10'}`}><button type="button" onClick={() => { setSelectedPlayerId(selected ? null : player.player_id); setPendingIndicator(null) }} className="flex w-full items-center gap-2 text-left"><span className="text-sm font-semibold">{player.full_name}</span><span className="text-xs text-slate-400">#{player.shirt_number ?? '--'}</span><span className="ml-auto flex items-center gap-1">{indicators.includes('yellow_card') && <Square size={15} fill="#facc15" className="text-yellow-400" />}{indicators.includes('red_card') && <Square size={15} fill="#ef4444" className="text-red-500" />}{indicators.includes('injured') && <HeartPulse size={16} className="text-rose-400" />}{indicators.includes('concussion') && <Brain size={16} className="text-cyan-300" />}</span></button>{selected && canManage && teamId && <div className="mt-3 border-t border-white/10 pt-3"><div className="flex flex-wrap gap-2">{indicatorConfig.map((indicator) => <button key={indicator.type} type="button" onClick={() => setPendingIndicator(indicator.type)} className="inline-flex items-center gap-1 rounded-[5px] border border-[#31556b] px-2 py-1 text-xs text-slate-200 hover:border-[#b4ff45]">{indicator.icon}{indicator.label}</button>)}</div>{pendingIndicator && <div className="mt-3 flex items-center justify-between gap-3 rounded-[5px] bg-[#0d2637] p-3 text-xs"><span>¿Confirmar {indicatorConfig.find((item) => item.type === pendingIndicator)?.label.toLowerCase()}?</span><div className="flex gap-2"><button type="button" onClick={() => setPendingIndicator(null)} className="rounded-[5px] border border-white/20 px-2 py-1">Cancelar</button><button type="button" disabled={saving} onClick={() => { onRecord(teamId, player.player_id, pendingIndicator, 0); setPendingIndicator(null) }} className="rounded-[5px] bg-[#b4ff45] px-2 py-1 font-bold text-[#07131e]">Confirmar</button></div></div>}</div>}</div> }) : <p className="text-sm text-slate-500">No hay jugadores registrados.</p>}</div>}</section>
}

function MatchCard({ match, selected, onPreview }: { match: Match; selected: boolean; onPreview: () => void }) {
  const status = match.status === 'finished' ? 'Finalizado' : match.status === 'live' ? 'En vivo' : match.status === 'cancelled' ? 'Cancelado' : 'Programado'
  return <article className={`rounded-[5px] border p-5 ${selected ? 'border-[#b4ff45] bg-[#b4ff45]/5' : 'border-[#29485d] bg-[#07131e]'}`}><div className="flex items-center justify-between gap-3 text-xs text-slate-500"><span>{match.division_name || 'Sin división'}</span><span className="inline-flex items-center gap-1">{match.scheduled_time ? <><Clock3 size={13} />{match.scheduled_time.slice(0, 5)}</> : 'Horario pendiente'}</span></div><div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center"><TeamMatchName name={match.local_team_name} logo={match.local_logo_url} /><div><p className="font-display text-2xl text-[#b4ff45]">{match.status === 'scheduled' ? 'VS' : `${match.local_score} - ${match.visitor_score}`}</p><p className={`mt-1 text-[10px] uppercase tracking-wider ${statusTone(match.status)}`}>{status}</p></div><TeamMatchName name={match.visitor_team_name} logo={match.visitor_logo_url} /></div><button type="button" onClick={onPreview} className="mt-5 w-full rounded-[5px] border border-[#b4ff45]/60 px-3 py-2 text-xs font-bold text-[#dfffba] hover:bg-[#b4ff45]/10">{selected ? 'Vista previa seleccionada' : 'Vista previa'}</button></article>
}

function getFeaturedMatch(matches: Match[]) {
  return matches.find((match) => match.status === 'live') || [...matches].filter((match) => match.status === 'finished').sort((a, b) => b.date_number - a.date_number).at(0) || [...matches].filter((match) => match.status === 'scheduled').sort((a, b) => a.date_number - b.date_number).at(0) || null
}

function statusTone(status: string) {
  if (status === 'finished') return 'text-[#ff7d88]'
  if (status === 'live') return 'text-[#b4ff45]'
  return 'text-slate-500'
}

function TeamMatchName({ name, logo }: { name: string; logo: string | null }) { return <div className="min-w-0"><div className="mx-auto flex h-11 w-11 items-center justify-center overflow-hidden rounded-[5px] bg-[#b4ff45]/15 font-bold text-[#b4ff45]">{logo ? <img src={logo} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}</div><p className="mt-2 truncate text-sm font-bold">{name || 'Equipo pendiente'}</p></div> }

function EditHistorySection({ history }: { history: EditHistory[] }) {
  const labels: Record<string, string> = { name: 'Nombre', season: 'Temporada', status: 'Estado', start_date: 'Fecha inicial', end_date: 'Fecha final', country: 'País', location: 'Ciudad', discipline_id: 'Disciplina', modality_id: 'Modalidad' }
  return <section className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-8"><div className="flex items-center gap-3 border-b border-white/10 pb-5"><Clock3 className="text-[#b4ff45]" size={20} /><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Transparencia</p><h2 className="mt-1 font-display text-2xl uppercase">Historial de ediciones</h2></div></div>{history.length ? <div className="mt-6 space-y-4">{history.map((entry) => <article key={entry.id} className="rounded-[5px] border border-[#29485d] bg-[#07131e] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-white">Torneo actualizado</p><time className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString('es-PA', { dateStyle: 'medium', timeStyle: 'short' })}</time></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(entry.changes).map(([field, change]) => <div key={field} className="rounded-[5px] border border-white/10 p-3 text-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{labels[field] || field}</p><p className="mt-1 text-slate-300"><span className="text-slate-500">{change.before || 'Sin valor'}</span><span className="mx-2 text-[#b4ff45]">→</span><span className="font-semibold text-white">{change.after || 'Sin valor'}</span></p></div>)}</div></article>)}</div> : <p className="mt-6 text-sm text-slate-400">Todavía no se han registrado ediciones.</p>}</section>
}

function GeneralInfoSection({ tournament, divisions, disciplines, modalities, canManage, editMode, onRequestSave, onDirtyChange, onCancel, onEdit }: { tournament: Tournament; divisions: Division[]; disciplines: Discipline[]; modalities: Modality[]; canManage: boolean; editMode: boolean; onRequestSave: (values: EditValues, divisionNames: string[]) => void; onDirtyChange: (dirty: boolean) => void; onCancel: () => void; onEdit: () => void }) {
  return <section className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Configuración</p><h2 className="mt-1 font-display text-3xl uppercase">Información general</h2><p className="mt-2 text-sm text-slate-400">Datos oficiales del torneo, sus divisiones y su organización responsable.</p></div>{canManage && !editMode && <button type="button" onClick={onEdit} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]"><Cog size={17} />Editar torneo</button>}</div>{editMode && canManage ? <EditTournamentForm tournament={tournament} divisions={divisions} disciplines={disciplines} modalities={modalities} onRequestSave={onRequestSave} onDirtyChange={onDirtyChange} onCancel={onCancel} /> : <><div className="mt-6 grid gap-3 sm:grid-cols-2"><InfoRow label="Nombre del torneo" value={tournament.name} /><InfoRow label="Código AthlonX" value={tournament.athlonx_code || 'Pendiente'} /><InfoRow label="Estado" value={statusNames[tournament.status] || tournament.status} /><InfoRow label="Temporada" value={tournament.season || 'Pendiente'} /><InfoRow label="Disciplina" value={tournament.discipline?.name || 'No especificada'} /><InfoRow label="Modalidad" value={tournament.modality?.name || 'No especificada'} /><InfoRow label="Ubicación" value={[tournament.country, tournament.location].filter(Boolean).join(' · ') || 'Pendiente'} /><InfoRow label="Fechas" value={formatDateRange(tournament.start_date, tournament.end_date)} /></div><TournamentDivisionsSummary divisions={divisions} /></>}</section>
}

function TournamentDivisionsSummary({ divisions }: { divisions: Division[] }) {
  return <div className="mt-8 border-t border-white/10 pt-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Categorías del torneo</p><h3 className="mt-1 font-display text-2xl uppercase">Divisiones participantes</h3><p className="mt-2 text-sm text-slate-400">Los equipos solo podrán inscribirse en una división compatible con su catálogo.</p></div><span className="rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300">{divisions.length} divisiones</span></div><div className="mt-5 flex flex-wrap gap-2">{divisions.map((division) => <span key={division.id} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-3 py-2 text-sm text-slate-200">{division.name}</span>)}{!divisions.length && <p className="text-sm text-slate-500">Todavía no hay divisiones configuradas.</p>}</div></div>
}

function EditTournamentForm({ tournament, divisions, disciplines, modalities, onRequestSave, onDirtyChange, onCancel }: { tournament: Tournament; divisions: Division[]; disciplines: Discipline[]; modalities: Modality[]; onRequestSave: (values: EditValues, divisionNames: string[]) => void; onDirtyChange: (dirty: boolean) => void; onCancel: () => void }) {
  const [values, setValues] = useState<EditValues>({ name: tournament.name, season: tournament.season || '', status: tournament.status, start_date: tournament.start_date || '', end_date: tournament.end_date || '', country: tournament.country || 'Panamá', location: tournament.location || '', discipline_id: tournament.discipline?.id || '', modality_id: tournament.modality?.id || '' })
  const [divisionToAdd, setDivisionToAdd] = useState('')
  const [selectedDivisionNames, setSelectedDivisionNames] = useState(() => divisions.map((division) => division.name))
  const availableModalities = modalities.filter((modality) => !values.discipline_id || modality.discipline_id === values.discipline_id)
  const divisionOptions = Array.from(new Set([...defaultDivisionOptions, ...divisions.map((division) => division.name)]))
  useEffect(() => { const original = { name: tournament.name, season: tournament.season || '', status: tournament.status, start_date: tournament.start_date || '', end_date: tournament.end_date || '', country: tournament.country || 'Panamá', location: tournament.location || '', discipline_id: tournament.discipline?.id || '', modality_id: tournament.modality?.id || '' }; const fieldsChanged = Object.keys(original).some((key) => original[key as keyof EditValues] !== values[key as keyof EditValues]); const originalDivisions = divisions.map((division) => division.name); const divisionsChanged = originalDivisions.length !== selectedDivisionNames.length || originalDivisions.some((name, index) => normalizeDivisionName(name) !== normalizeDivisionName(selectedDivisionNames[index] || '')); onDirtyChange(fieldsChanged || divisionsChanged) }, [values, selectedDivisionNames, tournament, divisions, onDirtyChange])
  function addDivision() { const cleanName = divisionToAdd.trim(); if (!cleanName || selectedDivisionNames.some((name) => normalizeDivisionName(name) === normalizeDivisionName(cleanName))) return; setSelectedDivisionNames([...selectedDivisionNames, cleanName]); setDivisionToAdd('') }
  return <form id="edit-tournament-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onRequestSave(values, selectedDivisionNames) }} className="mt-6"><div className="flex items-center gap-2 rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/10 p-3 text-sm text-[#dfffba]"><ShieldCheck size={17} />Los cambios se mostrarán antes de solicitar la contraseña.</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold sm:col-span-2">Nombre del torneo<input required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label><label className="block text-sm font-semibold">Temporada<input value={values.season} onChange={(event) => setValues({ ...values, season: event.target.value })} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label><StyledSelect label="Estado" value={values.status} onChange={(status) => setValues({ ...values, status })} options={statusOptions} required /><StyledSelect label="Disciplina" value={values.discipline_id} onChange={(discipline_id) => setValues({ ...values, discipline_id, modality_id: '' })} options={disciplines.map((discipline) => ({ value: discipline.id, label: discipline.name }))} required /><StyledSelect label="Modalidad" value={values.modality_id} onChange={(modality_id) => setValues({ ...values, modality_id })} options={availableModalities.map((modality) => ({ value: modality.id, label: modality.name }))} disabled={!availableModalities.length} required /><LocationFields country={values.country} city={values.location} onCountryChange={(country) => setValues({ ...values, country })} onCityChange={(location) => setValues({ ...values, location })} className="sm:col-span-2" /><label className="block text-sm font-semibold">Fecha inicial<input required type="date" value={values.start_date} onChange={(event) => setValues({ ...values, start_date: event.target.value })} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label><label className="block text-sm font-semibold">Fecha final<input required type="date" value={values.end_date} onChange={(event) => setValues({ ...values, end_date: event.target.value })} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label><div className="rounded-[5px] border border-[#31556b] bg-[#0d2232] p-4 sm:col-span-2"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Categorías del torneo</p><h3 className="mt-1 font-display text-2xl uppercase">Divisiones participantes</h3><p className="mt-2 text-sm text-slate-400">Selecciona las divisiones que podrán inscribirse en este torneo.</p></div><span className="rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300">{selectedDivisionNames.length} divisiones</span></div><div className="mt-4 flex flex-col gap-3 sm:flex-row"><select value={divisionToAdd} onChange={(event) => setDivisionToAdd(event.target.value)} className="min-w-0 flex-1 cursor-pointer rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-4 py-3 outline-none focus:border-[#b4ff45]"><option value="">Seleccionar división</option>{divisionOptions.filter((name) => !selectedDivisionNames.some((selected) => normalizeDivisionName(selected) === normalizeDivisionName(name))).map((name) => <option key={name} value={name}>{name}</option>)}</select><button type="button" onClick={addDivision} disabled={!divisionToAdd} className="cursor-pointer rounded-[5px] bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50">Agregar división</button></div><div className="mt-4 flex flex-wrap gap-2">{selectedDivisionNames.map((name) => <span key={name} className="inline-flex items-center gap-2 rounded-[5px] border border-[#31556b] bg-[#07131e] px-3 py-2 text-sm text-slate-200">{name}<button type="button" onClick={() => setSelectedDivisionNames(selectedDivisionNames.filter((current) => current !== name))} className="cursor-pointer text-[#ff9ca5]" aria-label={`Quitar división ${name}`}><X size={15} /></button></span>)}{!selectedDivisionNames.length && <p className="text-sm text-slate-500">No hay divisiones seleccionadas.</p>}</div></div></div><div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-5"><button type="button" onClick={onCancel} className="cursor-pointer rounded-[5px] border border-[#31556b] px-5 py-3 font-bold text-slate-300 hover:border-white hover:text-white">Cancelar edición</button><button type="submit" className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e]"><Check size={17} />Guardar cambios</button></div></form>
}

function EditConfirmationOverlay({ title = 'Guardar cambios', changes, onCancel, onConfirm, message }: { title?: string; changes: Record<string, PendingChange>; onCancel: () => void; onConfirm: (password: string) => void; message: string }) {
  const [password, setPassword] = useState('')
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#02070c]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="confirm-tournament-changes"><div className="my-8 w-full max-w-xl rounded-[5px] border border-[#31556b] bg-[#0b1d2c] p-5 text-white shadow-2xl sm:p-7"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[5px] bg-[#b4ff45]/15 text-[#b4ff45]"><LockKeyhole size={21} /></div><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Confirmación segura</p><h2 id="confirm-tournament-changes" className="mt-1 font-display text-2xl uppercase">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">Revisa la acción. La contraseña confirma y registra esta operación.</p></div></div><div className="mt-6 space-y-2">{Object.values(changes).map((change) => <div key={change.label} className="rounded-[5px] border border-white/10 bg-[#07131e] p-3"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{change.label}</p><p className="mt-1 text-sm"><span className="text-slate-500">{change.before}</span><span className="mx-2 text-[#b4ff45]">→</span><span className="font-bold text-white">{change.after}</span></p></div>)}</div><label className="mt-6 block text-sm font-semibold">Contraseña de la cuenta<input autoFocus required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" placeholder="Escribe tu contraseña" /></label>{message && <p role="alert" className="mt-4 rounded-[5px] border border-[#ff7d88]/30 bg-[#ff7d88]/10 p-3 text-sm text-[#ffb0b7]">{message}</p>}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="cursor-pointer rounded-[5px] border border-[#31556b] px-5 py-3 font-bold text-slate-300 hover:border-white hover:text-white">Cancelar</button><button type="button" onClick={() => void onConfirm(password)} disabled={!password} className="cursor-pointer rounded-[5px] bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50">Confirmar y guardar</button></div></div></div>
}

function UnsavedChangesOverlay({ onCancel, onDiscard, onSave }: { onCancel: () => void; onDiscard: () => void; onSave: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02070c]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-[5px] border border-[#31556b] bg-[#0b1d2c] p-6 text-white shadow-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Cambios sin guardar</p><h2 className="mt-2 font-display text-2xl uppercase">¿Cambiar de sección?</h2><p className="mt-3 text-sm leading-6 text-slate-400">Todavía tienes cambios pendientes. Puedes confirmarlos con tu contraseña o descartarlos antes de continuar.</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="rounded-[5px] border border-[#31556b] px-4 py-3 text-sm font-bold text-slate-300">Seguir editando</button><button type="button" onClick={onDiscard} className="rounded-[5px] border border-[#ff7d88]/50 px-4 py-3 text-sm font-bold text-[#ff9ca5]">Descartar</button><button type="button" onClick={onSave} className="rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]">Confirmar cambio</button></div></div></div>
}

function PlayerNumberRequestModal({ request, onCancel, onSubmit }: { request: { playerName: string; currentNumber: number | null }; onCancel: () => void; onSubmit: (number: number) => void }) {
  const [number, setNumber] = useState(String(request.currentNumber ?? ''))
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02070c]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true"><form onSubmit={(event) => { event.preventDefault(); onSubmit(Number(number)) }} className="w-full max-w-md rounded-[5px] border border-[#31556b] bg-[#0b1d2c] p-6 text-white shadow-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Solicitud de plantilla</p><h2 className="mt-2 font-display text-2xl uppercase">Cambiar número</h2><p className="mt-3 text-sm leading-6 text-slate-400">La solicitud de <strong className="text-white">{request.playerName}</strong> será enviada al equipo para su aprobación.</p><label className="mt-6 block text-sm font-semibold">Nuevo número<input required min="0" max="99" type="number" value={number} onChange={(event) => setNumber(event.target.value)} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-[5px] border border-[#31556b] px-4 py-3 text-sm font-bold text-slate-300">Cancelar</button><button type="submit" className="rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]">Enviar solicitud</button></div></form></div>
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) { return <div className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-5"><div className="flex items-center justify-between gap-3 text-[#b4ff45]"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{title}</p>{icon}</div><p className="mt-3 font-display text-4xl">{value}</p></div> }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="rounded-[5px] border border-[#29485d] bg-[#07131e] p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">{label}</p><p className="mt-2 font-semibold text-white">{value}</p></div> }
function TournamentShell({ children }: { children: React.ReactNode }) { return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10"><div className="mx-auto max-w-6xl">{children}</div></main> }
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
function formatDateRange(start: string | null, end: string | null) { if (!start && !end) return 'Fechas por definir'; const format = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Por definir'; return start && end ? `${format(start)} - ${format(end)}` : format(start || end) }
function formatEditValue(field: keyof EditValues, value: string, disciplines: Discipline[], modalities: Modality[]) { if (!value) return 'Sin valor'; if (field === 'status') return statusNames[value] || value; if (field === 'discipline_id') return disciplines.find((discipline) => discipline.id === value)?.name || value; if (field === 'modality_id') return modalities.find((modality) => modality.id === value)?.name || value; return value }

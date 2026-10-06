'use client'

import { Check, Clock3, FileDown, LockKeyhole, RotateCcw, Save, Search, Send, UserPlus, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { StyledSelect } from './styled-select'
import { PlayerRoleIcon } from './player-role-icon'

type TournamentTeam = { id: string; name: string; division_id: string; division_name: string }
type Division = { id: string; name: string }
type TournamentMatch = { id: string; fixture_id: string; date_number: number; calendar_date: string | null; scheduled_time: string | null; division_name: string | null; local_team_id: string; local_team_name: string; visitor_team_id: string; visitor_team_name: string }
type FixtureDate = { fixtureId: string; dateNumber: number; calendarDate: string | null; callupDeadlineAt: string | null; matches: TournamentMatch[] }
type RosterEntry = { team_id: string; division_id: string | null; division_name?: string | null; player_id: string; full_name: string; shirt_number: number | null; position: string | null }
type CallupRule = { tournament_id: string; max_players: number; active_players: number; inactive_players: number; lock_hours_before: number }
type Callup = { id: string; tournament_id: string; fixture_id: string; team_id: string; division_id: string; status: string; deadline_at: string; submitted_at: string | null; non_participant_player_id: string | null; reopen_reason: string | null }
type CallupPlayer = { callup_id: string; player_id: string; state: 'convocado' | 'no_participante' | 'no_convocado'; shirt_number: number | null }
type TeamStaff = { user_id: string; full_name: string; role: 'entrenador' | 'staff'; role_label: string | null }
type PendingSelection = { kind: 'date' | 'division'; value: string }

const defaultRule: CallupRule = { tournament_id: '', max_players: 13, active_players: 12, inactive_players: 1, lock_hours_before: 24 }
const statusLabels: Record<string, string> = { pending: 'Pendiente', editing: 'En edición', submitted: 'Enviada', locked: 'Bloqueada', reopened: 'Reabierta' }

function normalizeDivisionName(value: string | null | undefined) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  const rightSet = new Set(right)
  return left.every((id) => rightSet.has(id))
}

function formatDeadline(value: string) {
  return new Intl.DateTimeFormat('es-PA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function toDateTimeLocal(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60 * 1000)
  return localDate.toISOString().slice(0, 16)
}

function formatFixtureDate(fixture: FixtureDate) {
  const date = fixture.calendarDate ? new Intl.DateTimeFormat('es-PA', { day: 'numeric', month: 'short' }).format(new Date(`${fixture.calendarDate}T12:00:00`)) : `Fecha ${fixture.dateNumber}`
  return `${date} · ${fixture.matches.length} partido${fixture.matches.length === 1 ? '' : 's'}`
}

function displayStatus(callup: Callup | undefined) {
  if (!callup) return 'Pendiente'
  if (callup.status !== 'reopened' && callup.status !== 'locked' && new Date(callup.deadline_at).getTime() <= Date.now()) return 'Bloqueada'
  return statusLabels[callup.status] || callup.status
}

function getFixtureDeadline(fixture: FixtureDate | null, tournamentStartDate: string | null | undefined, lockHours: number, override?: string | null) {
  if (!fixture) return null
  if (override) return override
  const date = fixture.calendarDate || tournamentStartDate
  if (!date) return null
  const times = fixture.matches.map((match) => match.scheduled_time).filter((time): time is string => Boolean(time)).sort()
  const deadline = new Date(`${date}T${(times[0] || '23:59:59').slice(0, 8)}`)
  if (Number.isNaN(deadline.getTime())) return null
  return new Date(deadline.getTime() - lockHours * 60 * 60 * 1000).toISOString()
}

function useCountdown(deadline: string | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!deadline) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [deadline])
  const remaining = deadline ? Math.max(0, new Date(deadline).getTime() - now) : null
  return { remaining, expired: remaining !== null && remaining <= 0 }
}

function formatCountdown(remaining: number | null) {
  if (remaining === null) return '--:--:--'
  const totalSeconds = Math.floor(remaining / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${days > 0 ? `${days}d ` : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function CountdownCard({ deadline, label = 'Tiempo restante para editar' }: { deadline: string | null; label?: string }) {
  const { remaining, expired } = useCountdown(deadline)
  return <div className={`rounded-[5px] border p-5 sm:p-6 ${expired ? 'border-red-400/40 bg-red-400/10' : 'border-[#b4ff45]/40 bg-[#b4ff45]/10'}`}><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">{label}</p><p className={`mt-2 font-display text-4xl tracking-wider sm:text-5xl ${expired ? 'text-red-200' : 'text-white'}`}>{expired ? 'LISTA BLOQUEADA' : formatCountdown(remaining)}</p><p className="mt-2 text-sm text-slate-300">{deadline ? `Cierre exacto: ${new Intl.DateTimeFormat('es-PA', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(deadline))}` : 'La hora de cierre aparecerá cuando la fecha tenga calendario configurado.'}</p></div>
}

export function TournamentCallupsPanel({ tournamentId, divisions: _divisions, teams, matches, rosters, isOwner, initialMatchId, initialTeamId, readOnly = false, managedTeamId, tournamentStartDate }: { tournamentId: string; divisions: Division[]; teams: TournamentTeam[]; matches: TournamentMatch[]; rosters: RosterEntry[]; isOwner: boolean; initialMatchId?: string; initialTeamId?: string; readOnly?: boolean; managedTeamId?: string; tournamentStartDate?: string | null }) {
  const fixtureDates = useMemo<FixtureDate[]>(() => {
    const grouped = new Map<string, FixtureDate>()
    matches.forEach((match) => {
      const current = grouped.get(match.fixture_id) || { fixtureId: match.fixture_id, dateNumber: match.date_number, calendarDate: match.calendar_date, callupDeadlineAt: null, matches: [] }
      current.matches.push(match)
      grouped.set(match.fixture_id, current)
    })
    return [...grouped.values()].sort((left, right) => left.dateNumber - right.dateNumber)
  }, [matches])
  const initialFixture = fixtureDates.find((fixture) => fixture.matches.some((match) => match.id === initialMatchId)) || fixtureDates[0]
  const [rule, setRule] = useState<CallupRule>({ ...defaultRule, tournament_id: tournamentId })
  const [callups, setCallups] = useState<Callup[]>([])
  const [callupPlayers, setCallupPlayers] = useState<CallupPlayer[]>([])
  const [teamStaff, setTeamStaff] = useState<TeamStaff[]>([])
  const [tournamentName, setTournamentName] = useState('AthlonX')
  const [manageableTeamIds, setManageableTeamIds] = useState<string[]>([])
  const [staffTeamIds, setStaffTeamIds] = useState<string[]>([])
  const [isTournamentCreator, setIsTournamentCreator] = useState(false)
  const [selectedDateNumber, setSelectedDateNumber] = useState(initialFixture?.dateNumber || 0)
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId || '')
  const [selectedDivisionId, setSelectedDivisionId] = useState('')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [playerShirtNumbers, setPlayerShirtNumbers] = useState<Record<string, string>>({})
  const [inactivePlayerId, setInactivePlayerId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [fixtureDeadlines, setFixtureDeadlines] = useState<Record<string, string | null>>({})
  const [deadlineDraft, setDeadlineDraft] = useState('')
  const [deadlineSaving, setDeadlineSaving] = useState(false)
  const [editingList, setEditingList] = useState(false)
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null)
  // The organizer-only controls must be based on the persisted tournament creator,
  // not on a permission hint passed by a parent view.
  const canManageTournament = Boolean(isOwner && isTournamentCreator)
  const viewOnly = readOnly || (!managedTeamId && !canManageTournament)
  const canManageDeadline = Boolean(canManageTournament && !managedTeamId && !readOnly)

  const selectedFixture = fixtureDates.find((fixture) => fixture.dateNumber === selectedDateNumber) || fixtureDates[0] || null
  const dateTeamIds = selectedFixture ? Array.from(new Set(selectedFixture.matches.flatMap((match) => [match.local_team_id, match.visitor_team_id]))) : []
  const dateTeams = dateTeamIds.flatMap((teamId) => teams.filter((team) => team.id === teamId))
  const visibleTeams = (canManageTournament ? dateTeams : dateTeams.filter((team) => manageableTeamIds.includes(team.id))).filter((team) => !managedTeamId || team.id === managedTeamId)
  const selectedTeam = visibleTeams.find((team) => team.id === selectedTeamId && (!selectedDivisionId || team.division_id === selectedDivisionId)) || visibleTeams[0] || null
  const selectedCallup = callups.find((callup) => callup.fixture_id === selectedFixture?.fixtureId && callup.team_id === selectedTeam?.id && callup.division_id === selectedTeam?.division_id)
  const calculatedDeadline = getFixtureDeadline(selectedFixture, tournamentStartDate, rule.lock_hours_before, selectedFixture ? fixtureDeadlines[selectedFixture.fixtureId] : null)
  const fixtureDeadline = (selectedFixture ? fixtureDeadlines[selectedFixture.fixtureId] : null) || callups.filter((callup) => callup.fixture_id === selectedFixture?.fixtureId && (!selectedTeam || callup.team_id === selectedTeam.id) && (!selectedTeam || callup.division_id === selectedTeam.division_id)).map((callup) => callup.deadline_at).sort()[0] || calculatedDeadline
  const eligiblePlayers = selectedTeam ? rosters.filter((player) => player.team_id === selectedTeam.id && (player.division_id === selectedTeam.division_id || normalizeDivisionName(player.division_name) === normalizeDivisionName(selectedTeam.division_name))) : []
  const isBeforeDeadline = !fixtureDeadline || new Date(fixtureDeadline).getTime() > Date.now() || selectedCallup?.status === 'reopened'
  const canManagePlayers = Boolean(selectedTeam && (canManageTournament || manageableTeamIds.includes(selectedTeam.id)) && isBeforeDeadline)
  const canEditSelection = Boolean(canManagePlayers && (!selectedCallup || selectedCallup.status !== 'submitted' || editingList))
  const canSubmit = Boolean(canEditSelection && (!selectedCallup || selectedCallup.status !== 'submitted'))
  const savedPlayerIds = callupPlayers.filter((player) => player.callup_id === selectedCallup?.id && player.state !== 'no_participante').map((player) => player.player_id)
  const savedPlayerShirtNumbers = Object.fromEntries(callupPlayers.filter((player) => player.callup_id === selectedCallup?.id && player.state !== 'no_participante' && player.shirt_number !== null).map((player) => [player.player_id, String(player.shirt_number)]))
  const hasUnsavedShirtNumbers = selectedPlayerIds.some((playerId) => (playerShirtNumbers[playerId] || '') !== (savedPlayerShirtNumbers[playerId] || ''))
  const hasUnsavedChanges = Boolean(canManagePlayers && (!sameIds(selectedPlayerIds, savedPlayerIds) || hasUnsavedShirtNumbers))
  const canMarkInactive = Boolean(selectedCallup && selectedTeam && (canManageTournament || staffTeamIds.includes(selectedTeam.id)) && selectedPlayerIds.length === rule.max_players && selectedCallup.status !== 'locked' && fixtureDeadline && (new Date(fixtureDeadline).getTime() <= Date.now() || selectedCallup.status === 'reopened'))
  const counts = useMemo(() => callups.reduce((summary, callup) => { const status = displayStatus(callup); if (status === 'Enviada') summary.submitted += 1; else if (status === 'Bloqueada') summary.locked += 1; else if (status === 'En edición' || status === 'Reabierta') summary.editing += 1; else summary.pending += 1; return summary }, { pending: 0, editing: 0, submitted: 0, locked: 0 }), [callups])

  async function loadCallups() {
    if (!supabase) return
    setLoading(true)
    setIsTournamentCreator(false)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setError('Debes iniciar sesión para consultar convocatorias.'); setLoading(false); return }
    const [ruleResult, callupResult, membershipResult, fixtureResult, tournamentResult] = await Promise.all([
      supabase.from('tournament_callup_rules').select('tournament_id, max_players, active_players, inactive_players, lock_hours_before').eq('tournament_id', tournamentId).maybeSingle(),
      supabase.from('tournament_fixture_callups').select('id, tournament_id, fixture_id, team_id, division_id, status, deadline_at, submitted_at, non_participant_player_id, reopen_reason').eq('tournament_id', tournamentId),
      supabase.from('team_user_memberships').select('team_id, role').eq('user_id', userData.user.id).eq('status', 'active').in('role', ['owner', 'directivo', 'entrenador', 'staff']),
      supabase.from('fixtures').select('id, callup_deadline_at').eq('tournament_id', tournamentId),
      supabase.from('tournaments').select('created_by, name').eq('id', tournamentId).maybeSingle(),
    ])
    const callupIds = (callupResult.data ?? []).map((callup) => callup.id)
    const playerResult = callupIds.length ? await supabase.from('tournament_fixture_callup_players').select('callup_id, player_id, state, shirt_number').in('callup_id', callupIds) : { data: [], error: null }
    if (ruleResult.error || callupResult.error || playerResult.error || fixtureResult.error) { setError(ruleResult.error?.message || callupResult.error?.message || playerResult.error?.message || fixtureResult.error?.message || 'No se pudieron cargar las convocatorias.'); setLoading(false); return }
    const nextRule = (ruleResult.data as CallupRule | null) || { ...defaultRule, tournament_id: tournamentId }
    setRule(nextRule)
    setCallups((callupResult.data ?? []) as Callup[])
    setCallupPlayers((playerResult.data ?? []) as CallupPlayer[])
    setTournamentName(tournamentResult.data?.name || 'AthlonX')
    setFixtureDeadlines(Object.fromEntries((fixtureResult.data ?? []).map((fixture) => [fixture.id, fixture.callup_deadline_at || null])))
    setManageableTeamIds((membershipResult.data ?? []).map((membership) => membership.team_id))
    setStaffTeamIds((membershipResult.data ?? []).filter((membership) => membership.role === 'staff').map((membership) => membership.team_id))
    setIsTournamentCreator(!tournamentResult.error && tournamentResult.data?.created_by === userData.user.id)
    setError('')
    setLoading(false)
  }

  useEffect(() => { void loadCallups() }, [tournamentId])

  // Carga el cuerpo técnico activo del equipo seleccionado para la lista oficial.
  useEffect(() => {
    let active = true

    async function loadTeamStaff() {
      if (!supabase || !selectedTeam?.id) {
        setTeamStaff([])
        return
      }
      const { data: members } = await supabase.rpc('get_team_members_for_manager', {
        p_team_id: selectedTeam.id,
      })
      if (!active) return
      setTeamStaff((members ?? []).filter((member) => (
        member.role === 'entrenador' || member.role === 'staff'
      )).map((member) => ({
        user_id: member.user_id,
        full_name: member.full_name || 'Perfil sin nombre',
        role: member.role as TeamStaff['role'],
        role_label: member.role_label,
      })))
    }

    void loadTeamStaff()
    return () => { active = false }
  }, [selectedTeam?.id])

  useEffect(() => {
    const nextFixture = fixtureDates.find((fixture) => fixture.matches.some((match) => match.id === initialMatchId))
    if (nextFixture && selectedDateNumber !== nextFixture.dateNumber) setSelectedDateNumber(nextFixture.dateNumber)
    if (!selectedFixture && fixtureDates[0]) setSelectedDateNumber(fixtureDates[0].dateNumber)
  }, [fixtureDates, initialMatchId, selectedDateNumber, selectedFixture])

  useEffect(() => {
    const current = visibleTeams.find((team) => team.id === selectedTeamId && team.division_id === selectedDivisionId)
    if (!current) {
      setSelectedTeamId(visibleTeams[0]?.id || '')
      setSelectedDivisionId(visibleTeams[0]?.division_id || '')
    }
  }, [selectedDivisionId, selectedTeamId, visibleTeams])

  useEffect(() => {
    const current = callups.find((callup) => callup.fixture_id === selectedFixture?.fixtureId && callup.team_id === selectedTeam?.id && callup.division_id === selectedTeam?.division_id)
    const currentPlayers = callupPlayers.filter((player) => player.callup_id === current?.id && player.state !== 'no_participante')
    setSelectedPlayerIds(currentPlayers.map((player) => player.player_id))
    setPlayerShirtNumbers(Object.fromEntries(currentPlayers.filter((player) => player.shirt_number !== null).map((player) => [player.player_id, String(player.shirt_number)])))
    setInactivePlayerId(current?.non_participant_player_id || '')
  }, [callupPlayers, callups, selectedFixture?.fixtureId, selectedTeam?.division_id, selectedTeam?.id])

  useEffect(() => {
    setDeadlineDraft(fixtureDeadline ? toDateTimeLocal(fixtureDeadline) : '')
  }, [fixtureDeadline, selectedFixture?.fixtureId])

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  function applyPendingSelection(selection: PendingSelection) {
    if (selection.kind === 'date') setSelectedDateNumber(Number(selection.value))
    else setSelectedDivisionId(selection.value)
    setPendingSelection(null)
    setEditingList(false)
  }

  function requestSelectionChange(selection: PendingSelection) {
    const currentValue = selection.kind === 'date' ? String(selectedDateNumber) : selectedDivisionId
    if (selection.value === currentValue || !hasUnsavedChanges) {
      if (selection.kind === 'date') setSelectedDateNumber(Number(selection.value))
      else setSelectedDivisionId(selection.value)
      return
    }
    setPendingSelection(selection)
  }

  function downloadCurrentList() {
    if (!selectedTeam || !selectedFixture) return
    const selectedPlayers = eligiblePlayers.filter((player) => selectedPlayerIds.includes(player.player_id))
    const content = [
      `AthlonX - ${selectedTeam.name}`,
      `Fecha ${selectedFixture.dateNumber} - ${selectedTeam.division_name}`,
      '',
      ...selectedPlayers.map((player, index) => `${index + 1}. ${player.full_name} (#${playerShirtNumbers[player.player_id] || '--'})`),
    ].join('\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `convocatoria-fecha-${selectedFixture.dateNumber}-${selectedTeam.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  // Genera el PDF oficial de la convocatoria seleccionada.
  function printCurrentList() {
    if (!selectedTeam || !selectedFixture) return
    const selectedPlayers = eligiblePlayers.filter((player) => selectedPlayerIds.includes(player.player_id))
    if (!selectedPlayers.length) {
      setError('Selecciona al menos un jugador antes de generar el PDF.')
      return
    }
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }[character] || character))
    const generatedDate = new Intl.DateTimeFormat('es-PA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date())
    const calendarDate = selectedFixture.calendarDate
      ? new Intl.DateTimeFormat('es-PA', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(new Date(`${selectedFixture.calendarDate}T12:00:00`))
      : 'Fecha por definir'
    const staffMarkup = teamStaff.length
      ? teamStaff.map((member) => {
          const label = member.role_label
            || (member.role === 'entrenador' ? 'Entrenador' : 'Entrenador asistente')
          return `<div class="staff-row"><strong>${escapeHtml(label)}</strong>
            <span>${escapeHtml(member.full_name)}</span></div>`
        }).join('')
      : '<p class="empty">Sin cuerpo técnico registrado.</p>'
    const playersMarkup = selectedPlayers.map((player, index) => `<tr>
      <td>${index + 1}</td>
      <td class="player-name">${escapeHtml(player.full_name)}</td>
      <td>${escapeHtml(player.position || 'Jugador')}</td>
      <td class="shirt-number">${escapeHtml(playerShirtNumbers[player.player_id] || '--')}</td>
    </tr>`).join('')
    const printWindow = window.open('', '_blank', 'width=900,height=1100')
    if (!printWindow) {
      setError('Permite las ventanas emergentes para generar el PDF.')
      return
    }
    printWindow.document.write(`<!doctype html><html lang="es"><head>
      <meta charset="utf-8" />
      <title>Lista de convocados - ${escapeHtml(selectedTeam.name)}</title>
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #fff; color: #10151b; }
        .page { width: 210mm; min-height: 297mm; padding: 16mm 15mm; }
        .logos { display: flex; justify-content: space-between; align-items: flex-start; }
        .logos img:first-child { width: 46mm; height: 18mm; object-fit: contain; }
        .logos img:last-child { width: 38mm; height: 20mm; object-fit: contain; }
        h1 { margin: 10mm 0 2mm; text-align: center; font: 700 24px Arial, sans-serif; }
        h2 { margin: 10mm 0 3mm; border-bottom: 2px solid #122436; padding-bottom: 3mm;
          font: 700 15px Arial, sans-serif; text-transform: uppercase; }
        .league { margin: 0; text-align: center; font: 15px Arial, sans-serif; }
        .meta { display: flex; justify-content: center; gap: 8mm; margin-top: 4mm;
          color: #40566b; font: 12px Arial, sans-serif; }
        .staff { margin-top: 10mm; border: 1px solid #c5d3df; padding: 4mm; }
        .staff-row { display: flex; gap: 4mm; padding: 2mm 0; font: 12px Arial, sans-serif; }
        .staff-row strong { width: 42mm; color: #4c8500; }
        .empty { margin: 0; color: #6b7f90; font: 12px Arial, sans-serif; }
        table { width: 100%; border-collapse: collapse; font: 11px Arial, sans-serif; }
        th { padding: 3mm 2mm; border-bottom: 2px solid #122436; text-align: left;
          font-weight: 700; }
        td { padding: 2.8mm 2mm; border-bottom: 1px solid #c5d3df; }
        th:not(.player-name), td:not(.player-name) { text-align: center; }
        .player-name { width: 48%; font-weight: 700; }
        .shirt-number { font-weight: 700; color: #4c8500; }
        .signature { margin-top: 35mm; width: 75mm; border-top: 1px solid #10151b;
          padding-top: 3mm; text-align: center; font: 12px Arial, sans-serif; }
        tr { break-inside: avoid; }
      </style>
    </head><body><main class="page">
      <div class="logos">
        <img src="${window.location.origin}/MarcaAthlonX/MarcaNegro.svg" alt="AthlonX" />
        <img src="${window.location.origin}/upr.png" alt="Organización" />
      </div>
      <h1>Lista de convocados</h1>
      <p class="league">${escapeHtml(tournamentName)}</p>
      <div class="meta"><span>${escapeHtml(selectedTeam.name)}</span>
        <span>Fecha ${selectedFixture.dateNumber}</span><span>${escapeHtml(selectedTeam.division_name)}</span></div>
      <p class="meta">Fecha de generación: ${escapeHtml(generatedDate)} · Jornada: ${escapeHtml(calendarDate)}</p>
      <section class="staff"><h2>Cuerpo técnico</h2>${staffMarkup}</section>
      <section><h2>Jugadores convocados</h2><table>
        <thead><tr><th>#</th><th class="player-name">Nombre</th><th>Posición</th>
          <th>Camiseta</th></tr></thead><tbody>${playersMarkup}</tbody>
      </table></section>
      <div class="signature">Firma del equipo</div>
    </main></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    window.setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 400)
  }

  async function saveCallup(submit: boolean) {
    if (!supabase || !selectedTeam || !selectedFixture) return false
    if (selectedPlayerIds.length > rule.max_players) { setError(`Selecciona como máximo ${rule.max_players} jugadores.`); return false }
    if (submit && selectedPlayerIds.length < 5) { setError('Debes seleccionar al menos 5 jugadores para enviar la convocatoria.'); return false }
    if (submit && !window.confirm(`¿Enviar la lista de ${selectedTeam.name} para la Fecha ${selectedFixture.dateNumber}? Después del cierre ya no podrás editarla.`)) return false
    setSaving(true)
    setError('')
    const { error: saveError } = await supabase.rpc('save_tournament_fixture_callup', { p_tournament_id: tournamentId, p_fixture_id: selectedFixture.fixtureId, p_team_id: selectedTeam.id, p_division_id: selectedTeam.division_id, p_player_ids: selectedPlayerIds, p_submit: submit, p_player_shirt_numbers: playerShirtNumbers })
    if (saveError) {
      const oldRpc = saveError.code === 'PGRST202' || /could not find the function|function public\.save_tournament_fixture_callup/i.test(saveError.message)
      const oldMinimumRule = /exactamente .* jugadores/i.test(saveError.message)
      const divisionMismatch = /Todos los jugadores deben pertenecer/i.test(saveError.message)
      setError(oldRpc || oldMinimumRule
        ? 'Supabase todavía usa la versión anterior de convocatorias. Ejecuta tournament-callup-minimum-and-shirt-number-migration.sql y vuelve a intentarlo.'
        : divisionMismatch
          ? 'La RPC de Supabase todavía valida la división con el identificador antiguo. Ejecuta nuevamente tournament-callup-minimum-and-shirt-number-migration.sql.'
          : saveError.message)
    }
    else { setMessage(submit ? 'Lista de la fecha enviada correctamente.' : 'Cambios guardados correctamente.'); setEditingList(false); await loadCallups() }
    setSaving(false)
    return !saveError
  }

  async function handlePendingAction(action: 'cancel' | 'download' | 'save') {
    if (!pendingSelection) return
    if (action === 'cancel') {
      setPendingSelection(null)
      return
    }
    const nextSelection = pendingSelection
    if (action === 'download') downloadCurrentList()
    if (action === 'save' && !(await saveCallup(false))) return
    applyPendingSelection(nextSelection)
  }

  async function saveDeadline() {
    if (!supabase || !selectedFixture || !canManageDeadline || !deadlineDraft) return
    const deadline = new Date(deadlineDraft)
    if (Number.isNaN(deadline.getTime())) {
      setError('Selecciona una fecha y hora de cierre válidas.')
      return
    }
    setDeadlineSaving(true)
    setError('')
    const { error: deadlineError } = await supabase.rpc('set_tournament_fixture_callup_deadline', {
      p_tournament_id: tournamentId,
      p_fixture_id: selectedFixture.fixtureId,
      p_deadline_at: deadline.toISOString(),
    })
    if (deadlineError) {
      setError(deadlineError.message)
    } else {
      setFixtureDeadlines((current) => ({ ...current, [selectedFixture.fixtureId]: deadline.toISOString() }))
      setMessage(`Cierre de la Fecha ${selectedFixture.dateNumber} guardado correctamente.`)
      await loadCallups()
    }
    setDeadlineSaving(false)
  }

  async function markInactive() {
    if (!supabase || !selectedCallup || !inactivePlayerId) return
    setSaving(true)
    setError('')
    const { error: markError } = await supabase.rpc('mark_tournament_fixture_callup_non_participant', { p_callup_id: selectedCallup.id, p_player_id: inactivePlayerId })
    if (markError) setError(markError.message)
    else { setMessage('Jugador 13 marcado como no participante.'); await loadCallups() }
    setSaving(false)
  }

  async function reopenCallup() {
    if (!supabase || !selectedCallup || !canManageTournament) return
    const reason = window.prompt('Escribe el motivo de la reapertura:')?.trim()
    if (!reason) return
    setSaving(true)
    setError('')
    const { error: reopenError } = await supabase.rpc('reopen_tournament_fixture_callup', { p_callup_id: selectedCallup.id, p_reason: reason })
    if (reopenError) setError(reopenError.message)
    else { setMessage('Convocatoria reabierta. El motivo quedó registrado.'); await loadCallups() }
    setSaving(false)
  }

  return (
    <section className="space-y-6 pt-6">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Listas de competencia</p>
          <h2 className="mt-2 font-display text-3xl uppercase">Convocatorias por fecha</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            {canManageDeadline
              ? 'Define el cierre exacto de cada jornada y consulta su estado.'
              : viewOnly
                ? 'Consulta el tiempo disponible para editar las listas de cada jornada.'
                : 'Selecciona una fecha, división y prepara la lista de jugadores de tu equipo.'}
          </p>
        </div>
        {!viewOnly && !canManageDeadline && (
          <span className="inline-flex items-center gap-2 rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300">
            <Clock3 size={14} />
            Cierre: {rule.lock_hours_before} horas antes
          </span>
        )}
      </div>

      {loading && (
        <p className="rounded-[5px] border border-[#29485d] p-4 text-sm text-slate-400">
          Cargando convocatorias...
        </p>
      )}
      {message && (
        <p role="status" className="rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/10 p-4 text-sm text-[#dfffba]">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-[5px] border border-[#ff7d88]/40 bg-[#ff7d88]/10 p-4 text-sm text-[#ffb0b7]">
          {error}
        </p>
      )}

      {!fixtureDates.length ? (
        <div className="rounded-[5px] border border-dashed border-[#31556b] p-6 text-sm text-slate-400">
          Primero genera el fixture para poder consultar las convocatorias.
        </div>
      ) : canManageDeadline ? (
        <OwnerDeadlineManager
          fixtureDates={fixtureDates}
          selectedFixture={selectedFixture}
          selectedDateNumber={selectedDateNumber}
          setSelectedDateNumber={setSelectedDateNumber}
          deadline={fixtureDeadline}
          deadlineDraft={deadlineDraft}
          setDeadlineDraft={setDeadlineDraft}
          saving={deadlineSaving}
          onSave={saveDeadline}
        />
      ) : viewOnly ? (
        <ReadOnlyCallups
          fixtureDates={fixtureDates}
          selectedFixture={selectedFixture}
          selectedDateNumber={selectedDateNumber}
          setSelectedDateNumber={setSelectedDateNumber}
          deadline={fixtureDeadline}
        />
      ) : (
        <>
          <p className="rounded-[5px] border border-[#31556b] bg-[#07131e] p-4 text-sm text-slate-300">
            Una vez que termine el tiempo de convocatorias configurado por el organizador, las listas se bloquearán automáticamente.
          </p>
          <CountdownCard deadline={fixtureDeadline} />
          <div className="rounded-[5px] border border-[#29485d] bg-[#07131e] p-4 sm:p-6">
            <div>
              <StyledSelect
                label="Fecha o jornada"
                value={String(selectedFixture?.dateNumber || '')}
                onChange={(value) => requestSelectionChange({ kind: 'date', value })}
                options={fixtureDates.map((fixture) => ({
                  value: String(fixture.dateNumber),
                  label: formatFixtureDate(fixture),
                }))}
              />
              {managedTeamId && (
                <StyledSelect
                  label="División"
                  value={selectedTeam?.division_id || ''}
                  onChange={(value) => requestSelectionChange({ kind: 'division', value })}
                  options={visibleTeams
                    .filter((team, index, list) => list.findIndex((item) => item.division_id === team.division_id) === index)
                    .map((team) => ({ value: team.division_id, label: team.division_name }))}
                  className="mt-4"
                />
              )}
              <div className="mt-4 rounded-[5px] border border-white/10 p-3 text-sm text-slate-400">
                La lista se aplicará a todos los partidos de la Fecha {selectedFixture?.dateNumber || ''}.
              </div>
              {!managedTeamId && (
                <div className="mt-5 space-y-2">
                  {visibleTeams.map((team) => {
                    const callup = callups.find(
                      (item) =>
                        item.fixture_id === selectedFixture?.fixtureId &&
                        item.team_id === team.id &&
                        item.division_id === team.division_id,
                    )
                    const status = displayStatus(callup)

                    return (
                      <button
                        type="button"
                        key={`${team.id}-${team.division_id}`}
                        onClick={() => {
                          setSelectedTeamId(team.id)
                          setSelectedDivisionId(team.division_id)
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-[5px] border p-3 text-left ${
                          selectedTeam?.id === team.id && selectedTeam?.division_id === team.division_id
                            ? 'border-[#b4ff45] bg-[#b4ff45]/10'
                            : 'border-[#29485d]'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-bold">{team.name}</span>
                          <span className="mt-1 block text-xs text-slate-500">{team.division_name}</span>
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                            status === 'Bloqueada'
                              ? 'bg-red-400/10 text-red-200'
                              : 'bg-[#b4ff45]/10 text-[#dfffba]'
                          }`}
                        >
                          {status}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
              {!visibleTeams.length && (
                <p className="mt-5 text-sm text-slate-500">No tienes equipos gestionables en esta fecha.</p>
              )}
            </div>
            <div className="mt-6 border-t border-white/10 pt-6"><CallupEditorWithPickerV2
              selectedTeam={selectedTeam}
              selectedFixture={selectedFixture}
              eligiblePlayers={eligiblePlayers}
              selectedPlayerIds={selectedPlayerIds}
              setSelectedPlayerIds={setSelectedPlayerIds}
               playerShirtNumbers={playerShirtNumbers}
               setPlayerShirtNumbers={setPlayerShirtNumbers}
              inactivePlayerId={inactivePlayerId}
              setInactivePlayerId={setInactivePlayerId}
              selectedCallup={selectedCallup}
              deadline={fixtureDeadline}
              rule={rule}
              canEditSelection={canEditSelection}
              canMarkInactive={canMarkInactive}
              isOwner={canManageTournament}
              saving={saving}
              onSaveDraft={() => void saveCallup(false)}
              allowSubmit={canSubmit}
              onBeginEdit={() => setEditingList(true)}
              onSubmit={() => void saveCallup(true)}
              onMarkInactive={() => void markInactive()}
              onReopen={() => void reopenCallup()}
              onPrint={printCurrentList}
            /></div>
          </div>
        </>
      )}
      {pendingSelection && hasUnsavedChanges && (
        <UnsavedChangesDialog
          onCancel={() => void handlePendingAction('cancel')}
          onDownload={() => void handlePendingAction('download')}
          onSave={() => void handlePendingAction('save')}
        />
      )}
    </section>
  )
}

function OwnerDeadlineManager({ fixtureDates, selectedFixture, selectedDateNumber, setSelectedDateNumber, deadline, deadlineDraft, setDeadlineDraft, saving, onSave }: { fixtureDates: FixtureDate[]; selectedFixture: FixtureDate | null; selectedDateNumber: number; setSelectedDateNumber: (value: number) => void; deadline: string | null; deadlineDraft: string; setDeadlineDraft: (value: string) => void; saving: boolean; onSave: () => void }) {
  const { expired } = useCountdown(deadline)
  const status = !deadline ? 'Sin configurar' : expired ? 'Bloqueada' : 'Abierta'
  return <div className="space-y-5"><div className="rounded-[5px] border border-[#29485d] bg-[#07131e] p-4 sm:p-5"><StyledSelect label="Fecha o jornada" value={String(selectedFixture?.dateNumber || selectedDateNumber || '')} onChange={(value) => setSelectedDateNumber(Number(value))} options={fixtureDates.map((fixture) => ({ value: String(fixture.dateNumber), label: formatFixtureDate(fixture) }))} /></div><CountdownCard deadline={deadline} label="Tiempo restante para el cierre" /><div className="rounded-[5px] border border-[#29485d] bg-[#07131e] p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b4ff45]">Configuración del organizador</p><h3 className="mt-2 text-xl font-bold">Cierre de la Fecha {selectedFixture?.dateNumber || ''}</h3><p className="mt-2 text-sm leading-6 text-slate-400">Define la hora exacta hasta la que los clubes y entrenadores podrán editar sus convocatorias.</p></div><span className={`rounded-[5px] border px-3 py-2 text-xs font-bold uppercase ${status === 'Bloqueada' ? 'border-red-400/40 bg-red-400/10 text-red-200' : 'border-[#b4ff45]/40 bg-[#b4ff45]/10 text-[#dfffba]'}`}>{status}</span></div><label className="mt-5 block text-sm font-semibold text-slate-200">Fecha y hora de bloqueo<input type="datetime-local" value={deadlineDraft} onChange={(event) => setDeadlineDraft(event.target.value)} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3 text-white outline-none focus:border-[#b4ff45]" /></label><button type="button" onClick={onSave} disabled={saving || !deadlineDraft || !selectedFixture} className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} />{saving ? 'Guardando...' : 'Guardar cierre'}</button></div><p className="rounded-[5px] border border-white/10 bg-[#07131e] p-4 text-sm text-slate-400">El cierre se aplica a toda la jornada seleccionada. Después de esa hora, las listas quedarán bloqueadas automáticamente.</p></div>
}

function ReadOnlyCallups({ fixtureDates, selectedFixture, selectedDateNumber, setSelectedDateNumber, deadline }: { fixtureDates: FixtureDate[]; selectedFixture: FixtureDate | null; selectedDateNumber: number; setSelectedDateNumber: (value: number) => void; deadline: string | null }) {
  return <div className="space-y-5"><div className="rounded-[5px] border border-[#29485d] bg-[#07131e] p-4 sm:p-5"><StyledSelect label="Fecha o jornada" value={String(selectedFixture?.dateNumber || selectedDateNumber || '')} onChange={(value) => setSelectedDateNumber(Number(value))} options={fixtureDates.map((fixture) => ({ value: String(fixture.dateNumber), label: formatFixtureDate(fixture) }))} /></div><CountdownCard deadline={deadline} label="Tiempo restante para editar convocatorias" /><p className="rounded-[5px] border border-white/10 bg-[#07131e] p-4 text-sm text-slate-400">La edición de jugadores se realiza desde la sección <strong className="text-[#dfffba]">Mi equipo</strong>. Aquí solo se consulta el tiempo de cierre de la jornada.</p></div>
}

function CallupEditor({ selectedTeam, selectedFixture, eligiblePlayers, selectedPlayerIds, setSelectedPlayerIds, inactivePlayerId, setInactivePlayerId, selectedCallup, deadline, rule, canEditSelection, canMarkInactive, isOwner, saving, onSaveDraft, onSubmit, onMarkInactive, onReopen }: { selectedTeam: TournamentTeam | null; selectedFixture: FixtureDate | null; eligiblePlayers: RosterEntry[]; selectedPlayerIds: string[]; setSelectedPlayerIds: (value: string[]) => void; inactivePlayerId: string; setInactivePlayerId: (value: string) => void; selectedCallup?: Callup; deadline: string | null; rule: CallupRule; canEditSelection: boolean; canMarkInactive: boolean; isOwner: boolean; saving: boolean; onSaveDraft: () => void; onSubmit: () => void; onMarkInactive: () => void; onReopen: () => void }) {
  if (!selectedTeam || !selectedFixture) return <div className="rounded-[5px] border border-dashed border-[#31556b] p-6 text-sm text-slate-400">Selecciona una fecha y un equipo para gestionar su lista.</div>
  const selectedPlayers = eligiblePlayers.filter((player) => selectedPlayerIds.includes(player.player_id))
  const canSelectInactivePlayer = canMarkInactive || (selectedCallup?.status === 'reopened' && canEditSelection)
  return <div className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-6"><div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b4ff45]">{selectedTeam.division_name}</p><h3 className="mt-1 text-2xl font-bold">{selectedTeam.name}</h3><p className="mt-1 text-sm capitalize text-slate-400">Fecha {selectedFixture.dateNumber}{selectedFixture.calendarDate ? ` · ${new Intl.DateTimeFormat('es-PA', { dateStyle: 'long' }).format(new Date(`${selectedFixture.calendarDate}T12:00:00`))}` : ''}</p></div><span className="inline-flex items-center gap-2 rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300">{selectedCallup ? statusLabels[selectedCallup.status] || selectedCallup.status : 'Pendiente'}</span></div>{selectedCallup && <p className={`mt-4 rounded-[5px] border p-3 text-sm ${canEditSelection ? 'border-[#b4ff45]/20 bg-[#b4ff45]/5 text-slate-300' : 'border-red-400/20 bg-red-400/5 text-red-200'}`}>{canEditSelection ? `Puedes editar hasta ${formatDeadline(selectedCallup.deadline_at)}.` : `Lista bloqueada desde ${formatDeadline(selectedCallup.deadline_at)}.`}</p>}<div className="mt-5 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Jugadores de la jornada</p><p className={`mt-1 text-2xl font-bold ${selectedPlayers.length === rule.max_players ? 'text-[#b4ff45]' : 'text-white'}`}>{selectedPlayers.length} / {rule.max_players}</p></div><Users className="text-[#b4ff45]" size={25} /></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{eligiblePlayers.map((player) => { const checked = selectedPlayerIds.includes(player.player_id); const disabled = !canEditSelection || (!checked && selectedPlayers.length >= rule.max_players); return <label key={player.player_id} className={`flex items-center gap-3 rounded-[5px] border px-3 py-3 text-sm ${checked ? 'border-[#b4ff45]/50 bg-[#b4ff45]/5' : 'border-white/10'} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => setSelectedPlayerIds(checked ? selectedPlayerIds.filter((id) => id !== player.player_id) : [...selectedPlayerIds, player.player_id])} className="accent-[#b4ff45]" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{player.full_name}</span><span className="mt-1 block text-xs text-slate-500">#{player.shirt_number ?? '--'} · {player.position || 'Posición pendiente'}</span></span>{checked && <Check size={16} className="text-[#b4ff45]" />}</label> })}{!eligiblePlayers.length && <p className="text-sm text-slate-500">Este equipo todavía no tiene jugadores en esta división.</p>}</div>{canEditSelection && <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={onSaveDraft} disabled={saving} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#31556b] px-4 py-3 text-sm font-bold text-slate-200 disabled:opacity-50"><Save size={16} />Guardar lista</button><button type="button" onClick={onSubmit} disabled={saving || selectedPlayers.length !== rule.max_players} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50"><Send size={16} />Enviar convocatoria</button></div>}{selectedCallup && selectedPlayers.length === rule.max_players && <div className="mt-6 rounded-[5px] border border-[#31556b] bg-[#07131e] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Jugador 13</p><p className="mt-1 text-sm text-slate-300">Marca quién no participará en esta jornada.</p></div><LockKeyhole className="text-[#b4ff45]" size={19} /></div><div className="mt-3 flex flex-col gap-3 sm:flex-row"><StyledSelect label="Jugador 13" value={inactivePlayerId} onChange={setInactivePlayerId} disabled={!canSelectInactivePlayer || selectedCallup.status === 'locked'} options={[{ value: '', label: 'Seleccionar jugador 13' }, ...selectedPlayers.map((player) => ({ value: player.player_id, label: player.full_name }))]} className="min-w-0 flex-1" /><button type="button" onClick={onMarkInactive} disabled={!inactivePlayerId || saving || !canSelectInactivePlayer || selectedCallup.status === 'locked'} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-[#b4ff45] px-4 py-3 text-sm font-bold text-[#dfffba] disabled:cursor-not-allowed disabled:opacity-50"><Check size={16} />Confirmar</button></div></div>}{isOwner && selectedCallup && (selectedCallup.status === 'locked' || new Date(selectedCallup.deadline_at).getTime() <= Date.now()) && <button type="button" onClick={onReopen} disabled={saving} className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#ffb45c]/50 px-4 py-3 text-sm font-bold text-[#ffd09b] disabled:opacity-50"><RotateCcw size={16} />Reabrir convocatoria</button>}</div>
}

type CallupEditorProps = { selectedTeam: TournamentTeam | null; selectedFixture: FixtureDate | null; eligiblePlayers: RosterEntry[]; selectedPlayerIds: string[]; setSelectedPlayerIds: (value: string[]) => void; inactivePlayerId: string; setInactivePlayerId: (value: string) => void; selectedCallup?: Callup; deadline: string | null; rule: CallupRule; canEditSelection: boolean; canMarkInactive: boolean; isOwner: boolean; saving: boolean; onSaveDraft: () => void; onSubmit: () => void; onMarkInactive: () => void; onReopen: () => void }

function CallupEditorWithPicker({ selectedTeam, selectedFixture, eligiblePlayers, selectedPlayerIds, setSelectedPlayerIds, inactivePlayerId, setInactivePlayerId, selectedCallup, deadline, rule, canEditSelection, canMarkInactive, isOwner, saving, onSaveDraft, onSubmit, onMarkInactive, onReopen }: CallupEditorProps) {
  const [showPlayerPicker, setShowPlayerPicker] = useState(false)
  const [playerQuery, setPlayerQuery] = useState('')
  if (!selectedTeam || !selectedFixture) return <div className="rounded-[5px] border border-dashed border-[#31556b] p-6 text-sm text-slate-400">Selecciona una fecha y un equipo para gestionar su lista.</div>
  const selectedPlayers = eligiblePlayers.filter((player) => selectedPlayerIds.includes(player.player_id))
  const filteredPlayers = eligiblePlayers.filter((player) => player.full_name.toLowerCase().includes(playerQuery.trim().toLowerCase()))
  const canSelectInactivePlayer = canMarkInactive || (selectedCallup?.status === 'reopened' && canEditSelection)
  return <div className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-6"><div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b4ff45]">{selectedTeam.division_name}</p><h3 className="mt-1 text-2xl font-bold">{selectedTeam.name}</h3><p className="mt-1 text-sm capitalize text-slate-400">Fecha {selectedFixture.dateNumber}{selectedFixture.calendarDate ? ` · ${new Intl.DateTimeFormat('es-PA', { dateStyle: 'long' }).format(new Date(`${selectedFixture.calendarDate}T12:00:00`))}` : ''}</p></div><span className="inline-flex items-center gap-2 rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300">{selectedCallup ? statusLabels[selectedCallup.status] || selectedCallup.status : 'Pendiente'}</span></div>{deadline && <p className={`mt-4 rounded-[5px] border p-3 text-sm ${canEditSelection ? 'border-[#b4ff45]/20 bg-[#b4ff45]/5 text-slate-300' : 'border-red-400/20 bg-red-400/5 text-red-200'}`}>{canEditSelection ? `Puedes editar hasta ${formatDeadline(deadline)}.` : `Lista bloqueada desde ${formatDeadline(deadline)}.`}</p>}<div className="mt-5 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Jugadores de la jornada</p><p className={`mt-1 text-2xl font-bold ${selectedPlayers.length === rule.max_players ? 'text-[#b4ff45]' : 'text-white'}`}>{selectedPlayers.length} / {rule.max_players}</p></div><Users className="text-[#b4ff45]" size={25} /></div>{canEditSelection && <button type="button" onClick={() => setShowPlayerPicker((current) => !current)} className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]"><UserPlus size={16} />{showPlayerPicker ? 'Ocultar jugadores' : 'Añadir jugador'}</button>}{showPlayerPicker && canEditSelection && <div className="mt-4 rounded-[5px] border border-[#b4ff45]/30 bg-[#07131e] p-4"><label className="block text-sm font-semibold text-slate-200">Buscar jugador<input value={playerQuery} onChange={(event) => setPlayerQuery(event.target.value)} placeholder="Nombre del jugador" className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3 text-white outline-none focus:border-[#b4ff45]" /></label><div className="mt-3 grid gap-2 sm:grid-cols-2">{filteredPlayers.map((player) => { const checked = selectedPlayerIds.includes(player.player_id); const disabled = !checked && selectedPlayers.length >= rule.max_players; return <label key={player.player_id} className={`flex cursor-pointer items-center gap-3 rounded-[5px] border px-3 py-3 text-sm ${checked ? 'border-[#b4ff45]/50 bg-[#b4ff45]/5' : 'border-white/10'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => setSelectedPlayerIds(checked ? selectedPlayerIds.filter((id) => id !== player.player_id) : [...selectedPlayerIds, player.player_id])} className="accent-[#b4ff45]" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{player.full_name}</span><span className="mt-1 block text-xs text-slate-500">#{player.shirt_number ?? '--'} · {player.position || 'Posición pendiente'}</span></span>{checked && <Check size={16} className="text-[#b4ff45]" />}</label> })}{!filteredPlayers.length && <p className="text-sm text-slate-500">No hay jugadores disponibles en esta división.</p>}</div></div>}{!showPlayerPicker && !selectedPlayers.length && <p className="mt-4 text-sm text-slate-500">Pulsa “Añadir jugador” para seleccionar jugadores de esta división.</p>}{selectedPlayers.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{selectedPlayers.map((player) => <span key={player.player_id} className="rounded-full border border-[#b4ff45]/30 bg-[#b4ff45]/10 px-3 py-1.5 text-xs font-semibold text-[#dfffba]">{player.full_name}</span>)}</div>}{canEditSelection && <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={onSaveDraft} disabled={saving} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#31556b] px-4 py-3 text-sm font-bold text-slate-200 disabled:opacity-50"><Save size={16} />Guardar lista</button><button type="button" onClick={onSubmit} disabled={saving || selectedPlayers.length !== rule.max_players} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50"><Send size={16} />Enviar convocatoria</button></div>}{selectedCallup && selectedPlayers.length === rule.max_players && <div className="mt-6 rounded-[5px] border border-[#31556b] bg-[#07131e] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Jugador 13</p><p className="mt-1 text-sm text-slate-300">Marca quién no participará en esta jornada.</p></div><LockKeyhole className="text-[#b4ff45]" size={19} /></div><div className="mt-3 flex flex-col gap-3 sm:flex-row"><StyledSelect label="Jugador 13" value={inactivePlayerId} onChange={setInactivePlayerId} disabled={!canSelectInactivePlayer || selectedCallup.status === 'locked'} options={[{ value: '', label: 'Seleccionar jugador 13' }, ...selectedPlayers.map((player) => ({ value: player.player_id, label: player.full_name }))]} className="min-w-0 flex-1" /><button type="button" onClick={onMarkInactive} disabled={!inactivePlayerId || saving || !canSelectInactivePlayer || selectedCallup.status === 'locked'} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-[#b4ff45] px-4 py-3 text-sm font-bold text-[#dfffba] disabled:cursor-not-allowed disabled:opacity-50"><Check size={16} />Confirmar</button></div></div>}{isOwner && selectedCallup && (selectedCallup.status === 'locked' || (deadline && new Date(deadline).getTime() <= Date.now())) && <button type="button" onClick={onReopen} disabled={saving} className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#ffb45c]/50 px-4 py-3 text-sm font-bold text-[#ffd09b] disabled:opacity-50"><RotateCcw size={16} />Reabrir convocatoria</button>}</div>
}

type CallupEditorV2Props = CallupEditorProps & {
  allowSubmit: boolean
  onBeginEdit: () => void
  onPrint: () => void
  playerShirtNumbers: Record<string, string>
  setPlayerShirtNumbers: (value: Record<string, string>) => void
}

function CallupEditorWithPickerV2Legacy({ selectedTeam, selectedFixture, eligiblePlayers, selectedPlayerIds, setSelectedPlayerIds, playerShirtNumbers, setPlayerShirtNumbers, inactivePlayerId, setInactivePlayerId, selectedCallup, deadline, rule, canEditSelection, canMarkInactive, isOwner, saving, onSaveDraft, onSubmit, onMarkInactive, onReopen, allowSubmit, onBeginEdit }: CallupEditorV2Props) {
  const [showPlayerPicker, setShowPlayerPicker] = useState(false)
  const [playerQuery, setPlayerQuery] = useState('')
  const [playerSearch, setPlayerSearch] = useState('')
  if (!selectedTeam || !selectedFixture) return <div className="rounded-[5px] border border-dashed border-[#31556b] p-6 text-sm text-slate-400">Selecciona una fecha y una división para gestionar su lista.</div>
  const selectedPlayers = eligiblePlayers.filter((player) => selectedPlayerIds.includes(player.player_id))
  const filteredPlayers = eligiblePlayers.filter((player) => player.full_name.toLowerCase().includes(playerSearch.trim().toLowerCase()))
  const isSubmitted = selectedCallup?.status === 'submitted'
  const canSelectInactivePlayer = canMarkInactive || (selectedCallup?.status === 'reopened' && canEditSelection)
  return <div className="space-y-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b4ff45]">{selectedTeam.division_name}</p><h3 className="mt-1 text-2xl font-bold">{selectedTeam.name}</h3><p className="mt-1 text-sm capitalize text-slate-400">Fecha {selectedFixture.dateNumber}{selectedFixture.calendarDate ? ` · ${new Intl.DateTimeFormat('es-PA', { dateStyle: 'long' }).format(new Date(`${selectedFixture.calendarDate}T12:00:00`))}` : ''}</p></div><span className="inline-flex items-center gap-2 self-start rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300">{selectedCallup ? statusLabels[selectedCallup.status] || selectedCallup.status : 'Pendiente'}</span></div>{deadline && <p className={`rounded-[5px] border p-3 text-sm ${canEditSelection ? 'border-[#b4ff45]/20 bg-[#b4ff45]/5 text-slate-300' : 'border-red-400/20 bg-red-400/5 text-red-200'}`}>{canEditSelection ? `Puedes editar hasta ${formatDeadline(deadline)}.` : `Lista bloqueada desde ${formatDeadline(deadline)}.`}</p>}<div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Jugadores de la jornada</p><p className={`mt-1 text-2xl font-bold ${selectedPlayers.length === rule.max_players ? 'text-[#b4ff45]' : 'text-white'}`}>{selectedPlayers.length} / {rule.max_players}</p></div><Users className="text-[#b4ff45]" size={25} /></div>{isSubmitted && !canEditSelection && <button type="button" onClick={onBeginEdit} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#b4ff45] px-4 py-3 text-sm font-bold text-[#dfffba]"><RotateCcw size={16} />Editar lista enviada</button>}{canEditSelection && <button type="button" onClick={() => setShowPlayerPicker((current) => !current)} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]"><UserPlus size={16} />{showPlayerPicker ? 'Ocultar jugadores' : 'Añadir jugador'}</button>}{showPlayerPicker && canEditSelection && <div className="rounded-[5px] border border-[#b4ff45]/30 bg-[#07131e] p-4"><label className="block text-sm font-semibold text-slate-200">Buscar jugador<div className="mt-2 flex gap-2"><input value={playerQuery} onChange={(event) => setPlayerQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setPlayerSearch(playerQuery) } }} placeholder="Nombre del jugador" className="min-w-0 flex-1 rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3 text-white outline-none focus:border-[#b4ff45]" /><button type="button" onClick={() => setPlayerSearch(playerQuery)} className="inline-flex items-center justify-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 font-bold text-[#07131e]"><Search size={16} />Buscar</button></div></label><div className="mt-3 grid gap-2 sm:grid-cols-2">{filteredPlayers.map((player) => { const checked = selectedPlayerIds.includes(player.player_id); const disabled = !checked && selectedPlayers.length >= rule.max_players; return <label key={player.player_id} className={`flex items-center gap-3 rounded-[5px] border px-3 py-3 text-sm ${checked ? 'border-[#b4ff45]/50 bg-[#b4ff45]/5' : 'border-white/10'} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => setSelectedPlayerIds(checked ? selectedPlayerIds.filter((id) => id !== player.player_id) : [...selectedPlayerIds, player.player_id])} className="accent-[#b4ff45]" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{player.full_name}</span><span className="mt-1 block text-xs text-slate-500">#{player.shirt_number ?? '--'} · {player.position || 'Posición pendiente'}</span></span>{checked && <Check size={16} className="text-[#b4ff45]" />}</label> })}{!filteredPlayers.length && <p className="text-sm text-slate-500">No hay jugadores añadidos a este equipo en la división seleccionada.</p>}</div></div>}{selectedPlayers.length > 0 && <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Jugadores añadidos a la lista</p><div className="flex flex-wrap gap-2">{selectedPlayers.map((player) => <button key={player.player_id} type="button" disabled={!canEditSelection} onClick={() => setSelectedPlayerIds(selectedPlayerIds.filter((id) => id !== player.player_id))} className="inline-flex items-center gap-2 rounded-full border border-[#b4ff45]/30 bg-[#b4ff45]/10 px-3 py-1.5 text-xs font-semibold text-[#dfffba] disabled:cursor-default">{player.full_name}{canEditSelection && <X size={13} />}</button>)}</div></div>}{!eligiblePlayers.length && <p className="text-sm text-slate-500">No hay jugadores añadidos a este equipo en la división seleccionada.</p>}{canEditSelection && <div className="flex flex-wrap gap-3"><button type="button" onClick={onSaveDraft} disabled={saving} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#31556b] px-4 py-3 text-sm font-bold text-slate-200 disabled:opacity-50"><Save size={16} />{isSubmitted ? 'Guardar cambios' : 'Guardar lista'}</button>{allowSubmit && <button type="button" onClick={onSubmit} disabled={saving || selectedPlayers.length !== rule.max_players} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50"><Send size={16} />Enviar lista</button>}</div>}{selectedCallup && selectedPlayers.length === rule.max_players && <div className="rounded-[5px] border border-[#31556b] bg-[#07131e] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Jugador 13</p><p className="mt-1 text-sm text-slate-300">Marca quién no participará en esta jornada.</p></div><LockKeyhole className="text-[#b4ff45]" size={19} /></div><div className="mt-3 flex flex-col gap-3 sm:flex-row"><StyledSelect label="Jugador 13" value={inactivePlayerId} onChange={setInactivePlayerId} disabled={!canSelectInactivePlayer || selectedCallup.status === 'locked'} options={[{ value: '', label: 'Seleccionar jugador 13' }, ...selectedPlayers.map((player) => ({ value: player.player_id, label: player.full_name }))]} className="min-w-0 flex-1" /><button type="button" onClick={onMarkInactive} disabled={!inactivePlayerId || saving || !canSelectInactivePlayer || selectedCallup.status === 'locked'} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-[#b4ff45] px-4 py-3 text-sm font-bold text-[#dfffba] disabled:cursor-not-allowed disabled:opacity-50"><Check size={16} />Confirmar</button></div></div>}{isOwner && selectedCallup && (selectedCallup.status === 'locked' || (deadline && new Date(deadline).getTime() <= Date.now())) && <button type="button" onClick={onReopen} disabled={saving} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#ffb45c]/50 px-4 py-3 text-sm font-bold text-[#ffd09b] disabled:opacity-50"><RotateCcw size={16} />Reabrir convocatoria</button>}</div>
}

function CallupEditorWithPickerV2({ selectedTeam, selectedFixture, eligiblePlayers, selectedPlayerIds, setSelectedPlayerIds, playerShirtNumbers, setPlayerShirtNumbers, inactivePlayerId, setInactivePlayerId, selectedCallup, deadline, rule, canEditSelection, canMarkInactive, isOwner, saving, onSaveDraft, onSubmit, onMarkInactive, onReopen, allowSubmit, onBeginEdit, onPrint }: CallupEditorV2Props) {
  const [showPlayerPicker, setShowPlayerPicker] = useState(false)
  const [playerQuery, setPlayerQuery] = useState('')
  const [playerSearch, setPlayerSearch] = useState('')

  if (!selectedTeam || !selectedFixture) return <div className="rounded-[5px] border border-dashed border-[#31556b] p-6 text-sm text-slate-400">Selecciona una fecha y una división para gestionar su lista.</div>

  const selectedPlayers = eligiblePlayers.filter((player) => selectedPlayerIds.includes(player.player_id))
  const filteredPlayers = eligiblePlayers.filter((player) => player.full_name.toLowerCase().includes(playerSearch.trim().toLowerCase()))
  const isSubmitted = selectedCallup?.status === 'submitted'
  const canSelectInactivePlayer = canMarkInactive || (selectedCallup?.status === 'reopened' && canEditSelection)

  function togglePlayer(playerId: string) {
    const checked = selectedPlayerIds.includes(playerId)
    if (checked) {
      setSelectedPlayerIds(selectedPlayerIds.filter((id) => id !== playerId))
      const nextNumbers = { ...playerShirtNumbers }
      delete nextNumbers[playerId]
      setPlayerShirtNumbers(nextNumbers)
      return
    }
    setSelectedPlayerIds([...selectedPlayerIds, playerId])
  }

  function updateShirtNumber(playerId: string, value: string) {
    if (value !== '' && (!/^\d{1,2}$/.test(value) || Number(value) > 99)) return
    setPlayerShirtNumbers({ ...playerShirtNumbers, [playerId]: value })
  }

  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b4ff45]">{selectedTeam.division_name}</p><h3 className="mt-1 text-2xl font-bold">{selectedTeam.name}</h3><p className="mt-1 text-sm capitalize text-slate-400">Fecha {selectedFixture.dateNumber}{selectedFixture.calendarDate ? ` · ${new Intl.DateTimeFormat('es-PA', { dateStyle: 'long' }).format(new Date(`${selectedFixture.calendarDate}T12:00:00`))}` : ''}</p></div>
      <div className="flex flex-wrap gap-2 self-start">
        <span className="inline-flex items-center gap-2 rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300">{selectedCallup ? statusLabels[selectedCallup.status] || selectedCallup.status : 'Pendiente'}</span>
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-200 hover:border-[#b4ff45]"
        >
          <FileDown size={15} />PDF
        </button>
      </div>
    </div>
    {deadline && <p className={`rounded-[5px] border p-3 text-sm ${canEditSelection ? 'border-[#b4ff45]/20 bg-[#b4ff45]/5 text-slate-300' : 'border-red-400/20 bg-red-400/5 text-red-200'}`}>{canEditSelection ? `Puedes editar hasta ${formatDeadline(deadline)}.` : `Lista bloqueada desde ${formatDeadline(deadline)}.`}</p>}
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Jugadores de la jornada</p><p className={`mt-1 text-2xl font-bold ${selectedPlayers.length >= 5 ? 'text-[#b4ff45]' : 'text-white'}`}>{selectedPlayers.length} / {rule.max_players}</p><p className="mt-1 text-xs text-slate-400">Mínimo para enviar: 5</p></div><div className="flex items-center gap-3"><PlayerRoleIcon position="Portero" /><PlayerRoleIcon position="Jugador" /><Users className="text-[#b4ff45]" size={25} /></div></div>
    {isSubmitted && !canEditSelection && <button type="button" onClick={onBeginEdit} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#b4ff45] px-4 py-3 text-sm font-bold text-[#dfffba]"><RotateCcw size={16} />Editar lista enviada</button>}
    {canEditSelection && <button type="button" onClick={() => setShowPlayerPicker((current) => !current)} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]"><UserPlus size={16} />{showPlayerPicker ? 'Ocultar jugadores' : 'Añadir jugador'}</button>}
    {showPlayerPicker && canEditSelection && <div className="rounded-[5px] border border-[#b4ff45]/30 bg-[#07131e] p-4">
      <label className="block text-sm font-semibold text-slate-200">Buscar jugador<div className="mt-2 flex gap-2"><input value={playerQuery} onChange={(event) => setPlayerQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); setPlayerSearch(playerQuery) } }} placeholder="Nombre del jugador" className="min-w-0 flex-1 rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3 text-white outline-none focus:border-[#b4ff45]" /><button type="button" onClick={() => setPlayerSearch(playerQuery)} className="inline-flex items-center justify-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 font-bold text-[#07131e]"><Search size={16} />Buscar</button></div></label>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{filteredPlayers.map((player) => { const checked = selectedPlayerIds.includes(player.player_id); const disabled = !checked && selectedPlayers.length >= rule.max_players; const shirtNumber = playerShirtNumbers[player.player_id] ?? ''; return <label key={player.player_id} className={`flex items-center gap-3 rounded-[5px] border px-3 py-3 text-sm ${checked ? 'border-[#b4ff45]/50 bg-[#b4ff45]/5' : 'border-white/10'} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => togglePlayer(player.player_id)} className="accent-[#b4ff45]" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{player.full_name}</span><span className="mt-1 block text-xs text-slate-500">Plantilla: #{player.shirt_number ?? '--'} · {player.position || 'Posición pendiente'}</span></span>{checked && <input type="number" min="0" max="99" value={shirtNumber} onChange={(event) => updateShirtNumber(player.player_id, event.target.value)} onClick={(event) => event.stopPropagation()} aria-label={`Número de camiseta de ${player.full_name}`} placeholder="#" className="w-20 rounded-[5px] border border-[#31556b] bg-[#0d2232] px-2 py-2 text-center text-white outline-none focus:border-[#b4ff45]" />} {checked && <Check size={16} className="text-[#b4ff45]" />}</label> })}{!filteredPlayers.length && <p className="text-sm text-slate-500">No hay jugadores añadidos a este equipo en la división seleccionada.</p>}</div>
    </div>}
    {selectedPlayers.length > 0 && <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Jugadores añadidos a la lista</p><div className="flex flex-wrap gap-2">{selectedPlayers.map((player) => <button key={player.player_id} type="button" disabled={!canEditSelection} onClick={() => togglePlayer(player.player_id)} className="inline-flex items-center gap-2 rounded-full border border-[#b4ff45]/30 bg-[#b4ff45]/10 px-3 py-1.5 text-xs font-semibold text-[#dfffba] disabled:cursor-default">{player.full_name} #{playerShirtNumbers[player.player_id] || '--'}{canEditSelection && <X size={13} />}</button>)}</div></div>}
    {!eligiblePlayers.length && <p className="text-sm text-slate-500">No hay jugadores añadidos a este equipo en la división seleccionada.</p>}
    {canEditSelection && <div className="flex flex-wrap gap-3"><button type="button" onClick={onSaveDraft} disabled={saving} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#31556b] px-4 py-3 text-sm font-bold text-slate-200 disabled:opacity-50"><Save size={16} />{isSubmitted ? 'Guardar cambios' : 'Guardar lista'}</button>{allowSubmit && <button type="button" onClick={onSubmit} disabled={saving || selectedPlayers.length < 5} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50"><Send size={16} />Enviar lista</button>}{allowSubmit && selectedPlayers.length < 5 && <p className="w-full text-sm text-amber-200">Selecciona al menos 5 jugadores para enviar la lista.</p>}</div>}
    {selectedCallup && selectedPlayers.length === rule.max_players && <div className="rounded-[5px] border border-[#31556b] bg-[#07131e] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Jugador 13</p><p className="mt-1 text-sm text-slate-300">Marca quién no participará en esta jornada.</p></div><LockKeyhole className="text-[#b4ff45]" size={19} /></div><div className="mt-3 flex flex-col gap-3 sm:flex-row"><StyledSelect label="Jugador 13" value={inactivePlayerId} onChange={setInactivePlayerId} disabled={!canSelectInactivePlayer || selectedCallup.status === 'locked'} options={[{ value: '', label: 'Seleccionar jugador 13' }, ...selectedPlayers.map((player) => ({ value: player.player_id, label: player.full_name }))]} className="min-w-0 flex-1" /><button type="button" onClick={onMarkInactive} disabled={!inactivePlayerId || saving || !canSelectInactivePlayer || selectedCallup.status === 'locked'} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-[#b4ff45] px-4 py-3 text-sm font-bold text-[#dfffba] disabled:cursor-not-allowed disabled:opacity-50"><Check size={16} />Confirmar</button></div></div>}
    {isOwner && selectedCallup && (selectedCallup.status === 'locked' || (deadline && new Date(deadline).getTime() <= Date.now())) && <button type="button" onClick={onReopen} disabled={saving} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#ffb45c]/50 px-4 py-3 text-sm font-bold text-[#ffd09b] disabled:opacity-50"><RotateCcw size={16} />Reabrir convocatoria</button>}
  </div>
}

function UnsavedChangesDialog({ onCancel, onDownload, onSave }: { onCancel: () => void; onDownload: () => void; onSave: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020910]/80 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-[8px] border border-[#31556b] bg-[#0b1d2c] p-6 shadow-2xl"><h3 className="text-xl font-bold text-white">Cambios sin guardar</h3><p className="mt-3 text-sm leading-6 text-slate-300">Has realizado cambios en la lista de convocados. ¿Qué deseas hacer antes de cambiar de fecha o división?</p><div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-[5px] border border-[#31556b] px-4 py-3 text-sm font-bold text-slate-200">Cancelar</button><button type="button" onClick={onDownload} className="rounded-[5px] border border-[#b4ff45]/50 px-4 py-3 text-sm font-bold text-[#dfffba]">Descargar</button><button type="button" onClick={onSave} className="rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]">Guardar</button></div></div></div>
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-[5px] border border-[#29485d] bg-[#07131e] p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 font-display text-3xl text-white">{value}</p></div>
}

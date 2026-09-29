'use client'

import { Check, Clock3, LockKeyhole, RotateCcw, Save, Send, ShieldAlert, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { StyledSelect } from './styled-select'

type TournamentTeam = { id: string; name: string; division_id: string; division_name: string }
type Division = { id: string; name: string }
type TournamentMatch = { id: string; date_number: number; calendar_date: string | null; scheduled_time: string | null; division_name: string | null; local_team_id: string; local_team_name: string; visitor_team_id: string; visitor_team_name: string }
type RosterEntry = { team_id: string; player_id: string; full_name: string; shirt_number: number | null; position: string | null }
type CallupRule = { tournament_id: string; max_players: number; active_players: number; inactive_players: number; lock_hours_before: number }
type Callup = { id: string; tournament_id: string; match_id: string; team_id: string; division_id: string; status: string; deadline_at: string; submitted_at: string | null; non_participant_player_id: string | null; reopen_reason: string | null }
type CallupPlayer = { callup_id: string; player_id: string; state: 'convocado' | 'no_participante' | 'no_convocado' }

const defaultRule: CallupRule = { tournament_id: '', max_players: 13, active_players: 12, inactive_players: 1, lock_hours_before: 24 }
const statusLabels: Record<string, string> = { pending: 'Pendiente', editing: 'En edición', submitted: 'Enviada', locked: 'Bloqueada', reopened: 'Reabierta' }

function formatDeadline(value: string) {
  return new Intl.DateTimeFormat('es-PA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatMatch(match: TournamentMatch) {
  const date = match.calendar_date ? new Intl.DateTimeFormat('es-PA', { day: 'numeric', month: 'short' }).format(new Date(`${match.calendar_date}T12:00:00`)) : `Fecha ${match.date_number}`
  return `${date} · ${match.local_team_name} vs ${match.visitor_team_name}`
}

function displayStatus(callup: Callup | undefined) {
  if (!callup) return 'Pendiente'
  if (callup.status !== 'reopened' && callup.status !== 'locked' && new Date(callup.deadline_at).getTime() <= Date.now()) return 'Bloqueada'
  return statusLabels[callup.status] || callup.status
}

export function TournamentCallupsPanel({ tournamentId, divisions, teams, matches, rosters, isOwner }: { tournamentId: string; divisions: Division[]; teams: TournamentTeam[]; matches: TournamentMatch[]; rosters: RosterEntry[]; isOwner: boolean }) {
  const [rule, setRule] = useState<CallupRule>({ ...defaultRule, tournament_id: tournamentId })
  const [ruleDraft, setRuleDraft] = useState({ max_players: '13', active_players: '12', inactive_players: '1', lock_hours_before: '24' })
  const [callups, setCallups] = useState<Callup[]>([])
  const [callupPlayers, setCallupPlayers] = useState<CallupPlayer[]>([])
  const [manageableTeamIds, setManageableTeamIds] = useState<string[]>([])
  const [staffTeamIds, setStaffTeamIds] = useState<string[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id || '')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [inactivePlayerId, setInactivePlayerId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const selectedMatch = matches.find((match) => match.id === selectedMatchId) || null
  const matchTeams = selectedMatch ? teams.filter((team) => [selectedMatch.local_team_id, selectedMatch.visitor_team_id].includes(team.id)) : []
  const visibleTeams = isOwner ? matchTeams : matchTeams.filter((team) => manageableTeamIds.includes(team.id))
  const selectedTeam = visibleTeams.find((team) => team.id === selectedTeamId) || visibleTeams[0] || null
  const selectedCallup = callups.find((callup) => callup.match_id === selectedMatchId && callup.team_id === selectedTeam?.id)
  const eligiblePlayers = selectedTeam ? rosters.filter((player) => player.team_id === selectedTeam.id) : []
  const isBeforeDeadline = !selectedCallup || new Date(selectedCallup.deadline_at).getTime() > Date.now() || selectedCallup.status === 'reopened'
  const canEditSelection = Boolean(selectedTeam && (isOwner || manageableTeamIds.includes(selectedTeam.id)) && isBeforeDeadline)
  const canMarkInactive = Boolean(selectedCallup && selectedTeam && (isOwner || staffTeamIds.includes(selectedTeam.id)) && selectedPlayerIds.length === rule.max_players && selectedCallup.status !== 'locked' && (new Date(selectedCallup.deadline_at).getTime() <= Date.now() || selectedCallup.status === 'reopened'))
  const rulesAreValid = Number(ruleDraft.max_players) > 0 && Number(ruleDraft.active_players) >= 0 && Number(ruleDraft.inactive_players) >= 0 && Number(ruleDraft.active_players) + Number(ruleDraft.inactive_players) === Number(ruleDraft.max_players)
  const counts = useMemo(() => callups.reduce((summary, callup) => { const status = displayStatus(callup); if (status === 'Enviada') summary.submitted += 1; else if (status === 'Bloqueada') summary.locked += 1; else if (status === 'En edición' || status === 'Reabierta') summary.editing += 1; else summary.pending += 1; return summary }, { pending: 0, editing: 0, submitted: 0, locked: 0 }), [callups])

  async function loadCallups() {
    if (!supabase) return
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setError('Debes iniciar sesión para consultar convocatorias.'); setLoading(false); return }
    const [ruleResult, callupResult, membershipResult] = await Promise.all([
      supabase.from('tournament_callup_rules').select('tournament_id, max_players, active_players, inactive_players, lock_hours_before').eq('tournament_id', tournamentId).maybeSingle(),
      supabase.from('tournament_callups').select('id, tournament_id, match_id, team_id, division_id, status, deadline_at, submitted_at, non_participant_player_id, reopen_reason').eq('tournament_id', tournamentId),
      supabase.from('team_user_memberships').select('team_id, role').eq('user_id', userData.user.id).eq('status', 'active').in('role', ['owner', 'directivo', 'entrenador', 'staff']),
    ])
    const callupIds = (callupResult.data ?? []).map((callup) => callup.id)
    const playerResult = callupIds.length ? await supabase.from('tournament_callup_players').select('callup_id, player_id, state').in('callup_id', callupIds) : { data: [], error: null }
    if (ruleResult.error || callupResult.error || playerResult.error) { setError(ruleResult.error?.message || callupResult.error?.message || playerResult.error?.message || 'No se pudieron cargar las convocatorias.'); setLoading(false); return }
    const nextRule = (ruleResult.data as CallupRule | null) || { ...defaultRule, tournament_id: tournamentId }
    setRule(nextRule)
    setRuleDraft({ max_players: String(nextRule.max_players), active_players: String(nextRule.active_players), inactive_players: String(nextRule.inactive_players), lock_hours_before: String(nextRule.lock_hours_before) })
    setCallups((callupResult.data ?? []) as Callup[])
    setCallupPlayers((playerResult.data ?? []) as CallupPlayer[])
    setManageableTeamIds((membershipResult.data ?? []).map((membership) => membership.team_id))
    setStaffTeamIds((membershipResult.data ?? []).filter((membership) => membership.role === 'staff').map((membership) => membership.team_id))
    setError('')
    setLoading(false)
  }

  useEffect(() => { void loadCallups() }, [tournamentId])

  useEffect(() => {
    if (!selectedMatchId && matches[0]) setSelectedMatchId(matches[0].id)
    const available = matches.find((match) => match.id === selectedMatchId)
    const nextTeams = available ? teams.filter((team) => [available.local_team_id, available.visitor_team_id].includes(team.id) && (isOwner || manageableTeamIds.includes(team.id))) : []
    if (!nextTeams.some((team) => team.id === selectedTeamId)) setSelectedTeamId(nextTeams[0]?.id || '')
  }, [isOwner, manageableTeamIds, matches, selectedMatchId, selectedTeamId, teams])

  useEffect(() => {
    const current = callups.find((callup) => callup.match_id === selectedMatchId && callup.team_id === selectedTeam?.id)
    setSelectedPlayerIds(callupPlayers.filter((player) => player.callup_id === current?.id && player.state !== 'no_participante').map((player) => player.player_id))
    setInactivePlayerId(current?.non_participant_player_id || '')
  }, [callupPlayers, callups, selectedMatchId, selectedTeam?.id])

  async function saveRules(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !isOwner || !rulesAreValid) { setError('La suma de jugadores disponibles y no participantes debe coincidir con el máximo.'); return }
    setSaving(true)
    setError('')
    const { data, error: saveError } = await supabase.rpc('set_tournament_callup_rules', { p_tournament_id: tournamentId, p_max_players: Number(ruleDraft.max_players), p_active_players: Number(ruleDraft.active_players), p_inactive_players: Number(ruleDraft.inactive_players), p_lock_hours_before: Number(ruleDraft.lock_hours_before) })
    if (saveError) setError(saveError.message)
    else { setRule(data as CallupRule); setMessage('Reglas de convocatoria guardadas.') }
    setSaving(false)
  }

  async function saveCallup(submit: boolean) {
    if (!supabase || !selectedTeam || !selectedMatch) return
    if (selectedPlayerIds.length > rule.max_players) { setError(`Selecciona como máximo ${rule.max_players} jugadores.`); return }
    if (submit && selectedPlayerIds.length !== rule.max_players) { setError(`Debes seleccionar exactamente ${rule.max_players} jugadores para enviar la convocatoria.`); return }
    if (submit && !window.confirm(`¿Enviar la convocatoria de ${selectedTeam.name}? Después del cierre ya no podrás editarla.`)) return
    setSaving(true)
    setError('')
    const { error: saveError } = await supabase.rpc('save_tournament_callup', { p_tournament_id: tournamentId, p_match_id: selectedMatch.id, p_team_id: selectedTeam.id, p_division_id: selectedTeam.division_id, p_player_ids: selectedPlayerIds, p_submit: submit })
    if (saveError) setError(saveError.message)
    else { setMessage(submit ? 'Convocatoria enviada correctamente.' : 'Borrador guardado.'); await loadCallups() }
    setSaving(false)
  }

  async function markInactive() {
    if (!supabase || !selectedCallup || !inactivePlayerId) return
    setSaving(true)
    setError('')
    const { error: markError } = await supabase.rpc('mark_tournament_callup_non_participant', { p_callup_id: selectedCallup.id, p_player_id: inactivePlayerId })
    if (markError) setError(markError.message)
    else { setMessage('Jugador 13 marcado como no participante.'); await loadCallups() }
    setSaving(false)
  }

  async function reopenCallup() {
    if (!supabase || !selectedCallup || !isOwner) return
    const reason = window.prompt('Escribe el motivo de la reapertura:')?.trim()
    if (!reason) return
    setSaving(true)
    setError('')
    const { error: reopenError } = await supabase.rpc('reopen_tournament_callup', { p_callup_id: selectedCallup.id, p_reason: reason })
    if (reopenError) setError(reopenError.message)
    else { setMessage('Convocatoria reabierta. El motivo quedó registrado.'); await loadCallups() }
    setSaving(false)
  }

  return (
    <section className="space-y-6 pt-6">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Listas de competencia</p><h2 className="mt-2 font-display text-3xl uppercase">Convocatorias</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Selecciona los jugadores de cada equipo para cada partido. El cierre se calcula automáticamente según la regla del torneo.</p></div>
        <span className="inline-flex items-center gap-2 rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300"><Clock3 size={14} />Cierre: {rule.lock_hours_before} horas antes</span>
      </div>

      {isOwner && <form onSubmit={saveRules} className="rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/5 p-4 sm:p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b4ff45]">Configuración del organizador</p><h3 className="mt-2 text-lg font-bold">Regla de la modalidad</h3></div><ShieldAlert className="text-[#b4ff45]" size={21} /></div><div className="mt-4 grid gap-3 sm:grid-cols-4"><RuleInput label="Máximo" value={ruleDraft.max_players} onChange={(value) => setRuleDraft((current) => ({ ...current, max_players: value }))} /><RuleInput label="Disponibles" value={ruleDraft.active_players} onChange={(value) => setRuleDraft((current) => ({ ...current, active_players: value }))} /><RuleInput label="No participantes" value={ruleDraft.inactive_players} onChange={(value) => setRuleDraft((current) => ({ ...current, inactive_players: value }))} /><RuleInput label="Cierre (horas)" value={ruleDraft.lock_hours_before} onChange={(value) => setRuleDraft((current) => ({ ...current, lock_hours_before: value }))} /></div><button type="submit" disabled={saving || !rulesAreValid} className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} />Guardar reglas</button></form>}
      <div className="grid gap-3 sm:grid-cols-4"><SummaryCard label="Pendientes" value={counts.pending} /><SummaryCard label="En edición" value={counts.editing} /><SummaryCard label="Enviadas" value={counts.submitted} /><SummaryCard label="Bloqueadas" value={counts.locked} /></div>
      {loading && <p className="rounded-[5px] border border-[#29485d] p-4 text-sm text-slate-400">Cargando convocatorias...</p>}
      {message && <p role="status" className="rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/10 p-4 text-sm text-[#dfffba]">{message}</p>}
      {error && <p role="alert" className="rounded-[5px] border border-[#ff7d88]/40 bg-[#ff7d88]/10 p-4 text-sm text-[#ffb0b7]">{error}</p>}
      {!matches.length ? <div className="rounded-[5px] border border-dashed border-[#31556b] p-6 text-sm text-slate-400">Primero genera los partidos del torneo para poder crear convocatorias.</div> : <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_1.3fr]"><div className="rounded-[5px] border border-[#29485d] bg-[#07131e] p-4"><StyledSelect label="Jornada o partido" value={selectedMatchId} onChange={setSelectedMatchId} options={matches.map((match) => ({ value: match.id, label: formatMatch(match) }))} /><div className="mt-5 space-y-2">{matchTeams.map((team) => { const callup = callups.find((item) => item.match_id === selectedMatchId && item.team_id === team.id); const status = displayStatus(callup); return <button type="button" key={team.id} onClick={() => setSelectedTeamId(team.id)} className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-[5px] border p-3 text-left ${selectedTeam?.id === team.id ? 'border-[#b4ff45] bg-[#b4ff45]/10' : 'border-[#29485d]'}`}><span className="min-w-0"><span className="block truncate font-bold">{team.name}</span><span className="mt-1 block text-xs text-slate-500">{team.division_name}</span></span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${status === 'Bloqueada' ? 'bg-red-400/10 text-red-200' : 'bg-[#b4ff45]/10 text-[#dfffba]'}`}>{status}</span></button> })}</div></div><CallupEditor selectedTeam={selectedTeam} selectedMatch={selectedMatch} eligiblePlayers={eligiblePlayers} selectedPlayerIds={selectedPlayerIds} setSelectedPlayerIds={setSelectedPlayerIds} inactivePlayerId={inactivePlayerId} setInactivePlayerId={setInactivePlayerId} selectedCallup={selectedCallup} rule={rule} canEditSelection={canEditSelection} canMarkInactive={canMarkInactive} isOwner={isOwner} saving={saving} onSaveDraft={() => void saveCallup(false)} onSubmit={() => void saveCallup(true)} onMarkInactive={() => void markInactive()} onReopen={() => void reopenCallup()} /></div>}
    </section>
  )
}

function RuleInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}<input value={value} onChange={(event) => onChange(event.target.value)} type="number" min="0" className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#07131e] px-3 py-3 text-sm normal-case tracking-normal text-white" /></label>
}

function CallupEditor({ selectedTeam, selectedMatch, eligiblePlayers, selectedPlayerIds, setSelectedPlayerIds, inactivePlayerId, setInactivePlayerId, selectedCallup, rule, canEditSelection, canMarkInactive, isOwner, saving, onSaveDraft, onSubmit, onMarkInactive, onReopen }: { selectedTeam: TournamentTeam | null; selectedMatch: TournamentMatch | null; eligiblePlayers: RosterEntry[]; selectedPlayerIds: string[]; setSelectedPlayerIds: (value: string[]) => void; inactivePlayerId: string; setInactivePlayerId: (value: string) => void; selectedCallup?: Callup; rule: CallupRule; canEditSelection: boolean; canMarkInactive: boolean; isOwner: boolean; saving: boolean; onSaveDraft: () => void; onSubmit: () => void; onMarkInactive: () => void; onReopen: () => void }) {
  if (!selectedTeam || !selectedMatch) return <div className="rounded-[5px] border border-dashed border-[#31556b] p-6 text-sm text-slate-400">Selecciona un equipo para gestionar su convocatoria.</div>
  const selectedPlayers = eligiblePlayers.filter((player) => selectedPlayerIds.includes(player.player_id))
  const canSelectInactivePlayer = canMarkInactive || (selectedCallup?.status === 'reopened' && canEditSelection)
  return <div className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-6"><div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b4ff45]">{selectedTeam.division_name}</p><h3 className="mt-1 text-2xl font-bold">{selectedTeam.name}</h3><p className="mt-1 text-sm text-slate-400">{formatMatch(selectedMatch)}</p></div><span className="inline-flex items-center gap-2 rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300">{selectedCallup ? statusLabels[selectedCallup.status] || selectedCallup.status : 'Pendiente'}</span></div>{selectedCallup && <p className={`mt-4 rounded-[5px] border p-3 text-sm ${canEditSelection ? 'border-[#b4ff45]/20 bg-[#b4ff45]/5 text-slate-300' : 'border-red-400/20 bg-red-400/5 text-red-200'}`}>{canEditSelection ? `Puedes editar hasta ${formatDeadline(selectedCallup.deadline_at)}.` : `Lista bloqueada desde ${formatDeadline(selectedCallup.deadline_at)}.`}</p>}<div className="mt-5 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Jugadores seleccionados</p><p className={`mt-1 text-2xl font-bold ${selectedPlayers.length === rule.max_players ? 'text-[#b4ff45]' : 'text-white'}`}>{selectedPlayers.length} / {rule.max_players}</p></div><Users className="text-[#b4ff45]" size={25} /></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{eligiblePlayers.map((player) => { const checked = selectedPlayerIds.includes(player.player_id); const disabled = !canEditSelection || (!checked && selectedPlayers.length >= rule.max_players); return <label key={player.player_id} className={`flex items-center gap-3 rounded-[5px] border px-3 py-3 text-sm ${checked ? 'border-[#b4ff45]/50 bg-[#b4ff45]/5' : 'border-white/10'} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => setSelectedPlayerIds(checked ? selectedPlayerIds.filter((id) => id !== player.player_id) : [...selectedPlayerIds, player.player_id])} className="accent-[#b4ff45]" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{player.full_name}</span><span className="mt-1 block text-xs text-slate-500">#{player.shirt_number ?? '--'} · {player.position || 'Posición pendiente'}</span></span>{checked && <Check size={16} className="text-[#b4ff45]" />}</label> })}{!eligiblePlayers.length && <p className="text-sm text-slate-500">Este equipo todavía no tiene jugadores en su plantilla.</p>}</div>{canEditSelection && <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={onSaveDraft} disabled={saving} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#31556b] px-4 py-3 text-sm font-bold text-slate-200 disabled:opacity-50"><Save size={16} />Guardar borrador</button><button type="button" onClick={onSubmit} disabled={saving || selectedPlayers.length !== rule.max_players} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50"><Send size={16} />Enviar convocatoria</button></div>}{selectedCallup && selectedPlayers.length === rule.max_players && <div className="mt-6 rounded-[5px] border border-[#31556b] bg-[#07131e] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Jugador 13</p><p className="mt-1 text-sm text-slate-300">Marca quién no participará en esta jornada.</p></div><LockKeyhole className="text-[#b4ff45]" size={19} /></div><div className="mt-3 flex flex-col gap-3 sm:flex-row"><StyledSelect label="Jugador 13" value={inactivePlayerId} onChange={setInactivePlayerId} disabled={!canSelectInactivePlayer || selectedCallup.status === 'locked'} options={[{ value: '', label: 'Seleccionar jugador 13' }, ...selectedPlayers.map((player) => ({ value: player.player_id, label: player.full_name }))]} className="min-w-0 flex-1" /><button type="button" onClick={onMarkInactive} disabled={!inactivePlayerId || saving || !canSelectInactivePlayer || selectedCallup.status === 'locked'} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-[#b4ff45] px-4 py-3 text-sm font-bold text-[#dfffba] disabled:cursor-not-allowed disabled:opacity-50"><Check size={16} />Confirmar</button></div></div>}{isOwner && selectedCallup && (selectedCallup.status === 'locked' || new Date(selectedCallup.deadline_at).getTime() <= Date.now()) && <button type="button" onClick={onReopen} disabled={saving} className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#ffb45c]/50 px-4 py-3 text-sm font-bold text-[#ffd09b] disabled:opacity-50"><RotateCcw size={16} />Reabrir convocatoria</button>}</div>
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-[5px] border border-[#29485d] bg-[#07131e] p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 font-display text-3xl text-white">{value}</p></div>
}

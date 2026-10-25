'use client'

import { ChevronDown, Search, UserPlus, Users } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { StyledSelect } from './styled-select'
import { PlayerRoleIcon } from './player-role-icon'

type Division = { id: string; name: string; sort_order: number }
type Modality = { code: string; name: string }
type ModalityRule = { max_roster_size: number; players_on_field: number }
type TeamSummary = { id: string; name: string; athlonx_code: string | null; handle: string | null; divisionNames?: string[] }
type TournamentTeam = { id: string; name: string; logo_url: string | null; city: string | null; division_id: string; division_name: string; athlonx_code: string | null; handle: string | null; is_official: boolean; contact_phone: string | null }
type PlayerSummary = { id: string; full_name: string; shirt_number: number | null; position: string | null; user_id: string | null }
type RosterEntry = { team_id: string; player_id: string; user_id: string | null; full_name: string; shirt_number: number | null; position: string | null; is_substitute: boolean; is_official: boolean; claimed_player_id: string | null }

type Props = {
  teams: TournamentTeam[]
  rosters: RosterEntry[]
  divisions: Division[]
  availableTeams: TeamSummary[]
  availablePlayers: PlayerSummary[]
  modality: Modality | null
  modalityRule?: ModalityRule | null
  maxTeams?: number | null
  maxRoster?: number | null
  officialPlayerId: string
  canManage: boolean
  editMode: boolean
  currentUserId: string
  onAddTeam: (teamId: string, divisionId: string) => void
  onAddQuickTeam: (values: { name: string; logoUrl: string; phone: string; divisionId: string }) => void
  onRemoveTeam: (team: TournamentTeam) => void
  onAddQuickPlayer: (teamId: string, values: { name: string; shirtNumber: string; position: string }) => void
  onAddExistingPlayer: (teamId: string, playerId: string) => void
  onClaimGuestPlayer: (guestPlayerId: string, guestPlayerName: string) => void
  onNumberRequest: (request: { teamId: string; playerId: string; playerName: string; currentNumber: number | null }) => void
}

const normalize = (value: string) => value.trim().toLocaleLowerCase('es-PA')

const rugbySevensPositions = [
  'Pilar izquierdo',
  'Hooker',
  'Pilar derecho',
  'Medio scrum',
  'Apertura',
  'Centro',
  'Zaguero',
]

const rugbyFifteenPositions = [
  'Pilar izquierdo',
  'Hooker',
  'Pilar derecho',
  'Segunda línea izquierdo',
  'Segunda línea derecho',
  'Ala cerrado',
  'Ala abierto',
  'Octavo',
  'Medio scrum',
  'Apertura',
  'Ala izquierdo',
  'Centro interior',
  'Centro exterior',
  'Ala derecho',
  'Zaguero',
]

const footballPositions = [
  'Portero',
  'Defensa',
  'Lateral',
  'Mediocampista',
  'Extremo',
  'Delantero',
]

function getPositionOptions(modality: Modality | null) {
  const modalityKey = `${modality?.code || ''} ${modality?.name || ''}`.toLocaleLowerCase('es-PA')

  if (modalityKey.includes('futbol') || modalityKey.includes('fútbol')) {
    return footballPositions
  }

  if (modalityKey.includes('seven') || modalityKey.includes('sevens')) {
    return rugbySevensPositions
  }

  if (modalityKey.includes('xv') || modalityKey.includes('15') || modalityKey.includes('quince')) {
    return rugbyFifteenPositions
  }

  return ['Posición general']
}

export function QuickTournamentTeamsSection({ teams, rosters, divisions, availableTeams, availablePlayers, modality, modalityRule, maxTeams, maxRoster, officialPlayerId, canManage, editMode, currentUserId, onAddTeam, onAddQuickTeam, onRemoveTeam, onAddQuickPlayer, onAddExistingPlayer, onClaimGuestPlayer, onNumberRequest }: Props) {
  const [expanded, setExpanded] = useState<string[]>([])
  const [teamMode, setTeamMode] = useState<'existing' | 'new' | null>(null)
  const [teamQuery, setTeamQuery] = useState('')
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<Record<string, string>>({})
  const [divisionId, setDivisionId] = useState(divisions[0]?.id || '')
  const [teamName, setTeamName] = useState('')
  const [teamLogo, setTeamLogo] = useState('')
  const [teamPhone, setTeamPhone] = useState('')
  const [playerTeamId, setPlayerTeamId] = useState('')
  const [playerMode, setPlayerMode] = useState<'new' | 'existing'>('new')
  const [playerQuery, setPlayerQuery] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [playerNumber, setPlayerNumber] = useState('')
  const [playerPosition, setPlayerPosition] = useState('')
  const [pendingPlayerAction, setPendingPlayerAction] = useState<'new' | 'existing' | null>(null)
  const previousTeamIds = useRef<string[] | null>(null)

  const groupedTeams = teams.reduce<Array<TournamentTeam & { divisions: string[] }>>((groups, team) => {
    const current = groups.find((item) => item.id === team.id)

    if (current) {
      current.divisions = Array.from(new Set([...current.divisions, team.division_name]))
    } else {
      groups.push({ ...team, divisions: [team.division_name] })
    }

    return groups
  }, [])
  const filteredTeams = availableTeams.filter((team) => !selectedTeamIds.includes(team.id) && `${team.name} ${team.handle || ''} ${team.athlonx_code || ''}`.toLowerCase().includes(teamQuery.toLowerCase()))
  const filteredPlayers = availablePlayers.filter((player) => player.full_name.toLowerCase().includes(playerQuery.toLowerCase()))
  const positionOptions = getPositionOptions(modality)
  const inferredRule = modalityRule || (() => {
    const code = modality?.code || ''
    const sizes: Record<string, number> = {
      'futbol-5': 12,
      'futbol-sala': 12,
      'futbol-7': 16,
      'futbol-8': 18,
      'futbol-11': 23,
    }
    return sizes[code] ? { max_roster_size: sizes[code], players_on_field: 0 } : null
  })()
  const maxRosterSize = maxRoster || inferredRule?.max_roster_size || null
  const hasTeamCapacity = !maxTeams || groupedTeams.length < maxTeams

  function getCompatibleDivisions(team: TeamSummary) {
    return team.divisionNames?.length ? divisions.filter((division) => team.divisionNames?.some((name) => normalize(name) === normalize(division.name))) : divisions
  }

  useEffect(() => {
    const currentTeamIds = groupedTeams.map((team) => team.id)
    const previousIds = previousTeamIds.current

    if (previousIds) {
      const newlyAddedTeamIds = currentTeamIds.filter((id) => !previousIds.includes(id))

      if (newlyAddedTeamIds.length) {
        setExpanded((current) => Array.from(new Set([...current, ...newlyAddedTeamIds])))
      }
    }

    previousTeamIds.current = currentTeamIds
  }, [groupedTeams])

  function resetTeamForm() {
    setTeamMode(null)
    setTeamQuery('')
    setSelectedTeamIds([])
    setSelectedDivisionIds({})
  }

  function resetPlayerForm() {
    setPendingPlayerAction(null)
    setPlayerTeamId('')
    setPlayerQuery('')
    setPlayerId('')
    setPlayerName('')
    setPlayerNumber('')
    setPlayerPosition('')
  }

  function submitExistingTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    selectedTeamIds.forEach((teamId) => onAddTeam(teamId, selectedDivisionIds[teamId] || ''))
    resetTeamForm()
  }

  function submitNewTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onAddQuickTeam({
      name: teamName,
      logoUrl: teamLogo,
      phone: teamPhone,
      divisionId,
    })
    resetTeamForm()
    setTeamName('')
    setTeamLogo('')
    setTeamPhone('')
  }

  function submitNewPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (maxRosterSize && rosters.filter((player) => player.team_id === playerTeamId).length >= maxRosterSize) {
      return
    }
    setPendingPlayerAction('new')
  }

  function confirmNewPlayer() {
    onAddQuickPlayer(playerTeamId, {
      name: playerName,
      shirtNumber: playerNumber,
      position: playerPosition,
    })
    resetPlayerForm()
  }

  function submitExistingPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (maxRosterSize && rosters.filter((player) => player.team_id === playerTeamId).length >= maxRosterSize) {
      return
    }
    setPendingPlayerAction('existing')
  }

  function confirmExistingPlayer() {
    onAddExistingPlayer(playerTeamId, playerId)
    resetPlayerForm()
  }

  return (
    <div className="ax-v2 space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-muted)]">Torneo rápido · no oficial</p>
          <h2 className="font-display text-2xl uppercase leading-none tracking-[.02em] text-[var(--ax-text)] sm:text-[26px]">Equipos y plantillas</h2>
          <p className="mt-1.5 text-[13px] text-[var(--ax-muted)]">Combina equipos registrados con equipos temporales. Los perfiles temporales solo pertenecen a este torneo y pueden ser reclamados después.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-9 items-center rounded-[10px] border border-[var(--ax-line-strong)] px-3.5 text-[13px] font-bold text-[var(--ax-text-secondary)]">{maxTeams ? `${groupedTeams.length}/${maxTeams} equipos` : `${groupedTeams.length} equipos`}</span>
          {canManage && editMode && (
            <>
              <button type="button" disabled={!hasTeamCapacity} onClick={() => setTeamMode(teamMode === 'existing' ? null : 'existing')} className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--ax-accent-line)] px-3.5 py-2 text-[13px] font-bold text-[var(--ax-text)] transition hover:border-[var(--ax-accent-text)] disabled:cursor-not-allowed disabled:opacity-50">
                <Users size={15} />
                Invitar equipo
              </button>
              <button type="button" disabled={!hasTeamCapacity} onClick={() => setTeamMode(teamMode === 'new' ? null : 'new')} className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-[var(--ax-accent)] px-3.5 py-2 text-[13px] font-bold text-[var(--ax-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                <Users size={15} />
                Añadir equipo no registrado
              </button>
            </>
          )}
        </div>
      </div>

      {canManage && editMode && teamMode === 'existing' && (
        <form onSubmit={submitExistingTeam} className="rounded-[14px] border border-[var(--ax-accent-line)] bg-[var(--ax-surface)] p-4 sm:p-5 space-y-4">
          <label className="block">
            <p className="text-[13px] font-bold text-[var(--ax-text)]">Buscar equipo registrado para invitar</p>
            <div className="relative mt-2">
              <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-[var(--ax-muted)]" />
              <input value={teamQuery} onChange={(event) => setTeamQuery(event.target.value)} placeholder="Nombre, usuario o código AthlonX" className="w-full rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] py-3 pl-10 pr-3 text-[var(--ax-text)] outline-none focus:border-[var(--ax-accent-text)]" />
            </div>
            {teamQuery && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)]">
                {filteredTeams.map((team) => (
                  <button key={team.id} type="button" onClick={() => { setSelectedTeamIds((current) => current.includes(team.id) ? current : [...current, team.id]); setSelectedDivisionIds((current) => ({ ...current, [team.id]: getCompatibleDivisions(team)[0]?.id || '' })); setTeamQuery('') }} className="block w-full cursor-pointer px-3.5 py-2.5 text-left text-sm text-[var(--ax-text)] transition-[background-color] hover:bg-[var(--ax-hover)]">
                    {team.name}
                    <span className="ml-2 text-xs text-[var(--ax-muted)]">{team.athlonx_code || team.handle || ''}</span>
                  </button>
                ))}
                {!filteredTeams.length && <p className="px-3.5 py-3 text-sm text-[var(--ax-muted)]">No se encontraron equipos oficiales.</p>}
              </div>
            )}
          </label>
          {selectedTeamIds.length > 0 && <div className="space-y-3 rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] p-3">{selectedTeamIds.map((selectedId) => { const team = availableTeams.find((item) => item.id === selectedId); if (!team) return null; const options = getCompatibleDivisions(team); return <div key={selectedId} className="space-y-2.5"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-[var(--ax-text)]">{team.name}</span><button type="button" onClick={() => { setSelectedTeamIds((current) => current.filter((id) => id !== selectedId)); setSelectedDivisionIds((current) => { const next = { ...current }; delete next[selectedId]; return next }) }} className="cursor-pointer text-xs font-bold text-[var(--ax-danger-text)]">Quitar</button></div><StyledSelect label="División" value={selectedDivisionIds[selectedId] || ''} onChange={(value) => setSelectedDivisionIds((current) => ({ ...current, [selectedId]: value }))} options={[{ value: '', label: 'Seleccionar división' }, ...options.map((division) => ({ value: division.id, label: division.name }))]} required /></div> })}</div>}
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--ax-line)] pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setTeamMode(null)} className="rounded-[10px] border border-[var(--ax-line)] px-3.5 py-2 text-[13px] font-bold text-[var(--ax-text)] transition hover:bg-[var(--ax-hover)]">Cancelar</button>
            <button type="submit" disabled={!selectedTeamIds.length || selectedTeamIds.some((selectedId) => !selectedDivisionIds[selectedId])} className="rounded-[10px] bg-[var(--ax-accent)] px-3.5 py-2 text-[13px] font-bold text-[var(--ax-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">Enviar invitación</button>
          </div>
        </form>
      )}

      {canManage && editMode && teamMode === 'new' && (
        <form onSubmit={submitNewTeam} className="rounded-[14px] border border-[var(--ax-accent-line)] bg-[var(--ax-surface)] p-4 sm:p-5 space-y-4">
          <label className="block">
            <p className="text-[13px] font-bold text-[var(--ax-text)]">Nombre del equipo</p>
            <input required value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Equipo invitado" className="mt-2 w-full rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3.5 py-2.5 text-[var(--ax-text)] outline-none focus:border-[var(--ax-accent-text)]" />
          </label>
          <label className="block">
            <p className="text-[13px] font-bold text-[var(--ax-text)]">Teléfono</p>
            <input value={teamPhone} onChange={(event) => setTeamPhone(event.target.value)} placeholder="Opcional" className="mt-2 w-full rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3.5 py-2.5 text-[var(--ax-text)] outline-none focus:border-[var(--ax-accent-text)]" />
          </label>
          <label className="block">
            <p className="text-[13px] font-bold text-[var(--ax-text)]">Imagen del equipo</p>
            <input type="url" value={teamLogo} onChange={(event) => setTeamLogo(event.target.value)} placeholder="URL de imagen opcional" className="mt-2 w-full rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3.5 py-2.5 text-[var(--ax-text)] outline-none focus:border-[var(--ax-accent-text)]" />
          </label>
          <StyledSelect label="División" value={divisionId} onChange={setDivisionId} options={[{ value: '', label: 'Seleccionar división' }, ...divisions.map((division) => ({ value: division.id, label: division.name }))]} required />
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--ax-line)] pt-4 sm:flex-row sm:justify-between sm:items-center">
            <p className="text-[13px] text-[var(--ax-muted)]">Este equipo será temporal y no aparecerá como equipo oficial.</p>
            <button type="submit" disabled={!hasTeamCapacity} className="rounded-[10px] bg-[var(--ax-accent)] px-3.5 py-2 text-[13px] font-bold text-[var(--ax-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">Añadir equipo no registrado</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {groupedTeams.length ? groupedTeams.map((team) => {
          const isExpanded = expanded.includes(team.id)
          const teamRoster = rosters.filter((player) => player.team_id === team.id)
          const playerFormOpen = playerTeamId === team.id

          return (
            <div key={team.id} className="overflow-hidden rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface)]">
              <button type="button" aria-expanded={isExpanded} onClick={() => setExpanded((current) => current.includes(team.id) ? current.filter((id) => id !== team.id) : [...current, team.id])} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-[background-color] hover:bg-[var(--ax-hover)] sm:px-5 sm:py-4">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] font-bold text-[var(--ax-text)]`}>{team.logo_url ? <img src={team.logo_url} alt="" className="h-full w-full object-cover" /> : team.name.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-[var(--ax-text)]">{team.name}</p>
                    <span className={`rounded-[6px] px-2 py-1 text-[10px] font-bold uppercase ${team.is_official === false ? 'bg-amber-300/15 text-amber-300' : 'bg-[var(--ax-accent)]/15 text-[var(--ax-accent)]'}`}>{team.is_official === false ? 'No oficial' : 'Registrado'}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--ax-muted)]">{team.divisions.join(' · ')} · {team.athlonx_code || 'Temporal'} · {teamRoster.length} atletas</p>
                </div>
                <ChevronDown size={18} className={`shrink-0 text-[var(--ax-accent)] transition ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="border-t border-[var(--ax-line)] px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-muted)]">Plantilla del equipo</p>
                    {canManage && editMode && (!maxRosterSize || teamRoster.length < maxRosterSize) && <button type="button" onClick={() => { setPlayerTeamId(playerFormOpen ? '' : team.id); setPlayerMode('new') }} className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-[var(--ax-accent)] px-3.5 py-2 text-[13px] font-bold text-[var(--ax-bg)] transition hover:opacity-90"><UserPlus size={15} />Añadir jugador</button>}
                    {maxRosterSize && <span className="text-[13px] text-[var(--ax-muted)]">{teamRoster.length} / {maxRosterSize} jugadores</span>}
                    {inferredRule?.players_on_field ? <span className="text-[13px] text-[var(--ax-muted)]">En cancha: {inferredRule.players_on_field}</span> : null}
                  </div>

                  {playerFormOpen && (
                    <div className="mt-4 rounded-[10px] border border-[var(--ax-accent-line)] bg-[var(--ax-surface-raised)] p-4">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setPlayerMode('new')} className={`rounded-[8px] px-3 py-2 text-[13px] font-bold transition ${playerMode === 'new' ? 'bg-[var(--ax-accent)] text-[var(--ax-bg)]' : 'border border-[var(--ax-line)] text-[var(--ax-text)] hover:bg-[var(--ax-hover)]'}`}>Jugador nuevo</button>
                        <button type="button" onClick={() => setPlayerMode('existing')} className={`rounded-[8px] px-3 py-2 text-[13px] font-bold transition ${playerMode === 'existing' ? 'bg-[var(--ax-accent)] text-[var(--ax-bg)]' : 'border border-[var(--ax-line)] text-[var(--ax-text)] hover:bg-[var(--ax-hover)]'}`}>Jugador existente</button>
                      </div>

                      {playerMode === 'new' ? (
                        <form onSubmit={submitNewPlayer} className="mt-4 grid gap-3 sm:grid-cols-3">
                          <label className="block sm:col-span-3">
                            <p className="text-[13px] font-bold text-[var(--ax-text)]">Nombre completo</p>
                            <input required value={playerName} onChange={(event) => setPlayerName(event.target.value)} className="mt-2 w-full rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface)] px-3.5 py-2.5 text-[var(--ax-text)] outline-none focus:border-[var(--ax-accent-text)]" />
                          </label>
                          <label className="block">
                            <p className="text-[13px] font-bold text-[var(--ax-text)]">Número</p>
                            <input type="number" min="0" max="99" value={playerNumber} onChange={(event) => setPlayerNumber(event.target.value)} className="mt-2 w-full rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface)] px-3.5 py-2.5 text-[var(--ax-text)] outline-none focus:border-[var(--ax-accent-text)]" />
                          </label>
                          <StyledSelect label="Posición" value={playerPosition} onChange={setPlayerPosition} options={[{ value: '', label: 'Seleccionar posición' }, ...positionOptions.map((position) => ({ value: position, label: position }))]} required className="sm:col-span-2" />
                          <button type="submit" className="rounded-[10px] bg-[var(--ax-accent)] px-4 py-2.5 text-[13px] font-bold text-[var(--ax-bg)] transition hover:opacity-90 sm:col-span-3">Crear jugador temporal</button>
                          {pendingPlayerAction === 'new' && <div className="flex items-center justify-end gap-2 sm:col-span-3"><span className="mr-auto text-[13px] text-[var(--ax-muted)]">¿Confirmar creación del jugador?</span><button type="button" onClick={resetPlayerForm} className="rounded-[8px] border border-[var(--ax-line)] px-3 py-2 text-[13px] font-bold text-[var(--ax-text)] transition hover:bg-[var(--ax-hover)]">Cancelar</button><button type="button" onClick={confirmNewPlayer} className="rounded-[8px] bg-[var(--ax-accent)] px-3 py-2 text-[13px] font-bold text-[var(--ax-bg)] transition hover:opacity-90">Confirmar</button></div>}
                        </form>
                      ) : (
                        <form onSubmit={submitExistingPlayer} className="mt-4">
                          <label className="block">
                            <p className="text-[13px] font-bold text-[var(--ax-text)]">Buscar jugador registrado</p>
                            <div className="relative mt-2">
                              <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-[var(--ax-muted)]" />
                              <input required value={playerQuery} onChange={(event) => { setPlayerQuery(event.target.value); setPlayerId('') }} placeholder="Nombre del jugador" className="w-full rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface)] py-3 pl-10 pr-3 text-[var(--ax-text)] outline-none focus:border-[var(--ax-accent-text)]" />
                            </div>
                          </label>
                          {playerQuery && <div className="mt-2 max-h-48 overflow-y-auto rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface)]">{filteredPlayers.map((player) => <button key={player.id} type="button" onClick={() => { setPlayerId(player.id); setPlayerQuery(player.full_name) }} className="block w-full cursor-pointer px-3.5 py-2.5 text-left text-sm text-[var(--ax-text)] transition-[background-color] hover:bg-[var(--ax-hover)]">{player.full_name}<span className="ml-2 text-xs text-[var(--ax-muted)]">{player.position || 'Jugador'}</span></button>)}</div>}
                           <button type="submit" disabled={!playerId} className="mt-3 rounded-[10px] bg-[var(--ax-accent)] px-4 py-2.5 text-[13px] font-bold text-[var(--ax-bg)] transition hover:opacity-90 disabled:opacity-50">Agregar jugador registrado</button>
                           {pendingPlayerAction === 'existing' && <div className="mt-3 flex items-center justify-end gap-2"><span className="mr-auto text-[13px] text-[var(--ax-muted)]">¿Confirmar incorporación del jugador?</span><button type="button" onClick={resetPlayerForm} className="rounded-[8px] border border-[var(--ax-line)] px-3 py-2 text-[13px] font-bold text-[var(--ax-text)] transition hover:bg-[var(--ax-hover)]">Cancelar</button><button type="button" onClick={confirmExistingPlayer} className="rounded-[8px] bg-[var(--ax-accent)] px-3 py-2 text-[13px] font-bold text-[var(--ax-bg)] transition hover:opacity-90">Confirmar</button></div>}
                        </form>
                      )}
                    </div>
                  )}

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {teamRoster.map((player) => (
                      <div key={player.player_id} className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3.5 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[var(--ax-text)]">{player.full_name}</p>
                          <p className="mt-1 flex items-center gap-2 text-xs text-[var(--ax-muted)]"><PlayerRoleIcon position={player.position} />{player.position || 'Posición pendiente'} · {player.is_official ? 'Perfil registrado' : player.claimed_player_id ? 'Perfil reclamado' : 'Perfil temporal'}</p>
                        </div>
                        <span className="flex shrink-0 items-center gap-2 text-xs text-[var(--ax-muted)]">
                          #{player.shirt_number ?? '--'}
                          {!player.is_official && !player.claimed_player_id && officialPlayerId && <button type="button" onClick={() => onClaimGuestPlayer(player.player_id, player.full_name)} className="cursor-pointer rounded-[8px] border border-[var(--ax-accent)]/50 px-2 py-1 text-[13px] font-bold text-[var(--ax-accent)] transition hover:bg-[var(--ax-accent)]/10">Reclamar perfil</button>}
                          {player.user_id === currentUserId && <button type="button" onClick={() => onNumberRequest({ teamId: team.id, playerId: player.player_id, playerName: player.full_name, currentNumber: player.shirt_number })} className="cursor-pointer rounded-[8px] border border-[var(--ax-line)] px-2 py-1 text-[13px] font-bold text-[var(--ax-text)] transition hover:bg-[var(--ax-hover)]">Cambiar</button>}
                        </span>
                      </div>
                    ))}
                    {!teamRoster.length && <p className="text-sm text-[var(--ax-muted)]">Plantilla pendiente.</p>}
                  </div>
                </div>
              )}

              {canManage && editMode && <div className="border-t border-[var(--ax-line)] px-4 pb-4 pt-3 sm:px-5"><button type="button" onClick={() => onRemoveTeam(team)} className="rounded-[10px] border border-[var(--ax-danger-line)] px-3.5 py-2 text-[13px] font-bold text-[var(--ax-danger-text)] transition hover:bg-[var(--ax-danger-text)]/10">Expulsar del torneo</button></div>}
            </div>
          )
        }) : <p className="text-sm text-[var(--ax-muted)]">Todavía no hay equipos inscritos.</p>}
      </div>
    </div>
  )
}

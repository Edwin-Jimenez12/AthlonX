'use client'

import { ChevronDown, Search, Users, X } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, cx, EmptyState, FieldLabel, inputClass } from '../mi-equipo/ui'
import { StyledSelect } from '../styled-select'

type TournamentTeam = { id: string; name: string; logo_url: string | null; division_id: string; division_name: string; athlonx_code: string | null; handle: string | null; is_official: boolean; contact_phone: string | null; city: string | null }
type AvailableTeam = { id: string; name: string; athlonx_code: string | null; handle: string | null; divisionNames?: string[] }
type Division = { id: string; name: string }
type TournamentFixtureDate = { fixtureId: string; dateNumber: number; calendarDate: string | null }
type TournamentFixtureCallup = { id: string; fixture_id: string; team_id: string; division_id: string; status: string; deadline_at: string | null }
type TournamentFixtureCallupPlayer = { callup_id: string; player_id: string; state: string; shirt_number: number | null }
type RosterEntry = { team_id: string; division_id: string | null; division_name?: string | null; player_id: string; user_id: string | null; full_name: string; shirt_number: number | null; position: string | null; is_substitute: boolean; is_official: boolean; claimed_player_id: string | null }

function TeamCrest({ team, size = 32 }: { team: TournamentTeam; size?: 32 | 40 }) {
  return <span className={cx('flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] font-bold text-[var(--ax-text)]', size === 40 ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs')}>
    {team.logo_url ? <img src={team.logo_url} alt="" className="h-full w-full object-cover" /> : team.name.slice(0, 1).toUpperCase()}
  </span>
}

export function TournamentTeamsSection({
  teams,
  allDivisions,
  availableTeams,
  fixtureDates,
  callups,
  callupPlayers,
  rosters,
  canManage,
  editMode,
  onAddTeam,
  onRemoveTeam,
  renderTeamDetails,
}: {
  teams: TournamentTeam[]
  allDivisions: Division[]
  availableTeams: AvailableTeam[]
  fixtureDates: TournamentFixtureDate[]
  callups: TournamentFixtureCallup[]
  callupPlayers: TournamentFixtureCallupPlayer[]
  rosters: RosterEntry[]
  canManage: boolean
  editMode: boolean
  onAddTeam: (teamId: string, divisionId: string) => void
  onRemoveTeam: (team: TournamentTeam) => void
  renderTeamDetails: (team: TournamentTeam, roster: RosterEntry[]) => React.ReactNode
}) {
  const [expandedTeams, setExpandedTeams] = useState<string[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showRemove, setShowRemove] = useState(false)
  const [teamQuery, setTeamQuery] = useState('')
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<Record<string, string>>({})

  function normalizeDivisionName(name: string) {
    return name.toLowerCase().replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u')
  }

  function getCompatibleDivisions(team: AvailableTeam) {
    return team.divisionNames?.length ? allDivisions.filter((division) => team.divisionNames?.some((name) => normalizeDivisionName(name) === normalizeDivisionName(division.name))) : allDivisions
  }

  const filteredTeams = teamQuery
    ? availableTeams.filter((team) =>
        !teams.some((t) => t.id === team.id) &&
        (team.name.toLowerCase().includes(teamQuery.toLowerCase()) ||
          team.athlonx_code?.toLowerCase().includes(teamQuery.toLowerCase()) ||
          team.handle?.toLowerCase().includes(teamQuery.toLowerCase()))
      )
    : []

  const groupedTeams = teams.map((team) => ({ ...team, divisions: [team.division_name] }))

  if (!teams.length && !canManage) {
    return <div className="ax-v2"><Card><EmptyState icon={Users} title="Sin equipos inscritos" description="Los equipos aparecerán aquí cuando se inscriban en el torneo." /></Card></div>
  }

  return <div className="ax-v2 space-y-5">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--ax-muted)]">Participantes</p>
        <h2 className="font-display text-2xl uppercase leading-none tracking-[.02em] text-[var(--ax-text)] sm:text-[26px]">Equipos y plantillas</h2>
        <p className="mt-1.5 text-[13px] text-[var(--ax-muted)]">Despliega un equipo para ver la convocatoria de jugadores por fecha.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-9 items-center rounded-[10px] border border-[var(--ax-line-strong)] px-3.5 text-[13px] font-bold text-[var(--ax-text-secondary)]">{groupedTeams.length} equipo{groupedTeams.length !== 1 ? 's' : ''}</span>
        {canManage && editMode && <>
          <Button size="sm" icon={Users} onClick={() => { setShowAdd(!showAdd); setShowRemove(false) }} className={cx(showAdd && 'border-[var(--ax-accent-text)]')}>Invitar equipo</Button>
          <Button size="sm" icon={X} onClick={() => { setShowRemove(!showRemove); setShowAdd(false) }} variant="danger" className={cx(showRemove && 'border-[var(--ax-danger-text)]')}>Expulsar</Button>
        </>}
      </div>
    </div>

    {canManage && editMode && showAdd && <section className="ax-drop-in rounded-[14px] border border-[var(--ax-accent-line)] bg-[var(--ax-surface)] p-4 sm:p-5">
      <h3 className="font-display text-xl uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">Invitar equipo</h3>
      <p className="mt-1.5 text-[13px] text-[var(--ax-muted)]">Busca un equipo registrado y selecciona la división en que participará.</p>
      <form onSubmit={(event) => { event.preventDefault(); selectedTeamIds.forEach((teamId) => onAddTeam(teamId, selectedDivisionIds[teamId] || '')); setSelectedTeamIds([]); setSelectedDivisionIds({}); setTeamQuery(''); setShowAdd(false) }} className="mt-4 space-y-4">
        <label className="block">
          <FieldLabel>Buscar equipo registrado</FieldLabel>
          <div className="relative mt-2">
            <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-[var(--ax-muted)]" />
            <input value={teamQuery} onChange={(event) => setTeamQuery(event.target.value)} placeholder="Nombre, @usuario o código AthlonX" className={inputClass.replace('mt-', '')} />
          </div>
          {teamQuery && <div className="mt-2 max-h-48 overflow-y-auto rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)]">
            {filteredTeams.map((team) => <button key={team.id} type="button" onClick={() => { setSelectedTeamIds((current) => current.includes(team.id) ? current : [...current, team.id]); setSelectedDivisionIds((current) => ({ ...current, [team.id]: getCompatibleDivisions(team)[0]?.id || '' })); setTeamQuery('') }} className="block w-full cursor-pointer px-3.5 py-2.5 text-left text-sm transition-[background-color] hover:bg-[var(--ax-hover)]">{team.name}<span className="ml-2 text-xs text-[var(--ax-muted)]">{team.athlonx_code || team.handle || ''}</span></button>)}
            {!filteredTeams.length && <p className="px-3.5 py-3 text-sm text-[var(--ax-muted)]">No se encontraron equipos.</p>}
          </div>}
        </label>
        {selectedTeamIds.length > 0 && <div className="space-y-3 rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] p-3">
          {selectedTeamIds.map((selectedId) => { const team = availableTeams.find((item) => item.id === selectedId); if (!team) return null; const options = getCompatibleDivisions(team); return <div key={selectedId} className="space-y-2.5"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-[var(--ax-text)]">{team.name}</span><button type="button" onClick={() => { setSelectedTeamIds((current) => current.filter((id) => id !== selectedId)); setSelectedDivisionIds((current) => { const next = { ...current }; delete next[selectedId]; return next }) }} className="cursor-pointer text-xs font-bold text-[var(--ax-danger-text)]">Quitar</button></div><StyledSelect label="División" value={selectedDivisionIds[selectedId] || ''} onChange={(value) => setSelectedDivisionIds((current) => ({ ...current, [selectedId]: value }))} options={[{ value: '', label: 'Seleccionar división' }, ...options.map((division) => ({ value: division.id, label: division.name }))]} required /></div> })}
        </div>}
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--ax-line)] pt-4 sm:flex-row sm:justify-end">
          <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Button>
          <Button size="sm" variant="primary" disabled={!selectedTeamIds.length || selectedTeamIds.some((selectedId) => !selectedDivisionIds[selectedId])}>Enviar invitación</Button>
        </div>
      </form>
    </section>}

    {canManage && editMode && showRemove && <section className="ax-drop-in rounded-[14px] border border-[var(--ax-danger-line)] bg-[var(--ax-surface)] p-4 sm:p-5">
      <p className="text-[13px] text-[var(--ax-danger-text)]">Selecciona "Expulsar del torneo" en el equipo que deseas retirar.</p>
    </section>}

    <div className="space-y-3">
      {groupedTeams.length ? groupedTeams.map((team) => {
        const teamKey = `${team.id}-${team.division_id}`
        const expanded = expandedTeams.includes(teamKey)
        const teamRoster = rosters.filter((player) => player.team_id === team.id && (!player.division_id || player.division_id === team.division_id || normalizeDivisionName(player.division_name || '') === normalizeDivisionName(team.division_name)))
        return <Card key={teamKey} className="overflow-hidden p-0">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpandedTeams((current) => current.includes(teamKey) ? current.filter((id) => id !== teamKey) : [...current, teamKey])}
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-[background-color] hover:bg-[var(--ax-hover)] sm:px-5 sm:py-4"
          >
            <TeamCrest team={team} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[var(--ax-text)]">{team.name}</p>
              <p className="mt-0.5 text-xs text-[var(--ax-muted)]">{team.divisions.join(' · ')} · {team.athlonx_code || 'Código pendiente'}</p>
            </div>
            <ChevronDown size={18} className={cx('shrink-0 text-[var(--ax-accent-text)] transition', expanded ? 'rotate-180' : '')} />
          </button>
          {showRemove && canManage && editMode && <div className="border-t border-[var(--ax-line)] px-4 py-3 sm:px-5"><Button size="sm" variant="danger" onClick={() => onRemoveTeam(team)}>Expulsar del torneo</Button></div>}
          {expanded && <div className="border-t border-[var(--ax-line)] px-4 py-4 sm:px-5">
            {renderTeamDetails(team, teamRoster)}
          </div>}
        </Card>
      }) : <Card><EmptyState icon={Users} title="Sin equipos inscritos" description="Invita equipos registrados para que participen en el torneo." /></Card>}
    </div>
  </div>
}

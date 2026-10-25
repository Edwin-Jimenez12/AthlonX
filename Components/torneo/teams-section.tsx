'use client'

import { ChevronDown, Search, Users, X } from 'lucide-react'
import { useState } from 'react'
import { Button, cx, EmptyState } from '../mi-equipo/ui'
import { StyledSelect } from '../styled-select'

type TournamentTeam = { id: string; name: string; logo_url: string | null; division_id: string; division_name: string; athlonx_code: string | null; handle: string | null; is_official: boolean; contact_phone: string | null; city: string | null }
type AvailableTeam = { id: string; name: string; athlonx_code: string | null; handle: string | null; divisionNames?: string[] }
type Division = { id: string; name: string }
type TournamentFixtureDate = { fixtureId: string; dateNumber: number; calendarDate: string | null }
type TournamentFixtureCallup = { id: string; fixture_id: string; team_id: string; division_id: string; status: string; deadline_at: string | null }
type TournamentFixtureCallupPlayer = { callup_id: string; player_id: string; state: string; shirt_number: number | null }
type RosterEntry = { team_id: string; division_id: string | null; division_name?: string | null; player_id: string; user_id: string | null; full_name: string; shirt_number: number | null; position: string | null; is_substitute: boolean; is_official: boolean; claimed_player_id: string | null }

const axField = 'rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3 py-2.5 text-sm text-[var(--ax-text)] outline-none focus:border-[var(--ax-accent-text)]'

function TeamCrest({ name, logoUrl = null, size = 40 }: { name: string; logoUrl?: string | null; size?: 32 | 40 }) {
  return <span className={cx('flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] font-bold text-[var(--ax-text)]', size === 40 ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs')}>
    {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}
  </span>
}

function StatusPill({ tone, children }: { tone: 'accent' | 'warning' | 'muted'; children: React.ReactNode }) {
  const tones = {
    accent: 'border-[var(--ax-accent-line)] bg-[var(--ax-accent)]/10 text-[var(--ax-accent-text)]',
    warning: 'border-amber-300/40 bg-amber-300/10 text-amber-300',
    muted: 'border-[var(--ax-line-strong)] text-[var(--ax-muted)]',
  }
  return <span className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-[6px] border px-2.5 py-1 text-[11px] font-bold', tones[tone])}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />{children}
  </span>
}

export function TournamentTeamsSection({
  teams,
  allDivisions,
  availableTeams,
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
  const [showInvite, setShowInvite] = useState(false)
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteDivisionId, setInviteDivisionId] = useState('')
  const [divisionFilter, setDivisionFilter] = useState('')
  const [listQuery, setListQuery] = useState('')

  function normalizeDivisionName(name: string) {
    return name.toLowerCase().replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u')
  }

  function isCompatible(team: AvailableTeam, divisionId: string) {
    const division = allDivisions.find((item) => item.id === divisionId)
    if (!division) return false
    return !team.divisionNames?.length || team.divisionNames.some((name) => normalizeDivisionName(name) === normalizeDivisionName(division.name))
  }

  const invitable = inviteQuery
    ? availableTeams.filter((team) =>
        !teams.some((t) => t.id === team.id) &&
        isCompatible(team, inviteDivisionId) &&
        (team.name.toLowerCase().includes(inviteQuery.toLowerCase()) ||
          team.athlonx_code?.toLowerCase().includes(inviteQuery.toLowerCase()) ||
          team.handle?.toLowerCase().includes(inviteQuery.toLowerCase()))
      )
    : []

  const sections = allDivisions
    .filter((division) => teams.some((team) => team.division_id === division.id))
    .filter((division) => !divisionFilter || division.id === divisionFilter)

  if (!teams.length && !canManage) {
    return <div className="ax-v2"><EmptyState icon={Users} title="Sin equipos inscritos" description="Los equipos aparecerán aquí cuando se inscriban en el torneo." /></div>
  }

  return <div className="ax-v2 space-y-5">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <label className="relative w-full lg:max-w-[280px]">
        <Search size={16} className="pointer-events-none absolute left-3 top-3 text-[var(--ax-muted)]" />
        <input value={listQuery} onChange={(event) => setListQuery(event.target.value)} placeholder="Buscar equipo o jugador" className={`${axField} h-10 w-full pl-9`} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setDivisionFilter('')} className={cx('inline-flex h-9 cursor-pointer items-center rounded-[10px] border px-3.5 text-[13px] font-bold transition', !divisionFilter ? 'border-[var(--ax-accent)] bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'border-[var(--ax-line)] text-[var(--ax-text-secondary)] hover:border-[var(--ax-accent-line)]')}>Todas</button>
        {allDivisions.filter((division) => teams.some((team) => team.division_id === division.id)).map((division) => <button key={division.id} type="button" onClick={() => setDivisionFilter(division.id)} className={cx('inline-flex h-9 cursor-pointer items-center rounded-[10px] border px-3.5 text-[13px] font-bold transition', divisionFilter === division.id ? 'border-[var(--ax-accent)] bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'border-[var(--ax-line)] text-[var(--ax-text-secondary)] hover:border-[var(--ax-accent-line)]')}>{division.name}</button>)}
      </div>
      <div className="flex items-center justify-between gap-3 lg:ml-auto">
        <span className="text-[13px] text-[var(--ax-muted)]">{teams.length} equipo{teams.length !== 1 ? 's' : ''}</span>
        {canManage && editMode && <Button size="sm" icon={Users} onClick={() => setShowInvite(!showInvite)}>Invitar equipo</Button>}
      </div>
    </div>

    {canManage && editMode && showInvite && <section className="ax-drop-in rounded-[20px] border border-[var(--ax-accent-line)] bg-[var(--ax-surface)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">Invitar equipos</h3>
          <p className="mt-2 text-[13px] text-[var(--ax-muted)]">Torneo oficial: solo equipos registrados en AthlonX. Reciben la invitación en sus notificaciones.</p>
        </div>
        <button type="button" onClick={() => { setShowInvite(false); setInviteQuery('') }} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] px-2 text-[13px] font-bold text-[var(--ax-muted)] transition hover:text-[var(--ax-text)]"><X size={15} />Cerrar</button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px] md:items-end">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-3 text-[var(--ax-muted)]" />
          <input value={inviteQuery} onChange={(event) => setInviteQuery(event.target.value)} placeholder="Nombre o código del equipo" className={`${axField} h-10 w-full pl-9`} />
        </div>
        <StyledSelect label="División" value={inviteDivisionId} onChange={setInviteDivisionId} options={[{ value: '', label: 'Seleccionar división' }, ...allDivisions.map((division) => ({ value: division.id, label: division.name }))]} required />
      </div>
      {inviteQuery && <div className="mt-4 divide-y divide-[var(--ax-line)] rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)]">
        {invitable.map((team) => <div key={team.id} className="flex items-center gap-3 px-4 py-3">
          <TeamCrest name={team.name} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--ax-text)]">{team.name}</p>
            <p className="mt-0.5 text-xs text-[var(--ax-muted)]">{team.athlonx_code || team.handle || ''}</p>
          </div>
          <Button size="sm" variant="ghost" disabled={!inviteDivisionId} onClick={() => { onAddTeam(team.id, inviteDivisionId); setInviteQuery('') }}>Invitar</Button>
        </div>)}
        {!invitable.length && <p className="px-4 py-4 text-sm text-[var(--ax-muted)]">{inviteDivisionId ? 'No se encontraron equipos compatibles.' : 'Selecciona una división para ver equipos compatibles.'}</p>}
      </div>}
    </section>}

    {sections.map((division) => {
      const query = listQuery.trim().toLowerCase()
      const divisionTeams = teams.filter((team) => team.division_id === division.id).filter((team) => {
        if (!query) return true
        const roster = rosters.filter((player) => player.team_id === team.id)
        return [team.name, team.athlonx_code, team.handle].some((value) => value?.toLowerCase().includes(query)) || roster.some((player) => player.full_name.toLowerCase().includes(query))
      })
      if (!divisionTeams.length) return null
      return <section key={division.id} className="rounded-[20px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-5 sm:p-6">
        <h3 className="font-display text-2xl uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">{division.name}</h3>
        <p className="mt-1.5 text-[13px] text-[var(--ax-muted)]">{divisionTeams.length} equipo{divisionTeams.length !== 1 ? 's' : ''}</p>
        <div className="mt-4 divide-y divide-[var(--ax-line)]">
          {divisionTeams.map((team) => {
            const teamKey = `${team.id}-${team.division_id}`
            const expanded = expandedTeams.includes(teamKey)
            const teamRoster = rosters.filter((player) => player.team_id === team.id && (!player.division_id || player.division_id === team.division_id || normalizeDivisionName(player.division_name || '') === normalizeDivisionName(team.division_name)))
            return <div key={teamKey}>
              <button type="button" aria-expanded={expanded} onClick={() => setExpandedTeams((current) => current.includes(teamKey) ? current.filter((id) => id !== teamKey) : [...current, teamKey])} className="flex w-full cursor-pointer items-center gap-3 py-3.5 text-left transition-[background-color] hover:bg-[var(--ax-hover)] sm:py-4">
                <TeamCrest name={team.name} logoUrl={team.logo_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[var(--ax-text)]">{team.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--ax-muted)]">{team.athlonx_code || 'Código pendiente'}{team.city ? ` · ${team.city}` : ''}</p>
                </div>
                <span className="hidden text-[13px] text-[var(--ax-muted)] sm:inline">{teamRoster.length} jugador{teamRoster.length !== 1 ? 'es' : ''}</span>
                <StatusPill tone="accent">Aceptada</StatusPill>
                <ChevronDown size={18} className={cx('shrink-0 text-[var(--ax-accent-text)] transition', expanded ? 'rotate-180' : '')} />
              </button>
              {expanded && <div className="mb-4 overflow-hidden rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)]">
                <div className="grid grid-cols-[40px_1fr_120px_110px] gap-3 border-b border-[var(--ax-line)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-[var(--ax-muted)]">
                  <span>#</span><span>Jugador</span><span className="text-right sm:text-left">Posición</span><span>Estado</span>
                </div>
                {teamRoster.length ? teamRoster.map((player) => <div key={player.player_id} className="grid grid-cols-[40px_1fr_120px_110px] items-center gap-3 border-b border-[var(--ax-line)] px-4 py-3 last:border-b-0">
                  <span className="text-sm text-[var(--ax-muted)]">{player.shirt_number ?? '—'}</span>
                  <span className="truncate text-sm font-semibold text-[var(--ax-text)]">{player.full_name}</span>
                  <span className="truncate text-right text-sm text-[var(--ax-muted)] sm:text-left">{player.position || 'Sin posición'}</span>
                  <span><StatusPill tone={player.shirt_number == null ? 'warning' : 'accent'}>{player.shirt_number == null ? 'Sin dorsal' : 'Activo'}</StatusPill></span>
                </div>) : <p className="px-4 py-4 text-sm text-[var(--ax-muted)]">Plantilla pendiente.</p>}
                <div className="px-4 py-3">{renderTeamDetails(team, teamRoster)}</div>
                {canManage && editMode && <div className="border-t border-[var(--ax-line)] px-4 py-3"><Button size="sm" variant="danger" onClick={() => onRemoveTeam(team)}>Expulsar del torneo</Button></div>}
              </div>}
            </div>
          })}
        </div>
      </section>
    })}

    {!sections.length && <EmptyState icon={Users} title="Sin equipos inscritos" description="Invita equipos registrados para que participen en el torneo." />}
  </div>
}

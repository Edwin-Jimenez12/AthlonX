'use client'

import { AlertTriangle, ArrowRightLeft, Check, ChevronDown, Hash, Layers3, Pencil, Settings2, Trash2, User, UserPlus, Users, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { teamPositionOptions } from '../../lib/team-positions'
import { InvitePanel } from './invite-panel'
import { MemberRoleEditor, RemoveConfirm } from './member-role-editor'
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, FieldLabel, IconButton, MenuItem, Notice, RowMenu, SearchField, Segment, Select, SkeletonRows, cx, inputClass } from './ui'
import { DIVISION_OPTIONS, RosterPlayer, TeamDivision, TeamMember, announceTeamChange, sortPlayers } from './use-team-roster'

const VISIBLE_ROWS = 8
const NO_DIVISION = 'sin-division'

type RowPanel = { key: string; kind: 'details' | 'edit' | 'move' | 'remove' } | null

export function TeamRosterCard({ teamId, canManage, discipline, disciplineCode, divisions, players, members, loading, error, reload }: { teamId: string; canManage: boolean; discipline?: string | null; disciplineCode?: string | null; divisions: TeamDivision[]; players: RosterPlayer[]; members: TeamMember[]; loading: boolean; error: string; reload: () => Promise<void> }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [panel, setPanel] = useState<'invite' | 'divisions' | null>(null)
  const [rowPanel, setRowPanel] = useState<RowPanel>(null)
  const [busyKey, setBusyKey] = useState('')
  const [message, setMessage] = useState('')

  const unassigned = players.filter((player) => !player.divisionId || !divisions.some((division) => division.id === player.divisionId))
  const tabs = useMemo(() => [...divisions, ...(unassigned.length ? [{ id: NO_DIVISION, name: 'Sin división' }] : [])], [divisions, unassigned.length])
  const activeId = tabs.some((tab) => tab.id === selectedId) ? selectedId! : tabs[0]?.id ?? null
  const activeTab = tabs.find((tab) => tab.id === activeId) || null
  const inTab = (player: RosterPlayer) => activeId === NO_DIVISION ? unassigned.includes(player) : player.divisionId === activeId
  const countFor = (id: string) => players.filter((player) => !player.pending && (id === NO_DIVISION ? unassigned.includes(player) : player.divisionId === id)).length
  const activeCount = players.filter((player) => !player.pending).length

  const normalized = query.trim().replace(/^#/, '').toLowerCase()
  const rows = sortPlayers(players.filter(inTab).filter((player) => !normalized || [player.fullName, player.username, player.shirtNumber?.toString()].some((value) => value?.toLowerCase().includes(normalized))))
  const visible = expanded || normalized ? rows : rows.slice(0, VISIBLE_ROWS)

  async function move(player: RosterPlayer, divisionId: string) {
    if (!supabase || !player.playerId) return
    setBusyKey(player.key)
    const { error: rpcError } = await supabase.rpc('set_team_player_division', { p_team_id: teamId, p_player_id: player.playerId, p_division_id: divisionId })
    setBusyKey('')
    if (rpcError) { setMessage(rpcError.message); return }
    setRowPanel(null)
    setMessage(`${player.fullName} ahora está en ${divisions.find((division) => division.id === divisionId)?.name}.`)
    await reload()
    announceTeamChange()
  }

  async function remove(player: RosterPlayer) {
    if (!supabase) return
    setBusyKey(player.key)
    const { error: rpcError } = player.source === 'roster' && player.playerId
      ? await supabase.rpc('remove_team_player_from_division', { p_team_id: teamId, p_player_id: player.playerId })
      : await supabase.rpc('remove_team_member_role_from_division', { p_team_id: teamId, p_user_id: player.userId, p_role: 'atleta', p_division_id: player.divisionId })
    setBusyKey('')
    if (rpcError) { setMessage(rpcError.message); return }
    setRowPanel(null)
    setMessage(`${player.fullName} ya no forma parte de la plantilla.`)
    await reload()
    announceTeamChange()
  }

  // El dorsal y la posición se guardan en players: solo aplica a jugadores con fila en team_players.
  const canEditDetails = (player: RosterPlayer) => canManage && !player.pending && player.source === 'roster' && Boolean(player.playerId)
  const positions = teamPositionOptions(discipline, disciplineCode)

  function menuFor(player: RosterPlayer): MenuItem[] {
    const items: MenuItem[] = []
    if (player.profileId) items.push({ label: 'Ver perfil', icon: User, href: `/perfil/${player.profileId}` })
    if (!canManage || player.pending) return items
    if (canEditDetails(player)) items.push({ label: 'Editar dorsal y posición', icon: Hash, onSelect: () => setRowPanel({ key: player.key, kind: 'details' }) })
    if (player.member) items.push({ label: 'Editar rol y cargo', icon: Pencil, onSelect: () => setRowPanel({ key: player.key, kind: 'edit' }) })
    if (player.source === 'roster' && divisions.length > 1) items.push({ label: 'Mover a otra división', icon: ArrowRightLeft, onSelect: () => setRowPanel({ key: player.key, kind: 'move' }) })
    items.push({ label: 'Quitar del equipo', icon: Trash2, tone: 'danger', separated: true, onSelect: () => setRowPanel({ key: player.key, kind: 'remove' }) })
    return items
  }

  const actions = canManage && <>
    <span className="hidden sm:contents">
      <Button variant="ghost" size="sm" icon={Settings2} onClick={() => setPanel(panel === 'divisions' ? null : 'divisions')} aria-expanded={panel === 'divisions'}>Divisiones</Button>
      <Button variant="secondary" size="sm" icon={UserPlus} onClick={() => setPanel(panel === 'invite' ? null : 'invite')} disabled={!divisions.length} aria-expanded={panel === 'invite'}>Añadir jugador</Button>
    </span>
    <span className="contents sm:hidden">
      <IconButton icon={UserPlus} label="Añadir jugador" onClick={() => setPanel(panel === 'invite' ? null : 'invite')} disabled={!divisions.length} />
      <IconButton icon={Settings2} label="Gestionar divisiones" onClick={() => setPanel(panel === 'divisions' ? null : 'divisions')} />
    </span>
  </>

  return <Card labelledBy="plantilla-titulo" className="space-y-4 sm:space-y-5">
    <CardHeader id="plantilla-titulo" size="lg" title="Plantilla" subtitle={loading ? 'Cargando plantilla…' : `${activeCount} ${activeCount === 1 ? 'jugador' : 'jugadores'} en ${divisions.length} ${divisions.length === 1 ? 'división' : 'divisiones'}`} actions={actions} />

    {panel === 'divisions' && <DivisionManager teamId={teamId} divisions={divisions} countFor={countFor} onClose={() => setPanel(null)} onSaved={async (text) => { setMessage(text); setPanel(null); await reload() }} />}
    {panel === 'invite' && <InvitePanel teamId={teamId} divisions={divisions} members={members} title="Añadir jugador" roles={['atleta']} defaultRole="atleta" defaultDivisionId={activeId !== NO_DIVISION ? activeId : null} onClose={() => setPanel(null)} onSent={() => void reload()} />}

    {loading ? <SkeletonRows count={4} />
      : error && !players.length ? <Notice tone="danger" icon={AlertTriangle}>{error}</Notice>
      : !tabs.length ? <EmptyState icon={Layers3} title="El equipo aún no tiene divisiones" description={canManage ? 'Crea al menos una división para organizar la plantilla e invitar jugadores.' : 'Un directivo debe configurar las divisiones del equipo.'} action={canManage && <Button variant="secondary" size="sm" icon={Settings2} onClick={() => setPanel('divisions')}>Configurar divisiones</Button>} />
      : <>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Divisiones" className="ax-scroll-x -mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {tabs.map((tab) => <Segment key={tab.id} active={tab.id === activeId} label={tab.name} count={countFor(tab.id)} onClick={() => { setSelectedId(tab.id); setExpanded(false); setRowPanel(null) }} />)}
          </div>
          <SearchField value={query} onChange={setQuery} label="Buscar en la plantilla" placeholder="Nombre o dorsal" className="lg:w-[220px] lg:shrink-0" />
        </div>

        {rows.length ? <div>
          <div aria-hidden="true" className="hidden h-9 grid-cols-[28px_minmax(0,1fr)_140px_176px_36px] items-center gap-4 rounded-lg bg-[var(--ax-surface-raised)] px-4 text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--ax-muted)] md:grid">
            <span>#</span><span>Jugador</span><span>Posición</span><span>Estado</span><span />
          </div>
          <ul aria-label={`Jugadores de ${activeTab?.name}`}>
            {visible.map((player) => {
              const open = rowPanel?.key === player.key ? rowPanel.kind : null
              return <li key={player.key} className="border-b border-[var(--ax-line)] py-1 md:py-0">
                <PlayerRow player={player} onEditNumber={canEditDetails(player) ? () => setRowPanel({ key: player.key, kind: 'details' }) : undefined} menu={<RowMenu label={`Acciones para ${player.fullName}`} items={menuFor(player)} />} />
                {open === 'details' && <PlayerDetailsEditor teamId={teamId} player={player} positions={positions} onClose={() => setRowPanel(null)} onSaved={async (text) => { setRowPanel(null); setMessage(text); await reload(); announceTeamChange() }} />}
                {open === 'edit' && player.member && <MemberRoleEditor teamId={teamId} roles={members.filter((member) => member.user_id === player.userId)} onClose={() => setRowPanel(null)} />}
                {open === 'move' && <MovePanel player={player} divisions={divisions} busy={busyKey === player.key} onCancel={() => setRowPanel(null)} onMove={(divisionId) => void move(player, divisionId)} />}
                {open === 'remove' && <RemoveConfirm name={player.fullName} detail="Dejará de aparecer en la plantilla y en las próximas convocatorias." busy={busyKey === player.key} onCancel={() => setRowPanel(null)} onConfirm={() => void remove(player)} />}
                {open && <div className="h-2" />}
              </li>
            })}
          </ul>
          <div className="flex items-center justify-between gap-3 pt-4">
            <p className="text-[13px] text-[var(--ax-muted)]">{normalized ? `${rows.length} ${rows.length === 1 ? 'resultado' : 'resultados'}` : <>Mostrando {visible.length} de {rows.length}<span className="hidden sm:inline"> en {activeTab?.name}</span></>}</p>
            {!normalized && rows.length > VISIBLE_ROWS && <button type="button" onClick={() => setExpanded((current) => !current)} className="inline-flex cursor-pointer items-center gap-1 text-[13px] font-semibold text-[var(--ax-accent-text)] hover:underline">
              {expanded ? 'Ver menos' : 'Ver todos'}<ChevronDown size={16} aria-hidden="true" className={cx('transition-transform duration-150', expanded ? 'rotate-180' : '-rotate-90')} />
            </button>}
          </div>
        </div>
          : normalized ? <p className="rounded-[14px] border border-dashed border-[var(--ax-line-strong)] p-5 text-center text-[13px] text-[var(--ax-muted)]">Nadie en {activeTab?.name} coincide con “{query.trim()}”.</p>
          : <EmptyState icon={Users} title={`${activeTab?.name} aún no tiene jugadores`} description="Invita a jugadores registrados en AthlonX; aparecerán aquí cuando acepten la invitación." action={canManage && activeId !== NO_DIVISION && <Button variant="secondary" size="sm" icon={UserPlus} onClick={() => setPanel('invite')}>Invitar jugadores</Button>} />}
      </>}

    {message && <Notice tone="neutral" icon={Users} action={<button type="button" onClick={() => setMessage('')} aria-label="Cerrar aviso" className="cursor-pointer text-[var(--ax-muted)] hover:text-[var(--ax-text)]"><X size={15} /></button>}>{message}</Notice>}
  </Card>
}

function PlayerRow({ player, menu, onEditNumber }: { player: RosterPlayer; menu: React.ReactNode; onEditNumber?: () => void }) {
  const status = player.pending ? <Badge tone="warning"><span className="md:hidden">Pendiente</span><span className="hidden md:inline">Invitación pendiente</span></Badge> : <Badge tone="success">Activo</Badge>
  const name = player.profileId ? <Link href={`/perfil/${player.profileId}`} className="truncate font-semibold text-[var(--ax-text)] decoration-[var(--ax-accent-text)] underline-offset-4 hover:underline">{player.fullName}</Link> : <span className="truncate font-semibold text-[var(--ax-text)]">{player.fullName}</span>
  return <div className="flex min-h-[60px] items-center gap-3 rounded-[10px] py-2 transition-colors duration-150 hover:bg-[var(--ax-hover)] md:grid md:grid-cols-[28px_minmax(0,1fr)_140px_176px_36px] md:gap-4 md:px-4 md:py-0">
    {onEditNumber
      ? <button type="button" onClick={onEditNumber} aria-label={player.shirtNumber === null ? `Asignar dorsal a ${player.fullName}` : `Cambiar dorsal ${player.shirtNumber} de ${player.fullName}`} title={player.shirtNumber === null ? 'Asignar dorsal' : 'Cambiar dorsal'} className="-ml-1.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold tabular-nums text-[var(--ax-muted)] transition-colors duration-150 hover:bg-[var(--ax-surface-raised)] hover:text-[var(--ax-text)] md:ml-[-6px]">{player.shirtNumber ?? '—'}</button>
      : <span className="w-[22px] shrink-0 text-sm font-semibold tabular-nums text-[var(--ax-muted)] md:w-auto">{player.shirtNumber ?? '—'}</span>}
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar name={player.fullName} src={player.avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="flex text-[15px] md:text-sm">{name}</p>
        <p className="hidden truncate text-xs text-[var(--ax-muted)] md:block">{player.username ? `@${player.username}` : 'Perfil registrado'}</p>
        <div className="mt-1 flex items-center gap-2 md:hidden">
          <span className="truncate text-[13px] text-[var(--ax-text-secondary)]">{player.position || 'Sin posición'}</span>
          {status}
        </div>
      </div>
    </div>
    <span className={cx('hidden truncate text-sm md:block', player.position ? 'text-[var(--ax-text-secondary)]' : 'text-[var(--ax-muted)]')}>{player.position || 'Sin asignar'}</span>
    <span className="hidden md:block">{status}</span>
    {menu}
  </div>
}

// Dorsal y posición del jugador (panel inline, mismo lenguaje que el editor de rol).
function PlayerDetailsEditor({ teamId, player, positions, onClose, onSaved }: { teamId: string; player: RosterPlayer; positions: string[]; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [number, setNumber] = useState(player.shirtNumber === null ? '' : String(player.shirtNumber))
  const [position, setPosition] = useState(player.position || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const parsed = number.trim() === '' ? null : Number(number)
  const invalid = parsed !== null && (!Number.isInteger(parsed) || parsed < 0 || parsed > 99)
  const changed = parsed !== player.shirtNumber || (position || null) !== (player.position || null)
  const options = [{ value: '', label: 'Sin asignar' }, ...[...new Set([...positions, ...(player.position ? [player.position] : [])])].map((item) => ({ value: item, label: item }))]

  async function save() {
    if (!supabase || !player.playerId || invalid) return
    setSaving(true)
    setError('')
    const { error: rpcError } = await supabase.rpc('set_team_player_details', { p_team_id: teamId, p_player_id: player.playerId, p_shirt_number: parsed, p_position: position || null })
    setSaving(false)
    if (rpcError) {
      const missing = rpcError.code === 'PGRST202' || /set_team_player_details/i.test(rpcError.message)
      setError(missing ? 'Falta aplicar supabase/team-player-details-migration.sql en Supabase para poder editar dorsales.' : rpcError.message)
      return
    }
    await onSaved(parsed === null ? `${player.fullName} quedó sin dorsal.` : `${player.fullName} ahora lleva el dorsal ${parsed}.`)
  }

  return <div className="ax-drop-in mt-2 space-y-3 rounded-[14px] border border-[var(--ax-line-strong)] bg-[var(--ax-surface-sunken)] p-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-[var(--ax-text)]">Dorsal y posición de {player.fullName}</p>
      <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--ax-muted)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]"><X size={16} /></button>
    </div>
    <form onSubmit={(event) => { event.preventDefault(); void save() }} className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-end">
      <label className="block">
        <FieldLabel>Dorsal</FieldLabel>
        <input autoFocus type="number" inputMode="numeric" min={0} max={99} step={1} value={number} onChange={(event) => setNumber(event.target.value.slice(0, 2))} placeholder="0–99" aria-invalid={invalid} className={cx(inputClass, 'tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none', invalid && 'border-[var(--ax-danger-line)]')} />
      </label>
      {options.length > 1
        ? <Select label="Posición" value={position} onChange={setPosition} options={options} />
        : <label className="block min-w-0"><FieldLabel>Posición</FieldLabel><input value={position} onChange={(event) => setPosition(event.target.value)} placeholder="Ej. Delantero" className={inputClass} /></label>}
      <Button type="submit" variant="primary" icon={Check} disabled={!changed || invalid || saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
    </form>
    {invalid && <p className="text-[13px] text-[var(--ax-danger-text)]">El dorsal debe ser un número entero entre 0 y 99.</p>}
    {error && <Notice tone="danger" icon={AlertTriangle}>{error}</Notice>}
  </div>
}

function MovePanel({ player, divisions, busy, onCancel, onMove }: { player: RosterPlayer; divisions: TeamDivision[]; busy: boolean; onCancel: () => void; onMove: (divisionId: string) => void }) {
  const others = divisions.filter((division) => division.id !== player.divisionId)
  return <div className="ax-drop-in mt-2 rounded-[14px] border border-[var(--ax-line-strong)] bg-[var(--ax-surface-sunken)] p-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-[var(--ax-text)]">Mover a {player.fullName} a…</p>
      <button type="button" onClick={onCancel} aria-label="Cancelar" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--ax-muted)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]"><X size={16} /></button>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      {others.map((division) => <Segment key={division.id} active={false} label={division.name} disabled={busy} onClick={() => onMove(division.id)} />)}
    </div>
  </div>
}

// Gestión de divisiones (no tenía diseño en Figma: sigue el mismo estilo de los paneles inline).
function DivisionManager({ teamId, divisions, countFor, onClose, onSaved }: { teamId: string; divisions: TeamDivision[]; countFor: (id: string) => number; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [draft, setDraft] = useState(() => new Set(divisions.map((division) => division.name)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const removedWithPlayers = divisions.filter((division) => !draft.has(division.name) && countFor(division.id) > 0)
  const changed = draft.size !== divisions.length || divisions.some((division) => !draft.has(division.name))

  function toggle(name: string) {
    setDraft((current) => { const next = new Set(current); if (next.has(name)) next.delete(name); else next.add(name); return next })
  }

  async function save() {
    if (!supabase) return
    setSaving(true)
    setError('')
    const { error: rpcError } = await supabase.rpc('save_team_divisions', { p_team_id: teamId, p_divisions: DIVISION_OPTIONS.filter((name) => draft.has(name)) })
    setSaving(false)
    if (rpcError) { setError(rpcError.message); return }
    await onSaved('Las divisiones del equipo se guardaron.')
  }

  return <div className="ax-drop-in rounded-[14px] border border-[var(--ax-line-strong)] bg-[var(--ax-surface-sunken)] p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[15px] font-semibold text-[var(--ax-text)]">Divisiones del equipo</p>
        <p className="mt-0.5 text-[13px] text-[var(--ax-muted)]">Activa las divisiones en las que compite el equipo.</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--ax-muted)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]"><X size={16} /></button>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      {DIVISION_OPTIONS.map((name) => <Segment key={name} active={draft.has(name)} label={name} onClick={() => toggle(name)} />)}
    </div>
    {removedWithPlayers.length > 0 && <div className="mt-3"><Notice tone="warning" icon={AlertTriangle}>Vas a quitar {removedWithPlayers.map((division) => division.name).join(' y ')}, que tiene jugadores. Sus jugadores quedarán sin división.</Notice></div>}
    {error && <div className="mt-3"><Notice tone="danger" icon={X}>{error}</Notice></div>}
    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button variant="ghost" onClick={onClose}>Cancelar</Button>
      <Button variant="primary" onClick={() => void save()} disabled={!changed || saving}>{saving ? 'Guardando…' : 'Guardar divisiones'}</Button>
    </div>
  </div>
}

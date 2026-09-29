'use client'

import { Edit3, Layers3, Plus, Save, Search, Send, Trash2, UserPlus, X } from 'lucide-react'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const DIVISION_OPTIONS = [
  { value: 'Primera división' },
  { value: 'Segunda división' },
  { value: 'Femenina' },
]

type MemberRole = 'owner' | 'atleta' | 'entrenador' | 'staff' | 'directivo'
type EditableDivisionRole = 'atleta' | 'entrenador' | 'staff'

type TeamDivision = { id: string; name: string }

type TeamPlayer = {
  player_id: string
  division_id: string | null
  player: { id: string; full_name: string; shirt_number: number | null; position: string | null; photo_url?: string | null }
}

type DivisionMember = {
  user_id: string
  full_name: string
  avatar_url: string | null
  username: string | null
  athlonx_code: string | null
  role: MemberRole
  role_label: string | null
  division_id: string | null
  division_name: string | null
}

type Candidate = { id: string; full_name: string; avatar_url: string | null; username: string | null; athlonx_code: string | null }

const roleNames: Record<MemberRole, string> = {
  owner: 'Propietario',
  atleta: 'Jugador',
  entrenador: 'Entrenador',
  staff: 'Staff',
  directivo: 'Directivo',
}

export function TeamDivisionSettings({ teamId }: { teamId?: string }) {
  const [divisions, setDivisions] = useState<TeamDivision[]>([])
  const [players, setPlayers] = useState<TeamPlayer[]>([])
  const [members, setMembers] = useState<DivisionMember[]>([])
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [showDivisionOptions, setShowDivisionOptions] = useState(false)
  const [showPlayerForm, setShowPlayerForm] = useState(false)
  const [showStaffForm, setShowStaffForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionKey, setActionKey] = useState('')
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState('')

  async function loadData(preferredDivisionName?: string) {
    if (!supabase || !teamId) return false

    setLoading(true)
    const [{ data, error }, playerResult, { data: memberData, error: memberError }] = await Promise.all([
      // The AthlonX code is optional until the division-code migration is applied.
      // Loading the division identity must not block saving the division itself.
      supabase.from('team_division_catalog').select('id, name').eq('team_id', teamId).order('name'),
      supabase.from('team_players').select('player_id, division_id, players(id, full_name, shirt_number, position, photo_url)').eq('team_id', teamId),
      supabase.rpc('get_team_members_for_manager', { p_team_id: teamId }),
    ])

    let playerData = playerResult.data
    let playerError = playerResult.error
    if (playerError?.message.toLowerCase().includes('team_players.division_id')) {
      const fallback = await supabase.from('team_players').select('player_id, players(id, full_name, shirt_number, position, photo_url)').eq('team_id', teamId)
      playerData = fallback.data ? fallback.data.map((row) => ({ ...row, division_id: null })) : null
      playerError = fallback.error
    }
    setLoading(false)

    if (error || playerError) {
      setMessage(error?.message || playerError?.message || memberError?.message || 'No se pudo cargar la plantilla.')
      return false
    }

    const availableNames = new Set(DIVISION_OPTIONS.map((division) => division.value.toLowerCase()))
    const nextDivisions = ((data ?? []) as TeamDivision[]).filter((division) => availableNames.has(division.name.trim().toLowerCase()))
    const nextPlayers = ((playerData ?? []) as Array<{ player_id: string; division_id: string | null; players: TeamPlayer['player'] | TeamPlayer['player'][] | null }>)
      .map((row) => ({ player_id: row.player_id, division_id: row.division_id, player: Array.isArray(row.players) ? row.players[0] : row.players }))
      .filter((row): row is TeamPlayer => Boolean(row.player))
    const nextMembers = ((memberData ?? []) as DivisionMember[]).filter((member) => member.role !== 'owner' && member.role !== 'directivo')

    setDivisions(nextDivisions)
    setPlayers(nextPlayers)
    setMembers(memberError ? [] : nextMembers)
    setSelectedDivisionId((current) => {
      if (current && nextDivisions.some((division) => division.id === current)) return current
      const preferred = preferredDivisionName?.trim().toLowerCase()
      return nextDivisions.find((division) => division.name.trim().toLowerCase() === preferred)?.id || nextDivisions[0]?.id || null
    })
    setDirty(false)
    if (memberError) setMessage(memberError.message)
    return true
  }

  useEffect(() => {
    void loadData()
    const refreshMembers = () => void loadData()
    window.addEventListener('athlonx-team-members-change', refreshMembers)
    return () => window.removeEventListener('athlonx-team-members-change', refreshMembers)
  }, [teamId])

  const availableOptions = useMemo(
    () => DIVISION_OPTIONS.filter((option) => !divisions.some((division) => division.name === option.value)),
    [divisions],
  )
  const selectedDivision = divisions.find((division) => division.id === selectedDivisionId) || null

  function addDivision(name: string) {
    if (divisions.some((division) => division.name === name)) return
    const nextDivision = { id: `new-${name}`, name }
    setDivisions((current) => [...current, nextDivision])
    setSelectedDivisionId(nextDivision.id)
    setShowDivisionOptions(false)
    setShowPlayerForm(false)
    setShowStaffForm(false)
    setDirty(true)
    setMessage('La división se añadió al borrador. Guarda para crearla.')
  }

  function removeDivision(divisionId: string) {
    const division = divisions.find((item) => item.id === divisionId)
    if (!division || !window.confirm(`¿Seguro que deseas eliminar la división "${division.name}"?`)) return

    const remaining = divisions.filter((division) => division.id !== divisionId)
    setDivisions(remaining)
    setSelectedDivisionId((current) => current === divisionId ? remaining[0]?.id || null : current)
    setDirty(true)
    setShowPlayerForm(false)
    setShowStaffForm(false)
    setMessage('La división se quitó del borrador. Guarda para confirmar.')
  }

  async function saveDivisions() {
    if (!supabase || !teamId) return
    if (!dirty) {
      setEditing(false)
      setShowPlayerForm(false)
      setShowStaffForm(false)
      setShowDivisionOptions(false)
      setMessage('No hay cambios de divisiones para guardar.')
      return
    }
    const selectedDivisionName = selectedDivision?.name
    setSaving(true)
    setMessage('')
    const { error } = await supabase.rpc('save_team_divisions', { p_team_id: teamId, p_divisions: divisions.map((division) => division.name) })
    setSaving(false)
    if (error) return setMessage(error.message)
    const loaded = await loadData(selectedDivisionName)
    if (!loaded) return
    setEditing(false)
    setShowPlayerForm(false)
    setShowStaffForm(false)
    setShowDivisionOptions(false)
    setMessage('Los cambios de la división se guardaron correctamente.')
  }

  function toggleInviteForm(kind: 'player' | 'staff') {
    if (selectedDivision?.id.startsWith('new-')) {
      setMessage('Guarda la división primero. Después podrás buscar y enviar invitaciones.')
      return
    }
    setMessage('')
    if (kind === 'player') setShowPlayerForm((current) => !current)
    else setShowStaffForm((current) => !current)
  }

  async function removeLegacyPlayer(playerId: string) {
    if (!supabase || !teamId) return
    if (!window.confirm('¿Seguro que deseas quitar este jugador de la plantilla?')) return
    setActionKey(`player-${playerId}`)
    const { error } = await supabase.rpc('remove_team_player_from_division', { p_team_id: teamId, p_player_id: playerId })
    setActionKey('')
    if (error) return setMessage(error.message)
    await loadData()
    window.dispatchEvent(new CustomEvent('athlonx-team-members-change'))
  }

  async function removeMember(member: DivisionMember) {
    if (!supabase || !teamId) return
    if (!window.confirm(`¿Seguro que deseas quitar a "${member.full_name}" de este rol?`)) return
    setActionKey(`member-${member.user_id}-${member.role}`)
    const { error } = await supabase.rpc('remove_team_member_role', { p_team_id: teamId, p_user_id: member.user_id, p_role: member.role })
    setActionKey('')
    if (error) return setMessage(error.message)
    await loadData()
    window.dispatchEvent(new CustomEvent('athlonx-team-members-change'))
  }

  function editStaff(member: DivisionMember) {
    window.dispatchEvent(new CustomEvent('athlonx-team-members-edit', { detail: { teamId, userId: member.user_id } }))
    setMessage(`Puedes editar el rol de ${member.full_name} en la sección Miembros del equipo.`)
  }

  function divisionPlayers(divisionId: string) {
    return {
      legacyPlayers: players.filter((row) => row.division_id === divisionId),
      invitedPlayers: members.filter((member) => member.role === 'atleta' && member.division_id === divisionId),
      staff: members.filter((member) => (member.role === 'entrenador' || member.role === 'staff') && (member.division_id === divisionId || member.division_id === null)),
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Perfil deportivo</p>
          <h2 className="mt-2 font-display text-3xl uppercase">Jugadores y cuerpo técnico</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Consulta la plantilla por división y administra los jugadores y las personas que forman parte del cuerpo técnico.</p>
        </div>
        <Layers3 className="text-[#b4ff45]" size={26} />
      </div>

      {!teamId ? <p className="mt-7 rounded-2xl border border-dashed border-[#31556b] p-5 text-sm text-slate-400">Este equipo todavía no tiene una cuenta vinculada.</p> : loading ? <p className="mt-7 rounded-2xl border border-dashed border-[#31556b] p-5 text-sm text-slate-400">Cargando plantilla...</p> : <>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {divisions.map((division) => <div key={division.id} className={`flex items-center overflow-hidden rounded-full border ${selectedDivisionId === division.id ? 'border-[#b4ff45] bg-[#b4ff45] text-[#07131e]' : 'border-[#31556b] bg-[#e8e8e8] text-[#07131e]'}`}><button type="button" onClick={() => setSelectedDivisionId(division.id)} className="cursor-pointer px-4 py-1.5 text-xs font-bold">{division.name}</button>{editing && <button type="button" onClick={() => removeDivision(division.id)} aria-label={`Eliminar ${division.name}`} className="cursor-pointer border-l border-[#07131e]/20 px-2 py-1.5 hover:bg-red-300"><Trash2 size={13} /></button>}</div>)}
          {editing && availableOptions.length > 0 && <div className="relative"><button type="button" onClick={() => setShowDivisionOptions((current) => !current)} className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#31556b] px-4 py-1.5 text-xs font-bold text-slate-200 hover:border-[#b4ff45] hover:text-[#b4ff45]"><Plus size={13} />Añadir</button>{showDivisionOptions && <div className="absolute left-0 top-9 z-20 w-56 overflow-hidden rounded-xl border border-[#31556b] bg-[#0d2232] p-2 shadow-2xl">{availableOptions.map((option) => <button key={option.value} type="button" onClick={() => addDivision(option.value)} className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-200 hover:bg-[#b4ff45]/15 hover:text-[#b4ff45]">{option.value}</button>)}</div>}</div>}
          {editing ? <button type="button" onClick={() => void saveDivisions()} disabled={saving} className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-full bg-[#b4ff45] px-4 py-1.5 text-xs font-bold text-[#07131e] disabled:cursor-wait disabled:opacity-60"><Save size={13} />{saving ? 'Guardando...' : 'Guardar'}</button> : <button type="button" onClick={() => setEditing(true)} className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-full bg-[#b4ff45] px-4 py-1.5 text-xs font-bold text-[#07131e]"><Edit3 size={13} />Editar</button>}
        </div>

        {selectedDivision ? (() => {
          const { legacyPlayers, invitedPlayers, staff } = divisionPlayers(selectedDivision.id)
          return <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,.8fr)]"><section className="min-w-0 rounded-2xl border border-[#1f4057] bg-[#07131e] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-display text-2xl uppercase leading-none">Plantilla de jugadores</p><h3 className="mt-1 font-display text-2xl uppercase text-slate-200">{selectedDivision.name}</h3></div>{editing && <button type="button" onClick={() => toggleInviteForm('player')} className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-[#b4ff45] px-3 py-1.5 text-xs font-bold text-[#07131e]"><UserPlus size={14} />Añadir</button>}</div>{editing && showPlayerForm && !selectedDivision.id.startsWith('new-') && <DivisionInviteForm teamId={teamId} divisionId={selectedDivision.id} members={members} role="atleta" onSent={() => void loadData(selectedDivision.name)} />}{selectedDivision.id.startsWith('new-') ? <p className="mt-5 rounded-xl border border-dashed border-[#31556b] p-4 text-sm text-slate-400">Guarda la división para habilitar su plantilla.</p> : <DivisionPlayers editing={editing} legacyPlayers={legacyPlayers} invitedPlayers={invitedPlayers} actionKey={actionKey} onRemoveLegacy={(playerId) => void removeLegacyPlayer(playerId)} onRemoveMember={(member) => void removeMember(member)} />}</section><section className="rounded-2xl border border-[#1f4057] bg-[#07131e] p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-display text-2xl uppercase leading-none">Cuerpo técnico</p><h3 className="mt-1 font-display text-2xl uppercase text-slate-200">{selectedDivision.name}</h3></div>{editing && <button type="button" onClick={() => toggleInviteForm('staff')} className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-[#b4ff45] px-3 py-1.5 text-xs font-bold text-[#07131e]"><UserPlus size={14} />Añadir</button>}</div>{editing && showStaffForm && !selectedDivision.id.startsWith('new-') && <DivisionInviteForm teamId={teamId} divisionId={selectedDivision.id} members={members} role="entrenador" onSent={() => void loadData(selectedDivision.name)} />}{selectedDivision.id.startsWith('new-') ? <p className="mt-5 rounded-xl border border-dashed border-[#31556b] p-4 text-sm text-slate-400">Guarda la división para añadir cuerpo técnico.</p> : <DivisionStaff editing={editing} staff={staff} actionKey={actionKey} onEdit={editStaff} onRemove={(member) => void removeMember(member)} />}</section></div>
        })() : <div className="mt-5 rounded-2xl border border-dashed border-[#31556b] p-6 text-sm text-slate-400">No hay divisiones configuradas. Activa `Editar` y pulsa `Añadir`.</div>}
        {message && <p role="status" className="mt-4 rounded-xl bg-[#07131e] px-4 py-3 text-sm font-semibold text-slate-300">{message}</p>}
      </>}
    </section>
  )
}

function DivisionPlayers({ editing, legacyPlayers, invitedPlayers, actionKey, onRemoveLegacy, onRemoveMember }: { editing: boolean; legacyPlayers: TeamPlayer[]; invitedPlayers: DivisionMember[]; actionKey: string; onRemoveLegacy: (playerId: string) => void; onRemoveMember: (member: DivisionMember) => void }) {
  if (!legacyPlayers.length && !invitedPlayers.length) return <p className="mt-5 rounded-xl border border-dashed border-[#31556b] p-4 text-sm text-slate-500">Aún no hay jugadores en esta división.</p>
  return <div className="mt-5 grid gap-3 sm:grid-cols-2">{legacyPlayers.map((row) => <PlayerCard key={`legacy-${row.player_id}`} name={row.player.full_name} detail={row.player.position || 'Posición pendiente'} profileId={row.player.id} editing={editing} removing={actionKey === `player-${row.player_id}`} onRemove={() => onRemoveLegacy(row.player_id)} />)}{invitedPlayers.map((member) => <PlayerCard key={`member-${member.user_id}`} name={member.full_name} detail={member.role_label || 'Jugador'} profileId={member.user_id} avatarUrl={member.avatar_url} editing={editing} removing={actionKey === `member-${member.user_id}-${member.role}`} onRemove={() => onRemoveMember(member)} />)}</div>
}

function PlayerCard({ name, detail, profileId, avatarUrl, editing, removing, onRemove }: { name: string; detail: string; profileId: string; avatarUrl?: string | null; editing: boolean; removing: boolean; onRemove: () => void }) {
  return <article className="relative rounded-xl border border-[#1f4057] bg-[#0b1d2c] p-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#b4ff45] font-bold text-[#07131e]">{avatarUrl ? <img src={avatarUrl} alt={`Foto de ${name}`} className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-xs font-bold text-white">{name}</p><p className="mt-1 truncate text-[11px] text-slate-400">#-- · {detail}</p></div></div><Link href={`/dashboard/perfil/${profileId}`} className="mt-3 inline-block text-[11px] font-bold text-[#b4ff45] hover:text-white">Visitar perfil</Link>{editing && <button type="button" onClick={onRemove} disabled={removing} aria-label={`Eliminar ${name}`} className="absolute bottom-3 right-3 cursor-pointer rounded-md p-1.5 text-slate-500 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"><Trash2 size={14} /></button>}</article>
}

function DivisionStaff({ editing, staff, actionKey, onEdit, onRemove }: { editing: boolean; staff: DivisionMember[]; actionKey: string; onEdit: (member: DivisionMember) => void; onRemove: (member: DivisionMember) => void }) {
  if (!staff.length) return <p className="mt-5 rounded-xl border border-dashed border-[#31556b] p-4 text-sm text-slate-500">Aún no hay cuerpo técnico en esta división.</p>
  return <div className="mt-5 space-y-3">{staff.map((member) => <article key={`${member.user_id}-${member.role}`} className="rounded-xl border border-[#1f4057] bg-[#0b1d2c] p-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#b4ff45] font-bold text-[#07131e]">{member.avatar_url ? <img src={member.avatar_url} alt={`Foto de ${member.full_name}`} className="h-full w-full object-cover" /> : member.full_name.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-xs font-bold text-white">{member.full_name}</p><p className="truncate text-[11px] text-slate-400">{member.username ? `@${member.username}` : member.athlonx_code || 'Perfil registrado'}</p></div></div><div className="mt-3 flex flex-wrap gap-1.5"><span className="rounded border border-[#31556b] px-2 py-1 text-[10px] font-semibold text-slate-300">{roleNames[member.role]}</span>{member.role_label && member.role_label !== roleNames[member.role] && <span className="rounded border border-[#31556b] px-2 py-1 text-[10px] font-semibold text-slate-300">{member.role_label}</span>}</div>{editing && <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3"><button type="button" onClick={() => onEdit(member)} className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white"><Edit3 size={13} />Editar</button><button type="button" onClick={() => onRemove(member)} disabled={actionKey === `member-${member.user_id}-${member.role}`} className="cursor-pointer text-slate-500 hover:text-red-300 disabled:opacity-50"><Trash2 size={14} /></button></div>}</article>)}</div>
}

function DivisionInviteForm({ teamId, divisionId, members, role, onSent }: { teamId: string; divisionId: string; members: DivisionMember[]; role: EditableDivisionRole; onSent: () => void }) {
  const [selectedRole, setSelectedRole] = useState<EditableDivisionRole>(role)
  const [roleLabelValue, setRoleLabelValue] = useState(roleNames[role])
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [searchReady, setSearchReady] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { setRoleLabelValue(roleNames[selectedRole]) }, [selectedRole])

  useEffect(() => {
    let active = true
    async function searchMembers() {
      if (!supabase || selected || !query.trim()) { setCandidates([]); setSearchReady(false); return }
      setSearchLoading(true)
      const { data, error } = await supabase.rpc('search_invitable_team_members', { p_query: query.trim(), p_limit: 20 })
      if (!active) return
      setSearchLoading(false)
      if (error) { setMessage(error.message); setCandidates([]); setSearchReady(false); return }
      const existing = new Set(members.filter((member) => member.role === selectedRole && member.division_id === divisionId).map((member) => member.user_id))
      setCandidates(((data ?? []) as Candidate[]).filter((candidate) => !existing.has(candidate.id)))
      setSearchReady(true)
    }
    void searchMembers()
    return () => { active = false }
  }, [query, selected, selectedRole, divisionId, members])

  async function sendInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !selected) { setMessage('Selecciona una persona para enviar la invitación.'); return }
    setSending(true)
    setMessage('')
    const { error } = await supabase.rpc('create_team_division_member_invitation', { p_target_user_id: selected.id, p_source_team_id: teamId, p_division_id: divisionId, p_role: selectedRole, p_role_label: roleLabelValue })
    setSending(false)
    if (error) { setMessage(error.message); return }
    setSelected(null)
    setQuery('')
    setCandidates([])
    setMessage('Invitación enviada. La persona deberá aceptarla desde Notificaciones.')
    onSent()
  }

  return <form onSubmit={(event) => void sendInvitation(event)} className="mt-4 rounded-xl border border-[#b4ff45]/25 bg-[#b4ff45]/5 p-3"><div className="grid gap-3 sm:grid-cols-[150px_1fr]">{role !== 'atleta' && <label className="text-xs font-bold text-slate-300">Rol<select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as EditableDivisionRole)} className="mt-1 h-10 w-full rounded-lg border border-[#31556b] bg-[#071d2c] px-2 text-xs text-white outline-none focus:border-[#b4ff45]"><option value="entrenador">Entrenador</option><option value="staff">Staff</option></select></label>}<label className="text-xs font-bold text-slate-300">{role === 'atleta' ? 'Buscar jugador' : 'Cargo o etiqueta'}{role !== 'atleta' && <input value={roleLabelValue} onChange={(event) => setRoleLabelValue(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#31556b] bg-[#071d2c] px-2 text-xs text-white outline-none focus:border-[#b4ff45]" placeholder="Ej. Head Coach" />}<div className="relative mt-1"><div className="flex items-center gap-2 rounded-lg border border-[#31556b] bg-[#071d2c] px-2 py-2 focus-within:border-[#b4ff45]"><Search size={15} className="shrink-0 text-[#b4ff45]" /><input value={selected?.full_name || query} onChange={(event) => { setSelected(null); setQuery(event.target.value); setMessage('') }} className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500" placeholder="Nombre, @usuario o código" />{selected && <button type="button" onClick={() => setSelected(null)} aria-label="Quitar selección" className="cursor-pointer text-slate-400"><X size={14} /></button>}</div>{!selected && searchReady && <div className="absolute left-0 right-0 top-11 z-30 overflow-hidden rounded-lg border border-[#31556b] bg-[#0d1d2b] shadow-2xl">{searchLoading ? <p className="p-3 text-xs text-slate-500">Buscando...</p> : candidates.length ? candidates.map((candidate) => <button key={candidate.id} type="button" onClick={() => { setSelected(candidate); setQuery(''); setCandidates([]) }} className="flex w-full cursor-pointer items-center gap-2 p-2 text-left hover:bg-white/5"><span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded bg-[#b4ff45] text-xs font-bold text-[#07131e]">{candidate.avatar_url ? <img src={candidate.avatar_url} alt="" className="h-full w-full object-cover" /> : candidate.full_name.slice(0, 1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-xs font-semibold text-white">{candidate.full_name}</span><span className="block truncate text-[10px] text-slate-400">{candidate.username ? `@${candidate.username}` : 'Sin usuario'} · {candidate.athlonx_code || 'Código pendiente'}</span></span></button>) : <p className="p-3 text-xs text-slate-500">No hay personas disponibles.</p>}</div>}</div></label></div>{selected && <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-[#d8ffb6]">Seleccionado: <strong>{selected.full_name}</strong></p><button type="submit" disabled={sending} className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#b4ff45] px-3 py-2 text-xs font-bold text-[#07131e] disabled:opacity-60"><Send size={13} />{sending ? 'Enviando...' : 'Enviar invitación'}</button></div>}{message && <p role="status" className="mt-2 text-[11px] font-semibold text-slate-300">{message}</p>}</form>
}

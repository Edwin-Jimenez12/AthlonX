'use client'

import { Edit3, Search, Send, Trash2, Users, X } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { StyledSelect } from './styled-select'

type MemberRole = 'owner' | 'atleta' | 'entrenador' | 'staff' | 'directivo'

type Candidate = {
  id: string
  full_name: string
  avatar_url: string | null
  username: string | null
  athlonx_code: string | null
}

type RosterMember = {
  user_id: string
  full_name: string
  avatar_url: string | null
  username: string | null
  athlonx_code: string | null
  role: MemberRole
  role_label: string | null
}

type RosterPerson = {
  user_id: string
  full_name: string
  avatar_url: string | null
  username: string | null
  athlonx_code: string | null
  roles: RosterMember[]
}

const roleNames: Record<MemberRole, string> = {
  owner: 'Propietario',
  atleta: 'Atleta',
  entrenador: 'Entrenador',
  staff: 'Staff',
  directivo: 'Directivo',
}

const editableRoles: MemberRole[] = ['atleta', 'entrenador', 'staff', 'directivo']

function memberKey(member: Pick<RosterMember, 'user_id' | 'role'>) {
  return `${member.user_id}-${member.role}`
}

function roleLabel(role: MemberRole, label: string | null) {
  return label || roleNames[role]
}

function groupRosterByPerson(roster: RosterMember[]) {
  const people = new Map<string, RosterPerson>()

  roster.forEach((member) => {
    const current = people.get(member.user_id)

    if (current) {
      current.roles.push(member)
      return
    }

    people.set(member.user_id, {
      user_id: member.user_id,
      full_name: member.full_name,
      avatar_url: member.avatar_url,
      username: member.username,
      athlonx_code: member.athlonx_code,
      roles: [member],
    })
  })

  return Array.from(people.values())
}

export function TeamRosterPanel({ teamId }: { teamId?: string }) {
  const [roster, setRoster] = useState<RosterMember[]>([])
  const [adding, setAdding] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadRoster() {
    if (!supabase || !teamId) {
      setRoster([])
      return
    }

    const { data, error } = await supabase.rpc('get_team_members_for_manager', {
      p_team_id: teamId,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    const uniqueRoster = Array.from(
      new Map(
        ((data ?? []) as RosterMember[]).map((member) => [memberKey(member), member]),
      ).values(),
    )
    setRoster(uniqueRoster)
  }

  useEffect(() => {
    void loadRoster()

    const refreshMembers = () => void loadRoster()
    const openMemberEditor = (event: Event) => {
      const detail = (event as CustomEvent<{ teamId?: string; userId?: string }>).detail
      if (detail?.teamId === teamId && detail.userId) {
        setAdding(false)
        setEditingUserId(detail.userId)
      }
    }

    window.addEventListener('athlonx-team-members-change', refreshMembers)
    window.addEventListener('athlonx-team-members-edit', openMemberEditor)
    return () => {
      window.removeEventListener('athlonx-team-members-change', refreshMembers)
      window.removeEventListener('athlonx-team-members-edit', openMemberEditor)
    }
  }, [teamId])

  function startAdding() {
    setAdding((current) => !current)
    setEditingUserId(null)
    setMessage('')
  }

  async function updateRole(member: RosterMember, newRole: MemberRole, newRoleLabel: string) {
    if (!supabase || !teamId) return

    setLoading(true)
    setMessage('')
    const { error } = await supabase.rpc('update_team_member_role', {
      p_team_id: teamId,
      p_user_id: member.user_id,
      p_current_role: member.role,
      p_new_role: newRole,
      p_role_label: newRoleLabel,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setEditingUserId(null)
    setMessage('El rol de la persona fue actualizado.')
    await loadRoster()
    window.dispatchEvent(new CustomEvent('athlonx-team-members-change'))
    setLoading(false)
  }

  async function removeRole(member: RosterMember) {
    if (!supabase || !teamId || member.role === 'owner') return
    const confirmed = window.confirm(`¿Seguro deseas eliminar a "${member.full_name}"?`)
    if (!confirmed) return

    setLoading(true)
    setMessage('')
    const { error } = await supabase.rpc('remove_team_member_role', {
      p_team_id: teamId,
      p_user_id: member.user_id,
      p_role: member.role,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    if (editingUserId === member.user_id) {
      setEditingUserId(null)
    }
    setMessage('La persona fue eliminada de ese rol.')
    await loadRoster()
    window.dispatchEvent(new CustomEvent('athlonx-team-members-change'))
    setLoading(false)
  }

  const people = groupRosterByPerson(roster)

  return (
    <section id="plantilla" className="rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Gestión de personas</p>
          <h3 className="mt-2 font-display text-3xl uppercase">Miembros del equipo</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Una misma persona puede aparecer en la plantilla, el cuerpo técnico y la directiva con roles independientes.
          </p>
        </div>
        <Users className="text-[#b4ff45]" size={27} />
      </div>

      {!teamId ? (
        <div className="mt-7 rounded-2xl border border-dashed border-[#31556b] p-5 text-sm text-slate-400">
          Este equipo todavía no tiene una cuenta vinculada para gestionar sus miembros.
        </div>
      ) : (
        <div className="mt-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#29485d] bg-[#07131e] p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Personas vinculadas</p>
              <p className="mt-1 text-sm text-slate-400">Cada persona aparece una sola vez, aunque tenga varios roles.</p>
            </div>
            <button type="button" onClick={startAdding} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#b4ff45] px-4 py-2.5 text-sm font-bold text-[#07131e] transition hover:bg-[#d0ff8c]">
              <Users size={16} />
              Añadir
            </button>
          </div>

          {adding && (
            <AddMemberForm
              key={teamId}
              teamId={teamId}
              initialRole="atleta"
              allowedRoles={editableRoles}
              roster={roster}
              onDone={() => {
                setAdding(false)
                void loadRoster()
              }}
            />
          )}

          {people.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {people.map((person) => (
                <PersonCard
                  key={person.user_id}
                  person={person}
                  editing={editingUserId === person.user_id}
                  loading={loading}
                  onEdit={() => setEditingUserId((current) => current === person.user_id ? null : person.user_id)}
                  onCancel={() => setEditingUserId(null)}
                  onSave={updateRole}
                  onRemove={(member) => void removeRole(member)}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-[#31556b] p-5 text-sm text-slate-500">
              Todavía no hay personas vinculadas a este equipo.
            </p>
          )}
        </div>
      )}

      {message && (
        <p role="status" className="mt-5 rounded-xl bg-[#07131e] px-4 py-3 text-sm font-semibold text-slate-300">
          {message}
        </p>
      )}
    </section>
  )
}

function PersonCard({
  person,
  editing,
  loading,
  onEdit,
  onCancel,
  onSave,
  onRemove,
}: {
  person: RosterPerson
  editing: boolean
  loading: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (member: RosterMember, role: MemberRole, label: string) => Promise<void>
  onRemove: (member: RosterMember) => void
}) {
  const canEdit = person.roles.some((member) => member.role !== 'owner')

  return (
    <article className="rounded-2xl border border-[#29485d] bg-[#07131e] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#b4ff45] font-bold text-[#07131e]">
          {person.avatar_url ? <img src={person.avatar_url} alt={`Foto de ${person.full_name}`} className="h-full w-full object-cover" /> : person.full_name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{person.full_name}</p>
          <p className="truncate text-xs text-slate-400">{person.username ? `@${person.username}` : person.athlonx_code || 'Perfil registrado'}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {person.roles.map((member) => (
          <span key={memberKey(member)} className="rounded-md border border-[#31556b] px-2 py-1 text-xs font-semibold text-slate-300">
            {roleLabel(member.role, member.role_label)}
          </span>
        ))}
      </div>

      {canEdit && (
        <button type="button" onClick={onEdit} className="mt-4 inline-flex cursor-pointer items-center gap-1 border-t border-white/10 pt-3 text-xs font-bold text-slate-300 hover:text-white">
          <Edit3 size={13} />
          Editar
        </button>
      )}

      {editing && (
        <MemberEditor
          members={person.roles.filter((member) => member.role !== 'owner')}
          loading={loading}
          onCancel={onCancel}
          onSave={onSave}
          onRemove={onRemove}
        />
      )}
    </article>
  )
}

function AddMemberForm({
  teamId,
  initialRole,
  allowedRoles,
  roster,
  onDone,
}: {
  teamId: string
  initialRole: MemberRole
  allowedRoles: MemberRole[]
  roster: RosterMember[]
  onDone: () => void
}) {
  const [selectedRole, setSelectedRole] = useState<MemberRole>(initialRole)
  const [roleLabelValue, setRoleLabelValue] = useState(roleNames[initialRole])
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [searchReady, setSearchReady] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setRoleLabelValue(roleNames[selectedRole])
  }, [selectedRole])

  useEffect(() => {
    let active = true

    async function searchMembers() {
      if (!supabase || selected || !query.trim()) {
        setCandidates([])
        setSearchReady(false)
        return
      }

      setSearchLoading(true)
      const { data, error } = await supabase.rpc('search_invitable_team_members', {
        p_query: query.trim(),
        p_limit: 50,
      })

      if (!active) return

      setSearchLoading(false)
      if (error) {
        setCandidates([])
        setSearchReady(false)
        setMessage(error.message)
        return
      }

      const existingKeys = new Set(
        roster
          .filter((member) => member.role === selectedRole)
          .map((member) => memberKey(member)),
      )
      setCandidates(((data ?? []) as Candidate[]).filter((candidate) => !existingKeys.has(`${candidate.id}-${selectedRole}`)))
      setSearchReady(true)
    }

    void searchMembers()

    return () => {
      active = false
    }
  }, [query, roster, selected, selectedRole])

  const normalizedQuery = query.trim().replace(/^@/, '').toLowerCase()
  const linkedMatches = normalizedQuery
    ? roster.filter((member) => member.role === selectedRole && [member.full_name, member.username, member.athlonx_code].some((value) => value?.toLowerCase().includes(normalizedQuery)))
    : []

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !selected) {
      setMessage('Selecciona una persona para enviar la invitación.')
      return
    }

    setLoading(true)
    setMessage('')
    const { error } = await supabase.rpc('create_team_member_invitation', {
      p_target_user_id: selected.id,
      p_source_team_id: teamId,
      p_role: selectedRole,
      p_role_label: roleLabelValue,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage('Invitación enviada. La persona deberá aceptarla desde Notificaciones.')
    setSelected(null)
    setQuery('')
    setCandidates([])
    setLoading(false)
    onDone()
  }

  return (
    <form onSubmit={inviteMember} className="rounded-xl border border-[#b4ff45]/30 bg-[#0d2730] p-4">
      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <StyledSelect label="Rol" value={selectedRole} onChange={(value) => setSelectedRole(value as MemberRole)} options={allowedRoles.map((role) => ({ value: role, label: roleNames[role] }))} />
        <label className="block text-sm font-semibold">
          Cargo o etiqueta visible
          <input value={roleLabelValue} onChange={(event) => setRoleLabelValue(event.target.value)} placeholder="Ej. Preparador físico" className="mt-2 h-11 w-full rounded-lg border border-[#31556b] bg-[#071d2c] px-3 text-white outline-none placeholder:text-slate-500 focus:border-[#b4ff45]" />
        </label>
      </div>

      <label className="mt-4 block text-sm font-semibold">
        Buscar persona registrada
        <div className="relative mt-2">
          <div className="flex items-center gap-3 rounded-lg border border-[#31556b] bg-[#071d2c] px-3 py-2.5 focus-within:border-[#b4ff45]">
            <Search size={17} className="shrink-0 text-[#b4ff45]" />
            <input value={selected?.full_name || query} onChange={(event) => { setSelected(null); setQuery(event.target.value); setMessage('') }} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" placeholder="Nombre, @usuario o código AthlonX" />
            {selected && <button type="button" onClick={() => setSelected(null)} aria-label="Quitar persona seleccionada" className="cursor-pointer text-slate-400 hover:text-white"><X size={16} /></button>}
          </div>

          {!selected && searchReady && (
            <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-lg border border-[#31556b] bg-[#0d1d2b] shadow-2xl">
              {searchLoading ? <p className="px-3 py-3 text-sm text-slate-500">Buscando personas...</p> : candidates.length ? candidates.map((candidate) => (
                <button key={candidate.id} type="button" onClick={() => { setSelected(candidate); setQuery(''); setCandidates([]) }} className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left hover:bg-white/5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#b4ff45] text-sm font-bold text-[#07131e]">{candidate.avatar_url ? <img src={candidate.avatar_url} alt="" className="h-full w-full object-cover" /> : candidate.full_name.slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{candidate.full_name}</span><span className="block truncate text-xs text-slate-400">{candidate.username ? `@${candidate.username}` : 'Sin usuario'} · {candidate.athlonx_code || 'Código pendiente'}</span></span>
                </button>
              )) : linkedMatches.length ? <p className="px-3 py-3 text-sm text-slate-400">{linkedMatches[0].full_name} ya tiene este rol en el equipo.</p> : <p className="px-3 py-3 text-sm text-slate-500">No hay personas disponibles con ese criterio.</p>}
            </div>
          )}
        </div>
      </label>

      {selected && <div className="mt-3 flex flex-col gap-3 rounded-lg border border-[#b4ff45]/30 bg-[#b4ff45]/5 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#dcffb6]">Persona seleccionada: <strong>{selected.full_name}</strong></p><button type="submit" disabled={loading} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#b4ff45] px-4 py-2 text-sm font-bold text-[#07131e] disabled:cursor-wait disabled:opacity-60"><Send size={15} />{loading ? 'Enviando...' : 'Enviar invitación'}</button></div>}
      {message && <p role="status" className="mt-3 rounded-lg bg-[#07131e] px-3 py-2 text-xs font-semibold text-slate-300">{message}</p>}
    </form>
  )
}

function MemberEditor({
  members,
  loading,
  onCancel,
  onSave,
  onRemove,
}: {
  members: RosterMember[]
  loading: boolean
  onCancel: () => void
  onSave: (member: RosterMember, role: MemberRole, label: string) => Promise<void>
  onRemove: (member: RosterMember) => void
}) {
  return (
    <section className="mt-4 rounded-xl border border-[#b4ff45]/30 bg-[#0d2730] p-4">
      <div className="flex items-start gap-3 border-b border-[#29485d] pb-5">
        <Edit3 className="mt-0.5 text-[#b4ff45]" size={20} />
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Administración del equipo</p>
          <h4 className="mt-1 font-heading text-xl font-bold uppercase">Definir miembros</h4>
          <p className="mt-2 text-sm leading-6 text-slate-400">Modifica el rol o elimina una relación de esta persona con el equipo.</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {members.map((member) => (
          <RoleEditorRow
            key={memberKey(member)}
            member={member}
            loading={loading}
            onSave={onSave}
            onRemove={onRemove}
          />
        ))}
      </div>

      <button type="button" onClick={onCancel} disabled={loading} className="mt-4 cursor-pointer rounded-lg border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300 hover:border-[#b4ff45] hover:text-white">
        Cerrar edición
      </button>
    </section>
  )
}

function RoleEditorRow({
  member,
  loading,
  onSave,
  onRemove,
}: {
  member: RosterMember
  loading: boolean
  onSave: (member: RosterMember, role: MemberRole, label: string) => Promise<void>
  onRemove: (member: RosterMember) => void
}) {
  const [newRole, setNewRole] = useState<MemberRole>(member.role)
  const [newRoleLabel, setNewRoleLabel] = useState(roleLabel(member.role, member.role_label))

  return (
    <div className="rounded-xl border border-[#29485d] bg-[#07131e] p-3">
      <div className="grid gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-end">
        <StyledSelect label="Rol" value={newRole} onChange={(value) => setNewRole(value as MemberRole)} options={editableRoles.map((role) => ({ value: role, label: roleNames[role] }))} />
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          Cargo
          <input value={newRoleLabel} onChange={(event) => setNewRoleLabel(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-[#31556b] bg-[#071d2c] px-3 text-sm normal-case text-white outline-none focus:border-[#b4ff45]" />
        </label>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => void onSave(member, newRole, newRoleLabel)} disabled={loading} className="cursor-pointer rounded-lg bg-[#b4ff45] px-3 py-2 text-xs font-bold text-[#07131e] disabled:opacity-50">
            Guardar
          </button>
          <button type="button" onClick={() => onRemove(member)} disabled={loading} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#ff7d88]/50 px-3 py-2 text-xs font-bold text-[#ff9ca5] disabled:opacity-50">
            <Trash2 size={13} />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

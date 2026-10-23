'use client'

import { Pencil, Trash2, User, UserPlus, Users } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { InvitePanel } from './invite-panel'
import { MemberRoleEditor, RemoveConfirm } from './member-role-editor'
import { Avatar, Badge, Card, CardHeader, IconButton, MenuItem, Notice, RowMenu, SkeletonRows } from './ui'
import { PendingInvitation, TeamDivision, TeamMember, announceTeamChange, roleNames } from './use-team-roster'

type Person = { userId: string; fullName: string; avatarUrl: string | null; label: string; roles: TeamMember[] }

const staffRoles = new Set(['entrenador', 'staff'])
const boardRoles = new Set(['owner', 'directivo'])

function uniqueLabels(roles: TeamMember[]) {
  return [...new Set(roles.map((member) => member.role_label || roleNames[member.role]))]
}

// Una persona aparece una vez por grupo; si además juega o entrena, se indica en el mismo chip.
function groupPeople(members: TeamMember[], groupRoles: Set<string>) {
  const people = new Map<string, Person>()
  for (const member of members.filter((item) => groupRoles.has(item.role))) {
    const current = people.get(member.user_id)
    if (current) current.roles.push(member)
    else people.set(member.user_id, { userId: member.user_id, fullName: member.full_name, avatarUrl: member.avatar_url, label: '', roles: [member] })
  }
  return [...people.values()].map((person) => {
    const others = members.filter((member) => member.user_id === person.userId && !groupRoles.has(member.role)).map((member) => roleNames[member.role])
    return { ...person, label: [...uniqueLabels(person.roles), ...new Set(others)].join(' · ') }
  }).sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
}

export function TeamPeopleCard({ teamId, canManage, divisions, members, invitations, loading, reload }: { teamId: string; canManage: boolean; divisions: TeamDivision[]; members: TeamMember[]; invitations: PendingInvitation[]; loading: boolean; reload: () => Promise<void> }) {
  const [inviting, setInviting] = useState(false)
  const [panel, setPanel] = useState<{ userId: string; group: string; kind: 'edit' | 'remove' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const staff = groupPeople(members, staffRoles)
  const board = groupPeople(members, boardRoles)
  const total = new Set([...staff, ...board].map((person) => person.userId)).size

  async function remove(person: Person) {
    if (!supabase) return
    setBusy(true)
    setError('')
    for (const member of person.roles.filter((item) => item.role !== 'owner')) {
      const { error: rpcError } = member.division_id
        ? await supabase.rpc('remove_team_member_role_from_division', { p_team_id: teamId, p_user_id: member.user_id, p_role: member.role, p_division_id: member.division_id })
        : await supabase.rpc('remove_team_member_role', { p_team_id: teamId, p_user_id: member.user_id, p_role: member.role })
      if (rpcError) { setError(rpcError.message); setBusy(false); return }
    }
    setBusy(false)
    setPanel(null)
    await reload()
    announceTeamChange()
  }

  function menuFor(person: Person, group: string): MenuItem[] {
    const items: MenuItem[] = [{ label: 'Ver perfil', icon: User, href: `/perfil/${person.userId}` }]
    const editable = person.roles.some((member) => member.role !== 'owner')
    if (canManage && editable) {
      items.push({ label: 'Editar rol y cargo', icon: Pencil, onSelect: () => setPanel({ userId: person.userId, group, kind: 'edit' }) })
      items.push({ label: 'Quitar del equipo', icon: Trash2, tone: 'danger', separated: true, onSelect: () => setPanel({ userId: person.userId, group, kind: 'remove' }) })
    }
    return items
  }

  function group(title: string, people: Person[], key: string) {
    return <div>
      <p className="text-xs font-semibold text-[var(--ax-muted)]">{title}</p>
      {people.length ? <ul className="mt-1">
        {people.map((person) => {
          const open = panel?.userId === person.userId && panel.group === key ? panel.kind : null
          return <li key={person.userId}>
            <div className="flex items-center gap-3 py-2.5">
              <Avatar name={person.fullName} src={person.avatarUrl} />
              <div className="min-w-0 flex-1">
                <Link href={`/perfil/${person.userId}`} className="block truncate text-sm font-semibold text-[var(--ax-text)] decoration-[var(--ax-accent-text)] underline-offset-4 hover:underline">{person.fullName}</Link>
                <div className="mt-1.5 flex flex-wrap gap-1.5"><Badge tone="neutral" className="max-w-full"><span className="truncate">{person.label}</span></Badge></div>
              </div>
              <RowMenu label={`Acciones para ${person.fullName}`} items={menuFor(person, key)} />
            </div>
            {open === 'edit' && <MemberRoleEditor teamId={teamId} roles={person.roles} onClose={() => setPanel(null)} />}
            {open === 'remove' && <RemoveConfirm name={person.fullName} detail={`Pierde sus roles en ${title.toLowerCase()}. Si también es jugador, seguirá en la plantilla.`} busy={busy} onCancel={() => setPanel(null)} onConfirm={() => void remove(person)} />}
          </li>
        })}
      </ul> : <p className="mt-2 text-[13px] text-[var(--ax-muted)]">Sin personas asignadas.</p>}
    </div>
  }

  return <Card labelledBy="personas-titulo" className="space-y-4">
    <CardHeader id="personas-titulo" title="Cuerpo técnico y directiva" subtitle={loading ? 'Cargando…' : `${total} ${total === 1 ? 'persona' : 'personas'}`} actions={canManage && <IconButton icon={UserPlus} label="Invitar al cuerpo técnico o la directiva" onClick={() => setInviting((current) => !current)} aria-expanded={inviting} />} />
    {inviting && <InvitePanel teamId={teamId} divisions={divisions} members={members} title="Invitar al cuerpo técnico o la directiva" roles={['entrenador', 'staff', 'directivo']} defaultRole="entrenador" onClose={() => setInviting(false)} onSent={() => void reload()} />}
    {loading ? <SkeletonRows count={3} /> : <>
      {group('Cuerpo técnico', staff, 'staff')}
      <div className="h-px bg-[var(--ax-line)]" />
      {group('Directiva', board, 'board')}
      {invitations.length > 0 && <>
        <div className="h-px bg-[var(--ax-line)]" />
        <div>
          <p className="text-xs font-semibold text-[var(--ax-muted)]">Invitaciones pendientes</p>
          <ul className="mt-1">{invitations.map((invitation) => <li key={invitation.id} className="flex items-center gap-3 py-2.5">
            <Avatar name={invitation.fullName} src={invitation.avatarUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--ax-text)]">{invitation.fullName}</p>
              <p className="truncate text-xs text-[var(--ax-muted)]">{invitation.roleLabel || roleNames[invitation.role]}</p>
            </div>
            <Badge tone="warning">Pendiente</Badge>
          </li>)}</ul>
        </div>
      </>}
    </>}
    {error && <Notice tone="danger" icon={Users}>{error}</Notice>}
  </Card>
}

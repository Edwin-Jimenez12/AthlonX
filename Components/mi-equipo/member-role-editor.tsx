'use client'

import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button, FieldLabel, Notice, Select, inputClass } from './ui'
import { MemberRole, TeamMember, announceTeamChange, roleNames } from './use-team-roster'

const editableRoles: MemberRole[] = ['atleta', 'entrenador', 'staff', 'directivo']

// Edición inline de rol y cargo (reemplaza "Definir miembros" del bloque Miembros del equipo).
export function MemberRoleEditor({ teamId, roles, onClose }: { teamId: string; roles: TeamMember[]; onClose: () => void }) {
  const editable = roles.filter((member) => member.role !== 'owner')
  return <div className="ax-drop-in mt-2 space-y-3 rounded-[14px] border border-[var(--ax-line-strong)] bg-[var(--ax-surface-sunken)] p-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-[var(--ax-text)]">Editar rol y cargo</p>
      <button type="button" onClick={onClose} aria-label="Cerrar edición" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--ax-muted)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]"><X size={16} /></button>
    </div>
    {editable.length ? editable.map((member) => <RoleRow key={`${member.role}-${member.division_id || 'global'}`} teamId={teamId} member={member} onSaved={onClose} />)
      : <p className="text-[13px] text-[var(--ax-muted)]">El propietario del equipo no se puede editar desde aquí.</p>}
  </div>
}

function RoleRow({ teamId, member, onSaved }: { teamId: string; member: TeamMember; onSaved: () => void }) {
  const [role, setRole] = useState<MemberRole>(member.role)
  const [label, setLabel] = useState(member.role_label || roleNames[member.role])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const changed = role !== member.role || label !== (member.role_label || roleNames[member.role])

  async function save() {
    if (!supabase) return
    setSaving(true)
    setError('')
    const { error: rpcError } = await supabase.rpc('update_team_member_role', { p_team_id: teamId, p_user_id: member.user_id, p_current_role: member.role, p_new_role: role, p_role_label: label })
    setSaving(false)
    if (rpcError) { setError(rpcError.message); return }
    announceTeamChange()
    onSaved()
  }

  return <div className="space-y-2">
    <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end">
      <Select label={member.division_name ? `Rol · ${member.division_name}` : 'Rol'} value={role} onChange={(value) => setRole(value as MemberRole)} options={editableRoles.map((item) => ({ value: item, label: roleNames[item] }))} />
      <label className="block min-w-0">
        <FieldLabel>Cargo visible</FieldLabel>
        <input value={label} onChange={(event) => setLabel(event.target.value)} className={inputClass} />
      </label>
      <Button variant="primary" icon={Check} onClick={() => void save()} disabled={!changed || saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
    </div>
    {error && <Notice tone="danger" icon={X}>{error}</Notice>}
  </div>
}

// Confirmación inline para quitar a alguien (en lugar de window.confirm).
export function RemoveConfirm({ name, detail, busy, onCancel, onConfirm }: { name: string; detail: string; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div role="alertdialog" aria-label={`Quitar a ${name}`} className="ax-drop-in mt-2 flex flex-col gap-3 rounded-[14px] border border-[var(--ax-danger-line)] bg-[var(--ax-danger-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-[var(--ax-text)]">¿Quitar a {name}?</p>
      <p className="mt-0.5 text-[13px] text-[var(--ax-text-secondary)]">{detail}</p>
    </div>
    <div className="flex shrink-0 gap-2">
      <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>Cancelar</Button>
      <Button variant="danger" size="sm" onClick={onConfirm} disabled={busy}>{busy ? 'Quitando…' : 'Quitar'}</Button>
    </div>
  </div>
}

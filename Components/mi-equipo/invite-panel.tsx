'use client'

import { Check, Search, Send, X } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Avatar, Button, FieldLabel, Notice, Select, cx, inputClass } from './ui'
import { MemberRole, TeamDivision, TeamMember, announceTeamChange, roleNames } from './use-team-roster'

type Candidate = { id: string; full_name: string; avatar_url: string | null; username: string | null; athlonx_code: string | null }

const invitableRoles: MemberRole[] = ['atleta', 'entrenador', 'staff', 'directivo']

// Formulario de invitación del rediseño. Directivo se invita al equipo; el resto de roles,
// a una división (así el atleta aceptado entra a la plantilla de esa división).
export function InvitePanel({ teamId, divisions, members, title, roles = invitableRoles, defaultRole = 'atleta', defaultDivisionId, onClose, onSent }: { teamId: string; divisions: TeamDivision[]; members: TeamMember[]; title: string; roles?: MemberRole[]; defaultRole?: MemberRole; defaultDivisionId?: string | null; onClose: () => void; onSent: () => void }) {
  const [role, setRole] = useState<MemberRole>(defaultRole)
  const [divisionId, setDivisionId] = useState(defaultDivisionId || divisions[0]?.id || '')
  const [roleLabel, setRoleLabel] = useState(roleNames[defaultRole])
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)
  const needsDivision = role !== 'directivo'

  useEffect(() => { setRoleLabel(roleNames[role]) }, [role])

  const taken = useMemo(() => new Set(members.filter((member) => member.role === role && (!needsDivision || member.division_id === divisionId)).map((member) => member.user_id)), [members, role, divisionId, needsDivision])

  useEffect(() => {
    if (!supabase || selected || !query.trim()) { setCandidates([]); setSearching(false); return }
    let active = true
    setSearching(true)
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase!.rpc('search_invitable_team_members', { p_query: query.trim(), p_limit: 20 })
      if (!active) return
      setSearching(false)
      if (error) { setMessage({ tone: 'danger', text: error.message }); setCandidates([]); return }
      setCandidates((data ?? []) as Candidate[])
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query, selected])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !selected) return
    if (needsDivision && !divisionId) { setMessage({ tone: 'danger', text: 'Elige la división a la que se une la persona.' }); return }
    setSending(true)
    setMessage(null)
    const { error } = needsDivision
      ? await supabase.rpc('create_team_division_member_invitation', { p_target_user_id: selected.id, p_source_team_id: teamId, p_division_id: divisionId, p_role: role, p_role_label: roleLabel })
      : await supabase.rpc('create_team_member_invitation', { p_target_user_id: selected.id, p_source_team_id: teamId, p_role: role, p_role_label: roleLabel })
    setSending(false)
    if (error) { setMessage({ tone: 'danger', text: error.message }); return }
    setMessage({ tone: 'success', text: `Invitación enviada a ${selected.full_name}. Debe aceptarla desde Notificaciones.` })
    setSelected(null)
    setQuery('')
    announceTeamChange()
    onSent()
  }

  return <form onSubmit={(event) => void submit(event)} className="ax-drop-in rounded-[14px] border border-[var(--ax-line-strong)] bg-[var(--ax-surface-sunken)] p-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[15px] font-semibold text-[var(--ax-text)]">{title}</p>
      <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--ax-muted)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]"><X size={16} /></button>
    </div>
    <div className={cx('mt-4 grid gap-3', roles.length > 1 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
      {roles.length > 1 && <Select label="Rol" value={role} onChange={(value) => setRole(value as MemberRole)} options={roles.map((item) => ({ value: item, label: roleNames[item] }))} />}
      {needsDivision ? <Select label="División" value={divisionId} onChange={setDivisionId} placeholder="Sin divisiones" disabled={!divisions.length} options={divisions.map((division) => ({ value: division.id, label: division.name }))} /> : <div className="hidden sm:block" />}
      <label className="block min-w-0">
        <FieldLabel>Cargo visible</FieldLabel>
        <input value={roleLabel} onChange={(event) => setRoleLabel(event.target.value)} placeholder="Ej. Preparador físico" className={inputClass} />
      </label>
    </div>
    <div className="relative mt-3">
      <label className="block">
        <FieldLabel>Persona registrada en AthlonX</FieldLabel>
        <span className="relative block">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ax-muted)]" />
          <input value={selected ? selected.full_name : query} onChange={(event) => { setSelected(null); setQuery(event.target.value); setMessage(null) }} placeholder="Nombre, @usuario o código AthlonX" className={cx(inputClass, 'pl-9')} autoComplete="off" />
          {selected && <button type="button" onClick={() => setSelected(null)} aria-label="Quitar persona" className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-[var(--ax-muted)] hover:text-[var(--ax-text)]"><X size={14} /></button>}
        </span>
      </label>
      {!selected && query.trim() && <div className="ax-drop-in absolute left-0 right-0 z-40 mt-2 max-h-72 overflow-y-auto rounded-xl border border-[var(--ax-line-strong)] bg-[var(--ax-surface-raised)] p-1.5 shadow-[var(--ax-shadow-pop)]">
        {searching ? <p className="px-3 py-3 text-sm text-[var(--ax-muted)]">Buscando personas…</p>
          : candidates.length ? candidates.map((candidate) => {
            const already = taken.has(candidate.id)
            return <button key={candidate.id} type="button" disabled={already} onClick={() => { setSelected(candidate); setQuery('') }} className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--ax-hover)] disabled:cursor-not-allowed disabled:opacity-55">
              <Avatar name={candidate.full_name} src={candidate.avatar_url} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--ax-text)]">{candidate.full_name}</span>
                <span className="block truncate text-xs text-[var(--ax-muted)]">{candidate.username ? `@${candidate.username}` : 'Sin usuario'}{candidate.athlonx_code ? ` · ${candidate.athlonx_code}` : ''}</span>
              </span>
              {already && <span className="text-xs font-semibold text-[var(--ax-muted)]">Ya tiene este rol</span>}
            </button>
          }) : <p className="px-3 py-3 text-sm text-[var(--ax-muted)]">No encontramos personas con ese criterio.</p>}
      </div>}
    </div>
    {message && <div className="mt-3"><Notice tone={message.tone} icon={message.tone === 'success' ? Check : X}>{message.text}</Notice></div>}
    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button variant="ghost" onClick={onClose}>Cancelar</Button>
      <Button type="submit" variant="primary" icon={Send} disabled={!selected || sending}>{sending ? 'Enviando…' : 'Enviar invitación'}</Button>
    </div>
  </form>
}

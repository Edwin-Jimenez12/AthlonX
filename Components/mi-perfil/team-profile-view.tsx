'use client'

import { useState } from 'react'
import { LogoutAction } from '../logout-confirmation'
import { supabase } from '../../lib/supabase'
import { applyTheme } from '../../lib/theme'
import { formatLastAccess, formatLongDate, handlePattern, normalizeHandle, phoneError } from '../../lib/mi-perfil'
import type { Discipline, TeamMember, TeamProfile, Theme } from '../../lib/mi-perfil'
import { Card, Chip, ConfirmModal, Field, Hero, ListRow, Pending, PhoneField, ReadValue, SelectField, SettingRow, Segmented, Shell, Toggle, dangerOutlineButtonClass, initialsOf, outlineButtonClass, primaryButtonClass } from './ui'
import type { Notice, SectionItem } from './ui'
import { SecurityCards } from './password-card'
import { DeleteAccountCard } from './delete-account-card'
import { useAccountMeta } from './use-account-meta'
import { useCountries } from './use-countries'

export const teamSections: SectionItem[] = [
  { id: 'identidad', label: 'Información del equipo', description: 'Datos, escudo y divisiones' },
  { id: 'roles', label: 'Roles', description: 'Entrenadores, staff y administración' },
  { id: 'configuracion', label: 'Configuración', description: 'Visibilidad y preferencias' },
  { id: 'seguridad', label: 'Seguridad', description: 'Contraseña y correo' },
  { id: 'cuenta', label: 'Cuenta', description: 'Correo, acceso y salida' },
]

const editableSections = ['identidad', 'configuracion']
const roleLabels: Record<string, string> = { owner: 'Propietario', directivo: 'Directivo', entrenador: 'Entrenador', staff: 'Staff', atleta: 'Atleta' }
const memberRoleOptions = [
  { value: 'directivo', label: 'Directivo' },
  { value: 'entrenador', label: 'Entrenador' },
  { value: 'staff', label: 'Staff' },
  { value: 'atleta', label: 'Atleta' },
]
const levelLabels: Record<string, string> = { primera: 'Primera', segunda: 'Segunda', unica: 'Única' }
const ageLabels: Record<string, string> = { mayores: 'Mayores', 'sub-18': 'Sub-18', 'sub-16': 'Sub-16', 'sub-14': 'Sub-14', 'sub-12': 'Sub-12' }
const genderLabels: Record<string, string> = { masculino: 'Masculino', femenino: 'Femenino', mixto: 'Mixto' }
const descriptionCharLimit = 1000

function memberKey(member: TeamMember) {
  return `${member.userId}|${member.role}|${member.divisionId ?? ''}`
}

export function TeamProfileView({
  team,
  disciplines,
  theme,
  onTheme,
  section,
  onSection,
  noticesEnabled,
  onNotices,
  onSaved,
}: {
  team: TeamProfile
  disciplines: Discipline[]
  theme: Theme
  onTheme: (theme: Theme) => void
  section: string
  onSection: (id: string) => void
  noticesEnabled: boolean
  onNotices: (value: boolean) => void
  onSaved: () => void
}) {
  const meta = useAccountMeta()
  const countries = useCountries()
  const canEdit = team.myRole === 'owner' || team.myRole === 'directivo'
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)

  const [name, setName] = useState(team.name)
  const [handle, setHandle] = useState(team.handle)
  const [description, setDescription] = useState(team.description)
  const [city, setCity] = useState(team.city)
  const [country, setCountry] = useState(team.country || 'Panamá')
  const [disciplineId, setDisciplineId] = useState(team.disciplineId)
  const [contactEmail, setContactEmail] = useState(team.contactEmail)
  const [contactPhone, setContactPhone] = useState(team.contactPhone)
  const [websiteUrl, setWebsiteUrl] = useState(team.websiteUrl)
  const [isPublic, setIsPublic] = useState(team.isPublic)

  // Gestión de integrantes (solo directivos).
  const [roleEdit, setRoleEdit] = useState<{ key: string; role: string } | null>(null)
  const [pending, setPending] = useState<{ kind: 'role' | 'expel'; member: TeamMember; newRole?: string } | null>(null)
  const [memberBusy, setMemberBusy] = useState(false)
  const [memberError, setMemberError] = useState('')

  const initials = initialsOf(name) || 'AX'
  const directors = team.members.filter((member) => member.role === 'owner' || member.role === 'directivo')
  const disciplineName = disciplines.find((item) => item.id === disciplineId)?.name ?? team.disciplineName

  // Cambios sin guardar: se compara con la versión que había al empezar a editar.
  const [baseline, setBaseline] = useState('')
  const currentSnapshot = JSON.stringify([name, handle, description, city, country, disciplineId, contactEmail, contactPhone, websiteUrl, isPublic])
  const unsaved = editing && currentSnapshot !== baseline

  function startEdit() {
    if (!editableSections.includes(section)) onSection('identidad')
    setNotice(null)
    setBaseline(currentSnapshot)
    setEditing(true)
  }

  function cancelEdit() {
    setName(team.name)
    setHandle(team.handle)
    setDescription(team.description)
    setCity(team.city)
    setCountry(team.country)
    setDisciplineId(team.disciplineId)
    setContactEmail(team.contactEmail)
    setContactPhone(team.contactPhone)
    setWebsiteUrl(team.websiteUrl)
    setIsPublic(team.isPublic)
    setConfirmError('')
    setEditing(false)
  }

  async function saveTeam(): Promise<string> {
    if (!supabase) return 'Supabase no está configurado.'
    if (!name.trim()) return 'El nombre del equipo es obligatorio.'
    if (phoneError(contactPhone)) return phoneError(contactPhone)
    if (handle && !handlePattern.test(handle)) return 'El usuario público debe tener de 3 a 30 caracteres: minúsculas, números, puntos o guiones bajos.'
    if (description.length > descriptionCharLimit) return `La descripción no puede pasar de ${descriptionCharLimit} caracteres.`
    const { error } = await supabase.rpc('update_team_profile', {
      p_team_id: team.id,
      p_name: name.trim(),
      p_description: description.trim() || null,
      p_logo_url: team.logoUrl || null,
      p_country: country.trim() || 'Panamá',
      p_city: city.trim() || null,
      p_contact_email: contactEmail.trim() || null,
      p_contact_phone: contactPhone.trim() || null,
      p_website_url: websiteUrl.trim() || null,
      p_handle: handle.trim() || null,
      p_discipline_id: disciplineId || null,
      p_is_public: isPublic,
    })
    return error?.message ?? ''
  }

  async function confirmSave() {
    setBusy(true)
    setConfirmError('')
    const failure = await saveTeam()
    setBusy(false)
    if (failure) return setConfirmError(failure)
    setConfirming(false)
    setEditing(false)
    setNotice({ type: 'ok', text: 'Cambios guardados.' })
    onSaved()
  }

  async function runMemberAction() {
    if (!supabase || !pending) return
    const { kind, member, newRole } = pending
    setMemberBusy(true)
    setMemberError('')
    const { error } = kind === 'role'
      ? await supabase.rpc('update_team_member_role', { p_team_id: team.id, p_user_id: member.userId, p_current_role: member.role, p_new_role: newRole, p_role_label: null })
      : await supabase.rpc('remove_team_member_role', { p_team_id: team.id, p_user_id: member.userId, p_role: member.role })
    setMemberBusy(false)
    if (error) return setMemberError(error.message)
    setPending(null)
    setRoleEdit(null)
    setNotice({ type: 'ok', text: kind === 'role' ? 'Rol actualizado.' : 'Integrante expulsado del equipo.' })
    onSaved()
  }

  // Guardado desde el aviso de salida. Devuelve el error o vacío si se guardó.
  async function saveFromNavigation(): Promise<string> {
    const failure = await saveTeam()
    if (failure) return failure
    setEditing(false)
    setNotice({ type: 'ok', text: 'Cambios guardados.' })
    onSaved()
    return ''
  }

  async function saveTheme(next: Theme) {
    onTheme(next)
    applyTheme(next === 'claro' ? 'light' : 'dark')
    if (supabase) {
      const { data } = await supabase.auth.getUser()
      if (data.user) await supabase.from('account_preferences').upsert({ user_id: data.user.id, theme: next, notices_enabled: noticesEnabled, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    }
  }

  async function saveNotices(value: boolean) {
    onNotices(value)
    if (supabase) {
      const { data } = await supabase.auth.getUser()
      if (data.user) await supabase.from('account_preferences').upsert({ user_id: data.user.id, theme, notices_enabled: value, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    }
  }

  const sectionLabel = teamSections.find((item) => item.id === section)?.label ?? teamSections[0].label

  return (
    <Shell theme={theme} sectionLabel={sectionLabel} sections={teamSections} activeSection={section} onSection={onSection} notice={notice} publicProfileHref={`/equipos/${team.id}`} unsaved={unsaved} onDiscardChanges={cancelEdit} onSaveChanges={saveFromNavigation}>
      <Hero
        initials={initials}
        kindLabel="Perfil de equipo"
        title={name || 'Equipo pendiente'}
        code={team.athlonxCode}
        chips={<>
          <Chip tone="lime">{disciplineName}</Chip>
          {(city || country) && <Chip>{[city, country].filter(Boolean).join(', ')}</Chip>}
          {team.organizationName && <Chip>{team.organizationName}</Chip>}
        </>}
        canEdit={canEdit}
        editing={editing}
        saving={busy}
        onEdit={startEdit}
        onSave={() => setConfirming(true)}
        onCancel={cancelEdit}
      />

      {section === 'identidad' && (
        <>
          <Card title="Identidad del equipo" description="Estos datos aparecen en el perfil público del equipo.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Nombre" value={name} onChange={setName} disabled={!editing} maxLength={80} />
              <Field label="Usuario público" value={handle} onChange={(value) => setHandle(normalizeHandle(value))} disabled={!editing} maxLength={30} hint="Solo minúsculas, números, puntos y guiones bajos." />
              <SelectField label="Disciplina" value={disciplineId} onChange={setDisciplineId} disabled={!editing} options={[{ value: '', label: 'Sin disciplina' }, ...disciplines.map((item) => ({ value: item.id, label: item.name }))]} />
              <Field label="Ciudad" value={city} onChange={setCity} disabled={!editing} maxLength={60} />
              <SelectField label="País" value={country} onChange={setCountry} disabled={!editing} options={countries.map((item) => ({ value: item.name, label: item.name }))} />
              <Field label="Correo de contacto" type="email" value={contactEmail} onChange={setContactEmail} disabled={!editing} />
              <PhoneField label="Teléfono de contacto" value={contactPhone} onChange={setContactPhone} disabled={!editing} countries={countries} />
              <Field label="Sitio web" value={websiteUrl} onChange={setWebsiteUrl} disabled={!editing} />
            </div>
          </Card>
          <Card title="Descripción" description={`Se muestra en el perfil público del equipo. Máximo ${descriptionCharLimit} caracteres.`}>
            <Field label="Texto de descripción" as="textarea" value={description} onChange={setDescription} disabled={!editing} maxLength={descriptionCharLimit} placeholder="Cuenta la historia del equipo." />
            <p className={`text-right text-[12px] ${description.length > descriptionCharLimit ? 'text-[var(--mp-danger)]' : 'text-[var(--mp-muted)]'}`}>{description.length} / {descriptionCharLimit} caracteres</p>
          </Card>
          <Card title="Escudo" description="Opcional. Sin escudo se muestran las iniciales.">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center rounded-[48px] bg-[var(--mp-lime)] font-heading text-[35px] font-bold text-[var(--mp-on-lime)]">{initials}</div>
              <Pending>El cambio de escudo estará disponible próximamente.</Pending>
            </div>
          </Card>
          <Card title="Divisiones" description="Cada división tiene su propio código AthlonX. Se gestionan desde Mi equipo.">
            <div className="flex flex-col gap-3">
              {team.divisions.length ? team.divisions.map((division) => (
                <ListRow
                  key={division.id}
                  title={division.name}
                  meta={[division.level && levelLabels[division.level], division.ageGroup && ageLabels[division.ageGroup], division.gender && genderLabels[division.gender]].filter(Boolean).join(' · ') || division.athlonxCode}
                  right={division.athlonxCode ? <Chip>{division.athlonxCode}</Chip> : undefined}
                />
              )) : <Pending>Este equipo todavía no tiene divisiones.</Pending>}
            </div>
          </Card>
        </>
      )}

      {section === 'roles' && (
        <>
          <Card title="Directivos" description={canEdit ? 'Puedes cambiar el rol de un directivo o expulsarlo. Entrenadores y staff se administran desde el dashboard.' : 'Directivos del equipo. Entrenadores y staff se administran desde el dashboard.'}>
            <div className="flex flex-col gap-3">
              {directors.length ? directors.map((member) => {
                const key = memberKey(member)
                const isEditing = roleEdit?.key === key
                const manageable = canEdit && member.role !== 'owner' && !member.divisionId
                return (
                  <div key={key} className="flex flex-col gap-3 rounded-[14px] border border-[var(--mp-line)] bg-[var(--mp-raised)] p-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--mp-lime)] font-heading text-[17px] font-bold text-[var(--mp-on-lime)]">{initialsOf(member.fullName)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold">{member.fullName}</p>
                        {member.divisionName && <p className="text-[13px] text-[var(--mp-muted)]">{member.divisionName}</p>}
                      </div>
                      <Chip tone={member.role === 'owner' ? 'lime' : 'default'}>{member.roleLabel || roleLabels[member.role] || member.role}</Chip>
                      {manageable && !isEditing && (
                        <button type="button" onClick={() => setRoleEdit({ key, role: member.role })} className={outlineButtonClass}>Editar</button>
                      )}
                    </div>
                    {isEditing && roleEdit && (
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[200px] flex-1">
                          <SelectField label="Rol" value={roleEdit.role} onChange={(value) => setRoleEdit({ key, role: value })} options={memberRoleOptions} />
                        </div>
                        <button type="button" onClick={() => setPending({ kind: 'role', member, newRole: roleEdit.role })} disabled={roleEdit.role === member.role} className={primaryButtonClass}>Guardar rol</button>
                        <button type="button" onClick={() => setPending({ kind: 'expel', member })} className={dangerOutlineButtonClass}>Expulsar</button>
                        <button type="button" onClick={() => setRoleEdit(null)} className={outlineButtonClass}>Cancelar</button>
                      </div>
                    )}
                  </div>
                )
              }) : <Pending>No hay directivos registrados o no tienes permiso para verlos.</Pending>}
            </div>
          </Card>
          <Card title="Organización" description="Organización a la que está afiliado el equipo.">
            {team.organizationName ? <ListRow initials={initialsOf(team.organizationName)} title={team.organizationName} /> : <Pending>Este equipo no está afiliado a una organización.</Pending>}
          </Card>
        </>
      )}

      {section === 'configuracion' && (
        <>
          <Card title="Visibilidad" description="Define si el perfil del equipo aparece en la búsqueda pública.">
            <Toggle label="Perfil público" description="Otras cuentas podrán ver el perfil del equipo." checked={isPublic} disabled={!editing} onChange={setIsPublic} />
          </Card>
          <Card title="Preferencias" description="El tema y los avisos se aplican en cualquier dispositivo.">
            <SettingRow title="Tema de AthlonX" description="Se aplica a todas tus cuentas" right={<Segmented<Theme> options={[{ value: 'oscuro', label: 'Oscuro' }, { value: 'claro', label: 'Claro' }]} value={theme} onChange={saveTheme} />} />
            <Toggle label="Avisos de partidos y torneos" description="Recibe avisos de los calendarios del equipo." checked={noticesEnabled} onChange={saveNotices} />
          </Card>
        </>
      )}

      {section === 'seguridad' && <SecurityCards email={meta.email} />}

      {section === 'cuenta' && (
        <>
          <Card title="Datos de la cuenta" description="Información de acceso. Solo el dueño de la cuenta la ve.">
            <div className="grid gap-5 md:grid-cols-2">
              <ReadValue label="Correo de acceso" value={meta.email} />
              <ReadValue label="Tipo de cuenta" value="Equipo" />
              <ReadValue label="Código AthlonX" value={team.athlonxCode} copyable hint="Identificación del equipo. No se puede cambiar." />
              <ReadValue label="Divisiones" value={`${team.divisions.length} ${team.divisions.length === 1 ? 'división' : 'divisiones'}`} />
              <ReadValue label="Último acceso" value={formatLastAccess(meta.lastSignInAt)} />
              <ReadValue label="Creado el" value={formatLongDate(meta.createdAt)} />
            </div>
          </Card>
          <Card title="Sesión" description="Cierra tu sesión en este dispositivo. Podrás volver a entrar con tu correo y contraseña.">
            <div><LogoutAction /></div>
          </Card>
          <DeleteAccountCard />
        </>
      )}

      <ConfirmModal
        open={confirming}
        title="¿Guardar cambios?"
        description="Se actualizará el perfil público del equipo."
        confirmLabel="Confirmar"
        busy={busy}
        error={confirmError}
        onConfirm={confirmSave}
        onCancel={() => setConfirming(false)}
      />

      <ConfirmModal
        open={pending !== null}
        title={pending?.kind === 'expel' ? `¿Expulsar a ${pending.member.fullName}?` : `¿Cambiar el rol de ${pending?.member.fullName ?? ''}?`}
        description={pending?.kind === 'expel'
          ? 'Perderá este rol dentro del equipo.'
          : `Pasará a tener el rol de ${memberRoleOptions.find((option) => option.value === pending?.newRole)?.label ?? ''}.`}
        confirmLabel={pending?.kind === 'expel' ? 'Expulsar' : 'Cambiar rol'}
        danger={pending?.kind === 'expel'}
        busy={memberBusy}
        error={memberError}
        onConfirm={runMemberAction}
        onCancel={() => { if (!memberBusy) { setPending(null); setMemberError('') } }}
      />
    </Shell>
  )
}

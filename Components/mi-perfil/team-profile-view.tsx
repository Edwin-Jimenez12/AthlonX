'use client'

import { Lock, ShieldCheck, Shield, SlidersHorizontal, UserCog, Users } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { applyTheme } from '../../lib/theme'
import { formatLastAccess, formatLongDate, handlePattern, normalizeHandle, phoneError } from '../../lib/mi-perfil'
import type { Discipline, TeamMember, TeamProfile, Theme } from '../../lib/mi-perfil'
import { Badge, Button, buttonClass } from '../mi-equipo/ui'
import { Card, CardRow, Chip, Field, FieldGrid, Hero, Hint, InlineConfirm, ListRow, Pending, PhoneField, ReadValue, RowList, SaveStatus, SelectField, SettingRow, Segmented, Shell, Switch, initialsOf, useSaveStatus } from './ui'
import type { Notice, SectionItem } from './ui'
import { SecurityCards } from './password-card'
import { DeleteAccountCard, SessionCard } from './delete-account-card'
import { savePreferences, themeOptions } from './persona-profile-view'
import { useAccountMeta } from './use-account-meta'
import { useCountries } from './use-countries'

export const teamSections: SectionItem[] = [
  { id: 'identidad', label: 'Información del equipo', description: 'Datos, escudo y divisiones', icon: Shield },
  { id: 'roles', label: 'Roles', description: 'Entrenadores, staff y administración', icon: Users },
  { id: 'configuracion', label: 'Configuración', description: 'Visibilidad y preferencias', icon: SlidersHorizontal },
  { id: 'seguridad', label: 'Seguridad', description: 'Contraseña y correo', icon: ShieldCheck },
  { id: 'cuenta', label: 'Cuenta', description: 'Correo, acceso y salida', icon: UserCog },
]

// La visibilidad y las preferencias se guardan al momento; solo la información del equipo entra en modo edición.
const editableSections = ['identidad']
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
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const visibilityStatus = useSaveStatus()
  const preferenceStatus = useSaveStatus()

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

  // Gestión de directivos (solo propietario y directivos), con confirmación en la misma fila.
  const [roleEdit, setRoleEdit] = useState<{ key: string; role: string } | null>(null)
  const [pending, setPending] = useState<{ kind: 'role' | 'expel'; member: TeamMember; newRole?: string } | null>(null)
  const [memberBusy, setMemberBusy] = useState(false)
  const [memberError, setMemberError] = useState('')

  const initials = initialsOf(name) || 'AX'
  const directors = team.members.filter((member) => member.role === 'owner' || member.role === 'directivo')
  const disciplineName = disciplines.find((item) => item.id === disciplineId)?.name ?? team.disciplineName
  const disabled = !editing

  // Cambios sin guardar: se compara con la versión que había al empezar a editar.
  const [baseline, setBaseline] = useState('')
  const currentSnapshot = JSON.stringify([name, handle, description, city, country, disciplineId, contactEmail, contactPhone, websiteUrl])
  const unsaved = editing && currentSnapshot !== baseline

  function startEdit() {
    if (!editableSections.includes(section)) onSection('identidad')
    setNotice(null)
    setSaveError('')
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
    setSaveError('')
    setEditing(false)
  }

  // La RPC reescribe todos los campos del perfil del equipo.
  async function writeTeam(values: { name: string; handle: string; description: string; city: string; country: string; disciplineId: string; contactEmail: string; contactPhone: string; websiteUrl: string; isPublic: boolean }): Promise<string> {
    if (!supabase) return 'Supabase no está configurado.'
    const { error } = await supabase.rpc('update_team_profile', {
      p_team_id: team.id,
      p_name: values.name.trim(),
      p_description: values.description.trim() || null,
      p_logo_url: team.logoUrl || null,
      p_country: values.country.trim() || 'Panamá',
      p_city: values.city.trim() || null,
      p_contact_email: values.contactEmail.trim() || null,
      p_contact_phone: values.contactPhone.trim() || null,
      p_website_url: values.websiteUrl.trim() || null,
      p_handle: values.handle.trim() || null,
      p_discipline_id: values.disciplineId || null,
      p_is_public: values.isPublic,
    })
    return error?.message ?? ''
  }

  async function saveTeam(): Promise<string> {
    if (!name.trim()) return 'El nombre del equipo es obligatorio.'
    if (phoneError(contactPhone)) return phoneError(contactPhone)
    if (handle && !handlePattern.test(handle)) return 'El usuario público debe tener de 3 a 30 caracteres: minúsculas, números, puntos o guiones bajos.'
    if (description.length > descriptionCharLimit) return `La descripción no puede pasar de ${descriptionCharLimit} caracteres.`
    return writeTeam({ name, handle, description, city, country, disciplineId, contactEmail, contactPhone, websiteUrl, isPublic })
  }

  async function save(): Promise<string> {
    setBusy(true)
    setSaveError('')
    const failure = await saveTeam()
    setBusy(false)
    if (failure) {
      setSaveError(failure)
      return failure
    }
    setEditing(false)
    setNotice({ type: 'ok', text: 'Perfil del equipo actualizado.' })
    onSaved()
    return ''
  }

  // Visibilidad al momento: se envían los datos ya guardados del equipo con el nuevo valor.
  async function changeVisibility(value: boolean) {
    setIsPublic(value)
    const failure = await visibilityStatus.run(() => writeTeam({ name: team.name, handle: team.handle, description: team.description, city: team.city, country: team.country, disciplineId: team.disciplineId, contactEmail: team.contactEmail, contactPhone: team.contactPhone, websiteUrl: team.websiteUrl, isPublic: value }))
    if (failure) setIsPublic(!value)
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

  async function saveTheme(next: Theme) {
    onTheme(next)
    applyTheme(next === 'claro' ? 'light' : 'dark')
    await preferenceStatus.run(() => savePreferences(next, noticesEnabled))
  }

  async function saveNotices(value: boolean) {
    onNotices(value)
    const failure = await preferenceStatus.run(() => savePreferences(theme, value))
    if (failure) onNotices(!value)
  }

  const hero = (
    <Hero
      initials={initials}
      round={false}
      kindLabel="Equipo"
      title={name || 'Equipo pendiente'}
      code={team.athlonxCode}
      chips={<>
        <Chip tone="lime">{disciplineName}</Chip>
        {city && <Chip tone="lime">{city}</Chip>}
        {team.organizationName && <Chip>{team.organizationName}</Chip>}
      </>}
      canEdit={canEdit && editableSections.includes(section)}
      editing={editing}
      onEdit={startEdit}
    />
  )

  return (
    <Shell navTitle="Perfil del equipo" sections={teamSections} activeSection={section} onSection={onSection} hero={hero} notice={notice} editing={editing} unsaved={unsaved} saving={busy} saveError={saveError} onSave={save} onDiscard={cancelEdit}>
      {!canEdit && <Hint icon={Lock}>Solo el propietario y los directivos pueden editar el perfil del equipo.</Hint>}

      {section === 'identidad' && (
        <>
          <Card title="Identidad del equipo" description="Estos datos aparecen en el perfil público del equipo.">
            <FieldGrid columns={4}>
              <Field label="Nombre" value={name} onChange={setName} disabled={disabled} maxLength={80} />
              <Field label="Usuario público" value={disabled && handle ? `@${handle}` : handle} onChange={(value) => setHandle(normalizeHandle(value))} disabled={disabled} maxLength={30} hint={disabled ? undefined : 'Solo minúsculas, números, puntos y guiones bajos.'} />
              <SelectField label="Disciplina" value={disciplineId} onChange={setDisciplineId} disabled={disabled} options={[{ value: '', label: 'Sin disciplina' }, ...disciplines.map((item) => ({ value: item.id, label: item.name }))]} />
              <Field label="Ciudad" value={city} onChange={setCity} disabled={disabled} maxLength={60} />
              <SelectField label="País" value={country} onChange={setCountry} disabled={disabled} options={countries.map((item) => ({ value: item.name, label: item.name }))} />
              <Field label="Correo de contacto" type="email" value={contactEmail} onChange={setContactEmail} disabled={disabled} />
              <PhoneField label="Teléfono de contacto" value={contactPhone} onChange={setContactPhone} disabled={disabled} countries={countries} />
              <Field label="Sitio web" value={websiteUrl} onChange={setWebsiteUrl} disabled={disabled} />
            </FieldGrid>
          </Card>
          <CardRow>
            <Card title="Descripción" description={`Se muestra en el perfil público del equipo. Hasta ${descriptionCharLimit} caracteres.`}>
              <Field label="Texto de descripción" as="textarea" value={description} onChange={setDescription} disabled={disabled} maxLength={descriptionCharLimit} placeholder="Cuenta la historia del equipo." />
              {editing && <p className={`text-right text-xs ${description.length > descriptionCharLimit ? 'text-[var(--ax-danger-text)]' : 'text-[var(--ax-muted)]'}`}>{description.length} / {descriptionCharLimit} caracteres</p>}
            </Card>
            <Card title="Escudo" description="Opcional. Sin escudo se muestran las iniciales.">
              <div className="flex items-center gap-4">
                <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] bg-[var(--ax-accent)] font-display text-[28px] text-[var(--ax-on-accent)]">{initials}</span>
                <div className="min-w-0 space-y-2">
                  <p className="text-sm font-semibold text-[var(--ax-text)]">PNG o SVG cuadrado de hasta 2 MB</p>
                  <Badge>Próximamente</Badge>
                </div>
              </div>
            </Card>
          </CardRow>
          <Card title="Divisiones" description="Cada división tiene su propio código AthlonX. Se gestionan desde Mi equipo." action={<Link href="/equipo" className={buttonClass('secondary', 'sm')}><Users size={15} aria-hidden="true" /><span className="hidden sm:inline">Gestionar en Mi equipo</span><span className="sm:hidden">Mi equipo</span></Link>}>
            {team.divisions.length ? <RowList>{team.divisions.map((division) => (
              <ListRow
                key={division.id}
                initials={initialsOf(division.name)}
                title={division.name}
                meta={[division.level && levelLabels[division.level], division.ageGroup && ageLabels[division.ageGroup], division.gender && genderLabels[division.gender], division.athlonxCode].filter(Boolean).join(' · ')}
              />
            ))}</RowList> : <Pending>Este equipo todavía no tiene divisiones.</Pending>}
          </Card>
        </>
      )}

      {section === 'roles' && (
        <CardRow>
          <Card title="Directivos" description={canEdit ? 'Cambia el rol de un directivo o quítalo del equipo. Entrenadores y staff se gestionan desde Mi equipo.' : 'Directivos del equipo. Entrenadores y staff se gestionan desde Mi equipo.'} action={<Link href="/equipo" className={buttonClass('secondary', 'sm')}><Users size={15} aria-hidden="true" />Mi equipo</Link>}>
            {directors.length ? <RowList>{directors.map((member) => {
              const key = memberKey(member)
              const isEditing = roleEdit?.key === key
              const manageable = canEdit && member.role !== 'owner' && !member.divisionId
              const confirming = pending && memberKey(pending.member) === key
              return (
                <ListRow
                  key={key}
                  round
                  initials={initialsOf(member.fullName)}
                  title={member.fullName}
                  meta={member.divisionName ?? undefined}
                  right={<div className="flex items-center gap-2">
                    <Chip tone={member.role === 'owner' ? 'lime' : 'default'}>{member.roleLabel || roleLabels[member.role] || member.role}</Chip>
                    {manageable && !isEditing && <Button size="sm" onClick={() => { setRoleEdit({ key, role: member.role }); setPending(null); setMemberError('') }}>Editar</Button>}
                  </div>}
                >
                  {isEditing && roleEdit && !confirming && (
                    <div className="ax-drop-in mt-3 flex flex-col gap-3 rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] p-3 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1"><SelectField label="Rol" value={roleEdit.role} onChange={(value) => setRoleEdit({ key, role: value })} options={memberRoleOptions} /></div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" onClick={() => setRoleEdit(null)}>Cancelar</Button>
                        <Button variant="danger" onClick={() => setPending({ kind: 'expel', member })}>Quitar</Button>
                        <Button variant="primary" disabled={roleEdit.role === member.role} onClick={() => setPending({ kind: 'role', member, newRole: roleEdit.role })}>Guardar rol</Button>
                      </div>
                    </div>
                  )}
                  {confirming && pending && (
                    <InlineConfirm
                      title={pending.kind === 'expel' ? `¿Quitar a ${member.fullName}?` : `¿Cambiar el rol de ${member.fullName}?`}
                      description={pending.kind === 'expel' ? 'Perderá este rol dentro del equipo.' : `Pasará a tener el rol de ${memberRoleOptions.find((option) => option.value === pending.newRole)?.label ?? ''}.`}
                      confirmLabel={pending.kind === 'expel' ? 'Quitar del equipo' : 'Cambiar rol'}
                      danger={pending.kind === 'expel'}
                      busy={memberBusy}
                      error={memberError}
                      onConfirm={() => void runMemberAction()}
                      onCancel={() => { if (!memberBusy) { setPending(null); setMemberError('') } }}
                    />
                  )}
                </ListRow>
              )
            })}</RowList> : <Pending>No hay directivos registrados o no tienes permiso para verlos.</Pending>}
          </Card>
          <Card title="Organización" description="Organización a la que está afiliado el equipo.">
            {team.organizationName ? <RowList><ListRow initials={initialsOf(team.organizationName)} title={team.organizationName} right={<Badge tone="success">Afiliado</Badge>} /></RowList> : <Pending>Este equipo no está afiliado a una organización.</Pending>}
          </Card>
        </CardRow>
      )}

      {section === 'configuracion' && (
        <CardRow>
          <Card title="Visibilidad" description="Define si el perfil del equipo aparece en la búsqueda pública. Se guarda al momento." action={<SaveStatus state={visibilityStatus.state} />}>
            <RowList>
              <SettingRow title="Perfil público" description="Otras cuentas podrán ver el perfil del equipo." right={<Switch label="Perfil público" checked={isPublic} disabled={!canEdit} onChange={(value) => void changeVisibility(value)} />} />
            </RowList>
          </Card>
          <Card title="Preferencias" description="El tema y los avisos se aplican en cualquier dispositivo." action={<SaveStatus state={preferenceStatus.state} />}>
            <RowList>
              <SettingRow title="Tema de AthlonX" description="Se aplica a todas tus cuentas" right={<Segmented<Theme> label="Tema" options={themeOptions} value={theme} onChange={(value) => void saveTheme(value)} />} />
              <SettingRow title="Avisos de partidos y torneos" description="Recibe avisos de los calendarios del equipo." right={<Switch label="Avisos de partidos y torneos" checked={noticesEnabled} onChange={(value) => void saveNotices(value)} />} />
            </RowList>
          </Card>
        </CardRow>
      )}

      {section === 'seguridad' && <SecurityCards email={meta.email} />}

      {section === 'cuenta' && (
        <>
          <Card title="Datos de la cuenta" description="Información de acceso. Solo el dueño de la cuenta la ve.">
            <FieldGrid>
              <ReadValue label="Correo de acceso" value={meta.email} />
              <ReadValue label="Tipo de cuenta" value="Equipo" />
              <ReadValue label="Código AthlonX" value={team.athlonxCode} copyable />
              <ReadValue label="Divisiones" value={`${team.divisions.length} ${team.divisions.length === 1 ? 'división' : 'divisiones'}`} />
              <ReadValue label="Último acceso" value={formatLastAccess(meta.lastSignInAt)} />
              <ReadValue label="Creado el" value={formatLongDate(meta.createdAt)} />
            </FieldGrid>
            <Hint>El código AthlonX identifica al equipo y no se puede cambiar.</Hint>
          </Card>
          <CardRow>
            <SessionCard />
            <DeleteAccountCard />
          </CardRow>
        </>
      )}
    </Shell>
  )
}

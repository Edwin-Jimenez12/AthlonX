'use client'

import { Globe2, Lock, Moon, ShieldCheck, SlidersHorizontal, Sun, UserCog, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { applyTheme } from '../../lib/theme'
import { formatLastAccess, formatLongDate, phoneError } from '../../lib/mi-perfil'
import type { PersonaProfile, PrivacyField, Theme, Visibility } from '../../lib/mi-perfil'
import { Badge } from '../mi-equipo/ui'
import { Avatar, Card, CardRow, Chip, DateField, Field, FieldGrid, FixedChip, Hero, Hint, ListRow, LockedField, Pending, PhoneField, ReadValue, RowList, SaveStatus, SelectField, SettingRow, Segmented, Shell, Switch, initialsOf, useSaveStatus } from './ui'
import type { Notice, SectionItem } from './ui'
import { SecurityCards } from './password-card'
import { DeleteAccountCard, SessionCard } from './delete-account-card'
import { useAccountMeta } from './use-account-meta'
import { useCountries } from './use-countries'

export const personaSections: SectionItem[] = [
  { id: 'identidad', label: 'Información personal', description: 'Datos, contacto y foto', icon: UserRound },
  { id: 'participacion', label: 'Equipo y roles', description: 'Equipos y cargos', icon: Users },
  { id: 'configuracion', label: 'Configuración', description: 'Privacidad y preferencias', icon: SlidersHorizontal },
  { id: 'seguridad', label: 'Seguridad', description: 'Contraseña y correo', icon: ShieldCheck },
  { id: 'cuenta', label: 'Cuenta', description: 'Correo, acceso y salida', icon: UserCog },
]

// Configuración se guarda al momento, así que solo estas secciones entran en modo edición.
const editableSections = ['identidad', 'participacion']
const roleLabels: Record<string, string> = { atleta: 'Atleta', entrenador: 'Entrenador', directivo: 'Directivo', staff: 'Staff' }
const bloodTypes = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const visibilityOptions: Array<{ value: Visibility; label: string }> = [
  { value: 'owner', label: 'Solo yo' },
  { value: 'public', label: 'Público' },
]
export const themeOptions: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'oscuro', label: 'Oscuro', icon: Moon },
  { value: 'claro', label: 'Claro', icon: Sun },
]

function ageFrom(birthDate: string | null) {
  if (!birthDate) return null
  const birth = new Date(`${birthDate}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1
  return age
}

// Guarda tema y avisos en account_preferences (aplica a todas las cuentas del usuario).
export async function savePreferences(theme: Theme, noticesEnabled: boolean): Promise<string> {
  if (!supabase) return 'Supabase no está configurado.'
  const { data } = await supabase.auth.getUser()
  if (!data.user) return 'Inicia sesión para guardar tus preferencias.'
  const { error } = await supabase.from('account_preferences').upsert({ user_id: data.user.id, theme, notices_enabled: noticesEnabled, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  return error?.message ?? ''
}

export function PersonaProfileView({
  profile,
  theme,
  onTheme,
  section,
  onSection,
  noticesEnabled,
  onNotices,
  onProfileSaved,
}: {
  profile: PersonaProfile
  theme: Theme
  onTheme: (theme: Theme) => void
  section: string
  onSection: (id: string) => void
  noticesEnabled: boolean
  onNotices: (value: boolean) => void
  onProfileSaved: () => void
}) {
  const meta = useAccountMeta()
  const countries = useCountries()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const privacyStatus = useSaveStatus()
  const preferenceStatus = useSaveStatus()

  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [phone, setPhone] = useState(profile.phone)
  const [bloodType, setBloodType] = useState(profile.bloodType)
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? '')
  const [allowInvitations, setAllowInvitations] = useState(profile.allowInvitations)
  const [privacy, setPrivacy] = useState<Record<PrivacyField, Visibility>>(profile.privacy)
  const [tournaments, setTournaments] = useState(profile.tournaments)

  const age = ageFrom(birthDate || null)
  const displayName = `${firstName} ${lastName}`.trim() || profile.fullName || 'Persona pendiente'
  const disabled = !editing

  // Cambios sin guardar: se compara con la versión que había al empezar a editar.
  const [baseline, setBaseline] = useState('')
  const currentSnapshot = JSON.stringify([firstName, lastName, phone, bloodType, birthDate, tournaments])
  const unsaved = editing && currentSnapshot !== baseline

  function startEdit() {
    if (!editableSections.includes(section)) onSection('identidad')
    setNotice(null)
    setSaveError('')
    setBaseline(currentSnapshot)
    setEditing(true)
  }

  function cancelEdit() {
    setFirstName(profile.firstName)
    setLastName(profile.lastName)
    setPhone(profile.phone)
    setBloodType(profile.bloodType)
    setBirthDate(profile.birthDate ?? '')
    setTournaments(profile.tournaments)
    setSaveError('')
    setEditing(false)
  }

  // Guarda los datos personales y la visibilidad de torneos. Devuelve un mensaje de error o vacío si todo salió bien.
  async function saveAll(): Promise<string> {
    if (!supabase) return 'Supabase no está configurado.'
    if (!firstName.trim() || !lastName.trim()) return 'Nombre y apellido son obligatorios.'
    if (phoneError(phone)) return phoneError(phone)
    const today = new Date().toLocaleDateString('en-CA')
    if (birthDate && (birthDate > today || birthDate < '1900-01-01')) return 'La fecha de nacimiento no es válida.'
    const { error: profileError } = await supabase.from('profiles').update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      full_name: `${firstName.trim()} ${lastName.trim()}`,
      phone: phone.trim() || null,
      blood_type: bloodType || null,
      birth_date: birthDate || null,
    }).eq('id', profile.userId)
    if (profileError) return profileError.message
    if (tournaments.length) {
      const { error: tournamentError } = await supabase.from('profile_tournament_visibility').upsert(
        tournaments.map((item) => ({ user_id: profile.userId, tournament_id: item.id, is_visible: item.visible, updated_at: new Date().toISOString() })),
        { onConflict: 'user_id,tournament_id' },
      )
      if (tournamentError) return tournamentError.message
    }
    window.dispatchEvent(new CustomEvent('athlonx-profile-updated', { detail: { full_name: `${firstName.trim()} ${lastName.trim()}` } }))
    return ''
  }

  // Guardado desde la barra de cambios o desde el aviso de salida.
  async function save(): Promise<string> {
    setBusy(true)
    setSaveError('')
    const failure = await saveAll()
    setBusy(false)
    if (failure) {
      setSaveError(failure)
      return failure
    }
    setEditing(false)
    setNotice({ type: 'ok', text: 'Información actualizada.' })
    onProfileSaved()
    return ''
  }

  // Privacidad: cada cambio se guarda al momento y vuelve al valor anterior si falla.
  async function changePrivacy(field: PrivacyField, value: Visibility) {
    const previous = privacy[field]
    setPrivacy((current) => ({ ...current, [field]: value }))
    const failure = await privacyStatus.run(async () => {
      if (!supabase) return 'Supabase no está configurado.'
      const { error } = await supabase.from('profile_privacy_settings').upsert({ user_id: profile.userId, field_key: field, visibility: value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,field_key' })
      return error?.message ?? ''
    })
    if (failure) setPrivacy((current) => ({ ...current, [field]: previous }))
  }

  async function changeInvitations(value: boolean) {
    setAllowInvitations(value)
    const failure = await preferenceStatus.run(async () => {
      if (!supabase) return 'Supabase no está configurado.'
      const { error } = await supabase.from('profiles').update({ allow_athlete_invitations: value }).eq('id', profile.userId)
      return error?.message ?? ''
    })
    if (failure) setAllowInvitations(!value)
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
      initials={initialsOf(displayName)}
      kindLabel="Persona"
      title={displayName}
      code={profile.athlonxCode}
      chips={profile.roles.map((role) => <Chip key={role} tone="lime">{roleLabels[role] ?? role}</Chip>)}
      canEdit={editableSections.includes(section)}
      editing={editing}
      onEdit={startEdit}
      publicProfileHref={`/perfil/${profile.userId}`}
    />
  )

  return (
    <Shell navTitle="Mi perfil" sections={personaSections} activeSection={section} onSection={onSection} hero={hero} notice={notice} editing={editing} unsaved={unsaved} saving={busy} saveError={saveError} onSave={save} onDiscard={cancelEdit}>
      {section === 'identidad' && (
        <>
          <Card title="Datos personales" description="Lo que se muestra públicamente depende de tu privacidad.">
            <FieldGrid>
              <Field label="Nombre" value={firstName} onChange={setFirstName} disabled={disabled} maxLength={60} />
              <Field label="Apellido" value={lastName} onChange={setLastName} disabled={disabled} maxLength={60} />
              <PhoneField label="Teléfono" value={phone} onChange={setPhone} disabled={disabled} countries={countries} />
              <SelectField label="Tipo de sangre" value={bloodType} onChange={setBloodType} disabled={disabled} options={bloodTypes.map((type) => ({ value: type, label: type || 'Sin registrar' }))} />
              <DateField label="Fecha de nacimiento" value={birthDate} onChange={setBirthDate} disabled={disabled} />
              {editing ? <LockedField label="Edad" value={age === null ? '' : `${age} años`} /> : <ReadValue label="Edad" value={age === null ? '' : `${age} años`} />}
            </FieldGrid>
            <Hint icon={Lock}>{editing ? 'La edad se calcula desde tu fecha de nacimiento, que siempre es privada.' : 'Tu fecha de nacimiento siempre es privada. Decide quién ve tu teléfono y tu edad en Configuración.'}</Hint>
          </Card>
          <Card title="Foto de perfil" description="Opcional. Sin foto se muestran tus iniciales.">
            <div className="flex items-center gap-4">
              <Avatar initials={initialsOf(displayName)} size={64} />
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-semibold text-[var(--ax-text)]">JPG o PNG de hasta 2 MB</p>
                <Badge>Próximamente</Badge>
              </div>
            </div>
          </Card>
        </>
      )}

      {section === 'participacion' && (
        <>
          <CardRow>
            <Card title="Roles" description="Tu cuenta de persona puede tener varios roles a la vez.">
              <div className="flex flex-wrap gap-2">
                {profile.roles.length ? profile.roles.map((role) => <Chip key={role} tone="lime">{roleLabels[role] ?? role}</Chip>) : <Pending>Aún no tienes roles asignados.</Pending>}
              </div>
            </Card>
            <Card title="Cargo de staff" description="Lista fija de cargos. Solo aplica si trabajas como staff de un equipo.">
              <ReadValue label="Cargo" value={profile.staffPositionName ?? ''} empty="Sin cargo de staff asignado" />
            </Card>
          </CardRow>
          <CardRow>
            <Card title="Equipos" description="Equipos en los que participas. Se muestran en tu perfil público.">
              {profile.teams.length ? <RowList>{profile.teams.map((team) => (
                <ListRow key={`${team.id}-${team.role}`} initials={initialsOf(team.name)} title={team.name} meta={[team.discipline, team.athlonxCode].filter(Boolean).join(' · ')} right={<Badge>{team.roleLabel || roleLabels[team.role] || team.role}</Badge>} />
              ))}</RowList> : <Pending>No participas en ningún equipo todavía.</Pending>}
            </Card>
            <Card title="Organizaciones" description="Organizaciones que te han vinculado.">
              {profile.organizations.length ? <RowList>{profile.organizations.map((org) => (
                <ListRow key={`${org.id}-${org.role}`} initials={initialsOf(org.name)} title={org.name} meta={org.athlonxCode} right={<Badge>{org.role === 'owner' ? 'Propietario' : roleLabels[org.role] ?? org.role}</Badge>} />
              ))}</RowList> : <Pending>Sin organizaciones vinculadas.</Pending>}
            </Card>
          </CardRow>
          <Card title="Torneos que supervisas" description={editing ? 'Elige qué torneos se muestran en tu perfil público. Lo que no marques queda privado.' : 'Pulsa Editar información para cambiar qué torneos se muestran en tu perfil público.'}>
            {tournaments.length ? (
              <RowList>
                {tournaments.map((item, index) => (
                  <SettingRow
                    key={item.id}
                    title={item.name}
                    description={item.visible ? 'Visible en tu perfil público' : 'Oculto en tu perfil público'}
                    right={<Switch label={`Mostrar ${item.name}`} checked={item.visible} disabled={disabled} onChange={(checked) => setTournaments((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, visible: checked } : row)))} />}
                  />
                ))}
              </RowList>
            ) : <Pending>No supervisas torneos todavía.</Pending>}
          </Card>
        </>
      )}

      {section === 'configuracion' && (
        <CardRow>
          <Card title="Privacidad de mi perfil" description="Por defecto todo es privado, excepto lo que siempre es público. Los cambios se guardan al momento." action={<SaveStatus state={privacyStatus.state} />}>
            <RowList>
              <SettingRow title="Nombre, apellido y código" description="Siempre públicos para que te encuentren" right={<FixedChip icon={Globe2}>Siempre público</FixedChip>} />
              <SettingRow title="Correo electrónico" description="Por defecto solo tú" right={<Segmented<Visibility> label="Visibilidad del correo" options={visibilityOptions} value={privacy.email} onChange={(value) => void changePrivacy('email', value)} />} />
              <SettingRow title="Teléfono" description="Por defecto solo tú" right={<Segmented<Visibility> label="Visibilidad del teléfono" options={visibilityOptions} value={privacy.phone} onChange={(value) => void changePrivacy('phone', value)} />} />
              <SettingRow title="Edad" description="Se calcula desde tu fecha de nacimiento" right={<Segmented<Visibility> label="Visibilidad de la edad" options={visibilityOptions} value={privacy.age} onChange={(value) => void changePrivacy('age', value)} />} />
              <SettingRow title="Fecha de nacimiento" description="Siempre privada" right={<FixedChip icon={Lock}>Solo tú</FixedChip>} />
              <SettingRow title="Tipo de sangre" description="Visible para ti y tu equipo" right={<FixedChip icon={Users}>Tú y tu equipo</FixedChip>} />
            </RowList>
          </Card>
          <Card title="Preferencias" description="El tema y los avisos se aplican en cualquier dispositivo." action={<SaveStatus state={preferenceStatus.state} />}>
            <RowList>
              <SettingRow title="Tema de AthlonX" description="Se aplica a todas tus cuentas" right={<Segmented<Theme> label="Tema" options={themeOptions} value={theme} onChange={(value) => void saveTheme(value)} />} />
              <SettingRow title="Permitir invitaciones de equipos" description="Los equipos pueden invitarte a su plantilla." right={<Switch label="Permitir invitaciones de equipos" checked={allowInvitations} onChange={(value) => void changeInvitations(value)} />} />
              <SettingRow title="Avisos de partidos y torneos" description="Recibe avisos de tus calendarios." right={<Switch label="Avisos de partidos y torneos" checked={noticesEnabled} onChange={(value) => void saveNotices(value)} />} />
            </RowList>
          </Card>
        </CardRow>
      )}

      {section === 'seguridad' && <SecurityCards email={meta.email} />}

      {section === 'cuenta' && (
        <>
          <Card title="Datos de la cuenta" description="Información de acceso. Solo tú la ves.">
            <FieldGrid>
              <ReadValue label="Correo de acceso" value={meta.email} />
              <ReadValue label="Tipo de cuenta" value="Persona" />
              <ReadValue label="Código AthlonX" value={profile.athlonxCode} copyable />
              <ReadValue label="Creado el" value={formatLongDate(meta.createdAt)} />
              <ReadValue label="Último acceso" value={formatLastAccess(meta.lastSignInAt)} />
            </FieldGrid>
            <Hint>El código AthlonX te identifica en la plataforma y no se puede cambiar.</Hint>
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

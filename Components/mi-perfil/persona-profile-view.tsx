'use client'

import { useState } from 'react'
import { LogoutAction } from '../logout-confirmation'
import { supabase } from '../../lib/supabase'
import { formatLastAccess, formatLongDate, phoneError } from '../../lib/mi-perfil'
import type { PersonaProfile, PrivacyField, Theme, Visibility } from '../../lib/mi-perfil'
import { Avatar, Card, ConfirmModal, Chip, DateField, Field, Hero, ListRow, Pending, PhoneField, ReadValue, SelectField, SettingRow, Segmented, Shell, Toggle, initialsOf } from './ui'
import type { Notice, SectionItem } from './ui'
import { SecurityCards } from './password-card'
import { DeleteAccountCard } from './delete-account-card'
import { useAccountMeta } from './use-account-meta'
import { useCountries } from './use-countries'

export const personaSections: SectionItem[] = [
  { id: 'identidad', label: 'Información personal', description: 'Datos, contacto y foto' },
  { id: 'participacion', label: 'Equipo y roles', description: 'Equipos y cargos' },
  { id: 'configuracion', label: 'Configuración', description: 'Privacidad y preferencias' },
  { id: 'seguridad', label: 'Seguridad', description: 'Contraseña y correo' },
  { id: 'cuenta', label: 'Cuenta', description: 'Correo, acceso y salida' },
]

const editableSections = ['identidad', 'participacion', 'configuracion']
const roleLabels: Record<string, string> = { atleta: 'Atleta', entrenador: 'Entrenador', directivo: 'Directivo', staff: 'Staff' }
const bloodTypes = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const visibilityOptions: Array<{ value: Visibility; label: string }> = [
  { value: 'owner', label: 'Solo yo' },
  { value: 'public', label: 'Público' },
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
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)

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

  function startEdit() {
    if (!editableSections.includes(section)) onSection('identidad')
    setNotice(null)
    setEditing(true)
  }

  function cancelEdit() {
    setFirstName(profile.firstName)
    setLastName(profile.lastName)
    setPhone(profile.phone)
    setBloodType(profile.bloodType)
    setBirthDate(profile.birthDate ?? '')
    setAllowInvitations(profile.allowInvitations)
    setPrivacy(profile.privacy)
    setTournaments(profile.tournaments)
    setConfirmError('')
    setEditing(false)
  }

  // Guarda toda la información editable de la cuenta. Devuelve un mensaje de error o vacío si todo salió bien.
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
      allow_athlete_invitations: allowInvitations,
    }).eq('id', profile.userId)
    if (profileError) return profileError.message
    const privacyRows = (Object.keys(privacy) as PrivacyField[]).map((field) => ({
      user_id: profile.userId,
      field_key: field,
      visibility: privacy[field],
      updated_at: new Date().toISOString(),
    }))
    const { error: privacyError } = await supabase.from('profile_privacy_settings').upsert(privacyRows, { onConflict: 'user_id,field_key' })
    if (privacyError) return privacyError.message
    if (tournaments.length) {
      const { error: tournamentError } = await supabase.from('profile_tournament_visibility').upsert(
        tournaments.map((item) => ({ user_id: profile.userId, tournament_id: item.id, is_visible: item.visible, updated_at: new Date().toISOString() })),
        { onConflict: 'user_id,tournament_id' },
      )
      if (tournamentError) return tournamentError.message
    }
    return ''
  }

  async function confirmSave() {
    setBusy(true)
    setConfirmError('')
    const failure = await saveAll()
    setBusy(false)
    if (failure) return setConfirmError(failure)
    setConfirming(false)
    setEditing(false)
    setNotice({ type: 'ok', text: 'Cambios guardados.' })
    onProfileSaved()
  }

  async function saveTheme(next: Theme) {
    onTheme(next)
    try {
      window.localStorage.setItem('athlonx-theme', next === 'claro' ? 'light' : 'dark')
    } catch {
      // Sin almacenamiento local: el tema igual se guarda en la cuenta.
    }
    document.documentElement.dataset.theme = next === 'claro' ? 'light' : 'dark'
    if (supabase) {
      await supabase.from('account_preferences').upsert({ user_id: profile.userId, theme: next, notices_enabled: noticesEnabled, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    }
  }

  async function saveNotices(value: boolean) {
    onNotices(value)
    if (supabase) {
      await supabase.from('account_preferences').upsert({ user_id: profile.userId, theme, notices_enabled: value, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    }
  }

  const sectionLabel = personaSections.find((item) => item.id === section)?.label ?? personaSections[0].label

  return (
    <Shell theme={theme} sectionLabel={sectionLabel} sections={personaSections} activeSection={section} onSection={onSection} notice={notice} publicProfileHref={`/perfil/${profile.userId}`}>
      <Hero
        initials={initialsOf(displayName)}
        kindLabel="Perfil de persona"
        title={displayName}
        code={profile.athlonxCode}
        chips={<>
          {profile.roles.map((role) => <Chip key={role}>{roleLabels[role] ?? role}</Chip>)}
        </>}
        editing={editing}
        saving={busy}
        onEdit={startEdit}
        onSave={() => setConfirming(true)}
        onCancel={cancelEdit}
      />

      {section === 'identidad' && (
        <>
          <Card title="Datos personales" description="Lo que se muestra públicamente depende de tu privacidad.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Nombre" value={firstName} onChange={setFirstName} disabled={!editing} maxLength={60} />
              <Field label="Apellido" value={lastName} onChange={setLastName} disabled={!editing} maxLength={60} />
              <PhoneField label="Teléfono" value={phone} onChange={setPhone} disabled={!editing} countries={countries} />
              <SelectField label="Tipo de sangre" value={bloodType} onChange={setBloodType} disabled={!editing} options={bloodTypes.map((type) => ({ value: type, label: type || 'Sin registrar' }))} />
              <DateField label="Fecha de nacimiento" value={birthDate} onChange={setBirthDate} disabled={!editing} hint="Siempre privada." />
              <ReadValue label="Edad" value={age === null ? '' : `${age} años`} />
            </div>
          </Card>
          <Card title="Foto de perfil" description="Opcional. Sin foto se muestran tus iniciales.">
            <div className="flex flex-wrap items-center gap-5">
              <Avatar initials={initialsOf(displayName)} />
              <Pending>La subida de foto estará disponible próximamente.</Pending>
            </div>
          </Card>
        </>
      )}

      {section === 'participacion' && (
        <>
          <Card title="Roles" description="Tu cuenta de persona puede tener varios roles a la vez.">
            <div className="flex flex-wrap gap-2">
              {profile.roles.length ? profile.roles.map((role) => <Chip key={role} tone="lime">{roleLabels[role] ?? role}</Chip>) : <Pending>Aún no tienes roles asignados.</Pending>}
            </div>
          </Card>
          <Card title="Equipos" description="Equipos en los que participas. Se muestran en tu perfil público.">
            <div className="flex flex-col gap-3">
              {profile.teams.length ? profile.teams.map((team) => (
                <ListRow key={team.id} initials={initialsOf(team.name)} title={team.name} meta={team.discipline} right={<Chip>{team.roleLabel || roleLabels[team.role] || team.role}</Chip>} />
              )) : <Pending>No participas en ningún equipo todavía.</Pending>}
            </div>
          </Card>
          <Card title="Cargo de staff" description="Lista fija de cargos. Solo aplica si trabajas como staff de un equipo.">
            <ReadValue label="Cargo" value={profile.staffPositionName ?? ''} hint={profile.staffPositionName ? undefined : 'Sin cargo de staff asignado.'} />
          </Card>
          <Card title="Organizaciones" description="Organizaciones que te han vinculado.">
            <div className="flex flex-col gap-3">
              {profile.organizations.length ? profile.organizations.map((org) => (
                <ListRow key={org.id} initials={initialsOf(org.name)} title={org.name} meta={org.athlonxCode} right={<Chip>{org.role === 'owner' ? 'Propietario' : roleLabels[org.role] ?? org.role}</Chip>} />
              )) : <Pending>Sin organizaciones vinculadas.</Pending>}
            </div>
          </Card>
          <Card title="Torneos que supervisas" description="Elige qué torneos quieres mostrar. Lo que no marques queda privado.">
            {tournaments.length ? (
              <div className="flex flex-col gap-4">
                {tournaments.map((item, index) => (
                  <Toggle
                    key={item.id}
                    label={item.name}
                    description={item.visible ? 'Visible en tu perfil público.' : 'Oculto en tu perfil público.'}
                    checked={item.visible}
                    disabled={!editing}
                    onChange={(checked) => setTournaments((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, visible: checked } : row)))}
                  />
                ))}
              </div>
            ) : <Pending>No supervisas torneos todavía.</Pending>}
          </Card>
        </>
      )}

      {section === 'configuracion' && (
        <>
          <Card title="Privacidad de mi perfil" description="Por defecto todo es privado, excepto lo que siempre es público.">
            <SettingRow title="Nombre, apellido y código" description="Siempre públicos" right={<Chip>Siempre público</Chip>} />
            <SettingRow title="Correo electrónico" description="Por defecto solo tú" right={<Segmented<Visibility> options={visibilityOptions} value={privacy.email} disabled={!editing} onChange={(value) => setPrivacy((current) => ({ ...current, email: value }))} />} />
            <SettingRow title="Teléfono" description="Por defecto solo tú" right={<Segmented<Visibility> options={visibilityOptions} value={privacy.phone} disabled={!editing} onChange={(value) => setPrivacy((current) => ({ ...current, phone: value }))} />} />
            <SettingRow title="Edad" description="Se calcula desde tu fecha de nacimiento" right={<Segmented<Visibility> options={visibilityOptions} value={privacy.age} disabled={!editing} onChange={(value) => setPrivacy((current) => ({ ...current, age: value }))} />} />
            <SettingRow title="Fecha de nacimiento" description="Siempre privada" right={<Chip>Solo tú</Chip>} />
            <SettingRow title="Tipo de sangre" description="Visible para ti y tu equipo" right={<Chip>Tú y tu equipo</Chip>} />
          </Card>
          <Card title="Preferencias" description="El tema y los avisos se aplican en cualquier dispositivo.">
            <SettingRow title="Tema de AthlonX" description="Se aplica a todas tus cuentas" right={<Segmented<Theme> options={[{ value: 'oscuro', label: 'Oscuro' }, { value: 'claro', label: 'Claro' }]} value={theme} onChange={saveTheme} />} />
            <Toggle label="Permitir invitaciones de equipos" description="Los equipos pueden invitarte a su plantilla." checked={allowInvitations} disabled={!editing} onChange={setAllowInvitations} />
            <Toggle label="Avisos de partidos y torneos" description="Recibe avisos de tus calendarios." checked={noticesEnabled} onChange={saveNotices} />
          </Card>
        </>
      )}

      {section === 'seguridad' && <SecurityCards email={meta.email} />}

      {section === 'cuenta' && (
        <>
          <Card title="Datos de la cuenta" description="Información de acceso. Solo el dueño de la cuenta la ve.">
            <div className="grid gap-5 md:grid-cols-2">
              <ReadValue label="Correo de acceso" value={meta.email} />
              <ReadValue label="Tipo de cuenta" value="Persona" />
              <ReadValue label="Código AthlonX" value={profile.athlonxCode} copyable hint="Tu identificación en AthlonX. No se puede cambiar." />
              <ReadValue label="Creado el" value={formatLongDate(meta.createdAt)} />
              <ReadValue label="Último acceso" value={formatLastAccess(meta.lastSignInAt)} />
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
        description="Se actualizará tu información en AthlonX."
        confirmLabel="Confirmar"
        busy={busy}
        error={confirmError}
        onConfirm={confirmSave}
        onCancel={() => setConfirming(false)}
      />
    </Shell>
  )
}

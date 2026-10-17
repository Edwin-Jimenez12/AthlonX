'use client'

import { useState } from 'react'
import { LogoutAction } from '../logout-confirmation'
import { supabase } from '../../lib/supabase'
import { applyTheme } from '../../lib/theme'
import { formatLastAccess, formatLongDate, handlePattern, normalizeHandle, phoneError } from '../../lib/mi-perfil'
import type { Discipline, OrganizationProfile, Theme } from '../../lib/mi-perfil'
import { Card, Chip, ConfirmModal, Field, Hero, ListRow, Pending, PhoneField, ReadValue, SelectField, SettingRow, Segmented, Shell, Toggle, initialsOf } from './ui'
import type { Notice, SectionItem } from './ui'
import { SecurityCards } from './password-card'
import { DeleteAccountCard } from './delete-account-card'
import { useAccountMeta } from './use-account-meta'
import { useCountries } from './use-countries'

export const organizationSections: SectionItem[] = [
  { id: 'identidad', label: 'Información de la organización', description: 'Datos, logotipo y disciplinas' },
  { id: 'equipos', label: 'Equipos y roles', description: 'Equipos afiliados y administración' },
  { id: 'configuracion', label: 'Configuración', description: 'Visibilidad, torneos y preferencias' },
  { id: 'seguridad', label: 'Seguridad', description: 'Contraseña y correo' },
  { id: 'cuenta', label: 'Cuenta', description: 'Correo, acceso y salida' },
]

const editableSections = ['identidad', 'configuracion']
const descriptionCharLimit = 1000
const organizationTypes = [
  ['organizacion_deportiva', 'Organización deportiva'],
  ['comite_olimpico', 'Comité olímpico'],
  ['institucion_gubernamental', 'Institución gubernamental'],
  ['federacion', 'Federación'],
  ['union', 'Unión'],
  ['liga', 'Liga'],
  ['otro', 'Otro'],
] as const

const typeLabel = (type: string) => organizationTypes.find(([value]) => value === type)?.[1] ?? type
const roleLabel = (role: string) => (role === 'owner' ? 'Propietario' : 'Directivo')

const socialNetworks = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'x', label: 'X (Twitter)' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'linkedin', label: 'LinkedIn' },
]

function cleanSocialLinks(links: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(links)
      .map(([key, value]) => [key, value.trim()] as const)
      .filter(([, value]) => Boolean(value)),
  )
}

export function OrganizationProfileView({
  organization,
  disciplines,
  theme,
  onTheme,
  section,
  onSection,
  noticesEnabled,
  onNotices,
  onSaved,
}: {
  organization: OrganizationProfile
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
  const canEdit = organization.canEdit
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)

  const [name, setName] = useState(organization.name)
  const [type, setType] = useState(organization.type)
  const [handle, setHandle] = useState(organization.handle)
  const [country, setCountry] = useState(organization.country || 'Panamá')
  const [city, setCity] = useState(organization.city)
  const [description, setDescription] = useState(organization.description)
  const [contactEmail, setContactEmail] = useState(organization.contactEmail)
  const [contactPhone, setContactPhone] = useState(organization.contactPhone)
  const [websiteUrl, setWebsiteUrl] = useState(organization.websiteUrl)
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(organization.socialLinks)
  const [isPublic, setIsPublic] = useState(organization.isPublic)
  const [disciplineIds, setDisciplineIds] = useState<string[]>(organization.disciplineIds)

  // Cambios sin guardar: se compara con la versión que había al empezar a editar.
  const [baseline, setBaseline] = useState('')
  const currentSnapshot = JSON.stringify([name, type, handle, country, city, description, contactEmail, contactPhone, websiteUrl, isPublic, disciplineIds, socialLinks])
  const unsaved = editing && currentSnapshot !== baseline

  function startEdit() {
    if (!editableSections.includes(section)) onSection('identidad')
    setNotice(null)
    setBaseline(currentSnapshot)
    setEditing(true)
  }

  function cancelEdit() {
    setName(organization.name)
    setType(organization.type)
    setHandle(organization.handle)
    setCountry(organization.country)
    setCity(organization.city)
    setDescription(organization.description)
    setContactEmail(organization.contactEmail)
    setContactPhone(organization.contactPhone)
    setWebsiteUrl(organization.websiteUrl)
    setSocialLinks(organization.socialLinks)
    setIsPublic(organization.isPublic)
    setDisciplineIds(organization.disciplineIds)
    setConfirmError('')
    setEditing(false)
  }

  function toggleDiscipline(id: string) {
    setDisciplineIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  async function saveOrganization(): Promise<string> {
    if (!supabase) return 'Supabase no está configurado.'
    if (!name.trim()) return 'El nombre de la organización es obligatorio.'
    if (phoneError(contactPhone)) return phoneError(contactPhone)
    if (handle && !handlePattern.test(handle)) return 'El nombre de usuario debe tener de 3 a 30 caracteres: minúsculas, números, puntos o guiones bajos.'
    if (description.length > descriptionCharLimit) return `La descripción no puede pasar de ${descriptionCharLimit} caracteres.`
    // La RPC reescribe todos los campos: se envían también logo, redes y modalidades con su valor actual.
    const { error } = await supabase.rpc('update_organization_public_profile', {
      p_organization_id: organization.id,
      p_profile: {
        name: name.trim(),
        type,
        handle: handle.trim() || null,
        country: country.trim() || 'Panamá',
        city: city.trim() || null,
        description: description.trim() || null,
        logo_url: organization.logoUrl || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        website_url: websiteUrl.trim() || null,
        social_links: cleanSocialLinks(socialLinks),
        is_public: isPublic,
      },
      p_discipline_ids: disciplineIds,
      p_modality_ids: organization.modalityIds,
    })
    return error?.message ?? ''
  }

  async function confirmSave() {
    setBusy(true)
    setConfirmError('')
    const failure = await saveOrganization()
    setBusy(false)
    if (failure) return setConfirmError(failure)
    setConfirming(false)
    setEditing(false)
    setNotice({ type: 'ok', text: 'Cambios guardados.' })
    onSaved()
  }

  // Guardado desde el aviso de salida. Devuelve el error o vacío si se guardó.
  async function saveFromNavigation(): Promise<string> {
    const failure = await saveOrganization()
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

  const sectionLabel = organizationSections.find((item) => item.id === section)?.label ?? organizationSections[0].label

  return (
    <Shell theme={theme} sectionLabel={sectionLabel} sections={organizationSections} activeSection={section} onSection={onSection} notice={notice} publicProfileHref={`/organizaciones/${organization.id}`} unsaved={unsaved} onDiscardChanges={cancelEdit} onSaveChanges={saveFromNavigation}>
      <Hero
        initials={initialsOf(name) || 'AX'}
        kindLabel="Perfil de organización"
        title={name || 'Organización pendiente'}
        code={organization.athlonxCode}
        chips={<>
          {type && <Chip tone="lime">{typeLabel(type)}</Chip>}
          {organization.disciplineNames.map((item) => <Chip key={item}>{item}</Chip>)}
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
          <Card title="Identidad de la organización" description="Estos datos aparecen en el perfil público de la organización.">
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="flex flex-col items-start gap-3">
                <div className="flex h-24 w-24 items-center justify-center rounded-[48px] bg-[var(--mp-lime)] font-heading text-[35px] font-bold text-[var(--mp-on-lime)]">{initialsOf(name) || 'AX'}</div>
                <Pending>El cambio de logotipo estará disponible próximamente.</Pending>
              </div>
              <div className="grid flex-1 gap-5 md:grid-cols-2">
                <Field label="Nombre de la organización" value={name} onChange={setName} disabled={!editing} maxLength={100} />
                <Field label="Nombre de usuario" value={handle} onChange={(value) => setHandle(normalizeHandle(value))} disabled={!editing} maxLength={30} hint="Solo minúsculas, números, puntos y guiones bajos." />
                <SelectField label="Tipo de organización" value={type} onChange={setType} disabled={!editing} options={organizationTypes.map(([value, label]) => ({ value, label }))} />
                <SelectField label="País" value={country} onChange={setCountry} disabled={!editing} options={countries.map((item) => ({ value: item.name, label: item.name }))} />
                <Field label="Ciudad" value={city} onChange={setCity} disabled={!editing} maxLength={60} />
                <ReadValue label="Código AthlonX" value={organization.athlonxCode} copyable hint="Identificación de la organización. No se puede cambiar." />
              </div>
            </div>
          </Card>
          <Card title="Descripción" description={`Se muestra en el perfil público de la organización. Máximo ${descriptionCharLimit} caracteres.`}>
            <Field label="Texto de descripción" as="textarea" value={description} onChange={setDescription} disabled={!editing} maxLength={descriptionCharLimit} />
            <p className={`text-right text-[12px] ${description.length > descriptionCharLimit ? 'text-[var(--mp-danger)]' : 'text-[var(--mp-muted)]'}`}>{description.length} / {descriptionCharLimit} caracteres</p>
          </Card>
          <Card title="Disciplinas" description="Disciplinas en las que trabaja la organización. Cada torneo indica su modalidad.">
            <div className="flex flex-wrap gap-2">
              {disciplines.length ? disciplines.map((item) => {
                const active = disciplineIds.includes(item.id)
                return (
                  <button key={item.id} type="button" disabled={!editing} aria-pressed={active} onClick={() => toggleDiscipline(item.id)} className="cursor-pointer disabled:cursor-not-allowed">
                    <Chip tone={active ? 'lime' : 'default'}>{item.name}</Chip>
                  </button>
                )
              }) : <Pending>No hay disciplinas activas disponibles.</Pending>}
            </div>
          </Card>
          <Card title="Contacto institucional" description="Correo oficial de la organización.">
            <Field label="Correo institucional" type="email" value={contactEmail} onChange={setContactEmail} disabled={!editing} hint="Correo oficial de la organización." />
            <div className="grid gap-5 md:grid-cols-2">
              <PhoneField label="Teléfono de contacto" value={contactPhone} onChange={setContactPhone} disabled={!editing} countries={countries} />
              <Field label="Sitio web" value={websiteUrl} onChange={setWebsiteUrl} disabled={!editing} />
            </div>
          </Card>
          <Card title="Redes sociales" description="Escribe el enlace completo, por ejemplo https://instagram.com/tu_cuenta. Se muestran en el perfil público.">
            <div className="grid gap-5 md:grid-cols-2">
              {socialNetworks.map((network) => (
                <Field
                  key={network.key}
                  label={network.label}
                  value={socialLinks[network.key] ?? ''}
                  onChange={(value) => setSocialLinks((current) => ({ ...current, [network.key]: value }))}
                  disabled={!editing}
                />
              ))}
              <PhoneField label="WhatsApp" value={socialLinks.whatsapp ?? ''} onChange={(value) => setSocialLinks((current) => ({ ...current, whatsapp: value }))} disabled={!editing} countries={countries} />
            </div>
          </Card>
        </>
      )}

      {section === 'equipos' && (
        <>
          <Card title="Equipos afiliados" description="Equipos oficiales vinculados a esta organización.">
            <div className="flex flex-col gap-3">
              {organization.teams.length ? organization.teams.map((team) => (
                <ListRow key={team.id} initials={initialsOf(team.name)} title={team.name} meta={team.athlonxCode} />
              )) : <Pending>Aún no hay equipos oficiales afiliados.</Pending>}
            </div>
          </Card>
          <Card title="Directivos" description="Personas con permisos de administración en la organización.">
            <div className="flex flex-col gap-3">
              {organization.directivos.length ? organization.directivos.map((person) => (
                <ListRow key={person.userId} initials={initialsOf(person.fullName)} title={person.fullName} right={<Chip>{roleLabel(person.role)}</Chip>} />
              )) : <Pending>Sin directivos activos.</Pending>}
            </div>
          </Card>
        </>
      )}

      {section === 'configuracion' && (
        <>
          <Card title="Visibilidad" description="Permite que la organización aparezca en la búsqueda pública.">
            <Toggle label="Perfil público" description="Otras cuentas podrán ver el perfil de la organización." checked={isPublic} disabled={!editing} onChange={setIsPublic} />
          </Card>
          <Card title="Torneos" description="Torneos creados por la organización.">
            <div className="flex flex-col gap-3">
              {organization.tournaments.length ? organization.tournaments.map((item) => (
                <ListRow key={item.id} title={item.name} meta={item.season ?? undefined} />
              )) : <Pending>La organización aún no tiene torneos.</Pending>}
            </div>
          </Card>
          <Card title="Preferencias" description="El tema y los avisos se aplican en cualquier dispositivo.">
            <SettingRow title="Tema de AthlonX" description="Se aplica a todas tus cuentas" right={<Segmented<Theme> options={[{ value: 'oscuro', label: 'Oscuro' }, { value: 'claro', label: 'Claro' }]} value={theme} onChange={saveTheme} />} />
            <Toggle label="Avisos de torneos" description="Recibe avisos de los torneos de la organización." checked={noticesEnabled} onChange={saveNotices} />
          </Card>
        </>
      )}

      {section === 'seguridad' && <SecurityCards email={meta.email} />}

      {section === 'cuenta' && (
        <>
          <Card title="Datos de la cuenta" description="Información de acceso. Solo el dueño de la cuenta la ve.">
            <div className="grid gap-5 md:grid-cols-2">
              <ReadValue label="Correo de acceso" value={meta.email} />
              <ReadValue label="Tipo de cuenta" value="Organización" />
              <ReadValue label="Código AthlonX" value={organization.athlonxCode} copyable hint="Identificación de la organización. No se puede cambiar." />
              <ReadValue label="Torneos" value={`${organization.tournaments.length} ${organization.tournaments.length === 1 ? 'torneo' : 'torneos'}`} />
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
        description="Se actualizará el perfil público de la organización."
        confirmLabel="Confirmar"
        busy={busy}
        error={confirmError}
        onConfirm={confirmSave}
        onCancel={() => setConfirming(false)}
      />
    </Shell>
  )
}

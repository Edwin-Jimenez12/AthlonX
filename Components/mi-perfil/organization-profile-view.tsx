'use client'

import { Building2, CalendarDays, ExternalLink, Lock, ShieldCheck, SlidersHorizontal, Trophy, UserCog, Users } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { applyTheme } from '../../lib/theme'
import { formatLastAccess, formatLongDate, handlePattern, normalizeHandle, phoneError } from '../../lib/mi-perfil'
import type { Discipline, OrganizationProfile, Theme } from '../../lib/mi-perfil'
import { Badge, buttonClass, cx } from '../mi-equipo/ui'
import { Card, CardRow, Chip, Field, FieldGrid, Hero, Hint, ListRow, Pending, PhoneField, ReadValue, RowList, SaveStatus, SelectField, SettingRow, Segmented, Shell, Switch, initialsOf, useSaveStatus } from './ui'
import type { Notice, SectionItem } from './ui'
import { SecurityCards } from './password-card'
import { SessionCard } from './delete-account-card'
import { savePreferences, themeOptions } from './persona-profile-view'
import { useAccountMeta } from './use-account-meta'
import { useCountries } from './use-countries'

export const organizationSections: SectionItem[] = [
  { id: 'identidad', label: 'Información general', description: 'Datos, logotipo y disciplinas', icon: Building2 },
  { id: 'equipos', label: 'Equipos y roles', description: 'Equipos afiliados y administración', icon: Users },
  { id: 'configuracion', label: 'Configuración', description: 'Visibilidad, torneos y preferencias', icon: SlidersHorizontal },
  { id: 'seguridad', label: 'Seguridad', description: 'Contraseña y correo', icon: ShieldCheck },
  { id: 'cuenta', label: 'Cuenta', description: 'Correo, acceso y salida', icon: UserCog },
]

// La visibilidad y las preferencias se guardan al momento; solo la información general entra en modo edición.
const editableSections = ['identidad']
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

type OrganizationValues = { name: string; type: string; handle: string; country: string; city: string; description: string; contactEmail: string; contactPhone: string; websiteUrl: string; socialLinks: Record<string, string>; isPublic: boolean; disciplineIds: string[] }

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
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const visibilityStatus = useSaveStatus()
  const preferenceStatus = useSaveStatus()

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
  const disabled = !editing

  // Cambios sin guardar: se compara con la versión que había al empezar a editar.
  const [baseline, setBaseline] = useState('')
  const currentSnapshot = JSON.stringify([name, type, handle, country, city, description, contactEmail, contactPhone, websiteUrl, disciplineIds, socialLinks])
  const unsaved = editing && currentSnapshot !== baseline

  function startEdit() {
    if (!editableSections.includes(section)) onSection('identidad')
    setNotice(null)
    setSaveError('')
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
    setDisciplineIds(organization.disciplineIds)
    setSaveError('')
    setEditing(false)
  }

  function toggleDiscipline(id: string) {
    setDisciplineIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  // La RPC reescribe todos los campos: se envían también logo, redes y modalidades con su valor actual.
  async function writeOrganization(values: OrganizationValues): Promise<string> {
    if (!supabase) return 'Supabase no está configurado.'
    const { error } = await supabase.rpc('update_organization_public_profile', {
      p_organization_id: organization.id,
      p_profile: {
        name: values.name.trim(),
        type: values.type,
        handle: values.handle.trim() || null,
        country: values.country.trim() || 'Panamá',
        city: values.city.trim() || null,
        description: values.description.trim() || null,
        logo_url: organization.logoUrl || null,
        contact_email: values.contactEmail.trim() || null,
        contact_phone: values.contactPhone.trim() || null,
        website_url: values.websiteUrl.trim() || null,
        social_links: cleanSocialLinks(values.socialLinks),
        is_public: values.isPublic,
      },
      p_discipline_ids: values.disciplineIds,
      p_modality_ids: organization.modalityIds,
    })
    return error?.message ?? ''
  }

  async function saveOrganization(): Promise<string> {
    if (!name.trim()) return 'El nombre de la organización es obligatorio.'
    if (phoneError(contactPhone)) return phoneError(contactPhone)
    if (handle && !handlePattern.test(handle)) return 'El nombre de usuario debe tener de 3 a 30 caracteres: minúsculas, números, puntos o guiones bajos.'
    if (description.length > descriptionCharLimit) return `La descripción no puede pasar de ${descriptionCharLimit} caracteres.`
    return writeOrganization({ name, type, handle, country, city, description, contactEmail, contactPhone, websiteUrl, socialLinks, isPublic, disciplineIds })
  }

  async function save(): Promise<string> {
    setBusy(true)
    setSaveError('')
    const failure = await saveOrganization()
    setBusy(false)
    if (failure) {
      setSaveError(failure)
      return failure
    }
    setEditing(false)
    setNotice({ type: 'ok', text: 'Perfil de la organización actualizado.' })
    onSaved()
    return ''
  }

  // Visibilidad al momento: se envían los datos ya guardados con el nuevo valor.
  async function changeVisibility(value: boolean) {
    setIsPublic(value)
    const saved = organization
    const failure = await visibilityStatus.run(() => writeOrganization({ name: saved.name, type: saved.type, handle: saved.handle, country: saved.country, city: saved.city, description: saved.description, contactEmail: saved.contactEmail, contactPhone: saved.contactPhone, websiteUrl: saved.websiteUrl, socialLinks: saved.socialLinks, isPublic: value, disciplineIds: saved.disciplineIds }))
    if (failure) setIsPublic(!value)
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
      initials={initialsOf(name) || 'AX'}
      round={false}
      kindLabel="Organización"
      title={name || 'Organización pendiente'}
      code={organization.athlonxCode}
      chips={<>
        {type && <Chip tone="lime">{typeLabel(type)}</Chip>}
        {organization.disciplineNames.map((item) => <Chip key={item} tone="lime">{item}</Chip>)}
      </>}
      canEdit={canEdit && editableSections.includes(section)}
      editing={editing}
      onEdit={startEdit}
    />
  )

  return (
    <Shell navTitle="Mi organización" sections={organizationSections} activeSection={section} onSection={onSection} hero={hero} notice={notice} editing={editing} unsaved={unsaved} saving={busy} saveError={saveError} onSave={save} onDiscard={cancelEdit}>
      {!canEdit && <Hint icon={Lock}>Solo el propietario y los directivos pueden editar el perfil de la organización.</Hint>}

      {section === 'identidad' && (
        <>
          <Card title="Identidad de la organización" description="Estos datos aparecen en el perfil público de la organización.">
            <FieldGrid>
              <Field label="Nombre de la organización" value={name} onChange={setName} disabled={disabled} maxLength={100} />
              <Field label="Nombre de usuario" value={disabled && handle ? `@${handle}` : handle} onChange={(value) => setHandle(normalizeHandle(value))} disabled={disabled} maxLength={30} hint={disabled ? undefined : 'Solo minúsculas, números, puntos y guiones bajos.'} />
              <SelectField label="Tipo de organización" value={type} onChange={setType} disabled={disabled} options={organizationTypes.map(([value, label]) => ({ value, label }))} />
              <SelectField label="País" value={country} onChange={setCountry} disabled={disabled} options={countries.map((item) => ({ value: item.name, label: item.name }))} />
              <Field label="Ciudad" value={city} onChange={setCity} disabled={disabled} maxLength={60} />
              <ReadValue label="Código AthlonX" value={organization.athlonxCode} copyable />
            </FieldGrid>
            <div className="flex items-center gap-4 border-t border-[var(--ax-line)] pt-4">
              <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] bg-[var(--ax-accent)] font-display text-[28px] text-[var(--ax-on-accent)]">{initialsOf(name) || 'AX'}</span>
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-semibold text-[var(--ax-text)]">Logotipo: PNG o SVG cuadrado de hasta 2 MB</p>
                <Badge>Próximamente</Badge>
              </div>
            </div>
          </Card>
          <CardRow>
            <Card title="Descripción" description={`Se muestra en el perfil público. Hasta ${descriptionCharLimit} caracteres.`}>
              <Field label="Texto de descripción" as="textarea" value={description} onChange={setDescription} disabled={disabled} maxLength={descriptionCharLimit} />
              {editing && <p className={`text-right text-xs ${description.length > descriptionCharLimit ? 'text-[var(--ax-danger-text)]' : 'text-[var(--ax-muted)]'}`}>{description.length} / {descriptionCharLimit} caracteres</p>}
            </Card>
            <Card title="Disciplinas" description={editing ? 'Toca para activar o quitar una disciplina. Cada torneo indica su modalidad.' : 'Disciplinas en las que trabaja la organización. Cada torneo indica su modalidad.'}>
              <div className="flex flex-wrap gap-2">
                {disciplines.length ? disciplines.filter((item) => editing || disciplineIds.includes(item.id)).map((item) => {
                  const active = disciplineIds.includes(item.id)
                  return editing
                    ? <button key={item.id} type="button" aria-pressed={active} onClick={() => toggleDiscipline(item.id)} className={cx('inline-flex h-8 cursor-pointer items-center rounded-full px-3 text-[13px] font-semibold transition-colors duration-150', active ? 'bg-[var(--ax-accent-soft)] text-[var(--ax-accent-text)]' : 'border border-[var(--ax-line-strong)] text-[var(--ax-text-secondary)] hover:border-[var(--ax-accent-text)]')}>{item.name}</button>
                    : <Chip key={item.id} tone="lime">{item.name}</Chip>
                }) : <Pending>No hay disciplinas activas disponibles.</Pending>}
                {!editing && disciplines.length > 0 && !disciplineIds.length && <Pending>Todavía no elegiste disciplinas.</Pending>}
              </div>
            </Card>
          </CardRow>
          <CardRow>
            <Card title="Contacto institucional" description="Correo oficial y medios de contacto de la organización.">
              <div className="space-y-4">
                <Field label="Correo institucional" type="email" value={contactEmail} onChange={setContactEmail} disabled={disabled} />
                <PhoneField label="Teléfono de contacto" value={contactPhone} onChange={setContactPhone} disabled={disabled} countries={countries} />
                <Field label="Sitio web" value={websiteUrl} onChange={setWebsiteUrl} disabled={disabled} />
              </div>
            </Card>
            <Card title="Redes sociales" description="Se muestran en el perfil público. Escribe el enlace completo, por ejemplo https://instagram.com/tu_cuenta.">
              <div className="grid gap-4 sm:grid-cols-2">
                {socialNetworks.map((network) => (
                  <Field key={network.key} label={network.label} value={socialLinks[network.key] ?? ''} onChange={(value) => setSocialLinks((current) => ({ ...current, [network.key]: value }))} disabled={disabled} />
                ))}
                <PhoneField label="WhatsApp" value={socialLinks.whatsapp ?? ''} onChange={(value) => setSocialLinks((current) => ({ ...current, whatsapp: value }))} disabled={disabled} countries={countries} />
              </div>
            </Card>
          </CardRow>
        </>
      )}

      {section === 'equipos' && (
        <CardRow>
          <Card title="Equipos afiliados" description="Equipos oficiales vinculados a esta organización.">
            {organization.teams.length ? <RowList>{organization.teams.map((team) => (
              <ListRow key={team.id} initials={initialsOf(team.name)} title={team.name} meta={team.athlonxCode} right={<Link href={`/equipos/${team.id}`} aria-label={`Ver ${team.name}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[var(--ax-muted)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]"><ExternalLink size={16} aria-hidden="true" /></Link>} />
            ))}</RowList> : <Pending>Aún no hay equipos oficiales afiliados.</Pending>}
          </Card>
          <Card title="Directivos" description="Personas con permisos de administración en la organización.">
            {organization.directivos.length ? <RowList>{organization.directivos.map((person) => (
              <ListRow key={person.userId} round initials={initialsOf(person.fullName)} title={person.fullName} right={<Chip tone={person.role === 'owner' ? 'lime' : 'default'}>{roleLabel(person.role)}</Chip>} />
            ))}</RowList> : <Pending>Sin directivos activos.</Pending>}
          </Card>
        </CardRow>
      )}

      {section === 'configuracion' && (
        <>
          <CardRow>
            <Card title="Visibilidad" description="Permite que la organización aparezca en la búsqueda pública. Se guarda al momento." action={<SaveStatus state={visibilityStatus.state} />}>
              <RowList>
                <SettingRow title="Perfil público" description="Otras cuentas podrán ver el perfil de la organización." right={<Switch label="Perfil público" checked={isPublic} disabled={!canEdit} onChange={(value) => void changeVisibility(value)} />} />
              </RowList>
            </Card>
            <Card title="Preferencias" description="El tema y los avisos se aplican en cualquier dispositivo." action={<SaveStatus state={preferenceStatus.state} />}>
              <RowList>
                <SettingRow title="Tema de AthlonX" description="Se aplica a todas tus cuentas" right={<Segmented<Theme> label="Tema" options={themeOptions} value={theme} onChange={(value) => void saveTheme(value)} />} />
                <SettingRow title="Avisos de torneos" description="Recibe avisos de los torneos de la organización." right={<Switch label="Avisos de torneos" checked={noticesEnabled} onChange={(value) => void saveNotices(value)} />} />
              </RowList>
            </Card>
          </CardRow>
          <Card title="Torneos" description="Torneos creados por la organización. Se gestionan desde Eventos." action={<Link href="/eventos" className={buttonClass('secondary', 'sm')}><CalendarDays size={15} aria-hidden="true" />Ir a Eventos</Link>}>
            {organization.tournaments.length ? <RowList>{organization.tournaments.map((item) => (
              <ListRow key={item.id} icon={Trophy} title={item.name} meta={item.season ? `Temporada ${item.season}` : undefined} right={<Link href={`/torneos/ver/${item.id}`} aria-label={`Ver ${item.name}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[var(--ax-muted)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]"><ExternalLink size={16} aria-hidden="true" /></Link>} />
            ))}</RowList> : <Pending>La organización aún no tiene torneos.</Pending>}
          </Card>
        </>
      )}

      {section === 'seguridad' && <SecurityCards email={meta.email} />}

      {section === 'cuenta' && (
        <>
          <Card title="Datos de la cuenta" description="Información de acceso. Solo el dueño de la cuenta la ve.">
            <FieldGrid>
              <ReadValue label="Correo de acceso" value={meta.email} />
              <ReadValue label="Tipo de cuenta" value="Organización" />
              <ReadValue label="Código AthlonX" value={organization.athlonxCode} copyable />
              <ReadValue label="Torneos" value={`${organization.tournaments.length} ${organization.tournaments.length === 1 ? 'torneo' : 'torneos'}`} />
              <ReadValue label="Último acceso" value={formatLastAccess(meta.lastSignInAt)} />
              <ReadValue label="Creado el" value={formatLongDate(meta.createdAt)} />
            </FieldGrid>
            <Hint>El código AthlonX identifica a la organización y no se puede cambiar.</Hint>
          </Card>
          <CardRow>
            <SessionCard />
            <Card title="Eliminar cuenta" description="Las cuentas de organización no se pueden eliminar desde AthlonX.">
              <Hint icon={Lock}>Sus equipos afiliados, torneos y directivos dependen de la organización. Si necesitas cerrarla, <Link href="/contactanos" className="font-semibold text-[var(--ax-accent-text)] underline underline-offset-4">escríbenos</Link>.</Hint>
            </Card>
          </CardRow>
        </>
      )}
    </Shell>
  )
}

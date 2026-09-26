'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Building2, Check, ExternalLink, Globe2, History, LockKeyhole, Save, ShieldCheck } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

type Organization = { id: string; name: string; type: string; country: string; province: string | null; city: string | null; phone: string | null; institutional_email: string | null; contact_email: string | null; contact_phone: string | null; website_url: string | null; social_links: Record<string, string> | null; logo_url: string | null; description: string | null; slug: string | null; handle: string | null; status: string; is_public: boolean; created_by: string | null }
type Discipline = { id: string; name: string; code: string }
type Modality = { id: string; name: string; discipline_id: string }
type HistoryEntry = { id: string; changed_by: string; changes: { before?: Record<string, unknown>; after?: Record<string, unknown> }; created_at: string }
type FormValues = { name: string; type: string; handle: string; country: string; city: string; description: string; logo_url: string; contact_email: string; contact_phone: string; website_url: string; social_links: Record<string, string>; is_public: boolean }

const organizationTypes = [['organizacion_deportiva', 'Organización deportiva'], ['comite_olimpico', 'Comité olímpico'], ['institucion_gubernamental', 'Institución gubernamental'], ['federacion', 'Federación'], ['union', 'Unión'], ['liga', 'Liga'], ['otro', 'Otro']] as const
const socialFields = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['x', 'X'], ['linkedin', 'LinkedIn']] as const

function formFromOrganization(organization: Organization): FormValues {
  return {
    name: organization.name || '',
    type: organization.type || 'organizacion_deportiva',
    handle: organization.handle || '',
    country: organization.country || 'Panamá',
    city: organization.city || organization.province || '',
    description: organization.description || '',
    logo_url: organization.logo_url || '',
    contact_email: organization.contact_email || organization.institutional_email || '',
    contact_phone: organization.contact_phone || organization.phone || '',
    website_url: organization.website_url || '',
    social_links: { instagram: '', facebook: '', x: '', linkedin: '', ...(organization.social_links || {}) },
    is_public: organization.is_public,
  }
}

function snapshot(values: FormValues, disciplineIds: string[], modalityIds: string[]) {
  return JSON.stringify({ values, disciplineIds: [...disciplineIds].sort(), modalityIds: [...modalityIds].sort() })
}

export default function OrganizationPublicProfilePage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [organizationId, setOrganizationId] = useState('')
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [modalities, setModalities] = useState<Modality[]>([])
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([])
  const [selectedModalities, setSelectedModalities] = useState<string[]>([])
  const [savedDisciplineIds, setSavedDisciplineIds] = useState<string[]>([])
  const [savedModalityIds, setSavedModalityIds] = useState<string[]>([])
  const [form, setForm] = useState<FormValues | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function selectOrganization(nextOrganization: Organization) {
    if (!supabase) return
    const [{ data: disciplineLinks }, { data: modalityLinks }, { data: manager }] = await Promise.all([
      supabase.from('organization_disciplines').select('discipline_id').eq('organization_id', nextOrganization.id),
      supabase.from('organization_modalities').select('modality_id').eq('organization_id', nextOrganization.id),
      supabase.rpc('is_organization_manager', { target_organization_id: nextOrganization.id }),
    ])
    const disciplineIds = disciplineLinks?.map((item) => item.discipline_id) ?? []
    const modalityIds = modalityLinks?.map((item) => item.modality_id) ?? []
    const nextForm = formFromOrganization(nextOrganization)
    setOrganization(nextOrganization)
    setOrganizationId(nextOrganization.id)
    setSelectedDisciplines(disciplineIds)
    setSelectedModalities(modalityIds)
    setSavedDisciplineIds(disciplineIds)
    setSavedModalityIds(modalityIds)
    setForm(nextForm)
    setSavedSnapshot(snapshot(nextForm, disciplineIds, modalityIds))
    setCanEdit(manager === true)
    const { data: historyRows } = await supabase.from('organization_profile_edit_history').select('id, changed_by, changes, created_at').eq('organization_id', nextOrganization.id).order('created_at', { ascending: false }).limit(10)
    setHistory((historyRows ?? []) as HistoryEntry[])
  }

  async function loadPage() {
    if (!supabase) {
      setError('Supabase no está configurado.')
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError('Debes iniciar sesión para administrar una organización.')
      setLoading(false)
      return
    }

    // La función valida internamente el tipo de cuenta y repara cuentas
    // antiguas que quedaron sin una fila en organizations.
    const { error: provisionError } = await supabase.rpc('ensure_my_organization')
    if (provisionError) {
      setError(`No se pudo preparar la organización. Ejecuta la migración de reparación en Supabase. Detalle: ${provisionError.message}`)
      setLoading(false)
      return
    }

    const [{ data: disciplineRows }, { data: modalityRows }] = await Promise.all([
      supabase.from('disciplines').select('id, name, code').eq('is_active', true).in('code', ['rugby', 'baloncesto']).order('name'),
      supabase.from('sport_modalities').select('id, name, discipline_id').eq('is_active', true).order('name'),
    ])
    setDisciplines(disciplineRows ?? [])
    setModalities(modalityRows ?? [])
    const [{ data: allOrganizations, error: organizationQueryError }, { data: memberRows }, { data: contextRows }] = await Promise.all([
      supabase.from('organizations').select('id, name, type, country, province, city, phone, institutional_email, contact_email, contact_phone, website_url, social_links, logo_url, description, slug, handle, status, is_public, created_by').order('created_at', { ascending: false }),
      supabase.from('organization_members').select('organization_id').eq('user_id', userData.user.id).in('role', ['owner', 'directivo']).eq('status', 'active'),
      supabase.from('user_contexts').select('id, organization_id').eq('user_id', userData.user.id).eq('context_type', 'organization').eq('status', 'active'),
    ])
    if (organizationQueryError) {
      setError(`No se pudo consultar la tabla de organizaciones: ${organizationQueryError.message}`)
      setLoading(false)
      return
    }
    const allOrganizationsData = (allOrganizations ?? []) as Organization[]
    const organizationIds = Array.from(new Set([
      ...allOrganizationsData.filter((item) => item.created_by === userData.user.id).map((item) => item.id),
      ...(memberRows ?? []).map((item) => item.organization_id),
      ...(contextRows ?? []).map((item) => item.organization_id).filter((id): id is string => Boolean(id)),
    ]))
    const metadataOrganizationName = String(userData.user.user_metadata?.organization_name ?? '').trim().toLowerCase()
    const metadataMatch = metadataOrganizationName
      ? allOrganizationsData.find((item) => item.name.trim().toLowerCase() === metadataOrganizationName)
      : undefined
    if (!organizationIds.length && metadataMatch) organizationIds.push(metadataMatch.id)
    let resolvedOrganizations = allOrganizationsData.filter((item) => organizationIds.includes(item.id))
    const accountType = userData.user.user_metadata?.account_type
    if (!resolvedOrganizations.length && accountType === 'organizacion') {
      const metadata = userData.user.user_metadata ?? {}
      const fallbackName = String(metadata.organization_name ?? metadata.full_name ?? '').trim()
      if (!fallbackName) {
        setError('La cuenta está marcada como organización, pero no tiene nombre de organización en sus datos de registro.')
        setLoading(false)
        return
      }
      const organizationType = ['comite_olimpico', 'institucion_gubernamental', 'federacion', 'union', 'liga', 'organizacion_deportiva', 'otro'].includes(String(metadata.organization_type))
        ? String(metadata.organization_type)
        : 'organizacion_deportiva'
      const fallbackSlug = `${fallbackName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'organizacion'}-${userData.user.id.replaceAll('-', '').slice(0, 8)}`
      const { data: createdOrganization, error: createOrganizationError } = await supabase
        .from('organizations')
        .insert({
          name: fallbackName,
          type: organizationType,
          country: String(metadata.organization_country ?? 'Panama'),
          city: String(metadata.organization_city ?? '') || null,
          institutional_email: userData.user.email,
          slug: fallbackSlug,
          created_by: userData.user.id,
        })
        .select('id, name, type, country, province, city, phone, institutional_email, contact_email, contact_phone, website_url, social_links, logo_url, description, slug, handle, status, is_public, created_by')
        .single()
      if (createOrganizationError || !createdOrganization) {
        setError(`No se pudo crear el perfil de la organización: ${createOrganizationError?.message ?? 'respuesta vacía de Supabase'}`)
        setLoading(false)
        return
      }
      await supabase.from('organization_members').upsert({ organization_id: createdOrganization.id, user_id: userData.user.id, role: 'owner', status: 'active' }, { onConflict: 'organization_id,user_id,role' })
      resolvedOrganizations = [createdOrganization as Organization]
    }
    setOrganizations(resolvedOrganizations)
    const storedContextId = window.localStorage.getItem('athlonx-active-context-id')
    const requestedOrganizationId = new URLSearchParams(window.location.search).get('organizationId')
    const storedOrganizationId = (contextRows ?? []).find((item) => item.id === storedContextId)?.organization_id
    const preferred = resolvedOrganizations.find((item) => item.id === requestedOrganizationId) ?? resolvedOrganizations.find((item) => item.id === storedOrganizationId) ?? resolvedOrganizations[0]
    if (preferred) await selectOrganization(preferred)
    setLoading(false)
  }

  useEffect(() => { void loadPage() }, [])

  useEffect(() => {
    const syncContext = (event: Event) => {
      const context = (event as CustomEvent<{ contextType?: string; organizationId?: string }>).detail
      if (context?.contextType !== 'organization' || !context.organizationId) return
      const nextOrganization = organizations.find((item) => item.id === context.organizationId)
      if (nextOrganization) void selectOrganization(nextOrganization)
    }
    window.addEventListener('athlonx-context-change', syncContext)
    return () => window.removeEventListener('athlonx-context-change', syncContext)
  }, [organizations, disciplines, modalities])

  const isDirty = Boolean(form && savedSnapshot && snapshot(form, selectedDisciplines, selectedModalities) !== savedSnapshot)
  const selectedModalityOptions = useMemo(() => modalities.filter((modality) => selectedDisciplines.includes(modality.discipline_id)), [modalities, selectedDisciplines])
  const changes = useMemo(() => {
    if (!form || !organization) return []
    const current = formFromOrganization(organization)
    const items: string[] = []
    if (form.name !== current.name) items.push('Nombre oficial')
    if (form.type !== current.type) items.push('Tipo de organización')
    if (form.handle !== current.handle) items.push('Nombre de usuario')
    if (form.city !== current.city || form.country !== current.country) items.push('Ubicación')
    if (form.description !== current.description) items.push('Descripción')
    if (form.logo_url !== current.logo_url) items.push('Logo')
    if (form.contact_email !== current.contact_email) items.push('Correo institucional')
    if (form.contact_phone !== current.contact_phone) items.push('Teléfono')
    if (form.website_url !== current.website_url) items.push('Página web')
    if (JSON.stringify(form.social_links) !== JSON.stringify(current.social_links)) items.push('Redes sociales')
    if (form.is_public !== current.is_public) items.push('Visibilidad pública')
    if (JSON.stringify([...selectedDisciplines].sort()) !== JSON.stringify([...savedDisciplineIds].sort()) || JSON.stringify([...selectedModalities].sort()) !== JSON.stringify([...savedModalityIds].sort())) items.push('Disciplinas o modalidades')
    return items
  }, [form, organization, selectedDisciplines, selectedModalities, savedDisciplineIds, savedModalityIds])

  function updateForm(field: keyof FormValues, value: string | boolean | Record<string, string>) {
    setForm((current) => current ? { ...current, [field]: value } as FormValues : current)
  }

  function toggleDiscipline(id: string, checked: boolean) {
    setSelectedDisciplines((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id))
    if (!checked) setSelectedModalities((current) => current.filter((modalityId) => modalities.find((modality) => modality.id === modalityId)?.discipline_id !== id))
  }

  function requestSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    if (!canEdit) return setMessage('Solo el propietario o un directivo autorizado puede editar este perfil.')
    if (!isDirty) return setMessage('No hay cambios pendientes por guardar.')
    setConfirmOpen(true)
  }

  async function confirmSave(password: string) {
    if (!supabase || !form || !organizationId) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user?.email) return setMessage('No se pudo identificar el correo de la cuenta.')
    setSaving(true)
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: userData.user.email, password })
    if (reauthError) {
      setSaving(false)
      return setMessage('La contraseña no es correcta. No se guardaron los cambios.')
    }
    const { error: updateError } = await supabase.rpc('update_organization_public_profile', {
      p_organization_id: organizationId,
      p_profile: form,
      p_discipline_ids: selectedDisciplines,
      p_modality_ids: selectedModalities,
    })
    if (updateError) {
      setSaving(false)
      return setMessage(updateError.message)
    }
    setConfirmOpen(false)
    setSaving(false)
    setMessage('Perfil público actualizado correctamente.')
    await loadPage()
  }

  if (loading) return <ProfileShell><p className="text-slate-400">Cargando perfil público...</p></ProfileShell>
  if (error) return <ProfileShell><div className="rounded-[10px] border border-red-400/30 bg-red-500/10 p-5 text-red-200">{error}</div></ProfileShell>
  if (!organization || !form) return <ProfileShell><div className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-5 text-slate-300">No hay una organización disponible para administrar.</div></ProfileShell>

  return <ProfileShell><div className="space-y-6"><div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><Link href="/dashboard/organizaciones" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-[#b4ff45]"><ArrowLeft size={17} />Volver a organización</Link><p className="text-xs font-bold uppercase tracking-[.22em] text-[#b4ff45]">Administración pública</p><h1 className="mt-2 font-display text-4xl uppercase sm:text-5xl">Perfil público</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Actualiza la información que otras personas verán al encontrar esta organización en AthlonX.</p></div><div className="flex flex-wrap gap-2">{organizationId && <Link href={`/dashboard/organizaciones/${organizationId}`} className="inline-flex items-center gap-2 rounded-[5px] border border-[#31556b] px-4 py-3 text-sm font-bold text-slate-200 hover:border-[#b4ff45] hover:text-white"><ExternalLink size={16} />Ver perfil público</Link>}{organizations.length > 1 && <select value={organizationId} onChange={(event) => { const next = organizations.find((item) => item.id === event.target.value); if (next) void selectOrganization(next) }} className="rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-3 py-3 text-sm font-semibold text-white"><option value="">Seleccionar organización</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</div></div>{!canEdit && <div className="rounded-[10px] border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100">Tu cuenta puede consultar esta organización, pero no tiene permisos para editar su perfil público.</div>}{message && <div role="status" className="rounded-[10px] border border-[#b4ff45]/30 bg-[#b4ff45]/10 p-4 text-sm font-semibold text-[#dcffb6]">{message}</div>}
    <form onSubmit={requestSave} className="space-y-6"><section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><SectionTitle eyebrow="Identidad" title="Información principal" description="Estos datos identifican públicamente a la organización." /><div className="mt-6 grid gap-4 md:grid-cols-2"><Field label="Nombre oficial" value={form.name} onChange={(value) => updateForm('name', value)} required /><Field label="Nombre de usuario" value={form.handle} onChange={(value) => updateForm('handle', value)} placeholder="@organizacion" /><SelectField label="Tipo de organización" value={form.type} onChange={(value) => updateForm('type', value)} options={organizationTypes.map(([value, label]) => [value, label])} /><Field label="URL del logo" value={form.logo_url} onChange={(value) => updateForm('logo_url', value)} placeholder="https://..." type="url" /><div className="md:col-span-2"><label className="block text-sm font-semibold text-slate-200">Descripción<textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} rows={4} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#07131e] px-4 py-3 text-white outline-none focus:border-[#b4ff45]" placeholder="Describe la misión, alcance y actividad de la organización." /></label></div></div></section>
      <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><SectionTitle eyebrow="Alcance deportivo" title="Disciplinas y modalidades" description="Define las disciplinas que administra la organización y sus modalidades públicas." /><div className="mt-6 grid gap-3 sm:grid-cols-2">{disciplines.map((discipline) => <label key={discipline.id} className={`flex cursor-pointer items-center gap-3 rounded-[5px] border px-4 py-3 text-sm font-semibold transition ${selectedDisciplines.includes(discipline.id) ? 'border-[#b4ff45]/60 bg-[#b4ff45]/10 text-[#dcffb6]' : 'border-[#31556b] text-slate-300 hover:border-[#b4ff45]'}`}><input type="checkbox" checked={selectedDisciplines.includes(discipline.id)} onChange={(event) => toggleDiscipline(discipline.id, event.target.checked)} className="h-4 w-4 accent-[#b4ff45]" />{discipline.name}</label>)}</div>{selectedModalityOptions.length > 0 && <div className="mt-6 border-t border-white/10 pt-5"><p className="text-sm font-bold text-slate-200">Modalidades públicas</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{selectedModalityOptions.map((modality) => <label key={modality.id} className={`flex cursor-pointer items-center gap-3 rounded-[5px] border px-4 py-3 text-sm font-semibold transition ${selectedModalities.includes(modality.id) ? 'border-[#b4ff45]/60 bg-[#b4ff45]/10 text-[#dcffb6]' : 'border-[#31556b] text-slate-300 hover:border-[#b4ff45]'}`}><input type="checkbox" checked={selectedModalities.includes(modality.id)} onChange={(event) => setSelectedModalities((current) => event.target.checked ? [...new Set([...current, modality.id])] : current.filter((item) => item !== modality.id))} className="h-4 w-4 accent-[#b4ff45]" />{modality.name}</label>)}</div></div>}</section>
      <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><SectionTitle eyebrow="Canales públicos" title="Contacto institucional" description="Estos datos serán visibles en el perfil público de la organización." /><div className="mt-6 grid gap-4 md:grid-cols-2"><Field label="Correo institucional" value={form.contact_email} onChange={(value) => updateForm('contact_email', value)} type="email" /><Field label="Teléfono o WhatsApp" value={form.contact_phone} onChange={(value) => updateForm('contact_phone', value)} /><Field label="País" value={form.country} onChange={(value) => updateForm('country', value)} /><Field label="Ciudad" value={form.city} onChange={(value) => updateForm('city', value)} /><Field label="Página web" value={form.website_url} onChange={(value) => updateForm('website_url', value)} placeholder="https://..." type="url" /></div><div className="mt-6 border-t border-white/10 pt-5"><p className="text-sm font-bold text-slate-200">Redes sociales</p><div className="mt-3 grid gap-4 md:grid-cols-2">{socialFields.map(([key, label]) => <Field key={key} label={label} value={form.social_links[key] || ''} onChange={(value) => updateForm('social_links', { ...form.social_links, [key]: value })} placeholder="https://..." />)}</div></div></section>
      <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><SectionTitle eyebrow="Control de visibilidad" title="Perfil público" description="Controla si la organización puede aparecer en la búsqueda de AthlonX." /><label className="mt-6 flex cursor-pointer items-start gap-3 rounded-[5px] border border-[#31556b] p-4"><input type="checkbox" checked={form.is_public} onChange={(event) => updateForm('is_public', event.target.checked)} className="mt-1 h-4 w-4 accent-[#b4ff45]" /><span><span className="block font-bold text-slate-200">Perfil visible en AthlonX</span><span className="mt-1 block text-sm leading-6 text-slate-400">Si lo desactivas, las personas no podrán encontrar esta organización mediante la búsqueda pública.</span></span></label></section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">{isDirty ? `${changes.length || 'Hay'} cambios pendientes` : 'No hay cambios pendientes'}</p><button type="submit" disabled={!canEdit || !isDirty || saving} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50"><Save size={17} />Guardar cambios</button></div></form>
    <HistoryPanel history={history} />
  </div>{confirmOpen && form && <ConfirmDialog changes={changes} onCancel={() => setConfirmOpen(false)} onConfirm={confirmSave} saving={saving} />}</ProfileShell>
}

function ProfileShell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10"><div className="mx-auto max-w-6xl">{children}</div></main>
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="border-b border-white/10 pb-5"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">{eyebrow}</p><h2 className="mt-2 font-display text-3xl uppercase">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p></div>
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return <label className="block text-sm font-semibold text-slate-200">{label}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#07131e] px-4 py-3 text-white outline-none focus:border-[#b4ff45]" /></label>
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly (readonly [string, string])[] }) {
  return <label className="block text-sm font-semibold text-slate-200">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#07131e] px-4 py-3 text-white outline-none focus:border-[#b4ff45]">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>
}

function HistoryPanel({ history }: { history: HistoryEntry[] }) {
  return <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-center gap-2"><History className="text-[#b4ff45]" size={21} /><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Auditoría</p><h2 className="mt-1 font-display text-2xl uppercase">Historial de cambios</h2></div></div>{history.length ? <div className="mt-5 space-y-3">{history.map((entry) => <article key={entry.id} className="rounded-[5px] border border-white/10 bg-[#07131e] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-200">Actualización del perfil público</p><time className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString('es-PA')}</time></div><p className="mt-2 text-xs text-slate-500">Se registró un cambio protegido con contraseña.</p></article>)}</div> : <p className="mt-5 text-sm text-slate-500">Todavía no hay cambios registrados.</p>}</section>
}

function ConfirmDialog({ changes, onCancel, onConfirm, saving }: { changes: string[]; onCancel: () => void; onConfirm: (password: string) => Promise<void>; saving: boolean }) {
  const [password, setPassword] = useState('')
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-md"><div className="w-full max-w-lg rounded-[10px] border border-[#31556b] bg-[#0b1d2c] p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Edición protegida</p><h2 className="mt-2 font-display text-3xl uppercase">Confirmar cambios</h2></div><LockKeyhole className="text-[#b4ff45]" size={25} /></div><p className="mt-4 text-sm leading-6 text-slate-400">Confirma con la contraseña de tu cuenta para actualizar el perfil público de la organización.</p><div className="mt-5 rounded-[5px] border border-white/10 bg-[#07131e] p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Cambios incluidos</p><ul className="mt-3 space-y-2 text-sm text-slate-300">{(changes.length ? changes : ['Información del perfil']).map((change) => <li key={change} className="flex items-center gap-2"><Check size={15} className="text-[#b4ff45]" />{change}</li>)}</ul></div><label className="mt-5 block text-sm font-semibold text-slate-200">Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#07131e] px-4 py-3 text-white outline-none focus:border-[#b4ff45]" placeholder="Contraseña de la cuenta" /></label><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} className="cursor-pointer rounded-[5px] border border-[#31556b] px-4 py-3 font-bold text-slate-300 hover:border-white">Cancelar</button><button type="button" onClick={() => void onConfirm(password)} disabled={!password || saving} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck size={17} />{saving ? 'Guardando...' : 'Confirmar y guardar'}</button></div></div></div>
}

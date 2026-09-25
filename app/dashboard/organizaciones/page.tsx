'use client'

import { FormEvent, useEffect, useState } from 'react'
import { AffiliationRequestPanel } from '../../../Components/affiliation-request-panel'
import { OrganizationRelationshipPanel } from '../../../Components/organization-relationship-panel'
import { OrganizationTeamRequestPanel } from '../../../Components/organization-team-request-panel'
import { LocationFields } from '../../../Components/location-fields'
import { normalizePanamaCity } from '../../../lib/location-options'
import { supabase } from '../../../lib/supabase'

type Organization = { id: string; name: string; type: string; country: string; province: string | null; city: string | null; phone: string | null; institutional_email: string | null; logo_url: string | null; description: string | null; slug: string | null; status: string }
type Discipline = { id: string; name: string; code: string }
type Modality = { id: string; name: string; discipline_id: string }

const organizationTypes = [
  ['organizacion_deportiva', 'Organización deportiva'],
  ['comite_olimpico', 'Comité olímpico'],
  ['institucion_gubernamental', 'Institución gubernamental'],
  ['federacion', 'Federación'],
  ['union', 'Unión'],
  ['liga', 'Liga'],
  ['otro', 'Otro'],
] as const

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [organizationDisciplineNames, setOrganizationDisciplineNames] = useState<Record<string, string[]>>({})
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [modalities, setModalities] = useState<Modality[]>([])
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([])
  const [selectedModalities, setSelectedModalities] = useState<string[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState('organizacion_deportiva')
  const [country, setCountry] = useState('Panamá')
  const [city, setCity] = useState('')
  const [email, setEmail] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [status, setStatus] = useState('active')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeOrganizationId, setActiveOrganizationId] = useState('')
  const [message, setMessage] = useState('')

  async function loadOrganizations() {
    if (!supabase) return
    const { error: ensureError } = await supabase.rpc('ensure_my_organization')
    if (ensureError) setMessage(`No se pudo preparar el perfil de organización: ${ensureError.message}`)
    const { data: userData } = await supabase.auth.getUser()
    const [{ data }, { data: disciplineRows }, { data: modalityRows }] = await Promise.all([
      supabase.from('organizations').select('id, name, type, country, province, city, phone, institutional_email, logo_url, description, slug, status').order('created_at', { ascending: false }),
      supabase.from('disciplines').select('id, name, code').eq('is_active', true).in('code', ['rugby', 'baloncesto']).order('name'),
      supabase.from('sport_modalities').select('id, name, discipline_id').eq('is_active', true).order('name'),
    ])
    setOrganizations(data ?? [])
    const { data: membership } = userData.user
      ? await supabase.from('organization_members').select('organization_id').eq('user_id', userData.user.id).in('role', ['owner', 'directivo']).eq('status', 'active').limit(1).maybeSingle()
      : { data: null }
    const storedContextId = window.localStorage.getItem('athlonx-active-context-id')
    const { data: activeContext } = storedContextId
      ? await supabase.from('user_contexts').select('organization_id, context_type').eq('id', storedContextId).maybeSingle()
      : { data: null }
    setActiveOrganizationId(activeContext?.context_type === 'organization' ? activeContext.organization_id ?? '' : membership?.organization_id ?? data?.[0]?.id ?? '')
    setDisciplines(disciplineRows ?? [])
    setModalities(modalityRows ?? [])
    if (data?.length) {
      const { data: links } = await supabase.from('organization_disciplines').select('organization_id, discipline:disciplines(name)').in('organization_id', data.map((organization) => organization.id))
      const names = (links ?? []).reduce<Record<string, string[]>>((current, link) => {
        const discipline = Array.isArray(link.discipline) ? link.discipline[0] : link.discipline
        if (discipline?.name) current[link.organization_id] = [...(current[link.organization_id] ?? []), discipline.name]
        return current
      }, {})
      setOrganizationDisciplineNames(names)
    }
  }

  useEffect(() => { void loadOrganizations() }, [])

  useEffect(() => {
    const syncContext = (event: Event) => {
      const context = (event as CustomEvent<{ contextType?: string; organizationId?: string }>).detail
      if (context?.contextType === 'organization' && context.organizationId) setActiveOrganizationId(context.organizationId)
    }
    window.addEventListener('athlonx-context-change', syncContext)
    return () => window.removeEventListener('athlonx-context-change', syncContext)
  }, [])

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    if (!supabase) return setMessage('Supabase no está configurado.')
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return setMessage('Debes iniciar sesión para crear una organización.')
    const organizationData = { name: name.trim(), type, country: 'Panamá', province: null, city: city.trim() || null, phone: phone.trim() || null, institutional_email: email.trim() || null, logo_url: logoUrl.trim() || null, description: description.trim() || null, slug: slugify(name), status }
    const query = editingId
      ? supabase.from('organizations').update(organizationData).eq('id', editingId).select('id, name, type, country, province, city, phone, institutional_email, logo_url, description, slug, status').single()
      : supabase.from('organizations').insert({ ...organizationData, created_by: userData.user.id }).select('id, name, type, country, province, city, phone, institutional_email, logo_url, description, slug, status').single()
    const { data, error } = await query
    if (error) return setMessage(error.message)
    if (data) {
      if (editingId) {
        const { error: clearError } = await supabase.from('organization_disciplines').delete().eq('organization_id', editingId)
        if (clearError) return setMessage(`Organización actualizada, pero no se pudieron actualizar las disciplinas: ${clearError.message}`)
      }
      if (selectedDisciplines.length) {
        const { error: disciplineError } = await supabase.from('organization_disciplines').insert(selectedDisciplines.map((disciplineId) => ({ organization_id: data.id, discipline_id: disciplineId })))
        if (disciplineError) return setMessage(`Organización creada, pero no se pudieron guardar las disciplinas: ${disciplineError.message}`)
      }
      if (editingId) await supabase.from('organization_modalities').delete().eq('organization_id', editingId)
      if (selectedModalities.length) {
        const { error: modalityError } = await supabase.from('organization_modalities').insert(selectedModalities.map((modalityId) => ({ organization_id: data.id, modality_id: modalityId })))
        if (modalityError) return setMessage(`Organización guardada, pero no se pudieron guardar las modalidades: ${modalityError.message}`)
      }
      setOrganizationDisciplineNames((current) => ({ ...current, [data.id]: disciplines.filter((discipline) => selectedDisciplines.includes(discipline.id)).map((discipline) => discipline.name) }))
      setOrganizations((current) => editingId ? current.map((organization) => organization.id === editingId ? data : organization) : [data, ...current])
      setName('')
      setCity('')
      setEmail('')
      setDescription('')
      setPhone('')
      setLogoUrl('')
      setStatus('active')
      setSelectedDisciplines([])
      setSelectedModalities([])
      setEditingId(null)
      setMessage(editingId ? 'Organización actualizada correctamente en Supabase.' : 'Organización creada correctamente en Supabase.')
    }
  }

  async function startEditing(organization: Organization) {
    if (!supabase) return
    setEditingId(organization.id)
    setName(organization.name)
    setType(organization.type)
    setCountry(organization.country)
    setCity(normalizePanamaCity(organization.city || organization.province))
    setPhone(organization.phone || '')
    setEmail(organization.institutional_email || '')
    setLogoUrl(organization.logo_url || '')
    setDescription(organization.description || '')
    setStatus(organization.status)
    const { data } = await supabase.from('organization_disciplines').select('discipline_id').eq('organization_id', organization.id)
    setSelectedDisciplines(data?.map((item) => item.discipline_id) ?? [])
    const { data: modalityData } = await supabase.from('organization_modalities').select('modality_id').eq('organization_id', organization.id)
    setSelectedModalities(modalityData?.map((item) => item.modality_id) ?? [])
  }

  function cancelEditing() {
    setEditingId(null)
    setName('')
    setCity('')
    setPhone('')
    setEmail('')
    setLogoUrl('')
    setDescription('')
    setStatus('active')
    setSelectedDisciplines([])
    setSelectedModalities([])
  }

  return (
    <main className="min-h-screen bg-[#f3f6f8] px-5 py-8 lg:ml-64 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header><p className="font-heading text-sm uppercase tracking-[.28em] text-[#4c8500]">Estructura institucional</p><h1 className="mt-2 font-heading text-5xl font-black uppercase text-[#081522]">Organizaciones</h1><p className="mt-2 text-slate-600">Crea perfiles para federaciones, ligas, equipos y organizaciones deportivas.</p></header>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <form onSubmit={createOrganization} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3"><h2 className="font-heading text-2xl font-black uppercase text-[#081522]">{editingId ? 'Editar organización' : 'Nueva organización'}</h2>{editingId && <button type="button" onClick={cancelEditing} className="text-sm font-semibold text-slate-500 hover:text-[#4c8500]">Cancelar</button>}</div>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-bold text-[#17212b]">Nombre<input value={name} onChange={(event) => setName(event.target.value)} required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Nex Digital" /></label>
              <label className="block text-sm font-bold text-[#17212b]">Tipo<select value={type} onChange={(event) => setType(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3">{organizationTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <fieldset className="rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-bold text-[#17212b]">Disciplinas representadas</legend><p className="mt-1 text-xs text-slate-500">Puedes seleccionar varias, por ejemplo un comité olímpico.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{disciplines.map((discipline) => <label key={discipline.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold has-[:checked]:border-[#70b719] has-[:checked]:bg-[#e9fbd0]"><input type="checkbox" checked={selectedDisciplines.includes(discipline.id)} onChange={(event) => { setSelectedDisciplines((current) => event.target.checked ? [...current, discipline.id] : current.filter((id) => id !== discipline.id)); if (!event.target.checked) setSelectedModalities((current) => current.filter((id) => !modalities.some((modality) => modality.id === id && modality.discipline_id === discipline.id))) }} />{discipline.name}</label>)}</div>{selectedDisciplines.length > 0 && <div className="mt-4 border-t border-slate-200 pt-4"><p className="text-sm font-bold text-[#17212b]">Modalidades</p><p className="mt-1 text-xs text-slate-500">Define las modalidades que esta organización administra.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{modalities.filter((modality) => selectedDisciplines.includes(modality.discipline_id)).map((modality) => <label key={modality.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold has-[:checked]:border-[#70b719] has-[:checked]:bg-[#e9fbd0]"><input type="checkbox" checked={selectedModalities.includes(modality.id)} onChange={(event) => setSelectedModalities((current) => event.target.checked ? [...current, modality.id] : current.filter((id) => id !== modality.id))} />{modality.name}</label>)}</div></div>}</fieldset>
              <LocationFields country={country} city={city} onCountryChange={setCountry} onCityChange={setCity} variant="light" />
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-[#17212b]">Correo institucional<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="contacto@nexdigital.com" /></label><label className="block text-sm font-bold text-[#17212b]">Teléfono<input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="+507 6000-0000" /></label></div>
              <label className="block text-sm font-bold text-[#17212b]">URL del logo<input type="url" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="https://..." /></label>
              <label className="block text-sm font-bold text-[#17212b]">Estado<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"><option value="active">Activa</option><option value="suspended">Suspendida</option><option value="archived">Archivada</option></select></label>
              <label className="block text-sm font-bold text-[#17212b]">Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
            </div>
            <button type="submit" className="mt-6 w-full cursor-pointer rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#081522]">{editingId ? 'Guardar cambios' : 'Crear organización'}</button>
          </form>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-heading text-2xl font-black uppercase text-[#081522]">Mis organizaciones</h2><div className="mt-5 space-y-3">{organizations.length ? organizations.map((organization) => <article key={organization.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-heading text-xl font-black uppercase text-[#081522]">{organization.name}</h3><p className="mt-1 text-sm capitalize text-[#4c8500]">{organizationTypes.find(([value]) => value === organization.type)?.[1] ?? organization.type}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-xs font-bold ${organization.status === 'active' ? 'bg-[#e9fbd0] text-[#4c8500]' : 'bg-slate-100 text-slate-500'}`}>{organization.status === 'active' ? 'Activa' : organization.status === 'suspended' ? 'Suspendida' : 'Archivada'}</span><button type="button" onClick={() => void startEditing(organization)} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:border-[#70b719]">Editar</button></div></div><p className="mt-3 text-sm text-slate-500">{organization.city || organization.country}</p><p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">Disciplinas</p><div className="mt-1 flex flex-wrap gap-2">{(organizationDisciplineNames[organization.id] ?? []).length ? organizationDisciplineNames[organization.id].map((discipline) => <span key={discipline} className="rounded-full bg-[#e9fbd0] px-2 py-1 text-xs font-semibold text-[#4c8500]">{discipline}</span>) : <span className="text-sm text-slate-400">Sin disciplinas asignadas</span>}</div><p className="mt-2 font-mono text-xs text-slate-400">/{organization.slug || slugify(organization.name)}</p></article>) : <p className="text-slate-500">Todavía no tienes organizaciones registradas.</p>}</div></section>
        </div>
        <AffiliationRequestPanel sourceOrganizationId={editingId || activeOrganizationId || organizations[0]?.id} title="Vincular directivos y staff" />
        <OrganizationTeamRequestPanel sourceOrganizationId={editingId || activeOrganizationId || organizations[0]?.id} />
        <OrganizationRelationshipPanel sourceOrganizationId={editingId || activeOrganizationId || organizations[0]?.id} />
        {message && <div role="status" className="rounded-xl bg-[#081522] p-4 font-semibold text-white">{message}</div>}
      </div>
    </main>
  )
}

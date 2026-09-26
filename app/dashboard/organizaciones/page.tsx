'use client'

import { useEffect, useState } from 'react'
import { OrganizationDirectPeoplePanel } from '../../../Components/organization-direct-people-panel'
import { OrganizationHierarchyPanel } from '../../../Components/organization-hierarchy-panel'
import { supabase } from '../../../lib/supabase'

type Organization = { id: string; name: string; type: string; created_by: string | null }

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [activeOrganizationId, setActiveOrganizationId] = useState('')
  const [message, setMessage] = useState('')

  async function loadOrganizations() {
    if (!supabase) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setMessage('Debes iniciar sesión para administrar una organización.')
      return
    }

    const [{ data: organizationRows, error: organizationError }, { data: membershipRows }] = await Promise.all([
      supabase.from('organizations').select('id, name, type, created_by').order('created_at', { ascending: false }),
      supabase.from('organization_members').select('organization_id').eq('user_id', userData.user.id).in('role', ['owner', 'directivo']).eq('status', 'active'),
    ])
    if (organizationError) {
      setMessage(organizationError.message)
      return
    }
    const visibleIds = new Set([
      ...(membershipRows ?? []).map((membership) => membership.organization_id),
      ...(organizationRows ?? []).filter((organization) => organization.created_by === userData.user?.id).map((organization) => organization.id),
    ])
    const visibleOrganizations = (organizationRows ?? []).filter((organization) => visibleIds.has(organization.id)) as Organization[]
    setOrganizations(visibleOrganizations)

    const storedContextId = window.localStorage.getItem('athlonx-active-context-id')
    const { data: activeContext } = storedContextId
      ? await supabase.from('user_contexts').select('organization_id, context_type').eq('id', storedContextId).maybeSingle()
      : { data: null }
    const contextOrganizationId = activeContext?.context_type === 'organization' ? activeContext.organization_id : null
    setActiveOrganizationId(contextOrganizationId && visibleIds.has(contextOrganizationId) ? contextOrganizationId : visibleOrganizations[0]?.id ?? '')
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

  const activeOrganization = organizations.find((organization) => organization.id === activeOrganizationId) || organizations[0]
  const organizationId = activeOrganization?.id

  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10">
    <div className="mx-auto max-w-6xl space-y-6">
      <header><p className="font-heading text-sm uppercase tracking-[.28em] text-[#b4ff45]">Estructura institucional</p><h1 className="mt-2 font-heading text-5xl font-black uppercase">Organización</h1><p className="mt-2 max-w-3xl text-slate-400">Administra la jerarquía, las afiliaciones directas y las organizaciones que forman parte de tu autoridad institucional.</p></header>
      {organizations.length > 1 && <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-5"><label className="block text-sm font-bold text-white">Organización activa<select value={organizationId || ''} onChange={(event) => setActiveOrganizationId(event.target.value)} className="mt-2 w-full cursor-pointer rounded-[5px] border border-[#31556b] bg-[#07131e] px-4 py-3 text-white"><option value="">Seleccionar organización</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label></section>}
      {message && <p role="alert" className="rounded-[5px] border border-[#ff7d88]/40 bg-[#ff7d88]/10 p-4 text-sm text-[#ffb0b7]">{message}</p>}
      {!message && !organizationId && <section className="rounded-[10px] border border-dashed border-[#31556b] bg-[#0b1d2c] p-8 text-slate-400">No hay una organización disponible para administrar.</section>}
      {organizationId && <div className="grid items-start gap-6 xl:grid-cols-[1.35fr_.85fr]">
        <OrganizationHierarchyPanel rootOrganizationId={organizationId} />
        <OrganizationDirectPeoplePanel organizationId={organizationId} />
      </div>}
    </div>
  </main>
}

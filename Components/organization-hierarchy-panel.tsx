'use client'

import { Building2, ChevronRight, Network, Plus, Search, Send } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type OrganizationNode = {
  organization_id: string
  organization_name: string
  organization_type: string
  organization_logo_url: string | null
  parent_organization_id: string | null
  parent_organization_name: string | null
  relationship_type: string | null
  depth: number
}

type OrganizationOption = {
  id: string
  name: string
  username: string | null
  athlonx_code: string | null
  logo_url: string | null
}

export function OrganizationHierarchyPanel({ rootOrganizationId }: { rootOrganizationId: string }) {
  const [nodes, setNodes] = useState<OrganizationNode[]>([])
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<OrganizationOption[]>([])
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationOption | null>(null)
  const [showAddOrganization, setShowAddOrganization] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')

  async function loadHierarchy() {
    if (!supabase) return
    const { data, error } = await supabase.rpc('get_organization_hierarchy', {
      p_root_organization_id: rootOrganizationId,
    })
    if (error) setMessage(error.message)
    else setNodes((data ?? []) as OrganizationNode[])
  }

  useEffect(() => { void loadHierarchy() }, [rootOrganizationId])

  async function searchOrganizations(value: string) {
    if (!supabase || value.trim().length < 2) {
      setOptions([])
      return
    }
    setSearching(true)
    const { data, error } = await supabase.rpc('search_directory', {
      p_query: value.trim(),
      p_result_type: 'organizacion',
      p_discipline_code: null,
      p_location: null,
      p_limit: 8,
    })
    setSearching(false)
    if (error) {
      setOptions([])
      setMessage(error.message)
      return
    }
    const visibleIds = new Set(nodes.map((node) => node.organization_id))
    setOptions((data ?? [])
      .filter((organization) => !visibleIds.has(organization.entity_id) && organization.entity_id !== rootOrganizationId)
      .map((organization) => ({
        id: organization.entity_id,
        name: organization.display_name,
        username: organization.username,
        athlonx_code: organization.athlonx_code,
        logo_url: organization.avatar_url,
      })) as OrganizationOption[])
  }

  async function sendOrganizationInvitation() {
    if (!supabase || !selectedOrganization) {
      setMessage('Selecciona una organización para enviar la invitación.')
      return
    }
    setLoading(true)
    setMessage('')
    const { error } = await supabase.rpc('create_affiliation_request', {
      p_target_user_id: null,
      p_source_organization_id: rootOrganizationId,
      p_source_team_id: null,
      p_target_organization_id: selectedOrganization.id,
      p_role: null,
      p_role_label: null,
      p_relationship_type: 'supervisa',
      p_discipline_id: null,
      p_modality_id: null,
      p_target_team_id: null,
    })
    setLoading(false)
    if (error) return setMessage(error.message)
    setSelectedOrganization(null)
    setOptions([])
    setQuery('')
    setShowAddOrganization(false)
    setMessage('Invitación enviada. La organización deberá aceptarla para aparecer en esta jerarquía.')
  }

  const root = nodes.find((node) => node.depth === 0)
  const descendants = nodes.filter((node) => node.depth > 0)

  return <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
      <div>
        <p className="font-heading text-sm uppercase tracking-[.2em] text-[#b4ff45]">Autoridad institucional</p>
        <h2 className="mt-2 font-heading text-3xl font-black uppercase">Jerarquía organizacional</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Visualiza la cadena de autoridad y administra desde aquí los equipos y organizaciones que dependen de esta cuenta.</p>
      </div>
      <Network className="text-[#b4ff45]" size={30} />
    </div>

    <div className="mt-6 flex flex-wrap gap-3">
      <Link href={`/dashboard/equipos?organizationId=${rootOrganizationId}`} className="inline-flex items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e] hover:bg-[#c7ff73]"><Plus size={17} />Agregar equipo</Link>
      <button type="button" onClick={() => { setShowAddOrganization((value) => !value); setMessage('') }} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#31556b] px-4 py-3 text-sm font-bold text-white hover:border-[#b4ff45] hover:text-[#b4ff45]"><Building2 size={17} />Agregar organización</button>
    </div>

    {showAddOrganization && <div className="mt-5 rounded-[5px] border border-[#b4ff45]/30 bg-[#07131e] p-4">
      <p className="text-sm font-bold text-white">Invitar organización bajo esta autoridad</p>
      <p className="mt-1 text-xs text-slate-400">Busca por nombre, usuario o código AthlonX.</p>
      <div className="relative mt-3">
        <div className="flex items-center gap-3 rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-4 py-3 focus-within:border-[#b4ff45]"><Search size={18} className="text-[#b4ff45]" /><input value={selectedOrganization?.name || query} onChange={(event) => { const value = event.target.value; setSelectedOrganization(null); setQuery(value); void searchOrganizations(value) }} className="w-full bg-transparent text-white outline-none placeholder:text-slate-500" placeholder="Nombre, @usuario o AX-ORG-..." /></div>
        {!selectedOrganization && query.trim().length >= 2 && <div className="absolute left-0 right-0 top-[58px] z-10 overflow-hidden rounded-[5px] border border-[#31556b] bg-[#0b1d2c] shadow-xl">{searching && <p className="px-4 py-3 text-sm text-slate-400">Buscando organizaciones...</p>}{!searching && options.map((organization) => <button type="button" key={organization.id} onClick={() => { setSelectedOrganization(organization); setQuery(''); setOptions([]) }} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-white/5"><span className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-[#b4ff45]/10 text-[#b4ff45]"><Building2 size={16} /></span><span><strong className="block text-white">{organization.name}</strong><span className="text-xs text-slate-400">{organization.username ? `@${organization.username}` : 'Sin usuario'}{organization.athlonx_code ? ` · ${organization.athlonx_code}` : ''}</span></span></button>)}{!searching && !options.length && <p className="px-4 py-3 text-sm text-slate-500">No se encontraron organizaciones.</p>}</div>}
        {selectedOrganization && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/10 px-4 py-3 text-sm text-[#dfffba]">Seleccionada: <strong>{selectedOrganization.name}</strong><button type="button" onClick={() => setSelectedOrganization(null)} className="cursor-pointer text-xs font-bold text-[#b4ff45]">Cambiar</button></div>}
      </div>
      <button type="button" onClick={() => void sendOrganizationInvitation()} disabled={loading} className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e] disabled:cursor-wait disabled:opacity-60"><Send size={16} />{loading ? 'Enviando...' : 'Enviar invitación'}</button>
    </div>}

    {message && <p role="status" className="mt-5 rounded-[5px] border border-[#31556b] bg-[#07131e] px-4 py-3 text-sm text-slate-200">{message}</p>}

    <div className="mt-6 rounded-[5px] border border-[#31556b] bg-[#07131e] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[.2em] text-slate-400">Mapa de autoridad</p><span className="rounded-[5px] border border-[#31556b] px-2 py-1 text-xs text-slate-400">{nodes.length} organizaciones</span></div>
      <div className="mt-4 space-y-2">
        {root && <OrganizationMapNode node={root} />}
        {descendants.map((node) => <OrganizationMapNode key={node.organization_id} node={node} />)}
        {!nodes.length && <p className="text-sm text-slate-500">No se pudo cargar la jerarquía visible.</p>}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">Los equipos se agregan desde la sección Equipos. Las organizaciones aparecen aquí cuando aceptan la invitación.</p>
    </div>
  </section>
}

function OrganizationMapNode({ node }: { node: OrganizationNode }) {
  return <Link href={`/dashboard/organizaciones/${node.organization_id}`} style={{ marginLeft: `${Math.min(node.depth, 5) * 22}px` }} className="group flex items-center gap-3 rounded-[5px] border border-[#29485d] bg-[#0b1d2c] px-4 py-3 transition hover:border-[#b4ff45]">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-[#b4ff45] text-[#07131e]"><Building2 size={18} /></span>
    <span className="min-w-0 flex-1"><strong className="block truncate text-white">{node.organization_name}</strong><span className="text-xs text-slate-400">{node.depth === 0 ? 'Organización actual' : `${node.relationship_type || 'Subordinada'} · Nivel ${node.depth}`}</span></span>
    <ChevronRight size={18} className="text-slate-500 transition group-hover:text-[#b4ff45]" />
  </Link>
}

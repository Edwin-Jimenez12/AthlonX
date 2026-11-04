'use client'

import { ChevronRight, Search } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Card, CardHeader, cx, initialsOf } from './mi-equipo/ui'
import { Chip } from './organizacion/plan-ui'

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

const relationshipLabels: Record<string, string> = { supervisa: 'Supervisa', afiliada: 'Afiliada' }

// Jerarquía organizacional (diseño de Figma: Org · Organización). Mapa de autoridad e invitación inline.
export function OrganizationHierarchyPanel({ rootOrganizationId }: { rootOrganizationId: string }) {
  const [nodes, setNodes] = useState<OrganizationNode[]>([])
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<OrganizationOption[]>([])
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationOption | null>(null)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')

  async function loadHierarchy() {
    if (!supabase) return
    const { data, error } = await supabase.rpc('get_organization_hierarchy', { p_root_organization_id: rootOrganizationId })
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
    setOptions(((data ?? []) as Array<{ entity_id: string; display_name: string; username: string | null; athlonx_code: string | null; avatar_url: string | null }>)
      .filter((organization) => !visibleIds.has(organization.entity_id) && organization.entity_id !== rootOrganizationId)
      .map((organization) => ({
        id: organization.entity_id,
        name: organization.display_name,
        username: organization.username,
        athlonx_code: organization.athlonx_code,
        logo_url: organization.avatar_url,
      })))
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
    setMessage('Invitación enviada. La organización deberá aceptarla para aparecer en esta jerarquía.')
  }

  const ordered = [...nodes.filter((node) => node.depth === 0), ...nodes.filter((node) => node.depth > 0)]

  return (
    <Card className="flex flex-col gap-[18px]">
      <CardHeader id="jerarquia" title="Jerarquía organizacional" />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--ax-muted)]">Mapa de autoridad</p>
        <Chip>{nodes.length} {nodes.length === 1 ? 'organización' : 'organizaciones'}</Chip>
      </div>
      <div className="flex flex-col gap-2.5">
        {ordered.map((node) => (
          <div key={node.organization_id} style={{ paddingLeft: `${Math.min(node.depth, 5) * 24}px` }}>
            <Link href={`/organizaciones/${node.organization_id}`} className="group flex items-center gap-3 rounded-[14px] border border-[var(--ax-line)] px-3.5 py-3 transition-colors hover:border-[var(--ax-accent-text)]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[var(--ax-accent)] text-[13px] font-bold text-[var(--ax-on-accent)]">
                {node.organization_logo_url ? <img src={node.organization_logo_url} alt="" className="h-full w-full object-cover" /> : initialsOf(node.organization_name)}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-semibold text-[var(--ax-text)]">{node.organization_name}</strong>
                <span className="text-xs text-[var(--ax-muted)]">{node.depth === 0 ? 'Organización actual' : `${relationshipLabels[node.relationship_type ?? ''] ?? 'Subordinada'} · Nivel ${node.depth}`}</span>
              </span>
              <ChevronRight size={18} aria-hidden="true" className="text-[var(--ax-muted)] group-hover:text-[var(--ax-accent-text)]" />
            </Link>
          </div>
        ))}
        {!nodes.length && <p className="text-sm text-[var(--ax-muted)]">No se pudo cargar la jerarquía visible.</p>}
      </div>

      <div className="flex flex-col gap-2.5 rounded-[14px] border border-[var(--ax-line)] p-4">
        <p className="text-sm font-semibold text-[var(--ax-text)]">Invitar organización bajo esta autoridad</p>
        <div className="relative flex flex-col gap-2.5 sm:flex-row">
          <label className="flex h-10 flex-1 items-center gap-2.5 rounded-[10px] border border-[var(--ax-line-strong)] px-3.5 focus-within:border-[var(--ax-accent-text)]">
            <Search size={16} aria-hidden="true" className="shrink-0 text-[var(--ax-muted)]" />
            <span className="sr-only">Buscar organización</span>
            <input
              value={selectedOrganization?.name || query}
              onChange={(event) => { const value = event.target.value; setSelectedOrganization(null); setQuery(value); void searchOrganizations(value) }}
              className="w-full bg-transparent text-sm text-[var(--ax-text)] outline-none placeholder:text-[var(--ax-muted)]"
              placeholder="Nombre, @usuario o AX-ORG-..."
            />
          </label>
          <Button variant="secondary" disabled={loading || !selectedOrganization} onClick={() => void sendOrganizationInvitation()}>{loading ? 'Enviando…' : 'Enviar invitación'}</Button>
          {!selectedOrganization && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-12 z-10 overflow-hidden rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] shadow-[var(--ax-shadow-pop)]">
              {searching && <p className="px-4 py-3 text-sm text-[var(--ax-muted)]">Buscando organizaciones…</p>}
              {!searching && options.map((organization) => (
                <button type="button" key={organization.id} onClick={() => { setSelectedOrganization(organization); setQuery(''); setOptions([]) }} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-[var(--ax-hover)]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[var(--ax-accent-soft)] text-xs font-bold text-[var(--ax-accent-text)]">
                    {organization.logo_url ? <img src={organization.logo_url} alt="" className="h-full w-full object-cover" /> : initialsOf(organization.name)}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-[var(--ax-text)]">{organization.name}</strong>
                    <span className="text-xs text-[var(--ax-muted)]">{organization.athlonx_code || organization.username || 'Sin usuario'}</span>
                  </span>
                </button>
              ))}
              {!searching && !options.length && <p className="px-4 py-3 text-sm text-[var(--ax-muted)]">No se encontraron organizaciones.</p>}
            </div>
          )}
        </div>
        {selectedOrganization && (
          <p className="text-[13px] text-[var(--ax-text-secondary)]">
            Seleccionada: <strong className="text-[var(--ax-text)]">{selectedOrganization.name}</strong>{' '}
            <button type="button" onClick={() => setSelectedOrganization(null)} className={cx('cursor-pointer text-xs font-semibold text-[var(--ax-accent-text)]')}>Cambiar</button>
          </p>
        )}
      </div>

      {message && <p role="status" className="rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3 py-2.5 text-[13px] text-[var(--ax-text-secondary)]">{message}</p>}
      <p className="text-xs leading-5 text-[var(--ax-muted)]">Los equipos se agregan desde Equipos. Las organizaciones aparecen aquí cuando aceptan la invitación.</p>
    </Card>
  )
}

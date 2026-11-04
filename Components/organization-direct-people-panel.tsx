'use client'

import { Info, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Avatar, Button, ButtonLink, Card, CardHeader } from './mi-equipo/ui'
import { Chip, LimitMeter, upgradeHref } from './organizacion/plan-ui'

type Profile = {
  id: string
  full_name: string
  username: string | null
  athlonx_code: string | null
  avatar_url: string | null
}

type DirectPerson = {
  user_id: string
  full_name: string
  avatar_url: string | null
  role_label: string
  status: string
}

// Personas de la organización (diseño de Figma: Org · Organización). Respeta el límite de directivos y staff del plan.
export function OrganizationDirectPeoplePanel({ organizationId, planName, staffLimit, staffUsed, onChanged }: {
  organizationId?: string
  planName?: string
  staffLimit?: number | null
  staffUsed?: number
  onChanged?: () => void
}) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [people, setPeople] = useState<DirectPerson[]>([])
  const [query, setQuery] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  const used = staffUsed ?? 0
  const atLimit = staffLimit !== null && staffLimit !== undefined && used >= staffLimit

  async function loadPeople() {
    if (!supabase || !organizationId) return
    const { data, error } = await supabase.rpc('get_organization_direct_people', { p_organization_id: organizationId, p_query: null })
    if (error) setMessage(error.message)
    else setPeople((data ?? []) as DirectPerson[])
  }

  useEffect(() => { void loadPeople() }, [organizationId])

  async function searchProfiles(value: string) {
    if (!supabase || value.trim().length < 2) {
      setProfiles([])
      return
    }
    setSearching(true)
    const { data, error } = await supabase.rpc('search_directory', {
      p_query: value.trim(),
      p_result_type: 'persona',
      p_discipline_code: null,
      p_location: null,
      p_limit: 8,
    })
    setSearching(false)
    if (error) {
      setProfiles([])
      setMessage(error.message)
      return
    }
    const directIds = new Set(people.map((person) => person.user_id))
    setProfiles(((data ?? []) as Array<{ entity_id: string; display_name: string; username: string | null; athlonx_code: string | null; avatar_url: string | null }>)
      .filter((profile) => !directIds.has(profile.entity_id))
      .map((profile) => ({
        id: profile.entity_id,
        full_name: profile.display_name,
        username: profile.username,
        athlonx_code: profile.athlonx_code,
        avatar_url: profile.avatar_url,
      })))
  }

  async function sendRequest() {
    if (!supabase || !organizationId || !selectedProfile) {
      setMessage('Selecciona una persona para enviar la invitación.')
      return
    }
    setLoading(true)
    setMessage('')
    const { error } = await supabase.rpc('create_affiliation_request', {
      p_target_user_id: selectedProfile.id,
      p_target_organization_id: null,
      p_source_organization_id: organizationId,
      p_source_team_id: null,
      p_role: 'staff',
      p_role_label: 'Miembro de organización',
      p_relationship_type: null,
      p_discipline_id: null,
      p_modality_id: null,
      p_target_team_id: null,
    })
    setLoading(false)
    if (error) return setMessage(error.message)
    setSelectedProfile(null)
    setProfiles([])
    setQuery('')
    setMessage('Invitación enviada. La persona deberá aceptarla desde sus notificaciones.')
    onChanged?.()
  }

  return (
    <Card className="flex flex-col gap-[18px]">
      <CardHeader id="personas" title="Personas de la organización" />

      <div className="flex flex-col gap-2.5">
        {staffLimit !== undefined && <LimitMeter label="Directivos y staff" used={used} limit={staffLimit} />}
        {atLimit && (
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <Chip tone="accent">Llegaste al límite del plan {planName ?? 'Free'}</Chip>
            <ButtonLink href={upgradeHref} variant="secondary">Mejorar plan</ButtonLink>
          </div>
        )}
      </div>

      <div className="relative">
        <label className="flex h-10 items-center gap-2.5 rounded-[10px] border border-[var(--ax-line-strong)] px-3.5 focus-within:border-[var(--ax-accent-text)]">
          <Search size={16} aria-hidden="true" className="shrink-0 text-[var(--ax-muted)]" />
          <span className="sr-only">Buscar persona</span>
          <input
            value={selectedProfile?.full_name || query}
            disabled={atLimit}
            onChange={(event) => { const value = event.target.value; setSelectedProfile(null); setQuery(value); setMessage(''); void searchProfiles(value) }}
            className="w-full bg-transparent text-sm text-[var(--ax-text)] outline-none placeholder:text-[var(--ax-muted)] disabled:cursor-not-allowed"
            placeholder="Nombre, @usuario o AX-PER-..."
          />
        </label>
        {!selectedProfile && query.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-12 z-10 overflow-hidden rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] shadow-[var(--ax-shadow-pop)]">
            {searching && <p className="px-4 py-3 text-sm text-[var(--ax-muted)]">Buscando perfiles…</p>}
            {!searching && profiles.map((profile) => (
              <button type="button" key={profile.id} onClick={() => { setSelectedProfile(profile); setQuery(''); setProfiles([]) }} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-[var(--ax-hover)]">
                <Avatar name={profile.full_name} src={profile.avatar_url} size={32} />
                <span className="min-w-0">
                  <strong className="block truncate text-sm text-[var(--ax-text)]">{profile.full_name}</strong>
                  <span className="text-xs text-[var(--ax-muted)]">{profile.athlonx_code || profile.username || 'Sin usuario'}</span>
                </span>
              </button>
            ))}
            {!searching && !profiles.length && <p className="px-4 py-3 text-sm text-[var(--ax-muted)]">No se encontraron perfiles.</p>}
          </div>
        )}
      </div>
      {selectedProfile && <p className="text-[13px] text-[var(--ax-text-secondary)]">Seleccionado: <strong className="text-[var(--ax-text)]">{selectedProfile.full_name}</strong></p>}
      <Button variant="primary" disabled={loading || atLimit || !selectedProfile} onClick={() => void sendRequest()} className="w-full">{loading ? 'Enviando…' : 'Enviar invitación'}</Button>
      {message && <p role="status" className="flex items-start gap-2 rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3 py-2.5 text-[13px] text-[var(--ax-text-secondary)]"><Info size={15} aria-hidden="true" className="mt-0.5 shrink-0" />{message}</p>}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--ax-muted)]">Vinculaciones directas</p>
        <Chip>{people.length}</Chip>
      </div>
      {people.length ? (
        <ul className="flex flex-col gap-2.5">
          {people.map((person) => (
            <li key={person.user_id} className="flex items-center gap-3 rounded-[14px] border border-[var(--ax-line)] px-3.5 py-2.5">
              <Avatar name={person.full_name || 'Usuario sin nombre'} src={person.avatar_url} size={36} />
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-semibold text-[var(--ax-text)]">{person.full_name || 'Usuario sin nombre'}</strong>
                <span className="text-xs text-[var(--ax-muted)]">{person.role_label}{person.status === 'pending' ? ' · Pendiente' : ''}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--ax-muted)]">No hay personas vinculadas directamente.</p>
      )}
    </Card>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AccountContext, loadAccountContexts } from '../lib/account-contexts'
import { loadManagedTeams } from '../lib/team-access'
import { supabase } from '../lib/supabase'
import { useThemeMode, type ThemeMode } from '../lib/theme'
import { AccountMenu, AccountTrigger, type AccountIdentity } from './account-menu'
import { NotificationsMenu } from './notifications-menu'
import { announceHeaderMenu, useDismissableMenu } from './header-menu-dismiss'

const titles: Record<string, string> = {
  dashboard: 'Dashboard',
  busqueda: 'Búsqueda',
  atleta: 'Vista del atleta',
  'perfil-publico': 'Perfil público',
  'mi-perfil': 'Mi perfil',
  equipo: 'Mi equipo',
  entrenador: 'Panel del entrenador',
  staff: 'Panel del staff',
  organizaciones: 'Organizaciones',
  equipos: 'Equipos',
  torneos: 'Torneos',
  partidos: 'Partidos',
  estadisticas: 'Estadísticas',
  actualizaciones: 'Actualizaciones',
  notificaciones: 'Notificaciones',
  calendario: 'Calendario',
}

export function DashboardHeader() {
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const menuClusterRef = useRef<HTMLDivElement>(null)
  useDismissableMenu(menuClusterRef, 'account', profileOpen, () => setProfileOpen(false))
  const [identity, setIdentity] = useState<AccountIdentity>({ name: 'Usuario AthlonX', kind: 'Persona', code: '', email: '', round: true, publicHref: null })
  const [theme, setThemeMode] = useThemeMode()
  const [contexts, setContexts] = useState<AccountContext[]>([])
  const [activeContextId, setActiveContextId] = useState('')

  useEffect(() => {
    let active = true

    async function loadProfileName() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const { data: profile } = await supabase.from('profiles').select('full_name, athlonx_code, avatar_url').eq('id', data.user.id).maybeSingle()
      if (!active) return
      const personName = profile?.full_name || data.user.user_metadata?.full_name || 'Usuario AthlonX'
      const [accountContexts, teams] = await Promise.all([loadAccountContexts(data.user.id), loadManagedTeams(data.user.id)])
      const fallbackContexts: AccountContext[] = teams.map((team) => ({
        id: `team:${team.id}:${team.role}`,
        contextType: 'team',
        teamId: team.id,
        organizationId: null,
        name: team.name,
        discipline: team.discipline,
        organizationType: null,
        role: team.role === 'owner' ? 'directivo' : (team.role as AccountContext['role']),
        roleLabel: null,
      }))
      const contextsByKey = new Map<string, AccountContext>()
      for (const context of [...accountContexts, ...fallbackContexts]) {
        const key = `${context.contextType}:${context.teamId ?? context.organizationId ?? context.role}`
        if (!contextsByKey.has(key)) contextsByKey.set(key, context)
      }
      const availableContexts = [...contextsByKey.values()]
      const storedContextId = window.localStorage.getItem('athlonx-active-context-id')
      const accountType = data.user.user_metadata?.account_type
      const storedContext = availableContexts.find((context) => context.id === storedContextId)
      const storedContextMatchesAccount = accountType === 'equipo'
        ? storedContext?.contextType === 'team'
        : accountType === 'organizacion'
          ? storedContext?.contextType === 'organization'
          : storedContext?.contextType === 'personal'
      const preferredContextType = accountType === 'equipo' ? 'team' : accountType === 'organizacion' ? 'organization' : 'personal'
      const selectedContext = (storedContextMatchesAccount ? storedContext : null)
        ?? (preferredContextType ? availableContexts.find((context) => context.contextType === preferredContextType) : null)
        ?? availableContexts[0]
      if (!active) return
      setContexts(availableContexts)
      setActiveContextId(selectedContext?.id ?? '')
      const accountIdentity = await loadIdentity(accountType, selectedContext, { userId: data.user.id, email: data.user.email ?? '', name: personName, code: profile?.athlonx_code ?? '', imageUrl: profile?.avatar_url ?? null })
      if (active) setIdentity(accountIdentity)
      if (selectedContext) {
        window.localStorage.setItem('athlonx-active-context-id', selectedContext.id)
        if (selectedContext.teamId) window.localStorage.setItem('athlonx-active-team-id', selectedContext.teamId)
      }
    }
    void loadProfileName()

    const refreshContexts = () => { void loadProfileName() }
    window.addEventListener('athlonx-roles-updated', refreshContexts)
    return () => {
      active = false
      window.removeEventListener('athlonx-roles-updated', refreshContexts)
    }
  }, [])

  useEffect(() => {
    const syncProfileName = (event: Event) => {
      const detail = (event as CustomEvent<{ full_name?: string; avatar_url?: string | null; logo_url?: string | null; kind?: 'Persona' | 'Equipo' | 'Organización' }>).detail
      if (detail?.full_name) setIdentity((current) => (current.kind === 'Persona' ? { ...current, name: detail.full_name! } : current))
      // Foto, escudo o logotipo nuevo: se refleja al momento en el menú de cuenta.
      if (detail && 'avatar_url' in detail) setIdentity((current) => (current.kind === 'Persona' ? { ...current, imageUrl: detail.avatar_url ?? null } : current))
      if (detail && 'logo_url' in detail) setIdentity((current) => (current.kind === detail.kind ? { ...current, imageUrl: detail.logo_url ?? null } : current))
      if (detail && ('avatar_url' in detail || 'logo_url' in detail)) setContexts((current) => current.map((context) => {
        if ('avatar_url' in detail && context.contextType === 'personal') return { ...context, imageUrl: detail.avatar_url ?? null }
        const activeId = window.localStorage.getItem('athlonx-active-context-id')
        const sameKind = (detail.kind === 'Equipo' && context.contextType === 'team') || (detail.kind === 'Organización' && context.contextType === 'organization')
        if ('logo_url' in detail && sameKind && context.id === activeId) return { ...context, imageUrl: detail.logo_url ?? null }
        return context
      }))
    }
    window.addEventListener('athlonx-profile-updated', syncProfileName)
    return () => window.removeEventListener('athlonx-profile-updated', syncProfileName)
  }, [])

  function changeTheme(mode: ThemeMode) {
    void setThemeMode(mode)
  }

  const key = pathname?.startsWith('/perfil/') ? 'perfil-publico' : pathname?.split('/').filter(Boolean).pop() || 'dashboard'
  const activeContext = contexts.find((context) => context.id === activeContextId)
  return <header className="relative z-50 px-6 pt-6 text-white print:hidden lg:ml-64 md:px-10 md:pt-10">
    <div className="flex justify-end">
      <div ref={menuClusterRef} className="relative flex min-w-0 flex-wrap items-center justify-end gap-4">
        <NotificationsMenu />
        <span className="hidden h-7 w-px bg-[#294052] sm:block" />
        <div className="ax-v2 relative">
          <AccountTrigger identity={identity} open={profileOpen} onClick={() => { if (!profileOpen) announceHeaderMenu('account'); setProfileOpen(!profileOpen) }} />
          {profileOpen && <AccountMenu identity={identity} theme={theme} onTheme={changeTheme} onClose={() => setProfileOpen(false)} />}
        </div>
      </div>
    </div>
  </header>
}

// Datos de la cuenta activa para el menú: la persona, el equipo que administra o su organización.
async function loadIdentity(accountType: string | undefined, context: AccountContext | undefined, person: { userId: string; email: string; name: string; code: string; imageUrl?: string | null }): Promise<AccountIdentity> {
  const base: AccountIdentity = { name: person.name, kind: 'Persona', code: person.code, email: person.email, round: true, publicHref: `/perfil/${person.userId}`, imageUrl: person.imageUrl ?? null }
  if (!supabase) return base
  if (accountType === 'equipo') {
    const teamId = context?.teamId ?? window.localStorage.getItem('athlonx-active-team-id')
    if (!teamId) return { ...base, kind: 'Equipo', round: false, publicHref: null, imageUrl: null }
    const { data: team } = await supabase.from('teams').select('id, name, athlonx_code, logo_url').eq('id', teamId).maybeSingle()
    return { ...base, name: team?.name || context?.name || base.name, kind: 'Equipo', code: team?.athlonx_code ?? '', round: false, publicHref: team ? `/equipos/${team.id}` : null, imageUrl: team?.logo_url ?? null }
  }
  if (accountType === 'organizacion') {
    let organizationId = context?.organizationId ?? null
    if (!organizationId) {
      const { data: owned } = await supabase.from('organizations').select('id').eq('created_by', person.userId).order('created_at', { ascending: false }).limit(1)
      organizationId = owned?.[0]?.id ?? null
    }
    if (!organizationId) {
      const { data: memberships } = await supabase.from('organization_members').select('organization_id').eq('user_id', person.userId).in('role', ['owner', 'directivo']).eq('status', 'active').limit(1)
      organizationId = memberships?.[0]?.organization_id ?? null
    }
    if (!organizationId) return { ...base, kind: 'Organización', round: false, publicHref: null, imageUrl: null }
    const { data: organization } = await supabase.from('organizations').select('id, name, athlonx_code, logo_url').eq('id', organizationId).maybeSingle()
    return { ...base, name: organization?.name || context?.name || base.name, kind: 'Organización', code: organization?.athlonx_code ?? '', round: false, publicHref: organization ? `/organizaciones/${organization.id}` : null, imageUrl: organization?.logo_url ?? null }
  }
  return base
}

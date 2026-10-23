'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AccountContext, loadAccountContexts } from '../lib/account-contexts'
import { loadManagedTeams } from '../lib/team-access'
import { supabase } from '../lib/supabase'
import { useThemeMode, type ThemeMode } from '../lib/theme'
import { AccountMenu, AccountTrigger, type AccountIdentity } from './account-menu'
import { ContextSwitcher } from './context-switcher'
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
  const router = useRouter()
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
      const { data: profile } = await supabase.from('profiles').select('full_name, athlonx_code').eq('id', data.user.id).maybeSingle()
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
          : Boolean(storedContext)
      const preferredContextType = accountType === 'equipo' ? 'team' : accountType === 'organizacion' ? 'organization' : null
      const selectedContext = (storedContextMatchesAccount ? storedContext : null)
        ?? (preferredContextType ? availableContexts.find((context) => context.contextType === preferredContextType) : null)
        ?? availableContexts[0]
      if (!active) return
      setContexts(availableContexts)
      setActiveContextId(selectedContext?.id ?? '')
      const accountIdentity = await loadIdentity(accountType, selectedContext, { userId: data.user.id, email: data.user.email ?? '', name: personName, code: profile?.athlonx_code ?? '' })
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
      const detail = (event as CustomEvent<{ full_name?: string }>).detail
      if (detail?.full_name) setIdentity((current) => (current.kind === 'Persona' ? { ...current, name: detail.full_name! } : current))
    }
    window.addEventListener('athlonx-profile-updated', syncProfileName)
    return () => window.removeEventListener('athlonx-profile-updated', syncProfileName)
  }, [])

  function changeTheme(mode: ThemeMode) {
    void setThemeMode(mode)
  }

  function selectContext(context: AccountContext) {
    setActiveContextId(context.id)
    window.localStorage.setItem('athlonx-active-context-id', context.id)
    if (context.teamId) window.localStorage.setItem('athlonx-active-team-id', context.teamId)
    window.dispatchEvent(new CustomEvent('athlonx-context-change', { detail: context }))
    void (async () => {
      const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } }
      if (!data.user) return
      const accountIdentity = await loadIdentity(data.user.user_metadata?.account_type, context, { userId: data.user.id, email: data.user.email ?? '', name: identity.kind === 'Persona' ? identity.name : data.user.user_metadata?.full_name || 'Usuario AthlonX', code: identity.kind === 'Persona' ? identity.code : '' })
      setIdentity(accountIdentity)
    })()
    if (context.teamId) window.dispatchEvent(new CustomEvent('athlonx-team-change', { detail: context.teamId }))

    const destination = context.contextType === 'personal'
      ? context.role === 'entrenador'
        ? '/entrenador'
        : context.role === 'staff'
          ? '/staff'
          : context.role === 'atleta'
            ? '/atleta'
            : '/organizaciones'
      : context.contextType === 'organization'
      ? '/organizaciones'
      : context.role === 'entrenador'
        ? '/entrenador'
        : context.role === 'staff'
          ? '/staff'
          : context.role === 'atleta'
            ? '/atleta'
            : context.contextType === 'team'
              ? '/equipo'
              : '/mi-perfil'

    if (pathname !== destination) router.push(destination)
  }

  const key = pathname?.startsWith('/perfil/') ? 'perfil-publico' : pathname?.split('/').filter(Boolean).pop() || 'dashboard'
  const activeContext = contexts.find((context) => context.id === activeContextId)
  const selectableContexts = contexts
  const canSwitchContexts = selectableContexts.length > 1
  return <header className="relative z-50 px-6 pt-6 text-white print:hidden lg:ml-64 md:px-10 md:pt-10">
    <div className="flex justify-end">
      <div ref={menuClusterRef} className="relative flex min-w-0 flex-wrap items-center justify-end gap-4">
        {canSwitchContexts && <ContextSwitcher contexts={selectableContexts} activeContextId={activeContextId} onChange={selectContext} />}
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
async function loadIdentity(accountType: string | undefined, context: AccountContext | undefined, person: { userId: string; email: string; name: string; code: string }): Promise<AccountIdentity> {
  const base: AccountIdentity = { name: person.name, kind: 'Persona', code: person.code, email: person.email, round: true, publicHref: `/perfil/${person.userId}` }
  if (!supabase) return base
  if (accountType === 'equipo') {
    const teamId = context?.teamId ?? window.localStorage.getItem('athlonx-active-team-id')
    if (!teamId) return { ...base, kind: 'Equipo', round: false, publicHref: null }
    const { data: team } = await supabase.from('teams').select('id, name, athlonx_code').eq('id', teamId).maybeSingle()
    return { ...base, name: team?.name || context?.name || base.name, kind: 'Equipo', code: team?.athlonx_code ?? '', round: false, publicHref: team ? `/equipos/${team.id}` : null }
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
    if (!organizationId) return { ...base, kind: 'Organización', round: false, publicHref: null }
    const { data: organization } = await supabase.from('organizations').select('id, name, athlonx_code').eq('id', organizationId).maybeSingle()
    return { ...base, name: organization?.name || context?.name || base.name, kind: 'Organización', code: organization?.athlonx_code ?? '', round: false, publicHref: organization ? `/organizaciones/${organization.id}` : null }
  }
  return base
}

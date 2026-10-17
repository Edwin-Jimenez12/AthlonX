'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AccountContext, loadAccountContexts } from '../lib/account-contexts'
import { loadManagedTeams } from '../lib/team-access'
import { supabase } from '../lib/supabase'
import { useThemeMode, type ThemeMode } from '../lib/theme'
import { AccountMenu } from './account-menu'
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
  const [profileName, setProfileName] = useState('Usuario AthlonX')
  const [theme, setThemeMode] = useThemeMode()
  const [contexts, setContexts] = useState<AccountContext[]>([])
  const [activeContextId, setActiveContextId] = useState('')

  useEffect(() => {
    let active = true

    async function loadProfileName() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', data.user.id).maybeSingle()
      if (!active) return
      setProfileName(profile?.full_name || data.user.user_metadata?.full_name || 'Usuario AthlonX')
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
      if (detail?.full_name) setProfileName(detail.full_name)
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

  const initials = profileName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'
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
        <button type="button" onClick={() => { if (!profileOpen) announceHeaderMenu('account'); setProfileOpen(!profileOpen) }} aria-label="Abrir menú de cuenta" className="flex cursor-pointer items-center gap-2 rounded-[5px] border border-transparent p-1 pr-2 hover:border-[#29485d] hover:bg-white/5">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#b4ff45] font-heading text-base font-bold text-[#07131e]">{initials}</span>
          <span className="hidden max-w-48 truncate font-body text-base font-semibold text-[#e8eef3] sm:block">{profileName}</span>
        </button>
        {profileOpen && <AccountMenu name={profileName} theme={theme} onTheme={changeTheme} onClose={() => setProfileOpen(false)} />}
      </div>
    </div>
  </header>
}

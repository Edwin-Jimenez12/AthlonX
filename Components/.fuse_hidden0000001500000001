'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AccountContext, loadAccountContexts } from '../lib/account-contexts'
import { loadManagedTeams } from '../lib/team-access'
import { supabase } from '../lib/supabase'
import { AccountMenu } from './account-menu'
import { ContextSwitcher } from './context-switcher'
import { NotificationsMenu } from './notifications-menu'

const titles: Record<string, string> = {
  dashboard: 'Dashboard',
  busqueda: 'Búsqueda',
  atleta: 'Vista del atleta',
  'perfil-publico': 'Perfil público',
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
  const [profileName, setProfileName] = useState('Usuario AthlonX')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [contexts, setContexts] = useState<AccountContext[]>([])
  const [activeContextId, setActiveContextId] = useState('')

  useEffect(() => {
    const stored = window.localStorage.getItem('athlonx-theme') === 'light' ? 'light' : 'dark'
    setTheme(stored)
    document.documentElement.dataset.theme = stored
  }, [])

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

  function changeTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    window.localStorage.setItem('athlonx-theme', next)
    setProfileOpen(false)
  }

  function selectContext(context: AccountContext) {
    setActiveContextId(context.id)
    window.localStorage.setItem('athlonx-active-context-id', context.id)
    if (context.teamId) window.localStorage.setItem('athlonx-active-team-id', context.teamId)
    window.dispatchEvent(new CustomEvent('athlonx-context-change', { detail: context }))
    if (context.teamId) window.dispatchEvent(new CustomEvent('athlonx-team-change', { detail: context.teamId }))

    const destination = context.contextType === 'personal'
      ? context.role === 'entrenador'
        ? '/dashboard/entrenador'
        : context.role === 'staff'
          ? context.contextType === 'personal' ? '/dashboard/calendario' : '/dashboard/staff'
          : context.role === 'atleta'
            ? '/dashboard/atleta'
            : '/dashboard/organizaciones'
      : context.contextType === 'organization'
      ? '/dashboard/organizaciones'
      : context.role === 'entrenador'
        ? '/dashboard/entrenador'
        : context.role === 'staff'
          ? '/dashboard/staff'
          : context.role === 'atleta'
            ? '/dashboard/atleta'
            : context.contextType === 'team'
              ? '/dashboard/equipo'
              : '/dashboard/perfil'

    if (pathname !== destination) router.push(destination)
  }

  const initials = profileName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'
  const key = pathname?.startsWith('/dashboard/perfil/') ? 'perfil-publico' : pathname?.split('/').filter(Boolean).pop() || 'dashboard'
  const activeContext = contexts.find((context) => context.id === activeContextId)
  const selectableContexts = contexts
  const canSwitchContexts = selectableContexts.length > 1
  return <header className="border-b border-[#1b3548] bg-[#07131e]/95 px-6 py-4 text-white backdrop-blur-xl print:hidden lg:ml-64 md:px-10">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
      <h1 className="truncate font-display text-3xl uppercase tracking-wide sm:text-4xl">{titles[key] || 'AthlonX'}</h1>
      <div className="relative flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
        {canSwitchContexts && <ContextSwitcher contexts={selectableContexts} activeContextId={activeContextId} onChange={selectContext} />}
        <NotificationsMenu />
        <span className="hidden h-7 w-px bg-[#294052] sm:block" />
        <button type="button" onClick={() => setProfileOpen((open) => !open)} aria-label="Abrir menú de cuenta" className="flex cursor-pointer items-center gap-2 rounded-[5px] border border-transparent p-1 pr-2 hover:border-[#29485d] hover:bg-white/5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[5px] bg-[#b4ff45] font-heading font-bold text-[#07131e]">{initials}</span>
          <span className="hidden max-w-40 truncate font-semibold sm:block">{profileName}</span>
        </button>
        {profileOpen && <AccountMenu name={profileName} theme={theme} onTheme={changeTheme} onClose={() => setProfileOpen(false)} />}
      </div>
    </div>
  </header>
}

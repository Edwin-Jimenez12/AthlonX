'use client'

import Link from 'next/link'
import { Bell, Building2, CalendarDays, Globe2, Menu, Megaphone, Search, Shield, Users } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AccountContext, loadAccountContexts } from '../lib/account-contexts'
import { loadManagedTeams } from '../lib/team-access'
import { supabase } from '../lib/supabase'

type NavigationItem = { label: string; icon: LucideIcon; href?: string; disabled?: boolean; notice?: string }

const calendarNotice = 'El calendario llegará próximamente.'

const searchNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/dashboard/busqueda' },
  { label: 'Notificaciones', icon: Bell, href: '/dashboard/notificaciones' },
]

const teamNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/dashboard/busqueda' },
  { label: 'Notificaciones', icon: Bell, href: '/dashboard/notificaciones' },
  { label: 'Mi equipo', icon: Shield, href: '/dashboard/equipo' },
  { label: 'Eventos', icon: CalendarDays, href: '/dashboard/eventos' },
  { label: 'Calendario', icon: CalendarDays, href: '/dashboard/calendario', disabled: true, notice: calendarNotice },
]

const trainerNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/dashboard/busqueda' },
  { label: 'Notificaciones', icon: Bell, href: '/dashboard/notificaciones' },
  { label: 'Mi equipo', icon: Shield, href: '/dashboard/entrenador' },
  { label: 'Calendario', icon: CalendarDays, href: '/dashboard/calendario', disabled: true, notice: calendarNotice },
]

const staffNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/dashboard/busqueda' },
  { label: 'Notificaciones', icon: Bell, href: '/dashboard/notificaciones' },
  { label: 'Calendario', icon: CalendarDays, href: '/dashboard/calendario', disabled: true, notice: calendarNotice },
]

const personNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/dashboard/busqueda' },
  { label: 'Notificaciones', icon: Bell, href: '/dashboard/notificaciones' },
  { label: 'Calendario', icon: CalendarDays, href: '/dashboard/calendario', disabled: true, notice: calendarNotice },
]

const athleteNavigation = personNavigation

const organizationNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/dashboard/busqueda' },
  { label: 'Notificaciones', icon: Bell, href: '/dashboard/notificaciones' },
  { label: 'Organización', icon: Building2, href: '/dashboard/organizaciones' },
  { label: 'Perfil público', icon: Globe2, href: '/dashboard/organizaciones/perfil' },
  { label: 'Eventos', icon: CalendarDays, href: '/dashboard/eventos' },
  { label: 'Calendario', icon: CalendarDays, href: '/dashboard/calendario', disabled: true, notice: calendarNotice },
  { label: 'Equipos', icon: Users, href: '/dashboard/equipos' },
  { label: 'Participantes', icon: Shield, disabled: true },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [accountType, setAccountType] = useState('')
  const [isTrainer, setIsTrainer] = useState(false)
  const [isStaff, setIsStaff] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [contexts, setContexts] = useState<AccountContext[]>([])
  const [activeContextId, setActiveContextId] = useState('')
  const close = () => setOpen(false)

  useEffect(() => {
    let active = true

    async function loadAccountType() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (!active) return
      setAccountType(data.user?.user_metadata?.account_type ?? '')
      if (!data.user) return
      const metadataRoles = Array.isArray(data.user?.user_metadata?.roles) ? data.user.user_metadata.roles : []
      const [{ data: storedRoles }, accountContexts, managedTeams] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', data.user.id),
        loadAccountContexts(data.user.id),
        loadManagedTeams(data.user.id),
      ])
      setIsTrainer(metadataRoles.includes('entrenador') || Boolean(storedRoles?.some(({ role }) => role === 'entrenador')))
      setIsStaff(metadataRoles.includes('staff') || Boolean(storedRoles?.some(({ role }) => role === 'staff')))
      const { data: admin } = await supabase.from('platform_update_admins').select('user_id').eq('user_id', data.user.id).maybeSingle()
      if (!active) return
      setIsPlatformAdmin(Boolean(admin))
      const fallbackContexts: AccountContext[] = managedTeams.map((team) => ({
        id: `team:${team.id}:${team.role}`,
        contextType: 'team',
        teamId: team.id,
        organizationId: null,
        name: team.name,
        discipline: team.discipline,
        role: team.role === 'owner' ? 'directivo' : team.role as AccountContext['role'],
        roleLabel: null,
      }))
      const contextsByKey = new Map<string, AccountContext>()
      for (const context of [...accountContexts, ...fallbackContexts]) {
        const key = `${context.contextType}:${context.teamId ?? context.organizationId ?? context.role}`
        if (!contextsByKey.has(key)) contextsByKey.set(key, context)
      }
      const availableContexts = [...contextsByKey.values()]
      setContexts(availableContexts)
      const storedContextId = window.localStorage.getItem('athlonx-active-context-id')
      const storedContext = availableContexts.find((context) => context.id === storedContextId)
      const accountType = data.user.user_metadata?.account_type
      const storedContextMatchesAccount = accountType === 'equipo'
        ? storedContext?.contextType === 'team'
        : accountType === 'organizacion'
          ? storedContext?.contextType === 'organization'
          : Boolean(storedContext)
      const preferredContextType = accountType === 'equipo' ? 'team' : accountType === 'organizacion' ? 'organization' : null
      const selectedContext = (storedContextMatchesAccount ? storedContext : null)
        ?? (preferredContextType ? availableContexts.find((context) => context.contextType === preferredContextType) : null)
        ?? availableContexts[0]
      setActiveContextId(selectedContext?.id ?? '')
    }
    void loadAccountType()

    const refreshRoles = () => { void loadAccountType() }
    window.addEventListener('athlonx-roles-updated', refreshRoles)
    return () => {
      active = false
      window.removeEventListener('athlonx-roles-updated', refreshRoles)
    }
  }, [])

  useEffect(() => {
    const syncContext = (event: Event) => {
      const context = (event as CustomEvent<AccountContext>).detail
      if (context?.id) setActiveContextId(context.id)
    }
    window.addEventListener('athlonx-context-change', syncContext)
    return () => window.removeEventListener('athlonx-context-change', syncContext)
  }, [])

  const activeContext = contexts.find((context) => context.id === activeContextId)
  let baseNavigation = personNavigation
  if (activeContext?.contextType === 'organization') {
    baseNavigation = organizationNavigation
  } else if (activeContext?.contextType === 'personal' && activeContext.role === 'entrenador') {
    baseNavigation = trainerNavigation
  } else if (activeContext?.contextType === 'personal' && activeContext.role === 'staff') {
    baseNavigation = staffNavigation
  } else if (activeContext?.contextType === 'personal' && activeContext.role === 'directivo') {
    baseNavigation = organizationNavigation
  } else if (activeContext?.contextType === 'team' && activeContext.role === 'entrenador') {
    baseNavigation = trainerNavigation
  } else if (activeContext?.contextType === 'team' && activeContext.role === 'staff') {
    baseNavigation = staffNavigation
  } else if (activeContext?.contextType === 'team' && activeContext.role === 'atleta') {
    baseNavigation = athleteNavigation
  } else if (activeContext?.contextType === 'team') {
    baseNavigation = teamNavigation
  } else if (!activeContext && accountType === 'organizacion') {
    baseNavigation = organizationNavigation
  } else if (!activeContext && accountType === 'equipo') {
    baseNavigation = teamNavigation
  } else if (!activeContext && isTrainer) {
    baseNavigation = trainerNavigation
  } else if (!activeContext && isStaff) {
    baseNavigation = staffNavigation
  }
  const navigation = isPlatformAdmin ? [...baseNavigation, { label: 'Actualizaciones', icon: Megaphone, href: '/dashboard/actualizaciones' }] : baseNavigation

  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menú" className="fixed left-4 top-4 z-30 flex h-11 w-11 cursor-pointer items-center justify-center rounded-[5px] border border-[#29485d] bg-[#081522] text-white shadow-lg print:hidden lg:hidden"><Menu size={22} /></button>
    {open && <button type="button" onClick={close} aria-label="Cerrar menú" className="fixed inset-0 z-30 cursor-pointer bg-[#081522]/60 print:hidden lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#1b3548] bg-[#07131e] px-5 py-6 text-white shadow-2xl transition-transform duration-200 print:hidden lg:z-20 lg:translate-x-0 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <Link href="/dashboard/busqueda" onClick={close} className="block border-b border-white/10 pb-7"><img src="/MarcaAthlonX/MarcaHorizontal.svg" alt="AthlonX" className="w-44" /></Link>
      <nav className="mt-8 space-y-2">{navigation.map(({ label, icon: Icon, href, disabled, notice }) => {
        if (disabled || label === 'Calendario') return <button key={label} type="button" onClick={() => window.alert(notice || calendarNotice)} title={notice || calendarNotice} className="flex w-full cursor-pointer items-center gap-4 rounded-[5px] px-4 py-3 text-left font-heading text-lg text-slate-500 opacity-70 hover:bg-white/10"><Icon size={20} /><span className="flex min-w-0 flex-1 items-center justify-between gap-2"><span>{label}</span><span className="text-[9px] font-bold uppercase tracking-wider text-[#b4ff45]">Próximamente</span></span></button>
        if (!href) return null
        const isActive = pathname === href.split('#')[0] && !href.includes('#')
        return <Link key={href} href={href} onClick={close} className={`flex w-full cursor-pointer items-center gap-4 rounded-[5px] px-4 py-3 font-heading text-lg transition hover:bg-white/10 hover:text-white ${isActive ? 'bg-[#b4ff45] font-bold text-[#081522]' : 'text-slate-300'}`}><Icon size={20} />{label}</Link>
      })}</nav>
    </aside>
  </>
}

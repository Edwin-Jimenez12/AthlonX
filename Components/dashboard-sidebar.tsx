'use client'

import Link from 'next/link'
import { Bell, Building2, CalendarDays, Circle, Globe2, Menu, Megaphone, Search, Shield, Users } from 'lucide-react'
import { settingsSectionIcons, useSettingsNavConfig } from './settings-nav'
import { usePathname } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AccountContext, loadAccountContexts } from '../lib/account-contexts'
import { useThemeMode } from '../lib/theme'
import { loadManagedTeams } from '../lib/team-access'
import { supabase } from '../lib/supabase'

type NavigationItem = { label: string; icon: LucideIcon; href?: string; disabled?: boolean; notice?: string }

const calendarNotice = 'El calendario llegará próximamente.'


const searchNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/busqueda' },
  { label: 'Notificaciones', icon: Bell, href: '/notificaciones' },
]

const teamNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/busqueda' },
  { label: 'Notificaciones', icon: Bell, href: '/notificaciones' },
  { label: 'Mi equipo', icon: Shield, href: '/equipo' },
  { label: 'Eventos', icon: CalendarDays, href: '/eventos' },
  { label: 'Calendario', icon: CalendarDays, href: '/calendario', disabled: true, notice: calendarNotice },
]

const trainerNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/busqueda' },
  { label: 'Notificaciones', icon: Bell, href: '/notificaciones' },
  { label: 'Mi equipo', icon: Shield, href: '/entrenador' },
  { label: 'Calendario', icon: CalendarDays, href: '/calendario', disabled: true, notice: calendarNotice },
]

const staffNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/busqueda' },
  { label: 'Notificaciones', icon: Bell, href: '/notificaciones' },
  { label: 'Calendario', icon: CalendarDays, href: '/calendario', disabled: true, notice: calendarNotice },
]

const personNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/busqueda' },
  { label: 'Notificaciones', icon: Bell, href: '/notificaciones' },
  { label: 'Calendario', icon: CalendarDays, href: '/calendario', disabled: true, notice: calendarNotice },
]

const athleteNavigation = personNavigation

const organizationNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/busqueda' },
  { label: 'Notificaciones', icon: Bell, href: '/notificaciones' },
  { label: 'Organización', icon: Building2, href: '/organizaciones' },
  { label: 'Eventos', icon: CalendarDays, href: '/eventos' },
  { label: 'Calendario', icon: CalendarDays, href: '/calendario', disabled: true, notice: calendarNotice },
  { label: 'Equipos', icon: Users, href: '/equipos' },
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
        organizationType: null,
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
  const navigation = isPlatformAdmin ? [...baseNavigation, { label: 'Actualizaciones', icon: Megaphone, href: '/actualizaciones' }] : baseNavigation
  const activeHref = navigation.find((item) => item.href && pathname === item.href.split('#')[0] && !item.href.includes('#'))?.href ?? ''
  const settingsNav = useSettingsNavConfig()
  const [themeMode] = useThemeMode()
  const light = themeMode === 'light'
  const asideSurface = light
    ? 'border-r border-[#d3dde6] bg-white text-[#0b1d2c] shadow-[14px_0_40px_-28px_rgba(11,29,44,.28)]'
    : 'border-r border-[#1d3a4d] bg-gradient-to-b from-[#0a1b2a] via-[#081522] to-[#07131e] text-white shadow-2xl'
  const muted = light ? 'text-[#5b7185]' : 'text-[#5f7d91]'
  const idleItem = light ? 'text-[#26394a] hover:bg-[#0b1d2c]/[.05] hover:text-[#0b1d2c]' : 'text-[#c9d6e0] hover:bg-white/[.06] hover:text-white'
  const pronto = light ? 'border-[#bccad6] text-[#3f7d00]' : 'border-[#29485d] text-[#b4ff45]/80'
  const settingsSections = settingsNav?.sections ?? null
  const activeKey = settingsSections ? `section:${settingsNav?.activeSection ?? ''}` : activeHref

  // Indicador deslizante: se mueve desde el ítem anterior hasta el activo.
  const navRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<Record<string, HTMLElement | null>>({})
  const [indicator, setIndicator] = useState({ top: 0, height: 0, visible: false })
  const [layoutTick, setLayoutTick] = useState(0)
  useEffect(() => {
    const onResize = () => setLayoutTick((tick) => tick + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  useLayoutEffect(() => {
    const node = activeKey ? itemRefs.current[activeKey] : null
    if (!node) {
      setIndicator((current) => (current.visible ? { ...current, visible: false } : current))
      return
    }
    setIndicator({ top: node.offsetTop, height: node.offsetHeight, visible: true })
  }, [activeKey, layoutTick, open])

  // En móvil el botón, el velo y el menú van por encima de la cabecera (relative z-50), que ocupa todo el ancho.
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menú" className="fixed left-4 top-4 z-[60] flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-[#29485d] bg-[#081522]/95 text-white shadow-lg backdrop-blur print:hidden lg:hidden"><Menu size={22} /></button>
    {open && <button type="button" onClick={close} aria-label="Cerrar menú" className="fixed inset-0 z-[60] cursor-pointer bg-[#020b12]/60 backdrop-blur-[2px] print:hidden lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-[70] flex w-64 flex-col overflow-x-hidden overflow-y-auto ${asideSurface} px-4 py-6 transition-transform duration-300 ease-[cubic-bezier(.22,.61,.36,1)] motion-reduce:transition-none print:hidden lg:z-20 lg:translate-x-0 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <Link href="/busqueda" onClick={close} className="group flex shrink-0 items-center pb-6">
        <img src={light ? "/MarcaAthlonX/MarcaHorizontalClara.svg" : "/MarcaAthlonX/MarcaHorizontal.svg"} alt="AthlonX" style={{ width: 207, height: 28, maxWidth: "none" }} className="shrink-0 transition duration-300 group-hover:brightness-110" />
      </Link>
      <p className={`px-3 pb-3 font-body text-[10px] font-semibold uppercase tracking-[0.24em] ${muted}`}>{settingsSections ? 'Mi perfil' : 'Menú'}</p>
      <nav ref={navRef} className="relative flex flex-col gap-1">
        <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 w-full rounded-xl bg-gradient-to-r from-[#b4ff45] to-[#a2f02e] shadow-[0_8px_24px_-8px_rgba(180,255,69,.55)] transition-[transform,height,opacity] duration-500 ease-[cubic-bezier(.22,.61,.36,1)] motion-reduce:transition-none" style={{ transform: `translateY(${indicator.top}px)`, height: indicator.height, opacity: indicator.visible ? 1 : 0 }} />
        {settingsSections && settingsSections.map((section) => {
          const isActive = section.id === settingsNav?.activeSection
          const Icon = settingsSectionIcons[section.id] ?? Circle
          return <button key={section.id} type="button" ref={(node) => { itemRefs.current[`section:${section.id}`] = node }} onClick={() => settingsNav?.onSection(section.id)} aria-current={isActive ? 'page' : undefined} className={`relative z-10 flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-300 motion-reduce:transition-none ${isActive ? 'font-semibold text-[#07131e]' : idleItem}`}>
            <Icon size={18} className="shrink-0" aria-hidden="true" />
            <span className="font-barlow text-[18px] font-semibold leading-none">{section.label}</span>
          </button>
        })}
        {!settingsSections && navigation.map(({ label, icon: Icon, href, disabled, notice }) => {
          if (disabled || label === 'Calendario') return <div key={label} aria-disabled="true" title={notice || calendarNotice} className={`relative z-10 flex w-full cursor-default items-center gap-3 rounded-xl px-3 py-2.5 ${muted}`}><Icon size={18} className="shrink-0" /><span className="font-barlow text-[18px] font-semibold leading-none">{label}</span><span className={`ml-auto rounded-full border px-2 py-0.5 font-body text-[9px] font-semibold uppercase tracking-[0.12em] ${pronto}`}>Pronto</span></div>
          if (!href) return null
          const isActive = href === activeHref
          return <Link key={href} href={href} onClick={close} ref={(node) => { itemRefs.current[href] = node }} aria-current={isActive ? 'page' : undefined} className={`group relative z-10 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-300 motion-reduce:transition-none ${isActive ? 'font-semibold text-[#07131e]' : idleItem}`}>
            <Icon size={18} className={`shrink-0 transition-transform duration-300 motion-reduce:transform-none ${isActive ? '' : 'group-hover:translate-x-0.5 group-hover:scale-110'}`} />
            <span className="font-barlow text-[18px] font-semibold leading-none">{label}</span>
          </Link>
        })}
      </nav>
    </aside>
  </>
}

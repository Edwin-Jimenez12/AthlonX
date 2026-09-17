'use client'

import Link from 'next/link'
import { BarChart3, Building2, CalendarDays, ClipboardCheck, ClipboardList, Menu, Megaphone, MessageSquare, Search, Shield, UserCircle, Users } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AccountContext, loadAccountContexts } from '../lib/account-contexts'
import { supabase } from '../lib/supabase'

type NavigationItem = { label: string; icon: LucideIcon; href: string }

const searchNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/dashboard/busqueda' },
]

const teamNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/dashboard/busqueda' },
  { label: 'Mi equipo', icon: Shield, href: '/dashboard/equipo' },
  { label: 'Eventos', icon: CalendarDays, href: '/dashboard/equipo#eventos' },
  { label: 'Plantilla', icon: Users, href: '/dashboard/equipo#plantilla' },
  { label: 'Calendario', icon: CalendarDays, href: '/dashboard/equipo#calendario' },
  { label: 'Estadísticas', icon: BarChart3, href: '/dashboard/equipo#estadisticas' },
]

const trainerNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/dashboard/busqueda' },
  { label: 'Mi equipo', icon: Shield, href: '/dashboard/entrenador' },
  { label: 'Entrenamientos', icon: CalendarDays, href: '/dashboard/entrenador#entrenamientos' },
  { label: 'Asistencia', icon: ClipboardCheck, href: '/dashboard/entrenador#asistencia' },
  { label: 'Estadísticas', icon: BarChart3, href: '/dashboard/entrenador#estadisticas' },
  { label: 'Formaciones', icon: ClipboardList, href: '/dashboard/entrenador#formaciones' },
  { label: 'Comunicados', icon: MessageSquare, href: '/dashboard/entrenador#comunicados' },
]

const staffNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/dashboard/busqueda' },
  { label: 'Mi panel', icon: Shield, href: '/dashboard/staff' },
  { label: 'Asistencia', icon: ClipboardCheck, href: '/dashboard/staff#asistencia' },
  { label: 'Comunicados', icon: MessageSquare, href: '/dashboard/staff#comunicados' },
  { label: 'Reportes', icon: BarChart3, href: '/dashboard/staff#reportes' },
]

const athleteNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/dashboard/busqueda' },
  { label: 'Mi vista', icon: UserCircle, href: '/dashboard/atleta' },
  { label: 'Mi cuenta', icon: Users, href: '/dashboard/perfil' },
]

const organizationNavigation: NavigationItem[] = [
  { label: 'Búsqueda', icon: Search, href: '/dashboard/busqueda' },
  { label: 'Organización', icon: Building2, href: '/dashboard/organizaciones' },
  { label: 'Eventos', icon: CalendarDays, href: '/dashboard/organizaciones#eventos' },
  { label: 'Equipos', icon: Users, href: '/dashboard/equipos' },
  { label: 'Participantes', icon: Shield, href: '/dashboard/participantes' },
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
    async function loadAccountType() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      setAccountType(data.user?.user_metadata?.account_type ?? '')
      if (!data.user) return
      const metadataRoles = Array.isArray(data.user?.user_metadata?.roles) ? data.user.user_metadata.roles : []
      const [{ data: storedRoles }, accountContexts] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', data.user.id),
        loadAccountContexts(data.user.id),
      ])
      setIsTrainer(metadataRoles.includes('entrenador') || Boolean(storedRoles?.some(({ role }) => role === 'entrenador')))
      setIsStaff(metadataRoles.includes('staff') || Boolean(storedRoles?.some(({ role }) => role === 'staff')))
      const { data: admin } = await supabase.from('platform_update_admins').select('user_id').eq('user_id', data.user.id).maybeSingle()
      setIsPlatformAdmin(Boolean(admin))
      setContexts(accountContexts)
      const storedContextId = window.localStorage.getItem('athlonx-active-context-id')
      setActiveContextId(accountContexts.find((context) => context.id === storedContextId)?.id ?? accountContexts[0]?.id ?? '')
    }
    void loadAccountType()
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
  const baseNavigation = activeContext?.contextType === 'organization'
    ? organizationNavigation
    : activeContext?.contextType === 'team' && activeContext.role === 'entrenador'
      ? trainerNavigation
      : activeContext?.contextType === 'team' && activeContext.role === 'staff'
        ? staffNavigation
        : activeContext?.contextType === 'team' && activeContext.role === 'atleta'
          ? athleteNavigation
          : activeContext?.contextType === 'team'
            ? teamNavigation
            : activeContext?.role === 'entrenador'
              ? trainerNavigation
              : activeContext?.role === 'staff'
                ? staffNavigation
                : activeContext?.role === 'atleta'
                  ? athleteNavigation
                  : accountType === 'organizacion' ? organizationNavigation : accountType === 'equipo' ? teamNavigation : isTrainer ? trainerNavigation : isStaff ? staffNavigation : searchNavigation
  const navigation = isPlatformAdmin ? [...baseNavigation, { label: 'Actualizaciones', icon: Megaphone, href: '/dashboard/actualizaciones' }] : baseNavigation

  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menú" className="fixed left-4 top-4 z-30 flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-[#081522] text-white shadow-lg print:hidden lg:hidden"><Menu size={22} /></button>
    {open && <button type="button" onClick={close} aria-label="Cerrar menú" className="fixed inset-0 z-30 cursor-pointer bg-[#081522]/60 print:hidden lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#081522] px-6 py-7 text-white shadow-2xl transition-transform duration-200 print:hidden lg:z-20 lg:w-64 lg:translate-x-0 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <Link href="/" onClick={close} className="block border-b border-white/10 pb-7"><img src="/MarcaAthlonX/MarcaHorizontal.svg" alt="AthlonX" className="w-44" /><p className="mt-2 text-[10px] uppercase tracking-[.35em] text-slate-500">Gestión deportiva</p></Link>
      <nav className="mt-8 space-y-2">{navigation.map(({ label, icon: Icon, href }) => { const isActive = pathname === href.split('#')[0] && !href.includes('#'); return <Link key={href} href={href} onClick={close} className={`flex w-full cursor-pointer items-center gap-4 rounded-xl px-4 py-3 font-heading text-lg transition hover:bg-white/10 hover:text-white ${isActive ? 'bg-[#b4ff45] font-bold text-[#081522]' : 'text-slate-300'}`}><Icon size={20} />{label}</Link> })}</nav>
    </aside>
  </>
}

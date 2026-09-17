'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { loadManagedTeams, ManagedTeam } from '../lib/team-access'
import { supabase } from '../lib/supabase'
import { AccountMenu } from './account-menu'
import { NotificationsMenu } from './notifications-menu'

const titles: Record<string, string> = {
  dashboard: 'Dashboard',
  busqueda: 'Búsqueda',
  equipo: 'Mi equipo',
  entrenador: 'Panel del entrenador',
  staff: 'Panel del staff',
  organizaciones: 'Organizaciones',
  equipos: 'Equipos',
  torneos: 'Torneos',
  partidos: 'Partidos',
  estadisticas: 'Estadísticas',
  actualizaciones: 'Actualizaciones',
}

export function DashboardHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [profileOpen, setProfileOpen] = useState(false)
  const [teamMenuOpen, setTeamMenuOpen] = useState(false)
  const [profileName, setProfileName] = useState('Usuario AthlonX')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [managedTeams, setManagedTeams] = useState<ManagedTeam[]>([])
  const [activeTeamId, setActiveTeamId] = useState('')

  useEffect(() => {
    const stored = window.localStorage.getItem('athlonx-theme') === 'light' ? 'light' : 'dark'
    setTheme(stored)
    document.documentElement.dataset.theme = stored
  }, [])

  useEffect(() => {
    async function loadProfileName() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', data.user.id).maybeSingle()
      setProfileName(profile?.full_name || data.user.user_metadata?.full_name || 'Usuario AthlonX')
      const teams = await loadManagedTeams(data.user.id)
      const storedTeamId = window.localStorage.getItem('athlonx-active-team-id')
      const selectedTeamId = teams.some((team) => team.id === storedTeamId) ? storedTeamId : teams[0]?.id || ''
      setManagedTeams(teams)
      setActiveTeamId(selectedTeamId)
      if (selectedTeamId) window.localStorage.setItem('athlonx-active-team-id', selectedTeamId)
    }
    void loadProfileName()
  }, [])

  function changeTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    window.localStorage.setItem('athlonx-theme', next)
    setProfileOpen(false)
  }

  function selectTeam(teamId: string) {
    setActiveTeamId(teamId)
    setTeamMenuOpen(false)
    window.localStorage.setItem('athlonx-active-team-id', teamId)
    window.dispatchEvent(new CustomEvent('athlonx-team-change', { detail: teamId }))
    if (pathname?.includes('/entrenador') || pathname?.includes('/equipo')) {
      router.push(`${pathname}?teamId=${encodeURIComponent(teamId)}`)
    }
  }

  const initials = profileName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'
  const key = pathname?.split('/').filter(Boolean).pop() || 'dashboard'
  const activeTeam = managedTeams.find((team) => team.id === activeTeamId)

  return <header className="border-b border-[#263b4d] px-6 py-4 text-white print:hidden lg:ml-64 md:px-10"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><h1 className="truncate font-display text-3xl uppercase tracking-wide sm:text-4xl">{titles[key] || 'AthlonX'}</h1><div className="relative flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">{activeTeam && <div className="relative"><button type="button" onClick={() => setTeamMenuOpen((open) => !open)} aria-label="Cambiar equipo activo" className="flex max-w-44 cursor-pointer items-center gap-2 rounded-full border border-[#294052] px-2 py-1.5 text-left hover:border-[#b4ff45] sm:max-w-60"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#b4ff45] font-heading text-xs font-bold text-[#07131e]">{activeTeam.name.slice(0, 1).toUpperCase()}</span><span className="hidden min-w-0 sm:block"><span className="block truncate text-xs font-bold">{activeTeam.name}</span><span className="block truncate text-[10px] text-slate-400">{activeTeam.discipline}</span></span><ChevronDown size={15} className="shrink-0 text-slate-400" /></button>{teamMenuOpen && <div className="absolute right-0 top-14 z-50 w-64 rounded-2xl border border-[#31485c] bg-[#0d1d2b] p-2 text-white shadow-2xl"><p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Equipo activo</p>{managedTeams.map((team) => <button key={team.id} type="button" onClick={() => selectTeam(team.id)} className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left transition ${team.id === activeTeamId ? 'bg-[#b4ff45] text-[#07131e]' : 'text-slate-200 hover:bg-white/5'}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 font-heading text-xs font-bold">{team.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{team.name}</span><span className="block truncate text-xs opacity-70">{team.discipline} · {team.role}</span></span></button>)}</div>}</div>}<NotificationsMenu /><span className="hidden h-7 w-px bg-[#294052] sm:block" /><button type="button" onClick={() => setProfileOpen((open) => !open)} aria-label="Abrir menú de cuenta" className="flex cursor-pointer items-center gap-2 rounded-full p-1 pr-2 hover:bg-white/5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b4ff45] font-heading font-bold text-[#07131e]">{initials}</span><span className="hidden max-w-40 truncate font-semibold sm:block">{profileName}</span></button>{profileOpen && <AccountMenu name={profileName} theme={theme} onTheme={changeTheme} onClose={() => setProfileOpen(false)} />}</div></div></header>
}

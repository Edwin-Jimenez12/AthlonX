'use client'

import { Search } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadManagedTeams, ManagedTeam } from '../../../lib/team-access'
import { supabase } from '../../../lib/supabase'
import { TeamRosterPanel } from '../../../Components/team-roster-panel'
import { TeamDivisionSettings } from '../../../Components/team-division-settings'

export default function TeamDashboard() {
  const [teams, setTeams] = useState<ManagedTeam[]>([])
  const [team, setTeam] = useState<ManagedTeam | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTeamProfile() {
      if (!supabase) return setLoading(false)
      const { data } = await supabase.auth.getUser()
      const metadata = data.user?.user_metadata
      const managedTeams = data.user ? await loadManagedTeams(data.user.id) : []
      const storedTeamId = window.localStorage.getItem('athlonx-active-team-id')
      const selectedTeam = managedTeams.find((item) => item.id === storedTeamId) || managedTeams[0]
      setTeams(managedTeams)
      setTeam(selectedTeam || (metadata?.account_type === 'equipo' ? { id: '', name: metadata.team_name || metadata.full_name || 'Equipo pendiente', discipline: metadata.team_discipline || 'Disciplina pendiente', disciplineId: '', disciplineCode: '', city: metadata.team_city || 'Ubicación pendiente', role: 'owner' } : null))
      if (selectedTeam) {
        window.localStorage.setItem('athlonx-active-team-id', selectedTeam.id)
        window.dispatchEvent(new CustomEvent('athlonx-team-change', { detail: selectedTeam.id }))
      }
      setLoading(false)
    }
    void loadTeamProfile()

  }, [])

  useEffect(() => {
    if (!teams.length) return
    const syncTeam = (event: Event) => {
      const selectedTeam = teams.find((item) => item.id === (event as CustomEvent<string>).detail)
      if (selectedTeam) setTeam(selectedTeam)
    }
    window.addEventListener('athlonx-team-change', syncTeam)
    return () => window.removeEventListener('athlonx-team-change', syncTeam)
  }, [teams])

  const name = team?.name || 'Equipo pendiente de configuración'
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'EQ'

  return <main className="min-h-screen bg-[#07131e] text-white lg:ml-64">
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
      <div className="flex flex-col justify-between gap-6 border-b border-[#1f4057] pb-8 md:flex-row md:items-end">
        <div><p className="text-sm font-bold uppercase tracking-[.24em] text-[#b4ff45]">Panel de equipo</p><h2 className="mt-3 font-display text-5xl uppercase leading-none sm:text-6xl">Mi equipo</h2><p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">Administra la identidad, la plantilla y la actividad deportiva de tu equipo desde un solo lugar.</p></div>
        <Link href="/dashboard/busqueda" className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#31556b] px-5 py-3 font-semibold text-slate-200 transition hover:border-[#b4ff45] hover:text-[#b4ff45]"><Search size={18} />Buscar perfiles</Link>
      </div>

      <section className="mt-8 overflow-hidden rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-5"><div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#b4ff45] font-display text-3xl text-[#07131e]">{initials}</div><div><p className="text-xs font-bold uppercase tracking-[.2em] text-slate-400">Identidad deportiva</p><h3 className="mt-1 font-display text-4xl uppercase">{loading ? 'Cargando equipo' : name}</h3><p className="mt-2 text-slate-400">{team?.discipline || 'Disciplina pendiente'} <span className="mx-2 text-[#b4ff45]">•</span> {team?.city || 'Ubicación pendiente'}</p></div></div><span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#b4ff45]/30 bg-[#b4ff45]/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#cfff91]"><span className="h-2 w-2 rounded-full bg-[#b4ff45]" />Perfil activo</span></div></section>
      <div className="mt-8 space-y-6">
        {team?.id && <TeamRosterPanel teamId={team.id} />}
        {team?.id && <TeamDivisionSettings teamId={team.id} />}
      </div>
    </section>
  </main>
}

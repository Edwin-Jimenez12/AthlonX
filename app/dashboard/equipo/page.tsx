'use client'

import { ArrowUpRight, CalendarDays, ClipboardList, Search, Shield, Trophy, Users } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadManagedTeams, ManagedTeam } from '../../../lib/team-access'
import { supabase } from '../../../lib/supabase'
import { OrganizationEventsPanel } from '../../../Components/organization-events-panel'
import { TeamRosterPanel } from '../../../Components/team-roster-panel'

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

      {team?.id && <div className="mt-8"><OrganizationEventsPanel sourceTeamId={team.id} disciplines={team.disciplineId ? [{ id: team.disciplineId, name: team.discipline, code: team.disciplineCode }] : []} /></div>}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_310px]">
        <div className="space-y-6">
          <section id="estadisticas" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Users} label="Plantilla" value="—" detail="Atletas registrados" /><Metric icon={CalendarDays} label="Próximo partido" value="—" detail="Calendario pendiente" /><Metric icon={Trophy} label="Torneos" value="—" detail="Participaciones activas" /><Metric icon={ClipboardList} label="Rendimiento" value="—" detail="Datos por registrar" /></section>
          {team?.id && <TeamRosterPanel teamId={team.id} />}
          <section id="calendario" className="rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Actividad deportiva</p><h3 className="mt-2 font-display text-3xl uppercase">Calendario</h3><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Partidos y torneos aparecerán aquí cuando el equipo tenga actividad registrada.</p></div><CalendarDays className="text-[#b4ff45]" size={24} /></div><EmptyTeamState text="No hay actividades programadas." action="Explorar torneos" href="/dashboard/busqueda" /></section>
        </div>
        <aside className="h-fit rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Acciones rápidas</p><div className="mt-5 space-y-3"><QuickAction label="Completar perfil del equipo" href="#perfil" /><QuickAction label="Gestionar plantilla" href="#plantilla" /><QuickAction label="Ver calendario" href="#calendario" /></div><div id="perfil" className="mt-7 border-t border-[#1f4057] pt-6"><div className="flex items-center gap-3"><Shield className="text-[#b4ff45]" size={20} /><p className="font-semibold">Perfil del equipo</p></div><p className="mt-2 text-sm leading-6 text-slate-400">Completa logo, contacto y ubicación desde la configuración del equipo.</p></div></aside>
      </div>
    </section>
  </main>
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Users; label: string; value: string; detail: string }) {
  return <article className="rounded-2xl border border-[#1f4057] bg-[#0b1d2c] p-5"><Icon className="text-[#b4ff45]" size={20} /><p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 font-display text-4xl">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>
}

function EmptyTeamState({ text, action, href }: { text: string; action: string; href: string }) {
  return <div className="mt-7 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-[#31556b] bg-[#07131e]/60 p-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-400">{text}</p><Link href={href} className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-sm font-bold text-[#b4ff45] hover:text-[#d5ff9b]">{action}<ArrowUpRight size={16} /></Link></div>
}

function QuickAction({ label, href }: { label: string; href: string }) {
  return <Link href={href} className="flex cursor-pointer items-center justify-between rounded-xl border border-[#29485d] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-[#b4ff45] hover:text-[#b4ff45]"><span>{label}</span><ArrowUpRight size={16} /></Link>
}

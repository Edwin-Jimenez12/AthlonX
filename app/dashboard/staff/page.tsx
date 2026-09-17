'use client'

import { ArrowUpRight, BarChart3, CalendarCheck, ClipboardCheck, MessageSquare, Search, Shield, Users } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadManagedTeams, ManagedTeam } from '../../../lib/team-access'
import { supabase } from '../../../lib/supabase'

export default function StaffDashboard() {
  const [teams, setTeams] = useState<ManagedTeam[]>([])
  const [activeTeamId, setActiveTeamId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStaffTeams() {
      if (!supabase) return setLoading(false)
      const { data } = await supabase.auth.getUser()
      if (!data.user) return setLoading(false)
      const assignedTeams = await loadManagedTeams(data.user.id)
      const storedTeamId = window.localStorage.getItem('athlonx-active-team-id')
      const selectedTeamId = [storedTeamId, assignedTeams[0]?.id].find((id) => id && assignedTeams.some((team) => team.id === id)) || ''
      setTeams(assignedTeams)
      setActiveTeamId(selectedTeamId)
      if (selectedTeamId) window.localStorage.setItem('athlonx-active-team-id', selectedTeamId)
      setLoading(false)
    }

    void loadStaffTeams()
  }, [])

  useEffect(() => {
    const syncTeam = (event: Event) => setActiveTeamId((event as CustomEvent<string>).detail)
    window.addEventListener('athlonx-team-change', syncTeam)
    return () => window.removeEventListener('athlonx-team-change', syncTeam)
  }, [])

  const team = teams.find((item) => item.id === activeTeamId)

  function selectTeam(teamId: string) {
    setActiveTeamId(teamId)
    window.localStorage.setItem('athlonx-active-team-id', teamId)
    window.dispatchEvent(new CustomEvent('athlonx-team-change', { detail: teamId }))
  }

  return (
    <main className="min-h-screen bg-[#07131e] text-white lg:ml-64">
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
        <div className="flex flex-col justify-between gap-6 border-b border-[#1f4057] pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.24em] text-[#b4ff45]">Área operativa</p>
            <h1 className="mt-3 font-display text-5xl uppercase leading-none sm:text-6xl">Panel del staff</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">Apoya la operación diaria del equipo, coordina tareas y mantén la información organizada.</p>
          </div>
          <Link href="/dashboard/busqueda" className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#31556b] px-5 py-3 font-semibold text-slate-200 transition hover:border-[#b4ff45] hover:text-[#b4ff45]"><Search size={18} />Buscar perfiles</Link>
        </div>

        <section className="mt-8 rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-5"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#b4ff45] text-2xl font-black text-[#07131e]">{team?.name.slice(0, 2).toUpperCase() || 'ST'}</div><div><p className="text-xs font-bold uppercase tracking-[.2em] text-slate-400">Contexto de trabajo</p><h2 className="mt-1 font-display text-3xl uppercase">{loading ? 'Cargando equipos' : team?.name || 'Sin equipo seleccionado'}</h2><p className="mt-1 text-sm text-slate-400">{team?.discipline || 'Vincula un equipo para comenzar'}</p></div></div>
            {teams.length > 1 && <label className="block text-sm font-semibold text-slate-300">Equipo activo<select value={activeTeamId} onChange={(event) => selectTeam(event.target.value)} className="mt-2 w-full cursor-pointer rounded-xl border border-white/15 bg-[#07131e] px-4 py-3 text-white outline-none focus:border-[#b4ff45] sm:min-w-64"><option value="">Seleccionar equipo</option>{teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={CalendarCheck} label="Agenda" value="—" detail="Sin actividades pendientes" /><Metric icon={ClipboardCheck} label="Asistencia" value="—" detail="Registros por revisar" /><Metric icon={Users} label="Integrantes" value="—" detail="Plantilla por consultar" /><Metric icon={BarChart3} label="Reportes" value="—" detail="Información disponible próximamente" /></section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <StaffModule id="asistencia" icon={ClipboardCheck} title="Control de asistencia" description="Consulta registros, apoya la validación de ausencias y mantén actualizada la operación del equipo." actions={['Revisar asistencia', 'Ver historial']} />
          <StaffModule id="comunicados" icon={MessageSquare} title="Comunicados" description="Coordina convocatorias, avisos y comunicaciones importantes para los integrantes." actions={['Ver comunicados', 'Preparar aviso']} />
          <StaffModule id="reportes" icon={BarChart3} title="Reportes operativos" description="Reúne información del equipo para facilitar el seguimiento del entrenador y directivo." actions={['Consultar reportes']} />
          <StaffModule id="logistica" icon={Shield} title="Logística del equipo" description="Organiza tareas de apoyo, documentación y próximos compromisos deportivos." actions={['Ver tareas']} />
        </section>
      </section>
    </main>
  )
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Users; label: string; value: string; detail: string }) {
  return <article className="rounded-2xl border border-[#1f4057] bg-[#0b1d2c] p-5"><Icon className="text-[#b4ff45]" size={20} /><p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 font-display text-4xl">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>
}

function StaffModule({ id, icon: Icon, title, description, actions }: { id: string; icon: typeof Users; title: string; description: string; actions: string[] }) {
  return <section id={id} className="rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Módulo del staff</p><h2 className="mt-2 font-display text-3xl uppercase">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p></div><Icon className="text-[#b4ff45]" size={24} /></div><div className="mt-6 flex flex-wrap gap-3">{actions.map((action) => <button key={action} type="button" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#31556b] px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-[#b4ff45] hover:text-[#b4ff45]">{action}<ArrowUpRight size={15} /></button>)}</div></section>
}

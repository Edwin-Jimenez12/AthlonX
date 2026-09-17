'use client'

import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  MessageSquare,
  Search,
  Shield,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadManagedTeams, ManagedTeam } from '../../../lib/team-access'
import { supabase } from '../../../lib/supabase'

export default function TrainerDashboard() {
  const [teams, setTeams] = useState<ManagedTeam[]>([])
  const [activeTeamId, setActiveTeamId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTrainerTeams() {
      if (!supabase) return setLoading(false)
      const { data } = await supabase.auth.getUser()
      if (!data.user) return setLoading(false)

      const managedTeams = await loadManagedTeams(data.user.id)
      const requestedTeamId = new URLSearchParams(window.location.search).get('teamId')
      const storedTeamId = window.localStorage.getItem('athlonx-active-team-id')
      const selectedTeamId = [requestedTeamId, storedTeamId, managedTeams[0]?.id].find(
        (id) => id && managedTeams.some((team) => team.id === id),
      ) || ''

      setTeams(managedTeams)
      setActiveTeamId(selectedTeamId)
      if (selectedTeamId) window.localStorage.setItem('athlonx-active-team-id', selectedTeamId)
      setLoading(false)
    }

    void loadTrainerTeams()
    const syncTeam = (event: Event) => setActiveTeamId((event as CustomEvent<string>).detail)
    window.addEventListener('athlonx-team-change', syncTeam)
    return () => window.removeEventListener('athlonx-team-change', syncTeam)
  }, [])

  const team = teams.find((item) => item.id === activeTeamId)

  return (
    <main className="min-h-screen bg-[#07131e] text-white lg:ml-64">
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
        <div className="flex flex-col justify-between gap-6 border-b border-[#1f4057] pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.24em] text-[#b4ff45]">Área técnica</p>
            <h2 className="mt-3 font-display text-5xl uppercase leading-none sm:text-6xl">Panel del entrenador</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
              Organiza el trabajo deportivo y acompaña el rendimiento de tu equipo.
            </p>
          </div>
          <Link
            href="/dashboard/busqueda"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#31556b] px-5 py-3 font-semibold text-slate-200 transition hover:border-[#b4ff45] hover:text-[#b4ff45]"
          >
            <Search size={18} />
            Buscar perfiles
          </Link>
        </div>

        {loading ? <LoadingState /> : team ? <TrainerWorkspace team={team} /> : <NoTeamState />}
      </section>
    </main>
  )
}

function TrainerWorkspace({ team }: { team: ManagedTeam }) {
  const initials = team.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'EQ'

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#b4ff45] font-display text-3xl text-[#07131e]">
              {initials}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-slate-400">Equipo activo</p>
              <h3 className="mt-1 font-display text-4xl uppercase">{team.name}</h3>
              <p className="mt-2 text-slate-400">
                {team.discipline} <span className="mx-2 text-[#b4ff45]">•</span> {team.city || 'Ubicación pendiente'}
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#b4ff45]/30 bg-[#b4ff45]/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#cfff91]">
            <Shield size={15} />
            Entrenador
          </span>
        </div>
      </section>

      <section id="estadisticas" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TrainerMetric icon={CalendarDays} label="Próxima sesión" value="—" detail="Sin entrenamiento programado" />
        <TrainerMetric icon={ClipboardCheck} label="Asistencia" value="—" detail="Registro pendiente" />
        <TrainerMetric icon={Users} label="Plantilla" value="—" detail="Atletas por cargar" />
        <TrainerMetric icon={Activity} label="Evaluaciones" value="—" detail="Sin evaluaciones pendientes" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_310px]">
        <div className="space-y-6">
          <Module id="entrenamientos" icon={CalendarDays} title="Entrenamientos" description="Crea sesiones, define objetivos y organiza el trabajo semanal del equipo." actions={['Crear entrenamiento', 'Ver agenda']} />
          <Module id="asistencia" icon={ClipboardCheck} title="Asistencia" description="Registra la presencia y el compromiso deportivo de cada integrante." actions={['Registrar asistencia', 'Consultar historial']} />
          <Module id="formaciones" icon={ClipboardList} title="Formaciones" description="Prepara la organización táctica y asigna posiciones para cada partido." actions={['Crear formación', 'Ver formaciones']} />
          <Module id="comunicados" icon={MessageSquare} title="Comunicados" description="Envía convocatorias y mensajes importantes al equipo." actions={['Crear comunicado']} />
        </div>
        <aside className="h-fit rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Acciones rápidas</p>
          <div className="mt-5 space-y-3">
            <QuickAction label="Crear entrenamiento" href="#entrenamientos" />
            <QuickAction label="Registrar asistencia" href="#asistencia" />
            <QuickAction label="Evaluar rendimiento" href="#estadisticas" />
            <QuickAction label="Crear formación" href="#formaciones" />
          </div>
        </aside>
      </section>
    </div>
  )
}

function Module({ id, icon: Icon, title, description, actions }: { id: string; icon: typeof CalendarDays; title: string; description: string; actions: string[] }) {
  return (
    <section id={id} className="rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Módulo del entrenador</p>
          <h3 className="mt-2 font-display text-3xl uppercase">{title}</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{description}</p>
        </div>
        <Icon className="text-[#b4ff45]" size={24} />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        {actions.map((action) => (
          <button key={action} type="button" className="cursor-pointer rounded-xl border border-[#31556b] px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-[#b4ff45] hover:text-[#b4ff45]">
            {action}
          </button>
        ))}
      </div>
    </section>
  )
}

function TrainerMetric({ icon: Icon, label, value, detail }: { icon: typeof CalendarDays; label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-[#1f4057] bg-[#0b1d2c] p-5">
      <Icon className="text-[#b4ff45]" size={20} />
      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 font-display text-4xl">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  )
}

function QuickAction({ label, href }: { label: string; href: string }) {
  return (
    <a href={href} className="flex cursor-pointer items-center justify-between rounded-xl border border-[#29485d] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-[#b4ff45] hover:text-[#b4ff45]">
      <span>{label}</span>
      <ArrowUpRight size={16} />
    </a>
  )
}

function LoadingState() {
  return <div className="mt-8 rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-10 text-center text-slate-400">Cargando equipos asignados...</div>
}

function NoTeamState() {
  return (
    <div className="mt-8 rounded-3xl border border-dashed border-[#31556b] bg-[#0b1d2c] p-8 text-center sm:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#b4ff45]/10 text-[#b4ff45]"><Users size={28} /></div>
      <h3 className="mt-5 font-display text-3xl uppercase">Aún no tienes equipos asignados</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">Cuando un directivo te invite como entrenador, el equipo aparecerá aquí y podrás empezar a gestionarlo.</p>
      <Link href="/dashboard/busqueda" className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e]">Buscar equipos <ArrowUpRight size={17} /></Link>
    </div>
  )
}

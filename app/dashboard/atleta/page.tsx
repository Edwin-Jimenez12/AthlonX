'use client'

import { CalendarDays, ChartNoAxesCombined, ClipboardCheck, Dumbbell, Search } from 'lucide-react'
import Link from 'next/link'

const metrics = [
  { label: 'Asistencia', value: '—', detail: 'Sin registros todavía', icon: ClipboardCheck },
  { label: 'Rendimiento', value: '—', detail: 'Datos por registrar', icon: ChartNoAxesCombined },
  { label: 'Entrenamientos', value: '—', detail: 'Próximas sesiones', icon: Dumbbell },
]

export default function AthleteDashboard() {
  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10">
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col justify-between gap-5 border-b border-[#1f4057] pb-8 md:flex-row md:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[.3em] text-[#b4ff45]">Espacio personal</p><h1 className="mt-3 font-display text-5xl uppercase sm:text-6xl">Mi vista</h1><p className="mt-3 max-w-2xl text-slate-400">Consulta tu agenda, asistencia y evolución deportiva desde un solo lugar.</p></div>
        <Link href="/dashboard/busqueda" className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-[#31556b] px-5 py-3 font-semibold text-slate-200 transition hover:border-[#b4ff45] hover:text-[#b4ff45]"><Search size={18} />Explorar AthlonX</Link>
      </header>

      <section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-slate-400">Perfil deportivo</p><h2 className="mt-2 font-display text-4xl uppercase">Atleta AthlonX</h2><p className="mt-2 text-slate-400">Selecciona un equipo desde el menú superior para consultar su actividad.</p></div><div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#b4ff45] font-display text-3xl text-[#07131e]">A</div></div></section>

      <section className="grid gap-4 md:grid-cols-3">{metrics.map(({ label, value, detail, icon: Icon }) => <article key={label} className="rounded-2xl border border-[#1f4057] bg-[#0b1d2c] p-5"><Icon size={21} className="text-[#b4ff45]" /><p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 font-display text-4xl">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>)}</section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Agenda</p><h2 className="mt-2 font-display text-3xl uppercase">Próximo entrenamiento</h2></div><CalendarDays className="text-[#b4ff45]" size={24} /></div><div className="mt-7 rounded-2xl border border-dashed border-[#31556b] bg-[#07131e]/60 p-6 text-sm text-slate-400">Cuando un equipo te vincule y publique una sesión, aparecerá aquí.</div></section>
        <section className="rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Actividad</p><h2 className="mt-2 font-display text-3xl uppercase">Mis equipos</h2></div><Dumbbell className="text-[#b4ff45]" size={24} /></div><div className="mt-7 rounded-2xl border border-dashed border-[#31556b] bg-[#07131e]/60 p-6 text-sm text-slate-400">Tus equipos y roles aceptados aparecerán aquí.</div></section>
      </div>
    </div>
  </main>
}

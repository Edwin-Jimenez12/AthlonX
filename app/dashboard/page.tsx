'use client'

import { BarChart3, CalendarDays, ChevronRight, ClipboardList, MapPin, Plus } from 'lucide-react'
import { useState } from 'react'
import { categorias, partidoActual, proximosPartidos, resumenDashboard, torneoActivo } from '../../simulaDatos'

const summaryCards = [
  ['Torneos activos', resumenDashboard.torneosActivos],
  ['Equipos registrados', resumenDashboard.equiposRegistrados],
  ['Partidos jugados', resumenDashboard.partidosJugados],
  ['Jugadores', resumenDashboard.jugadores],
]

export default function Dashboard() {
  const [categoryId, setCategoryId] = useState('mayor')
  const category = categorias.find((item) => item.id === categoryId) ?? categorias[0]

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#17212b]">
      <section className="min-h-screen px-5 py-7 md:px-10 lg:ml-64 lg:px-12">
        <header className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div><p className="text-sm font-semibold text-slate-500">Liga Panameña de Rugby</p><h1 className="mt-1 text-3xl font-bold md:text-4xl">Dashboard</h1></div>
          <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#B4FF45] px-4 py-3 font-bold text-[#10151b] hover:bg-[#9ff02e]"><Plus size={18} /> Crear torneo</button>
        </header>

        <div className="mx-auto mt-8 grid max-w-7xl gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(([label, value]) => <article key={label as string} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label as string}</p><p className="mt-2 text-3xl font-bold">{value}</p></article>)}
        </div>

        <section className="mx-auto mt-6 max-w-7xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-[#e9fbd0] px-3 py-1 text-xs font-bold uppercase text-[#4c8500]">{partidoActual.enVivo ? partidoActual.estado : 'PRÓXIMO PARTIDO'}</span><span className="text-sm text-slate-500">{torneoActivo.nombre}</span></div><h2 className="mt-3 text-2xl font-bold">{partidoActual.categoria} · {partidoActual.jornada}</h2><div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500"><span><MapPin className="mr-1 inline text-[#70b719]" size={16} />{torneoActivo.ubicacion}</span><span><CalendarDays className="mr-1 inline text-[#70b719]" size={16} />{torneoActivo.jornadas}</span></div></div><button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#081522] px-4 py-3 font-semibold text-white hover:bg-[#172b3b]">Ver estadísticas <ChevronRight size={18} /></button></div>
          <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-xl bg-[#f4f8ef] p-5 text-center md:px-12"><div><div className="mx-auto flex h-20 w-20 items-center justify-center"><img src={partidoActual.localLogo} alt={`Logo de ${partidoActual.local}`} className="h-full w-full object-contain" /></div><p className="mt-2 text-lg font-bold">{partidoActual.local}</p><p className="text-sm text-slate-500">{partidoActual.localPuntos} puntos</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-[#70b719]">{partidoActual.enVivo ? partidoActual.periodo : 'Próximo'}</p><p className="mt-1 text-3xl font-bold text-[#081522]">{partidoActual.enVivo ? `${partidoActual.localPuntos} - ${partidoActual.visitantePuntos}` : 'VS'}</p><p className="text-sm text-slate-500">{partidoActual.enVivo ? partidoActual.tiempo : 'Horario pendiente'}</p></div><div><div className="mx-auto flex h-20 w-20 items-center justify-center"><img src={partidoActual.visitanteLogo} alt={`Logo de ${partidoActual.visitante}`} className="h-full w-full object-contain" /></div><p className="mt-2 text-lg font-bold">{partidoActual.visitante}</p><p className="text-sm text-slate-500">{partidoActual.visitantePuntos} puntos</p></div></div>
        </section>

        <div className="mx-auto mt-6 grid max-w-7xl min-w-0 gap-6 xl:grid-cols-2">
          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><h2 className="text-2xl font-bold">Competencia por categoría</h2><p className="mt-1 text-sm text-slate-500">Consulta los equipos y la tabla de cada liga.</p></div><div className="flex rounded-lg bg-slate-100 p-1">{categorias.map((item) => <button key={item.id} type="button" onClick={() => setCategoryId(item.id)} className={`rounded-md px-3 py-2 text-sm font-semibold transition ${categoryId === item.id ? 'bg-[#081522] text-white' : 'text-slate-500 hover:text-slate-900'}`}>{item.nombre.replace('Liga ', '')}</button>)}</div></div>
            <div className="mt-6 flex items-center justify-between rounded-lg bg-[#f4f8ef] p-4"><div><p className="font-bold text-[#25331d]">{category.nombre}</p><p className="text-sm text-slate-500">{category.descripcion}</p></div><div className="text-right text-sm text-slate-500"><p><b className="text-slate-800">{category.equipos}</b> equipos</p><p><b className="text-slate-800">{category.partidos}</b> partidos</p></div></div>
            <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-3">Pos.</th><th>Equipo</th>{[['PJ', 'Partidos jugados'], ['G', 'Partidos ganados'], ['E', 'Partidos empatados'], ['P', 'Partidos perdidos'], ['+PT', 'Puntos a favor'], ['-PT', 'Puntos en contra']].map(([short, description]) => <th key={short} className="group relative cursor-help px-2 text-center"><span>{short}</span><span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max max-w-48 -translate-x-1/2 rounded-md bg-[#081522] px-3 py-2 text-[11px] normal-case tracking-normal text-white shadow-lg group-hover:block">{description}</span></th>)}<th className="sticky right-0 z-[1] bg-white px-3 text-right"><span className="group relative inline-block cursor-help">PTS<span className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 hidden w-max max-w-48 rounded-md bg-[#081522] px-3 py-2 text-[11px] font-normal normal-case tracking-normal text-white shadow-lg group-hover:block">Puntos de clasificación</span></span></th></tr></thead><tbody>{category.tabla.map((team, index) => <tr key={team.equipo} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-bold text-[#70b719]">{index + 1}</td><td className="py-4 font-semibold">{team.equipo}</td><td className="text-center text-slate-500">{team.pj}</td><td className="text-center text-slate-500">{team.ganados}</td><td className="text-center text-slate-500">{team.empatados}</td><td className="text-center text-slate-500">{team.perdidos}</td><td className="text-center text-slate-500">{team.aFavor}</td><td className="text-center text-slate-500">{team.enContra}</td><td className="sticky right-0 bg-white text-right font-bold">{team.puntos}</td></tr>)}</tbody></table></div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold">Próximos partidos</h2><p className="mt-1 text-sm text-slate-500">Agenda de la próxima jornada.</p></div><ClipboardList className="text-[#70b719]" /></div>
            <div className="mt-6 space-y-3">
              {proximosPartidos.map((match) => (
                <article key={`${match.hora}-${match.local}`} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex justify-between text-xs text-slate-500"><span>{match.categoria}</span><span>{match.fecha}</span></div>
                  <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                    <div className="min-w-0"><div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden"><TeamLogo src={match.localLogo} name={match.local} /></div><p className="mt-2 truncate font-semibold">{match.local}</p><p className="text-xs text-slate-400">{match.localDetail}</p></div>
                    <span className="rounded bg-[#081522] px-2 py-1 text-xs font-bold text-[#B4FF45]">{match.hora}</span>
                    <div className="min-w-0"><div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden"><TeamLogo src={match.visitanteLogo} name={match.visitante} /></div><p className="mt-2 truncate font-semibold">{match.visitante}</p><p className="text-xs text-slate-400">{match.visitanteDetail}</p></div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

function TeamLogo({ src, name }: { src: string; name: string }) {
  if (src) return <img src={src} alt={`Logo de ${name}`} className="h-full w-full object-contain" />
  return <span className="font-heading text-lg font-bold text-[#B4FF45]">{name.slice(0, 2).toUpperCase()}</span>
}

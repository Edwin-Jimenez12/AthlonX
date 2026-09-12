'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, CalendarDays, MapPin, Trophy } from 'lucide-react'
import { categorias, proximosPartidos, torneoActivo } from '../../../../simulaDatos'
import TournamentHeader from '../../../../Components/tournament-header'

export default function PublicTournamentPage() {
  const [categoryId, setCategoryId] = useState(categorias[0]?.id ?? '')
  const [notice, setNotice] = useState('')
  const selectedCategory = categorias.find((category) => category.id === categoryId) ?? categorias[0]

  const formatTime = (time: string) => {
    const [rawHour, minutes] = time.split(':')
    const hour = Number(rawHour)
    return `${hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`
  }

  const teamLogo = (name: string) => name === 'Titanes' ? '/equipos/Titanes.png' : name === 'Cuervos' ? '/equipos/cuervos.png' : ''
  return (
    <>
    <main className="min-h-screen bg-[#f4f6f8] px-5 py-8 text-[#17212b] print:hidden lg:pl-72 lg:pr-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard/torneos" className="inline-flex items-center gap-2 text-sm font-semibold text-[#4c8500]"><ArrowLeft size={18} /> Volver a torneos</Link>
        <div className="mt-6"><TournamentHeader activeSection="Resumen" /></div>
        <section id="resumen" className="mt-6 grid gap-4 sm:grid-cols-3">{[['Equipos', '16'], ['Partidos jugados', '18'], ['Divisiones', String(categorias.length)]].map(([label, value]) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></article>)}</section>
        <section className="mt-6 grid min-w-0 gap-6 xl:grid-cols-2">
          <article id="partidos" className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6"><h2 className="font-heading text-3xl font-black uppercase">Cronograma de partidos</h2><p className="mt-1 text-sm text-slate-500">Próximos encuentros de la jornada.</p><div className="mt-5 space-y-3">{proximosPartidos.map((match) => <div key={match.hora + match.local} className="min-w-0 rounded-lg border border-slate-200 p-3 text-center sm:p-4"><div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:gap-3"><div className="min-w-0"><TeamLogo src={teamLogo(match.local)} name={match.local} /><p className="mt-2 truncate text-sm font-semibold sm:text-base">{match.local}</p><p className="text-xs text-slate-500">{match.categoria}</p></div><div className="text-center"><p className="font-heading text-xl font-black italic text-[#081522] sm:text-2xl">VS</p><span className="mt-1 inline-block whitespace-nowrap rounded bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 sm:px-3 sm:text-xs">{formatTime(match.hora)}</span></div><div className="min-w-0"><TeamLogo src={teamLogo(match.visitante)} name={match.visitante} /><p className="mt-2 truncate text-sm font-semibold sm:text-base">{match.visitante}</p><p className="text-xs text-slate-500">{match.categoria}</p></div></div></div>)}</div></article>
          <article id="puntajes" className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div><h2 className="text-center font-heading text-3xl font-black uppercase">Tabla de posiciones</h2><div className="mt-5 flex justify-start overflow-x-auto"><div className="flex min-w-max flex-wrap rounded-lg bg-slate-100 p-1">{categorias.map((category) => <button key={category.id} type="button" onClick={() => setCategoryId(category.id)} className={`rounded-md px-3 py-2 text-sm font-semibold ${selectedCategory.id === category.id ? 'bg-[#081522] text-white' : 'text-slate-500'}`}>{category.nombre.replace('Liga ', '')}</button>)}</div></div></div><div className="mt-5 overflow-x-auto"><table className="w-max min-w-[590px] text-left sm:min-w-[680px]"><thead className="border-b border-slate-200 text-[10px] uppercase text-slate-500 sm:text-xs"><tr><th className="px-2 py-3 sm:px-3">Pos.</th><th className="px-2 sm:px-3">Equipo</th><th className="bg-[#e9fbd0] px-2 text-center text-[#17212b] sm:px-3">PTS</th><th className="px-2 text-center sm:px-3">PJ</th><th className="px-2 text-center sm:px-3">G</th><th className="px-2 text-center sm:px-3">E</th><th className="px-2 text-center sm:px-3">P</th><th className="px-2 text-center sm:px-3">+PT</th><th className="px-2 text-center sm:px-3">-PT</th><th className="px-2 text-center sm:px-3">DIF</th></tr></thead><tbody>{selectedCategory.tabla.map((team, index) => <tr key={team.equipo} className="border-b border-slate-100"><td className="px-2 py-4 font-bold text-[#70b719] sm:px-3">{index + 1}</td><td className="px-2 py-4 font-semibold sm:px-3">{team.equipo}</td><td className="bg-[#f0f8e8] px-2 text-center text-lg font-black text-[#4c8500] sm:px-3">{team.puntos}</td><td className="px-2 text-center text-slate-500 sm:px-3">{team.pj}</td><td className="px-2 text-center text-slate-500 sm:px-3">{team.ganados}</td><td className="px-2 text-center text-slate-500 sm:px-3">{team.empatados}</td><td className="px-2 text-center text-slate-500 sm:px-3">{team.perdidos}</td><td className="px-2 text-center text-slate-500 sm:px-3">{team.aFavor}</td><td className="px-2 text-center text-slate-500 sm:px-3">{team.enContra}</td><td className="px-2 text-center font-bold sm:px-3">{team.aFavor - team.enContra}</td></tr>)}</tbody></table></div></article>
        </section>
        <section id="fixture" className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="font-heading text-3xl font-black uppercase">Fixture de la fecha</h2><p className="mt-1 text-sm text-slate-500">Cronograma completo de la jornada.</p></div><button type="button" onClick={() => window.print()} className="rounded-lg bg-[#081522] px-4 py-3 text-sm font-bold text-white">Generar PDF</button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-[#e9fbd0] text-xs uppercase text-slate-600"><tr><th className="px-4 py-3">Partido</th><th>Horario</th><th>División</th><th>Enfrentamiento</th></tr></thead><tbody>{proximosPartidos.map((match, index) => <tr key={match.hora + match.local} className="border-b border-slate-100"><td className="px-4 py-3 font-semibold">Partido {index + 1}</td><td>{formatTime(match.hora)}</td><td>{match.categoria}</td><td className="font-semibold">{match.local} vs. {match.visitante}</td></tr>)}</tbody></table></div></section>
        {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-[#081522] px-5 py-4 text-center text-sm font-semibold text-white shadow-2xl"><div className="flex items-center justify-between gap-4"><span>{notice}</span><button type="button" onClick={() => setNotice('')} className="text-[#B4FF45]">Cerrar</button></div></div>}
      </div>
    </main>
    <PrintableFixture />
    </>
  )
}

function PrintableFixture() {
  return (
    <section className="hidden print:block print:min-h-screen print:p-7 print:text-black">
      <div className="flex items-center justify-between"><img src="/MarcaAthlonX/MarcaNegro.svg" alt="AthlonX" className="h-14 w-44 object-contain object-left" /><img src="/upr.png" alt="U.P.R." className="h-20 w-36 object-contain object-right" /></div>
      <h1 className="mt-7 text-center text-3xl font-black">FIXTURE LIGA PANAMEÑA RUGBY 7S</h1>
      <p className="mt-2 text-center">Serie 7s · III fecha · 29 de marzo</p>
      <div className="mt-8 grid grid-cols-3 gap-4 text-center">{categorias.map((category) => <div key={category.id}><h2 className="text-sm font-black uppercase">{category.nombre}</h2><ul className="mt-2 text-sm">{category.tabla.slice(0, 4).map((team) => <li key={team.equipo} className="border border-slate-300 p-2">{team.equipo}</li>)}</ul></div>)}</div>
      <h2 className="mt-8 border-b-2 border-[#081522] pb-2 text-center text-lg font-black uppercase">Cronograma de partidos</h2>
      <table className="mt-6 w-full border-collapse text-sm"><thead><tr><th className="border-b p-2 text-left">Partido</th><th className="border-b p-2 text-left">Horario</th><th className="border-b p-2 text-left">División</th><th className="border-b p-2 text-left">Enfrentamiento</th></tr></thead><tbody>{proximosPartidos.map((match, index) => <tr key={match.hora + match.local}><td className="border-b border-slate-300 p-2 font-semibold">Partido {index + 1}</td><td className="border-b border-slate-300 p-2">{formatPrintableTime(match.hora)}</td><td className="border-b border-slate-300 p-2">{match.categoria}</td><td className="border-b border-slate-300 p-2 font-semibold">{match.local} vs. {match.visitante}</td></tr>)}<tr><td colSpan={4} className="p-4 text-center font-bold">RECESO · 9:10 AM - 9:20 AM</td></tr></tbody></table>
    </section>
  )
}

function formatPrintableTime(time: string) {
  const [rawHour, minutes] = time.split(':')
  const hour = Number(rawHour)
  return `${hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`
}

function TeamLogo({ src, name }: { src: string; name: string }) {
  return src ? <img src={src} alt={`Logo de ${name}`} className="mx-auto h-14 w-14 object-contain" /> : <div className="mx-auto flex h-14 w-14 items-center justify-center text-xl font-bold text-[#70b719]">{name.slice(0, 2).toUpperCase()}</div>
}






















'use client'

import Link from 'next/link'
import { ArrowLeft, MapPin, Users } from 'lucide-react'
import { useState } from 'react'
import { categorias, torneoActivo } from '../../../../../simulaDatos'
import TournamentHeader from '../../../../../Components/tournament-header'

export default function TournamentTeamsPage() {
  const [notice, setNotice] = useState('')
  const teamLogo = (name: string) => name === 'Titanes' ? '/equipos/Titanes.png' : name === 'Cuervos' ? '/equipos/cuervos.png' : ''
  const teams = categorias.flatMap((category) => category.tabla.map((team) => ({ ...team, division: category.nombre })))

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-5 py-8 text-[#17212b] lg:pl-72 lg:pr-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard/torneos/liga-panamena-rugby" className="inline-flex items-center gap-2 text-sm font-semibold text-[#4c8500]"><ArrowLeft size={18} /> Volver al resumen</Link>
        <div className="mt-6"><TournamentHeader activeSection="Equipos" /></div>
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><h2 className="font-heading text-3xl font-black uppercase">Equipos de la liga</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{teams.map((team) => <article key={`${team.division}-${team.equipo}`} className="rounded-xl border border-slate-200 p-5"><div className="flex items-center gap-5"><TeamLogo src={teamLogo(team.equipo)} name={team.equipo} /><div><h3 className="text-2xl font-bold">{team.equipo}</h3><p className="text-sm text-[#70b719]">{team.division}</p></div></div><div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500"><p><MapPin className="mr-2 inline" size={16} />Ciudad de Panamá</p><p className="mt-2"><Users className="mr-2 inline" size={17} />{team.pj + 10} miembros</p></div><button type="button" onClick={() => setNotice(`La vista de ${team.equipo} estará disponible en próximas actualizaciones.`)} className="mt-5 w-full rounded-lg border border-[#70b719] px-4 py-2 font-semibold text-[#4c8500] hover:bg-[#e9fbd0]">Visitar equipo</button></article>)}</div></section>
      </div>
      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-[#081522] px-5 py-4 text-center text-sm font-semibold text-white shadow-2xl"><div className="flex items-center justify-between gap-4"><span>{notice}</span><button type="button" onClick={() => setNotice('')} className="text-[#B4FF45]">Cerrar</button></div></div>}
    </main>
  )
}

function TeamLogo({ src, name }: { src: string; name: string }) {
  return src ? <img src={src} alt={`Logo de ${name}`} className="h-24 w-24 object-contain" /> : <div className="flex h-24 w-24 items-center justify-center text-2xl font-bold text-[#70b719]">{name.slice(0, 2).toUpperCase()}</div>
}

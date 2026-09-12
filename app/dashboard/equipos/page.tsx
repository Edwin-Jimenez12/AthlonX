'use client'

import { MapPin, Users } from 'lucide-react'
import { useState } from 'react'
import { categorias } from '../../../simulaDatos'

const teams = [
  ['Titanes', '1ra División', '/equipos/Titanes.png', 'Ciudad de Panamá', '18'],
  ['Cuervos', '1ra División', '/equipos/cuervos.png', 'Ciudad de Panamá', '16'],
  ['Centauros', '1ra División', '', 'Panamá Oeste', '15'],
  ['Guerreros', '2da División', '', 'Ciudad de Panamá', '14'],
  ['Power Clan', '2da División', '', 'Panamá Norte', '13'],
  ['Vikingos', '2da División', '', 'Colón', '12'],
  ['Lycans', 'Femenina', '', 'Ciudad de Panamá', '16'],
  ['Targarens', 'Femenina', '', 'Panamá Oeste', '15'],
]

export default function TeamsPage() {
  const [notice, setNotice] = useState('')

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#17212b] lg:pl-64">
      <header className="border-b border-slate-200 bg-white px-6 py-5 md:px-10"><h1 className="font-heading text-3xl font-black uppercase">Equipos</h1></header>
      <section className="mx-auto max-w-7xl p-5 sm:p-6 md:p-10">
        <div className="mb-6 grid gap-4 md:grid-cols-3">{categorias.map((category) => <div key={category.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{category.nombre}</p><p className="mt-2 text-3xl font-bold">{category.equipos}</p><p className="text-sm text-slate-500">equipos registrados</p></div>)}</div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{teams.map(([name, division, logo, location, members]) => <article key={name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center">{logo ? <img src={logo} alt={`Logo de ${name}`} className="h-full w-full object-contain" /> : <span className="text-xl font-bold text-[#70b719]">{name.slice(0, 2).toUpperCase()}</span>}</div><div><h2 className="text-xl font-bold">{name}</h2><p className="text-sm text-[#70b719]">{division}</p></div></div><div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500"><p><MapPin className="mr-2 inline" size={16} />{location}</p><p className="mt-2"><Users className="mr-2 inline" size={16} />{members} miembros</p></div><button type="button" onClick={() => setNotice(`La vista de ${name} estará disponible en próximas actualizaciones.`)} className="mt-5 w-full rounded-lg border border-[#70b719] px-4 py-2 font-semibold text-[#4c8500] transition hover:bg-[#e9fbd0]">Visitar equipo</button></article>)}</div>
      </section>
      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-[#081522] px-5 py-4 text-center text-sm font-semibold text-white shadow-2xl"><div className="flex items-center justify-between gap-4"><span>{notice}</span><button type="button" onClick={() => setNotice('')} className="text-[#B4FF45]">Cerrar</button></div></div>}
    </main>
  )
}

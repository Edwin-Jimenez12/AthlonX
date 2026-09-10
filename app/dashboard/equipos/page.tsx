import { MapPin, Users } from 'lucide-react'
import { categorias } from '../../../simulaDatos'

const teams = [
  ['Titanes', '1ra División', '/equipos/Titanes.png', 'Ciudad de Panamá'],
  ['Cuervos', '1ra División', '/equipos/cuervos.png', 'Ciudad de Panamá'],
  ['Centauros', '1ra División', '', 'Panamá Oeste'],
  ['Guerreros', '2da División', '', 'Ciudad de Panamá'],
  ['Power Clan', '2da División', '', 'Panamá Norte'],
  ['Vikingos', '2da División', '', 'Colón'],
  ['Lycans', 'Femenina', '', 'Ciudad de Panamá'],
  ['Targarens', 'Femenina', '', 'Panamá Oeste'],
]

export default function TeamsPage() {
  return <main className="min-h-screen bg-[#f4f6f8] text-[#17212b] lg:pl-64"><header className="border-b border-slate-200 bg-white px-6 py-5 md:px-10"><p className="text-sm font-semibold text-slate-500">Liga Panameña de Rugby</p><h1 className="text-3xl font-bold">Equipos</h1></header><section className="mx-auto max-w-7xl p-6 md:p-10"><div className="mb-6 grid gap-4 md:grid-cols-3">{categorias.map((category) => <div key={category.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{category.nombre}</p><p className="mt-2 text-3xl font-bold">{category.equipos}</p><p className="text-sm text-slate-500">equipos registrados</p></div>)}</div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{teams.map(([name, division, logo, location]) => <article key={`${name}-${division}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center">{logo ? <img src={logo} alt={`Logo de ${name}`} className="h-full w-full object-contain" /> : <span className="text-xl font-bold text-[#70b719]">{name.slice(0, 2).toUpperCase()}</span>}</div><div><h2 className="text-xl font-bold">{name}</h2><p className="text-sm text-[#70b719]">{division}</p></div></div><div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500"><p><MapPin className="mr-2 inline" size={16} />{location}</p><p className="mt-2"><Users className="mr-2 inline" size={16} />Plantilla pendiente de cargar</p></div></article>)}</div></section></main>
}

import Link from 'next/link'
import { CalendarDays, MapPin, Trophy } from 'lucide-react'

type TournamentHeaderProps = { activeSection: 'Resumen' | 'Equipos' | 'Partidos' | 'Puntajes' }

export default function TournamentHeader({ activeSection }: TournamentHeaderProps) {
  const sections = ['Resumen', 'Equipos', 'Partidos', 'Puntajes'] as const

  return (
    <header className="rounded-2xl bg-[#081522] p-6 text-white shadow-sm md:p-8">
      <p className="text-xs font-bold uppercase tracking-[.25em] text-[#B4FF45]">Vista pública del torneo</p>
      <h1 className="mt-3 font-heading text-4xl font-black uppercase md:text-5xl">Liga Panameña de Rugby - 2da temporada 2026</h1>
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300"><span><CalendarDays className="mr-2 inline text-[#B4FF45]" size={16} />12 - 14 sept. 2026</span><span><MapPin className="mr-2 inline text-[#B4FF45]" size={16} />Ciudad de Panamá</span><span><Trophy className="mr-2 inline text-[#B4FF45]" size={16} />En curso</span></div>
      <nav className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">{sections.map((section) => <Link key={section} href={section === 'Equipos' ? '/dashboard/torneos/liga-panamena-rugby/equipos' : section === 'Partidos' ? '/dashboard/torneos/liga-panamena-rugby/partidos' : section === 'Puntajes' ? '/dashboard/torneos/liga-panamena-rugby/puntajes' : '/dashboard/torneos/liga-panamena-rugby'} className={`rounded-full border px-4 py-2 ${activeSection === section ? 'border-[#B4FF45] bg-[#B4FF45] text-[#081522]' : 'border-white/20 text-slate-200 hover:border-[#B4FF45] hover:text-[#B4FF45]'}`}>{section}</Link>)}</nav>
    </header>
  )
}

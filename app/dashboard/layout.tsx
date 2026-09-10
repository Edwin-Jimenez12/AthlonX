import Link from 'next/link'
import { BarChart3, ClipboardList, Monitor, Radio, Settings, Trophy, Users, UserRound } from 'lucide-react'

const navigation = [
  ['Dashboard', BarChart3, '/dashboard'],
  ['Torneos', Trophy, '/dashboard/torneos'],
  ['Equipos', Users, '/dashboard/equipos'],
  ['Partidos', ClipboardList, '/dashboard/partidos'],
  ['Vista pública', Monitor, '/dashboard/partidos?vista=publico'],
  ['Vista administrativa', Radio, '/dashboard/partidos?vista=administrativa'],
  ['Vista entrenadores', UserRound, '/dashboard/partidos?vista=entrenadores'],
  ['Estadísticas', BarChart3, '/dashboard/estadisticas'],
] as const

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 bg-[#081522] px-6 py-7 text-white lg:block">
        <Link href="/" className="block border-b border-white/10 pb-7">
          <img src="/MarcaAthlonX/MarcaHorizontal.svg" alt="AthlonX" className="w-44" />
          <p className="mt-2 text-[10px] uppercase tracking-[.35em] text-slate-500">Gestión deportiva</p>
        </Link>
        <nav className="mt-8 space-y-2">
          {navigation.map(([label, Icon, href]) => (
            <Link key={label} href={href} className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-white/10 hover:text-white">
              <Icon size={20} />
              <span className="font-heading text-lg">{label}</span>
            </Link>
          ))}
        </nav>
        <button type="button" className="absolute bottom-8 flex items-center gap-4 text-slate-400 hover:text-white"><Settings size={20} /> Configuración</button>
      </aside>
      {children}
    </>
  )
}

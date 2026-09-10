import { BarChart3, TrendingUp, Trophy, Users } from 'lucide-react'
import { categorias } from '../../../simulaDatos'

const summary = [
  { label: 'Puntos anotados', value: '486', icon: Trophy },
  { label: 'Tries registrados', value: '72', icon: TrendingUp },
  { label: 'Partidos jugados', value: '18', icon: BarChart3 },
  { label: 'Jugadores activos', value: '112', icon: Users },
]

export default function StatisticsPage() {
  return <main className="min-h-screen bg-[#f4f6f8] text-[#17212b] lg:pl-64"><header className="border-b border-slate-200 bg-white px-6 py-5 md:px-10"><p className="text-sm font-semibold text-slate-500">Liga Panameña de Rugby · Rendimiento</p><h1 className="text-3xl font-bold">Estadísticas</h1></header><section className="mx-auto max-w-7xl p-6 md:p-10"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summary.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="text-[#70b719]" /><p className="mt-5 text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></article>)}</div><div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl font-bold">Rendimiento por división</h2><div className="mt-5 space-y-5">{categorias.map((category) => <div key={category.id}><div className="flex justify-between"><span className="font-semibold">{category.nombre}</span><span className="text-sm text-slate-500">{category.partidos} partidos registrados</span></div><div className="mt-2 h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-[#8ade25]" style={{ width: `${Math.min(category.partidos * 10, 100)}%` }} /></div></div>)}</div></div></section></main>
}

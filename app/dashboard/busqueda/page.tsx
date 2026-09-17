'use client'

import { Building2, Search, SlidersHorizontal, Trophy, UserRound, Users, X } from 'lucide-react'
import { FormEvent, useState } from 'react'

type ResultType = 'todos' | 'organizaciones' | 'equipos' | 'torneos' | 'atletas'

const disciplines = [
  { value: 'all', label: 'Todas las disciplinas' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'rugby', label: 'Rugby' },
]

const resultTypes: { value: ResultType; label: string; icon: typeof Building2 }[] = [
  { value: 'todos', label: 'Todos los perfiles', icon: SlidersHorizontal },
  { value: 'organizaciones', label: 'Organizaciones', icon: Building2 },
  { value: 'equipos', label: 'Equipos', icon: Users },
  { value: 'torneos', label: 'Torneos', icon: Trophy },
  { value: 'atletas', label: 'Atletas', icon: UserRound },
]

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [discipline, setDiscipline] = useState('all')
  const [resultType, setResultType] = useState<ResultType>('todos')
  const [searched, setSearched] = useState(false)

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearched(query.trim().length > 0)
  }

  function clearSearch() {
    setQuery('')
    setDiscipline('all')
    setResultType('todos')
    setSearched(false)
  }

  return <main className="min-h-screen bg-[#07131e] text-white lg:ml-64">
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
      <div className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[.24em] text-[#b4ff45]">Explora AthlonX</p>
        <h2 className="mt-3 font-display text-5xl uppercase leading-none sm:text-6xl">Búsqueda</h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">Encuentra organizaciones, equipos, torneos y atletas dentro de las disciplinas disponibles.</p>
      </div>

      <form onSubmit={submitSearch} className="mt-8 flex max-w-5xl flex-col gap-3 sm:flex-row">
        <label htmlFor="global-search" className="sr-only">Buscar en AthlonX</label>
        <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#b4ff45]" size={21} /><input id="global-search" value={query} onChange={(event) => { setQuery(event.target.value); setSearched(false) }} placeholder="Buscar por nombre..." className="h-14 w-full rounded-2xl border border-[#29485d] bg-[#0d1d2b] px-14 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-[#b4ff45] focus:ring-2 focus:ring-[#b4ff45]/20" /></div>
        <button type="submit" className="inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#b4ff45] px-7 font-bold text-[#07131e] transition hover:bg-[#c7ff73] sm:shrink-0"><Search size={19} />Buscar</button>
      </form>

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr] lg:items-start">
        <aside className="rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-5">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><SlidersHorizontal size={18} className="text-[#b4ff45]" /><h3 className="font-heading text-lg uppercase tracking-wide">Filtros</h3></div><button type="button" onClick={clearSearch} className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-[#b4ff45]">Limpiar</button></div>
          <div className="mt-7"><label htmlFor="discipline" className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Disciplina</label><select id="discipline" value={discipline} onChange={(event) => setDiscipline(event.target.value)} className="mt-3 h-12 w-full cursor-pointer rounded-xl border border-[#29485d] bg-[#07131e] px-3 text-sm text-white outline-none focus:border-[#b4ff45]"><option value="all">Todas las disciplinas</option><option value="basketball">Basketball</option><option value="rugby">Rugby</option></select></div>
          <div className="mt-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Buscar en</p><div className="mt-3 space-y-1">{resultTypes.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => setResultType(value)} className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${resultType === value ? 'bg-[#b4ff45] text-[#07131e]' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}><Icon size={17} />{label}</button>)}</div></div>
        </aside>

        <section className="min-h-[390px] rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f4057] pb-5"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Directorio deportivo</p><h3 className="mt-2 font-display text-3xl uppercase">Resultados</h3></div><span className="rounded-full border border-[#29485d] px-3 py-1 text-xs font-semibold text-slate-400">{discipline === 'all' ? 'Todas' : disciplines.find((item) => item.value === discipline)?.label}</span></div>
          {searched ? <div className="flex min-h-[280px] flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#29485d] bg-[#07131e] text-[#b4ff45]"><Search size={26} /></div><h4 className="mt-5 font-heading text-2xl">No hay resultados todavía</h4><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">No encontramos coincidencias para <span className="font-semibold text-white">“{query.trim()}”</span> con los filtros seleccionados.</p><button type="button" onClick={clearSearch} className="mt-5 inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-[#b4ff45] hover:text-[#d5ff9b]"><X size={16} />Limpiar búsqueda</button></div> : <div className="flex min-h-[280px] flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#b4ff45]/10 text-[#b4ff45]"><Search size={27} /></div><h4 className="mt-5 font-heading text-2xl">Empieza a explorar</h4><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">Escribe un nombre y selecciona una disciplina para consultar el directorio de AthlonX.</p></div>}
        </section>
      </div>
    </section>
  </main>
}

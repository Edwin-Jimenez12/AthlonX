'use client'

import { Building2, CalendarDays, Search, SlidersHorizontal, Trophy, UserRound, Users, X } from 'lucide-react'
import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { PANAMA_CITIES } from '../../../lib/location-options'
import { supabase } from '../../../lib/supabase'

type ResultType = 'todos' | 'persona' | 'organizacion' | 'equipo' | 'torneo'
type SearchResult = {
  result_type: Exclude<ResultType, 'todos'>
  entity_id: string
  display_name: string
  username: string | null
  athlonx_code: string
  avatar_url: string | null
  location: string | null
  discipline_names: string[]
  affiliations: Affiliation[]
  relevance: number
}
type Affiliation = { role: string; role_label: string | null; organization_name: string | null; team_name: string | null }

const disciplines = [
  { value: 'all', label: 'Todas las disciplinas' },
  { value: 'baloncesto', label: 'Basketball' },
  { value: 'rugby', label: 'Rugby' },
]

const resultTypes: { value: ResultType; label: string }[] = [
  { value: 'todos', label: 'Todos los perfiles' },
  { value: 'persona', label: 'Personas' },
  { value: 'organizacion', label: 'Organizaciones' },
  { value: 'equipo', label: 'Equipos' },
  { value: 'torneo', label: 'Torneos' },
]

const resultTypeLabels: Record<SearchResult['result_type'], string> = {
  persona: 'Persona',
  organizacion: 'Organización',
  equipo: 'Equipo',
  torneo: 'Torneo',
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [discipline, setDiscipline] = useState('all')
  const [location, setLocation] = useState('')
  const [resultType, setResultType] = useState<ResultType>('todos')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedQuery = query.trim()
    if (normalizedQuery.length < 2) {
      setError('Escribe al menos 2 caracteres o un código AthlonX completo.')
      setSearched(false)
      return
    }
    if (!supabase) {
      setError('Supabase no está configurado.')
      return
    }

    setLoading(true)
    setError('')
    const { data, error: searchError } = await supabase.rpc('search_directory', {
      p_query: normalizedQuery,
      p_result_type: resultType,
      p_discipline_code: discipline === 'all' ? null : discipline,
      p_location: location.trim() || null,
      p_limit: 40,
    })
    setLoading(false)
    if (searchError) {
      setError(searchError.message)
      setResults([])
      setSearched(true)
      return
    }
    setResults((data ?? []) as SearchResult[])
    setSearched(true)
  }

  function clearSearch() {
    setQuery('')
    setDiscipline('all')
    setLocation('')
    setResultType('todos')
    setResults([])
    setError('')
    setSearched(false)
  }

  return <main className="min-h-screen bg-[#07131e] text-white lg:ml-64">
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
      <div className="max-w-4xl"><p className="text-sm font-bold uppercase tracking-[.24em] text-[#b4ff45]">Explora AthlonX</p><h2 className="mt-3 font-display text-5xl uppercase leading-none sm:text-6xl">Búsqueda</h2><p className="mt-4 max-w-3xl text-base leading-7 text-slate-400 sm:text-lg">Encuentra personas, organizaciones, equipos y torneos por código AthlonX, nombre de usuario o nombre normal.</p></div>

      <form onSubmit={submitSearch} className="mt-8 flex max-w-6xl flex-col gap-3 sm:flex-row">
        <label htmlFor="global-search" className="sr-only">Buscar en AthlonX</label>
        <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#b4ff45]" size={21} /><input id="global-search" value={query} onChange={(event) => { setQuery(event.target.value); setSearched(false); setError('') }} placeholder="AX-PER-8F42K, @edwin.jimenez o Edwin Jiménez" className="h-14 w-full rounded-2xl border border-[#29485d] bg-[#0d1d2b] px-14 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#b4ff45] focus:ring-2 focus:ring-[#b4ff45]/20 sm:text-base" /></div>
        <button type="submit" disabled={loading} className="inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#b4ff45] px-7 font-bold text-[#07131e] transition hover:bg-[#c7ff73] disabled:cursor-wait disabled:opacity-60"><Search size={19} />{loading ? 'Buscando...' : 'Buscar'}</button>
      </form>

      <div className="mt-8 grid gap-6 lg:grid-cols-[270px_1fr] lg:items-start">
        <aside className="rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><SlidersHorizontal size={18} className="text-[#b4ff45]" /><h3 className="font-heading text-lg uppercase tracking-wide">Filtros</h3></div><button type="button" onClick={clearSearch} className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-[#b4ff45]">Limpiar</button></div><div className="mt-7"><label htmlFor="discipline" className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Disciplina</label><select id="discipline" value={discipline} onChange={(event) => setDiscipline(event.target.value)} className="mt-3 h-12 w-full cursor-pointer rounded-xl border border-[#29485d] bg-[#07131e] px-3 text-sm text-white outline-none focus:border-[#b4ff45]"><option value="all">Todas las disciplinas</option><option value="baloncesto">Basketball</option><option value="rugby">Rugby</option></select></div><div className="mt-5"><label htmlFor="location" className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Ciudad</label><select id="location" value={location} onChange={(event) => setLocation(event.target.value)} className="mt-3 h-12 w-full cursor-pointer rounded-xl border border-[#29485d] bg-[#07131e] px-3 text-sm text-white outline-none focus:border-[#b4ff45]"><option value="">Todas las ciudades</option>{PANAMA_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}</select></div><div className="mt-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Buscar en</p><div className="mt-3 space-y-1">{resultTypes.map(({ value, label }) => <button key={value} type="button" onClick={() => setResultType(value)} className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${resultType === value ? 'bg-[#b4ff45] text-[#07131e]' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}><ResultIcon type={value} />{label}</button>)}</div></div></aside>

        <section className="min-h-[390px] rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f4057] pb-5"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Directorio deportivo</p><h3 className="mt-2 font-display text-3xl uppercase">Resultados</h3></div>{searched && <span className="rounded-full border border-[#29485d] px-3 py-1 text-xs font-semibold text-slate-400">{results.length} encontrados</span>}</div>{error && <p role="alert" className="mt-5 rounded-xl border border-[#ff7d88]/30 bg-[#ff7d88]/10 p-4 text-sm text-[#ffb0b7]">{error}</p>}{searched && !error ? <div className="mt-6 space-y-4">{results.length ? results.map((result) => <SearchResultCard key={`${result.result_type}-${result.entity_id}`} result={result} />) : <EmptyResults query={query} onClear={clearSearch} />}</div> : !error && <EmptySearchState />}</section>
      </div>
    </section>
  </main>
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const initials = result.display_name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'
  const isPerson = result.result_type === 'persona'
  const entityHref = result.result_type === 'persona'
    ? `/dashboard/perfil/${result.entity_id}`
    : result.result_type === 'equipo'
      ? `/dashboard/equipos/${result.entity_id}`
    : result.result_type === 'organizacion'
      ? `/dashboard/organizaciones/${result.entity_id}`
      : result.result_type === 'torneo'
        ? `/dashboard/torneos/ver/${result.entity_id}`
        : null

  const card = <div className="flex flex-col gap-5 sm:flex-row sm:items-start"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#b4ff45] font-display text-2xl text-[#07131e]">{result.avatar_url ? <img src={result.avatar_url} alt="" className="h-full w-full object-cover" /> : <span>{initials}</span>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#b4ff45]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#cfff91]"><ResultIcon type={result.result_type} />{resultTypeLabels[result.result_type]}</span>{result.location && <span className="text-xs text-slate-500">{result.location}</span>}</div><h4 className="mt-3 truncate font-heading text-3xl font-bold text-white">{result.display_name}</h4><div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500"><span>{result.result_type === 'torneo' ? 'Información pública' : result.username ? `@${result.username}` : 'Sin nombre de usuario'}</span><span className="font-mono text-[#b4ff45]">{result.athlonx_code}</span></div>{result.discipline_names?.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{result.discipline_names.map((discipline) => <span key={discipline} className="rounded-full border border-[#31556b] px-2.5 py-1 text-xs font-semibold text-slate-300">{discipline}</span>)}</div>}{isPerson && result.affiliations?.length > 0 && <div className="mt-4 border-t border-white/10 pt-3"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Afiliaciones</p><div className="mt-2 flex flex-wrap gap-2">{result.affiliations.map((affiliation, index) => <span key={`${affiliation.role}-${affiliation.team_name || affiliation.organization_name}-${index}`} className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-slate-300"><strong className="text-white">{affiliation.role_label || affiliation.role}</strong>{' · '}{affiliation.team_name || affiliation.organization_name || 'AthlonX'}</span>)}</div></div>}</div></div>
  return entityHref
    ? <Link href={entityHref} className="block rounded-2xl border border-[#29485d] bg-[#07131e]/70 p-5 transition hover:border-[#b4ff45]/60 focus:outline-none focus:ring-2 focus:ring-[#b4ff45]">{card}</Link>
    : <article className="rounded-2xl border border-[#29485d] bg-[#07131e]/70 p-5 transition hover:border-[#b4ff45]/60">{card}</article>
}

function EmptyResults({ query, onClear }: { query: string; onClear: () => void }) {
  return <div className="flex min-h-[260px] flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#29485d] bg-[#07131e] text-[#b4ff45]"><Search size={26} /></div><h4 className="mt-5 font-heading text-2xl">No hay resultados</h4><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">No encontramos coincidencias para <span className="font-semibold text-white">“{query.trim()}”</span> con los filtros seleccionados.</p><button type="button" onClick={onClear} className="mt-5 inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-[#b4ff45] hover:text-[#d5ff9b]"><X size={16} />Limpiar búsqueda</button></div>
}

function EmptySearchState() {
  return <div className="flex min-h-[280px] flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#b4ff45]/10 text-[#b4ff45]"><Search size={27} /></div><h4 className="mt-5 font-heading text-2xl">Empieza a explorar</h4><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">Busca por código AthlonX, nombre de usuario o nombre normal. Después combina los filtros.</p></div>
}

function ResultIcon({ type }: { type: ResultType | SearchResult['result_type'] }) {
  if (type === 'organizacion') return <Building2 size={15} />
  if (type === 'equipo') return <Users size={15} />
  if (type === 'torneo') return <Trophy size={15} />
  if (type === 'persona') return <UserRound size={15} />
  return <CalendarDays size={15} />
}

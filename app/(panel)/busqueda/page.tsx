'use client'

import { Building2, CalendarDays, Search, SlidersHorizontal, Trophy, UserRound, Users, X } from 'lucide-react'
import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { PANAMA_CITIES } from '../../../lib/location-options'
import { supabase } from '../../../lib/supabase'
import { FilterSelect } from '../../../Components/filter-select'

type ResultType = 'todos' | 'persona' | 'organizacion' | 'equipo' | 'torneo'
type Officiality = 'todos' | 'oficiales' | 'no_oficiales'

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
  is_official: boolean
  relevance: number
  can_edit?: boolean
  division_id?: string | null
  division_name?: string | null
}
type Affiliation = { role: string; role_label: string | null; organization_name: string | null; team_name: string | null }

const disciplines = [
  { value: 'all', label: 'Todas las disciplinas' },
  { value: 'baloncesto', label: 'Basketball' },
  { value: 'futbol', label: 'Fútbol' },
  { value: 'rugby', label: 'Rugby' },
]

const resultTypes: { value: ResultType; label: string }[] = [
  { value: 'todos', label: 'Todos los perfiles' },
  { value: 'persona', label: 'Personas' },
  { value: 'organizacion', label: 'Organizaciones' },
  { value: 'equipo', label: 'Equipos' },
  { value: 'torneo', label: 'Torneos' },
]

const officialityOptions: { value: Officiality; label: string }[] = [
  { value: 'todos', label: 'Oficiales y no oficiales' },
  { value: 'oficiales', label: 'Solo oficiales' },
  { value: 'no_oficiales', label: 'Solo no oficiales' },
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
  const [officiality, setOfficiality] = useState<Officiality>('todos')
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
    const { data, error: searchError } = await supabase.rpc('search_directory_filtered', {
      p_query: normalizedQuery,
      p_result_type: resultType,
      p_officiality: officiality,
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
    const { data: rosterData, error: rosterError } = resultType === 'todos' || resultType === 'persona'
      ? await supabase.rpc('search_public_players_filtered', {
        p_query: normalizedQuery,
        p_officiality: officiality,
        p_discipline_code: discipline === 'all' ? null : discipline,
        p_location: location.trim() || null,
        p_limit: 40,
      })
      : { data: [], error: null }
    if (rosterError && !rosterError.message.includes('search_public_players')) {
      setError(rosterError.message)
      setResults([])
      setSearched(true)
      setLoading(false)
      return
    }
    const { data: divisionData, error: divisionError } = resultType === 'todos' || resultType === 'equipo'
      ? await supabase.rpc('search_public_team_divisions_filtered', {
        p_query: normalizedQuery,
        p_officiality: officiality,
        p_discipline_code: discipline === 'all' ? null : discipline,
        p_location: location.trim() || null,
        p_limit: 40,
      })
      : { data: [], error: null }
    if (divisionError && !divisionError.message.includes('search_public_team_divisions_filtered')) {
      setError(divisionError.message)
      setResults([])
      setSearched(true)
      return
    }
    const directoryResults = ([...(data ?? []), ...(rosterData ?? []), ...(divisionData ?? [])] as SearchResult[])
      .sort((left, right) => left.relevance - right.relevance || (left.division_id ? 1 : 0) - (right.division_id ? 1 : 0) || left.display_name.localeCompare(right.display_name))
    const tournamentIds = directoryResults.filter((result) => result.result_type === 'torneo').map((result) => result.entity_id)
    const { data: userData } = await supabase.auth.getUser()
    const { data: ownedTournaments } = tournamentIds.length && userData.user
      ? await supabase.from('tournaments').select('id, created_by').in('id', tournamentIds)
      : { data: [] }
    const ownedIds = new Set((ownedTournaments ?? []).filter((tournament) => tournament.created_by === userData.user?.id).map((tournament) => tournament.id))
    setResults(directoryResults.map((result) => ({ ...result, can_edit: result.result_type === 'torneo' && ownedIds.has(result.entity_id) })))
    setSearched(true)
  }

  function clearSearch() {
    setQuery('')
    setDiscipline('all')
    setLocation('')
    setResultType('todos')
    setOfficiality('todos')
    setResults([])
    setError('')
    setSearched(false)
  }

  return <main className="min-h-screen bg-transparent text-white lg:ml-64">
    <section className="flex flex-col gap-8 px-6 pb-10 pt-6 md:px-10">
      <div className="ax-rise flex flex-col gap-2">
        <p className="font-barlow text-xs font-semibold uppercase tracking-[0.16em] text-[#b4ff45]">EXPLORA ATHLONX</p>
        <h2 className="font-heading text-4xl font-bold uppercase leading-none tracking-tight text-[#e8eef3] sm:text-[44px]">Búsqueda</h2>
        <p className="mt-1 max-w-2xl font-body text-sm leading-relaxed text-[#91a8ba] sm:text-base">Encuentra personas, organizaciones, equipos y torneos por código AthlonX, nombre de usuario o nombre.</p>
      </div>

      <form onSubmit={submitSearch} className="ax-rise flex items-center gap-3" style={{ animationDelay: '90ms' }}>
        <label htmlFor="global-search" className="sr-only">Buscar en AthlonX</label>
        <input id="global-search" value={query} onChange={(event) => { setQuery(event.target.value); setSearched(false); setError('') }} placeholder="AX-PER-8F42K, @edwin.jimenez o Edwin Jiménez" className="h-[58px] min-w-0 flex-1 rounded-2xl border border-[#29485d] bg-[#0b1d2c] px-[18px] font-body text-base text-[#e8eef3] outline-none transition-all duration-300 placeholder:text-[#91a8ba] focus:border-[#b4ff45] focus:shadow-[0_0_0_4px_rgba(180,255,69,.12)]" />
        <button type="submit" disabled={loading} className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#b4ff45] px-5 py-3 font-body text-sm font-semibold text-[#07131e] transition-all duration-200 hover:bg-[#c7ff73] hover:shadow-[0_8px_24px_-8px_rgba(180,255,69,.6)] active:scale-[.97] disabled:cursor-wait disabled:opacity-60">{loading ? 'Buscando...' : 'Buscar'}</button>
      </form>

      <div className="ax-rise grid gap-6 md:grid-cols-2 md:items-start" style={{ animationDelay: '180ms' }}>
        <aside className="flex flex-col gap-4 rounded-[20px] border border-[#29485d] bg-[#0b1d2c] p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-barlow text-[26px] font-semibold leading-none text-[#e8eef3]">FILTROS</h3>
            <button type="button" onClick={clearSearch} className="cursor-pointer font-body text-sm font-semibold text-[#b4ff45] transition hover:brightness-110">Limpiar</button>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-body text-xs tracking-[1.2px] text-[#91a8ba]">TIPO DE CUENTA</p>
            <div className="flex flex-wrap gap-2">
              {resultTypes.filter(({ value }) => value !== 'todos').map(({ value, label }) => {
                const active = resultType === value
                return <button key={value} type="button" aria-pressed={active} onClick={() => setResultType(active ? 'todos' : value)} className={`cursor-pointer rounded-full px-4 py-2 font-body text-sm transition-all duration-300 active:scale-95 ${active ? 'bg-[#b4ff45] font-semibold text-[#07131e] shadow-[0_6px_18px_-6px_rgba(180,255,69,.6)]' : 'border border-[#29485d] bg-[#102536] text-[#e8eef3] hover:border-[#b4ff45] hover:text-[#b4ff45]'}`}>{label}</button>
              })}
            </div>
          </div>
          <FilterSelect label="Disciplina" value={discipline} onChange={setDiscipline} options={disciplines} />
          <FilterSelect label="Ciudad" value={location} onChange={setLocation} options={[{ value: '', label: 'Todas las ciudades' }, ...PANAMA_CITIES.map((city) => ({ value: city, label: city }))]} />
          <FilterSelect label="Estado del registro" value={officiality} onChange={(value) => setOfficiality(value as Officiality)} options={officialityOptions} />
        </aside>

        <section className="flex min-h-[390px] flex-col gap-4 rounded-[20px] border border-[#29485d] bg-[#0b1d2c] p-7">
          <p className="font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-[#b4ff45]">DIRECTORIO DEPORTIVO</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-heading text-[40px] font-bold uppercase leading-none text-[#e8eef3]">Resultados</h3>
            {searched && <span className="font-body text-sm font-semibold text-[#91a8ba]">{results.length} coincidencias</span>}
          </div>
          {error && <p role="alert" className="rounded-xl border border-[#ff7d88]/30 bg-[#ff7d88]/10 p-4 text-sm text-[#ffb0b7]">{error}</p>}
          {searched && !error ? (
            <div className="flex flex-col gap-4">
              {results.length ? results.map((result, index) => <SearchResultCard key={`${result.result_type}-${result.entity_id}-${result.division_id || 'general'}`} result={result} index={index} />) : <EmptyResults query={query} onClear={clearSearch} />}
            </div>
          ) : <EmptySearchState />}
        </section>
      </div>
    </section>
  </main>
}

function SearchResultCard({ result, index = 0 }: { result: SearchResult; index?: number }) {
  const initials = result.display_name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'
  const entityHref = result.result_type === 'persona'
    ? `/perfil/${result.entity_id}`
    : result.result_type === 'equipo'
      ? result.division_id
        ? `/equipos/${result.entity_id}?division=${encodeURIComponent(result.division_id)}`
        : `/equipos/${result.entity_id}`
    : result.result_type === 'organizacion'
      ? `/organizaciones/${result.entity_id}`
      : result.result_type === 'torneo'
        ? `/torneos/ver/${result.entity_id}`
        : null
  const actionLabel = result.result_type === 'persona' ? 'Ver perfil' : result.result_type === 'equipo' ? 'Ver equipo' : result.result_type === 'organizacion' ? 'Ver organización' : 'Ver evento'
  const roleSummary = Array.from(new Set((result.affiliations ?? []).map((affiliation) => affiliation.role_label || affiliation.role))).join(' y ')
  const detailParts = result.result_type === 'persona' ? [roleSummary] : [...(result.discipline_names ?? [])]
  const subtitle = [resultTypeLabels[result.result_type], ...detailParts, result.location].filter(Boolean).join(' · ')
  const meta = [result.result_type === 'torneo' ? null : result.username ? `@${result.username}` : null, result.athlonx_code].filter(Boolean).join(' · ')
  const avatarShape = result.result_type === 'persona' ? 'rounded-full' : 'rounded-[14px]'

  const card = (
    <div className="flex items-center justify-between gap-5">
      <div className="flex min-w-0 items-center gap-5">
        <div className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden border border-[#29485d] bg-[#143345] ${avatarShape}`}>
          {result.avatar_url ? (
            <img src={result.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-heading text-[22px] font-bold text-[#e8eef3]">{initials}</span>
          )}
        </div>
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <p className="max-w-full truncate font-heading text-[26px] font-bold uppercase leading-none text-[#e8eef3]">{result.display_name}</p>
          <p className="font-body text-sm text-[#91a8ba]">{subtitle}</p>
          {meta && <p className="font-barlow text-sm font-semibold tracking-[0.84px] text-[#b4ff45]">{meta}</p>}
          {result.discipline_names?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              {result.discipline_names.map((discipline) => (
                <span key={discipline} className="rounded-full border border-[#29485d] bg-[#102536] px-4 py-2 font-body text-sm text-[#e8eef3]">{discipline}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      {entityHref && <span className="inline-flex shrink-0 items-center rounded-full border border-[#29485d] px-5 py-3 font-body text-sm font-semibold text-[#e8eef3] transition group-hover:border-[#b4ff45]">{actionLabel} ↗</span>}
    </div>
  )

  return entityHref ? (
    <div className="ax-rise group flex flex-col gap-4 rounded-[20px] border border-[#29485d] bg-[#0b1d2c] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#b4ff45]/60 hover:shadow-[0_12px_30px_-16px_rgba(180,255,69,.35)]" style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}>
      <Link href={entityHref} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b4ff45]">
        {card}
      </Link>
      {result.result_type === 'torneo' && result.can_edit && (
        <Link href={`/torneos/ver/${result.entity_id}?editar=1`} className="inline-flex w-fit cursor-pointer items-center rounded-full bg-[#b4ff45] px-5 py-2.5 font-body text-sm font-semibold text-[#07131e]">
          Editar torneo
        </Link>
      )}
    </div>
  ) : (
    <article className="ax-rise flex flex-col gap-4 rounded-[20px] border border-[#29485d] bg-[#0b1d2c] p-5" style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}>
      {card}
    </article>
  )
}

function EmptyResults({ query, onClear }: { query: string; onClear: () => void }) {
  return <div className="ax-rise flex min-h-[260px] flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#29485d] bg-[#07131e] text-[#b4ff45]"><Search size={26} /></div><h4 className="mt-5 font-heading text-2xl">No hay resultados</h4><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">No encontramos coincidencias para <span className="font-semibold text-white">“{query.trim()}”</span> con los filtros seleccionados.</p><button type="button" onClick={onClear} className="mt-5 inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-[#b4ff45] hover:text-[#d5ff9b]"><X size={16} />Limpiar búsqueda</button></div>
}

function EmptySearchState() {
  return <div className="ax-rise flex min-h-[280px] flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#b4ff45]/10 text-[#b4ff45]"><Search size={27} /></div><h4 className="mt-5 font-heading text-2xl">Empieza a explorar</h4><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">Busca por código AthlonX, nombre de usuario o nombre normal. Después combina los filtros.</p></div>
}

function ResultIcon({ type }: { type: ResultType | SearchResult['result_type'] }) {
  if (type === 'organizacion') return <Building2 size={15} />
  if (type === 'equipo') return <Users size={15} />
  if (type === 'torneo') return <Trophy size={15} />
  if (type === 'persona') return <UserRound size={15} />
  return <CalendarDays size={15} />
}

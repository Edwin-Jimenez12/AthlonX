'use client'

import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { PANAMA_CITIES } from '../../../lib/location-options'
import { supabase } from '../../../lib/supabase'
import { SearchEmptyState, SearchResult, SearchResultRow, SearchSkeleton, SearchStartState, ResultType } from '../../../Components/busqueda/search-results'
import { Button, Card, CardHeader, Notice, PageHeader, Segment, Select, cx } from '../../../Components/mi-equipo/ui'

type TypeFilter = 'todos' | ResultType
type Officiality = 'todos' | 'oficiales' | 'no_oficiales'
type Filters = { discipline: string; location: string; officiality: Officiality }

const PAGE_SIZE = 10
const defaultFilters: Filters = { discipline: 'all', location: '', officiality: 'todos' }

const disciplines = [
  { value: 'all', label: 'Todas las disciplinas' },
  { value: 'baloncesto', label: 'Basketball' },
  { value: 'futbol', label: 'Fútbol' },
  { value: 'rugby', label: 'Rugby' },
]

const cities = [{ value: '', label: 'Todas las ciudades' }, ...PANAMA_CITIES.map((city) => ({ value: city, label: city }))]

const officialityOptions: { value: Officiality; label: string }[] = [
  { value: 'todos', label: 'Oficiales y no oficiales' },
  { value: 'oficiales', label: 'Solo oficiales' },
  { value: 'no_oficiales', label: 'Solo no oficiales' },
]

const typeSegments: { value: TypeFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'persona', label: 'Personas' },
  { value: 'equipo', label: 'Equipos' },
  { value: 'organizacion', label: 'Organizaciones' },
  { value: 'torneo', label: 'Torneos' },
]

export default function SearchPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [searchedQuery, setSearchedQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos')
  const [results, setResults] = useState<SearchResult[]>([])
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Se busca siempre en todos los tipos: así el conteo de cada segmento sale de los mismos resultados.
  async function runSearch(term: string, active: Filters) {
    if (!supabase) return setError('Supabase no está configurado.')
    setLoading(true)
    setError('')
    const shared = {
      p_query: term,
      p_officiality: active.officiality,
      p_discipline_code: active.discipline === 'all' ? null : active.discipline,
      p_location: active.location.trim() || null,
      p_limit: 40,
    }
    const [directory, players, divisions] = await Promise.all([
      supabase.rpc('search_directory_filtered', { ...shared, p_result_type: 'todos' }),
      supabase.rpc('search_public_players_filtered', shared),
      supabase.rpc('search_public_team_divisions_filtered', shared),
    ])
    const failure = directory.error
      || (players.error && !players.error.message.includes('search_public_players') ? players.error : null)
      || (divisions.error && !divisions.error.message.includes('search_public_team_divisions_filtered') ? divisions.error : null)
    if (failure) {
      setLoading(false)
      setResults([])
      setSearchedQuery(term)
      return setError(failure.message)
    }
    const merged = ([...(directory.data ?? []), ...(players.data ?? []), ...(divisions.data ?? [])] as SearchResult[])
      .sort((left, right) => left.relevance - right.relevance || (left.division_id ? 1 : 0) - (right.division_id ? 1 : 0) || left.display_name.localeCompare(right.display_name))
    const tournamentIds = merged.filter((result) => result.result_type === 'torneo').map((result) => result.entity_id)
    const { data: userData } = await supabase.auth.getUser()
    const { data: ownedTournaments } = tournamentIds.length && userData.user
      ? await supabase.from('tournaments').select('id, created_by').in('id', tournamentIds)
      : { data: [] }
    const ownedIds = new Set((ownedTournaments ?? []).filter((tournament) => tournament.created_by === userData.user?.id).map((tournament) => tournament.id))
    setResults(merged.map((result) => ({ ...result, can_edit: result.result_type === 'torneo' && ownedIds.has(result.entity_id) })))
    setSearchedQuery(term)
    setVisible(PAGE_SIZE)
    setLoading(false)
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = query.trim()
    if (term.length < 2) return setError('Escribe al menos 2 caracteres o un código AthlonX completo.')
    void runSearch(term, filters)
  }

  // Con una búsqueda hecha, cambiar un filtro vuelve a consultar sin tener que pulsar Buscar.
  function updateFilters(next: Partial<Filters>) {
    const merged = { ...filters, ...next }
    setFilters(merged)
    if (searchedQuery) void runSearch(searchedQuery, merged)
  }

  function clearFilters() {
    updateFilters(defaultFilters)
  }

  function clearQuery() {
    setQuery('')
    setSearchedQuery('')
    setResults([])
    setError('')
    inputRef.current?.focus()
  }

  function applyExample(value: string) {
    setQuery(value)
    inputRef.current?.focus()
  }

  useEffect(() => { setVisible(PAGE_SIZE) }, [typeFilter])

  const activeFilterCount = Number(filters.discipline !== 'all') + Number(Boolean(filters.location)) + Number(filters.officiality !== 'todos')
  const counts = Object.fromEntries(typeSegments.map(({ value }) => [value, value === 'todos' ? results.length : results.filter((result) => result.result_type === value).length])) as Record<TypeFilter, number>
  const filtered = typeFilter === 'todos' ? results : results.filter((result) => result.result_type === typeFilter)
  const shown = filtered.slice(0, visible)
  const searched = Boolean(searchedQuery)

  const filterFields = <>
    <Select label="Disciplina" value={filters.discipline} options={disciplines} onChange={(value) => updateFilters({ discipline: value })} />
    <Select label="Ciudad" value={filters.location} options={cities} onChange={(value) => updateFilters({ location: value })} placeholder="Todas las ciudades" />
    <Select label="Registro" value={filters.officiality} options={officialityOptions} onChange={(value) => updateFilters({ officiality: value as Officiality })} />
  </>

  return <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
    <div className="mx-auto max-w-[1184px] space-y-5 px-4 pb-16 pt-5 sm:space-y-6 sm:px-8 sm:pt-8 lg:px-10">
      <PageHeader title="Búsqueda" description="Encuentra personas, equipos, organizaciones y torneos por nombre, @usuario o código AthlonX." />

      <form onSubmit={submitSearch} className="flex gap-2.5 sm:gap-3" role="search">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar en AthlonX</span>
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ax-muted)]" />
          <input ref={inputRef} type="search" value={query} onChange={(event) => { setQuery(event.target.value); setError('') }} placeholder="Nombre, @usuario o código" className="h-[52px] w-full rounded-[10px] border border-[var(--ax-line-strong)] bg-[var(--ax-surface)] pl-11 pr-11 text-base text-[var(--ax-text)] transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--ax-muted)] hover:border-[var(--ax-muted)] focus:border-[var(--ax-accent-text)] focus:shadow-[0_0_0_3px_var(--ax-accent-soft)] focus:outline-none [&::-webkit-search-cancel-button]:hidden" />
          {query && <button type="button" onClick={clearQuery} aria-label="Borrar búsqueda" className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-[var(--ax-muted)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]"><X size={16} /></button>}
        </label>
        <Button type="submit" variant="primary" disabled={loading} className="!h-[52px] px-5">{loading ? 'Buscando…' : 'Buscar'}</Button>
      </form>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Tipo de resultado">
        {typeSegments.map(({ value, label }) => <Segment key={value} active={typeFilter === value} label={label} count={searched ? counts[value] : undefined} onClick={() => setTypeFilter(value)} />)}
      </div>

      <div className="sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <Button icon={SlidersHorizontal} variant={filtersOpen || activeFilterCount ? 'accent' : 'secondary'} aria-expanded={filtersOpen} onClick={() => setFiltersOpen((current) => !current)}>
            Filtros{activeFilterCount ? ` · ${activeFilterCount}` : ''}
            <ChevronDown size={15} aria-hidden="true" className={cx('transition-transform duration-150', filtersOpen && 'rotate-180')} />
          </Button>
          {activeFilterCount ? <button type="button" onClick={clearFilters} className="cursor-pointer text-[13px] font-semibold text-[var(--ax-accent-text)]">Limpiar</button> : <span className="text-[13px] text-[var(--ax-muted)]">Sin filtros aplicados</span>}
        </div>
        {filtersOpen && <div className="ax-drop-in mt-3 space-y-4 rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-4">{filterFields}</div>}
      </div>

      <div className="hidden gap-3 sm:grid sm:grid-cols-3 xl:hidden">{filterFields}</div>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
        <Card className="hidden space-y-4 xl:block" labelledBy="search-filters">
          <CardHeader id="search-filters" title="Filtros" actions={<button type="button" onClick={clearFilters} disabled={!activeFilterCount} className="cursor-pointer text-[13px] font-semibold text-[var(--ax-accent-text)] disabled:cursor-default disabled:text-[var(--ax-muted)]">Limpiar</button>} />
          {filterFields}
        </Card>

        <Card labelledBy="search-results" className="space-y-3">
          <CardHeader id="search-results" title="Resultados" subtitle={searched && !loading ? `${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'} para “${searchedQuery}”` : undefined} />
          {error && <Notice tone="danger" icon={X}>{error}</Notice>}
          {loading ? <SearchSkeleton />
            : !searched ? <SearchStartState onExample={applyExample} />
            : !filtered.length ? !error && <SearchEmptyState query={searchedQuery} filtersActive={activeFilterCount > 0 || typeFilter !== 'todos'} onClearFilters={() => { setTypeFilter('todos'); clearFilters() }} />
            : <>
              <ul className="-mx-1 sm:mx-0">{shown.map((result) => <SearchResultRow key={`${result.result_type}-${result.entity_id}-${result.division_id || 'general'}`} result={result} />)}</ul>
              <div className="flex items-center justify-between gap-3 border-t border-[var(--ax-line)] pt-4 text-[13px]">
                <span className="text-[var(--ax-muted)]">Mostrando {shown.length} de {filtered.length}</span>
                {shown.length < filtered.length && <button type="button" onClick={() => setVisible((current) => current + PAGE_SIZE)} className="inline-flex cursor-pointer items-center gap-1 font-semibold text-[var(--ax-accent-text)]">Cargar más<ChevronDown size={15} aria-hidden="true" /></button>}
              </div>
            </>}
        </Card>
      </div>
    </div>
  </main>
}

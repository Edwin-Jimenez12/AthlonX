'use client'

import { ChevronRight, Pencil, Search } from 'lucide-react'
import Link from 'next/link'
import { Avatar, Badge, Button, EntityMark, cx } from '../mi-equipo/ui'

// Filas y estados de Búsqueda (componentes "Fila/Resultado" y "Fila/Resultado entidad" en Figma).

export type ResultType = 'persona' | 'organizacion' | 'equipo' | 'torneo'

type Affiliation = { role: string; role_label: string | null; organization_name: string | null; team_name: string | null }

export type SearchResult = {
  result_type: ResultType
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

const typeLabels: Record<ResultType, string> = {
  persona: 'Persona',
  organizacion: 'Organización',
  equipo: 'Equipo',
  torneo: 'Torneo',
}

const actionLabels: Record<ResultType, string> = {
  persona: 'Ver perfil',
  organizacion: 'Ver organización',
  equipo: 'Ver equipo',
  torneo: 'Ver torneo',
}

function hrefFor(result: SearchResult) {
  if (result.result_type === 'persona') return `/perfil/${result.entity_id}`
  if (result.result_type === 'equipo') return result.division_id ? `/equipos/${result.entity_id}?division=${encodeURIComponent(result.division_id)}` : `/equipos/${result.entity_id}`
  if (result.result_type === 'organizacion') return `/organizaciones/${result.entity_id}`
  return `/torneos/ver/${result.entity_id}`
}

export function SearchResultRow({ result }: { result: SearchResult }) {
  const isDivision = result.result_type === 'equipo' && Boolean(result.division_id)
  const href = hrefFor(result)
  const roles = Array.from(new Set((result.affiliations ?? []).map((affiliation) => affiliation.role_label || affiliation.role))).join(' y ')
  const affiliation = (result.affiliations ?? []).find((item) => item.team_name || item.organization_name)
  const personDetail = roles ? `${roles}${affiliation ? ` en ${affiliation.team_name || affiliation.organization_name}` : ''}` : ''
  const detail = [result.result_type === 'persona' ? personDetail : (result.discipline_names ?? []).join(', '), result.location].filter(Boolean).join(' · ')
  const meta = [result.result_type !== 'torneo' && result.username ? `@${result.username}` : null, result.athlonx_code].filter(Boolean).join(' · ')
  const action = isDivision ? 'Ver división' : actionLabels[result.result_type]

  return <li className="group relative flex items-center gap-3.5 border-b border-[var(--ax-line)] py-4 last:border-b-0 sm:gap-4 sm:px-4">
    {result.result_type === 'persona' ? <Avatar name={result.display_name} src={result.avatar_url} size={44} /> : <EntityMark name={result.display_name} src={result.avatar_url} />}
    <div className="min-w-0 flex-1 space-y-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link href={href} className="text-[15px] font-semibold text-[var(--ax-text)] outline-none after:absolute after:inset-0 after:rounded-[10px] focus-visible:after:ring-2 focus-visible:after:ring-[var(--ax-accent-text)]">{result.display_name}</Link>
        <Badge>{isDivision ? 'División' : typeLabels[result.result_type]}</Badge>
      </div>
      {detail && <p className="text-[13px] leading-5 text-[var(--ax-text-secondary)]">{detail}</p>}
      {meta && <p className="text-xs text-[var(--ax-muted)]">{meta}</p>}
    </div>
    {result.can_edit && <Link href={`/torneos/ver/${result.entity_id}?editar=1`} className="relative z-10 hidden h-9 shrink-0 items-center gap-1.5 rounded-[10px] border border-[var(--ax-line-strong)] px-3 text-[13px] font-semibold text-[var(--ax-text)] transition-colors hover:border-[var(--ax-accent-text)] sm:inline-flex"><Pencil size={14} aria-hidden="true" />Editar</Link>}
    <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[var(--ax-accent-text)] transition-transform duration-150 group-hover:translate-x-0.5">
      <span className="hidden sm:inline">{action}</span><ChevronRight size={16} />
    </span>
  </li>
}

// Ejemplos tocables antes de buscar: rellenan el campo con el formato y lo enfocan.
const formatExamples = [
  { label: 'Nombre', value: '' },
  { label: '@usuario', value: '@' },
  { label: 'Código AX-', value: 'AX-' },
]

export function SearchStartState({ onExample }: { onExample: (value: string) => void }) {
  return <div className="space-y-4">
    <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-[var(--ax-line-strong)] px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ax-accent-soft)] text-[var(--ax-accent-text)]"><Search size={20} aria-hidden="true" /></span>
      <p className="text-[15px] font-semibold text-[var(--ax-text)]">Empieza a explorar</p>
      <p className="max-w-sm text-[13px] leading-5 text-[var(--ax-muted)]">Busca por nombre, @usuario o código AthlonX. Después combina los filtros.</p>
    </div>
    <div className="flex flex-wrap gap-2">
      {formatExamples.map((example) => <button key={example.label} type="button" onClick={() => onExample(example.value)} className="h-9 cursor-pointer rounded-full border border-[var(--ax-line-strong)] px-3.5 text-[13px] font-semibold text-[var(--ax-text-secondary)] transition-colors hover:border-[var(--ax-accent-text)] hover:text-[var(--ax-text)]">{example.label}</button>)}
    </div>
  </div>
}

export function SearchEmptyState({ query, filtersActive, onClearFilters }: { query: string; filtersActive: boolean; onClearFilters: () => void }) {
  return <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-[var(--ax-line-strong)] px-6 py-10 text-center">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ax-accent-soft)] text-[var(--ax-accent-text)]"><Search size={20} aria-hidden="true" /></span>
    <p className="text-[15px] font-semibold text-[var(--ax-text)] [overflow-wrap:anywhere]">Sin resultados para “{query}”</p>
    <p className="max-w-sm text-[13px] leading-5 text-[var(--ax-muted)]">{filtersActive ? 'Revisa la ortografía o quita los filtros aplicados.' : 'Revisa la ortografía o prueba con el código AthlonX completo.'}</p>
    {filtersActive && <Button size="sm" onClick={onClearFilters}>Quitar filtros</Button>}
  </div>
}

export function SearchSkeleton() {
  return <ul aria-hidden="true">
    {Array.from({ length: 4 }, (_, index) => <li key={index} className="flex items-center gap-4 border-b border-[var(--ax-line)] py-4 last:border-b-0 sm:px-4">
      <span className={cx('h-11 w-11 shrink-0 animate-pulse bg-[var(--ax-surface-raised)]', index % 2 ? 'rounded-full' : 'rounded-[10px]')} />
      <span className="flex-1 space-y-2">
        <span className={cx('block h-3 animate-pulse rounded-md bg-[var(--ax-surface-raised)]', index % 2 ? 'w-36' : 'w-48')} />
        <span className="block h-3 w-64 max-w-full animate-pulse rounded-md bg-[var(--ax-surface-raised)]" />
      </span>
    </li>)}
  </ul>
}

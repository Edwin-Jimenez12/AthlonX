'use client'

import { Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AccountContext, loadAccountContexts } from '../../lib/account-contexts'
import { AccountPlan, loadAccountPlan } from '../../lib/account-plans'
import { supabase } from '../../lib/supabase'
import { Card, CardHeader, Notice, Segment, inputClass, FieldLabel } from '../mi-equipo/ui'
import { LockedFeature } from '../organizacion/plan-ui'
import { PersonaShell } from './persona-ui'
import { PersonaViewSwitcher } from '../persona-view-switcher'

type Mode = 'semana' | 'mes' | 'anio'
type PlayerRow = { nombre: string; posicion: string; partidos: number; anotaciones: number; puntos: number; tarjetas: number }
type SeasonStats = { from: string; to: string; players: PlayerRow[] }
type TeamPersonal = { teamId: string; teamName: string; row: PlayerRow | null; from: string; to: string; requestedFrom: string; requestedTo: string }

const pad = (value: number) => String(value).padStart(2, '0')
const iso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

// Rango de fechas según el modo: semana (lunes a domingo), mes o año.
export function rangeFor(mode: Mode, anchor: string, year: number) {
  if (mode === 'anio') return { from: `${year}-01-01`, to: `${year}-12-31` }
  const [y, m, d] = anchor.split('-').map(Number)
  if (mode === 'mes') return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) }
  const base = new Date(y, m - 1, d)
  const weekday = (base.getDay() + 6) % 7
  const monday = new Date(y, m - 1, d - weekday)
  const sunday = new Date(y, m - 1, d - weekday + 6)
  return { from: iso(monday), to: iso(sunday) }
}

// Compara nombres sin acentos ni mayúsculas, para encontrar la fila propia en las estadísticas del equipo.
export function sameName(a: string, b: string) {
  const norm = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
  return norm(a) !== '' && norm(a) === norm(b)
}

// Estadísticas propias de la persona (atleta o entrenador), por semana, mes o año.
// Free ve el año actual; Pro ve también los años anteriores.
export function PersonaStatsView() {
  const currentYear = new Date().getFullYear()
  const [mode, setMode] = useState<Mode>('anio')
  const [anchor, setAnchor] = useState(iso(new Date()))
  const [year, setYear] = useState(currentYear)
  const [fullName, setFullName] = useState('')
  const [teams, setTeams] = useState<AccountContext[]>([])
  const [plan, setPlan] = useState<AccountPlan | null>(null)
  const [results, setResults] = useState<TeamPersonal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) return setLoading(false)
      const { data } = await supabase.auth.getUser()
      if (!data.user) return setLoading(false)
      const [contexts, accountPlan, profile] = await Promise.all([
        loadAccountContexts(data.user.id),
        loadAccountPlan('persona', data.user.id).catch(() => null),
        supabase.from('profiles').select('full_name').eq('id', data.user.id).maybeSingle(),
      ])
      if (!active) return
      setTeams(contexts.filter((context) => context.contextType === 'team' && context.teamId && (context.role === 'atleta' || context.role === 'entrenador')))
      setPlan(accountPlan)
      setFullName(profile.data?.full_name || data.user.user_metadata?.full_name || '')
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [])

  const isPro = Boolean(plan && plan.code !== 'libre')
  const range = useMemo(() => rangeFor(mode, anchor, year), [mode, anchor, year])
  const periodYear = mode === 'anio' ? year : Number(anchor.slice(0, 4))
  const locked = !isPro && periodYear !== currentYear
  const yearOptions = isPro ? Array.from({ length: 5 }, (_, index) => currentYear - index) : [currentYear]

  useEffect(() => {
    if (!supabase || locked || teams.length === 0) return setResults([])
    let active = true
    async function fetchStats() {
      const rows: TeamPersonal[] = []
      for (const team of teams) {
        const { data, error: rpcError } = await supabase!.rpc('team_season_stats', { p_team: team.teamId, p_from: range.from, p_to: range.to })
        if (rpcError) {
          if (active) setError(rpcError.message)
          continue
        }
        const stats = data as SeasonStats
        const row = (stats?.players ?? []).find((player) => sameName(player.nombre, fullName)) ?? null
        rows.push({ teamId: team.teamId as string, teamName: team.name, row, from: stats?.from ?? range.from, to: stats?.to ?? range.to, requestedFrom: range.from, requestedTo: range.to })
      }
      if (active) { setError(''); setResults(rows) }
    }
    void fetchStats()
    return () => { active = false }
  }, [teams, range.from, range.to, locked, fullName])

  const totals = results.reduce(
    (sum, item) => ({
      partidos: sum.partidos + (item.row?.partidos ?? 0),
      anotaciones: sum.anotaciones + (item.row?.anotaciones ?? 0),
      puntos: sum.puntos + (item.row?.puntos ?? 0),
      tarjetas: sum.tarjetas + (item.row?.tarjetas ?? 0),
    }),
    { partidos: 0, anotaciones: 0, puntos: 0, tarjetas: 0 },
  )
  const adjusted = results.find((item) => item.from !== item.requestedFrom || item.to !== item.requestedTo)
  const hasRows = results.some((item) => item.row)

  return (
    <PersonaShell>
      <PersonaViewSwitcher active="atleta" />
      <header className="space-y-1">
        <h1 className="font-display text-[34px] uppercase leading-[36px] tracking-[.02em] text-[var(--ax-text)] sm:text-[40px] sm:leading-[42px]">Estadísticas</h1>
        <p className="text-sm text-[var(--ax-muted)]">{isPro ? 'Plan Pro: puedes ver los años anteriores.' : `Plan ${plan?.name ?? 'Libre'}: estadísticas del año actual.`}</p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Periodo">
          {(['semana', 'mes', 'anio'] as Mode[]).map((item) => (
            <Segment key={item} active={mode === item} label={item === 'anio' ? 'Año' : item === 'mes' ? 'Mes' : 'Semana'} onClick={() => setMode(item)} />
          ))}
        </div>
        {mode === 'anio' ? (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Año">
            {yearOptions.map((option) => <Segment key={option} active={year === option} label={String(option)} onClick={() => setYear(option)} />)}
          </div>
        ) : (
          <label className="block w-full sm:w-auto">
            <FieldLabel>{mode === 'mes' ? 'Mes de referencia' : 'Semana de referencia'}</FieldLabel>
            <input type="date" className={`${inputClass} sm:w-auto`} value={anchor} onChange={(event) => setAnchor(event.target.value)} />
          </label>
        )}
      </div>

      {!isPro && <LockedFeature label="Ver los años anteriores y comparar tu evolución" />}
      {locked && <p className="text-sm text-[var(--ax-muted)]">Este periodo es de un año anterior. Disponible en Pro.</p>}
      {error && <Notice tone="danger" icon={Info}>{error}</Notice>}
      {adjusted && <Notice tone="neutral" icon={Info}>Las estadísticas del equipo se muestran del {adjusted.from} al {adjusted.to}: el rango lo ajusta el plan del equipo.</Notice>}
      {!fullName && !loading && <Notice tone="neutral" icon={Info}>Pon tu nombre completo en Mi perfil para encontrar tus estadísticas en el equipo.</Notice>}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Totales del periodo">
        {([['Partidos', totals.partidos], ['Anotaciones', totals.anotaciones], ['Puntos', totals.puntos], ['Tarjetas', totals.tarjetas]] as const).map(([label, value]) => (
          <div key={label} className="rounded-[20px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-[var(--ax-muted)]">{label}</p>
            <p className="mt-1.5 font-display text-[36px] leading-none">{locked ? '—' : value}</p>
          </div>
        ))}
      </section>

      <Card labelledBy="por-equipo">
        <CardHeader id="por-equipo" title="Por equipo" subtitle={`${range.from} a ${range.to}`} />
        {!loading && teams.length === 0 && <p className="mt-4 text-sm text-[var(--ax-muted)]">Aún no juegas ni diriges un equipo.</p>}
        {!locked && results.length > 0 && !hasRows && <p className="mt-4 text-sm text-[var(--ax-muted)]">Todavía no hay partidos finalizados en este periodo.</p>}
        {results.length > 0 && hasRows && (
          <ul className="mt-4 divide-y divide-[var(--ax-line)]">
            {results.filter((item) => item.row).map((item) => (
              <li key={item.teamId} className="grid grid-cols-2 gap-2 py-3 text-sm sm:grid-cols-5">
                <span className="col-span-2 font-semibold text-[var(--ax-text)] sm:col-span-1">{item.teamName}</span>
                <span className="tabular-nums text-[var(--ax-text-secondary)]">Partidos {item.row?.partidos ?? 0}</span>
                <span className="tabular-nums text-[var(--ax-text-secondary)]">Anotaciones {item.row?.anotaciones ?? 0}</span>
                <span className="tabular-nums text-[var(--ax-text-secondary)]">Puntos {item.row?.puntos ?? 0}</span>
                <span className="tabular-nums text-[var(--ax-text-secondary)]">Tarjetas {item.row?.tarjetas ?? 0}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PersonaShell>
  )
}

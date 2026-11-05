'use client'

import { Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AccountPlan, loadAccountPlan } from '../../lib/account-plans'
import { supabase } from '../../lib/supabase'
import { isoDate, PeriodControls, PeriodMode, rangeFor, yearsFor } from '../estadisticas/periodo'
import { Card, CardHeader, Notice } from '../mi-equipo/ui'
import { LockedFeature } from '../organizacion/plan-ui'
import { PersonaViewSwitcher } from '../persona-view-switcher'
import { PersonaShell } from './persona-ui'

type TeamRow = { team_id: string; equipo: string; partidos: number; anotaciones: number; puntos: number; tarjetas: number }
type PersonalStats = { from: string; to: string; plan: string; teams: TeamRow[] }

// Estadísticas propias de la persona (atleta o entrenador), por semana, mes o año (1 de enero al 31 de diciembre).
// Libre ve el año actual; Pro ve también los años anteriores.
export function PersonaStatsView() {
  const currentYear = new Date().getFullYear()
  const [mode, setMode] = useState<PeriodMode>('anio')
  const [anchor, setAnchor] = useState(() => isoDate(new Date()))
  const [year, setYear] = useState(currentYear)
  const [plan, setPlan] = useState<AccountPlan | null>(null)
  const [stats, setStats] = useState<PersonalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isPro = Boolean(plan && plan.code !== 'libre')
  const years = yearsFor(isPro, currentYear)
  const range = useMemo(() => rangeFor(mode, anchor, year), [mode, anchor, year])
  const periodYear = mode === 'anio' ? year : Number(anchor.slice(0, 4))
  const locked = !isPro && periodYear !== currentYear

  useEffect(() => {
    let active = true
    async function loadPlan() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const accountPlan = await loadAccountPlan('persona', data.user.id).catch(() => null)
      if (active) setPlan(accountPlan)
    }
    void loadPlan()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!supabase || locked) return
    let active = true
    setLoading(true)
    supabase.rpc('persona_personal_stats', { p_from: range.from, p_to: range.to }).then(({ data, error: rpcError }) => {
      if (!active) return
      if (rpcError) {
        setError(rpcError.message)
        setStats(null)
      } else {
        setError('')
        setStats(data as PersonalStats)
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [range.from, range.to, locked])

  const teams = stats?.teams ?? []
  const totals = teams.reduce(
    (sum, row) => ({ partidos: sum.partidos + row.partidos, anotaciones: sum.anotaciones + row.anotaciones, puntos: sum.puntos + row.puntos, tarjetas: sum.tarjetas + row.tarjetas }),
    { partidos: 0, anotaciones: 0, puntos: 0, tarjetas: 0 },
  )

  return (
    <PersonaShell>
      <PersonaViewSwitcher active="atleta" />
      <header className="space-y-1">
        <h1 className="font-display text-[34px] uppercase leading-[36px] tracking-[.02em] text-[var(--ax-text)] sm:text-[40px] sm:leading-[42px]">Estadísticas</h1>
        <p className="text-sm text-[var(--ax-muted)]">{isPro ? 'Plan Pro: puedes ver los años anteriores.' : `Plan ${plan?.name ?? 'Libre'}: estadísticas del año actual.`}</p>
      </header>

      <PeriodControls mode={mode} onMode={setMode} anchor={anchor} onAnchor={setAnchor} year={year} onYear={setYear} years={years} />

      {!isPro && <LockedFeature label="Ver los años anteriores y comparar tu evolución" />}
      {locked && <p className="text-sm text-[var(--ax-muted)]">Este periodo es de un año anterior. Disponible en Pro.</p>}
      {error && <Notice tone="danger" icon={Info}>{error}</Notice>}

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
        {!loading && !locked && teams.length === 0 && <p className="mt-4 text-sm text-[var(--ax-muted)]">Todavía no hay partidos finalizados en este periodo.</p>}
        {teams.length > 0 && (
          <ul className="mt-4 divide-y divide-[var(--ax-line)]">
            {teams.map((row) => (
              <li key={row.team_id} className="grid grid-cols-2 gap-2 py-3 text-sm sm:grid-cols-5">
                <span className="col-span-2 font-semibold text-[var(--ax-text)] sm:col-span-1">{row.equipo}</span>
                <span className="tabular-nums text-[var(--ax-text-secondary)]">Partidos {row.partidos}</span>
                <span className="tabular-nums text-[var(--ax-text-secondary)]">Anotaciones {row.anotaciones}</span>
                <span className="tabular-nums text-[var(--ax-text-secondary)]">Puntos {row.puntos}</span>
                <span className="tabular-nums text-[var(--ax-text-secondary)]">Tarjetas {row.tarjetas}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PersonaShell>
  )
}

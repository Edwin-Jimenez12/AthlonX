'use client'

import { Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button, Card, CardHeader, Notice, PageHeader } from '../mi-equipo/ui'
import { Chip, LimitMeter, LockedFeature, downloadCsv, printReport } from '../organizacion/plan-ui'
import { isoDate, PeriodControls, PeriodMode, rangeFor, yearsFor } from '../estadisticas/periodo'
import { teamFlag, type ActiveTeam } from './team-plan'

type SeasonStats = {
  from: string
  to: string
  summary: { jugados: number; ganados: number; empatados: number; perdidos: number }
  players: Array<{ nombre: string; posicion: string; partidos: number; anotaciones: number; puntos: number; tarjetas: number }>
}

// Estadísticas del equipo por semana, mes o año (año calendario). Free: año actual. Pro: años anteriores y comparación.
export function TeamStatsView({ ctx }: { ctx: ActiveTeam }) {
  const team = ctx.team!
  const usage = ctx.usage
  const isPro = teamFlag(usage, 'comparar_temporadas')
  const reportsOn = teamFlag(usage, 'reportes')
  const currentYear = new Date().getFullYear()
  const [mode, setMode] = useState<PeriodMode>('anio')
  const [anchor, setAnchor] = useState(() => isoDate(new Date()))
  const [year, setYear] = useState(currentYear)
  const [stats, setStats] = useState<SeasonStats | null>(null)
  const [years, setYears] = useState<Array<{ temporada: number; jugados: number; ganados: number }>>([])
  const [error, setError] = useState('')

  const range = useMemo(() => rangeFor(mode, anchor, year), [mode, anchor, year])
  const periodYear = mode === 'anio' ? year : Number(anchor.slice(0, 4))
  const locked = !isPro && periodYear !== currentYear

  useEffect(() => {
    if (!supabase || locked) return
    let active = true
    supabase.rpc('team_season_stats', { p_team: team.id, p_from: range.from, p_to: range.to }).then(({ data, error: rpcError }) => {
      if (!active) return
      if (rpcError) { setError(rpcError.message); setStats(null) } else { setError(''); setStats(data as SeasonStats) }
    })
    return () => { active = false }
  }, [team.id, range.from, range.to, locked])

  useEffect(() => {
    if (!supabase || !isPro) return
    supabase.rpc('team_compare_seasons', { p_team: team.id }).then(({ data }) => setYears((data ?? []) as typeof years))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id, isPro])

  const header = ['Jugador', 'Posición', 'Partidos', 'Anotaciones', 'Puntos', 'Tarjetas']
  const rows = () => (stats?.players ?? []).map((p) => [p.nombre, p.posicion, p.partidos, p.anotaciones, p.puntos, p.tarjetas])
  const summary = stats?.summary

  return (
    <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
      <div className="mx-auto max-w-[1184px] space-y-5 px-4 pb-16 pt-5 sm:space-y-6 sm:px-8 sm:pt-8 lg:px-10">
        <PageHeader title="Estadísticas" actions={reportsOn && <Button variant="secondary" onClick={() => { printReport(`Estadísticas · ${team.name}`, header, rows()); downloadCsv('estadisticas.csv', header, rows()) }}>Exportar PDF / CSV</Button>} />
        {error && <Notice tone="danger" icon={Info}>{error}</Notice>}
        <PeriodControls mode={mode} onMode={setMode} anchor={anchor} onAnchor={setAnchor} year={year} onYear={setYear} years={yearsFor(isPro, currentYear)} />
        {!isPro && <p className="text-[13px] text-[var(--ax-muted)]">Plan {usage?.plan}: estadísticas del año actual. Los años anteriores son de Pro.</p>}
        <div className="flex flex-wrap items-end gap-3">
          <Chip tone="accent">{`Periodo · ${range.from} – ${range.to}`}</Chip>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([['Partidos jugados', summary?.jugados], ['Ganados', summary?.ganados], ['Empatados', summary?.empatados], ['Perdidos', summary?.perdidos]] as const).map(([label, value]) => (
            <div key={label} className="rounded-[20px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-[var(--ax-muted)]">{label}</p>
              <p className="mt-1.5 font-display text-[36px] leading-none">{locked ? '—' : value ?? '—'}</p>
            </div>
          ))}
        </div>
        <Card>
          <CardHeader id="jugadores" title="Estadísticas por jugador" />
          {locked ? <div className="mt-4"><LockedFeature label="Estadísticas de años anteriores" /></div>
            : !stats || stats.players.length === 0 ? <p className="mt-4 text-sm text-[var(--ax-muted)]">Todavía no hay partidos finalizados en este periodo.</p> : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead><tr className="border-b border-[var(--ax-line)] text-[11px] uppercase tracking-[.12em] text-[var(--ax-muted)]">{header.map((h) => <th key={h} className="py-3 pr-3 font-semibold">{h}</th>)}</tr></thead>
                <tbody>{stats.players.map((p) => (
                  <tr key={p.nombre} className="border-b border-[var(--ax-line)] last:border-0">
                    <td className="py-3 pr-3 font-semibold">{p.nombre}</td><td className="py-3 pr-3 text-[var(--ax-text-secondary)]">{p.posicion}</td>
                    <td className="py-3 pr-3 tabular-nums">{p.partidos}</td><td className="py-3 pr-3 tabular-nums">{p.anotaciones}</td><td className="py-3 pr-3 tabular-nums">{p.puntos}</td><td className="py-3 pr-3 tabular-nums">{p.tarjetas}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
        <Card className="flex flex-col gap-3.5">
          <CardHeader id="comparar" title="Comparar años" />
          {!isPro ? <LockedFeature label="Comparar años y rendimiento" /> : years.length === 0 ? <p className="text-sm text-[var(--ax-muted)]">Todavía no hay años con partidos finalizados.</p> : years.map((s) => (
            <LimitMeter key={s.temporada} label={`${s.temporada} · ${s.ganados} de ${s.jugados} ganados`} used={s.jugados ? Math.round((100 * s.ganados) / s.jugados) : 0} limit={100} />
          ))}
        </Card>
        <Card className="flex flex-col gap-3">
          <CardHeader id="reportes" title="Reportes" />
          {!reportsOn ? <LockedFeature label="Reportes de plantilla y estadísticas en PDF y CSV" /> : (
            <div className="flex flex-wrap gap-2.5"><Button variant="secondary" onClick={() => printReport(`Estadísticas · ${team.name}`, header, rows())}>Descargar PDF</Button><Button variant="secondary" onClick={() => downloadCsv('estadisticas.csv', header, rows())}>Descargar CSV</Button></div>
          )}
        </Card>
      </div>
    </main>
  )
}

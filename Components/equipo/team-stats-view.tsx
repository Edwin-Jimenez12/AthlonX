'use client'

import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button, Card, CardHeader, FieldLabel, Notice, PageHeader, inputClass } from '../mi-equipo/ui'
import { Chip, LimitMeter, LockedFeature, downloadCsv, printReport } from '../organizacion/plan-ui'
import { shortDate } from './finance-shared'
import { teamFlag, type ActiveTeam } from './team-plan'

type SeasonStats = {
  from: string
  to: string
  summary: { jugados: number; ganados: number; empatados: number; perdidos: number }
  players: Array<{ nombre: string; posicion: string; partidos: number; anotaciones: number; puntos: number; tarjetas: number }>
}

// Estadísticas del equipo (diseño de Figma: Equipo · Free/Pro/Élite · Estadísticas).
export function TeamStatsView({ ctx }: { ctx: ActiveTeam }) {
  const team = ctx.team!
  const usage = ctx.usage
  const compareOn = teamFlag(usage, 'comparar_temporadas')
  const reportsOn = teamFlag(usage, 'reportes')
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const [stats, setStats] = useState<SeasonStats | null>(null)
  const [seasons, setSeasons] = useState<Array<{ temporada: number; jugados: number; ganados: number }>>([])
  const [error, setError] = useState('')

  useEffect(() => { if (usage?.season && !range) setRange({ from: usage.season.starts_on, to: usage.season.ends_on }) }, [usage, range])

  useEffect(() => {
    if (!supabase || !range) return
    supabase.rpc('team_season_stats', { p_team: team.id, p_from: range.from, p_to: range.to }).then(({ data, error: e }) => {
      if (e) setError(e.message); else setStats(data as SeasonStats)
    })
  }, [team.id, range])

  useEffect(() => {
    if (!supabase || !compareOn) return
    supabase.rpc('team_compare_seasons', { p_team: team.id }).then(({ data }) => setSeasons((data ?? []) as typeof seasons))
  }, [team.id, compareOn])

  const header = ['Jugador', 'Posición', 'Partidos', 'Anotaciones', 'Puntos', 'Tarjetas']
  const rows = () => (stats?.players ?? []).map((p) => [p.nombre, p.posicion, p.partidos, p.anotaciones, p.puntos, p.tarjetas])

  return (
    <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
      <div className="mx-auto max-w-[1184px] space-y-5 px-4 pb-16 pt-5 sm:space-y-6 sm:px-8 sm:pt-8 lg:px-10">
        <PageHeader title="Estadísticas" actions={reportsOn && <Button variant="secondary" onClick={() => { printReport(`Estadísticas · ${team.name}`, header, rows()); downloadCsv('estadisticas.csv', header, rows()) }}>Exportar PDF / CSV</Button>} />
        {error && <Notice tone="danger" icon={Info}>{error}</Notice>}
        <div className="flex flex-wrap items-end gap-3">
          <Chip tone="accent">{stats ? `Temporada · ${shortDate(stats.from)} – ${shortDate(stats.to)}` : 'Temporada'}</Chip>
          {compareOn && range ? (
            <>
              <label className="block"><FieldLabel>Desde</FieldLabel><input type="date" className={`${inputClass} w-auto`} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
              <label className="block"><FieldLabel>Hasta</FieldLabel><input type="date" className={`${inputClass} w-auto`} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
            </>
          ) : <span className="text-[13px] text-[var(--ax-muted)]">La temporada se define en Mi perfil › Configuración.</span>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([['Partidos jugados', stats?.summary.jugados], ['Ganados', stats?.summary.ganados], ['Empatados', stats?.summary.empatados], ['Perdidos', stats?.summary.perdidos]] as const).map(([label, value]) => (
            <div key={label} className="rounded-[20px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-[var(--ax-muted)]">{label}</p>
              <p className="mt-1.5 font-display text-[36px] leading-none">{value ?? '—'}</p>
            </div>
          ))}
        </div>
        <Card>
          <CardHeader id="jugadores" title="Estadísticas por jugador" />
          {!stats || stats.players.length === 0 ? <p className="mt-4 text-sm text-[var(--ax-muted)]">Todavía no hay partidos finalizados en este periodo.</p> : (
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
          {!compareOn && <p className="mt-4 text-xs text-[var(--ax-muted)]">Plan {usage?.plan}: estadísticas de la temporada actual.</p>}
        </Card>
        <Card className="flex flex-col gap-3.5">
          <CardHeader id="comparar" title="Comparar temporadas" />
            {!compareOn ? <LockedFeature label="Comparar temporadas y rendimiento" /> : seasons.length === 0 ? <p className="text-sm text-[var(--ax-muted)]">Todavía no hay temporadas con partidos finalizados.</p> : seasons.map((s) => (
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

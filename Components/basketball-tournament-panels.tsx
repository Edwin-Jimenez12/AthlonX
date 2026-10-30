'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { basketball, BasketballBracketMatch, BasketballEventType, BasketballMatch, BasketballSettings, BasketballStage, BasketballSummaryGame, BasketballTeam, basketballCanFinish, basketballChampionId, basketballElapsed, basketballFeatured, basketballRecent, basketballSchedule, basketballShuffle, basketballStandings, basketballSummaryGames, basketballUpcoming, validateBasketballSettings } from '../lib/basketball'
import { clockText, phaseSteps, sportClocks } from '../lib/match-clock'
import { supabase } from '../lib/supabase'
import { PhaseBar } from './match-clock-ui'

type Player = { player_id: string; full_name: string; is_substitute: boolean }
type Team = BasketballTeam & { roster: Player[] }
type Game = BasketballMatch & { fixture_id: string }
type MatchEvent = { id: string; match_id: string; team_id: string; player_id: string | null; event_type: BasketballEventType; points: number; is_corrected: boolean; correction_reason?: string; match_second: number }
type Lineup = { fixture_id: string; team_id: string; player_id: string; is_substitute: boolean }
type Data = { settings: BasketballSettings; can_manage: boolean; teams: Team[]; matches: Game[]; stages: BasketballStage[]; bracket: BasketballBracketMatch[]; events: MatchEvent[]; lineups: Lineup[] }
type Run = (name: string, args: Record<string, unknown>) => Promise<boolean>
type Section = 'resumen' | 'equipos' | 'llaves' | 'fixtures' | 'partidos' | 'tablas' | 'general'
const panel = 'mt-6 rounded-xl border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-6'
const input = 'mt-2 w-full rounded-lg border border-[#31556b] bg-[#07131e] px-3 py-3 text-sm text-white outline-none focus:border-[#b4ff45]'
const button = 'cursor-pointer rounded-lg bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-40'
const secondary = 'cursor-pointer rounded-lg border border-[#31556b] px-4 py-3 text-sm font-bold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40'
const eventLabels: Record<BasketballEventType, string> = { basket_inside: 'Dentro del arco · +1', basket_outside: 'Fuera del arco · +2', basket_free_throw: 'Tiro libre · +1', basket_foul: 'Falta manual' }
const escape = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

function printReport(data: Data, name: string) {
  const target = window.open('', '_blank', 'width=1100,height=850')
  if (!target) return false
  const team = (id: string | null) => data.teams.find(t => t.id === id)?.name || 'Por definir'
  const rows = basketballSchedule(data.settings).map(slot => {
    const stage = data.stages.find(s => s.round_number === slot.round)
    const b = data.bracket.find(b => b.stage_id === stage?.id && b.position === slot.position)
    const m = data.matches.find(m => m.id === b?.source_match_id)
    return `<tr><td>${escape(slot.name)}</td><td>${escape(slot.time)}</td><td>${escape(team(b?.local_team_id))}</td><td>${m && m.status !== 'scheduled' ? `${m.local_score} – ${m.visitor_score}` : '—'}</td><td>${escape(team(b?.visitor_team_id))}</td></tr>`
  }).join('')
  const standings = basketballStandings(data.teams, data.stages, data.bracket).map(t => `<tr><td>${t.rank ?? '—'}</td><td>${escape(t.name)}</td><td>${escape(t.label)}</td></tr>`).join('')
  const rosters = data.teams.map(t => `<tr><td>${escape(t.name)}</td><td>${escape(t.colors)}</td><td>${escape(t.roster.map(p => p.full_name).join(', '))}</td></tr>`).join('')
  const events = data.events.filter(e => !e.is_corrected)
  target.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escape(name)} · Reporte 3x3</title><style>@page{size:A4 landscape;margin:15mm}body{font:12px Arial;color:#102030}h1{font-size:26px}table{width:100%;border-collapse:collapse;margin:16px 0 24px}th,td{border:1px solid #aabbcc;padding:8px;text-align:left}thead{display:table-header-group}tr{break-inside:avoid}h2{break-after:avoid}.note{color:#506070}</style></head><body><h1>${escape(name)}</h1><p>AthlonX · Baloncesto 3x3 · ${escape(data.settings.venue)}</p><p>Periodo: ${data.settings.period_minutes} min · Intervalo: ${data.settings.interval_minutes} min · Bloque de prórroga: ${data.settings.overtime_minutes} min · Una cancha</p><p class="note">Prórrogas hasta una ventaja de 2 puntos. Los horarios son estimados. Sin partido por el tercer lugar.</p><h2>Equipos y plantillas</h2><table><thead><tr><th>Equipo</th><th>Colores</th><th>Jugadores</th></tr></thead><tbody>${rosters}</tbody></table><h2>Fixture y resultados</h2><table><thead><tr><th>Ronda</th><th>Hora</th><th>Local</th><th>Marcador</th><th>Visitante</th></tr></thead><tbody>${rows}</tbody></table><h2>Clasificación por ronda alcanzada</h2><p>Las posiciones compartidas se muestran sin desempate adicional.</p><table><thead><tr><th>Posición</th><th>Equipo</th><th>Estado</th></tr></thead><tbody>${standings}</tbody></table><h2>Actividad registrada</h2><p>Canastas interiores: ${events.filter(e => e.event_type === 'basket_inside').length} · Exteriores: ${events.filter(e => e.event_type === 'basket_outside').length} · Tiros libres: ${events.filter(e => e.event_type === 'basket_free_throw').length} · Faltas manuales: ${events.filter(e => e.event_type === 'basket_foul').length}</p><script>window.onload=()=>window.print()</script></body></html>`)
  target.document.close()
  return true
}

export function BasketballTournamentPanels({ tournamentId, tournamentName, section, canManage, drawMode, organizerName, isQuick }: { tournamentId: string; tournamentName: string; section: Section; canManage: boolean; drawMode?: 'automatic' | 'manual'; organizerName?: string; isQuick?: boolean }) {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const busy = useRef(false), serial = useRef(0), mounted = useRef(true)
  const load = useCallback(async () => {
    const seq = ++serial.current
    if (!supabase) { setError('La conexión de torneos no está disponible.'); return false }
    try {
      const { data, error } = await supabase.rpc('get_basketball_tournament', { p_tournament_id: tournamentId })
      if (!mounted.current || seq !== serial.current) return false
      if (error) throw error
      setData(data as Data); setError(''); return true
    } catch (e) { if (mounted.current && seq === serial.current) setError((e as Error).message || 'No se pudo actualizar el torneo.'); return false }
  }, [tournamentId])
  useEffect(() => {
    mounted.current = true; setData(null); void load()
    const timer = window.setInterval(() => { if (!document.hidden && !busy.current) void load() }, 10000)
    return () => { mounted.current = false; serial.current++; window.clearInterval(timer) }
  }, [load])
  const run: Run = async (name, args) => {
    if (!supabase || busy.current) return false
    busy.current = true; serial.current++; setPending(true); setMessage('')
    try {
      const { error } = await supabase.rpc(name, args)
      if (error) throw error
      const fresh = await load()
      if (fresh) setMessage('Cambios guardados.')
      return fresh
    } catch (e) { setMessage((e as Error).message || 'No se pudo guardar.'); await load(); return false }
    finally { busy.current = false; if (mounted.current) setPending(false) }
  }
  if (!data) return <div className={panel}>{error ? <><p role="alert" className="text-red-200">{error}</p><button className={`${secondary} mt-4`} onClick={() => void load()}>Volver a intentar</button></> : <p className="text-slate-400">Cargando gestión 3x3…</p>}</div>
  const owner = canManage && data.can_manage
  const team = (id: string | null) => data.teams.find(t => t.id === id)?.name || 'Por definir'
  let slots: ReturnType<typeof basketballSchedule> = []
  try { slots = basketballSchedule(data.settings) } catch { /* Configuración inválida visible en Información general. */ }
  return <div className="space-y-5">
    <div className="mt-5 flex flex-wrap justify-end gap-3"><button onClick={() => void load()} disabled={pending} className={secondary}>Actualizar</button><button onClick={() => { if (!printReport(data, tournamentName)) setMessage('Permite las ventanas emergentes para imprimir el reporte.') }} className={secondary}>Imprimir / guardar PDF</button></div>
    {error && <p role="alert" className="rounded-lg border border-red-400/30 p-4 text-sm text-red-200">{error} Los datos visibles pueden estar desactualizados.</p>}
    {message && <p role="status" aria-live="polite" className="rounded-lg border border-[#b4ff45]/30 p-4 text-sm text-slate-200">{message}</p>}
    {section === 'resumen' && <BasketballSummary data={data} organizerName={organizerName} isQuick={isQuick} />}
    {section === 'general' && <SettingsEditor settings={data.settings} locked={data.stages.length > 0} canManage={owner} pending={pending} run={run} tournamentId={tournamentId} />}
    {section === 'equipos' && <section className={panel}><h2 className="font-heading text-2xl font-bold">Colores y límites de plantilla 3x3</h2><p className="mt-2 text-sm leading-6 text-slate-400">Gestiona los equipos y jugadores con los controles habituales de esta pestaña. Antes de publicar el cuadro, cada equipo necesita de 3 a 6 jugadores y colores distintivos.</p><div className="mt-5 grid gap-4 md:grid-cols-2">{data.teams.map(t => <TeamColors key={`${t.id}:${t.colors}`} team={t} owner={owner} pending={pending} run={run} tournamentId={tournamentId} />)}</div></section>}
    {section === 'llaves' && <BasketballDraw data={data} owner={owner} pending={pending || Boolean(error)} run={run} tournamentId={tournamentId} mode={drawMode} />}
    {section === 'tablas' && <section className={panel}><h2 className="font-heading text-3xl font-bold">Clasificación por ronda alcanzada</h2><p className="mt-3 text-sm text-slate-400">Sin tercer lugar ni desempates entre eliminados en una misma ronda. El orden alfabético solo facilita la lectura de las posiciones compartidas.</p><div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-400"><tr><th className="p-3">Posición</th><th>Equipo</th><th>Estado</th></tr></thead><tbody>{basketballStandings(data.teams, data.stages, data.bracket).map(t => <tr key={t.id} className="border-t border-white/10"><td className="p-3 font-bold text-[#b4ff45]">{t.rank ? `${t.rank}.º` : '—'}</td><td>{t.name}</td><td>{t.label}</td></tr>)}</tbody></table></div></section>}
    {section === 'fixtures' && <section className={panel}><h2 className="font-heading text-3xl font-bold">Fixture de la jornada</h2><p className="mt-3 text-sm text-slate-400">{data.settings.opens_at.slice(0, 5)}–{data.settings.closes_at.slice(0, 5)} · {data.settings.venue}. Los horarios estimados pueden desplazarse por pausas y prórrogas.</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="text-xs uppercase text-slate-400"><tr><th className="p-3">Ronda</th><th>Hora</th><th>Local</th><th>Resultado</th><th>Visitante</th></tr></thead><tbody>{slots.map(slot => {
      const st = data.stages.find(s => s.round_number === slot.round), b = data.bracket.find(b => b.stage_id === st?.id && b.position === slot.position), m = data.matches.find(m => m.id === b?.source_match_id)
      return <tr key={`${slot.round}:${slot.position}`} className="border-t border-white/10"><td className="p-3">{slot.name} · {slot.position}</td><td>{slot.time}</td><td>{team(b?.local_team_id)}</td><td className="font-bold text-[#b4ff45]">{m && m.status !== 'scheduled' ? `${m.local_score} – ${m.visitor_score}` : '—'}</td><td>{team(b?.visitor_team_id)}</td></tr>
    })}</tbody></table></div></section>}
    {section === 'partidos' && <div className="space-y-5"><p className="text-sm leading-6 text-slate-400">Arco: línea de dos puntos que separa la zona interior de la exterior. Dentro del arco: 1 punto. Fuera del arco: 2 puntos. Tiro libre: 1 punto. Las faltas se registran manualmente y no generan sanciones automáticas.</p>{data.matches.map(m => <BasketballGame key={m.id} match={m} data={data} owner={owner} pending={pending || Boolean(error)} run={run} />)}{!data.matches.length && <p className="py-6 text-slate-400">Publica el cuadro desde Llaves para crear los partidos.</p>}</div>}
  </div>
}

function BasketballSummary({ data, organizerName, isQuick }: { data: Data; organizerName?: string; isQuick?: boolean }) {
  let slots: ReturnType<typeof basketballSchedule> = []
  try { slots = basketballSchedule(data.settings) } catch { /* Configuración inválida visible en Información general. */ }
  const name = (id: string | null) => data.teams.find(t => t.id === id)?.name || 'Por definir'
  const games = basketballSummaryGames(slots, data.stages, data.bracket, data.matches)
  const championId = basketballChampionId(data.stages, data.bracket)
  const featured = basketballFeatured(games)
  const upcoming = basketballUpcoming(games)
  const recent = basketballRecent(games)
  const finishedCount = data.matches.filter(m => m.status === 'finished').length
  const score = (g: BasketballSummaryGame, side: 'local' | 'visitor') => g.match.status === 'scheduled' ? '–' : String(side === 'local' ? g.match.local_score : g.match.visitor_score)
  const facts: [string, string][] = [
    ['Tipo', isQuick ? 'Torneo rápido · equipos creados aquí' : 'Oficial · solo por invitación'],
    ['Organiza', organizerName || 'Torneo independiente'],
    ['Disciplina', 'Baloncesto · 3x3'],
    ['Sede y horario', `${data.settings.venue} · ${data.settings.opens_at.slice(0, 5)}–${data.settings.closes_at.slice(0, 5)}`],
    ['Periodo', `${data.settings.period_minutes} min · intervalo ${data.settings.interval_minutes} min · prórroga de ${data.settings.overtime_minutes} min`],
    ['Participación', `${data.teams.length}/16 equipos · ${finishedCount}/15 partidos`],
  ]
  const GameList = ({ title, rows, empty }: { title: string; rows: BasketballSummaryGame[]; empty: string }) => <section className={panel}>
    <h2 className="font-heading text-2xl font-bold">{title}</h2>
    {rows.length ? <ul className="mt-3 divide-y divide-white/10">{rows.map(g => <li key={`${g.round}:${g.position}`} className="flex items-center gap-3 py-2.5 text-sm">
      <span className="w-14 shrink-0 text-slate-400">{g.time || '—'}</span>
      <span className="min-w-0 flex-1 truncate text-right font-semibold">{name(g.localId)}</span>
      <span className="w-14 shrink-0 text-center font-bold text-[#b4ff45]">{g.match.status === 'scheduled' ? 'vs' : `${g.match.local_score} – ${g.match.visitor_score}`}</span>
      <span className="min-w-0 flex-1 truncate font-semibold">{name(g.visitorId)}</span>
    </li>)}</ul> : <p className="mt-3 text-sm text-slate-400">{empty}</p>}
  </section>
  return <div className="space-y-5">
    {championId
      ? <section className="rounded-xl border border-[#b4ff45]/40 bg-[#0b1d2c] p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-widest text-[#b4ff45]">Campeón</p><p className="mt-2 font-heading text-4xl font-bold">{name(championId)}</p></section>
      : featured
        ? <section className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-widest text-[#b4ff45]">{featured.stageName} · {featured.time || 'Hora por definir'}</p><span className="text-xs text-slate-400">{featured.match.status === 'live' ? 'En juego' : featured.match.status === 'finished' ? 'Final' : 'Programado'}</span></div>
          {[{ id: featured.localId, side: 'local' as const }, { id: featured.visitorId, side: 'visitor' as const }].map(row => <div key={row.side} className="mt-4 flex items-center justify-between gap-3"><span className="font-heading text-2xl font-bold">{name(row.id)}</span><strong className="font-display text-4xl text-[#b4ff45]">{score(featured, row.side)}</strong></div>)}
          <PhaseBar steps={phaseSteps(sportClocks.basketball, { status: featured.match.status, period: featured.match.match_phase === 'extra_time' ? 'extra_first_half' : 'first_half', matchPhase: featured.match.match_phase === 'extra_time' ? 'extra_time' : 'regular', isPaused: featured.match.is_paused })} />
        </section>
        : <section className={panel}><h2 className="font-heading text-2xl font-bold">Aún no hay partidos</h2><p className="mt-3 text-sm text-slate-400">Publica el cuadro desde la pestaña Llaves para crear los partidos.</p></section>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      <div className="space-y-5">
        <GameList title="Próximos partidos" rows={upcoming} empty="No hay partidos programados." />
        <GameList title="Últimos resultados" rows={recent} empty="Todavía no hay resultados." />
      </div>
      <section className={panel}>
        <h2 className="font-heading text-2xl font-bold">Datos del torneo</h2>
        <dl className="mt-3 divide-y divide-white/10">{facts.map(([label, value]) => <div key={label} className="py-2.5"><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-0.5 text-sm font-medium">{value}</dd></div>)}</dl>
      </section>
    </div>
  </div>
}

function TeamColors({ team, owner, pending, run, tournamentId }:{ team: Team; owner: boolean; pending: boolean; run: Run; tournamentId: string }) {
  const [colors, setColors] = useState(team.colors || '')
  return <form onSubmit={e => { e.preventDefault(); void run('set_basketball_team_colors', { p_tournament_id: tournamentId, p_team_id: team.id, p_colors: colors }) }} className="rounded-lg border border-[#31556b] p-4"><h3 className="font-bold">{team.name}</h3><p className={`mt-2 text-sm ${team.roster.length >= 3 && team.roster.length <= 6 ? 'text-[#b4ff45]' : 'text-orange-200'}`}>{team.roster.length}/6 jugadores · mínimo 3</p>{owner ? <><label className="mt-3 block text-sm">Colores distintivos<input required maxLength={80} value={colors} onChange={e => setColors(e.target.value)} className={input} /></label><button disabled={pending || !colors.trim()} className={`${secondary} mt-3`}>Guardar colores</button></> : <p className="mt-3 text-sm text-slate-400">{team.colors || 'Colores pendientes'}</p>}</form>
}

function SettingsEditor({ settings, locked, canManage, pending, run, tournamentId }: { settings: BasketballSettings; locked: boolean; canManage: boolean; pending: boolean; run: Run; tournamentId: string }) {
  const [s, set] = useState(settings)
  const [error, setError] = useState('')
  async function save(e: FormEvent) { e.preventDefault(); const issue = validateBasketballSettings(s); setError(issue); if (!issue) await run('save_basketball_settings', { p_tournament_id: tournamentId, p_settings: s }) }
  return <form onSubmit={save} className={panel}><h2 className="font-heading text-2xl font-bold">Configuración deportiva 3x3</h2><p className="mt-3 text-sm text-slate-400">{locked ? 'Los tiempos quedaron bloqueados al publicar el cuadro.' : 'El fixture y el reloj usan estos valores del torneo.'}</p><fieldset disabled={!canManage || locked || pending} className="mt-5 grid gap-4 sm:grid-cols-2">{[['period_minutes', 'Minutos del periodo', 1], ['interval_minutes', 'Intervalo entre partidos', 0], ['overtime_minutes', 'Minutos por bloque de prórroga', 1]].map(([key, label, min]) => <label key={key} className="text-sm font-semibold">{label}<input type="number" required min={min} max="120" value={s[key as keyof BasketballSettings] ?? ''} onChange={e => set({ ...s, [key]: Number(e.target.value) })} className={input} /></label>)}<label className="text-sm font-semibold">Sede<input required value={s.venue} onChange={e => set({ ...s, venue: e.target.value })} className={input} /></label>{[['opens_at', 'Inicio de la jornada'], ['closes_at', 'Cierre de la jornada']].map(([key, label]) => <label key={key} className="text-sm font-semibold">{label}<input required type="time" value={s[key].slice(0, 5)} onChange={e => set({ ...s, [key]: e.target.value })} className={input} /></label>)}<p className="text-xs leading-5 text-slate-400 sm:col-span-2">Si se agota una prórroga sin dos puntos de ventaja, continúa otro bloque de igual duración. No hay tandas de penales ni sanciones automáticas.</p>{canManage && <button disabled={locked || pending} className={button}>Guardar configuración 3x3</button>}</fieldset>{error && <p role="alert" className="mt-4 text-sm text-red-200">{error}</p>}</form>
}

function BasketballDraw({ data, owner, pending, run, tournamentId, mode }: { data: Data; owner: boolean; pending: boolean; run: Run; tournamentId: string; mode?: 'automatic' | 'manual' }) {
  const [ids, setIds] = useState<string[]>([])
  // En modo manual los cruces parten del orden de inscripción y se ajustan a mano.
  const teamKey = data.teams.map(t => t.id).join(',')
  useEffect(() => { const teamIds = teamKey ? teamKey.split(',') : []; setIds(mode === 'manual' && teamIds.length === 16 ? teamIds : []) }, [mode, teamKey])
  const published = data.stages.length > 0
  const eligible = data.teams.length === 16 && data.teams.every(t => t.colors?.trim() && t.roster.length >= 3 && t.roster.length <= 6)
  const name = (id: string | null) => data.teams.find(t => t.id === id)?.name || 'Por definir'
  function swap(index: number, value: string) { setIds(current => { const copy = [...current], other = copy.indexOf(value); if (other < 0) return copy; [copy[index], copy[other]] = [copy[other], copy[index]]; return copy }) }
  return <section className={panel}><h2 className="font-heading text-3xl font-bold">Cuadro de eliminación directa</h2>{!published ? <><p className="mt-3 text-sm leading-6 text-slate-400">Sortea los 16 equipos y ajusta los octavos antes de publicar. Al elegir un equipo en otro cruce, ambos intercambian su posición. Publicar cierra los ajustes del cuadro y sus plantillas.</p>{owner && <div className="mt-5 space-y-5">{mode !== 'manual' && <button disabled={pending || data.teams.length !== 16} onClick={() => setIds(basketballShuffle(data.teams.map(t => t.id)))} className={secondary}>Sortear 16 equipos{ids.length ? ' de nuevo' : ''}</button>}{mode === 'manual' && data.teams.length !== 16 && <p className="text-sm text-orange-200">Se necesitan 16 equipos inscritos para armar los cruces.</p>}{!eligible && <p className="text-sm text-orange-200">Completa 16 equipos, colores distintivos y plantillas de 3 a 6 jugadores antes de publicar.</p>}{ids.length === 16 && <><div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 8 }, (_, i) => <div key={i} className="rounded-lg border border-[#31556b] p-4"><p className="text-xs font-bold text-[#b4ff45]">Octavos · Partido {i + 1}</p>{[i * 2, i * 2 + 1].map(index => <label key={index} className="mt-2 block text-xs text-slate-400">{index % 2 ? 'Visitante' : 'Local'}<select disabled={pending} className={input} value={ids[index]} onChange={e => swap(index, e.target.value)}>{data.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>)}</div>)}</div><button disabled={pending || !eligible} onClick={() => void run('publish_basketball_bracket', { p_tournament_id: tournamentId, p_team_ids: ids })} className={button}>Publicar cuadro y generar fixture</button></>}</div>}</> : <div className="mt-8 grid gap-4 overflow-x-auto pb-3 lg:grid-cols-4">{data.stages.map(s => <div key={s.id} className="min-w-[230px]"><h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#b4ff45]">{s.name}</h3><div className="space-y-3">{data.bracket.filter(b => b.stage_id === s.id).map(b => { const m = data.matches.find(m => m.id === b.source_match_id); const showScore = Boolean(m && (m.status === 'live' || m.status === 'finished')); return <article key={b.id} className="rounded-lg border border-[#31556b] bg-[#07131e] p-3 text-sm text-white">{[b.local_team_id, b.visitor_team_id].map((id, i) => <p key={i} className={`flex items-center justify-between gap-2 ${i ? 'my-1 border-t border-[#31556b] pt-1' : ''}`}><span className={id && b.winner_team_id === id ? 'font-bold text-[#b4ff45]' : ''}>{name(id)}</span>{showScore && m && <strong className="text-lg text-[#b4ff45]">{i === 0 ? m.local_score : m.visitor_score}</strong>}</p>)}{m && <p className="mt-2 text-xs text-slate-400">{m.scheduled_time?.slice(0, 5) || 'Hora por definir'}</p>}<span className="mt-2 inline-block text-xs text-slate-500">{m?.status === 'finished' ? 'Resuelto' : m?.status === 'live' ? 'En juego' : 'Pendiente'}</span></article>; })}</div></div>)}</div>}</section>
}

function BasketballGame({ match: m, data, owner, pending, run }: { match: Game; data: Data; owner: boolean; pending: boolean; run: Run }) {
  const [now, setNow] = useState(Date.now()), [players, setPlayers] = useState<Record<string, string>>({})
  const [out, setOut] = useState<Record<string, string>>({}), [incoming, setIncoming] = useState<Record<string, string>>({})
  const [correction, setCorrection] = useState(''), [reason, setReason] = useState('')
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const elapsed = basketballElapsed(m, now), extra = m.match_phase === 'extra_time', limit = (extra ? data.settings.overtime_minutes : data.settings.period_minutes) * 60
  const block = extra ? Math.floor(elapsed / limit) + 1 : 1
  const seconds = extra ? limit - elapsed % limit : Math.max(0, limit - elapsed)
  const live = m.status === 'live' && !m.is_paused && (extra || elapsed < limit), finished = m.status === 'finished'
  const events = data.events.filter(e => e.match_id === m.id)
  const action = (p_action: string, args = {}) => run('basketball_match_action', { p_match_id: m.id, p_version: m.basketball_version, p_action, ...args })
  return <article className={panel}><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-widest text-[#b4ff45]">{m.scheduled_time?.slice(0, 5)} · {finished ? 'Resultado bloqueado' : extra ? `Prórroga · Bloque ${block}` : 'Periodo único'}</p><p className="font-mono text-3xl">{clockText(seconds)} <span className="text-xs text-slate-400">{finished ? 'Final' : live ? 'En juego' : 'Detenido'}</span></p></div>
    <PhaseBar steps={phaseSteps(sportClocks.basketball, { status: m.status, period: extra ? 'extra_first_half' : 'first_half', matchPhase: extra ? 'extra_time' : 'regular', isPaused: m.is_paused })} />
    <div className="mt-5 grid gap-4 sm:grid-cols-2">{[m.local_team_id, m.visitor_team_id].map((id, index) => {
      const t = data.teams.find(t => t.id === id), lineup = data.lineups.filter(p => p.fixture_id === m.fixture_id && p.team_id === id)
      const starters = t?.roster.filter(p => lineup.some(l => l.player_id === p.player_id && !l.is_substitute)) || [], bench = t?.roster.filter(p => lineup.some(l => l.player_id === p.player_id && l.is_substitute)) || []
      return <section key={id} className="rounded-lg border border-[#31556b] bg-[#07131e] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-heading text-2xl font-bold">{t?.name}</h3><p className="mt-2 text-xs text-slate-400">{t?.colors}</p></div><strong className="font-display text-5xl text-[#b4ff45]">{index ? m.visitor_score : m.local_score}</strong></div><p className="mt-3 text-xs text-slate-400">Faltas: {events.filter(e => e.team_id === id && e.event_type === 'basket_foul' && !e.is_corrected).length}</p>{lineup.length > 0 && <p className="mt-3 text-xs leading-5 text-slate-400">En cancha: {starters.map(p => p.full_name).join(', ')}<br />Suplentes: {bench.map(p => p.full_name).join(', ') || 'Sin suplentes'}</p>}
        {owner && !finished && <><label className="mt-4 block text-xs">Jugador (opcional para eventos de equipo)<select value={players[id] || ''} disabled={pending} onChange={e => setPlayers(p => ({ ...p, [id]: e.target.value }))} className={input}><option value="">Evento del equipo</option>{t?.roster.map(p => <option key={p.player_id} value={p.player_id}>{p.full_name}</option>)}</select></label><div className="mt-3 grid grid-cols-2 gap-2">{(Object.keys(eventLabels) as BasketballEventType[]).map(type => <button key={type} disabled={pending || !live} className={type === 'basket_foul' ? secondary : button} onClick={() => void action('event', { p_team_id: id, p_event_type: type, p_player_id: players[id] || null })}>{eventLabels[type]}</button>)}</div>{m.status === 'live' && m.is_paused && bench.length > 0 && <div className="mt-5 border-t border-white/10 pt-4"><p className="text-xs font-bold">Sustitución durante la pausa</p><label className="mt-2 block text-xs">Sale<select className={input} value={out[id] || ''} onChange={e => setOut(p => ({ ...p, [id]: e.target.value }))}><option value="">Jugador en cancha</option>{starters.map(p => <option key={p.player_id} value={p.player_id}>{p.full_name}</option>)}</select></label><label className="mt-2 block text-xs">Entra<select className={input} value={incoming[id] || ''} onChange={e => setIncoming(p => ({ ...p, [id]: e.target.value }))}><option value="">Suplente</option>{bench.map(p => <option key={p.player_id} value={p.player_id}>{p.full_name}</option>)}</select></label><button disabled={pending || !out[id] || !incoming[id]} onClick={async () => { if (await action('substitute', { p_team_id: id, p_player_id: out[id], p_player_in: incoming[id] })) { setOut(p => ({ ...p, [id]: '' })); setIncoming(p => ({ ...p, [id]: '' })) } }} className={`${secondary} mt-3`}>Aplicar sustitución</button></div>}</>}
      </section>
    })}</div>
    {owner && !finished && <div className="mt-5 flex flex-wrap gap-3"><button disabled={pending || (!extra && elapsed >= limit && m.is_paused)} onClick={() => void action(m.status === 'live' && !m.is_paused ? 'pause' : 'start')} className={secondary}>{m.status === 'live' && !m.is_paused ? 'Pausar reloj' : m.status === 'scheduled' ? 'Iniciar periodo' : 'Reanudar reloj'}</button>{!extra && elapsed >= limit && m.local_score === m.visitor_score && <button disabled={pending} onClick={() => void action('overtime')} className={button}>Preparar tiempo extra</button>}<button disabled={pending || !basketballCanFinish(m, data.settings, elapsed)} onClick={() => void action('finish')} className={button}>Confirmar resultado y avanzar</button></div>}
    {events.length > 0 && <details className="mt-5 border-t border-white/10 pt-4"><summary className="cursor-pointer text-sm font-bold">Eventos y correcciones ({events.length})</summary><ul className="mt-4 max-h-72 space-y-3 overflow-y-auto">{events.map(e => <li key={e.id} className={`rounded-lg bg-[#07131e] p-3 text-sm ${e.is_corrected ? 'text-slate-500' : 'text-slate-300'}`}><p>{data.teams.find(t => t.id === e.team_id)?.name} · {eventLabels[e.event_type] || e.event_type} · {Math.floor(e.match_second / 60)}:{String(e.match_second % 60).padStart(2, '0')}</p>{e.player_id && <p className="mt-1 text-xs">{data.teams.flatMap(t => t.roster).find(p => p.player_id === e.player_id)?.full_name}</p>}{e.is_corrected ? <p className="mt-1 text-xs">Corregido: {e.correction_reason}</p> : owner && !finished && <button onClick={() => { setCorrection(e.id); setReason('') }} className="mt-2 text-xs font-bold text-orange-200">Corregir con motivo</button>}</li>)}</ul>{correction && owner && !finished && <form onSubmit={async e => { e.preventDefault(); if (await action('correct', { p_event_id: correction, p_reason: reason })) setCorrection('') }} className="mt-4"><label className="text-sm">Motivo<input required className={input} value={reason} onChange={e => setReason(e.target.value)} /></label><div className="mt-3 flex gap-3"><button disabled={pending || !reason.trim()} className={secondary}>Confirmar corrección</button><button type="button" onClick={() => setCorrection('')} className={secondary}>Cancelar</button></div></form>}</details>}
  </article>
}

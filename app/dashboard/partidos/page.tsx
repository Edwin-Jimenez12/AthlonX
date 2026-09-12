'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CalendarDays, HeartPulse, MapPin, Brain, Square, FileDown, ChevronDown, ArrowRightLeft } from 'lucide-react'
import { categorias, jugadoresPartido, partidoActual, proximosPartidos } from '../../../simulaDatos'
import TournamentHeader from '../../../Components/tournament-header'

export default function MatchesPage() {
  const [selectedFixture, setSelectedFixture] = useState('Sáb, 14 Mar')
  const [activeRole, setActiveRole] = useState('espectador')

  useEffect(() => {
    const syncRole = (event: Event) => setActiveRole((event as CustomEvent<string>).detail)
    window.addEventListener('athlonx-role-change', syncRole)
    return () => window.removeEventListener('athlonx-role-change', syncRole)
  }, [])

  return (
    <>
    <main className="min-h-screen bg-[#f4f6f8] text-[#17212b] print:hidden lg:pl-64">
      <div className="mx-auto max-w-7xl px-6 pt-6 md:px-10"><TournamentHeader activeSection="Partidos" /></div>

      <section className="mx-auto max-w-7xl p-6 md:p-10">
        <div className="grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)_230px]"><PlayerList team="Cuervos" players={jugadoresPartido.Cuervos} activeRole={activeRole} /><LiveMatch /><PlayerList team="Titanes" players={jugadoresPartido.Titanes} activeRole={activeRole} /></div>

        <UpcomingMatches />
        <FixturesMenu selectedFixture={selectedFixture} onSelect={setSelectedFixture} />
      </section>
    </main>
    <PrintableFixtures selectedFixture={selectedFixture} />
    </>
  )
}

function LiveMatch() {
  const [completedChanges, setCompletedChanges] = useState<{ team: 'local' | 'visitante'; teamName: string; out: string; in: string }[]>([])

  useEffect(() => {
    const handleCompletedChange = (event: Event) => {
      const change = (event as CustomEvent<{ team: 'local' | 'visitante'; teamName: string; out: string; in: string }>).detail
      setCompletedChanges((current) => [...current, change])
    }
    window.addEventListener('athlonx-change-completed', handleCompletedChange)
    return () => window.removeEventListener('athlonx-change-completed', handleCompletedChange)
  }, [])

  const stats = [
    ['Tries', '2', '2'],
    ['Conversiones', '2', '1'],
    ['Penales', '2', '3'],
    ['Tarjetas amarillas', '1', '2'],
    ['Tarjetas rojas', '0', '0'],
    ['Cambios', String(5 + completedChanges.filter((change) => change.team === 'local').length), String(4 + completedChanges.filter((change) => change.team === 'visitante').length)],
  ]

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-[#081522] text-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <p className="font-heading text-sm uppercase tracking-[.25em] text-slate-400">Torneo Sevens</p>
          <h2 className="font-display text-3xl uppercase">Partido en vivo</h2>
        </div>
        <span className="rounded-full border border-[#70b719] px-3 py-1 text-sm font-bold text-[#B4FF45]">EN VIVO</span>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <TeamScore name={partidoActual.local} logo={partidoActual.localLogo} score={partidoActual.localPuntos} />
        <div className="text-center">
          <p className="text-4xl font-black">{partidoActual.tiempo}</p>
          <p className="text-sm text-slate-400">{partidoActual.periodo}</p>
        </div>
        <TeamScore name={partidoActual.visitante} logo={partidoActual.visitanteLogo} score={partidoActual.visitantePuntos} />
      </div>

      <div className="mx-5 mb-5 overflow-hidden rounded-xl border border-white/10">
        <div className="bg-[#10283a] p-3 text-center font-heading uppercase tracking-[.25em] text-slate-300">Estadísticas</div>
        <div className="grid grid-cols-[1fr_1.5fr_1fr] bg-white/5 px-4 py-3 text-center text-sm font-bold">
          <span>{partidoActual.local}</span><span /><span>{partidoActual.visitante}</span>
        </div>
        {stats.map(([label, localValue, visitorValue]) => (
          <div key={label} className="grid grid-cols-[1fr_1.5fr_1fr] border-t border-white/10 px-4 py-3 text-center">
            <strong>{localValue}</strong><span className="text-sm uppercase text-slate-400">{label}</span><strong>{visitorValue}</strong>
          </div>
        ))}
      </div>

      <div className="mx-5 mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-400">Indicadores de jugadores</p>
        <div className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-3">
          <span className="flex items-center gap-2"><Square size={15} fill="#facc15" className="text-yellow-500" /> Tarjeta amarilla</span>
          <span className="flex items-center gap-2"><HeartPulse size={16} className="text-red-500" /> Jugador lesionado</span>
          <span className="flex items-center gap-2"><Brain size={16} className="text-orange-500" /> Conmoción cerebral</span>
          <span className="flex items-center gap-2"><Square size={15} fill="#ef4444" className="text-red-500" /> Tarjeta roja</span>
        </div>
      </div>

      <div className="mx-5 mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-400">Cambios atendidos</p>
        {completedChanges.length === 0 ? <p className="mt-3 text-sm text-slate-400">No hay cambios confirmados todavía.</p> : <div className="mt-3 space-y-2">{completedChanges.map((change, index) => <p key={`${change.team}-${index}`} className="flex items-center gap-2 text-sm text-slate-200"><ArrowRightLeft size={15} className="text-[#B4FF45]" />{change.teamName}: sale <strong>{change.out}</strong> · entra <strong>{change.in}</strong></p>)}</div>}
      </div>

    </section>
  )
}

function PlayerList({ team, players, activeRole }: { team: string; players: { numero: number; nombre: string }[]; activeRole: string }) {
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null)
  const [pendingChange, setPendingChange] = useState<{ out: string; in: string } | null>(null)
  const [changes, setChanges] = useState<{ out: string; in: string }[]>([])
  const [staffAttending, setStaffAttending] = useState(false)
  const [indicatorByPlayer, setIndicatorByPlayer] = useState<Record<string, ('yellow' | 'red' | 'injured' | 'concussion')[]>>({})
  const [indicatorReasons, setIndicatorReasons] = useState<Record<string, string[]>>({})
  const [redCardPlayers, setRedCardPlayers] = useState<string[]>([])
  const statusByPlayer: Record<string, ('yellow' | 'red' | 'injured' | 'concussion')[]> = { 'Daniel Smith': ['yellow'], 'Carlos Martinez': ['injured'], 'Luis Taylor': ['concussion'] }
  const starters = players.slice(0, 3).filter((player) => !redCardPlayers.includes(player.nombre))
  const substitutes = [...players.slice(3), ...players.slice(0, 3).filter((player) => redCardPlayers.includes(player.nombre))]
  const confirmChange = () => { if (!pendingChange || activeRole !== 'directivo' || !staffAttending) return; setChanges((current) => [...current, pendingChange]); window.dispatchEvent(new CustomEvent('athlonx-change-completed', { detail: { team: team === 'Titanes' ? 'local' : 'visitante', teamName: team, out: pendingChange.out, in: pendingChange.in } })); setPendingChange(null); setStaffAttending(false) }
  return <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="font-display text-2xl uppercase">{team}</p><PlayerGroup title="En cancha" players={starters} substitutes={substitutes} statusByPlayer={statusByPlayer} indicatorByPlayer={indicatorByPlayer} indicatorReasons={indicatorReasons} onApplyIndicator={(player, indicator, reason) => { setIndicatorByPlayer((current) => ({ ...current, [player]: [...new Set([...(current[player] ?? []), indicator])] })); setIndicatorReasons((current) => ({ ...current, [player]: [...(current[player] ?? []), reason] })); if (indicator === 'red') setRedCardPlayers((current) => current.includes(player) ? current : [...current, player]) }} selectedPlayer={selectedPlayer} onSelect={setSelectedPlayer} activeRole={activeRole} onRequestChange={setPendingChange} changes={changes} /><PlayerGroup title="Suplentes" players={substitutes} substitutes={substitutes} statusByPlayer={statusByPlayer} indicatorByPlayer={indicatorByPlayer} indicatorReasons={indicatorReasons} onApplyIndicator={(player, indicator, reason) => { setIndicatorByPlayer((current) => ({ ...current, [player]: [...new Set([...(current[player] ?? []), indicator])] })); setIndicatorReasons((current) => ({ ...current, [player]: [...(current[player] ?? []), reason] })); if (indicator === 'red') setRedCardPlayers((current) => current.includes(player) ? current : [...current, player]) }} selectedPlayer={selectedPlayer} onSelect={setSelectedPlayer} activeRole={activeRole} onRequestChange={setPendingChange} changes={changes} />{changes.length > 0 && <div className="mt-5 border-t border-slate-200 pt-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Cambios realizados</p><div className="mt-2 space-y-2">{changes.map((change, index) => <p key={index} className="rounded-lg bg-[#e9fbd0] px-3 py-2 text-xs text-[#365e00]"><ArrowRightLeft size={13} className="mr-1 inline" />Sale {change.out} · entra {change.in}</p>)}</div></div>}{pendingChange && <div className="mt-4 rounded-xl border border-[#70b719] bg-[#f4f8ef] p-3"><p className="text-xs font-bold uppercase tracking-wider text-[#365e00]">{activeRole === 'directivo' ? 'Solicitud de cambio' : 'Solicitud enviada al staff'}</p><p className="mt-2 text-sm text-slate-700">Sale <strong>{pendingChange.out}</strong> y entra <strong>{pendingChange.in}</strong>.</p>{activeRole === 'directivo' && <button type="button" onClick={() => staffAttending ? confirmChange() : setStaffAttending(true)} className="mt-3 w-full rounded-md bg-[#081522] px-2 py-2 text-xs font-bold text-white">{staffAttending ? 'Confirmar cambio efectuado' : 'Atender solicitud'}</button>}<button type="button" onClick={() => { setPendingChange(null); setStaffAttending(false) }} className="mt-2 w-full rounded-md border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-600">{activeRole === 'directivo' ? 'Cancelar solicitud' : 'Cancelar cambio'}</button></div>}</aside>
}

function PlayerGroup({ title, players, substitutes, statusByPlayer, indicatorByPlayer, indicatorReasons, onApplyIndicator, selectedPlayer, onSelect, activeRole, onRequestChange, changes }: { title: string; players: { numero: number; nombre: string }[]; substitutes: { numero: number; nombre: string }[]; statusByPlayer: Record<string, ('yellow' | 'red' | 'injured' | 'concussion')[]>; indicatorByPlayer: Record<string, ('yellow' | 'red' | 'injured' | 'concussion')[]>; indicatorReasons: Record<string, string[]>; onApplyIndicator: (player: string, indicator: 'yellow' | 'red' | 'injured' | 'concussion', reason: string) => void; selectedPlayer: number | null; onSelect: (number: number | null) => void; activeRole: string; onRequestChange: (change: { out: string; in: string }) => void; changes: { out: string; in: string }[] }) {
  const [playerOut, setPlayerOut] = useState('')
  const [playerIn, setPlayerIn] = useState('')
  const [selectedIndicator, setSelectedIndicator] = useState<'yellow' | 'red' | 'injured' | 'concussion' | ''>('')
  const [indicatorReason, setIndicatorReason] = useState('')
  const isDirectivo = activeRole === 'directivo'
  const isEntrenador = activeRole === 'entrenador'
  return <div className="mt-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p><div className="mt-2 space-y-2">{players.map((player) => { const changedIn = changes.some((change) => change.in === player.nombre); const canRequest = isEntrenador && title === 'En cancha'; const statuses = [...(statusByPlayer[player.nombre] ?? []), ...(indicatorByPlayer[player.nombre] ?? [])]; return <div key={player.numero}><button type="button" onClick={() => { setPlayerOut(player.nombre); onSelect(selectedPlayer === player.numero ? null : player.numero) }} disabled={isEntrenador && !canRequest} className="flex w-full items-center gap-2 rounded-lg bg-slate-50 p-2 text-left hover:bg-[#e9fbd0] disabled:cursor-default"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e9fbd0] font-bold text-[#4c8500]">{player.numero}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{player.nombre}</span>{changedIn && <span className="text-xs font-bold text-[#4c8500]">CAMBIO</span>}<PlayerStatus statuses={statuses} /></button>{selectedPlayer === player.numero && <div className="rounded-b-lg border border-t-0 border-slate-200 bg-white p-2"><p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{isDirectivo ? 'Registrar indicador' : isEntrenador ? 'Solicitar cambio' : 'Información del jugador'}</p>{isDirectivo && <div className="space-y-2">{indicatorReasons[player.nombre]?.length > 0 && <div className="space-y-2"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Motivos registrados</p>{indicatorReasons[player.nombre].map((reason, index) => <div key={`${player.nombre}-${index}`} className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">{indicatorByPlayer[player.nombre]?.[index] === 'yellow' && <Square size={14} fill="#facc15" className="mt-0.5 shrink-0 text-yellow-500" />}{indicatorByPlayer[player.nombre]?.[index] === 'red' && <Square size={14} fill="#ef4444" className="mt-0.5 shrink-0 text-red-500" />}{indicatorByPlayer[player.nombre]?.[index] === 'injured' && <HeartPulse size={15} className="mt-0.5 shrink-0 text-red-500" />}{indicatorByPlayer[player.nombre]?.[index] === 'concussion' && <Brain size={15} className="mt-0.5 shrink-0 text-orange-500" />}<span>{reason}</span></div>)}</div>}<div className="grid grid-cols-2 gap-1 text-xs"><button type="button" onClick={() => setSelectedIndicator('yellow')} className="rounded-md p-2 text-left hover:bg-yellow-50"><Square size={13} fill="#facc15" className="mr-1 inline text-yellow-500" />Amarilla</button><button type="button" onClick={() => setSelectedIndicator('red')} className="rounded-md p-2 text-left hover:bg-red-50"><Square size={13} fill="#ef4444" className="mr-1 inline text-red-500" />Roja</button><button type="button" onClick={() => setSelectedIndicator('injured')} className="rounded-md p-2 text-left hover:bg-red-50"><HeartPulse size={14} className="mr-1 inline text-red-500" />Lesión</button><button type="button" onClick={() => setSelectedIndicator('concussion')} className="rounded-md p-2 text-left hover:bg-orange-50"><Brain size={14} className="mr-1 inline text-orange-500" />Conmoción</button></div>{selectedIndicator && <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Motivo</label><textarea value={indicatorReason} onChange={(event) => setIndicatorReason(event.target.value)} placeholder="Describe lo ocurrido" rows={3} className="mt-1 w-full resize-none rounded-md border border-slate-200 px-2 py-2 text-sm" /><button type="button" disabled={!indicatorReason.trim()} onClick={() => { onApplyIndicator(player.nombre, selectedIndicator, indicatorReason.trim()); setSelectedIndicator(''); setIndicatorReason('') }} className="mt-2 w-full rounded-md bg-[#081522] px-2 py-2 text-xs font-bold text-white disabled:opacity-40">Aplicar indicador</button></div>}</div>}{canRequest && <div className="space-y-2"><select value={playerOut} onChange={(event) => setPlayerOut(event.target.value)} className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"><option value="">Jugador que sale</option>{players.map((item) => <option key={item.numero} value={item.nombre}>{item.nombre}</option>)}</select><select value={playerIn} onChange={(event) => setPlayerIn(event.target.value)} className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"><option value="">Jugador suplente que entra</option>{substitutes.map((item) => <option key={item.numero} value={item.nombre}>{item.nombre}</option>)}</select><button type="button" disabled={!playerOut || !playerIn} onClick={() => onRequestChange({ out: playerOut, in: playerIn })} className="flex w-full items-center justify-center gap-1 rounded-md bg-[#081522] px-2 py-2 text-xs font-bold text-white disabled:opacity-40"><ArrowRightLeft size={13} /> Solicitar cambio</button></div>}{!isDirectivo && !isEntrenador && <p className="text-xs text-slate-500">Sin acciones disponibles para este rol.</p>}</div>}</div> })}</div></div>
}

function PlayerStatus({ statuses }: { statuses: ('yellow' | 'red' | 'injured' | 'concussion')[] }) {
  return <span className="flex shrink-0 items-center gap-1" aria-label="Estado del jugador">{statuses.includes('yellow') && <Square size={15} fill="#facc15" className="text-yellow-500" aria-label="Tarjeta amarilla" />}{statuses.includes('red') && <Square size={15} fill="#ef4444" className="text-red-500" aria-label="Tarjeta roja" />}{statuses.includes('injured') && <HeartPulse size={16} className="text-red-500" aria-label="Jugador lesionado" />}{statuses.includes('concussion') && <Brain size={16} className="text-orange-500" aria-label="Conmoción cerebral" />}</span>
}

function TeamScore({ name, logo, score }: { name: string; logo: string; score: number }) { return <div className="flex items-center justify-center gap-4"><TeamLogo src={logo} name={name} /><div><p className="text-lg font-bold">{name}</p><p className="text-5xl font-black text-[#B4FF45]">{score}</p></div></div> }
function TeamLogo({ src, name }: { src: string; name: string }) { return src ? <img src={src} alt={`Logo de ${name}`} className="h-16 w-16 object-contain" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-[#70b719]">{name.slice(0, 2).toUpperCase()}</span> }

function UpcomingMatches() { return <section className="mt-8"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-2xl font-bold">Próximos partidos</h2><p className="text-slate-500">Agenda de la siguiente jornada.</p></div><CalendarDays className="text-[#70b719]" /></div><div className="grid gap-4 lg:grid-cols-3">{proximosPartidos.map((match) => <article key={match.hora} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">PROGRAMADO</span><div className="mt-4 flex items-center justify-between gap-2"><TeamLogo src={match.localLogo} name={match.local} /><div className="text-center"><p className="font-bold">{match.hora}</p><p className="text-xs text-slate-500">{match.categoria}</p></div><TeamLogo src={match.visitanteLogo} name={match.visitante} /></div><div className="mt-4 flex items-center justify-between text-sm text-slate-500"><span><MapPin className="mr-1 inline" size={15} />Cancha principal</span><span>{match.fecha}</span></div><Link href="/dashboard/torneos/liga-panamena-rugby#fixture" className="mt-4 block w-full rounded-lg border border-[#70b719] px-4 py-2 text-center font-semibold text-[#4c8500] hover:bg-[#e9fbd0]">Ver en el cronograma · Próximamente</Link></article>)}</div></section> }

const fixtureDates = [
  { date: 'Sáb, 14 Mar', label: 'Fecha 1 · Actual', matches: proximosPartidos },
  { date: 'Sáb, 21 Mar', label: 'Fecha 2 · Adelantada', matches: proximosPartidos.slice(0, 2).map((match, index) => ({ ...match, hora: index === 0 ? '09:00' : '10:20', fecha: 'Sáb, 21 Mar' })) },
  { date: 'Sáb, 28 Mar', label: 'Fecha 3 · Adelantada', matches: proximosPartidos.slice(1).map((match, index) => ({ ...match, hora: index === 0 ? '11:00' : '12:20', fecha: 'Sáb, 28 Mar' })) },
]

function FixturesMenu({ selectedFixture, onSelect }: { selectedFixture: string; onSelect: (date: string) => void }) {
  const current = fixtureDates.find((fixture) => fixture.date === selectedFixture) ?? fixtureDates[0]

  return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><p className="font-heading text-sm uppercase tracking-[.2em] text-[#70b719]">Calendario oficial</p><h2 className="font-display text-3xl uppercase">Fixtures</h2><p className="mt-1 text-slate-500">Consulta jornadas actuales y fechas adelantadas.</p></div><button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#081522] px-4 py-3 text-sm font-bold text-white hover:bg-[#172b3b]"><FileDown size={17} /> Generar PDF</button></div><div className="mt-5 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]"><div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible">{fixtureDates.map((fixture) => <button key={fixture.date} type="button" onClick={() => onSelect(fixture.date)} className={`min-w-[190px] rounded-xl border p-3 text-left transition lg:w-full ${selectedFixture === fixture.date ? 'border-[#70b719] bg-[#e9fbd0] text-[#365e00]' : 'border-slate-200 bg-white text-slate-600 hover:border-[#70b719]'}`}><span className="block text-sm font-bold">{fixture.date}</span><span className="mt-1 block text-xs">{fixture.label}</span></button>)}</div><div className="min-w-0 rounded-xl border border-slate-200"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><p className="font-bold">{current.date}</p><p className="text-sm text-slate-500">{current.matches.length} partidos programados</p></div><ChevronDown size={18} className="text-slate-400" /></div><div className="divide-y divide-slate-100">{current.matches.map((match) => <div key={`${current.date}-${match.hora}-${match.local}`} className="grid gap-3 px-4 py-4 sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-center"><div><p className="font-bold">{formatFixtureTime(match.hora)}</p><p className="text-xs text-slate-500">{match.categoria}</p></div><p className="font-semibold">{match.local} <span className="font-normal text-slate-400">vs.</span> {match.visitante}</p><span className="rounded-full bg-slate-100 px-3 py-1 text-center text-xs font-bold text-slate-600">Programado</span></div>)}</div></div></div></section>
}

function PrintableFixtures({ selectedFixture }: { selectedFixture: string }) {
  const current = fixtureDates.find((fixture) => fixture.date === selectedFixture) ?? fixtureDates[0]
  return <section className="hidden print:block print:min-h-screen print:p-7 print:text-black"><div className="flex items-center justify-between"><img src="/MarcaAthlonX/MarcaNegro.svg" alt="AthlonX" className="h-14 w-44 object-contain object-left" /><img src="/upr.png" alt="U.P.R." className="h-20 w-36 object-contain object-right" /></div><h1 className="mt-7 text-center text-3xl font-black uppercase">FIXTURE LIGA PANAMEÑA RUGBY 7S</h1><p className="mt-2 text-center">{current.label} · {current.date}</p><div className="mt-8 grid grid-cols-3 gap-4 text-center">{categorias.map((category) => <div key={category.id}><h2 className="text-sm font-black uppercase">{category.nombre}</h2><ul className="mt-2 text-sm">{category.tabla.slice(0, 4).map((team) => <li key={team.equipo} className="border border-slate-300 p-2">{team.equipo}</li>)}</ul></div>)}</div><h2 className="mt-8 border-b-2 border-[#081522] pb-2 text-center text-lg font-black uppercase">Cronograma de partidos</h2><table className="mt-6 w-full border-collapse text-sm"><thead><tr><th className="border-b p-2 text-left">Partido</th><th className="border-b p-2 text-left">Horario</th><th className="border-b p-2 text-left">División</th><th className="border-b p-2 text-left">Enfrentamiento</th></tr></thead><tbody>{current.matches.map((match, index) => <tr key={`${current.date}-${match.hora}-${match.local}`}><td className="border-b border-slate-300 p-2 font-semibold">Partido {index + 1}</td><td className="border-b border-slate-300 p-2">{formatFixtureTime(match.hora)}</td><td className="border-b border-slate-300 p-2">{match.categoria}</td><td className="border-b border-slate-300 p-2 font-semibold">{match.local} vs. {match.visitante}</td></tr>)}<tr><td colSpan={4} className="p-4 text-center font-bold">RECESO · 9:10 AM - 9:20 AM</td></tr></tbody></table></section>
}

function formatFixtureTime(time: string) { const [rawHour, minutes] = time.split(':'); const hour = Number(rawHour); return `${hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}` }

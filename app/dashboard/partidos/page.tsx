'use client'

import { useEffect, useState } from 'react'
import { Activity, ArrowRightLeft, CalendarDays, Check, MapPin, Radio } from 'lucide-react'
import { jugadoresPartido, partidoActual, proximosPartidos } from '../../../simulaDatos'

type ViewMode = 'publico' | 'administrativa' | 'entrenadores'
type Score = { local: number; visitante: number }

export default function MatchesPage() {
  const [view, setView] = useState<ViewMode>('administrativa')
  const [score, setScore] = useState<Score>({
    local: partidoActual.localPuntos,
    visitante: partidoActual.visitantePuntos,
  })
  const [requests, setRequests] = useState<string[]>([])

  useEffect(() => {
    const requestedView = new URLSearchParams(window.location.search).get('vista')

    if (requestedView === 'publico' || requestedView === 'administrativa' || requestedView === 'entrenadores') {
      setView(requestedView)
    }
  }, [])

  const addPoints = (side: 'local' | 'visitante', points: number) => {
    setScore((current) => ({ ...current, [side]: current[side] + points }))
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#17212b] lg:pl-64">
      <header className="border-b border-slate-200 bg-white px-6 py-5 md:px-10">
        <p className="text-sm font-semibold text-slate-500">Liga Panameña de Rugby · Partido en vivo</p>
        <h1 className="text-3xl font-bold">Partidos</h1>
      </header>

      <section className="mx-auto max-w-7xl p-6 md:p-10">
        <ViewSelector view={view} onChange={setView} />

        <div className={view === 'administrativa' ? 'grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)_230px]' : ''}>
          {view === 'administrativa' && (
            <PlayerList team="Cuervos" players={jugadoresPartido.Cuervos} />
          )}

          <LiveMatch
            view={view}
            score={score}
            requests={requests}
            onEvent={addPoints}
            onRequest={(request) => setRequests((current) => [...current, request])}
          />

          {view === 'administrativa' && (
            <PlayerList team="Titanes" players={jugadoresPartido.Titanes} />
          )}
        </div>

        <UpcomingMatches />
      </section>
    </main>
  )
}

function ViewSelector({ view, onChange }: { view: ViewMode; onChange: (view: ViewMode) => void }) {
  const options: [ViewMode, string][] = [
    ['administrativa', 'Administrativa'],
    ['publico', 'Vista pública'],
    ['entrenadores', 'Entrenadores'],
  ]

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-2 rounded-xl bg-white p-2 shadow-sm">
        {options.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`rounded-lg px-4 py-2 font-semibold ${view === value ? 'bg-[#081522] text-white' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <span className="inline-flex items-center gap-2 rounded-full bg-[#e9fbd0] px-3 py-2 text-sm font-bold text-[#4c8500]">
        <Radio size={16} /> Canal simulado en tiempo real
      </span>
    </div>
  )
}

function LiveMatch({ view, score, requests, onEvent, onRequest }: { view: ViewMode; score: Score; requests: string[]; onEvent: (side: 'local' | 'visitante', points: number) => void; onRequest: (request: string) => void }) {
  const stats = [
    ['Tries', '2', '2'],
    ['Conversiones', '2', '1'],
    ['Penales', '2', '3'],
    ['Tarjetas amarillas', '1', '2'],
    ['Tarjetas rojas', '0', '0'],
    ['Cambios', '5', '4'],
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
        <TeamScore name={partidoActual.local} logo={partidoActual.localLogo} score={score.local} />
        <div className="text-center">
          <p className="text-4xl font-black">{partidoActual.tiempo}</p>
          <p className="text-sm text-slate-400">{partidoActual.periodo}</p>
        </div>
        <TeamScore name={partidoActual.visitante} logo={partidoActual.visitanteLogo} score={score.visitante} />
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

      {view === 'administrativa' && <AdminControls onEvent={onEvent} />}
      {view === 'entrenadores' && <CoachControls requests={requests} onRequest={onRequest} />}
    </section>
  )
}

function AdminControls({ onEvent }: { onEvent: (side: 'local' | 'visitante', points: number) => void }) {
  return <div className="border-t border-white/10 bg-[#10202d] p-5"><div className="flex items-center gap-2 font-bold"><Activity size={18} className="text-[#B4FF45]" /> Registrar evento</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => onEvent('local', 5)} className="rounded-lg bg-[#B4FF45] px-3 py-2 text-sm font-bold text-[#081522]">Try local +5</button><button type="button" onClick={() => onEvent('visitante', 5)} className="rounded-lg bg-[#B4FF45] px-3 py-2 text-sm font-bold text-[#081522]">Try visitante +5</button><button type="button" onClick={() => onEvent('local', 2)} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold">Conversión local +2</button><button type="button" onClick={() => onEvent('visitante', 2)} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold">Conversión visitante +2</button></div></div>
}

function CoachControls({ requests, onRequest }: { requests: string[]; onRequest: (request: string) => void }) {
  return <div className="border-t border-white/10 bg-[#10202d] p-5"><div className="flex items-center gap-2 font-bold"><ArrowRightLeft size={18} className="text-[#B4FF45]" /> Solicitar cambio</div><p className="mt-1 text-sm text-slate-400">Todas las solicitudes deben ser aprobadas por el staff.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => onRequest('Cambio de jugador solicitado · Pendiente de aprobación del staff')} className="rounded-lg bg-[#B4FF45] px-4 py-2 font-bold text-[#081522]">Solicitar cambio</button><button type="button" onClick={() => onRequest('Tiempo muerto solicitado · Pendiente de aprobación del staff')} className="rounded-lg border border-white/20 px-4 py-2 font-semibold">Solicitar tiempo muerto</button></div>{requests.map((request, index) => <p key={`${request}-${index}`} className="mt-3 text-sm text-[#B4FF45]"><Check className="mr-1 inline" size={15} />{request}</p>)}</div>
}

function PlayerList({ team, players }: { team: string; players: { numero: number; nombre: string }[] }) {
  return <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="font-display text-2xl uppercase">{team}</p><p className="mt-1 text-xs uppercase tracking-wider text-slate-500">Jugadores convocados</p><div className="mt-4 space-y-2">{players.map((player) => <div key={player.numero} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e9fbd0] font-bold text-[#4c8500]">{player.numero}</span><span className="text-sm font-semibold">{player.nombre}</span></div>)}</div></aside>
}

function TeamScore({ name, logo, score }: { name: string; logo: string; score: number }) { return <div className="flex items-center justify-center gap-4"><TeamLogo src={logo} name={name} /><div><p className="text-lg font-bold">{name}</p><p className="text-5xl font-black text-[#B4FF45]">{score}</p></div></div> }
function TeamLogo({ src, name }: { src: string; name: string }) { return src ? <img src={src} alt={`Logo de ${name}`} className="h-16 w-16 object-contain" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-[#70b719]">{name.slice(0, 2).toUpperCase()}</span> }

function UpcomingMatches() { return <section className="mt-8"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-2xl font-bold">Próximos partidos</h2><p className="text-slate-500">Agenda de la siguiente jornada.</p></div><CalendarDays className="text-[#70b719]" /></div><div className="grid gap-4 lg:grid-cols-3">{proximosPartidos.map((match) => <article key={match.hora} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">PROGRAMADO</span><div className="mt-4 flex items-center justify-between gap-2"><TeamLogo src={match.localLogo} name={match.local} /><div className="text-center"><p className="font-bold">{match.hora}</p><p className="text-xs text-slate-500">{match.categoria}</p></div><TeamLogo src={match.visitanteLogo} name={match.visitante} /></div><div className="mt-4 flex items-center justify-between text-sm text-slate-500"><span><MapPin className="mr-1 inline" size={15} />Cancha principal</span><span>{match.fecha}</span></div><button type="button" className="mt-4 w-full rounded-lg bg-[#081522] px-4 py-2 font-semibold text-white hover:bg-[#172b3b]">Iniciar partido</button></article>)}</div></section> }

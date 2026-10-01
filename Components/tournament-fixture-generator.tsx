'use client'

import { CalendarDays, Check, GripVertical, Settings2, Wand2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type Division = { id: string; name: string }
type Team = { id: string; name: string; division_id: string; division_name: string; logo_url: string | null }
type AutomaticDivisionConfig = { divisionId: string; matchesPerDate: number; matchesPerTeam?: number; restTeamsPerDate?: number }
type ManualPairing = { divisionId: string; localTeamId: string; visitorTeamId: string }
type FixtureMatch = { id: string; date_number: number; calendar_date: string | null; division_name: string | null; local_team_name: string; visitor_team_name: string; scheduled_time: string | null }

const divisionColors = ['border-[#b4ff45]', 'border-[#3b9eff]', 'border-[#c45cff]', 'border-[#ff9c52]']

function minimumDatesForDivision(teamCount: number, matchesPerTeam: number) {
  return matchesPerTeam > 0 ? 1 : 0
}

export function TournamentFixtureGenerator({ tournamentName, tournamentStatus, divisions, teams, dates, matches, canManage, onGenerate, onOpenCalendar }: { tournamentName: string; tournamentStatus: string; divisions: Division[]; teams: Team[]; dates: number[]; matches: FixtureMatch[]; canManage: boolean; onGenerate: (teamIds: string[], mode: 'automatic' | 'manual', pairings?: ManualPairing[], divisionConfigs?: AutomaticDivisionConfig[], numberOfDates?: number) => void; onOpenCalendar?: () => void }) {
  const [mode, setMode] = useState<'automatic' | 'manual' | null>(null)
  const [matchesPerDivision, setMatchesPerDivision] = useState<Record<string, string>>({})
  const [numberOfDates, setNumberOfDates] = useState('1')
  const [manualDivisionId, setManualDivisionId] = useState('')
  const [localTeamId, setLocalTeamId] = useState('')
  const [visitorTeamId, setVisitorTeamId] = useState('')
  const [manualPairings, setManualPairings] = useState<ManualPairing[]>([])
  const [error, setError] = useState('')

  const divisionRows = useMemo(() => {
    const known = new Map(divisions.map((division) => [division.id, division]))
    for (const team of teams) if (!known.has(team.division_id)) known.set(team.division_id, { id: team.division_id, name: team.division_name })
    return Array.from(known.values())
  }, [divisions, teams])
  const teamIds = useMemo(() => Array.from(new Set(teams.map((team) => team.id))), [teams])
  const automaticConfigs = divisionRows.map((division) => ({ divisionId: division.id, matchesPerDate: 0, matchesPerTeam: Number(matchesPerDivision[division.id] ?? 0) }))
  const manualTeams = teams.filter((team) => team.division_id === manualDivisionId)
  const totalTeams = teamIds.length
  const configuredDateCount = Number(numberOfDates)

  useEffect(() => {
    setManualDivisionId((current) => current || divisionRows[0]?.id || '')
    setMatchesPerDivision((current) => Object.fromEntries(divisionRows.map((division) => {
      const count = teams.filter((team) => team.division_id === division.id).length
      return [division.id, current[division.id] ?? String(Math.max(count - 1, 0))]
    })))
    setNumberOfDates((current) => {
      if (current !== '1') return current
      const minimum = Math.max(1, ...divisionRows.map((division) => {
        const count = teams.filter((team) => team.division_id === division.id).length
        return minimumDatesForDivision(count, Math.max(count - 1, 0))
      }))
      return String(minimum)
    })
  }, [divisionRows, teams])

  function updateMatches(divisionId: string, value: string) {
    setMatchesPerDivision((current) => ({ ...current, [divisionId]: value }))
  }

  function addManualPairing() {
    if (!manualDivisionId || !localTeamId || !visitorTeamId || localTeamId === visitorTeamId) return
    if (manualPairings.some((pairing) => pairing.localTeamId === localTeamId || pairing.visitorTeamId === localTeamId || pairing.localTeamId === visitorTeamId || pairing.visitorTeamId === visitorTeamId)) {
      setError('Un equipo no puede aparecer dos veces en la misma fecha.')
      return
    }
    setManualPairings((current) => [...current, { divisionId: manualDivisionId, localTeamId, visitorTeamId }])
    setLocalTeamId('')
    setVisitorTeamId('')
    setError('')
  }

  function generate() {
    setError('')
    if (!canManage) return
    if (!mode) return setError('Selecciona generación automática o manual.')
    if (mode === 'manual') {
      if (!manualPairings.length) return setError('Agrega al menos un enfrentamiento manual.')
      onGenerate(teamIds, mode, manualPairings, [], 1)
      return
    }
    if (!teamIds.length) return setError('El torneo todavía no tiene equipos vinculados.')
    if (!Number.isInteger(configuredDateCount) || configuredDateCount < 1) return setError('Indica una cantidad válida de fechas.')

    for (const config of automaticConfigs) {
      const count = teams.filter((team) => team.division_id === config.divisionId).length
      const matchesPerTeam = config.matchesPerTeam || 0
      const maximumMatches = Math.max(count - 1, 0)
      if (!Number.isInteger(matchesPerTeam) || matchesPerTeam < 0 || matchesPerTeam > maximumMatches) {
        return setError(`${divisionRows.find((division) => division.id === config.divisionId)?.name || 'La división'} permite entre 0 y ${maximumMatches} partidos por equipo.`)
      }
      if ((count * matchesPerTeam) % 2 !== 0) {
        return setError(`${divisionRows.find((division) => division.id === config.divisionId)?.name || 'La división'} necesita una cantidad par de participaciones.`)
      }
      const minimumDates = minimumDatesForDivision(count, matchesPerTeam)
      if (configuredDateCount < minimumDates) return setError(`${divisionRows.find((division) => division.id === config.divisionId)?.name || 'La división'} necesita al menos ${minimumDates} fecha para que cada equipo juegue ${matchesPerTeam} partido${matchesPerTeam === 1 ? '' : 's'}.`)
    }
    if (!automaticConfigs.some((config) => (config.matchesPerTeam || 0) > 0)) return setError('Configura al menos un partido por equipo para generar el fixture.')
    onGenerate(teamIds, mode, [], automaticConfigs, configuredDateCount)
  }

  return <section className="pt-6 print:hidden">
    <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Planificación</p><h2 className="mt-2 font-display text-3xl uppercase">Generador de fixtures</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{tournamentName}: organiza los equipos por división y genera un calendario todos contra todos aleatorio.</p></div>
      {canManage && <button type="button" onClick={generate} disabled={!mode || (mode === 'automatic' ? !automaticConfigs.some((config) => (config.matchesPerTeam || 0) > 0) : !manualPairings.length)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50"><Wand2 size={17} />Generar fixture</button>}
    </div>

    <section className="mt-6 rounded-[5px] border border-[#31556b] bg-[#07131e] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-white">Equipos por división</p><p className="mt-1 text-xs text-slate-400">Este torneo tiene {divisionRows.length} {divisionRows.length === 1 ? 'división' : 'divisiones'}. Los equipos se toman directamente de los participantes inscritos.</p></div><span className="rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300">Total de equipos: {totalTeams}</span></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {divisionRows.map((division, index) => {
          const divisionTeams = teams.filter((team) => team.division_id === division.id)
          return <article key={division.id} className={`rounded-[5px] border-l-4 ${divisionColors[index % divisionColors.length]} border border-[#29485d] bg-[#0b1d2c] p-3`}>
            <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-white">{division.name}</h3><span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-300">{divisionTeams.length} equipos</span></div>
            <div className="mt-3 space-y-2">{divisionTeams.length ? divisionTeams.map((team) => <div key={team.id} className="flex items-center gap-2 rounded-[5px] border border-white/10 bg-[#07131e] px-2 py-2 text-sm"><div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded bg-[#b4ff45]/15 text-xs font-bold text-[#b4ff45]">{team.logo_url ? <img src={team.logo_url} alt="" className="h-full w-full object-cover" /> : team.name.slice(0, 1).toUpperCase()}</div><span className="min-w-0 flex-1 truncate text-slate-200">{team.name}</span><GripVertical size={14} className="text-slate-500" /></div>) : <p className="rounded-[5px] border border-dashed border-[#31556b] p-3 text-xs text-slate-500">Sin equipos inscritos.</p>}</div>
          </article>
        })}
      </div>
    </section>

    <section className="mt-6 border-t border-white/10 pt-6"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Configuración de generación</p><p className="mt-1 text-sm text-slate-400">Define cuántos partidos juega cada equipo y cuántas fechas tendrá el calendario.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => { setMode('automatic'); setError('') }} className={`rounded-[5px] border p-4 text-left ${mode === 'automatic' ? 'border-[#b4ff45] bg-[#b4ff45]/10 text-[#dfffba]' : 'border-[#31556b] text-slate-400'}`}><span className="flex items-center gap-2 font-bold"><Settings2 size={17} />Generación automática</span><span className="mt-2 block text-xs">Intercala aleatoriamente los enfrentamientos de todas las divisiones.</span></button><button type="button" onClick={() => { setMode('manual'); setError('') }} className={`rounded-[5px] border p-4 text-left ${mode === 'manual' ? 'border-[#b4ff45] bg-[#b4ff45]/10 text-[#dfffba]' : 'border-[#31556b] text-slate-400'}`}><span className="flex items-center gap-2 font-bold"><GripVertical size={17} />Generación manual</span><span className="mt-2 block text-xs">Define cada enfrentamiento manualmente para una fecha.</span></button></div></section>

    {mode === 'automatic' && <section className="mt-4 rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/5 p-4 sm:p-5"><div className="flex items-center gap-2"><Settings2 size={18} className="text-[#b4ff45]" /><div><p className="text-sm font-bold text-[#dfffba]">Configuración automática</p><p className="mt-1 text-xs text-slate-400">Cada fecha tendrá todos los enfrentamientos necesarios para que cada equipo cumpla la cantidad configurada.</p></div></div><label className="mt-4 block max-w-xs text-xs font-bold uppercase tracking-wider text-slate-400">Cantidad de fechas<input type="number" min="1" value={numberOfDates} onChange={(event) => setNumberOfDates(event.target.value)} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-[#b4ff45]" /></label><div className="mt-4 grid gap-3 lg:grid-cols-2">{divisionRows.map((division) => { const count = teams.filter((team) => team.division_id === division.id).length; const maximum = Math.max(count - 1, 0); const matchesPerTeam = Number(matchesPerDivision[division.id] || 0); const totalMatches = count * matchesPerTeam / 2; const minimumDates = minimumDatesForDivision(count, matchesPerTeam); return <div key={division.id} className="rounded-[5px] border border-[#31556b] bg-[#07131e] p-3"><div className="flex justify-between gap-3"><span className="font-bold text-white">{division.name}</span><span className="text-xs text-slate-500">Máximo: {maximum} por fecha</span></div><label className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-400">Partidos por equipo en cada fecha<input type="number" min="0" max={maximum} value={matchesPerDivision[division.id] ?? '0'} onChange={(event) => updateMatches(division.id, event.target.value)} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-[#b4ff45]" /></label><p className="mt-2 text-[11px] text-slate-500">{count} equipos · {Number.isInteger(totalMatches) ? totalMatches : 'cantidad inválida'} partidos por fecha · mínimo {minimumDates} fecha.</p></div> })}</div></section>}

    {mode === 'manual' && <section className="mt-4 rounded-[5px] border border-[#31556b] bg-[#07131e] p-4 sm:p-5"><p className="text-sm font-bold text-[#dfffba]">Enfrentamientos manuales</p><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"><select value={manualDivisionId} onChange={(event) => { setManualDivisionId(event.target.value); setLocalTeamId(''); setVisitorTeamId('') }} className="rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3 text-sm text-slate-200"><option value="">División</option>{divisionRows.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}</select><select value={localTeamId} onChange={(event) => setLocalTeamId(event.target.value)} className="rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3 text-sm text-slate-200"><option value="">Local</option>{manualTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select value={visitorTeamId} onChange={(event) => setVisitorTeamId(event.target.value)} className="rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3 text-sm text-slate-200"><option value="">Visitante</option>{manualTeams.filter((team) => team.id !== localTeamId).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><button type="button" onClick={addManualPairing} className="inline-flex items-center justify-center gap-2 rounded-[5px] border border-[#b4ff45] px-4 py-3 font-bold text-[#dfffba]"><Check size={16} />Agregar</button></div><div className="mt-4 space-y-2">{manualPairings.map((pairing, index) => <div key={`${pairing.localTeamId}-${pairing.visitorTeamId}-${index}`} className="flex items-center justify-between gap-3 rounded-[5px] border border-white/10 px-3 py-2 text-sm"><span>{teams.find((team) => team.id === pairing.localTeamId)?.name} <span className="px-2 text-slate-500">vs.</span> {teams.find((team) => team.id === pairing.visitorTeamId)?.name}</span><button type="button" onClick={() => setManualPairings((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-[#ff9ca5]"><X size={16} /></button></div>)}</div></section>}
    {error && <p role="alert" className="mt-4 rounded-[5px] border border-[#ff7d88]/40 bg-[#ff7d88]/10 p-3 text-sm text-[#ffb0b7]">{error}</p>}

    <div className="mt-6 grid gap-4 sm:grid-cols-3"><InfoCard label="Fechas generadas" value={String(dates.length)} /><InfoCard label="Equipos participantes" value={String(totalTeams)} /><InfoCard label="Estado" value={tournamentStatus === 'finished' ? 'Torneo finalizado' : mode ? 'Configuración abierta' : 'Selecciona un modo'} /></div>
    <section className="mt-6 rounded-[5px] border border-[#31556b] bg-[#07131e] p-4 sm:p-5">{matches.length ? <><div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Fechas generadas</p><h3 className="mt-1 font-display text-2xl uppercase">Calendario actual</h3></div>{canManage && onOpenCalendar && <button type="button" onClick={onOpenCalendar} className="inline-flex items-center gap-2 rounded-[5px] border border-[#b4ff45]/60 px-3 py-2 text-xs font-bold text-[#dfffba]"><CalendarDays size={15} />Editar calendario</button>}</div><div className="mt-4 space-y-2">{dates.map((date) => <div key={date} className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-3"><p className="text-xs font-bold uppercase tracking-wider text-[#b4ff45]">Fecha {date}</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{matches.filter((match) => match.date_number === date).map((match) => <p key={match.id} className="text-sm text-slate-300"><span className="font-semibold text-white">{match.local_team_name} vs. {match.visitor_team_name}</span><span className="ml-2 text-xs text-slate-500">{match.division_name || 'General'}{match.scheduled_time ? ` · ${match.scheduled_time.slice(0, 5)}` : ''}</span></p>)}</div></div>)}</div></> : <p className="rounded-[5px] border border-dashed border-[#31556b] p-5 text-sm text-slate-400">Todavía no hay fixtures creados. Selecciona un modo para comenzar.</p>}</section>
  </section>
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[5px] border border-[#31556b] bg-[#07131e] p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-lg font-bold text-white">{value}</p></div>
}

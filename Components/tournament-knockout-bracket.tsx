'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BasketballTournamentPanels } from './basketball-tournament-panels'

type Team = { id: string; name: string; division_id: string; division_name: string }
type Match = {
  id: string
  date_number: number
  division_id: string | null
  status: string
  local_team_id: string
  visitor_team_id: string
  local_score: number
  visitor_score: number
  shootout_local_score?: number | null
  shootout_visitor_score?: number | null
  scheduled_time?: string | null
  court_number?: number | null
}
type MatchEvent = {
  match_id: string
  team_id?: string | null
  event_type: string
  points: number
  is_corrected?: boolean
}
type Stage = {
  id: string
  division_id: string
  name: string
  round_number: number
  bracket_size: number
}
type BracketMatch = {
  id: string
  stage_id: string
  position: number
  local_team_id: string | null
  visitor_team_id: string | null
  winner_team_id: string | null
  local_source: string | null
  visitor_source: string | null
  source_match_id: string | null
  status: string
}

type ManualPairing = {
  localTeamId: string
  visitorTeamId: string
  scheduledTime: string
  courtNumber: string
}

const roundNames = ['Final', 'Semifinales', 'Cuartos de final', 'Octavos de final']

function nextPowerOfTwo(value: number) {
  return Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(2, value))))
}

function stageName(bracketSize: number) {
  const index = Math.log2(bracketSize)
  return roundNames[index - 1] || `Ronda de ${bracketSize}`
}

function createManualPairings(): ManualPairing[] {
  return Array.from({ length: 8 }, () => ({
    localTeamId: '',
    visitorTeamId: '',
    scheduledTime: '',
    courtNumber: '',
  }))
}

export function TournamentKnockoutBracket(props: Parameters<typeof LegacyTournamentKnockoutBracket>[0] & { discipline?: string; tournamentName?: string }) {
  if (props.discipline === 'baloncesto') return <BasketballTournamentPanels tournamentId={props.tournamentId} tournamentName={props.tournamentName || 'Torneo 3x3'} section="llaves" canManage={props.canManage} />
  return <LegacyTournamentKnockoutBracket {...props} />
}

function LegacyTournamentKnockoutBracket({
  tournamentId,
  teams,
  matches,
  events,
  canManage,
  footballEight = false,
  generationMode: forcedMode,
}: {
  tournamentId: string
  teams: Team[]
  matches: Match[]
  events: MatchEvent[]
  canManage: boolean
  footballEight?: boolean
  // Lo fija el Generador; sin este valor la llave muestra su propio selector.
  generationMode?: 'automatic' | 'manual'
}) {
  const [stages, setStages] = useState<Stage[]>([])
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([])
  const [selectedDivision, setSelectedDivision] = useState(teams[0]?.division_id || '')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [internalMode, setGenerationMode] = useState<'automatic' | 'manual'>('automatic')
  const generationMode = forcedMode ?? internalMode
  const [manualPairings, setManualPairings] = useState<ManualPairing[]>(
    createManualPairings,
  )
  const [courtsCount, setCourtsCount] = useState(1)

  const divisions = useMemo(() => (
    Array.from(new Map(teams.map((team) => [team.division_id, team.division_name])))
  ), [teams])

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])

  useEffect(() => {
    if (!divisions.some(([id]) => id === selectedDivision)) {
      setSelectedDivision(divisions[0]?.[0] || '')
    }
  }, [divisions, selectedDivision])

  // Limpia los cruces manuales cuando cambia la división seleccionada.
  useEffect(() => {
    setManualPairings(createManualPairings())
  }, [selectedDivision])

  async function loadBracket() {
    if (!supabase || !selectedDivision) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [{ data: stageData }, { data: settings }] = await Promise.all([
      supabase
        .from('tournament_knockout_stages')
        .select('id, division_id, name, round_number, bracket_size')
        .eq('tournament_id', tournamentId)
        .eq('division_id', selectedDivision)
        .order('round_number'),
      supabase
        .from('tournament_competition_settings')
        .select('courts_count')
        .eq('tournament_id', tournamentId)
        .maybeSingle(),
    ])
    setCourtsCount(Math.max(1, Number(settings?.courts_count || 1)))
    const loadedStages = (stageData || []) as Stage[]
    const stageIds = loadedStages.map((stage) => stage.id)
    const { data: matchData } = stageIds.length
      ? await supabase
        .from('tournament_knockout_matches')
        .select(
          'id, stage_id, position, local_team_id, visitor_team_id, '
          + 'winner_team_id, local_source, visitor_source, source_match_id, status',
        )
        .in('stage_id', stageIds)
        .order('position')
      : { data: [] }
    setStages(loadedStages)
    setBracketMatches((matchData || []) as BracketMatch[])
    setLoading(false)
    await advanceByes(loadedStages, (matchData || []) as BracketMatch[])
  }

  // Propaga los cruces incompletos sin crear partidos ficticios.
  async function advanceByes(loadedStages: Stage[], loadedMatches: BracketMatch[]) {
    if (!supabase || !canManage) return
    for (const stage of loadedStages) {
      const nextStage = loadedStages.find(
        (item) => item.round_number === stage.round_number + 1,
      )
      if (!nextStage) continue
      const byes = loadedMatches.filter(
        (item) => item.stage_id === stage.id && item.status === 'bye',
      )
      for (const bye of byes) {
        const winner = bye.local_team_id || bye.visitor_team_id
        if (!winner) continue
        await supabase.from('tournament_knockout_matches').update({
          winner_team_id: winner,
          status: 'finished',
        }).eq('id', bye.id)
        await supabase.from('tournament_knockout_matches').update({
          [bye.position % 2 ? 'local_team_id' : 'visitor_team_id']: winner,
        }).eq('stage_id', nextStage.id).eq('position', Math.ceil(bye.position / 2))
      }
    }
  }

  useEffect(() => {
    void loadBracket()
  }, [selectedDivision, tournamentId])

  function rankedTeams() {
    const divisionTeams = teams.filter((team) => team.division_id === selectedDivision)
    return divisionTeams.map((team) => {
      let points = 0
      let difference = 0
      let scored = 0
      matches.filter((match) => (
        match.status === 'finished' && match.division_id === selectedDivision &&
        (match.local_team_id === team.id || match.visitor_team_id === team.id)
      )).forEach((match) => {
        const local = match.local_team_id === team.id
        const forTeam = local ? match.local_score : match.visitor_score
        const against = local ? match.visitor_score : match.local_score
        scored += forTeam
        difference += forTeam - against
        points += forTeam > against ? 3 : forTeam === against ? 1 : 0
      })
      return { team, points, difference, scored }
    }).sort((a, b) => (
      b.points - a.points || b.difference - a.difference || b.scored - a.scored
    )).map((row) => row.team)
  }

  async function generateBracket() {
    if (!supabase || !canManage || !selectedDivision) return
    setMessage('')
    const ranked = rankedTeams()
    if (footballEight) {
      if (ranked.length !== 16) return setMessage('Se necesitan exactamente 16 equipos en la división para generar los octavos de final.')
      if (stages.length) return setMessage('La llave ya está generada. Los ganadores avanzan al finalizar cada partido.')
      const { error } = await supabase.rpc('generate_football_eight_bracket', { p_tournament_id: tournamentId, p_division_id: selectedDivision })
      if (error) return setMessage(error.message)
      window.location.reload()
      return
    }
    if (ranked.length < 2) {
      setMessage('Se necesitan al menos dos equipos en la división.')
      return
    }
    const bracketSize = nextPowerOfTwo(ranked.length)
    await supabase.from('tournament_knockout_stages')
      .delete().eq('tournament_id', tournamentId).eq('division_id', selectedDivision)
    const stageRows = Array.from({ length: Math.log2(bracketSize) }, (_, index) => ({
      tournament_id: tournamentId,
      division_id: selectedDivision,
      name: stageName(bracketSize / 2 ** index),
      round_number: index + 1,
      bracket_size: bracketSize / 2 ** index,
      status: 'pending',
    }))
    const { data: createdStages, error: stageError } = await supabase
      .from('tournament_knockout_stages').insert(stageRows).select()
    if (stageError || !createdStages) {
      setMessage(stageError?.message || 'No se pudo crear la llave.')
      return
    }
    const firstStage = (createdStages as Stage[]).sort((a, b) => a.round_number - b.round_number)[0]
    const seeded = Array.from({ length: bracketSize / 2 }, (_, index) => ({
      stage_id: firstStage.id,
      position: index + 1,
      local_team_id: ranked[index * 2]?.id || null,
      visitor_team_id: ranked[index * 2 + 1]?.id || null,
      local_source: ranked[index * 2] ? null : 'Clasificado',
      visitor_source: ranked[index * 2 + 1] ? null : 'Clasificado',
      status: ranked[index * 2] && ranked[index * 2 + 1] ? 'scheduled' : 'bye',
    }))
    const laterRounds = (createdStages as Stage[])
      .filter((stage) => stage.id !== firstStage.id)
      .sort((a, b) => a.round_number - b.round_number)
      .flatMap((stage, stageIndex) => Array.from({
        length: stage.bracket_size / 2,
      }, (_, index) => ({
        stage_id: stage.id,
        position: index + 1,
        local_team_id: null,
        visitor_team_id: null,
        local_source: `Ganador de ${stageName(stage.bracket_size * 2)} ${index * 2 + 1}`,
        visitor_source: `Ganador de ${stageName(stage.bracket_size * 2)} ${index * 2 + 2}`,
        status: 'pending',
        _stageIndex: stageIndex,
      })))
      .map(({ _stageIndex, ...match }) => match)
    const { error: matchError } = await supabase
      .from('tournament_knockout_matches').insert([...seeded, ...laterRounds])
    if (matchError) setMessage(matchError.message)
    else {
      setMessage(`Llave de ${bracketSize} equipos generada. Los cupos restantes avanzan automáticamente.`)
      await loadBracket()
    }
  }

  // Genera la llave de fútbol 8 con los cruces definidos por el organizador.
  async function generateManualBracket() {
    if (!supabase || !canManage || !selectedDivision) return
    const divisionTeams = teams.filter((team) => team.division_id === selectedDivision)
    const selectedTeamIds = manualPairings.flatMap((pairing) => [
      pairing.localTeamId,
      pairing.visitorTeamId,
    ])
    const uniqueTeamIds = new Set(selectedTeamIds)

    if (divisionTeams.length !== 16) {
      setMessage('La división debe tener exactamente 16 equipos para crear la llave.')
      return
    }
    if (manualPairings.some((pairing) => (
      !pairing.localTeamId
      || !pairing.visitorTeamId
      || !pairing.scheduledTime
      || !pairing.courtNumber
    ))) {
      setMessage('Completa los dos equipos, la hora y la cancha de cada cruce.')
      return
    }
    if (selectedTeamIds.some((teamId) => !divisionTeams.some((team) => team.id === teamId))) {
      setMessage('Todos los equipos deben pertenecer a la división seleccionada.')
      return
    }
    if (uniqueTeamIds.size !== 16) {
      setMessage('Cada equipo debe aparecer exactamente una vez en los octavos.')
      return
    }
    if (manualPairings.some((pairing) => pairing.localTeamId === pairing.visitorTeamId)) {
      setMessage('Un equipo no puede enfrentarse a sí mismo.')
      return
    }
    if (manualPairings.some((pairing) => {
      const court = Number(pairing.courtNumber)
      return !Number.isInteger(court) || court < 1 || court > courtsCount
    })) {
      setMessage(`Las canchas disponibles son del 1 al ${courtsCount}.`)
      return
    }
    const occupiedSlots = new Set<string>()
    for (const pairing of manualPairings) {
      const slot = `${pairing.scheduledTime}:${pairing.courtNumber}`
      if (occupiedSlots.has(slot)) {
        setMessage('No puedes programar dos cruces a la misma hora en la misma cancha.')
        return
      }
      occupiedSlots.add(slot)
    }

    setMessage('')
    const { error } = await supabase.rpc('generate_football_eight_manual_bracket', {
      p_tournament_id: tournamentId,
      p_division_id: selectedDivision,
      p_pairings: manualPairings.map((pairing) => ({
        local_team_id: pairing.localTeamId,
        visitor_team_id: pairing.visitorTeamId,
        scheduled_time: pairing.scheduledTime,
        court_number: Number(pairing.courtNumber),
      })),
    })
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('Llave manual generada correctamente.')
    setManualPairings(createManualPairings())
    await loadBracket()
  }

  // Genera el PDF de la llave visible y conserva sus rondas por división.
  function printBracket() {
    const printWindow = window.open('', '_blank', 'width=1000,height=900')
    if (!printWindow) {
      setMessage('Permite las ventanas emergentes para generar el PDF.')
      return
    }
    const columns = stages.map((stage) => {
      const cards = (matchesByStage.get(stage.id) || []).map((match) => {
        const local = match.local_team_id
          ? teamById.get(match.local_team_id)?.name
          : match.local_source || 'Por definir'
        const visitor = match.visitor_team_id
          ? teamById.get(match.visitor_team_id)?.name
          : match.visitor_source || 'Por definir'
        const sourceMatch = match.source_match_id
          ? matches.find((item) => item.id === match.source_match_id)
          : null
        const scoreVisible = sourceMatch
          && ['live', 'finished'].includes(sourceMatch.status)
        const sourceEvents = sourceMatch
          ? events.filter((event) => event.match_id === sourceMatch.id
            && event.event_type === 'penalty_kick'
            && !event.is_corrected)
          : []
        const localPenaltyPoints = sourceEvents
          .filter((event) => event.team_id === sourceMatch?.local_team_id)
          .reduce((total, event) => total + (event.points || 0), 0)
        const visitorPenaltyPoints = sourceEvents
          .filter((event) => event.team_id === sourceMatch?.visitor_team_id)
          .reduce((total, event) => total + (event.points || 0), 0)
        const localScore = scoreVisible
          ? `<strong class="score">${sourceMatch.local_score}</strong>`
          : ''
        const visitorScore = scoreVisible
          ? `<strong class="score">${sourceMatch.visitor_score}</strong>`
          : ''
        const localPenalty = localPenaltyPoints > 0
          ? `<span class="detail">Penales: ${localPenaltyPoints}</span>`
          : ''
        const visitorPenalty = visitorPenaltyPoints > 0
          ? `<span class="detail">Penales: ${visitorPenaltyPoints}</span>`
          : ''
        const shootoutVisible = sourceMatch
          && sourceMatch.shootout_local_score != null
          && sourceMatch.shootout_visitor_score != null
        const shootout = shootoutVisible
          ? `<p class="shootout">Tanda: ${sourceMatch.shootout_local_score}`
            + ` - ${sourceMatch.shootout_visitor_score}</p>`
          : ''
        return `<div class="match"><div><span>${local}</span>${localScore}`
          + `${localPenalty}</div><div><span>${visitor}</span>${visitorScore}`
          + `${visitorPenalty}</div>${shootout}</div>`
      }).join('')
      return `<section><h2>${stage.name}</h2>${cards}</section>`
    }).join('')
    printWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8" />
      <title>Llave de eliminación</title><style>
      @page { size: A4 landscape; margin: 12mm; } * { box-sizing: border-box; }
      body { margin: 0; color: #102030; font-family: Arial, sans-serif; }
      header { display: flex; justify-content: space-between; align-items: center; }
      header img { width: 42mm; height: 18mm; object-fit: contain; }
      h1 { margin: 8mm 0 2mm; text-align: center; font-size: 24px; }
      .subtitle { text-align: center; color: #506070; }
      .bracket { display: grid; grid-template-columns: repeat(${stages.length}, 1fr);
        gap: 8mm; margin-top: 12mm; align-items: start; }
      section h2 { border-bottom: 2px solid #102030; padding-bottom: 3mm;
        text-align: center; font-size: 13px; text-transform: uppercase; }
      .match { margin: 8mm 0; border: 1px solid #9db0c2; break-inside: avoid; }
      .match > div { display: flex; flex-wrap: wrap; align-items: center;
        justify-content: space-between; gap: 2mm; padding: 3mm;
        border-bottom: 1px solid #d2dce5; font-size: 11px; }
      .match > div + div { border-bottom: 0; }
      .score { font-size: 15px; font-weight: 700; }
      .detail { width: 100%; color: #506070; font-size: 9px; }
      .shootout { margin: 0; padding: 2mm 3mm; color: #7a4d00;
        background: #fff2cc; font-size: 9px; font-weight: 700; }
      </style></head><body><header>
       <img src="${window.location.origin}/MarcaAthlonX/MarcaNegro.svg" alt="AthlonX" /></header>
      <h1>Llave de eliminación directa</h1>
      <p class="subtitle">División ${selectedDivision} · AthlonX</p>
      <main class="bracket">${columns}</main></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    window.setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 400)
  }

  const matchesByStage = new Map(stages.map((stage) => [
    stage.id,
    bracketMatches.filter((match) => match.stage_id === stage.id),
  ]))
  const finalStage = stages[stages.length - 1]
  const finalMatch = finalStage ? matchesByStage.get(finalStage.id)?.[0] : null
  const champion = finalMatch?.winner_team_id ? teamById.get(finalMatch.winner_team_id) : null
  const selectedDivisionTeams = teams.filter((team) => team.division_id === selectedDivision)

  // Actualiza un campo del cruce manual sin modificar los demás valores.
  function updateManualPairing(
    index: number,
    field: keyof ManualPairing,
    value: string,
  ) {
    setManualPairings((current) => current.map((pairing, pairingIndex) => (
      pairingIndex === index ? { ...pairing, [field]: value } : pairing
    )))
  }

  return (
    <section className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">
            Eliminación directa
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">Llaves por división</h2>
          {footballEight && (
            <p className="mt-2 text-sm text-slate-300">
              16 equipos · Octavos → cuartos → semifinales → final. Los partidos
              se crean y los ganadores avanzan automáticamente.
            </p>
          )}
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={printBracket}
              disabled={!stages.length}
              className="rounded-lg border border-[#31556b] px-4 py-2 font-bold text-white
                disabled:cursor-not-allowed disabled:opacity-50">
              PDF de la llave
            </button>
            {(!footballEight || generationMode === 'automatic') && (
              <button
                type="button"
                onClick={() => void generateBracket()}
                disabled={footballEight && stages.length > 0}
                className="rounded-lg bg-[#b4ff45] px-4 py-2 font-bold text-[#07131e]"
              >
                Generar llave automática
              </button>
            )}
          </div>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {divisions.map(([id, name]) => (
          <button key={id} type="button" onClick={() => setSelectedDivision(id)}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${selectedDivision === id
              ? 'bg-[#b4ff45] text-[#07131e]' : 'border border-[#31556b] text-slate-300'}`}>
            {name}
          </button>
        ))}
      </div>
      {footballEight && canManage && !stages.length && (
        <section className="mt-6 rounded-lg border border-[#31556b] bg-[#07131e] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#b4ff45]">
                Configuración de la llave
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Elige si los cruces se ordenan automáticamente o se registran manualmente.
              </p>
            </div>
            {!forcedMode && <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setGenerationMode('automatic')}
                className={generationMode === 'automatic'
                  ? 'rounded-lg bg-[#b4ff45] px-3 py-2 text-sm font-bold text-[#07131e]'
                  : 'rounded-lg border border-[#31556b] px-3 py-2 text-sm font-bold text-slate-300'}
              >
                Automática
              </button>
              <button
                type="button"
                onClick={() => setGenerationMode('manual')}
                className={generationMode === 'manual'
                  ? 'rounded-lg bg-[#b4ff45] px-3 py-2 text-sm font-bold text-[#07131e]'
                  : 'rounded-lg border border-[#31556b] px-3 py-2 text-sm font-bold text-slate-300'}
              >
                Manual
              </button>
            </div>}
          </div>
          {generationMode === 'manual' && (
            <div className="mt-5 space-y-3">
              <p className="text-sm font-bold text-[#dfffba]">
                Octavos de final · 8 cruces · {courtsCount} cancha{courtsCount === 1 ? '' : 's'}
              </p>
              {manualPairings.map((pairing, index) => (
                <div
                  key={`manual-pairing-${index}`}
                  className="grid gap-2 rounded-lg border border-white/10 p-3
                    lg:grid-cols-[auto_1fr_1fr_150px_130px] lg:items-center"
                >
                  <span className="text-xs font-bold uppercase text-slate-500">
                    Cruce {index + 1}
                  </span>
                  <select
                    value={pairing.localTeamId}
                    onChange={(event) => updateManualPairing(
                      index,
                      'localTeamId',
                      event.target.value,
                    )}
                    className="rounded border border-[#31556b] bg-[#0b1d2c] px-2 py-2 text-sm"
                  >
                    <option value="">Equipo local</option>
                    {selectedDivisionTeams.map((team) => (
                      <option key={`manual-local-${index}-${team.id}`} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={pairing.visitorTeamId}
                    onChange={(event) => updateManualPairing(
                      index,
                      'visitorTeamId',
                      event.target.value,
                    )}
                    className="rounded border border-[#31556b] bg-[#0b1d2c] px-2 py-2 text-sm"
                  >
                    <option value="">Equipo visitante</option>
                    {selectedDivisionTeams.map((team) => (
                      <option key={`manual-visitor-${index}-${team.id}`} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={pairing.scheduledTime}
                    onChange={(event) => updateManualPairing(
                      index,
                      'scheduledTime',
                      event.target.value,
                    )}
                    className="rounded border border-[#31556b] bg-[#0b1d2c] px-2 py-2 text-sm"
                  />
                  <select
                    value={pairing.courtNumber}
                    onChange={(event) => updateManualPairing(
                      index,
                      'courtNumber',
                      event.target.value,
                    )}
                    className="rounded border border-[#31556b] bg-[#0b1d2c] px-2 py-2 text-sm"
                  >
                    <option value="">Cancha</option>
                    {Array.from({ length: courtsCount }, (_, courtIndex) => courtIndex + 1)
                      .map((court) => (
                        <option key={`manual-court-${index}-${court}`} value={court}>
                          Cancha {court}
                        </option>
                      ))}
                  </select>
                </div>
              ))}
              <button
                type="button"
                onClick={() => void generateManualBracket()}
                className="rounded-lg bg-[#b4ff45] px-4 py-2 font-bold text-[#07131e]"
              >
                Generar llave manualmente
              </button>
            </div>
          )}
        </section>
      )}
      {message && <p className="mt-4 rounded-lg border border-[#b4ff45]/40 p-3 text-sm text-[#b4ff45]">{message}</p>}
      {champion && <p className="mt-4 rounded-lg border border-[#b4ff45] bg-[#b4ff45]/10 p-4 font-bold text-[#b4ff45]">Campeón: {champion.name}</p>}
      {loading ? <p className="mt-8 text-slate-400">Cargando llave...</p> : stages.length === 0 ? (
        <p className="mt-8 text-slate-400">Todavía no hay una llave generada para esta división.</p>
      ) : (
        <div className="mt-8 grid gap-4 overflow-x-auto pb-3 lg:grid-cols-4">
          {stages.map((stage) => (
            <div key={stage.id} className="min-w-[230px]">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#b4ff45]">
                {stage.name}
              </h3>
              <div className="space-y-3">
                {(matchesByStage.get(stage.id) || []).map((match) => {
                  const local = match.local_team_id ? teamById.get(match.local_team_id)?.name : match.local_source || 'Por definir'
                  const visitor = match.visitor_team_id ? teamById.get(match.visitor_team_id)?.name : match.visitor_source || 'Por definir'
                  const sourceMatch = match.source_match_id
                    ? matches.find((item) => item.id === match.source_match_id)
                    : null
                  // Muestra el marcador del partido real vinculado al cruce.
                  const scoreVisible = sourceMatch
                    && ['live', 'finished'].includes(sourceMatch.status)
                  return <article key={match.id} className="rounded-lg border border-[#31556b] bg-[#07131e] p-3 text-sm text-white">
                    <p className="flex items-center justify-between gap-2">
                      <span>{local}</span>
                      {scoreVisible && <strong className="text-lg text-[#b4ff45]">
                        {sourceMatch.local_score}
                      </strong>}
                    </p>
                    <p className="my-1 flex items-center justify-between gap-2 border-t border-[#31556b] pt-1">
                      <span>{visitor}</span>
                      {scoreVisible && <strong className="text-lg text-[#b4ff45]">
                        {sourceMatch.visitor_score}
                      </strong>}
                    </p>
                    {sourceMatch && <p className="mt-2 text-xs text-slate-400">
                      {sourceMatch.scheduled_time?.slice(0, 5) || 'Hora por definir'}
                      {' · '}
                      {sourceMatch.court_number
                        ? `Cancha ${sourceMatch.court_number}`
                        : 'Cancha por definir'}
                    </p>}
                    <span className="mt-2 inline-block text-xs text-slate-500">{match.status === 'bye' ? 'Avance automático' : match.status === 'finished' ? 'Resuelto' : 'Pendiente'}</span>
                  </article>
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

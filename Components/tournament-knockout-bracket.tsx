'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { shootoutWinner } from '../lib/football-eight'

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
  status: string
}

const roundNames = ['Final', 'Semifinales', 'Cuartos de final', 'Octavos de final']

function nextPowerOfTwo(value: number) {
  return Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(2, value))))
}

function stageName(bracketSize: number) {
  const index = Math.log2(bracketSize)
  return roundNames[index - 1] || `Ronda de ${bracketSize}`
}

export function TournamentKnockoutBracket({
  tournamentId,
  teams,
  matches,
  canManage,
  footballEight = false,
}: {
  tournamentId: string
  teams: Team[]
  matches: Match[]
  canManage: boolean
  footballEight?: boolean
}) {
  const [stages, setStages] = useState<Stage[]>([])
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([])
  const [selectedDivision, setSelectedDivision] = useState(teams[0]?.division_id || '')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [resolvingId, setResolvingId] = useState('')

  const divisions = useMemo(() => (
    Array.from(new Map(teams.map((team) => [team.division_id, team.division_name])))
  ), [teams])

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])

  useEffect(() => {
    if (!divisions.some(([id]) => id === selectedDivision)) {
      setSelectedDivision(divisions[0]?.[0] || '')
    }
  }, [divisions, selectedDivision])

  async function loadBracket() {
    if (!supabase || !selectedDivision) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: stageData } = await supabase
      .from('tournament_knockout_stages')
      .select('id, division_id, name, round_number, bracket_size')
      .eq('tournament_id', tournamentId)
      .eq('division_id', selectedDivision)
      .order('round_number')
    const loadedStages = (stageData || []) as Stage[]
    const stageIds = loadedStages.map((stage) => stage.id)
    const { data: matchData } = stageIds.length
      ? await supabase
        .from('tournament_knockout_matches')
        .select('id, stage_id, position, local_team_id, visitor_team_id, winner_team_id, local_source, visitor_source, status')
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

  // Vincula el cruce con un partido real y mueve el ganador a la siguiente ronda.
  async function resolveBracketMatch(bracketMatch: BracketMatch, sourceMatchId: string) {
    if (!supabase || !canManage || !sourceMatchId) return
    const source = matches.find((match) => match.id === sourceMatchId)
    if (!source) return
    const local = source.local_team_id
    const visitor = source.visitor_team_id
    let winner = source.local_score > source.visitor_score ? local : visitor
    if (source.local_score === source.visitor_score) {
      const { data: result, error } = await supabase.from('matches').select('shootout_local_score, shootout_visitor_score').eq('id', source.id).single()
      const penaltyWinner = result && shootoutWinner(result.shootout_local_score, result.shootout_visitor_score)
      if (error || !penaltyWinner) {
        setMessage('El desempate por penales debe tener un ganador.')
        return
      }
      winner = penaltyWinner === 'local' ? local : visitor
    }
    setResolvingId(bracketMatch.id)
    const currentStage = stages.find((stage) => stage.id === bracketMatch.stage_id)
    const nextStage = currentStage
      ? stages.find((stage) => stage.round_number === currentStage.round_number + 1)
      : null
    const { error } = await supabase.from('tournament_knockout_matches')
      .update({
        local_team_id: local,
        visitor_team_id: visitor,
        winner_team_id: winner,
        source_match_id: sourceMatchId,
        status: 'finished',
      })
      .eq('id', bracketMatch.id)
    if (error) {
      setMessage(error.message)
      setResolvingId('')
      return
    }
    if (nextStage) {
      const nextPosition = Math.ceil(bracketMatch.position / 2)
      const isLocalSlot = bracketMatch.position % 2 === 1
      const column = isLocalSlot ? 'local_team_id' : 'visitor_team_id'
      await supabase.from('tournament_knockout_matches')
        .update({ [column]: winner })
        .eq('stage_id', nextStage.id)
        .eq('position', nextPosition)
    }
    setMessage('Resultado guardado y ganador avanzado a la siguiente ronda.')
    setResolvingId('')
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
        return `<div class="match"><div>${local}</div><div>${visitor}</div></div>`
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
      .match div { padding: 3mm; border-bottom: 1px solid #d2dce5; font-size: 11px; }
      .match div:last-child { border-bottom: 0; }
      </style></head><body><header>
      <img src="${window.location.origin}/MarcaAthlonX/MarcaNegro.svg" alt="AthlonX" />
      <img src="${window.location.origin}/upr.png" alt="Organización" /></header>
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

  return (
    <section className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">
            Eliminación directa
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">Llaves por división</h2>
          {footballEight && <p className="mt-2 text-sm text-slate-300">16 equipos · Octavos → cuartos → semifinales → final. Los partidos se crean y los ganadores avanzan automáticamente.</p>}
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={printBracket}
              disabled={!stages.length}
              className="rounded-lg border border-[#31556b] px-4 py-2 font-bold text-white
                disabled:cursor-not-allowed disabled:opacity-50">
              PDF de la llave
            </button>
            <button type="button" onClick={generateBracket}
              disabled={footballEight && stages.length > 0}
              className="rounded-lg bg-[#b4ff45] px-4 py-2 font-bold text-[#07131e]">
              Generar llave
            </button>
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
                  return <article key={match.id} className="rounded-lg border border-[#31556b] bg-[#07131e] p-3 text-sm text-white">
                    <p>{local}</p><p className="my-1 border-t border-[#31556b] pt-1">{visitor}</p>
                    <span className="mt-2 inline-block text-xs text-slate-500">{match.status === 'bye' ? 'Avance automático' : match.status === 'finished' ? 'Resuelto' : 'Pendiente'}</span>
                    {canManage && match.status !== 'finished' && match.local_team_id && match.visitor_team_id && (
                      <select
                        disabled={resolvingId === match.id}
                        defaultValue=""
                        onChange={(event) => {
                          void resolveBracketMatch(match, event.target.value)
                        }}
                        className="mt-3 w-full rounded border border-[#31556b] bg-[#0b1d2c] px-2 py-1 text-xs"
                      >
                        <option value="">Vincular partido real</option>
                        {matches.filter((source) => (
                          source.status === 'finished' &&
                          [source.local_team_id, source.visitor_team_id].includes(match.local_team_id) &&
                          [source.local_team_id, source.visitor_team_id].includes(match.visitor_team_id)
                        )).map((source) => (
                          <option key={source.id} value={source.id}>
                            {source.local_score} - {source.visitor_score} · Fecha {source.date_number}
                          </option>
                        ))}
                      </select>
                    )}
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

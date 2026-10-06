'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Team = { id: string; name: string; division_id: string; division_name: string }
type Match = {
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
}: {
  tournamentId: string
  teams: Team[]
  matches: Match[]
  canManage: boolean
}) {
  const [stages, setStages] = useState<Stage[]>([])
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([])
  const [selectedDivision, setSelectedDivision] = useState(teams[0]?.division_id || '')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

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

  const matchesByStage = new Map(stages.map((stage) => [
    stage.id,
    bracketMatches.filter((match) => match.stage_id === stage.id),
  ]))

  return (
    <section className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">
            Eliminación directa
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">Llaves por división</h2>
        </div>
        {canManage && (
          <button type="button" onClick={generateBracket}
            className="rounded-lg bg-[#b4ff45] px-4 py-2 font-bold text-[#07131e]">
            Generar llave
          </button>
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
                    <span className="mt-2 inline-block text-xs text-slate-500">{match.status === 'bye' ? 'Avance automático' : 'Pendiente'}</span>
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

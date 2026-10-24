// Formatos de liga (rugby): todos contra todos y liga con fase final.
// Arma los enfrentamientos, los reparte en fechas parejas y calcula horarios.

export const leagueFormats = {
  round_robin: 'Todos contra todos',
  league_playoffs: 'Liga + Fase final',
} as const
export type LeagueFormat = keyof typeof leagueFormats

export function isLeagueFormat(value?: string | null): value is LeagueFormat {
  return value === 'round_robin' || value === 'league_playoffs'
}

export type LeaguePairing = { divisionId: string; localTeamId: string; visitorTeamId: string }
export type LeagueDivision = { id: string; teamIds: string[] }

export function pairKey(left: string, right: string) {
  return [left, right].sort().join(':')
}

// Método del círculo: cada ronda enfrenta a todos los equipos una vez.
// En la vuelta par se invierten local y visitante.
export function roundRobinRounds(divisionId: string, teamIds: string[], legs = 1) {
  const rotation: (string | null)[] = [...teamIds]
  if (rotation.length < 2) return [] as LeaguePairing[][]
  if (rotation.length % 2 === 1) rotation.push(null)
  const base: LeaguePairing[][] = []
  for (let round = 0; round < rotation.length - 1; round += 1) {
    const pairings: LeaguePairing[] = []
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const first = rotation[index]
      const second = rotation[rotation.length - 1 - index]
      if (!first || !second) continue
      // Alterna la localía para que nadie sea siempre local.
      const flip = (round + index) % 2 === 1
      pairings.push(flip ? { divisionId, localTeamId: second, visitorTeamId: first } : { divisionId, localTeamId: first, visitorTeamId: second })
    }
    base.push(pairings)
    const last = rotation.pop()
    if (last !== undefined) rotation.splice(1, 0, last)
  }
  const rounds: LeaguePairing[][] = []
  for (let leg = 0; leg < legs; leg += 1) {
    for (const round of base) rounds.push(leg % 2 === 0 ? round : round.map((pairing) => ({ ...pairing, localTeamId: pairing.visitorTeamId, visitorTeamId: pairing.localTeamId })))
  }
  return rounds
}

// Lista ordenada de partidos pendientes: ronda por ronda, intercalando divisiones
// y descontando los enfrentamientos que ya se jugaron o programaron.
export function leaguePool(divisions: LeagueDivision[], legs: number, existing: LeaguePairing[] = []) {
  const used = new Map<string, number>()
  for (const pairing of existing) {
    const key = `${pairing.divisionId}|${pairKey(pairing.localTeamId, pairing.visitorTeamId)}`
    used.set(key, (used.get(key) || 0) + 1)
  }
  const perDivision = divisions.map((division) => roundRobinRounds(division.id, division.teamIds, legs))
  const longest = Math.max(0, ...perDivision.map((rounds) => rounds.length))
  const pool: LeaguePairing[] = []
  for (let round = 0; round < longest; round += 1) {
    for (const rounds of perDivision) {
      for (const pairing of rounds[round] || []) {
        const key = `${pairing.divisionId}|${pairKey(pairing.localTeamId, pairing.visitorTeamId)}`
        const pending = used.get(key) || 0
        if (pending > 0) { used.set(key, pending - 1); continue }
        pool.push(pairing)
      }
    }
  }
  return pool
}

// Reparte los partidos en fechas con la misma cantidad (o lo más pareja posible),
// sin pasar el máximo de partidos por equipo en un día.
export function splitIntoDates(pool: LeaguePairing[], matchesPerDate: number, maxPerTeam: number) {
  if (matchesPerDate < 1 || maxPerTeam < 1) return null
  const dates: LeaguePairing[][] = []
  let remaining = [...pool]
  while (remaining.length) {
    const datesLeft = Math.ceil(remaining.length / matchesPerDate)
    const target = Math.ceil(remaining.length / datesLeft)
    const counts = new Map<string, number>()
    const picked: LeaguePairing[] = []
    const rest = [...remaining]
    // En cada paso toma el partido de los equipos que menos han jugado en la fecha;
    // a igualdad, el que va antes en el orden de rondas.
    while (picked.length < target) {
      let best = -1
      let bestLoad = Infinity
      rest.forEach((pairing, index) => {
        const local = counts.get(pairing.localTeamId) || 0
        const visitor = counts.get(pairing.visitorTeamId) || 0
        if (local >= maxPerTeam || visitor >= maxPerTeam) return
        if (local + visitor < bestLoad) { bestLoad = local + visitor; best = index }
      })
      if (best < 0) break
      const [pairing] = rest.splice(best, 1)
      picked.push(pairing)
      counts.set(pairing.localTeamId, (counts.get(pairing.localTeamId) || 0) + 1)
      counts.set(pairing.visitorTeamId, (counts.get(pairing.visitorTeamId) || 0) + 1)
    }
    if (!picked.length) return null
    dates.push(picked)
    remaining = rest
  }
  return dates
}

function shares(left: LeaguePairing, right: LeaguePairing) {
  return [left.localTeamId, left.visitorTeamId].some((id) => id === right.localTeamId || id === right.visitorTeamId)
}

// Ordena los partidos de una fecha en tandas (una por cancha). Nadie juega dos
// veces en la misma tanda y, si no se permite, tampoco en tandas seguidas.
export function orderDate(matches: LeaguePairing[], courts: number, allowBackToBack: boolean) {
  const size = Math.max(1, courts)
  let visited = 0
  function fits(sequence: LeaguePairing[], candidate: LeaguePairing) {
    const position = sequence.length
    const block = Math.floor(position / size)
    return sequence.every((placed, index) => {
      const placedBlock = Math.floor(index / size)
      if (placedBlock === block) return !shares(placed, candidate)
      if (!allowBackToBack && placedBlock === block - 1) return !shares(placed, candidate)
      return true
    })
  }
  function search(sequence: LeaguePairing[], remaining: LeaguePairing[]): LeaguePairing[] | null {
    if (!remaining.length) return sequence
    visited += 1
    if (visited > 200000) return null
    const options = remaining.filter((candidate) => fits(sequence, candidate))
    // Primero los partidos con menos alternativas para cerrar antes los casos difíciles.
    options.sort((left, right) => remaining.filter((item) => item !== left && !shares(item, left)).length - remaining.filter((item) => item !== right && !shares(item, right)).length)
    for (const candidate of options) {
      const result = search([...sequence, candidate], remaining.filter((item) => item !== candidate))
      if (result) return result
    }
    return null
  }
  return search([], matches)
}

export type ScheduleTiming = {
  firstTime: string
  halfMinutes: number
  halftimeMinutes: number
  intervalMinutes: number
  courts: number
  // Recesos después de la tanda indicada (1 = después de la primera tanda).
  recesses: { afterBlock: number; minutes: number }[]
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function formatClock(total: number) {
  const value = ((total % 1440) + 1440) % 1440
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

// Horarios por tanda. Entre partidos se suma el intervalo; después de un receso
// el siguiente partido empieza al terminar el receso, sin intervalo adicional.
export function scheduleTimes(matchCount: number, timing: ScheduleTiming) {
  const courts = Math.max(1, timing.courts)
  const duration = timing.halfMinutes * 2 + timing.halftimeMinutes
  const blocks = Math.ceil(matchCount / courts)
  const slots: { time: string; court: number }[] = []
  const recesses: { time: string; minutes: number }[] = []
  let start = toMinutes(timing.firstTime)
  for (let block = 0; block < blocks; block += 1) {
    for (let court = 0; court < courts && slots.length < matchCount; court += 1) slots.push({ time: formatClock(start), court: court + 1 })
    const end = start + duration
    const recess = timing.recesses.find((item) => item.afterBlock === block + 1)
    if (recess && block < blocks - 1) {
      recesses.push({ time: formatClock(end), minutes: recess.minutes })
      start = end + recess.minutes
    } else start = end + timing.intervalMinutes
  }
  return { slots, recesses, endsAt: formatClock(start - timing.intervalMinutes) }
}

export type StandingRow = { teamId: string; played: number; wins: number; draws: number; losses: number; pointsFor: number; pointsAgainst: number; points: number }

// Tabla de rugby: victoria 4, empate 2, derrota 0. Desempata diferencia y puntos a favor.
export function leagueStandings(teamIds: string[], matches: { local_team_id: string; visitor_team_id: string; local_score: number; visitor_score: number; status: string }[], adjustments: Record<string, number> = {}) {
  return teamIds.map((teamId) => {
    const row: StandingRow = { teamId, played: 0, wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, points: adjustments[teamId] || 0 }
    for (const match of matches) {
      if (match.status !== 'finished' || (match.local_team_id !== teamId && match.visitor_team_id !== teamId)) continue
      const local = match.local_team_id === teamId
      const scored = local ? match.local_score : match.visitor_score
      const conceded = local ? match.visitor_score : match.local_score
      row.played += 1
      row.pointsFor += scored
      row.pointsAgainst += conceded
      if (scored > conceded) { row.wins += 1; row.points += 4 } else if (scored === conceded) { row.draws += 1; row.points += 2 } else row.losses += 1
    }
    return row
  }).sort((left, right) => right.points - left.points || (right.pointsFor - right.pointsAgainst) - (left.pointsFor - left.pointsAgainst) || right.pointsFor - left.pointsFor)
}

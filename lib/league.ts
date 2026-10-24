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

// Ordena los partidos de una fecha en tandas (una cancha por partido). Nadie juega
// dos veces en la misma tanda y, si no se permite, tampoco en tandas seguidas.
// Cuando hace falta para respetar el descanso, una cancha queda libre en esa tanda.
export function orderDate(matches: LeaguePairing[], courts: number, allowBackToBack: boolean) {
  const size = Math.max(1, courts)
  function build(order: LeaguePairing[]) {
    let remaining = [...order]
    const blocks: LeaguePairing[][] = []
    let previous = new Set<string>()
    while (remaining.length && blocks.length < order.length * 2 + 2) {
      // Primero los equipos con más partidos pendientes, para no dejarlos todos al final.
      const load = new Map<string, number>()
      for (const match of remaining) for (const id of [match.localTeamId, match.visitorTeamId]) load.set(id, (load.get(id) || 0) + 1)
      const candidates = remaining
        .map((match, index) => ({ match, index, weight: (load.get(match.localTeamId) || 0) + (load.get(match.visitorTeamId) || 0) }))
        .sort((left, right) => right.weight - left.weight || left.index - right.index)
      const block: LeaguePairing[] = []
      const used = new Set<string>()
      for (const { match } of candidates) {
        if (block.length >= size) break
        const ids = [match.localTeamId, match.visitorTeamId]
        if (ids.some((id) => used.has(id))) continue
        if (!allowBackToBack && ids.some((id) => previous.has(id))) continue
        block.push(match)
        ids.forEach((id) => used.add(id))
      }
      remaining = remaining.filter((match) => !block.includes(match))
      blocks.push(block)
      previous = used
    }
    return blocks
  }
  const cost = (blocks: LeaguePairing[][]) => blocks.length * 100 + blocks.reduce((total, block) => total + size - block.length, 0)
  let best = build(matches)
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const order = [...matches]
    for (let index = order.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1))
      ;[order[index], order[swap]] = [order[swap], order[index]]
    }
    const candidate = build(order)
    if (cost(candidate) < cost(best)) best = candidate
  }
  return best
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
// Recibe cuántos partidos hay en cada tanda (una tanda vacía es un descanso).
export function scheduleBlocks(blockSizes: number[], timing: ScheduleTiming) {
  const duration = timing.halfMinutes * 2 + timing.halftimeMinutes
  const slots: { time: string; court: number; block: number }[] = []
  const recesses: { time: string; minutes: number }[] = []
  let start = toMinutes(timing.firstTime)
  blockSizes.forEach((count, block) => {
    for (let court = 0; court < count; court += 1) slots.push({ time: formatClock(start), court: court + 1, block })
    const end = start + duration
    const recess = timing.recesses.find((item) => item.afterBlock === block + 1)
    if (recess && block < blockSizes.length - 1) {
      recesses.push({ time: formatClock(end), minutes: recess.minutes })
      start = end + recess.minutes
    } else start = end + timing.intervalMinutes
  })
  return { slots, recesses, endsAt: formatClock(start - timing.intervalMinutes) }
}

export function scheduleTimes(matchCount: number, timing: ScheduleTiming) {
  const courts = Math.max(1, timing.courts)
  const sizes = Array.from({ length: Math.ceil(matchCount / courts) }, (_, block) => Math.min(courts, matchCount - block * courts))
  return scheduleBlocks(sizes, timing)
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

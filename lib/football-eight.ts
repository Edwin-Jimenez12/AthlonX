export const footballEight = {
  maxTeams: 16,
  maxRosterSize: 15,
  playersOnField: 8,
  substitutionsUnlimited: true,
  halfMinutes: 20,
  halftimeMinutes: 5,
  extraMinutes: 10,
  format: 'knockout',
} as const

type FootballEightScoringEvent = {
  teamId?: string | null
  eventType: string
  points?: number | null
  isCorrected?: boolean
}

// Calcula el marcador oficial usando únicamente los eventos de fútbol.
export function footballEightScoreFromEvents(
  events: FootballEightScoringEvent[],
  localTeamId: string,
  visitorTeamId: string,
) {
  return events.reduce(
    (score, event) => {
      if (
        event.isCorrected
        || !['goal', 'penalty_kick'].includes(event.eventType)
      ) {
        return score
      }

      const points = event.points || 0
      if (event.teamId === localTeamId) score.local += points
      if (event.teamId === visitorTeamId) score.visitor += points
      return score
    },
    { local: 0, visitor: 0 },
  )
}

export function footballEightNextPhase(period: string, paused: boolean, tied: boolean) {
  if (period === 'first_half') return 'halftime'
  if (period === 'second_half' && paused) return 'second_half'
  if (period === 'second_half') return tied ? 'extra_time_ready' : 'finished'
  if (period === 'extra_first_half' && paused) return 'extra_time'
  if (period === 'extra_first_half') return tied ? 'penalty_shootout' : 'finished'
  return 'penalty_shootout'
}

export function shootoutWinner(local: number | null | undefined, visitor: number | null | undefined) {
  if (!Number.isInteger(local) || !Number.isInteger(visitor) || local! < 0 || visitor! < 0 || local === visitor) return null
  return local! > visitor! ? 'local' : 'visitor'
}

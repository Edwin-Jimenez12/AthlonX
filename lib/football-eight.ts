export const footballEight = {
  maxTeams: 16,
  halfMinutes: 20,
  halftimeMinutes: 5,
  extraMinutes: 10,
  format: 'knockout',
} as const

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

// Reloj y fases de un partido: lógica común a todos los deportes.
// Cada deporte solo declara qué fases tiene en `sportClocks`; las acciones de
// marcador (try, gol, canasta) y las reglas propias siguen en el módulo de cada deporte.

export type ClockPhaseKey = 'first_half' | 'second_half' | 'extra_time' | 'shootout' | 'overtime'
export type ClockPhase = { key: ClockPhaseKey; label?: string }
export type SportClockKey = 'football8' | 'rugby' | 'basketball'

export type ClockState = {
  status: string
  period?: string | null
  matchPhase?: string | null
  isPaused?: boolean | null
  hasShootoutScore?: boolean
}
export type PhaseStep = { label: string; done: boolean; current: boolean }

const defaultLabels: Record<ClockPhaseKey, string> = {
  first_half: '1.º tiempo',
  second_half: '2.º tiempo',
  extra_time: 'Tiempo extra',
  shootout: 'Penales',
  overtime: 'Prórroga',
}

// Baloncesto 3x3 mapea su periodo único y sus bloques de prórroga a first_half y extra_time.
export const sportClocks: Record<SportClockKey, ClockPhase[]> = {
  football8: [{ key: 'first_half' }, { key: 'second_half' }, { key: 'extra_time' }, { key: 'shootout' }],
  rugby: [{ key: 'first_half' }, { key: 'second_half' }, { key: 'overtime' }],
  basketball: [{ key: 'first_half', label: 'Periodo' }, { key: 'extra_time', label: 'Prórroga' }],
}

export function phaseSteps(phases: ClockPhase[], state: ClockState): PhaseStep[] {
  const period = String(state.period ?? 'first_half')
  const phase = state.matchPhase ?? 'regular'
  const finished = state.status === 'finished'
  const live = state.status === 'live'
  const inExtraPeriod = period.startsWith('extra_')
  return phases.map(({ key, label }) => {
    const text = label ?? defaultLabels[key]
    if (key === 'first_half') return { label: text, done: period !== 'first_half' || finished, current: live && period === 'first_half' }
    if (key === 'second_half') return { label: text, done: inExtraPeriod || phase !== 'regular' || finished, current: live && period === 'second_half' && phase === 'regular' }
    if (key === 'extra_time') return { label: text, done: phase === 'penalty_shootout', current: live && inExtraPeriod && phase === 'extra_time' }
    if (key === 'shootout') return { label: text, done: Boolean(state.hasShootoutScore) && finished, current: live && phase === 'penalty_shootout' }
    return { label: text, done: phase === 'overtime_finished', current: live && phase === 'overtime' }
  })
}

// El descanso es el 2.º tiempo en pausa: el reloj cuenta la duración configurada.
export function isHalftime(state: ClockState) {
  return state.status === 'live' && Boolean(state.isPaused) && String(state.period ?? '') === 'second_half'
}

export function periodActionLabel(period?: string | null, isPaused?: boolean | null) {
  const value = String(period ?? 'first_half')
  if (value.startsWith('extra_')) return isPaused ? 'Iniciar tiempo extra' : 'Terminar tiempo extra'
  if (value === 'second_half') return isPaused ? 'Iniciar 2.º tiempo' : 'Terminar 2.º tiempo'
  return 'Terminar 1.er tiempo'
}

// Segundos que faltan si se quiere cortar un tiempo regular antes de que termine; null si no aplica.
export function earlyFinishRemaining(period: string | null | undefined, isPaused: boolean | null | undefined, elapsedSeconds: number, limitSeconds: number) {
  if (String(period ?? 'first_half').startsWith('extra_') || isPaused || elapsedSeconds >= limitSeconds) return null
  return limitSeconds - elapsedSeconds
}

export function clockText(totalSeconds: number) {
  const value = Math.max(0, Math.floor(totalSeconds))
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

export function matchClockLabel(args: {
  status: string
  scheduledTime?: string | null
  matchPhase?: string | null
  isPaused?: boolean | null
  inShootout: boolean
  isHalftime: boolean
  breakTimer: string
  periodLabel: string
  timer: string
}) {
  if (args.status === 'scheduled') return `Programado${args.scheduledTime ? ` · ${args.scheduledTime.slice(0, 5)}` : ''}`
  if (args.matchPhase === 'overtime') return `Prórroga · ${args.timer}`
  if (args.status === 'finished') return 'Final'
  if (args.inShootout) return 'Tanda de penales'
  if (args.isHalftime) return `Descanso · ${args.breakTimer}`
  if (args.isPaused) return `Pausado · ${args.periodLabel}`
  return `${args.periodLabel[0].toUpperCase()}${args.periodLabel.slice(1)} · ${args.timer}`
}

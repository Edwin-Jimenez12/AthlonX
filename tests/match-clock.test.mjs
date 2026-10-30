import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../lib/match-clock.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const {
  sportClocks,
  phaseSteps,
  isHalftime,
  periodActionLabel,
  earlyFinishRemaining,
  clockText,
  matchClockLabel,
} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

const labels = (steps) => steps.map((step) => step.label)
const current = (steps) => steps.filter((step) => step.current).map((step) => step.label)
const done = (steps) => steps.filter((step) => step.done).map((step) => step.label)

test('fútbol 8 conserva sus cuatro fases', () => {
  const steps = phaseSteps(sportClocks.football8, { status: 'live', period: 'first_half', matchPhase: 'regular' })
  assert.deepEqual(labels(steps), ['1.º tiempo', '2.º tiempo', 'Tiempo extra', 'Penales'])
  assert.deepEqual(current(steps), ['1.º tiempo'])
})

test('fútbol 8 marca tiempo extra y penales', () => {
  const extra = phaseSteps(sportClocks.football8, { status: 'live', period: 'extra_first_half', matchPhase: 'extra_time' })
  assert.deepEqual(current(extra), ['Tiempo extra'])
  assert.deepEqual(done(extra), ['1.º tiempo', '2.º tiempo'])
  const penalties = phaseSteps(sportClocks.football8, { status: 'live', period: 'extra_first_half', matchPhase: 'penalty_shootout' })
  assert.deepEqual(current(penalties), ['Penales'])
  const finished = phaseSteps(sportClocks.football8, { status: 'finished', period: 'extra_first_half', matchPhase: 'penalty_shootout', hasShootoutScore: true })
  assert.deepEqual(done(finished), ['1.º tiempo', '2.º tiempo', 'Tiempo extra', 'Penales'])
})

test('rugby usa 1.º tiempo, 2.º tiempo y prórroga, sin tiempo extra ni penales', () => {
  const regular = phaseSteps(sportClocks.rugby, { status: 'live', period: 'second_half', matchPhase: 'regular' })
  assert.deepEqual(labels(regular), ['1.º tiempo', '2.º tiempo', 'Prórroga'])
  assert.deepEqual(current(regular), ['2.º tiempo'])
  const overtime = phaseSteps(sportClocks.rugby, { status: 'live', period: 'extra_first_half', matchPhase: 'overtime' })
  assert.deepEqual(current(overtime), ['Prórroga'])
  assert.deepEqual(done(overtime), ['1.º tiempo', '2.º tiempo'])
  const decided = phaseSteps(sportClocks.rugby, { status: 'finished', period: 'extra_first_half', matchPhase: 'overtime_finished' })
  assert.deepEqual(done(decided), ['1.º tiempo', '2.º tiempo', 'Prórroga'])
})

test('baloncesto muestra periodo y prórroga', () => {
  const regular = phaseSteps(sportClocks.basketball, { status: 'live', period: 'first_half', matchPhase: 'regular' })
  assert.deepEqual(labels(regular), ['Periodo', 'Prórroga'])
  assert.deepEqual(current(regular), ['Periodo'])
  const extra = phaseSteps(sportClocks.basketball, { status: 'live', period: 'extra_first_half', matchPhase: 'extra_time' })
  assert.deepEqual(current(extra), ['Prórroga'])
  assert.deepEqual(done(extra), ['Periodo'])
})

test('el descanso es el segundo tiempo en pausa', () => {
  assert.equal(isHalftime({ status: 'live', period: 'second_half', isPaused: true }), true)
  assert.equal(isHalftime({ status: 'live', period: 'second_half', isPaused: false }), false)
  assert.equal(isHalftime({ status: 'live', period: 'first_half', isPaused: true }), false)
  assert.equal(isHalftime({ status: 'finished', period: 'second_half', isPaused: true }), false)
})

test('etiqueta del botón de periodo', () => {
  assert.equal(periodActionLabel('first_half', false), 'Terminar 1.er tiempo')
  assert.equal(periodActionLabel('second_half', true), 'Iniciar 2.º tiempo')
  assert.equal(periodActionLabel('second_half', false), 'Terminar 2.º tiempo')
  assert.equal(periodActionLabel('extra_first_half', true), 'Iniciar tiempo extra')
  assert.equal(periodActionLabel('extra_first_half', false), 'Terminar tiempo extra')
})

test('aviso de cierre anticipado', () => {
  assert.equal(earlyFinishRemaining('first_half', false, 100, 420), 320)
  assert.equal(earlyFinishRemaining('second_half', false, 420, 420), null)
  assert.equal(earlyFinishRemaining('second_half', true, 0, 420), null)
  assert.equal(earlyFinishRemaining('extra_first_half', false, 10, 420), null)
})

test('formato de reloj y etiqueta del marcador', () => {
  assert.equal(clockText(75), '01:15')
  assert.equal(clockText(-5), '00:00')
  const base = { status: 'live', matchPhase: 'regular', isPaused: false, inShootout: false, isHalftime: false, breakTimer: '01:30', periodLabel: 'segundo tiempo', timer: '03:10' }
  assert.equal(matchClockLabel(base), 'Segundo tiempo · 03:10')
  assert.equal(matchClockLabel({ ...base, isHalftime: true, isPaused: true }), 'Descanso · 01:30')
  assert.equal(matchClockLabel({ ...base, isPaused: true }), 'Pausado · segundo tiempo')
  assert.equal(matchClockLabel({ ...base, matchPhase: 'overtime' }), 'Prórroga · 03:10')
  assert.equal(matchClockLabel({ ...base, status: 'finished' }), 'Final')
  assert.equal(matchClockLabel({ ...base, status: 'scheduled', scheduledTime: '12:00:00' }), 'Programado · 12:00')
})

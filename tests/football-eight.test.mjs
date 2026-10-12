import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../lib/football-eight.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { footballEight, footballEightNextPhase: next, shootoutWinner } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('fútbol 8 termina sin prórroga cuando hay ganador al finalizar el segundo tiempo', () => {
  assert.equal(next('first_half', false, false), 'halftime')
  assert.equal(next('second_half', true, false), 'second_half')
  assert.equal(next('second_half', false, false), 'finished')
})

test('un empate requiere un bloque de 10 minutos antes de los penales', () => {
  assert.equal(footballEight.extraMinutes, 10)
  assert.equal(next('second_half', false, true), 'extra_time_ready')
  assert.equal(next('extra_first_half', true, true), 'extra_time')
  assert.equal(next('extra_first_half', false, true), 'penalty_shootout')
  assert.equal(next('extra_first_half', false, false), 'finished')
})

test('el ganador de penales requiere marcadores válidos y diferentes', () => {
  for (const scores of [[null, null], [undefined, 2], [2, 2], [-1, 2], [1.5, 2]]) {
    assert.equal(shootoutWinner(...scores), null)
  }
  assert.equal(shootoutWinner(5, 4), 'local')
  assert.equal(shootoutWinner(0, 1), 'visitor')
})

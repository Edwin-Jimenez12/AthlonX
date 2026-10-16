import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../lib/basketball.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { basketballSchedule, validateBasketballSettings, basketballElapsed, basketballCanFinish, basketballScore, basketballStandings, basketballShuffle } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const settings = { period_minutes: 17, interval_minutes: 4, overtime_minutes: 3, opens_at: '08:30', closes_at: '17:00', venue: 'UTP' }

test('los 15 partidos usan el periodo e intervalo configurados y mantienen una secuencia entre rondas', () => {
  const slots = basketballSchedule(settings)
  assert.equal(slots.length, 15)
  assert.deepEqual([1,2,3,4].map(r => slots.filter(s => s.round === r).length), [8,4,2,1])
  assert.equal(slots[8].time, '11:18')
  assert.equal(slots[14].time, '13:24')
  assert.notEqual(basketballSchedule({ ...settings, period_minutes: 9 })[14].time, slots[14].time)
})
test('revisa tiempos vacíos, inválidos y jornadas sin espacio para 15 partidos', () => {
  assert.equal(validateBasketballSettings(settings), '')
  for (const change of [{ period_minutes: 0 }, { overtime_minutes: 0 }, { interval_minutes: -1 }, { period_minutes: 1.5 }, { opens_at: '08:75' }, { opens_at: '23:00', closes_at: '23:59' }]) assert.ok(validateBasketballSettings({ ...settings, ...change }))
})
test('puntuación de básquet aislada: interior 1, exterior 2, libre 1; faltas y correcciones no suman', () => {
  const score = basketballScore([
    { team_id: 'a', event_type: 'basket_inside', points: 1 }, { team_id: 'a', event_type: 'basket_outside', points: 2 },
    { team_id: 'b', event_type: 'basket_free_throw', points: 1 }, { team_id: 'b', event_type: 'basket_foul', points: 0 },
    { team_id: 'a', event_type: 'try', points: 5 }, { team_id: 'b', event_type: 'goal', points: 1 },
    { team_id: 'b', event_type: 'basket_outside', points: 2, is_corrected: true },
  ], 'a', 'b')
  assert.deepEqual(score, { local: 3, visitor: 1 })
})
test('el reloj suma tiempo persistido, se pausa y exige terminar el único periodo', () => {
  const m = { id: '1', local_team_id: 'a', visitor_team_id: 'b', local_score: 4, visitor_score: 3, status: 'live', elapsed_seconds: 13, is_paused: false, started_at: '2026-10-16T13:00:00Z', match_phase: 'regular' }
  assert.equal(basketballElapsed(m, Date.parse(m.started_at) + 12000), 25)
  assert.equal(basketballElapsed({ ...m, is_paused: true }, Date.parse(m.started_at) + 12000), 13)
  assert.equal(basketballCanFinish(m, settings, 17 * 60 - 1), false)
  assert.equal(basketballCanFinish(m, settings, 17 * 60), true)
  assert.equal(basketballCanFinish({ ...m, visitor_score: 4 }, settings, 2000), false)
})
test('la prórroga termina por ventaja de dos y continúa aunque se agote un bloque sin esa ventaja', () => {
  const m = { local_score: 10, visitor_score: 9, match_phase: 'extra_time' }
  assert.equal(basketballCanFinish(m, settings, 10000), false)
  assert.equal(basketballCanFinish({ ...m, local_score: 11 }, settings, 12), true)
  assert.equal(basketballCanFinish({ ...m, local_score: 9, visitor_score: 11 }, settings, 12), true)
})
test('clasificación 1, 2, 3 compartido, 5 compartido y 9 compartido, sin desempatar por marcador', () => {
  const teams = Array.from({ length: 16 }, (_, i) => ({ id: String(i+1), name: `Equipo ${i+1}`, division_id: 'd' }))
  const stages = [1,2,3,4].map(r => ({ id: `s${r}`, round_number: r, name: String(r) }))
  const bracket = [], current = teams.map(t => t.id)
  for (let r=1; r<=4; r++) {
    const winners = []
    for (let i=0; i<current.length; i+=2) { bracket.push({ id: `${r}-${i}`, stage_id: `s${r}`, position: i/2+1, local_team_id: current[i], visitor_team_id: current[i+1], winner_team_id: current[i], source_match_id: null }); winners.push(current[i]) }
    current.splice(0,current.length,...winners)
  }
  const ranks = basketballStandings(teams, stages, bracket).map(t => t.rank)
  assert.deepEqual(ranks, [1,2,3,3,5,5,5,5,9,9,9,9,9,9,9,9])
  assert.equal(bracket.length, 15)
})
test('el sorteo no modifica la entrada ni pierde o duplica equipos', () => {
  const ids = Array.from({ length: 16 }, (_, i) => String(i))
  const original = [...ids], shuffled = basketballShuffle(ids)
  assert.deepEqual(ids, original)
  assert.deepEqual([...shuffled].sort(), [...ids].sort())
})

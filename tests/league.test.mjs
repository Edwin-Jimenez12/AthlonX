import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../lib/league.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { roundRobinRounds, leaguePool, splitIntoDates, orderDate, scheduleTimes, leagueStandings, pairKey } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

const teams = (count) => Array.from({ length: count }, (_, index) => `t${index + 1}`)
function pairCounts(pairings) {
  const counts = new Map()
  for (const pairing of pairings) counts.set(pairKey(pairing.localTeamId, pairing.visitorTeamId), (counts.get(pairKey(pairing.localTeamId, pairing.visitorTeamId)) || 0) + 1)
  return counts
}

test('una vuelta enfrenta a cada pareja una sola vez, con equipos pares e impares', () => {
  for (const count of [4, 5, 6, 7, 8]) {
    const pool = roundRobinRounds('d', teams(count), 1).flat()
    assert.equal(pool.length, count * (count - 1) / 2)
    assert.ok([...pairCounts(pool).values()].every((value) => value === 1))
  }
})

test('ida y vuelta repite cada pareja con la localía invertida', () => {
  const pool = roundRobinRounds('d', teams(5), 2).flat()
  assert.equal(pool.length, 20)
  for (const [key, value] of pairCounts(pool)) {
    assert.equal(value, 2, key)
    const [a, b] = key.split(':')
    assert.ok(pool.some((p) => p.localTeamId === a && p.visitorTeamId === b))
    assert.ok(pool.some((p) => p.localTeamId === b && p.visitorTeamId === a))
  }
})

test('las fechas quedan parejas, respetan el máximo por equipo y todos completan sus partidos', () => {
  const pool = leaguePool([{ id: 'd', teamIds: teams(5) }], 2)
  const dates = splitIntoDates(pool, 6, 3)
  assert.deepEqual(dates.map((date) => date.length), [5, 5, 5, 5])
  for (const date of dates) {
    const perTeam = new Map()
    for (const p of date) for (const id of [p.localTeamId, p.visitorTeamId]) perTeam.set(id, (perTeam.get(id) || 0) + 1)
    assert.ok([...perTeam.values()].every((value) => value <= 3))
  }
  const totals = new Map()
  for (const p of dates.flat()) for (const id of [p.localTeamId, p.visitorTeamId]) totals.set(id, (totals.get(id) || 0) + 1)
  assert.ok([...totals.values()].every((value) => value === 8))
})

test('dentro de una fecha nadie se queda sin jugar mientras otro juega de más', () => {
  const dates = splitIntoDates(leaguePool([{ id: 'd', teamIds: teams(6) }], 2), 5, 2)
  for (const date of dates.slice(0, -1)) {
    const perTeam = new Map(teams(6).map((id) => [id, 0]))
    for (const p of date) for (const id of [p.localTeamId, p.visitorTeamId]) perTeam.set(id, perTeam.get(id) + 1)
    assert.ok(Math.max(...perTeam.values()) - Math.min(...perTeam.values()) <= 1)
  }
})

test('descuenta los enfrentamientos que ya existen', () => {
  const existing = [{ divisionId: 'd', localTeamId: 't2', visitorTeamId: 't1' }]
  const pool = leaguePool([{ id: 'd', teamIds: teams(4) }], 1, existing)
  assert.equal(pool.length, 5)
  assert.ok(!pool.some((p) => pairKey(p.localTeamId, p.visitorTeamId) === 't1:t2'))
})

test('sin partidos seguidos nadie juega en tandas consecutivas; con canchas nadie juega dos veces en la misma tanda', () => {
  const ids = (block) => block.flatMap((p) => [p.localTeamId, p.visitorTeamId])
  const date = roundRobinRounds('d', teams(5), 1).flat().slice(0, 5)
  const blocks = orderDate(date, 1, false)
  assert.equal(blocks.flat().length, 5)
  for (let i = 1; i < blocks.length; i += 1) assert.ok(!ids(blocks[i]).some((id) => ids(blocks[i - 1]).includes(id)))
  const six = roundRobinRounds('d', teams(6), 1).flat().slice(0, 6)
  for (const block of orderDate(six, 2, true)) assert.equal(new Set(ids(block)).size, ids(block).length)
})

test('3 divisiones de 3 equipos en 2 canchas: nadie juega seguido, dejando una cancha libre si hace falta', () => {
  const divisions = ['A', 'B', 'C'].map((d) => ({ id: d, teamIds: [`${d}1`, `${d}2`, `${d}3`] }))
  const pool = leaguePool(divisions, 1)
  const ids = (block) => block.flatMap((p) => [p.localTeamId, p.visitorTeamId])
  const blocks = orderDate(pool.slice(0, 6), 2, false)
  assert.equal(blocks.flat().length, 6)
  for (const block of blocks) assert.ok(block.length <= 2 && new Set(ids(block)).size === ids(block).length)
  for (let i = 1; i < blocks.length; i += 1) assert.ok(!ids(blocks[i]).some((id) => ids(blocks[i - 1]).includes(id)))
})

test('el receso reemplaza al intervalo: termina 08:00, receso de 60 y el siguiente empieza 09:00', () => {
  const { slots, recesses } = scheduleTimes(3, { firstTime: '07:44', halfMinutes: 7, halftimeMinutes: 2, intervalMinutes: 10, courts: 1, recesses: [{ afterBlock: 1, minutes: 60 }] })
  assert.deepEqual(slots.map((s) => s.time), ['07:44', '09:00', '09:26'])
  assert.deepEqual(recesses, [{ time: '08:00', minutes: 60 }])
  const parallel = scheduleTimes(4, { firstTime: '08:00', halfMinutes: 7, halftimeMinutes: 2, intervalMinutes: 10, courts: 2, recesses: [] })
  assert.deepEqual(parallel.slots.map(({ time, court }) => ({ time, court })), [{ time: '08:00', court: 1 }, { time: '08:00', court: 2 }, { time: '08:26', court: 1 }, { time: '08:26', court: 2 }])
})

test('la tabla de rugby da 4 por victoria, 2 por empate y aplica ajustes', () => {
  const rows = leagueStandings(['a', 'b', 'c'], [
    { local_team_id: 'a', visitor_team_id: 'b', local_score: 20, visitor_score: 5, status: 'finished' },
    { local_team_id: 'b', visitor_team_id: 'c', local_score: 10, visitor_score: 10, status: 'finished' },
    { local_team_id: 'a', visitor_team_id: 'c', local_score: 0, visitor_score: 0, status: 'scheduled' },
  ], { c: -2 })
  assert.deepEqual(rows.map((r) => [r.teamId, r.points]), [['a', 4], ['b', 2], ['c', 0]])
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../lib/basketball.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { basketballSummaryGames, basketballChampionId, basketballUpcoming, basketballRecent, basketballFeatured } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

const stages = [
  { id: 's1', round_number: 1, name: 'Octavos de final' },
  { id: 's2', round_number: 2, name: 'Cuartos de final' },
  { id: 's3', round_number: 3, name: 'Semifinales' },
  { id: 's4', round_number: 4, name: 'Final' },
]
const slots = [
  { round: 1, position: 1, time: '08:00' }, { round: 1, position: 2, time: '08:11' },
  { round: 2, position: 1, time: '09:00' }, { round: 4, position: 1, time: '11:00' },
]
const bracket = [
  { id: 'b1', stage_id: 's1', position: 1, local_team_id: 'A', visitor_team_id: 'B', winner_team_id: 'A', source_match_id: 'm1' },
  { id: 'b2', stage_id: 's1', position: 2, local_team_id: 'C', visitor_team_id: 'D', winner_team_id: null, source_match_id: 'm2' },
  { id: 'b3', stage_id: 's2', position: 1, local_team_id: 'A', visitor_team_id: 'C', winner_team_id: null, source_match_id: null },
  { id: 'b4', stage_id: 's4', position: 1, local_team_id: null, visitor_team_id: null, winner_team_id: null, source_match_id: null },
]
const matches = [
  { id: 'm1', local_team_id: 'A', visitor_team_id: 'B', local_score: 15, visitor_score: 9, status: 'finished', scheduled_time: null },
  { id: 'm2', local_team_id: 'C', visitor_team_id: 'D', local_score: 0, visitor_score: 0, status: 'scheduled', scheduled_time: '08:11:00' },
]

test('une cada partido de la llave con su ronda, hora y equipos', () => {
  const games = basketballSummaryGames(slots, stages, bracket, matches)
  assert.equal(games.length, 2)
  assert.deepEqual(games.map((g) => [g.stageName, g.position, g.time]), [['Octavos de final', 1, '08:00'], ['Octavos de final', 2, '08:11']])
  assert.equal(games[1].localId, 'C')
})

test('solo cuenta partidos que ya existen en la llave', () => {
  const games = basketballSummaryGames(slots, stages, bracket, [matches[0]])
  assert.equal(games.length, 1)
})

test('próximos y últimos resultados se separan por estado', () => {
  const games = basketballSummaryGames(slots, stages, bracket, matches)
  assert.deepEqual(basketballUpcoming(games).map((g) => g.match.id), ['m2'])
  assert.deepEqual(basketballRecent(games).map((g) => g.match.id), ['m1'])
})

test('el partido destacado es el que está en juego, o el próximo', () => {
  const live = [...matches.slice(0, 1), { ...matches[1], status: 'live' }]
  assert.equal(basketballFeatured(basketballSummaryGames(slots, stages, bracket, live)).match.id, 'm2')
  assert.equal(basketballFeatured(basketballSummaryGames(slots, stages, bracket, matches)).match.id, 'm2')
  assert.equal(basketballFeatured(basketballSummaryGames(slots, stages, bracket, [matches[0]])), null)
})

test('el campeón sale del ganador de la final', () => {
  assert.equal(basketballChampionId(stages, bracket), null)
  const decided = bracket.map((b) => (b.stage_id === 's4' ? { ...b, winner_team_id: 'A' } : b))
  assert.equal(basketballChampionId(stages, decided), 'A')
})

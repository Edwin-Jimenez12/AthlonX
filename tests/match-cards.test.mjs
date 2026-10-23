import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

async function load(file) {
  const source = readFileSync(new URL(`../lib/${file}`, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}
const { rugbySinBinSeconds, rugbyActiveSinBins } = await load('rugby.ts')
const { footballPlayerCards, footballNextYellowIsRed } = await load('football.ts')

test('la amarilla de rugby expulsa 2 minutos en sevens y 10 en XV', () => {
  assert.equal(rugbySinBinSeconds('seven'), 120)
  assert.equal(rugbySinBinSeconds('xv'), 600)
  assert.equal(rugbySinBinSeconds(null), 600)
})

test('la expulsión temporal corre con el reloj del partido y termina al cumplirse', () => {
  const now = Date.parse('2026-10-23T15:00:00Z')
  const created_at = '2026-10-23T14:59:30Z'
  const events = [
    { player_id: 'p1', event_type: 'yellow_card', match_second: 300, created_at },
    { player_id: 'p2', event_type: 'yellow_card', match_second: 300, created_at, is_corrected: true },
    { player_id: 'p3', event_type: 'red_card', match_second: 300, created_at },
  ]
  const active = rugbyActiveSinBins(events, 330, 120, now)
  assert.equal(active.length, 1)
  assert.equal(active[0].remaining, 90)
  assert.equal(rugbyActiveSinBins(events, 420, 120, now).length, 0)
  // Una tarjeta del primer tiempo no reaparece cuando el reloj del segundo vuelve a ese minuto.
  assert.equal(rugbyActiveSinBins(events, 330, 120, now + 60 * 60 * 1000).length, 0)
})

test('en fútbol la segunda amarilla equivale a una roja', () => {
  const events = [{ player_id: 'p1', event_type: 'yellow_card' }]
  assert.equal(footballNextYellowIsRed(events, 'p1'), true)
  assert.equal(footballNextYellowIsRed(events, 'p2'), false)
  assert.deepEqual(footballPlayerCards([...events, { player_id: 'p1', event_type: 'yellow_card' }], 'p1'), { yellows: 2, sentOff: true })
  assert.deepEqual(footballPlayerCards([{ player_id: 'p1', event_type: 'yellow_card', is_corrected: true }], 'p1'), { yellows: 0, sentOff: false })
})

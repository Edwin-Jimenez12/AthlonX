import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../lib/athlete-calendar.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const cal = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

const item = (over) => ({ source: 'team', id: '1', owner_id: null, owner_name: null, title: 'x', description: null, location: null,
  event_type: 'training', starts_at: '2026-11-03T22:30:00Z', ends_at: '2026-11-03T23:30:00Z', all_day: false, occurrence: 0,
  repeat_rule: 'none', my_response: null, ...over })

test('la vista semana va del lunes al lunes siguiente', () => {
  const wed = new Date(2026, 10, 4, 10, 0) // miércoles 4 nov 2026
  const { from, to } = cal.rangeFor('semana', wed)
  assert.equal(from.getDay(), 1)
  assert.equal(from.getDate(), 2)
  assert.equal(to.getDate(), 9)
})

test('la cuadrícula del mes tiene 42 celdas que empiezan en lunes', () => {
  const days = cal.monthGridDays(new Date(2026, 10, 2))
  assert.equal(days.length, 42)
  assert.equal(days[0].getDay(), 1)
})

test('cada evento se clasifica según su origen y tipo', () => {
  assert.equal(cal.itemKind(item({ event_type: 'match' })), 'partido')
  assert.equal(cal.itemKind(item({ event_type: 'training' })), 'entrenamiento')
  assert.equal(cal.itemKind(item({ source: 'organization' })), 'organizacion')
  assert.equal(cal.itemKind(item({ source: 'personal', event_type: 'personal' })), 'personal')
})

test('los filtros separan partidos, entrenamientos, personales y organización', () => {
  const personal = item({ source: 'personal', event_type: 'personal' })
  assert.equal(cal.matchesFilter(personal, 'personales'), true)
  assert.equal(cal.matchesFilter(personal, 'partidos'), false)
  assert.equal(cal.matchesFilter(item({ event_type: 'match' }), 'todos'), true)
})

test('la agenda agrupa por día local y ordena por hora', () => {
  const groups = cal.groupByDay([item({ id: 'b', starts_at: '2026-11-03T15:00:00' }), item({ id: 'a', starts_at: '2026-11-03T09:00:00' })])
  const [first] = [...groups.values()]
  assert.deepEqual(first.map((i) => i.id), ['a', 'b'])
})

test('el filtro Todos los equipos muestra solo eventos de equipos', () => {
  assert.equal(cal.matchesFilter(item({ source: 'team' }), 'equipos'), true)
  assert.equal(cal.matchesFilter(item({ source: 'organization' }), 'equipos'), false)
})

test('hay choque cuando dos eventos usan el mismo lugar a la misma hora', () => {
  const a = item({ id: 'a', location: 'Cancha 2', starts_at: '2026-11-14T15:00:00Z', ends_at: '2026-11-14T16:30:00Z' })
  const b = item({ id: 'b', location: ' cancha 2 ', starts_at: '2026-11-14T16:00:00Z', ends_at: '2026-11-14T17:00:00Z' })
  const c = item({ id: 'c', location: 'Cancha 1', starts_at: '2026-11-14T16:00:00Z', ends_at: '2026-11-14T17:00:00Z' })
  const d = item({ id: 'd', location: 'Cancha 2', starts_at: '2026-11-14T16:30:00Z', ends_at: '2026-11-14T17:30:00Z' })
  const clashes = cal.findClashes([a, b, c, d])
  assert.deepEqual(clashes.map((x) => `${x.first.id}-${x.second.id}`), ['a-b', 'b-d'])
})

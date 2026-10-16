import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'

const relative = 'app/(panel)/torneos/ver/[id]/page.tsx'
const before = execFileSync('git', ['show', `HEAD:${relative}`], { encoding: 'utf8' })
const after = readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8')
function generators(source) {
  const tree = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const names = ['shuffle', 'buildRoundRobinRounds', 'buildFootballDivisionSchedule', 'buildRugbyDivisionSchedule']
  const functions = tree.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text)).map(n => n.getText(tree)).join('\n')
  const { outputText } = ts.transpileModule(`${functions}\nglobalThis.generators={football:buildFootballDivisionSchedule,rugby:buildRugbyDivisionSchedule}`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } })
  let seed = 12345
  const seededMath = Object.create(Math)
  seededMath.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32 }
  const context = { Math: seededMath }
  runInNewContext(outputText, context)
  return context.generators
}
for (const sport of ['football', 'rugby']) test(`el calendario de ${sport} conserva el comportamiento anterior con equipos pares e impares`, () => {
  for (const [count, perTeam, dates] of [[4,1,1], [6,2,2], [5,2,2], [4,0,2]]) {
    const teams = Array.from({ length: count }, (_, i) => `team-${i}`)
    const original = generators(before)[sport]('division', teams, perTeam, dates)
    const current = generators(after)[sport]('division', teams, perTeam, dates)
    assert.deepEqual(JSON.parse(JSON.stringify(current)), JSON.parse(JSON.stringify(original)))
  }
})

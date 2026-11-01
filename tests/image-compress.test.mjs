import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../lib/image-compress.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { coverCropRect, imageTargets } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('una imagen más ancha que el destino se recorta a los lados', () => {
  assert.deepEqual(coverCropRect(4000, 1000, 1600, 480), { sx: 334, sy: 0, sw: 3333, sh: 1000 })
})

test('una imagen más alta que el destino se recorta arriba y abajo', () => {
  assert.deepEqual(coverCropRect(1000, 3000, 512, 512), { sx: 0, sy: 1000, sw: 1000, sh: 1000 })
})

test('una imagen con la misma proporción no se recorta', () => {
  assert.deepEqual(coverCropRect(1024, 1024, 512, 512), { sx: 0, sy: 0, sw: 1024, sh: 1024 })
})

test('los destinos de avatar y banner tienen tamaños y límites definidos', () => {
  assert.equal(imageTargets.avatar.width, 512)
  assert.equal(imageTargets.banner.width, 1600)
  assert.ok(imageTargets.avatar.maxBytes <= 2 * 1024 * 1024)
  assert.ok(imageTargets.banner.maxBytes <= 2 * 1024 * 1024)
})

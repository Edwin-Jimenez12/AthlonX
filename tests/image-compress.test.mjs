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

const { sourceCropFromFrame, clampFrameOffset } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.01, `${actual} != ${expected}`)

test('el encuadre centrado con zoom 1 coincide con el recorte automático', () => {
  const crop = sourceCropFromFrame(4000, 1000, 480, 144, 1, -48, 0)
  near(crop.sx, 333.33)
  near(crop.sy, 0)
  near(crop.sw, 3333.33)
  near(crop.sh, 1000)
})

test('el arrastre no puede dejar un hueco dentro del marco', () => {
  const clamped = clampFrameOffset(100, 50, 4000, 1000, 480, 144, 0.144)
  assert.deepEqual(clamped, { x: 0, y: 0 })
  const far = clampFrameOffset(-9999, 0, 4000, 1000, 480, 144, 0.144)
  near(far.x, 480 - 4000 * 0.144)
})

test('el zoom acerca la zona visible y mantiene el centro', () => {
  const crop = sourceCropFromFrame(4000, 1000, 480, 144, 2, -336, -72)
  near(crop.sx, 1166.67)
  near(crop.sy, 250)
  near(crop.sw, 1666.67)
  near(crop.sh, 500)
})

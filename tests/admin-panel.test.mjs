import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../lib/admin.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const admin = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('el propietario crea administradores y colaboradores; el administrador solo colaboradores', () => {
  assert.equal(admin.canCreateRole('propietario', 'administrador'), true)
  assert.equal(admin.canCreateRole('propietario', 'colaborador'), true)
  assert.equal(admin.canCreateRole('propietario', 'propietario'), false)
  assert.equal(admin.canCreateRole('administrador', 'colaborador'), true)
  assert.equal(admin.canCreateRole('administrador', 'administrador'), false)
  assert.equal(admin.canCreateRole('colaborador', 'colaborador'), false)
  assert.equal(admin.canCreateRole(null, 'colaborador'), false)
})

test('propietario y administrador ven todo; el colaborador solo sus permisos asignados', () => {
  const owner = { role: 'propietario', permissions: [] }
  const admin2 = { role: 'administrador', permissions: [] }
  const collab = { role: 'colaborador', permissions: ['sugerencias'] }
  assert.equal(admin.hasPermission(owner, 'ingresos'), true)
  assert.equal(admin.hasPermission(admin2, 'planes'), true)
  assert.equal(admin.hasPermission(collab, 'sugerencias'), true)
  assert.equal(admin.hasPermission(collab, 'ingresos'), false)
  assert.equal(admin.hasPermission(null, 'ingresos'), false)
})

test('el estado de una promoción sigue fechas, usos y pausa', () => {
  const now = new Date('2026-11-02T12:00:00Z')
  const base = { is_active: true, starts_at: '2026-10-01T00:00:00Z', ends_at: null, max_uses: null, uses_count: 0 }
  assert.equal(admin.promoStatus(base, now), 'Activo')
  assert.equal(admin.promoStatus({ ...base, starts_at: '2026-12-01T00:00:00Z' }, now), 'Programado')
  assert.equal(admin.promoStatus({ ...base, ends_at: '2026-10-31T00:00:00Z' }, now), 'Vencido')
  assert.equal(admin.promoStatus({ ...base, max_uses: 20, uses_count: 20 }, now), 'Agotado')
  assert.equal(admin.promoStatus({ ...base, is_active: false }, now), 'Pausado')
})

test('un código de 100% de descuento es válido y uno de 101% no', () => {
  const ok = { code: 'lanzamiento100', type: 'percent', amount: 100, maxUses: 20, starts: '2026-11-01T00:00:00Z', ends: null }
  assert.equal(admin.validatePromo(ok), null)
  assert.match(admin.validatePromo({ ...ok, amount: 101 }), /100/)
  assert.match(admin.validatePromo({ ...ok, code: 'a b' }), /letras/)
})

test('los planes de grupo no tienen pago anual', () => {
  const grupo = { name: 'Club Pro', kind: 'grupo', monthly: 14.99, annualEnabled: true, annual: 143.9, seats: 6, limit: null, features: ['x'] }
  assert.match(admin.validatePlan(grupo), /solo se cobran al mes/)
  const individual = { ...grupo, name: 'Pro', kind: 'individual', monthly: 4.99, annual: 47.9 }
  assert.equal(admin.validatePlan(individual), null)
})

test('una versión necesita código v#.#.#, título y secciones completas', () => {
  const sections = [{ title: 'Calendario', body: 'Texto' }]
  assert.equal(admin.validateRelease({ version: 'v2.4.0', title: 'Calendario personal', sections }), null)
  assert.match(admin.validateRelease({ version: '2.4', title: 'x', sections }), /v2\.4\.0/)
  assert.match(admin.validateRelease({ version: 'v2.4.0', title: 'x', sections: [{ title: '', body: 'a' }] }), /título y párrafo/)
})

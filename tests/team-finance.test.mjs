import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../lib/team-finance.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
const fin = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

const mov = (over) => ({ id: 'x', kind: 'ingreso', amount: 10, occurred_on: '2026-11-03', category: 'Cuotas', concept: 'c', division_id: null, note: null, account_id: null, to_account_id: null, receipt_path: null, created_by: null, created_at: '', ...over })

test('el saldo de cada caja suma ingresos, resta gastos y mueve las transferencias', () => {
  const accounts = [{ id: 'a', name: 'Caja chica' }, { id: 'b', name: 'Banco' }]
  const balances = fin.accountBalances(accounts, [
    mov({ kind: 'ingreso', amount: 100, account_id: 'a' }),
    mov({ kind: 'gasto', amount: 30, account_id: 'a' }),
    mov({ kind: 'transferencia', amount: 50, account_id: 'a', to_account_id: 'b' }),
  ])
  assert.equal(balances.get('a'), 20)
  assert.equal(balances.get('b'), 50)
})

test('los totales no cuentan las transferencias', () => {
  const t = fin.totals([mov({ kind: 'ingreso', amount: '1850' }), mov({ kind: 'gasto', amount: 1240 }), mov({ kind: 'transferencia', amount: 500 })])
  assert.deepEqual(t, { ingresos: 1850, gastos: 1240, saldo: 610 })
})

test('los meses se calculan sin desfase de zona horaria', () => {
  assert.equal(fin.monthStart(new Date(2026, 10, 30)), '2026-11-01')
  assert.equal(fin.nextMonth('2026-12-01'), '2027-01-01')
  assert.equal(fin.monthName('2026-11-01'), 'Noviembre')
})

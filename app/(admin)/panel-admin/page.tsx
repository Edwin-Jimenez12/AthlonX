'use client'

import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Kpi, callPanel, useAdminAccess } from '../../../Components/admin/admin-shell'
import { Card, CardHeader, Notice, PageHeader } from '../../../Components/mi-equipo/ui'
import { formatUsd, hasPermission } from '../../../lib/admin'

type RevenueSummary = {
  ingreso_mensual: number
  cuentas_totales: number
  por_plan: Array<{ code: string; name: string; cuentas: number; precio_mensual: number; ingreso_mensual: number; altas_mes: number }>
}

export default function IngresosPage() {
  const access = useAdminAccess()
  const allowed = hasPermission(access, 'ingresos')
  const [data, setData] = useState<RevenueSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!allowed) return
    callPanel<RevenueSummary>('platform_revenue_summary')
      .then(setData)
      .catch((err: Error) => setError(err.message))
  }, [allowed])

  if (!allowed) return <Notice tone="warning" icon={Info}>No tienes permiso para ver ingresos.</Notice>

  const altas = data?.por_plan.reduce((total, plan) => total + plan.altas_mes, 0) ?? 0
  const pagados = data?.por_plan.filter((plan) => plan.code !== 'libre').reduce((total, plan) => total + plan.cuentas, 0) ?? 0

  return (
    <>
      <PageHeader title="Ingresos" />
      {error && <Notice tone="danger" icon={Info}>{error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Ingreso mensual" value={formatUsd(data?.ingreso_mensual ?? 0)} hint="Planes pagados, anuales convertidos a mes" />
        <Kpi label="Cuentas totales" value={String(data?.cuentas_totales ?? 0)} hint="Con un plan asignado" />
        <Kpi label="Planes pagados" value={String(pagados)} hint="Todo lo que no es Libre" />
        <Kpi label="Altas este mes" value={String(altas)} hint="Cuentas que empezaron un plan este mes" />
      </div>
      <Card>
        <CardHeader id="ingresos-planes" title="Cuentas por plan" />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[.14em] text-[var(--ax-muted)]">
              <tr>
                <th className="py-2 font-semibold">Plan</th>
                <th className="py-2 font-semibold">Cuentas</th>
                <th className="py-2 font-semibold">Precio mensual</th>
                <th className="py-2 font-semibold">Ingreso mensual</th>
                <th className="py-2 font-semibold">Altas este mes</th>
              </tr>
            </thead>
            <tbody className="text-[var(--ax-text)]">
              {(data?.por_plan ?? []).map((plan) => (
                <tr key={plan.code} className="border-t border-[var(--ax-line)]">
                  <td className="py-3 font-semibold">{plan.name}</td>
                  <td className="py-3">{plan.cuentas}</td>
                  <td className="py-3">{formatUsd(plan.precio_mensual)}</td>
                  <td className="py-3">{formatUsd(plan.ingreso_mensual)}</td>
                  <td className="py-3">{plan.altas_mes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

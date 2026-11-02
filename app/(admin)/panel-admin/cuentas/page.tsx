'use client'

import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Kpi, callPanel, useAdminAccess } from '../../../../Components/admin/admin-shell'
import { Card, CardHeader, Notice, PageHeader } from '../../../../Components/mi-equipo/ui'
import { hasPermission } from '../../../../lib/admin'

type AccountStats = {
  personas: number
  equipos: number
  organizaciones: number
  con_plan_pagado: number
  por_plan: Record<string, number>
}

const planNames: Record<string, string> = { libre: 'Libre', pro: 'Pro', elite: 'Élite', club_pro: 'Club Pro', club_elite: 'Club Élite' }

export default function CuentasPage() {
  const access = useAdminAccess()
  const allowed = hasPermission(access, 'estadisticas')
  const [stats, setStats] = useState<AccountStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!allowed) return
    callPanel<AccountStats>('platform_account_stats')
      .then(setStats)
      .catch((err: Error) => setError(err.message))
  }, [allowed])

  if (!allowed) return <Notice tone="warning" icon={Info}>No tienes permiso para ver las estadísticas de cuentas.</Notice>

  const total = stats ? stats.personas + stats.equipos + stats.organizaciones : 0

  return (
    <>
      <PageHeader title="Cuentas" />
      {error && <Notice tone="danger" icon={Info}>{error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Personas" value={String(stats?.personas ?? 0)} />
        <Kpi label="Equipos" value={String(stats?.equipos ?? 0)} />
        <Kpi label="Organizaciones" value={String(stats?.organizaciones ?? 0)} />
        <Kpi label="Total de cuentas" value={String(total)} hint="Personas, equipos y organizaciones" />
      </div>
      <Card>
        <CardHeader id="cuentas-planes" title="Cuentas por plan" />
        <ul className="mt-5 divide-y divide-[var(--ax-line)]">
          {Object.entries(planNames).map(([code, name]) => (
            <li key={code} className="flex items-center justify-between py-3 text-sm">
              <span className="font-semibold text-[var(--ax-text)]">{name}</span>
              <span className="text-[var(--ax-accent-text)]">{stats?.por_plan[code] ?? 0}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Notice tone="neutral" icon={Info}>
        Aquí solo se ven cantidades, planes y estados. No se muestran datos personales ni el contenido de las cuentas.
      </Notice>
    </>
  )
}

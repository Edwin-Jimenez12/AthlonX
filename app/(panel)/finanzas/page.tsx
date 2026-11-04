'use client'

import { Info } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Notice } from '../../../Components/mi-equipo/ui'
import { useActiveTeam } from '../../../Components/equipo/team-plan'
import { TeamFinanceView, type FinanceTab } from '../../../Components/equipo/team-finance-view'

const TABS: FinanceTab[] = ['resumen', 'movimientos', 'cuotas', 'presupuesto', 'estadisticas']

// Finanzas de la cuenta de equipo, separadas por plan.
export default function FinancePage() {
  return <Suspense fallback={<main className="ax-v2 min-h-screen lg:ml-64" />}><FinanceRouter /></Suspense>
}

function FinanceRouter() {
  const ctx = useActiveTeam()
  const requested = useSearchParams().get('tab') as FinanceTab | null
  const tab = requested && TABS.includes(requested) ? requested : 'resumen'
  if (ctx.status === 'cargando') return <main className="ax-v2 min-h-screen lg:ml-64" />
  if (ctx.status !== 'listo') return (
    <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
      <div className="mx-auto max-w-[1184px] px-4 pt-8 sm:px-8 lg:px-10"><Notice tone="neutral" icon={Info}>Finanzas es una sección de la cuenta de equipo. Cambia a tu equipo desde el menú de cuentas.</Notice></div>
    </main>
  )
  return <TeamFinanceView ctx={ctx} tab={tab} />
}

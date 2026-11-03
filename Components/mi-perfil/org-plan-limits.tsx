'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Card } from './ui'

type Usage = { plan: string; code: string; limits: Record<string, number | null>; usage: Record<string, number> }

const ROWS: Array<[string, string]> = [
  ['equipos_afiliados', 'Equipos afiliados'],
  ['equipos_propios', 'Equipos propios'],
  ['directivos_staff', 'Directivos y staff'],
  ['eventos_mes', 'Eventos de la organización este mes'],
  ['torneos_rapidos', 'Torneos rápidos activos'],
  ['torneos_oficiales', 'Torneos oficiales activos'],
]

// Límites del plan de la organización con su uso actual (diseño de Figma: Org · Equipos y roles).
export function OrgPlanLimits({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<Usage | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.rpc('platform_org_usage', { p_org: organizationId }).then(({ data: result, error: rpcError }) => {
      if (rpcError) setError(rpcError.message)
      else setData(result as Usage)
    })
  }, [organizationId])

  return (
    <Card
      title="Límites del plan"
      action={<Link href="/mi-perfil?seccion=cuenta" className="text-sm font-semibold text-[var(--ax-accent-text)] hover:underline">Mejorar plan</Link>}
    >
      {error && <p className="text-sm text-[var(--ax-muted)]">{error}</p>}
      {data && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--ax-muted)]">Plan {data.plan}</p>
          {ROWS.map(([key, label]) => {
            const limit = data.limits?.[key] ?? null
            const used = data.usage?.[key] ?? 0
            const text = limit === null ? `${used} · Sin límite` : limit === 0 ? 'No incluido en tu plan' : `${used} de ${limit}`
            const pct = limit === null ? 25 : limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
            return (
              <div key={key} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[var(--ax-text)]">{label}</span>
                  <span className="font-semibold text-[var(--ax-text)]">{text}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--ax-line)]">
                  <div className="h-2 rounded-full bg-[var(--ax-accent)]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

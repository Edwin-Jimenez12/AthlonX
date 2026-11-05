'use client'

import type { ReactNode } from 'react'
import { Clock3 } from 'lucide-react'
import { Card, CardHeader, Notice, PageHeader } from '../mi-equipo/ui'
import { Chip } from '../organizacion/plan-ui'

// Contenedor de las pantallas de la cuenta personal (atleta y entrenador), con los tokens del rediseño.
export function PersonaShell({ children }: { children: ReactNode }) {
  return (
    <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
      <div className="mx-auto max-w-[1184px] space-y-5 px-4 pb-16 pt-5 sm:space-y-6 sm:px-8 sm:pt-8 lg:px-10">{children}</div>
    </main>
  )
}

export type PendingItem = { label: string; plan: 'Free' | 'Pro'; note?: string }

// Módulos del diseño que todavía no tienen datos ni tablas en la plataforma. Muestran lo que vendrá,
// sin datos inventados, y el plan en el que va cada función.
export function PersonaPendingPage({ title, description, reason, items }: { title: string; description: string; reason: string; items: PendingItem[] }) {
  return (
    <PersonaShell>
      <PageHeader title={title} description={description} />
      <Notice tone="neutral" icon={Clock3}>{reason}</Notice>
      <Card>
        <CardHeader id="funciones" title="Funciones de este módulo" subtitle="Cada una aparece con el plan en el que está incluida." />
        <ul className="mt-4 divide-y divide-[var(--ax-line)]">
          {items.map((item) => (
            <li key={item.label} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--ax-text)]">{item.label}</p>
                {item.note && <p className="mt-0.5 text-xs text-[var(--ax-muted)]">{item.note}</p>}
              </div>
              <Chip tone={item.plan === 'Pro' ? 'violet' : 'accent'}>{item.plan === 'Pro' ? 'Pro' : 'Free'} · Próximamente</Chip>
            </li>
          ))}
        </ul>
      </Card>
    </PersonaShell>
  )
}

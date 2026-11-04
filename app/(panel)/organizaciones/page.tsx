'use client'

import { Info } from 'lucide-react'
import { OrganizationDirectPeoplePanel } from '../../../Components/organization-direct-people-panel'
import { OrganizationHierarchyPanel } from '../../../Components/organization-hierarchy-panel'
import { ButtonLink, Card, Notice, PageHeader, SkeletonRows } from '../../../Components/mi-equipo/ui'
import { useActiveOrganization } from '../../../Components/organizacion/plan-ui'

// Organización (diseño de Figma: Org · Free/Pro/Élite · Organización): jerarquía y personas, con el límite del plan.
export default function OrganizationsPage() {
  const { status, organization, plan, usage, reload } = useActiveOrganization()

  return (
    <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
      <div className="mx-auto max-w-[1184px] space-y-5 px-4 pb-16 pt-5 sm:space-y-6 sm:px-8 sm:pt-8 lg:px-10">
        <PageHeader title="Organización" actions={organization && <ButtonLink href="/equipos" variant="primary">Agregar equipo</ButtonLink>} />

        {status === 'cargando' && <Card><SkeletonRows count={4} /></Card>}
        {status === 'sin-organizacion' && (
          <Notice tone="neutral" icon={Info}>Esta sección es de la cuenta de organización. Cambia a tu organización desde el menú de cuentas.</Notice>
        )}
        {status === 'lista' && organization && (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
            <OrganizationHierarchyPanel rootOrganizationId={organization.id} />
            <OrganizationDirectPeoplePanel
              organizationId={organization.id}
              planName={plan?.name}
              staffLimit={usage ? (usage.limits?.directivos_staff ?? null) : undefined}
              staffUsed={usage?.usage?.directivos_staff ?? 0}
              onChanged={() => void reload()}
            />
          </div>
        )}
      </div>
    </main>
  )
}

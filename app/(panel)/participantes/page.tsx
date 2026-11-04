'use client'

import { Info, Lock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { loadAccountContexts } from '../../../lib/account-contexts'
import { loadAccountPlan, type AccountPlan } from '../../../lib/account-plans'
import { supabase } from '../../../lib/supabase'
import { Badge, ButtonLink, Card, CardHeader, EmptyState, Notice, PageHeader, Segment, SkeletonRows } from '../../../Components/mi-equipo/ui'

type Participant = { person_name: string; role: string; team_name: string | null; via_organization: string | null; status: string }

const roleFilters = ['Todos', 'Directivos', 'Staff', 'Entrenadores', 'Atletas'] as const
const roleOf: Record<(typeof roleFilters)[number], string | null> = {
  Todos: null,
  Directivos: 'Directivo',
  Staff: 'Staff',
  Entrenadores: 'Entrenador',
  Atletas: 'Atleta',
}

const upgradeHref = '/mi-perfil?seccion=cuenta&mejorar=1'

// Participantes de la organización (diseño de Figma: Org · Free/Pro · Participantes). Desde el plan Pro.
export default function ParticipantsPage() {
  const [state, setState] = useState<'cargando' | 'sin-organizacion' | 'bloqueado' | 'lista'>('cargando')
  const [plan, setPlan] = useState<AccountPlan | null>(null)
  const [rows, setRows] = useState<Participant[]>([])
  const [filter, setFilter] = useState<(typeof roleFilters)[number]>('Todos')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (!data.user) return setState('sin-organizacion')
      const contexts = await loadAccountContexts(data.user.id)
      const stored = window.localStorage.getItem('athlonx-active-context-id')
      const current = contexts.find((context) => context.id === stored) ?? contexts[0]
      if (!active) return
      if (current?.contextType !== 'organization' || !current.organizationId) return setState('sin-organizacion')
      try {
        const orgPlan = await loadAccountPlan('organizacion', current.organizationId)
        if (!active) return
        setPlan(orgPlan)
        if (orgPlan.feature_flags?.participantes !== true) return setState('bloqueado')
        const { data: list, error: rpcError } = await supabase.rpc('platform_org_participants', { p_org: current.organizationId })
        if (!active) return
        if (rpcError) setError(rpcError.message)
        setRows((list ?? []) as Participant[])
        setState('lista')
      } catch (err) {
        if (active) setError((err as Error).message)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  const visible = useMemo(() => {
    const role = roleOf[filter]
    return role ? rows.filter((row) => row.role === role) : rows
  }, [rows, filter])

  return (
    <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
      <div className="mx-auto max-w-[1184px] space-y-5 px-4 pb-16 pt-5 sm:space-y-6 sm:px-8 sm:pt-8 lg:px-10">
        <PageHeader title="Participantes" />

        {error && <Notice tone="danger" icon={Info}>{error}</Notice>}

        {state === 'cargando' && !error && <Card><SkeletonRows count={4} /></Card>}

        {state === 'sin-organizacion' && (
          <Notice tone="neutral" icon={Info}>Participantes es una sección de la cuenta de organización. Cambia a tu organización desde el menú de cuentas.</Notice>
        )}

        {state === 'bloqueado' && (
          <Card>
            <CardHeader id="participantes-bloqueado" title="Disponible en Pro" subtitle={plan ? `Tu organización está en el plan ${plan.name}.` : undefined} />
            <div className="mt-5 flex flex-col gap-4 rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Lock size={18} aria-hidden="true" className="shrink-0 text-[var(--ax-muted)]" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-[var(--ax-text)]">Lista de participantes y sus roles</p>
                  <p className="text-xs text-[var(--ax-muted)]">Disponible en Pro</p>
                </div>
              </div>
              <ButtonLink href={upgradeHref} variant="primary">Mejorar plan</ButtonLink>
            </div>
          </Card>
        )}

        {state === 'lista' && (
          <>
            <div className="flex flex-wrap gap-2">
              {roleFilters.map((label) => (
                <Segment key={label} active={filter === label} label={label} onClick={() => setFilter(label)} />
              ))}
            </div>
            <Card>
              <CardHeader id="participantes-lista" title="Personas de la organización" />
              {visible.length === 0 ? (
                <div className="mt-5">
                  <EmptyState icon={Info} title="Sin participantes" description="Cuando tus equipos y tu cuerpo directivo tengan miembros, aparecerán aquí." />
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--ax-line)] text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--ax-muted)]">
                        <th className="py-3 pr-4 font-semibold">Nombre</th>
                        <th className="py-3 pr-4 font-semibold">Rol</th>
                        <th className="py-3 pr-4 font-semibold">Equipo</th>
                        <th className="py-3 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((row, index) => (
                        <tr key={`${row.person_name}-${row.role}-${row.team_name}-${index}`} className="border-b border-[var(--ax-line)] last:border-0">
                          <td className="py-3 pr-4 font-semibold text-[var(--ax-text)]">{row.person_name}</td>
                          <td className="py-3 pr-4 text-[var(--ax-text)]">{row.role}</td>
                          <td className="py-3 pr-4 text-[var(--ax-text-secondary)]">{row.team_name ? `${row.team_name}${row.via_organization ? ` · vía ${row.via_organization}` : ''}` : '—'}</td>
                          <td className="py-3"><Badge tone={row.status === 'Activo' ? 'success' : 'warning'}>{row.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-4 text-xs text-[var(--ax-muted)]">Solo se muestran nombre, rol, equipo y estado. No se muestran datos de contacto.</p>
            </Card>
          </>
        )}
      </div>
    </main>
  )
}

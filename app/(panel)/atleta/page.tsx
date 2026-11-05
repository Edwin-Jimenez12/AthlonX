'use client'

import { ArrowUpRight, Shield, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AccountContext, loadAccountContexts } from '../../../lib/account-contexts'
import { loadAccountPlan } from '../../../lib/account-plans'
import { supabase } from '../../../lib/supabase'
import { PersonaViewSwitcher } from '../../../Components/persona-view-switcher'
import { Chip } from '../../../Components/organizacion/plan-ui'
import { PersonaShell } from '../../../Components/persona/persona-ui'
import { TeamCallupsCard } from '../../../Components/mi-equipo/team-callups-card'
import { Badge, Card, CardHeader, ButtonLink, EmptyState, EntityMark, Notice, PageHeader } from '../../../Components/mi-equipo/ui'

function money(value: number) {
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(value)
}

// Atleta · Mi equipo (Figma: Atleta · Free y Pro · Mi equipo): equipos, convocatorias y cuota.
export default function AthleteTeamPage() {
  const [contexts, setContexts] = useState<AccountContext[]>([])
  const [planName, setPlanName] = useState<string | null>(null)
  const [fees, setFees] = useState<Record<string, { fee: number; status: string; pending_months: number }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) {
        setError('Supabase no está configurado.')
        setLoading(false)
        return
      }
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        setError('Debes iniciar sesión para ver tu equipo.')
        setLoading(false)
        return
      }
      const [accountContexts, plan] = await Promise.all([
        loadAccountContexts(data.user.id),
        loadAccountPlan('persona', data.user.id).catch(() => null),
      ])
      if (!active) return
      setContexts(accountContexts)
      setPlanName(plan?.name ?? null)
      const persona = accountContexts.filter((context) => context.contextType === 'team' && context.teamId && context.role === 'atleta')
      const monthStart = new Date(); monthStart.setDate(1)
      const results = await Promise.all(persona.map(async (context) => {
        const { data: rows } = await supabase!.rpc('team_my_fee', { p_team: context.teamId, p_month: monthStart.toISOString().slice(0, 10) })
        const row = (rows as Array<{ fee: number; status: string; pending_months: number }> | null)?.[0]
        return [context.teamId as string, row ?? { fee: 0, status: 'pendiente', pending_months: 0 }] as const
      }))
      if (active) setFees(Object.fromEntries(results))
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [])

  // Equipos en los que la persona juega (atleta): contextos de equipo con rol atleta.
  const teams = contexts.filter((context) => context.contextType === 'team' && context.teamId && context.role === 'atleta')

  return (
    <PersonaShell>
      <PersonaViewSwitcher active="atleta" />
      <PageHeader
        title="Mi equipo"
        description="Tus equipos, sus convocatorias y tu cuota."
        actions={planName ? <Chip tone="accent">Plan {planName}</Chip> : undefined}
      />

      {error && <Notice tone="danger" icon={Shield}>{error}</Notice>}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 lg:items-start">
        <Card labelledBy="mis-equipos">
          <CardHeader id="mis-equipos" title="Mis equipos" subtitle={teams.length ? `${teams.length} ${teams.length === 1 ? 'equipo' : 'equipos'}` : undefined} />
          {teams.length ? (
            <ul className="mt-4 divide-y divide-[var(--ax-line)]">
              {teams.map((team) => (
                <li key={team.id} className="flex items-center justify-between gap-3 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <EntityMark name={team.name} src={team.imageUrl} size={44} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--ax-text)]">{team.name}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--ax-muted)]">Jugador{team.discipline ? ` · ${team.discipline}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone="success">Activo</Badge>
                    <ButtonLink href={`/equipos/${team.teamId}`} size="sm" icon={ArrowUpRight}>Ver</ButtonLink>
                  </div>
                </li>
              ))}
            </ul>
          ) : !loading ? (
            <div className="mt-4">
              <EmptyState icon={Users} title="Aún no juegas en un equipo" description="Cuando un equipo te invite y aceptes, aparecerá aquí." />
            </div>
          ) : null}
        </Card>

        <Card labelledBy="mi-cuota">
          <CardHeader id="mi-cuota" title="Mi cuota" subtitle="Estado de tu pago en cada equipo" />
          <ul className="mt-4 divide-y divide-[var(--ax-line)]">
            {teams.length === 0 && !loading && <li className="py-3 text-sm text-[var(--ax-muted)]">Cuando juegues en un equipo, verás aquí tu cuota.</li>}
            {teams.map((team) => {
              const fee = fees[team.teamId as string]
              return (
                <li key={team.id} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ax-text)]">{team.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--ax-muted)]">{fee ? `${money(fee.fee)} al mes` : 'Cargando cuota…'}</p>
                  </div>
                  {fee && (fee.status === 'pagado'
                    ? <Badge tone="success">Pagada este mes</Badge>
                    : <Badge tone="warning">Pendiente{fee.pending_months > 1 ? ` · ${fee.pending_months} meses` : ''}</Badge>)}
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      {!loading && teams.length > 0 && (
        <section aria-labelledby="convocatorias-atleta" className="space-y-3">
          <h2 id="convocatorias-atleta" className="sr-only">Convocatorias</h2>
          {teams.map((team) => (
            <TeamCallupsCard key={team.id} teamId={team.teamId as string} teamName={team.name} />
          ))}
        </section>
      )}
    </PersonaShell>
  )
}

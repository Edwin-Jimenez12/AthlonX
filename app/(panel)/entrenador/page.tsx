'use client'

import { ArrowUpRight, Megaphone } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadAccountPlan, AccountPlan } from '../../../lib/account-plans'
import { loadManagedTeams, ManagedTeam } from '../../../lib/team-access'
import { supabase } from '../../../lib/supabase'
import { PersonaViewSwitcher } from '../../../Components/persona-view-switcher'
import { PersonaShell } from '../../../Components/persona/persona-ui'
import { TeamCallupsCard } from '../../../Components/mi-equipo/team-callups-card'
import { TeamRosterCard } from '../../../Components/mi-equipo/team-roster-card'
import { useTeamRoster } from '../../../Components/mi-equipo/use-team-roster'
import { Badge, ButtonLink, Card, CardHeader, EntityMark, Notice, PageHeader, Segment } from '../../../Components/mi-equipo/ui'
import { Chip, LockedFeature } from '../../../Components/organizacion/plan-ui'

// Equipos que la persona entrena por cargo de entrenador (Figma: Entrenador · Free y Pro · Mi equipo).
// Free: 1 equipo a cargo. Pro: hasta 3.
function teamLimit(plan: AccountPlan | null) {
  if (!plan || plan.code === 'libre') return 1
  if (plan.code === 'pro') return 3
  return null
}

export default function TrainerTeamPage() {
  const [teams, setTeams] = useState<ManagedTeam[]>([])
  const [plan, setPlan] = useState<AccountPlan | null>(null)
  const [selectedId, setSelectedId] = useState<string>('')
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
      const [managed, accountPlan] = await Promise.all([
        loadManagedTeams(data.user.id),
        loadAccountPlan('persona', data.user.id).catch(() => null),
      ])
      if (!active) return
      const coached = managed.filter((team) => team.role === 'entrenador')
      setTeams(coached)
      setPlan(accountPlan)
      setSelectedId(coached[0]?.id ?? '')
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [])

  const limit = teamLimit(plan)
  const visible = limit === null ? teams : teams.slice(0, limit)
  const hidden = teams.length - visible.length
  const selected = teams.find((team) => team.id === selectedId) ?? visible[0] ?? null
  const roster = useTeamRoster(selected?.id || undefined)

  return (
    <PersonaShell>
      <PersonaViewSwitcher active="entrenador" />
      <PageHeader
        title="Mi equipo"
        description="Tus equipos a cargo, su plantilla y tus convocatorias."
        actions={<>
          {plan && <Chip tone="accent">Plan {plan.name}</Chip>}
          {selected && <ButtonLink href="/entrenador/convocatoria" icon={Megaphone}>Convocatoria</ButtonLink>}
        </>}
      />

      {error && <Notice tone="danger" icon={ArrowUpRight}>{error}</Notice>}

      <Card labelledBy="equipos-a-cargo">
        <CardHeader id="equipos-a-cargo" title="Equipos que entrenas" subtitle={teams.length ? `${teams.length} ${teams.length === 1 ? 'equipo' : 'equipos'}` : undefined} />
        {visible.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Equipo a cargo">
            {visible.map((team) => (
              <Segment key={team.id} active={team.id === selected?.id} label={team.name} onClick={() => setSelectedId(team.id)} />
            ))}
          </div>
        )}
        {selected && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--ax-line)] pt-4">
            <div className="flex min-w-0 items-center gap-3">
              <EntityMark name={selected.name} src={selected.logoUrl} size={44} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--ax-text)]">{selected.name}</p>
                <p className="mt-0.5 truncate text-xs text-[var(--ax-muted)]">Entrenador{selected.discipline ? ` · ${selected.discipline}` : ''}</p>
              </div>
            </div>
            <Badge tone="success">Activo</Badge>
          </div>
        )}
        {hidden > 0 && (
          <div className="mt-4">
            <LockedFeature label={`Tu plan permite ${limit} ${limit === 1 ? 'equipo a cargo' : 'equipos a cargo'}. Hay ${hidden} más.`} />
          </div>
        )}
        {!loading && teams.length === 0 && <p className="mt-4 text-sm text-[var(--ax-muted)]">Aún no tienes equipos a cargo como entrenador.</p>}
      </Card>

      {selected && (
        <>
          <TeamRosterCard teamId={selected.id} canManage={false} discipline={selected.discipline} disciplineCode={selected.disciplineCode} {...roster} />
          <TeamCallupsCard teamId={selected.id} teamName={selected.name} />
          <p className="text-xs text-[var(--ax-muted)]">
            Quién puede editar eventos y administrar personas lo decide el directivo del equipo. <Link href={`/entrenador/equipo/${selected.id}`} className="font-semibold text-[var(--ax-accent-text)] underline underline-offset-4">Ver el equipo completo</Link>
          </p>
        </>
      )}
    </PersonaShell>
  )
}

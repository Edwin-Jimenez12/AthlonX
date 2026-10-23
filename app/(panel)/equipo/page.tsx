'use client'

import { MapPin, Pencil, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadManagedTeams, ManagedTeam } from '../../../lib/team-access'
import { supabase } from '../../../lib/supabase'
import { InvitePanel } from '../../../Components/mi-equipo/invite-panel'
import { TeamCallupsCard } from '../../../Components/mi-equipo/team-callups-card'
import { TeamPeopleCard } from '../../../Components/mi-equipo/team-people-card'
import { TeamRosterCard } from '../../../Components/mi-equipo/team-roster-card'
import { Badge, Button, ButtonLink, initialsOf } from '../../../Components/mi-equipo/ui'
import { useTeamRoster } from '../../../Components/mi-equipo/use-team-roster'

// Solo propietarios y directivos administran personas y divisiones (igual que las RPC de Supabase).
const managerRoles = new Set(['owner', 'directivo'])

export default function TeamDashboard() {
  const [teams, setTeams] = useState<ManagedTeam[]>([])
  const [team, setTeam] = useState<ManagedTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    async function loadTeamProfile() {
      if (!supabase) return setLoading(false)
      const { data } = await supabase.auth.getUser()
      const metadata = data.user?.user_metadata
      const managedTeams = data.user ? await loadManagedTeams(data.user.id) : []
      const storedTeamId = window.localStorage.getItem('athlonx-active-team-id')
      const selectedTeam = managedTeams.find((item) => item.id === storedTeamId) || managedTeams[0]
      setTeams(managedTeams)
      setTeam(selectedTeam || (metadata?.account_type === 'equipo' ? { id: '', name: metadata.team_name || metadata.full_name || 'Equipo pendiente', discipline: metadata.team_discipline || 'Disciplina pendiente', disciplineId: '', disciplineCode: '', city: metadata.team_city || null, role: 'owner' } : null))
      if (selectedTeam) {
        window.localStorage.setItem('athlonx-active-team-id', selectedTeam.id)
        window.dispatchEvent(new CustomEvent('athlonx-team-change', { detail: selectedTeam.id }))
      }
      setLoading(false)
    }
    void loadTeamProfile()
  }, [])

  useEffect(() => {
    if (!teams.length) return
    const syncTeam = (event: Event) => {
      const selectedTeam = teams.find((item) => item.id === (event as CustomEvent<string>).detail)
      if (selectedTeam) setTeam(selectedTeam)
    }
    window.addEventListener('athlonx-team-change', syncTeam)
    return () => window.removeEventListener('athlonx-team-change', syncTeam)
  }, [teams])

  const roster = useTeamRoster(team?.id || undefined)
  const name = team?.name || 'Equipo pendiente de configuración'
  const canManage = Boolean(team?.id && managerRoles.has(team.role))

  return <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
    <div className="mx-auto max-w-[1184px] space-y-5 px-4 pb-16 pt-5 sm:space-y-7 sm:px-8 sm:pt-8 lg:px-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex min-w-0 items-center gap-3.5 sm:gap-5">
          <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[var(--ax-accent)] font-display text-[26px] text-[var(--ax-on-accent)] sm:h-16 sm:w-16 sm:text-[30px] lg:h-[72px] lg:w-[72px] lg:rounded-[18px] lg:text-[33px]">{initialsOf(name)}</span>
          <div className="min-w-0 space-y-1.5">
            <h1 className="truncate font-display text-[34px] uppercase leading-[36px] tracking-[.02em] text-[var(--ax-text)] sm:text-[40px] sm:leading-[42px] lg:text-[48px] lg:leading-[50px]">{loading ? 'Cargando equipo' : name}</h1>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-sm">
              <span className="font-medium text-[var(--ax-text-secondary)]">{team?.discipline || 'Disciplina pendiente'}</span>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[var(--ax-muted)]" />
              {team?.city ? <span className="inline-flex items-center gap-1 text-[var(--ax-text-secondary)]"><MapPin size={14} aria-hidden="true" />{team.city}</span>
                : <Link href="/configuracion" className="inline-flex items-center gap-1 font-semibold text-[var(--ax-accent-text)] underline underline-offset-4"><MapPin size={14} aria-hidden="true" />Añadir ubicación</Link>}
              <Badge tone="success">Perfil activo</Badge>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
          <ButtonLink href="/configuracion" icon={Pencil}>Editar perfil</ButtonLink>
          {canManage && <Button variant="primary" icon={UserPlus} onClick={() => setInviting((current) => !current)} aria-expanded={inviting}>Invitar persona</Button>}
        </div>
      </header>

      {inviting && team?.id && <InvitePanel teamId={team.id} divisions={roster.divisions} members={roster.members} title="Invitar persona al equipo" onClose={() => setInviting(false)} onSent={() => void roster.reload()} />}

      {team?.id ? <div className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <TeamRosterCard teamId={team.id} canManage={canManage} {...roster} />
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 md:items-start xl:grid-cols-1">
          <TeamPeopleCard teamId={team.id} canManage={canManage} divisions={roster.divisions} members={roster.members} invitations={roster.invitations} loading={roster.loading} reload={roster.reload} />
          <TeamCallupsCard teamId={team.id} teamName={team.name} />
        </div>
      </div> : !loading && <p className="rounded-[14px] border border-dashed border-[var(--ax-line-strong)] p-6 text-sm text-[var(--ax-muted)]">Este equipo todavía no tiene una cuenta vinculada para gestionar su plantilla.</p>}
    </div>
  </main>
}

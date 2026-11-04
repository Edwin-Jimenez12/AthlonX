'use client'

import { useEffect, useState } from 'react'
import { loadAccountContexts } from '../../../lib/account-contexts'
import { supabase } from '../../../lib/supabase'
import AthleteCalendar from '../../../Components/calendario/athlete-calendar'
import TeamCalendarView from '../../../Components/calendario/team-calendar-view'

// Organización: calendario de la organización según su plan. Cuenta personal y equipo: calendario con sus equipos.
export default function CalendarioPage() {
  const [mode, setMode] = useState<'cargando' | 'atleta' | 'gestion'>('cargando')
  const [organization, setOrganization] = useState<{ id: string; name: string } | null>(null)
  const [team, setTeam] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    let active = true
    async function resolve() {
      if (!supabase) return setMode('gestion')
      const { data } = await supabase.auth.getUser()
      if (!data.user) return setMode('gestion')
      const contexts = await loadAccountContexts(data.user.id)
      const stored = window.localStorage.getItem('athlonx-active-context-id')
      const active_ = contexts.find((context) => context.id === stored) ?? contexts[0]
      if (!active) return
      if (active_?.contextType === 'organization' && active_.organizationId) {
        setOrganization({ id: active_.organizationId, name: active_.name })
        return setMode('atleta')
      }
      // Cuenta de equipo (propietario, directivo o cuerpo técnico): calendario del equipo según su plan.
      if (active_?.contextType === 'team' && active_.teamId && active_.role !== 'atleta') {
        setTeam({ id: active_.teamId, name: active_.name })
        return setMode('atleta')
      }
      setMode(active_ ? 'atleta' : 'gestion')
    }
    void resolve()
    return () => {
      active = false
    }
  }, [])

  if (mode === 'cargando') return <p className="p-6 text-sm text-[var(--ax-muted)]">Cargando calendario…</p>
  return mode === 'atleta' ? <AthleteCalendar organization={organization} team={team} /> : <TeamCalendarView />
}

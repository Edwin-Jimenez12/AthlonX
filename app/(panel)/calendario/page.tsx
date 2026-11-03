'use client'

import { useEffect, useState } from 'react'
import { loadAccountContexts } from '../../../lib/account-contexts'
import { supabase } from '../../../lib/supabase'
import AthleteCalendar from '../../../Components/calendario/athlete-calendar'
import TeamCalendarView from '../../../Components/calendario/team-calendar-view'

// Cuenta personal (atleta): calendario de atleta. Equipo y organización: calendario de gestión.
export default function CalendarioPage() {
  const [mode, setMode] = useState<'cargando' | 'atleta' | 'gestion'>('cargando')

  useEffect(() => {
    let active = true
    async function resolve() {
      if (!supabase) return setMode('gestion')
      const { data } = await supabase.auth.getUser()
      if (!data.user) return setMode('gestion')
      const contexts = await loadAccountContexts(data.user.id)
      const stored = window.localStorage.getItem('athlonx-active-context-id')
      const active_ = contexts.find((context) => context.id === stored) ?? contexts[0]
      if (active) setMode(active_?.contextType === 'personal' ? 'atleta' : 'gestion')
    }
    void resolve()
    return () => {
      active = false
    }
  }, [])

  if (mode === 'cargando') return <p className="p-6 text-sm text-[var(--ax-muted)]">Cargando calendario…</p>
  return mode === 'atleta' ? <AthleteCalendar /> : <TeamCalendarView />
}

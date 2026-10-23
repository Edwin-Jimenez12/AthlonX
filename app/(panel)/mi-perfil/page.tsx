'use client'

import { useCallback, useEffect, useState } from 'react'
import { PersonaProfileView, personaSections } from '../../../Components/mi-perfil/persona-profile-view'
import { OrganizationProfileView, organizationSections } from '../../../Components/mi-perfil/organization-profile-view'
import { TeamProfileView, teamSections } from '../../../Components/mi-perfil/team-profile-view'
import { loadManagedTeams } from '../../../lib/team-access'
import {
  loadDisciplines,
  loadOrganizationProfile,
  loadPersonaProfile,
  loadPreferences,
  loadTeamProfile,
} from '../../../lib/mi-perfil'
import type { Discipline, OrganizationProfile, PersonaProfile, TeamProfile, Theme } from '../../../lib/mi-perfil'
import { supabase } from '../../../lib/supabase'
import { applyTheme } from '../../../lib/theme'

type Loaded =
  | { kind: 'persona'; profile: PersonaProfile }
  | { kind: 'equipo'; team: TeamProfile }
  | { kind: 'organizacion'; organization: OrganizationProfile }

function initialSection(kind: Loaded['kind']) {
  const fallback = kind === 'persona' ? personaSections : kind === 'equipo' ? teamSections : organizationSections
  if (typeof window === 'undefined') return fallback[0].id
  const requested = new URLSearchParams(window.location.search).get('seccion')
  return fallback.some((item) => item.id === requested) ? requested! : fallback[0].id
}

export default function MiPerfilPage() {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [theme, setTheme] = useState<Theme>('oscuro')
  const [noticesEnabled, setNoticesEnabled] = useState(true)
  const [section, setSection] = useState('identidad')
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState('')

  const load = useCallback(async () => {
    if (!supabase) {
      setMissing('Supabase no está configurado.')
      setLoading(false)
      return
    }
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      setMissing('Inicia sesión para ver tu perfil.')
      setLoading(false)
      return
    }
    const userId = data.user.id
    const accountType = data.user.user_metadata?.account_type ?? 'persona'
    const preferences = await loadPreferences(userId)
    setTheme(preferences.theme)
    setNoticesEnabled(preferences.noticesEnabled)
    applyTheme(preferences.theme === 'claro' ? 'light' : 'dark')
    setDisciplines(await loadDisciplines())

    if (accountType === 'equipo') {
      const managed = await loadManagedTeams(userId)
      const storedId = window.localStorage.getItem('athlonx-active-team-id')
      const selected = managed.find((team) => team.id === storedId) ?? managed[0]
      if (!selected) {
        setMissing('Todavía no administras ningún equipo.')
        setLoading(false)
        return
      }
      const team = await loadTeamProfile(selected.id, selected.role)
      if (!team) setMissing('No se pudo cargar el equipo.')
      else setLoaded({ kind: 'equipo', team })
    } else if (accountType === 'organizacion') {
      await supabase.rpc('ensure_my_organization')
      const [{ data: owned }, { data: memberships }] = await Promise.all([
        supabase.from('organizations').select('id').eq('created_by', userId).order('created_at', { ascending: false }).limit(1),
        supabase.from('organization_members').select('organization_id').eq('user_id', userId).in('role', ['owner', 'directivo']).eq('status', 'active').limit(1),
      ])
      const organizationId = owned?.[0]?.id ?? memberships?.[0]?.organization_id
      const organization = organizationId ? await loadOrganizationProfile(organizationId) : null
      if (!organization) setMissing('No se pudo cargar la organización.')
      else setLoaded({ kind: 'organizacion', organization })
    } else {
      const profile = await loadPersonaProfile(userId, data.user.email ?? '', data.user.email_confirmed_at != null)
      if (!profile) setMissing('No se pudo cargar tu perfil.')
      else setLoaded({ kind: 'persona', profile })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (loaded) setSection(initialSection(loaded.kind))
  }, [loaded])

  function changeSection(next: string) {
    setSection(next)
    const url = new URL(window.location.href)
    url.searchParams.set('seccion', next)
    window.history.replaceState(null, '', url.toString())
  }

  if (loading) return <ProfileSkeleton />

  if (!loaded) {
    return <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
      <div className="mx-auto max-w-[1184px] px-4 pb-16 pt-5 sm:px-8 sm:pt-8 lg:px-10">
        <p className="rounded-[14px] border border-dashed border-[var(--ax-line-strong)] p-6 text-sm text-[var(--ax-muted)]">{missing}</p>
      </div>
    </main>
  }

  if (loaded.kind === 'persona') {
    return (
      <PersonaProfileView
        profile={loaded.profile}
        theme={theme}
        onTheme={setTheme}
        section={section}
        onSection={changeSection}
        noticesEnabled={noticesEnabled}
        onNotices={setNoticesEnabled}
        onProfileSaved={() => void load()}
      />
    )
  }

  if (loaded.kind === 'equipo') {
    return (
      <TeamProfileView
        team={loaded.team}
        disciplines={disciplines}
        theme={theme}
        onTheme={setTheme}
        section={section}
        onSection={changeSection}
        noticesEnabled={noticesEnabled}
        onNotices={setNoticesEnabled}
        onSaved={() => void load()}
      />
    )
  }

  return (
    <OrganizationProfileView
      organization={loaded.organization}
      disciplines={disciplines}
      theme={theme}
      onTheme={setTheme}
      section={section}
      onSection={changeSection}
      noticesEnabled={noticesEnabled}
      onNotices={setNoticesEnabled}
      onSaved={() => void load()}
    />
  )
}

// Bloques del tamaño final mientras carga, para que la página no salte.
function ProfileSkeleton() {
  return <main aria-busy="true" aria-label="Cargando Mi perfil" className="ax-v2 min-h-screen bg-transparent lg:ml-64">
    <div aria-hidden="true" className="mx-auto max-w-[1184px] space-y-6 px-4 pb-16 pt-5 sm:px-8 sm:pt-8 lg:px-10">
      <div className="flex items-center gap-5">
        <span className="h-14 w-14 animate-pulse rounded-full bg-[var(--ax-surface-raised)] sm:h-20 sm:w-20" />
        <div className="space-y-3">
          <span className="block h-8 w-56 animate-pulse rounded-lg bg-[var(--ax-surface-raised)]" />
          <span className="block h-5 w-40 animate-pulse rounded-md bg-[var(--ax-surface-raised)]" />
        </div>
      </div>
      <div className="space-y-4 rounded-[20px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-6">
        <span className="block h-6 w-44 animate-pulse rounded-md bg-[var(--ax-surface-raised)]" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <span key={index} className="block h-11 animate-pulse rounded-[10px] bg-[var(--ax-surface-raised)]" />)}</div>
      </div>
    </div>
  </main>
}

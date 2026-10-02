'use client'

import { ArrowUpRight, CalendarDays, CheckCircle2, Users } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AccountContext, loadAccountContexts } from '../../../lib/account-contexts'
import { supabase } from '../../../lib/supabase'

type PersonalEvent = {
  id: string
  title: string
  event_type: 'training' | 'match' | 'game' | 'meeting' | 'other'
  starts_at: string
  ends_at: string
  all_day: boolean
  source_type: 'team' | 'organization'
  source_name: string
}

function dateStart(value: string) {
  return new Date(`${value}T00:00:00`).toISOString()
}

function dateEnd(value: string) {
  return new Date(`${value}T23:59:59`).toISOString()
}

const roleLabels: Record<AccountContext['role'], string> = {
  atleta: 'Atleta',
  entrenador: 'Coach',
  staff: 'Staff',
  directivo: 'Directivo',
}

function indicatorClass(event: Pick<PersonalEvent, 'event_type' | 'source_type'>) {
  if (event.event_type === 'match') return 'bg-amber-300'
  if (event.event_type === 'meeting') return 'bg-red-400'
  if (event.event_type === 'game') return 'bg-violet-300'
  if (event.event_type === 'other') return 'bg-cyan-300'
  return event.source_type === 'organization' ? 'bg-blue-400' : 'bg-[#b4ff45]'
}

function formatEventDate(event: PersonalEvent) {
  if (event.all_day) {
    return new Intl.DateTimeFormat('es-PA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(event.starts_at))
  }

  return new Intl.DateTimeFormat('es-PA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(event.starts_at))
}

export default function AthleteDashboard() {
  const [profileName, setProfileName] = useState('Persona AthlonX')
  const [contexts, setContexts] = useState<AccountContext[]>([])
  const [events, setEvents] = useState<PersonalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadPersonalView() {
      if (!supabase) {
        setError('Supabase no está configurado.')
        setLoading(false)
        return
      }

      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setError('Debes iniciar sesión para ver tu cuenta personal.')
        setLoading(false)
        return
      }

      const [{ data: profile }, accountContexts] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', userData.user.id).maybeSingle(),
        loadAccountContexts(userData.user.id),
      ])

      setProfileName(profile?.full_name || userData.user.user_metadata?.full_name || 'Persona AthlonX')
      setContexts(accountContexts)

      const teamIds = Array.from(new Set(accountContexts.flatMap((context) => context.teamId ? [context.teamId] : [])))
      const organizationIds = Array.from(new Set(accountContexts.flatMap((context) => context.organizationId ? [context.organizationId] : [])))
      const teamNames = new Map(accountContexts.filter((context) => context.teamId).map((context) => [context.teamId as string, context.name]))
      const organizationNames = new Map(accountContexts.filter((context) => context.organizationId).map((context) => [context.organizationId as string, context.name]))

      const [{ data: teamEvents }, { data: organizationEvents }, { data: tournaments }, { data: tournamentTeams }] = await Promise.all([
        teamIds.length
          ? supabase.from('team_calendar_events').select('id, title, event_type, starts_at, ends_at, all_day, team_id').in('team_id', teamIds).order('starts_at', { ascending: true }).limit(12)
          : Promise.resolve({ data: [] }),
        organizationIds.length
          ? supabase.from('organization_calendar_events').select('id, title, event_type, starts_at, ends_at, all_day, organization_id').in('organization_id', organizationIds).order('starts_at', { ascending: true }).limit(12)
          : Promise.resolve({ data: [] }),
        supabase.from('tournaments').select('id, name, start_date, end_date, organization_id, organizer_team_id, status').neq('status', 'draft').order('start_date', { ascending: true }).limit(24),
        teamIds.length
          ? supabase.from('tournament_teams').select('tournament_id, team_id').in('team_id', teamIds)
          : Promise.resolve({ data: [] }),
      ])

      const mappedTeamEvents = (teamEvents ?? []).map((event) => ({
        ...event,
        source_type: 'team' as const,
        source_name: teamNames.get(event.team_id) || 'Equipo',
      }))
      const mappedOrganizationEvents = (organizationEvents ?? []).map((event) => ({
        ...event,
        source_type: 'organization' as const,
        source_name: organizationNames.get(event.organization_id) || 'Organización',
      }))
      const tournamentTeamIds = new Set((tournamentTeams ?? []).map((item) => item.tournament_id))
      const mappedTournamentEvents = (tournaments ?? [])
        .filter((tournament) => Boolean(
          (tournament.organizer_team_id && teamNames.has(tournament.organizer_team_id))
          || tournamentTeamIds.has(tournament.id)
          || (tournament.organization_id && organizationNames.has(tournament.organization_id)),
        ))
        .filter((tournament) => Boolean(tournament.start_date))
        .map((tournament) => {
          const teamName = tournament.organizer_team_id ? teamNames.get(tournament.organizer_team_id) : null
          const organizationName = tournament.organization_id ? organizationNames.get(tournament.organization_id) : null
          return {
            id: `tournament:${tournament.id}`,
            title: tournament.name,
            event_type: 'match' as const,
            starts_at: dateStart(tournament.start_date),
            ends_at: dateEnd(tournament.end_date || tournament.start_date),
            all_day: true,
            source_type: organizationName ? 'organization' as const : 'team' as const,
            source_name: organizationName || teamName || 'Torneo',
          }
        })

      setEvents([...mappedTeamEvents, ...mappedOrganizationEvents, ...mappedTournamentEvents].sort((left, right) => (
        new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime()
      )).slice(0, 8) as PersonalEvent[])
      setLoading(false)
    }

    void loadPersonalView()
  }, [])

  const upcomingEvents = useMemo(() => {
    const now = Date.now()
    return events.filter((event) => new Date(event.ends_at).getTime() >= now)
  }, [events])

  const uniqueEntities = new Set(contexts.filter((context) => context.teamId || context.organizationId).map((context) => `${context.contextType}:${context.teamId || context.organizationId}`))
  const uniqueDisciplines = new Set(contexts.map((context) => context.discipline).filter(Boolean))
  const initials = profileName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  return (
    <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col justify-between gap-5 border-b border-[#1f4057] pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.3em] text-[#b4ff45]">Espacio personal</p>
            <h1 className="mt-3 font-display text-5xl uppercase sm:text-6xl">Mi vista</h1>
            <p className="mt-3 max-w-2xl text-slate-400">Una vista general de tus equipos, organizaciones, roles y compromisos.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#b4ff45] font-display text-xl text-[#07131e]">{initials || 'AX'}</div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Cuenta personal</p>
              <p className="font-bold text-white">{profileName}</p>
            </div>
          </div>
        </header>

        {error && <p role="alert" className="rounded-xl border border-[#ff7d88]/40 bg-[#ff7d88]/10 p-4 text-sm text-[#ffb0b7]">{error}</p>}

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-[#1f4057] bg-[#0b1d2c] p-5">
            <Users className="text-[#b4ff45]" size={21} />
            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Afiliaciones</p>
            <p className="mt-1 font-display text-4xl">{uniqueEntities.size}</p>
            <p className="mt-1 text-xs text-slate-500">Equipos y organizaciones vinculadas</p>
          </article>
          <article className="rounded-2xl border border-[#1f4057] bg-[#0b1d2c] p-5">
            <CheckCircle2 className="text-[#b4ff45]" size={21} />
            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Roles activos</p>
            <p className="mt-1 font-display text-4xl">{contexts.length}</p>
            <p className="mt-1 text-xs text-slate-500">Cada rol conserva sus permisos</p>
          </article>
          <article className="rounded-2xl border border-[#1f4057] bg-[#0b1d2c] p-5">
            <CalendarDays className="text-[#b4ff45]" size={21} />
            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Próximas actividades</p>
            <p className="mt-1 font-display text-4xl">{upcomingEvents.length}</p>
            <p className="mt-1 text-xs text-slate-500">Compromisos de tus entidades</p>
          </article>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-[#1f4057] pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Agenda global</p>
                <h2 className="mt-2 font-display text-3xl uppercase">Próximos compromisos</h2>
              </div>
              <button type="button" onClick={() => window.alert('El calendario llegará próximamente.')} className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-[#b4ff45] hover:text-white">Ver calendario <ArrowUpRight size={15} /></button>
            </div>
            <div className="mt-5 space-y-3">
              {loading && <p className="py-8 text-sm text-slate-400">Cargando tus compromisos...</p>}
              {!loading && !upcomingEvents.length && <p className="rounded-xl border border-dashed border-[#31556b] p-5 text-sm text-slate-400">Todavía no tienes actividades próximas.</p>}
              {!loading && upcomingEvents.map((event) => (
                <article key={`${event.source_type}-${event.id}`} className="flex items-start gap-3 rounded-xl border border-[#29485d] bg-[#07131e] p-4">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${indicatorClass(event)}`} />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{event.title}</p>
                    <p className="mt-1 text-xs capitalize text-slate-400">{formatEventDate(event)}</p>
                    <p className="mt-2 text-xs font-semibold text-[#b4ff45]">{event.source_name}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-[#1f4057] pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Identidad deportiva</p>
                <h2 className="mt-2 font-display text-3xl uppercase">Mis afiliaciones</h2>
              </div>
              <span className="text-sm text-slate-500">{uniqueDisciplines.size} disciplinas</span>
            </div>
            <div className="mt-5 space-y-3">
              {loading && <p className="py-8 text-sm text-slate-400">Cargando afiliaciones...</p>}
              {!loading && !contexts.filter((context) => context.teamId || context.organizationId).length && <p className="rounded-xl border border-dashed border-[#31556b] p-5 text-sm text-slate-400">Todavía no tienes afiliaciones activas.</p>}
              {!loading && contexts.filter((context) => context.teamId || context.organizationId).map((context) => (
                <article key={context.id} className="rounded-xl border border-[#29485d] bg-[#07131e] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-white">{context.name}</p>
                      <p className="mt-1 text-xs text-[#b4ff45]">{roleLabels[context.role]}{context.roleLabel ? ` · ${context.roleLabel}` : ''}</p>
                    </div>
                    <span className="rounded-md border border-[#31556b] px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">{context.contextType === 'team' ? 'Equipo' : 'Organización'}</span>
                  </div>
                  {context.discipline && <p className="mt-3 text-xs text-slate-500">{context.discipline}</p>}
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

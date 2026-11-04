'use client'

import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { loadAccountContexts } from '../../lib/account-contexts'
import { supabase } from '../../lib/supabase'
import { Button, FieldLabel, Notice, inputClass } from '../mi-equipo/ui'
import { Card } from '../mi-perfil/ui'
import { LimitMeter, LockedFeature } from '../organizacion/plan-ui'

export type TeamUsage = {
  plan: string
  code: string
  limits: Record<string, number | null>
  flags: Record<string, boolean>
  usage: Record<string, number>
  season: { starts_on: string; ends_on: string }
}

export type ActiveTeam = {
  status: 'cargando' | 'sin-equipo' | 'listo'
  team: { id: string; name: string; role: string } | null
  usage: TeamUsage | null
  reload: () => Promise<void>
}

export function teamFlag(usage: TeamUsage | null, key: string) {
  return usage?.flags?.[key] === true
}

export function teamLimit(usage: TeamUsage | null, key: string): number | null | undefined {
  if (!usage) return undefined
  return usage.limits?.[key] ?? null
}

export async function loadTeamUsage(teamId: string) {
  if (!supabase) return null
  const { data } = await supabase.rpc('platform_team_usage', { p_team: teamId })
  return (data ?? null) as TeamUsage | null
}

// Equipo del contexto activo (cuenta de equipo), con el plan y el uso de sus límites.
export function useActiveTeam(): ActiveTeam {
  const [status, setStatus] = useState<ActiveTeam['status']>('cargando')
  const [team, setTeam] = useState<ActiveTeam['team']>(null)
  const [usage, setUsage] = useState<TeamUsage | null>(null)

  async function load() {
    if (!supabase) return setStatus('sin-equipo')
    const { data } = await supabase.auth.getUser()
    if (!data.user) return setStatus('sin-equipo')
    const contexts = await loadAccountContexts(data.user.id)
    const stored = window.localStorage.getItem('athlonx-active-context-id')
    const current = contexts.find((context) => context.id === stored) ?? contexts[0]
    if (current?.contextType !== 'team' || !current.teamId) return setStatus('sin-equipo')
    setTeam({ id: current.teamId, name: current.name, role: current.role })
    setUsage(await loadTeamUsage(current.teamId))
    setStatus('listo')
  }

  useEffect(() => {
    void load()
    const onChange = () => void load()
    window.addEventListener('athlonx-context-change', onChange)
    return () => window.removeEventListener('athlonx-context-change', onChange)
    // Depende solo del contexto activo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { status, team, usage, reload: async () => { if (team) setUsage(await loadTeamUsage(team.id)) } }
}

export function useTeamUsage(teamId: string) {
  const [usage, setUsage] = useState<TeamUsage | null>(null)
  useEffect(() => { void loadTeamUsage(teamId).then(setUsage) }, [teamId])
  return { usage, reload: async () => setUsage(await loadTeamUsage(teamId)) }
}

// Medidores del plan del equipo (Mi equipo y Mi perfil).
export function TeamLimitMeters({ usage, keys }: { usage: TeamUsage; keys: Array<[string, string]> }) {
  return (
    <div className="flex flex-col gap-3.5">
      {keys.map(([key, label]) => <LimitMeter key={key} label={label} used={usage.usage?.[key] ?? 0} limit={usage.limits?.[key] ?? null} />)}
    </div>
  )
}

// Mi perfil · Roles: personas con permiso de tesorero (ven y registran las finanzas).
export function TeamTreasurersCard({ teamId, members, canEdit }: { teamId: string; members: Array<{ userId: string; fullName: string }>; canEdit: boolean }) {
  const { usage, reload } = useTeamUsage(teamId)
  const [rows, setRows] = useState<Array<{ user_id: string }>>([])
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')

  async function load() {
    if (!supabase) return
    const { data } = await supabase.from('team_treasurers').select('user_id').eq('team_id', teamId)
    setRows((data ?? []) as Array<{ user_id: string }>)
  }
  useEffect(() => { void load() }, [teamId])

  async function add() {
    if (!supabase || !selected) return
    const { error: insertError } = await supabase.from('team_treasurers').insert({ team_id: teamId, user_id: selected })
    if (insertError) return setError(insertError.message)
    setSelected(''); setError(''); await load(); await reload()
  }
  async function remove(userId: string) {
    if (!supabase) return
    const { error: deleteError } = await supabase.from('team_treasurers').delete().eq('team_id', teamId).eq('user_id', userId)
    if (deleteError) return setError(deleteError.message)
    await load(); await reload()
  }

  const nameOf = (id: string) => members.find((m) => m.userId === id)?.fullName ?? 'Persona del equipo'
  const available = members.filter((m) => !rows.some((r) => r.user_id === m.userId))
  const limit = usage ? (usage.limits?.tesoreros ?? null) : undefined
  const full = limit !== null && limit !== undefined && rows.length >= limit

  return (
    <Card title="Tesoreros" description="Ven y registran las finanzas del equipo. No necesitan ser staff: basta con darles el permiso.">
      {usage && <LimitMeter label="Personas con permiso de tesorero" used={rows.length} limit={limit} />}
      {rows.length === 0 && <p className="text-sm text-[var(--ax-muted)]">Todavía no hay tesoreros.</p>}
      {rows.map((row) => (
        <div key={row.user_id} className="flex items-center justify-between gap-3 border-t border-[var(--ax-line)] pt-3">
          <span className="text-sm font-semibold text-[var(--ax-text)]">{nameOf(row.user_id)}</span>
          {canEdit && <Button size="sm" variant="secondary" onClick={() => void remove(row.user_id)}>Quitar</Button>}
        </div>
      ))}
      {canEdit && !full && available.length > 0 && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <FieldLabel>Agregar tesorero</FieldLabel>
            <select className={inputClass} value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Elige una persona del equipo</option>
              {available.map((m) => <option key={m.userId} value={m.userId}>{m.fullName}</option>)}
            </select>
          </label>
          <Button variant="secondary" disabled={!selected} onClick={() => void add()}>Dar permiso</Button>
        </div>
      )}
      {canEdit && full && <LockedFeature label={`Tu plan permite ${limit} ${limit === 1 ? 'tesorero' : 'tesoreros'}`} />}
      {error && <Notice tone="danger" icon={Info}>{error}</Notice>}
    </Card>
  )
}

// Mi perfil · Roles: permisos de edición por evento (desde Pro).
export function TeamEventPermissionsCard({ teamId }: { teamId: string }) {
  const { usage } = useTeamUsage(teamId)
  return (
    <Card title="Permisos de edición por evento">
      {!usage ? null : teamFlag(usage, 'permisos_evento')
        ? <p className="text-sm text-[var(--ax-text-secondary)]">Da permiso para editar un evento a cualquier persona con permiso de staff del equipo. Se asigna desde el detalle del evento en Calendario.</p>
        : <LockedFeature label="Permiso para editar eventos a personas con permiso de staff" />}
    </Card>
  )
}

// Mi perfil · Configuración: temporada del equipo (se usa en Estadísticas y Finanzas).
export function TeamSeasonCard({ teamId, canEdit }: { teamId: string; canEdit: boolean }) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.rpc('platform_team_usage', { p_team: teamId }).then(({ data }) => {
      const season = (data as TeamUsage | null)?.season
      if (season) { setStart(season.starts_on); setEnd(season.ends_on) }
    })
  }, [teamId])

  async function save() {
    if (!supabase) return
    const { error } = await supabase.rpc('team_set_season', { p_team: teamId, p_start: start, p_end: end })
    setMessage(error ? { tone: 'danger', text: error.message } : { tone: 'success', text: 'Temporada guardada.' })
  }

  return (
    <Card title="Temporada" description="Define el inicio y el fin de la temporada. Se usa en Estadísticas y Finanzas.">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><FieldLabel>Inicio</FieldLabel><input type="date" className={inputClass} value={start} disabled={!canEdit} onChange={(e) => setStart(e.target.value)} /></label>
        <label className="block"><FieldLabel>Fin</FieldLabel><input type="date" className={inputClass} value={end} disabled={!canEdit} onChange={(e) => setEnd(e.target.value)} /></label>
      </div>
      {canEdit && <div><Button variant="secondary" onClick={() => void save()}>Guardar temporada</Button></div>}
      {message && <Notice tone={message.tone} icon={Info}>{message.text}</Notice>}
    </Card>
  )
}

// Mi equipo: límites del plan (divisiones, jugadores por división y cuerpo técnico).
export function TeamPlanLimitsCard({ teamId }: { teamId: string }) {
  const { usage } = useTeamUsage(teamId)
  if (!usage) return null
  return (
    <section className="flex flex-col gap-3.5 rounded-2xl border border-[var(--ax-line)] bg-[var(--ax-surface)] p-4 sm:rounded-[20px] sm:p-6">
      <h2 className="font-display text-[26px] uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">Límites del plan</h2>
      <TeamLimitMeters usage={usage} keys={[['divisiones', 'Divisiones'], ['jugadores_division', 'Jugadores por división (máximo)'], ['cuerpo_tecnico', 'Cuerpo técnico y directiva']]} />
    </section>
  )
}

// Eventos: torneos rápidos que organiza el equipo.
export function TeamTournamentsCard({ teamId }: { teamId: string }) {
  const { usage } = useTeamUsage(teamId)
  if (!usage) return null
  const perTournament = usage.limits?.equipos_por_torneo ?? null
  const unlimited = (usage.limits?.torneos_rapidos ?? null) === null
  return (
    <section className="flex flex-col gap-3.5 rounded-2xl border border-[var(--ax-line)] bg-[var(--ax-surface)] p-4 sm:rounded-[20px] sm:p-6">
      <h2 className="font-display text-[26px] uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">Torneos del equipo</h2>
      <TeamLimitMeters usage={usage} keys={[['torneos_rapidos', 'Torneos rápidos activos']]} />
      <p className="text-[13px] text-[var(--ax-muted)]">
        {unlimited ? 'Torneos rápidos y ligas sin límite.' : `${perTournament ? `Hasta ${perTournament} equipos por torneo. ` : ''}Formato liga disponible en tu torneo activo.`}
      </p>
    </section>
  )
}

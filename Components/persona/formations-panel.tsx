'use client'

import { Map as MapIcon, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AccountContext, loadAccountContexts } from '../../lib/account-contexts'
import { AccountPlan, loadAccountPlan } from '../../lib/account-plans'
import { supabase } from '../../lib/supabase'
import { Button, Card, CardHeader, EmptyState, Notice, PageHeader, Segment, inputClass, FieldLabel } from '../mi-equipo/ui'
import { useTeamRoster } from '../mi-equipo/use-team-roster'
import { LockedFeature } from '../organizacion/plan-ui'
import { PersonaViewSwitcher } from '../persona-view-switcher'
import { PersonaShell } from './persona-ui'

// Posiciones de rugby (15). Coordenadas en % de la cancha.
const rugbySlots = [
  { number: 1, role: 'Pilar', x: 35, y: 16 }, { number: 2, role: 'Hooker', x: 50, y: 16 }, { number: 3, role: 'Pilar', x: 65, y: 16 },
  { number: 4, role: 'Segunda línea', x: 43, y: 26 }, { number: 5, role: 'Segunda línea', x: 57, y: 26 },
  { number: 6, role: 'Ala', x: 30, y: 34 }, { number: 7, role: 'Ala', x: 70, y: 34 }, { number: 8, role: 'Número 8', x: 50, y: 37 },
  { number: 9, role: 'Medio scrum', x: 42, y: 50 }, { number: 10, role: 'Apertura', x: 30, y: 60 },
  { number: 11, role: 'Wing', x: 10, y: 76 }, { number: 12, role: 'Centro', x: 45, y: 68 }, { number: 13, role: 'Centro', x: 60, y: 74 },
  { number: 14, role: 'Wing', x: 90, y: 76 }, { number: 15, role: 'Fullback', x: 50, y: 86 },
]

type Formation = { id: string; name: string; sport: string; positions: Array<{ number: number; player: string }> }

// Formaciones (Pro, coach): arma la alineación sobre la cancha y la guarda por equipo y reutilizable.
export function FormationsPanel() {
  const [teams, setTeams] = useState<AccountContext[]>([])
  const [teamId, setTeamId] = useState('')
  const [plan, setPlan] = useState<AccountPlan | null>(null)
  const [formations, setFormations] = useState<Formation[]>([])
  const [name, setName] = useState('')
  const [assign, setAssign] = useState<Record<number, string>>({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState('')
  const roster = useTeamRoster(teamId || undefined)
  const isPro = Boolean(plan && plan.code !== 'libre')
  const players = roster.members.map((m) => m.full_name)

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const [contexts, accountPlan] = await Promise.all([loadAccountContexts(data.user.id), loadAccountPlan('persona', data.user.id).catch(() => null)])
      if (!active) return
      const coached = contexts.filter((c) => c.contextType === 'team' && c.teamId && c.role === 'entrenador')
      setUserId(data.user.id); setTeams(coached); setTeamId(coached[0]?.teamId ?? ''); setPlan(accountPlan)
    }
    void load()
    return () => { active = false }
  }, [])

  async function loadFormations() {
    if (!supabase || !teamId) return
    const { data } = await supabase.from('team_formations').select('id, name, sport, positions').eq('team_id', teamId).order('created_at', { ascending: false })
    setFormations((data ?? []) as Formation[])
  }

  useEffect(() => { void loadFormations() }, [teamId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!supabase || !teamId) return
    if (!name.trim()) return setError('Pon un nombre para la formación.')
    const positions = rugbySlots.map((slot) => ({ number: slot.number, position: slot.role, player: assign[slot.number] ?? '' }))
    const { error: iErr } = await supabase.from('team_formations').insert({ team_id: teamId, name: name.trim(), sport: 'rugby', positions, created_by: userId })
    if (iErr) return setError(iErr.message)
    setName(''); setAssign({}); setError(''); setMessage('Formación guardada.'); await loadFormations()
  }

  if (!teams.length) return <PersonaShell><PersonaViewSwitcher active="entrenador" /><PageHeader title="Formaciones" description="Solo los entrenadores arman formaciones." /><Notice tone="neutral" icon={MapIcon}>Esta función es para entrenadores con equipo a cargo.</Notice></PersonaShell>

  return (
    <PersonaShell>
      <PersonaViewSwitcher active="entrenador" />
      <PageHeader title="Formaciones" description="Arma alineaciones sobre la cancha y compártelas con tus jugadores." />
      {!isPro && <LockedFeature label="Formaciones y mapeo de cancha" />}
      {error && <Notice tone="danger" icon={MapIcon}>{error}</Notice>}
      {message && <Notice tone="success" icon={MapIcon}>Formación guardada.</Notice>}
      {teams.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Equipo">
          {teams.map((t) => <Segment key={t.id} active={t.teamId === teamId} label={t.name} onClick={() => setTeamId(t.teamId as string)} />)}
        </div>
      )}
      {isPro && (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <Card labelledBy="cancha">
            <CardHeader id="cancha" title="Rugby · 15" subtitle="Elige a un jugador para cada posición" />
            <div className="relative mt-4 aspect-[3/4] w-full max-w-[460px] overflow-hidden rounded-[14px] border border-[var(--ax-line)] bg-[var(--ax-surface-sunken)]" role="img" aria-label="Cancha de rugby">
              {rugbySlots.map((slot) => (
                <div key={slot.number} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ax-accent)] text-xs font-bold text-[var(--ax-on-accent)]">{slot.number}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {rugbySlots.map((slot) => (
                <label key={slot.number} className="block">
                  <FieldLabel>{slot.number} · {slot.role}</FieldLabel>
                  <select className={inputClass} value={assign[slot.number] ?? ''} onChange={(e) => setAssign({ ...assign, [slot.number]: e.target.value })}>
                    <option value="">Sin asignar</option>
                    {players.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </Card>
          <div className="space-y-4">
            <Card labelledBy="guardar">
              <CardHeader id="guardar" title="Guardar formación" />
              <label className="mt-4 block"><FieldLabel>Nombre</FieldLabel><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Titulares vs Leones" /></label>
              <div className="mt-4"><Button variant="primary" icon={Save} onClick={() => void save()}>Guardar formación</Button></div>
            </Card>
            <Card labelledBy="guardadas">
              <CardHeader id="guardadas" title="Formaciones guardadas" />
              {formations.length === 0 ? <div className="mt-4"><EmptyState icon={MapIcon} title="Sin formaciones" description="Las que guardes aparecerán aquí." /></div> : (
                <ul className="mt-4 divide-y divide-[var(--ax-line)]">
                  {formations.map((f) => <li key={f.id} className="py-3 text-sm font-semibold text-[var(--ax-text)]">{f.name} <span className="font-normal text-[var(--ax-muted)]">· {f.positions.filter((p) => p.player).length} de 15 asignados</span></li>)}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </PersonaShell>
  )
}

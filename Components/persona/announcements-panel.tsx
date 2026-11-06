'use client'

import { Megaphone, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AccountContext, loadAccountContexts } from '../../lib/account-contexts'
import { AccountPlan, loadAccountPlan, planFlag } from '../../lib/account-plans'
import { supabase } from '../../lib/supabase'
import { Badge, Button, Card, CardHeader, EmptyState, Notice, PageHeader, Segment, inputClass, FieldLabel } from '../mi-equipo/ui'
import { LockedFeature } from '../organizacion/plan-ui'
import { PersonaViewSwitcher } from '../persona-view-switcher'
import { PersonaShell } from './persona-ui'

type Division = { id: string; name: string }
type Announcement = { id: string; team_id: string; division_id: string | null; title: string; body: string; created_at: string }

// Anuncios (Pro): el entrenador publica para el equipo o una división. El atleta los ve y se registra la lectura.
export function AnnouncementsPanel() {
  const [teams, setTeams] = useState<AccountContext[]>([])
  const [teamId, setTeamId] = useState('')
  const [role, setRole] = useState<'atleta' | 'entrenador'>('atleta')
  const [plan, setPlan] = useState<AccountPlan | null>(null)
  const [userId, setUserId] = useState('')
  const [items, setItems] = useState<Announcement[]>([])
  const [views, setViews] = useState<Record<string, number>>({})
  const [divisions, setDivisions] = useState<Division[]>([])
  const [form, setForm] = useState({ title: '', body: '', division: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const isPro = planFlag(plan, 'entrenador_pro')
  const isCoach = role === 'entrenador'

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const [contexts, accountPlan] = await Promise.all([loadAccountContexts(data.user.id), loadAccountPlan('persona', data.user.id).catch(() => null)])
      if (!active) return
      const list = contexts.filter((c) => c.contextType === 'team' && c.teamId && (c.role === 'atleta' || c.role === 'entrenador'))
      setUserId(data.user.id); setTeams(list); setPlan(accountPlan)
      setTeamId(list[0]?.teamId ?? ''); setRole(list[0]?.role === 'entrenador' ? 'entrenador' : 'atleta')
    }
    void load()
    return () => { active = false }
  }, [])

  async function refresh() {
    if (!supabase || !teamId) return
    const [{ data: rows, error: aErr }, { data: divs }] = await Promise.all([
      supabase.from('team_announcements').select('id, team_id, division_id, title, body, created_at').eq('team_id', teamId).order('created_at', { ascending: false }),
      supabase.from('team_division_catalog').select('id, name').eq('team_id', teamId),
    ])
    if (aErr) return setError(aErr.message)
    const list = (rows ?? []) as Announcement[]
    setItems(list)
    setDivisions((divs ?? []) as Division[])
    if (isCoach && list.length) {
      const { data: v } = await supabase.from('team_announcement_views').select('announcement_id').in('announcement_id', list.map((a) => a.id))
      const counts: Record<string, number> = {}
      for (const row of (v ?? []) as Array<{ announcement_id: string }>) counts[row.announcement_id] = (counts[row.announcement_id] ?? 0) + 1
      setViews(counts)
    } else if (!isCoach && list.length && userId) {
      // Registra la lectura de los anuncios que el atleta ya vio en la pantalla.
      await supabase.from('team_announcement_views').upsert(list.map((a) => ({ announcement_id: a.id, user_id: userId })), { onConflict: 'announcement_id,user_id', ignoreDuplicates: true })
    }
  }

  useEffect(() => { void refresh() }, [teamId, role, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function publish() {
    if (!supabase || !teamId) return
    if (!form.title.trim() || !form.body.trim()) return setError('Pon un título y el mensaje del anuncio.')
    const { error: iErr } = await supabase.from('team_announcements').insert({ team_id: teamId, division_id: form.division || null, title: form.title.trim(), body: form.body.trim(), created_by: userId })
    if (iErr) return setError(iErr.message)
    setForm({ title: '', body: '', division: '' }); setError(''); setMessage('Anuncio publicado.'); await refresh()
  }

  return (
    <PersonaShell>
      <PersonaViewSwitcher active={role} />
      <PageHeader title="Anuncios" description={isCoach ? 'Comunicados para todo el equipo o para una división.' : 'Comunicados de tu equipo.'} />
      {!isPro && isCoach && <LockedFeature label="Publicar anuncios y comunicados al equipo" />}
      {error && <Notice tone="danger" icon={Megaphone}>{error}</Notice>}
      {message && <Notice tone="success" icon={Megaphone}>{message}</Notice>}
      {teams.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Equipo">
          {teams.map((t) => <Segment key={t.id} active={t.teamId === teamId} label={t.name} onClick={() => { setTeamId(t.teamId as string); setRole(t.role === 'entrenador' ? 'entrenador' : 'atleta') }} />)}
        </div>
      )}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        {isCoach && isPro && (
          <Card labelledBy="nuevo-anuncio">
            <CardHeader id="nuevo-anuncio" title="Nuevo anuncio" />
            <div className="mt-4 space-y-4">
              <label className="block"><FieldLabel>Título</FieldLabel><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Cambio de horario del jueves" /></label>
              <label className="block"><FieldLabel>Mensaje</FieldLabel><textarea className={`${inputClass} h-28 py-2`} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
              <label className="block"><FieldLabel>Para</FieldLabel>
                <select className={inputClass} value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })}>
                  <option value="">Todo el equipo</option>
                  {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <Button variant="primary" icon={Send} onClick={() => void publish()}>Publicar anuncio</Button>
            </div>
          </Card>
        )}
        <Card labelledBy="publicados" className={isCoach && isPro ? '' : 'lg:col-span-2'}>
          <CardHeader id="publicados" title={isCoach ? 'Publicados' : 'Anuncios del equipo'} />
          {items.length === 0 ? <div className="mt-4"><EmptyState icon={Megaphone} title="Sin anuncios" description={isCoach ? 'Los anuncios que publiques aparecerán aquí.' : 'Tu entrenador aún no ha publicado anuncios.'} /></div> : (
            <ul className="mt-4 divide-y divide-[var(--ax-line)]">
              {items.map((a) => (
                <li key={a.id} className="space-y-1.5 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--ax-text)]">{a.title}</p>
                    {isCoach && <Badge tone="neutral">{views[a.id] ?? 0} lecturas</Badge>}
                  </div>
                  <p className="text-xs text-[var(--ax-muted)]">{a.division_id ? divisions.find((d) => d.id === a.division_id)?.name ?? 'División' : 'Todo el equipo'} · {new Date(a.created_at).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' })}</p>
                  <p className="whitespace-pre-line text-sm text-[var(--ax-text-secondary)]">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PersonaShell>
  )
}

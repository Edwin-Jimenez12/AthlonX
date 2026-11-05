'use client'

import { Dumbbell, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AccountContext, loadAccountContexts } from '../../lib/account-contexts'
import { supabase } from '../../lib/supabase'
import { Badge, Button, Card, CardHeader, EmptyState, Notice, PageHeader, Segment, inputClass, FieldLabel } from '../mi-equipo/ui'
import { PersonaShell } from './persona-ui'
import { PersonaViewSwitcher } from '../persona-view-switcher'

type Division = { id: string; name: string }
type Exercise = { name: string; detail: string }
type Session = { id: string; team_id: string; division_id: string | null; title: string; starts_at: string; duration_min: number; notes: string | null; exercises: Array<{ id: string; name: string; detail: string | null; position: number }> }
type Response = { session_id: string; user_id: string; status: 'voy' | 'tal_vez' | 'no_voy' }
type Template = { id: string; name: string; exercises: Exercise[] }

const responseLabels: Record<Response['status'], string> = { voy: 'Voy', tal_vez: 'Tal vez', no_voy: 'No voy' }

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-PA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Entrenamientos (Free): el entrenador planifica sesiones, plantillas y asigna por división; el atleta responde.
export function TrainingPanel() {
  const [teams, setTeams] = useState<AccountContext[]>([])
  const [teamId, setTeamId] = useState('')
  const [role, setRole] = useState<'atleta' | 'entrenador' | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [responses, setResponses] = useState<Response[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ title: '', starts: '', duration: '60', notes: '', division: '', exercises: [{ name: '', detail: '' }] as Exercise[] })

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const contexts = (await loadAccountContexts(data.user.id)).filter((c) => c.contextType === 'team' && c.teamId && (c.role === 'atleta' || c.role === 'entrenador'))
      if (!active) return
      setUserId(data.user.id)
      setTeams(contexts)
      setTeamId(contexts[0]?.teamId ?? '')
      setRole(contexts[0]?.role === 'entrenador' ? 'entrenador' : 'atleta')
    }
    void load()
    return () => { active = false }
  }, [])

  const current = teams.find((c) => c.teamId === teamId)
  const isCoach = current?.role === 'entrenador'

  async function refresh() {
    if (!supabase || !teamId) return
    const [{ data: rows, error: sErr }, { data: divs }, { data: tpl }] = await Promise.all([
      supabase.from('team_training_sessions').select('id, team_id, division_id, title, starts_at, duration_min, notes, team_training_exercises(id, name, detail, position)').eq('team_id', teamId).order('starts_at', { ascending: true }),
      supabase.from('team_division_catalog').select('id, name').eq('team_id', teamId),
      supabase.from('team_training_templates').select('id, name, exercises').eq('team_id', teamId).order('created_at', { ascending: false }),
    ])
    if (sErr) { setError(sErr.message); return }
    const list = (rows ?? []).map((r: any) => ({ ...r, exercises: [...(r.team_training_exercises ?? [])].sort((a: any, b: any) => a.position - b.position) })) as Session[]
    setSessions(list)
    setDivisions((divs ?? []) as Division[])
    setTemplates((tpl ?? []) as Template[])
    const ids = list.map((s) => s.id)
    if (ids.length) {
      const { data: resp } = await supabase.from('team_training_responses').select('session_id, user_id, status').in('session_id', ids)
      setResponses((resp ?? []) as Response[])
    } else setResponses([])
  }

  useEffect(() => { void refresh() }, [teamId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function respond(sessionId: string, status: Response['status']) {
    if (!supabase) return
    const { error: rErr } = await supabase.from('team_training_responses').upsert({ session_id: sessionId, user_id: userId, status, updated_at: new Date().toISOString() }, { onConflict: 'session_id,user_id' })
    if (rErr) return setError(rErr.message)
    setMessage('Respuesta guardada.')
    await refresh()
  }

  async function createSession() {
    if (!supabase || !teamId) return
    const exercises = form.exercises.filter((e) => e.name.trim())
    if (!form.title.trim() || !form.starts) return setError('Pon un título y la fecha de la sesión.')
    const { data: created, error: cErr } = await supabase.from('team_training_sessions').insert({
      team_id: teamId, title: form.title.trim(), starts_at: new Date(form.starts).toISOString(),
      duration_min: Number(form.duration) || 60, notes: form.notes.trim() || null, division_id: form.division || null, created_by: userId,
    }).select('id').single()
    if (cErr || !created) return setError(cErr?.message ?? 'No se pudo crear la sesión.')
    if (exercises.length) {
      const { error: eErr } = await supabase.from('team_training_exercises').insert(exercises.map((e, i) => ({ session_id: created.id, name: e.name.trim(), detail: e.detail.trim() || null, position: i })))
      if (eErr) return setError(eErr.message)
    }
    setForm({ title: '', starts: '', duration: '60', notes: '', division: '', exercises: [{ name: '', detail: '' }] })
    setError(''); setMessage('Sesión creada.')
    await refresh()
  }

  async function saveTemplate() {
    if (!supabase || !teamId || !form.title.trim()) return setError('Pon un título para guardar la plantilla.')
    const exercises = form.exercises.filter((e) => e.name.trim())
    const { error: tErr } = await supabase.from('team_training_templates').insert({ team_id: teamId, name: form.title.trim(), exercises, created_by: userId })
    if (tErr) return setError(tErr.message)
    setMessage('Plantilla guardada.'); await refresh()
  }

  async function removeSession(id: string) {
    if (!supabase) return
    const { error: dErr } = await supabase.from('team_training_sessions').delete().eq('id', id)
    if (dErr) return setError(dErr.message)
    await refresh()
  }

  const myResponse = (sessionId: string) => responses.find((r) => r.session_id === sessionId && r.user_id === userId)?.status
  const countFor = (sessionId: string, status: Response['status']) => responses.filter((r) => r.session_id === sessionId && r.status === status).length

  return (
    <PersonaShell>
      <PersonaViewSwitcher active={role === 'entrenador' ? 'entrenador' : 'atleta'} />
      <PageHeader title="Entrenamientos" description={isCoach ? 'Planifica sesiones, ejercicios y plantillas, y asígnalas a tu división.' : 'Los entrenamientos que te asigna tu entrenador. Confirma si vas a cada uno.'} />
      {error && <Notice tone="danger" icon={Dumbbell}>{error}</Notice>}
      {message && <Notice tone="success" icon={Dumbbell}>{message}</Notice>}
      {teams.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Equipo">
          {teams.map((t) => <Segment key={t.id} active={t.teamId === teamId} label={t.name} onClick={() => { setTeamId(t.teamId as string); setRole(t.role === 'entrenador' ? 'entrenador' : 'atleta') }} />)}
        </div>
      )}

      {isCoach && (
        <Card labelledBy="nueva-sesion">
          <CardHeader id="nueva-sesion" title="Nueva sesión" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block"><FieldLabel>Título</FieldLabel><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Fuerza tren inferior" /></label>
            <label className="block"><FieldLabel>Fecha y hora</FieldLabel><input type="datetime-local" className={inputClass} value={form.starts} onChange={(e) => setForm({ ...form, starts: e.target.value })} /></label>
            <label className="block"><FieldLabel>Duración (min)</FieldLabel><input type="number" min={5} max={480} className={inputClass} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></label>
            <label className="block"><FieldLabel>Asignar a</FieldLabel>
              <select className={inputClass} value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })}>
                <option value="">Todo el equipo</option>
                {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 space-y-2">
            <FieldLabel>Ejercicios</FieldLabel>
            {form.exercises.map((ex, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input className={inputClass} placeholder="Ejercicio" value={ex.name} onChange={(e) => setForm({ ...form, exercises: form.exercises.map((x, i) => i === index ? { ...x, name: e.target.value } : x) })} />
                <input className={inputClass} placeholder="Series y descanso" value={ex.detail} onChange={(e) => setForm({ ...form, exercises: form.exercises.map((x, i) => i === index ? { ...x, detail: e.target.value } : x) })} />
                <Button variant="ghost" icon={Trash2} aria-label="Quitar ejercicio" onClick={() => setForm({ ...form, exercises: form.exercises.filter((_, i) => i !== index) || [{ name: '', detail: '' }] })} />
              </div>
            ))}
            <Button variant="secondary" icon={Plus} onClick={() => setForm({ ...form, exercises: [...form.exercises, { name: '', detail: '' }] })}>Agregar ejercicio</Button>
          </div>
          {templates.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {templates.map((t) => <Button key={t.id} variant="secondary" onClick={() => setForm({ ...form, title: t.name, exercises: t.exercises.length ? t.exercises : [{ name: '', detail: '' }] })}>Usar plantilla: {t.name}</Button>)}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button variant="primary" onClick={() => void createSession()}>Asignar sesión</Button>
            <Button variant="secondary" onClick={() => void saveTemplate()}>Guardar como plantilla</Button>
          </div>
        </Card>
      )}

      <Card labelledBy="sesiones">
        <CardHeader id="sesiones" title="Sesiones" subtitle={sessions.length ? `${sessions.length} programadas` : undefined} />
        {sessions.length === 0 ? (
          <div className="mt-4"><EmptyState icon={Dumbbell} title="Sin sesiones todavía" description={isCoach ? 'Cuando asignes una sesión, aparecerá aquí.' : 'Tu entrenador aún no ha programado entrenamientos.'} /></div>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--ax-line)]">
            {sessions.map((s) => (
              <li key={s.id} className="space-y-3 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--ax-text)]">{s.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--ax-muted)]">{formatDate(s.starts_at)} · {s.duration_min} min · {s.division_id ? divisions.find((d) => d.id === s.division_id)?.name ?? 'División' : 'Todo el equipo'}</p>
                  </div>
                  {isCoach ? (
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">{countFor(s.id, 'voy')} voy · {countFor(s.id, 'tal_vez')} tal vez · {countFor(s.id, 'no_voy')} no voy</Badge>
                      <Button variant="ghost" icon={Trash2} aria-label="Borrar sesión" onClick={() => void removeSession(s.id)} />
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Tu respuesta">
                      {(Object.keys(responseLabels) as Response['status'][]).map((status) => (
                        <Segment key={status} active={myResponse(s.id) === status} label={responseLabels[status]} onClick={() => void respond(s.id, status)} />
                      ))}
                    </div>
                  )}
                </div>
                {s.exercises.length > 0 && (
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--ax-text-secondary)]">
                    {s.exercises.map((ex) => <li key={ex.id}>{ex.name}{ex.detail ? <span className="text-[var(--ax-muted)]"> · {ex.detail}</span> : null}</li>)}
                  </ol>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PersonaShell>
  )
}

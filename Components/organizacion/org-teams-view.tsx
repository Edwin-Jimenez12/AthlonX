'use client'

import { Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button, ButtonLink, Card, CardHeader, FieldLabel, Notice, PageHeader, Select, inputClass } from '../mi-equipo/ui'
import { Chip, LimitMeter, LockedFeature, TeamsTabs, downloadCsv, hasFlag, printReport, type ActiveOrganization } from './plan-ui'

type OrgTeam = { team_id: string; team_name: string; discipline: string | null; athlonx_code: string | null; owner_name: string; team_group: 'propio' | 'afiliado' | 'vinculado'; via_organization: string | null; members: number }
type Attendance = { team_id: string; team_name: string; confirmed: number; responses: number; percent: number }

const groups: Array<{ id: OrgTeam['team_group']; title: string; chip: string; tone: 'accent' | 'blue' | 'violet'; description?: string; empty: string }> = [
  { id: 'propio', title: 'Equipos propios', chip: 'Propio', tone: 'accent', empty: 'Todavía no has creado equipos propios.' },
  { id: 'afiliado', title: 'Afiliados directamente', chip: 'Afiliado', tone: 'blue', empty: 'Ningún equipo se ha afiliado directamente.' },
  { id: 'vinculado', title: 'De organizaciones vinculadas', chip: 'Vinculado', tone: 'violet', description: 'Equipos afiliados a una organización que a su vez está vinculada a la tuya.', empty: 'Las organizaciones vinculadas no tienen equipos todavía.' },
]

// Equipos de la cuenta de organización (diseño de Figma: Org · Free/Pro/Élite · Equipos).
export function OrgTeamsView({ org }: { org: ActiveOrganization }) {
  const { organization, plan, usage, reload } = org
  const [teams, setTeams] = useState<OrgTeam[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [disciplines, setDisciplines] = useState<Array<{ value: string; label: string }>>([])
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', discipline: '', city: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  const attendanceOn = hasFlag(plan, 'asistencia_equipos')
  const reportsOn = hasFlag(plan, 'reportes')
  const logoOn = hasFlag(plan, 'logo_reportes')

  async function loadTeams() {
    if (!supabase || !organization) return
    const { data, error } = await supabase.rpc('platform_org_teams', { p_org: organization.id })
    if (error) return setMessage({ tone: 'danger', text: error.message })
    setTeams((data ?? []) as OrgTeam[])
  }

  useEffect(() => {
    if (!supabase || !organization) return
    void loadTeams()
    supabase.from('disciplines').select('id, name').eq('is_active', true).order('name').then(({ data }) => {
      setDisciplines(((data ?? []) as Array<{ id: string; name: string }>).map((d) => ({ value: d.id, label: d.name })))
    })
    supabase.from('organizations').select('logo_url').eq('id', organization.id).maybeSingle().then(({ data }) => setLogoUrl((data?.logo_url as string | null) ?? null))
    // Se recarga al cambiar de organización.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id])

  useEffect(() => {
    if (!supabase || !organization || !attendanceOn) return
    supabase.rpc('org_team_attendance_summary', { p_org: organization.id }).then(({ data }) => setAttendance((data ?? []) as Attendance[]))
  }, [organization, attendanceOn])

  const byGroup = useMemo(() => {
    const map = new Map<OrgTeam['team_group'], OrgTeam[]>()
    for (const team of teams) map.set(team.team_group, [...(map.get(team.team_group) ?? []), team])
    return map
  }, [teams])

  const ownLimit = usage ? (usage.limits?.equipos_propios ?? null) : undefined
  const ownUsed = usage?.usage?.equipos_propios ?? 0
  const ownAtLimit = ownLimit !== null && ownLimit !== undefined && ownUsed >= ownLimit

  async function createTeam() {
    if (!supabase || !organization) return
    if (form.name.trim().length < 2) return setMessage({ tone: 'danger', text: 'El equipo necesita un nombre.' })
    if (!form.discipline) return setMessage({ tone: 'danger', text: 'Elige la disciplina del equipo.' })
    setSaving(true)
    const { error } = await supabase.rpc('org_create_team', { p_org: organization.id, p_name: form.name.trim(), p_discipline: form.discipline, p_city: form.city })
    setSaving(false)
    if (error) return setMessage({ tone: 'danger', text: error.message })
    setCreating(false)
    setForm({ name: '', discipline: '', city: '' })
    setMessage({ tone: 'success', text: 'Equipo creado.' })
    await loadTeams()
    await reload()
  }

  function reportRows() {
    const pct = new Map(attendance.map((row) => [row.team_id, row.percent]))
    return teams.map((team) => [team.team_name, groups.find((g) => g.id === team.team_group)?.chip ?? '', team.discipline ?? '', team.athlonx_code ?? '', team.members, attendanceOn ? `${pct.get(team.team_id) ?? 0}%` : ''])
  }
  const reportHeader = ['Equipo', 'Tipo', 'Disciplina', 'Código', 'Miembros', 'Asistencia']

  return (
    <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
      <div className="mx-auto max-w-[1184px] space-y-5 px-4 pb-16 pt-5 sm:space-y-6 sm:px-8 sm:pt-8 lg:px-10">
        <PageHeader title="Equipos" actions={<Button variant="primary" aria-expanded={creating} onClick={() => { setCreating((open) => !open); setMessage(null) }}>+ Crear equipo</Button>} />
        <TeamsTabs active="equipos" />

        {message && <Notice tone={message.tone} icon={Info}>{message.text}</Notice>}

        {creating && (
          <Card>
            <CardHeader id="crear-equipo" title="Nuevo equipo propio" actions={<Button variant="secondary" onClick={() => setCreating(false)}>Cancelar</Button>} />
            {ownAtLimit ? (
              <div className="mt-5"><LockedFeature label={`Tu plan ${plan?.name ?? ''} permite ${ownLimit} equipos propios`} /></div>
            ) : (
              <div className="mt-5 grid gap-5 md:grid-cols-3">
                <label className="block">
                  <FieldLabel>Nombre</FieldLabel>
                  <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <Select label="Disciplina" value={form.discipline} options={disciplines} onChange={(value) => setForm({ ...form, discipline: value })} />
                <label className="block">
                  <FieldLabel>Ciudad</FieldLabel>
                  <input className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </label>
                <div className="flex justify-end md:col-span-3">
                  <Button variant="primary" disabled={saving} onClick={() => void createTeam()}>{saving ? 'Creando…' : 'Crear equipo'}</Button>
                </div>
              </div>
            )}
          </Card>
        )}

        <Card className="flex flex-col gap-3.5">
          <CardHeader id="limites" title="Límites del plan" />
          {usage && (
            <>
              <LimitMeter label="Equipos propios" used={ownUsed} limit={usage.limits?.equipos_propios ?? null} />
              <LimitMeter label="Equipos afiliados" used={usage.usage?.equipos_afiliados ?? 0} limit={usage.limits?.equipos_afiliados ?? null} />
            </>
          )}
        </Card>

        {groups.map((group) => {
          const list = byGroup.get(group.id) ?? []
          return (
            <Card key={group.id} className="flex flex-col gap-3.5">
              <CardHeader id={`grupo-${group.id}`} title={group.title} />
              {group.description && <p className="text-[13px] text-[var(--ax-muted)]">{group.description}</p>}
              {list.length === 0 && <p className="text-sm text-[var(--ax-muted)]">{group.empty}</p>}
              {list.map((team) => (
                <div key={team.team_id} className="flex flex-col gap-3 border-t border-[var(--ax-line)] pt-3 first-of-type:border-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ax-text)]">{team.team_name}</p>
                    <p className="text-xs text-[var(--ax-muted)]">
                      {[team.discipline, group.id === 'propio' ? team.athlonx_code : group.id === 'afiliado' ? `dueño: ${team.owner_name}` : team.via_organization ? `vía ${team.via_organization}` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Chip tone={group.tone}>{group.chip}</Chip>
                    <span className="text-[13px] text-[var(--ax-muted)]">{team.members} {team.members === 1 ? 'miembro' : 'miembros'}</span>
                    <ButtonLink href="/calendario" variant="secondary">Ver calendario</ButtonLink>
                  </div>
                </div>
              ))}
            </Card>
          )
        })}

        <Card className="flex flex-col gap-3.5">
          <CardHeader id="asistencia" title="Asistencia resumida por equipo" />
          {!attendanceOn && <LockedFeature label="Asistencia resumida por equipo" />}
          {attendanceOn && attendance.length === 0 && <p className="text-sm text-[var(--ax-muted)]">Aún no hay respuestas de asistencia en los últimos 90 días.</p>}
          {attendanceOn && attendance.map((row) => <LimitMeter key={row.team_id} label={row.team_name} used={row.percent} limit={100} />)}
        </Card>

        <Card className="flex flex-col gap-3.5">
          <CardHeader id="reportes" title="Reportes" />
          {!reportsOn ? <LockedFeature label="Reportes en PDF y CSV" /> : (
            <>
              <p className="text-[13px] text-[var(--ax-muted)]">{logoOn ? 'Reportes en PDF y CSV, con el logotipo de la organización.' : 'Reportes en PDF y CSV.'}</p>
              <div className="flex flex-wrap gap-2.5">
                <Button variant="secondary" onClick={() => printReport(`Equipos · ${organization?.name ?? ''}`, reportHeader, reportRows(), logoOn ? logoUrl : null)}>Descargar PDF</Button>
                <Button variant="secondary" onClick={() => downloadCsv('equipos.csv', reportHeader, reportRows())}>Descargar CSV</Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </main>
  )
}

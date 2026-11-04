'use client'

import Link from 'next/link'
import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button, ButtonLink, Card, CardHeader, FieldLabel, Notice, PageHeader, inputClass } from '../mi-equipo/ui'
import { Chip, LimitMeter, LockedFeature, TeamsTabs, downloadCsv, hasFlag, printReport, type ActiveOrganization } from './plan-ui'

type OrgTournament = { tournament_id: string; tournament_name: string; discipline: string | null; is_quick: boolean; status: string; teams: number; competition_format: string | null }
type Sponsor = { id: string; name: string; logo_url: string | null; website_url: string | null }

const statusLabels: Record<string, string> = { draft: 'Borrador', published: 'En curso', finished: 'Finalizado' }
const formatLabels: Record<string, string> = { league_playoffs: 'Liga con fases', round_robin: 'Liga, todos contra todos', knockout: 'Eliminación directa' }
const isLeague = (t: OrgTournament) => t.competition_format === 'league_playoffs' || t.competition_format === 'round_robin'

function TournamentRow({ tournament }: { tournament: OrgTournament }) {
  return (
    <Link href={`/torneos/ver/${tournament.tournament_id}`} className="flex flex-col gap-2 border-t border-[var(--ax-line)] pt-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--ax-text)]">{tournament.tournament_name}</p>
        <p className="text-xs text-[var(--ax-muted)]">{[tournament.discipline, `${tournament.teams} ${tournament.teams === 1 ? 'equipo' : 'equipos'}`, tournament.competition_format ? formatLabels[tournament.competition_format] : null].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="flex items-center gap-2.5">
        <Chip tone={tournament.is_quick ? 'orange' : 'accent'}>{tournament.is_quick ? 'Rápido' : 'Oficial'}</Chip>
        <span className="text-[13px] text-[var(--ax-muted)]">{statusLabels[tournament.status] ?? tournament.status}</span>
      </div>
    </Link>
  )
}

// Torneos de la cuenta de organización (diseño de Figma: Org · Free/Pro/Élite · Torneos).
export function OrgTournamentsView({ org }: { org: ActiveOrganization }) {
  const { organization, plan, usage } = org
  const [tournaments, setTournaments] = useState<OrgTournament[]>([])
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [sponsorForm, setSponsorForm] = useState<{ name: string; logo: string; web: string } | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  const officialOn = hasFlag(plan, 'torneos_oficiales')
  const sponsorsOn = hasFlag(plan, 'patrocinios')
  const reportsOn = hasFlag(plan, 'reportes')
  const logoOn = hasFlag(plan, 'logo_reportes')

  async function loadSponsors() {
    if (!supabase || !organization) return
    const { data } = await supabase.from('organization_sponsors').select('id, name, logo_url, website_url').eq('organization_id', organization.id).order('created_at')
    setSponsors((data ?? []) as Sponsor[])
  }

  useEffect(() => {
    if (!supabase || !organization) return
    supabase.rpc('platform_org_tournaments', { p_org: organization.id }).then(({ data, error }) => {
      if (error) setMessage({ tone: 'danger', text: error.message })
      else setTournaments((data ?? []) as OrgTournament[])
    })
    supabase.from('organizations').select('logo_url').eq('id', organization.id).maybeSingle().then(({ data }) => setLogoUrl((data?.logo_url as string | null) ?? null))
    void loadSponsors()
    // Se recarga al cambiar de organización.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id])

  const quick = tournaments.filter((t) => t.is_quick)
  const official = tournaments.filter((t) => !t.is_quick)
  const active = (t: OrgTournament) => t.status !== 'finished'
  const limits = usage?.limits ?? {}
  const used = usage?.usage ?? {}

  async function saveSponsor() {
    if (!supabase || !organization || !sponsorForm) return
    if (!sponsorForm.name.trim()) return setMessage({ tone: 'danger', text: 'El patrocinador necesita un nombre.' })
    const { error } = await supabase.from('organization_sponsors').insert({
      organization_id: organization.id,
      name: sponsorForm.name.trim(),
      logo_url: sponsorForm.logo.trim() || null,
      website_url: sponsorForm.web.trim() || null,
    })
    if (error) return setMessage({ tone: 'danger', text: error.message })
    setSponsorForm(null)
    setMessage({ tone: 'success', text: 'Patrocinador agregado.' })
    await loadSponsors()
  }

  async function removeSponsor(id: string) {
    if (!supabase) return
    const { error } = await supabase.from('organization_sponsors').delete().eq('id', id)
    if (error) return setMessage({ tone: 'danger', text: error.message })
    await loadSponsors()
  }

  const reportHeader = ['Torneo', 'Tipo', 'Disciplina', 'Equipos', 'Formato', 'Estado']
  const reportRows = () => tournaments.map((t) => [t.tournament_name, t.is_quick ? 'Rápido' : 'Oficial', t.discipline ?? '', t.teams, t.competition_format ? formatLabels[t.competition_format] ?? t.competition_format : '', statusLabels[t.status] ?? t.status])

  return (
    <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
      <div className="mx-auto max-w-[1184px] space-y-5 px-4 pb-16 pt-5 sm:space-y-6 sm:px-8 sm:pt-8 lg:px-10">
        <PageHeader title="Torneos" actions={<ButtonLink href="/eventos?crear=1" variant="primary">+ Crear torneo</ButtonLink>} />
        <TeamsTabs active="torneos" />

        {message && <Notice tone={message.tone} icon={Info}>{message.text}</Notice>}

        <Card className="flex flex-col gap-3.5">
          <CardHeader id="rapidos" title="Torneos rápidos" />
          <p className="text-[13px] text-[var(--ax-muted)]">Con equipos temporales.</p>
          {usage && <LimitMeter label="Torneos rápidos activos" used={used.torneos_rapidos ?? 0} limit={limits.torneos_rapidos ?? null} />}
          {quick.length === 0 && <p className="text-sm text-[var(--ax-muted)]">Todavía no hay torneos rápidos.</p>}
          {quick.map((t) => <TournamentRow key={t.tournament_id} tournament={t} />)}
        </Card>

        <Card className="flex flex-col gap-3.5">
          <CardHeader id="oficiales" title="Torneos oficiales" />
          <p className="text-[13px] text-[var(--ax-muted)]">Solo por invitación.</p>
          {officialOn
            ? usage && <LimitMeter label="Torneos oficiales activos" used={used.torneos_oficiales ?? 0} limit={limits.torneos_oficiales ?? null} />
            : <LockedFeature label="Torneos oficiales por invitación" />}
          {official.map((t) => <TournamentRow key={t.tournament_id} tournament={t} />)}
          {officialOn && official.length === 0 && <p className="text-sm text-[var(--ax-muted)]">Todavía no hay torneos oficiales.</p>}
        </Card>

        <Card className="flex flex-col gap-3.5">
          <CardHeader id="formato-liga" title="Formato liga: con fases o final directa" />
          {!officialOn && (
            <>
              <p className="text-[13px] text-[var(--ax-muted)]">Disponible en tu torneo rápido activo ({limits.torneos_rapidos ?? 1}).</p>
              <LockedFeature label="Ligas en torneos oficiales" />
            </>
          )}
          {officialOn && limits.torneos_rapidos === null && limits.torneos_oficiales === null && (
            <p className="text-[13px] text-[var(--ax-muted)]">Ligas activas sin límite, en torneos rápidos y oficiales.</p>
          )}
          {officialOn && !(limits.torneos_rapidos === null && limits.torneos_oficiales === null) && (
            <>
              <LimitMeter label="Ligas activas en torneos rápidos" used={quick.filter((t) => active(t) && isLeague(t)).length} limit={limits.torneos_rapidos ?? null} />
              <LimitMeter label="Ligas activas en torneos oficiales" used={official.filter((t) => active(t) && isLeague(t)).length} limit={limits.torneos_oficiales ?? null} />
            </>
          )}
        </Card>

        <Card className="flex flex-col gap-3.5">
          <CardHeader id="patrocinios" title="Patrocinios" />
          {!sponsorsOn ? <LockedFeature label="Patrocinios visibles en las páginas de torneos" plan="Élite" /> : (
            <>
              <p className="text-[13px] text-[var(--ax-muted)]">Muestra los logotipos de tus patrocinadores en la página pública del torneo.</p>
              {sponsors.map((sponsor) => (
                <div key={sponsor.id} className="flex items-center gap-3 border-t border-[var(--ax-line)] pt-3">
                  {sponsor.logo_url && <img src={sponsor.logo_url} alt="" className="h-9 w-9 rounded-[10px] object-contain" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--ax-text)]">{sponsor.name}</p>
                    {sponsor.website_url && <p className="truncate text-xs text-[var(--ax-muted)]">{sponsor.website_url}</p>}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => void removeSponsor(sponsor.id)}>Quitar</Button>
                </div>
              ))}
              {sponsorForm ? (
                <div className="grid gap-4 rounded-[14px] border border-[var(--ax-line)] p-4 md:grid-cols-3">
                  <label className="block"><FieldLabel>Nombre</FieldLabel><input className={inputClass} value={sponsorForm.name} onChange={(e) => setSponsorForm({ ...sponsorForm, name: e.target.value })} /></label>
                  <label className="block"><FieldLabel>Enlace del logotipo</FieldLabel><input className={inputClass} value={sponsorForm.logo} onChange={(e) => setSponsorForm({ ...sponsorForm, logo: e.target.value })} placeholder="https://…" /></label>
                  <label className="block"><FieldLabel>Sitio web</FieldLabel><input className={inputClass} value={sponsorForm.web} onChange={(e) => setSponsorForm({ ...sponsorForm, web: e.target.value })} placeholder="https://…" /></label>
                  <div className="flex justify-end gap-2.5 md:col-span-3">
                    <Button variant="secondary" onClick={() => setSponsorForm(null)}>Cancelar</Button>
                    <Button variant="primary" onClick={() => void saveSponsor()}>Guardar patrocinador</Button>
                  </div>
                </div>
              ) : (
                <div><Button variant="secondary" onClick={() => setSponsorForm({ name: '', logo: '', web: '' })}>Agregar patrocinador</Button></div>
              )}
            </>
          )}
        </Card>

        <Card className="flex flex-col gap-3.5">
          <CardHeader id="reportes-torneos" title="Reportes de torneos" />
          {!reportsOn ? <LockedFeature label="Reportes en PDF y CSV" /> : (
            <>
              <p className="text-[13px] text-[var(--ax-muted)]">{logoOn ? 'Reportes en PDF y CSV, con el logotipo de la organización.' : 'Reportes en PDF y CSV.'}</p>
              <div className="flex flex-wrap gap-2.5">
                <Button variant="secondary" onClick={() => printReport(`Torneos · ${organization?.name ?? ''}`, reportHeader, reportRows(), logoOn ? logoUrl : null)}>Descargar PDF</Button>
                <Button variant="secondary" onClick={() => downloadCsv('torneos.csv', reportHeader, reportRows())}>Descargar CSV</Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </main>
  )
}

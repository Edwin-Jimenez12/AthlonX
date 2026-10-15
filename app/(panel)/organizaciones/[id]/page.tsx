'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, CalendarDays, Globe2, Mail, Phone, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

type Discipline = { id: string; code: string; name: string }
type Modality = { id: string; code: string; name: string; discipline_id: string }
type Contact = { contact_email: string | null; contact_phone: string | null; website_url: string | null; social_links: Record<string, string> | null }
type Organization = { id: string; name: string; type: string; country: string | null; city: string | null; logo_url: string | null; description: string | null; slug: string | null; athlonx_code: string | null; handle: string | null } & Contact
type Team = { id: string; name: string; logo_url: string | null; country: string | null; city: string | null; discipline_id: string | null; discipline_code: string | null; discipline_name: string | null; athlonx_code: string | null; handle: string | null }
type Relationship = { id: string; direction: 'superior' | 'subordinate'; relationship_type: string; organization_id: string; organization_name: string; discipline_name: string | null; authority_depth: number | null }
type Tournament = { id: string; name: string; slug: string | null; season: number | string | null; status: string | null; start_date: string | null; end_date: string | null; discipline_id: string | null; discipline_name: string | null; modality: { id: string; code: string; name: string } | null; participation_type: 'created' | 'participated' | 'created_and_participated' }
type OrganizationPayload = { organization: Organization | null; disciplines: Discipline[]; modalities: Modality[]; teams: Team[]; relationships: Relationship[]; tournaments: Tournament[]; athlete_count: number | null }
type TournamentFilter = 'all' | 'created' | 'participated'

const organizationTypes: Record<string, string> = { organizacion_deportiva: 'Organización deportiva', comite_olimpico: 'Comité olímpico', institucion_gubernamental: 'Institución gubernamental', federacion: 'Federación', union: 'Unión', liga: 'Liga', otro: 'Organización' }
const relationshipNames: Record<string, string> = { supervisa: 'Supervisa', reconoce: 'Reconoce', afiliada_a: 'Afiliada a', avala: 'Avala', coordina: 'Coordina' }
const statusNames: Record<string, string> = { published: 'Próximo', in_progress: 'En curso', finished: 'Finalizado' }
const participationNames: Record<Tournament['participation_type'], string> = { created: 'Creado por la organización', participated: 'Participó con sus equipos', created_and_participated: 'Creado y disputado' }
const filterLabels: Record<TournamentFilter, string> = { all: 'Todos', created: 'Creados', participated: 'Participó' }

export default function PublicOrganizationPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<OrganizationPayload | null>(null)
  const [tournamentFilter, setTournamentFilter] = useState<TournamentFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [watermark, setWatermark] = useState<string | null>(null)
  const [featuredTeams, setFeaturedTeams] = useState<Team[]>([])

  useEffect(() => {
    async function loadOrganization() {
      if (!supabase || !params.id) {
        setError('No se pudo identificar la organización.')
        setLoading(false)
        return
      }
      const { data: response, error: organizationError } = await supabase.rpc('get_public_organization_profile', { p_organization_id: params.id })
      if (organizationError) {
        setError(organizationError.message)
        setLoading(false)
        return
      }
      const payload = response as OrganizationPayload
      // Aleatorio en cada visita (solo en el cliente, para evitar diferencias de hidratación).
      const randomDiscipline = pickRandom(payload.disciplines ?? [])
      setWatermark(randomDiscipline ? randomDiscipline.name : null)
      setFeaturedTeams(shuffle(payload.teams ?? []).slice(0, 3))
      setData(payload)
      setLoading(false)
      if (!payload.organization) setError('Esta organización no está disponible.')
    }
    void loadOrganization()
  }, [params.id])

  if (loading) return <Shell><p className="text-slate-400">Cargando organización...</p></Shell>
  if (error || !data?.organization) return <Shell><div className="rounded-[10px] border border-red-400/30 bg-red-500/10 p-5 text-red-200">{error || 'Esta organización no está disponible.'}</div></Shell>

  const organization = data.organization
  const disciplines = data.disciplines ?? []
  const modalities = data.modalities ?? []
  const teams = data.teams ?? []
  const relationships = data.relationships ?? []
  const tournaments = data.tournaments ?? []
  const typeLabel = organizationTypes[organization.type] || 'Organización'
  const disciplineNames = disciplines.map((item) => item.name).join(' · ')

  const stats = [
    { value: teams.length, label: 'Equipos afiliados' },
    { value: tournaments.filter((tournament) => tournament.participation_type !== 'participated').length, label: 'Torneos organizados' },
    { value: data.athlete_count ?? 0, label: 'Atletas registrados' },
  ].filter((stat) => stat.value > 0)

  const visibleTournaments = tournaments.filter((tournament) => {
    if (tournamentFilter === 'all') return true
    if (tournamentFilter === 'created') return tournament.participation_type !== 'participated'
    return tournament.participation_type !== 'created'
  })

  const initials = organization.name.split(' ').filter(Boolean).slice(0, 3).map((part) => part[0]).join('').toUpperCase() || 'AX'

  const organizationData = [
    { label: 'Tipo', value: typeLabel },
    { label: 'Sede', value: organization.city },
    { label: 'País', value: organization.country },
    { label: 'Código AthlonX', value: organization.athlonx_code },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value))

  const socialRows = Object.entries(organization.social_links ?? {})
    .filter(([, value]) => Boolean(value))
    .map(([network, value]) => ({ icon: <Globe2 size={16} />, label: capitalize(network), value, href: externalUrl(value) }))

  const contactRows = [
    { icon: <Mail size={16} />, label: 'Correo', value: organization.contact_email, href: organization.contact_email ? `mailto:${organization.contact_email}` : undefined },
    { icon: <Phone size={16} />, label: 'Teléfono', value: organization.contact_phone, href: organization.contact_phone ? `tel:${organization.contact_phone}` : undefined },
    { icon: <Globe2 size={16} />, label: 'Sitio web', value: organization.website_url, href: organization.website_url ? externalUrl(organization.website_url) : undefined },
    ...socialRows,
  ].filter((row): row is typeof row & { value: string } => Boolean(row.value))

  // Jerarquía: "subordinate" = organizaciones que esta organización supervisa; "superior" = organizaciones a las que pertenece.
  const supervised = relationships.filter((relation) => relation.direction === 'subordinate')
  const parents = relationships
    .filter((relation) => relation.direction === 'superior')
    .sort((a, b) => (b.authority_depth ?? 0) - (a.authority_depth ?? 0))

  return (
    <main className="min-h-screen bg-[#07131e] pb-16 text-[#e8eef3] lg:ml-64">
      <div className="mx-auto max-w-[1280px] space-y-8 px-5 py-8 lg:px-10">
        <button type="button" onClick={() => router.back()} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#91a8ba] transition hover:text-[#b4ff45]"><ArrowLeft size={18} />Volver a la búsqueda</button>

        {/* Encabezado */}
        <section className="relative overflow-hidden rounded-[28px] border border-[#29485d] bg-[#0b1d2c] px-6 pb-10 pt-12 sm:px-12">
          {watermark && <span aria-hidden="true" className="pointer-events-none absolute -right-6 top-8 font-display text-[220px] font-bold uppercase leading-none text-[#b4ff45]/[0.05] sm:text-[320px]">{watermark}</span>}
          <div aria-hidden="true" className="absolute -left-16 bottom-16 h-2 w-[120%] -rotate-[9deg] bg-[#b4ff45]" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
            <div className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-[32px] bg-[#b4ff45] text-[#07131e]">
              {organization.logo_url ? <img src={organization.logo_url} alt={organization.name} className="h-full w-full object-cover" /> : <span className="font-display text-6xl font-bold">{initials}</span>}
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              <p className="font-heading text-sm font-semibold uppercase tracking-[.22em] text-[#b4ff45]">{[typeLabel, disciplineNames].filter(Boolean).join(' · ')}</p>
              <h1 className="font-display text-4xl font-bold uppercase leading-[0.95] sm:text-6xl lg:text-[80px]">{organization.name}</h1>
              {organization.description && <p className="max-w-3xl text-lg leading-8 text-[#91a8ba]">{organization.description}</p>}
              <div className="flex flex-wrap gap-2.5">
                {[organization.city, organization.country, organization.athlonx_code].filter(Boolean).map((item) => <span key={item} className="rounded-full border border-[#29485d] px-4 py-2 text-sm font-medium">{item}</span>)}
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <a href="#torneos" className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#29485d] px-7 py-4 text-base font-semibold transition hover:border-[#b4ff45] hover:text-[#b4ff45]">Ver torneos<ArrowUpRight size={18} /></a>
              </div>
            </div>
          </div>
        </section>

        {/* Estadísticas: solo se muestran los valores mayores que 0 */}
        {stats.length > 0 && (
          <section className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {stats.map((stat) => <Stat key={stat.label} value={stat.value} label={stat.label} />)}
          </section>
        )}

        {/* Información */}
        <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6 rounded-[28px] border border-[#29485d] bg-[#0b1d2c] p-8 sm:p-10">
            <h2 className="font-heading text-5xl font-semibold uppercase leading-none">Sobre la organización</h2>
            <p className="text-lg leading-8 text-[#91a8ba]">{organization.description || 'Esta organización todavía no ha publicado una descripción institucional.'}</p>
            {organizationData.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {organizationData.map((item) => <Datum key={item.label} label={item.label} value={item.value} />)}
              </div>
            )}
          </div>
          <div className="space-y-6">
            <div className="space-y-4 rounded-[28px] border border-[#29485d] bg-[#0b1d2c] p-8">
              <h2 className="font-heading text-3xl font-semibold uppercase">Disciplinas</h2>
              {disciplines.length > 0 && <div className="flex flex-wrap gap-2">{disciplines.map((item) => <span key={item.id} className="rounded-full bg-[#b4ff45] px-4 py-2 text-sm font-bold text-[#07131e]">{item.name}</span>)}</div>}
              {modalities.length > 0 && (
                <>
                  <p className="pt-2 font-heading text-sm font-semibold uppercase tracking-[.2em] text-[#91a8ba]">Modalidades</p>
                  <div className="flex flex-wrap gap-2">{modalities.map((item) => <span key={item.id} className="rounded-full border border-[#29485d] px-4 py-2 text-sm font-medium">{item.name}</span>)}</div>
                </>
              )}
              {disciplines.length === 0 && modalities.length === 0 && <span className="text-sm text-[#91a8ba]">No hay disciplinas publicadas.</span>}
            </div>
            <div className="space-y-1 rounded-[28px] border border-[#29485d] bg-[#0b1d2c] p-8">
              <h2 className="mb-3 font-heading text-3xl font-semibold uppercase">Contacto</h2>
              {contactRows.map((row) => <ContactRow key={row.label} icon={row.icon} label={row.label} value={row.value} href={row.href} />)}
              {contactRows.length === 0 && <p className="text-sm text-[#91a8ba]">Esta organización no ha publicado canales de contacto.</p>}
            </div>
          </div>
        </section>

        {/* Equipos afiliados: 3 equipos al azar */}
        {teams.length > 0 && (
          <section className="space-y-6">
            <SectionTitle title="Equipos afiliados" action={teams.length > 3 ? `Ver los ${teams.length} equipos →` : `${teams.length} equipos`} />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featuredTeams.map((team) => (
                <Link key={team.id} href={`/equipos/${team.id}`} className="group flex flex-col gap-5 rounded-[24px] border border-[#29485d] bg-[#0b1d2c] p-7 transition hover:-translate-y-0.5 hover:border-[#b4ff45]/60">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[#102536] text-[#b4ff45]">
                      {team.logo_url ? <img src={team.logo_url} alt={team.name} className="h-full w-full object-cover" /> : <span className="font-display text-2xl font-bold">{team.name.slice(0, 2).toUpperCase()}</span>}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-3xl font-bold uppercase leading-tight">{team.name}</h3>
                      <div className="text-sm text-[#91a8ba]">
                        {team.discipline_name && <p>{team.discipline_name}</p>}
                        {team.city && <p>{team.city}</p>}
                      </div>
                    </div>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-[#b4ff45]">Ver equipo<ArrowUpRight size={16} /></span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Torneos y eventos */}
        {tournaments.length > 0 && (
          <section id="torneos" className="space-y-6">
            <SectionTitle title="Torneos y eventos" />
            <div className="flex flex-wrap gap-2">
              {(Object.keys(filterLabels) as TournamentFilter[]).map((filter) => (
                <button key={filter} type="button" onClick={() => setTournamentFilter(filter)} className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition ${tournamentFilter === filter ? 'bg-[#b4ff45] text-[#07131e]' : 'border border-[#29485d] text-[#e8eef3] hover:border-[#b4ff45]'}`}>{filterLabels[filter]}</button>
              ))}
            </div>
            {visibleTournaments.length ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleTournaments.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)}
              </div>
            ) : <EmptyState>No hay torneos publicados con este filtro.</EmptyState>}
          </section>
        )}

        {/* Organizaciones que supervisa; si no supervisa ninguna, organizaciones a las que pertenece */}
        {supervised.length > 0 && (
          <HierarchySection title="Organizaciones que supervisa" items={supervised} subtitle="Organización subordinada" />
        )}
        {supervised.length === 0 && parents.length > 0 && (
          <HierarchySection title="Organizaciones a las que pertenece" items={parents} subtitle="Organización superior" />
        )}

        <footer className="flex flex-col gap-2 border-t border-[#29485d] pt-8 text-sm text-[#91a8ba] sm:flex-row sm:justify-between">
          <span>AthlonX · Perfil público de organización</span>
          <span>Datos publicados por la organización</span>
        </footer>
      </div>
    </main>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="rounded-[24px] border border-[#29485d] bg-[#0b1d2c] p-7"><p className="font-display text-7xl font-bold leading-none text-[#b4ff45]">{value}</p><p className="mt-3 text-xs font-semibold uppercase tracking-[.16em] text-[#91a8ba]">{label}</p></div>
}

function Datum({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[16px] bg-[#102536] p-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#91a8ba]">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></div>
}

function ContactRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#29485d]/60 py-3 last:border-0">
      <span className="flex items-center gap-2 text-sm text-[#91a8ba]">{icon}{label}</span>
      <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="truncate text-sm font-semibold text-[#b4ff45] hover:underline">{value}</a>
    </div>
  )
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return <div className="flex flex-wrap items-end justify-between gap-4"><h2 className="font-heading text-5xl font-semibold uppercase leading-none">{title}</h2>{action && <span className="text-sm font-semibold text-[#b4ff45]">{action}</span>}</div>
}

function HierarchySection({ title, items, subtitle }: { title: string; items: Relationship[]; subtitle: string }) {
  return (
    <section className="space-y-6">
      <SectionTitle title={title} action={`${items.length} ${items.length === 1 ? 'organización' : 'organizaciones'}`} />
      <div className="divide-y divide-[#29485d] rounded-[28px] border border-[#29485d] bg-[#0b1d2c] px-8">
        {items.map((relation) => (
          <Link key={relation.id} href={`/organizaciones/${relation.organization_id}`} className="flex flex-col gap-3 py-6 transition hover:text-[#b4ff45] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-[#b4ff45] px-4 py-1.5 text-xs font-bold uppercase tracking-[.1em] text-[#07131e]">{relationshipNames[relation.relationship_type] || relation.relationship_type}</span>
              <div>
                <p className="text-xl font-semibold">{relation.organization_name}</p>
                <p className="text-sm text-[#91a8ba]">{subtitle}{relation.discipline_name ? ` · ${relation.discipline_name}` : ''}</p>
              </div>
            </div>
            <ArrowUpRight size={20} className="text-[#91a8ba]" />
          </Link>
        ))}
      </div>
    </section>
  )
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const status = statusNames[tournament.status ?? ''] || 'Publicado'
  return (
    <Link href={`/torneos/ver/${tournament.id}`} className="flex flex-col gap-4 rounded-[24px] border border-[#29485d] bg-[#0b1d2c] p-7 transition hover:-translate-y-0.5 hover:border-[#b4ff45]/60">
      <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[.1em] ${status === 'En curso' ? 'bg-[#b4ff45] text-[#07131e]' : 'border border-[#29485d] text-[#e8eef3]'}`}>{status}</span>
      <h3 className="font-display text-3xl font-bold uppercase leading-tight">{tournament.name}</h3>
      <div className="space-y-1 text-sm text-[#91a8ba]">
        {tournament.season && <p>Temporada {tournament.season}</p>}
        {tournament.discipline_name && <p>{tournament.discipline_name}</p>}
        {tournament.modality?.name && <p>{tournament.modality.name}</p>}
      </div>
      <div className="mt-auto space-y-2 text-sm">
        <p className="flex items-center gap-2 font-semibold"><CalendarDays size={16} className="text-[#b4ff45]" />{formatDateRange(tournament.start_date, tournament.end_date)}</p>
        <p className="flex items-center gap-2 text-[#b4ff45]"><Trophy size={16} />{participationNames[tournament.participation_type]}</p>
      </div>
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#29485d] px-5 py-2.5 text-sm font-semibold transition group-hover:border-[#b4ff45]">Ver evento<ArrowUpRight size={16} /></span>
    </Link>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[24px] border border-dashed border-[#31556b] p-8 text-sm text-[#91a8ba]">{children}</div>
}

function monthYear(value: string) {
  const date = new Date(`${value}T00:00:00`)
  const month = date.toLocaleDateString('es-PA', { month: 'long' })
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return 'Fecha pendiente'
  if (start && end && monthYear(start) !== monthYear(end)) return `${monthYear(start)} — ${monthYear(end)}`
  return monthYear((start ?? end) as string)
}

function pickRandom<T>(items: T[]): T | undefined {
  return items.length ? items[Math.floor(Math.random() * items.length)] : undefined
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = copy[i]
    copy[i] = copy[j]
    copy[j] = current
  }
  return copy
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function externalUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10"><div className="mx-auto max-w-[1280px]">{children}</div></main>
}

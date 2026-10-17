'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, CalendarDays, Mail, Phone, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

type Discipline = { id: string; code: string; name: string }
type PublicProfile = { id: string; full_name: string; avatar_url: string | null; username: string | null; athlonx_code: string | null; country: string | null }
type Role = { role: string }
type Label = { role: string; role_label: string | null; organization_id: string | null; organization_name: string | null; team_id: string | null; team_name: string | null }
type TeamAffiliation = { team_id: string; team_name: string; team_city: string | null; organization_id: string | null; organization_name: string | null; discipline_id: string | null; discipline_code: string | null; discipline_name: string | null; role: string; role_label: string | null }
type OrganizationAffiliation = { organization_id: string; name: string; athlonx_code: string | null; role: string }
type Tournament = {
  id: string
  name: string
  athlonx_code: string | null
  season: number | string | null
  status: string | null
  start_date: string | null
  end_date: string | null
  cover_url: string | null
  discipline_name: string | null
  modality: { id: string; code: string; name: string } | null
  created_by_profile: boolean
}
type PersonaPayload = {
  profile: PublicProfile | null
  public_age: number | null
  contact: { email: string | null; phone: string | null } | null
  roles: Role[]
  labels: Label[]
  teams: TeamAffiliation[]
  organizations: OrganizationAffiliation[]
  tournaments: Tournament[]
  disciplines: Discipline[]
}

// En el perfil público solo se muestran los roles de atleta y entrenador.
const visibleRoles = ['atleta', 'entrenador']
const roleNames: Record<string, string> = { atleta: 'Atleta', entrenador: 'Entrenador', staff: 'Staff', directivo: 'Directivo', owner: 'Propietario' }
const statusNames: Record<string, string> = { in_progress: 'En curso', finished: 'Finalizado' }

export default function PublicPersonaPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<PersonaPayload | null>(null)
  const [watermark, setWatermark] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadPersonaProfile() {
      if (!supabase || !params.id) {
        setError('No se pudo identificar el perfil.')
        setLoading(false)
        return
      }
      const { data: response, error: profileError } = await supabase.rpc('get_public_persona_profile', { p_profile_id: params.id })
      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
      let payload = normalizePayload(response as Partial<PersonaPayload>)
      // Compatibilidad: si el id corresponde a un jugador, se usa su perfil público.
      if (!payload.profile) {
        const { data: playerResponse, error: playerError } = await supabase.rpc('get_public_player_profile', { p_player_id: params.id })
        if (playerError) {
          setError(playerError.message)
          setLoading(false)
          return
        }
        payload = normalizePayload(playerResponse as Partial<PersonaPayload> & { team_affiliations?: TeamAffiliation[] })
      }
      // La disciplina de la marca de agua se elige al azar; se oculta si la persona no tiene disciplinas.
      setWatermark(pickRandom(payload.disciplines)?.name ?? null)
      setData(payload)
      setLoading(false)
    }
    void loadPersonaProfile()
  }, [params.id])

  if (loading) return <Shell><p className="text-[var(--ax-muted)]">Cargando perfil...</p></Shell>
  if (error || !data?.profile) return <Shell><div className="rounded-[10px] border border-red-400/30 bg-red-500/10 p-5 text-red-200">{error || 'Este perfil no está disponible.'}</div></Shell>

  const profile = data.profile
  const teams = data.teams
  const uniqueTeams = [...new Map(teams.map((team) => [team.team_id, team])).values()]
  const organizations = [...new Map(data.organizations.map((org) => [org.organization_id, org])).values()]
  const tournaments = data.tournaments
  const roleTags = [...new Set(data.roles.filter((item) => visibleRoles.includes(item.role)).map((item) => roleNames[item.role] ?? item.role))]
  const initials = initialsOf(profile.full_name)

  const stats = [
    { value: uniqueTeams.length, label: 'Equipos' },
    { value: organizations.length, label: 'Organizaciones' },
    { value: tournaments.length, label: 'Torneos' },
  ].filter((stat) => stat.value > 0)

  const infoItems = [
    { label: 'Usuario', value: profile.username ? `@${profile.username}` : null },
    { label: 'Código AthlonX', value: profile.athlonx_code },
    { label: 'Edad', value: data.public_age != null ? `${data.public_age} años` : null },
    { label: 'País', value: profile.country },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value))

  const disciplines = data.disciplines
  const contactRows = [
    { icon: <Mail size={16} />, label: 'Correo', value: data.contact?.email ?? null, href: data.contact?.email ? `mailto:${data.contact.email}` : undefined },
    { icon: <Phone size={16} />, label: 'Teléfono', value: data.contact?.phone ?? null, href: data.contact?.phone ? `tel:${data.contact.phone}` : undefined },
  ].filter((row): row is typeof row & { value: string } => Boolean(row.value))

  return (
    <main className="min-h-screen bg-[var(--ax-bg)] pb-16 text-[var(--ax-text)] lg:ml-64">
      <div className="mx-auto max-w-[1280px] space-y-8 px-5 py-8 lg:px-10">
        <button type="button" onClick={() => router.back()} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--ax-muted)] transition hover:text-[var(--ax-accent-text)]"><ArrowLeft size={18} />Volver a la búsqueda</button>

        {/* Encabezado */}
        <section className="relative overflow-hidden rounded-[28px] border border-[var(--ax-line)] bg-[var(--ax-surface)] px-6 pb-10 pt-12 sm:px-12">
          {watermark && <span aria-hidden="true" className="pointer-events-none absolute -right-6 top-8 font-display text-[200px] font-bold uppercase leading-none text-[var(--ax-watermark)] sm:text-[280px]">{watermark}</span>}
          <div aria-hidden="true" className="absolute -left-16 bottom-16 h-2 w-[120%] -rotate-[9deg] bg-[var(--ax-accent)]" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
            <div className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-[32px] bg-[var(--ax-accent)] text-[var(--ax-on-accent)]">
              {profile.avatar_url ? <img src={profile.avatar_url} alt={`Foto de ${profile.full_name}`} className="h-full w-full object-cover" /> : <span className="font-display text-6xl font-bold">{initials}</span>}
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              {roleTags.length > 0 && <p className="font-heading text-sm font-semibold uppercase tracking-[.22em] text-[var(--ax-accent-text)]">{roleTags.join(' · ')}</p>}
              <h1 className="break-words font-display text-4xl font-bold uppercase leading-[0.95] sm:text-6xl lg:text-[80px]">{profile.full_name}</h1>
              <div className="flex flex-wrap gap-2.5">
                {[profile.username ? `@${profile.username}` : null, profile.athlonx_code, profile.country].filter(Boolean).map((item) => <span key={item} className="rounded-full border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-4 py-2 text-sm font-medium">{item}</span>)}
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

        {/* Información y contacto */}
        <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6 rounded-[28px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-8 sm:p-10">
            <h2 className="font-heading text-5xl font-semibold uppercase leading-none">Información</h2>
            {infoItems.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {infoItems.map((item) => <Datum key={item.label} label={item.label} value={item.value} />)}
              </div>
            )}
            {disciplines.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--ax-muted)]">Disciplinas</p>
                <div className="flex flex-wrap gap-2">
                  {disciplines.map((discipline, index) => <span key={discipline.id} className={`rounded-full px-4 py-2 text-sm font-semibold ${index === 0 ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'bg-[var(--ax-surface-raised)] text-[var(--ax-text)]'}`}>{discipline.name}</span>)}
                </div>
              </div>
            )}
          </div>
          <div className="h-fit space-y-1 rounded-[28px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-8">
            <h2 className="mb-3 font-heading text-3xl font-semibold uppercase">Contacto</h2>
            {contactRows.map((row) => <ContactRow key={row.label} icon={row.icon} label={row.label} value={row.value} href={row.href} />)}
            {contactRows.length === 0 && <p className="text-sm text-[var(--ax-muted)]">Esta persona no ha publicado datos de contacto.</p>}
            <p className="pt-4 text-xs leading-5 text-[var(--ax-muted)]">Solo se muestra lo que la persona hizo público en su privacidad.</p>
          </div>
        </section>

        {/* Equipos y roles */}
        {uniqueTeams.length > 0 && (
          <section className="space-y-6">
            <SectionTitle title="Equipos y roles" action={`${uniqueTeams.length} ${uniqueTeams.length === 1 ? 'equipo' : 'equipos'}`} />
            <div className="grid gap-5 md:grid-cols-2">
              {teams.map((team) => (
                <article key={`${team.team_id}-${team.role}`} className="flex flex-col gap-4 rounded-[24px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-7">
                  <h3 className="font-display text-3xl font-bold uppercase leading-tight">{team.team_name}</h3>
                  <p className="text-sm text-[var(--ax-muted)]">{[team.discipline_name, team.team_city].filter(Boolean).join(' · ') || 'Equipo'}</p>
                  <span className="w-fit rounded-full bg-[var(--ax-accent)] px-3 py-1 text-xs font-bold text-[var(--ax-on-accent)]">{team.role_label || roleNames[team.role] || team.role}</span>
                  <Link href={`/equipos/${team.team_id}`} className="mt-auto inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-[var(--ax-line)] px-5 py-2.5 text-sm font-semibold transition hover:border-[var(--ax-accent-text)] hover:text-[var(--ax-accent-text)]">Ver equipo<ArrowUpRight size={16} /></Link>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Organizaciones */}
        {organizations.length > 0 && (
          <section className="space-y-6">
            <SectionTitle title="Organizaciones" action={`${organizations.length} ${organizations.length === 1 ? 'organización' : 'organizaciones'}`} />
            <div className="divide-y divide-[var(--ax-line)] rounded-[28px] border border-[var(--ax-line)] bg-[var(--ax-surface)] px-6">
              {organizations.map((org) => (
                <div key={org.organization_id} className="flex flex-wrap items-center justify-between gap-4 py-5">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{org.name}</p>
                    <p className="text-sm text-[var(--ax-muted)]">{roleNames[org.role] || org.role}</p>
                  </div>
                  <Link href={`/organizaciones/${org.organization_id}`} className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-[var(--ax-line)] px-5 py-2.5 text-sm font-semibold transition hover:border-[var(--ax-accent-text)] hover:text-[var(--ax-accent-text)]">Ver organización<ArrowUpRight size={16} /></Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Torneos y eventos */}
        {tournaments.length > 0 && (
          <section id="torneos" className="space-y-6">
            <SectionTitle title="Torneos y eventos" action={`${tournaments.length} en total`} />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {tournaments.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)}
            </div>
          </section>
        )}

        <footer className="flex flex-col gap-2 border-t border-[var(--ax-line)] pt-8 text-sm text-[var(--ax-muted)] sm:flex-row sm:justify-between">
          <span>AthlonX · Perfil público de persona</span>
          <span>Datos publicados por la persona</span>
        </footer>
      </div>
    </main>
  )
}

function normalizePayload(payload: Partial<PersonaPayload> & { team_affiliations?: TeamAffiliation[] }): PersonaPayload {
  return {
    profile: payload?.profile ?? null,
    public_age: payload?.public_age ?? null,
    contact: payload?.contact ?? null,
    roles: payload?.roles ?? [],
    labels: payload?.labels ?? [],
    teams: payload?.teams ?? payload?.team_affiliations ?? [],
    organizations: payload?.organizations ?? [],
    tournaments: payload?.tournaments ?? [],
    disciplines: payload?.disciplines ?? [],
  }
}

function pickRandom<T>(items: T[]): T | undefined {
  return items.length ? items[Math.floor(Math.random() * items.length)] : undefined
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="rounded-[24px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-7"><p className="font-display text-7xl font-bold leading-none text-[var(--ax-accent-text)]">{value}</p><p className="mt-3 text-xs font-semibold uppercase tracking-[.16em] text-[var(--ax-muted)]">{label}</p></div>
}

function Datum({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[16px] bg-[var(--ax-surface-raised)] p-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--ax-muted)]">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></div>
}

function ContactRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--ax-line)]/60 py-3 last:border-0">
      <span className="flex items-center gap-2 text-sm text-[var(--ax-muted)]">{icon}{label}</span>
      <a href={href} className="truncate text-sm font-semibold text-[var(--ax-accent-text)] hover:underline">{value}</a>
    </div>
  )
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return <div className="flex flex-wrap items-end justify-between gap-4"><h2 className="font-heading text-5xl font-semibold uppercase leading-none">{title}</h2>{action && <span className="text-sm font-semibold text-[var(--ax-accent-text)]">{action}</span>}</div>
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const status = statusNames[tournament.status ?? ''] ?? null
  const participation = tournament.created_by_profile
    ? 'Creado por esta persona'
    : tournament.status === 'finished' ? 'Participó con su equipo' : 'Participará con su equipo'
  const meta = [
    tournament.season ? `Temporada ${tournament.season}` : null,
    tournament.discipline_name,
    tournament.modality?.name,
  ].filter(Boolean).join(' · ')

  return (
    <Link href={`/torneos/ver/${tournament.id}`} className="group flex flex-col gap-4 rounded-[24px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-7 transition hover:-translate-y-0.5 hover:border-[var(--ax-accent-text)]/60">
      {/* Imagen del torneo con formato de foto de perfil; la resolución definitiva se decidirá con el diseño de torneos. */}
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[var(--ax-surface-raised)] font-display text-3xl font-bold text-[var(--ax-accent-text)]">
        {tournament.cover_url ? <img src={tournament.cover_url} alt={`Imagen de ${tournament.name}`} className="h-full w-full object-cover" /> : initialsOf(tournament.name)}
      </div>
      {status && <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[.1em] ${tournament.status === 'in_progress' ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'border border-[var(--ax-line)] text-[var(--ax-text)]'}`}>{status}</span>}
      <h3 className="font-display text-3xl font-bold uppercase leading-tight">{tournament.name}</h3>
      {meta && <p className="text-sm text-[var(--ax-muted)]">{meta}</p>}
      <div className="space-y-2 text-sm">
        <p className="flex items-center gap-2 font-semibold"><CalendarDays size={16} className="text-[var(--ax-accent-text)]" />{formatDateRange(tournament.start_date, tournament.end_date)}</p>
        <p className="flex items-center gap-2 text-[var(--ax-accent-text)]"><Trophy size={16} />{participation}</p>
      </div>
      <span className="mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-[var(--ax-line)] px-5 py-2.5 text-sm font-semibold transition group-hover:border-[var(--ax-accent-text)]">Ver evento<ArrowUpRight size={16} /></span>
    </Link>
  )
}

function initialsOf(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'
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

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[var(--ax-bg)] px-5 py-8 text-[var(--ax-text)] lg:ml-64 lg:px-10"><div className="mx-auto max-w-[1280px]"><Link href="/busqueda" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ax-muted)] hover:text-[var(--ax-accent-text)]"><ArrowLeft size={18} />Volver a la búsqueda</Link>{children}</div></main>
}

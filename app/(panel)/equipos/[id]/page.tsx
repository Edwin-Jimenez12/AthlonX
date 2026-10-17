'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, CalendarDays, Globe2, Mail, Phone, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

type Discipline = { id: string; code: string; name: string }
type OrganizationSummary = { id: string; name: string; athlonx_code: string | null; handle: string | null }
type TeamRecord = {
  id: string
  name: string
  logo_url: string | null
  country: string | null
  city: string | null
  athlonx_code: string | null
  handle: string | null
  description: string | null
  contact_email: string | null
  contact_phone: string | null
  website_url: string | null
  discipline: Discipline | null
  organization: OrganizationSummary | null
}
type Label = { user_id: string; full_name: string; avatar_url: string | null; username: string | null; role: string; role_label: string | null }
type Player = { id: string; profile_id?: string | null; full_name: string; avatar_url?: string | null; shirt_number: number | null; position: string | null; division_id?: string | null; division_name?: string | null }
type TeamDivision = { id: string; name: string; athlonx_code: string | null; level: string | null; age_group: string | null; gender: string | null; players: Player[] }
type Tournament = {
  id: string
  name: string
  cover_url: string | null
  season: number | string | null
  status: string | null
  start_date: string | null
  end_date: string | null
  discipline_name: string | null
  modality: { id: string; code: string; name: string } | null
  participation_type: 'created' | 'participated' | 'created_and_participated'
}
type TeamPayload = { team: TeamRecord | null; labels: Label[]; players: Player[]; tournaments: Tournament[] }
type TournamentFilter = 'all' | 'created' | 'participated'

const roleNames: Record<string, string> = { owner: 'Propietario', atleta: 'Atleta', entrenador: 'Entrenador', staff: 'Staff', directivo: 'Directivo' }
const staffRoles = ['owner', 'directivo', 'entrenador', 'staff']
const statusNames: Record<string, string> = { in_progress: 'En curso', finished: 'Finalizado' }
const participationNames: Record<Tournament['participation_type'], string> = { created: 'Creado por el equipo', participated: 'Participó con su equipo', created_and_participated: 'Creado y disputado' }
const filterLabels: Record<TournamentFilter, string> = { all: 'Todos', created: 'Creados', participated: 'Participó' }

export default function PublicTeamPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [team, setTeam] = useState<TeamRecord | null>(null)
  const [labels, setLabels] = useState<Label[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [divisions, setDivisions] = useState<TeamDivision[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [tournamentFilter, setTournamentFilter] = useState<TournamentFilter>('all')
  const [rosterFilter, setRosterFilter] = useState<string>('all')
  const [watermark, setWatermark] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadTeam() {
      if (!supabase || !params.id) {
        setError('No se pudo identificar el equipo.')
        setLoading(false)
        return
      }
      const [{ data: response, error: teamError }, { data: divisionResponse, error: divisionError }] = await Promise.all([
        supabase.rpc('get_public_team_profile', { p_team_id: params.id }),
        supabase.rpc('get_public_team_divisions', { p_team_id: params.id }),
      ])
      if (teamError) {
        setError(teamError.message)
        setLoading(false)
        return
      }
      const payload = response as TeamPayload
      if (!payload.team) {
        setError('Este equipo no está disponible.')
        setLoading(false)
        return
      }
      setTeam(payload.team)
      setLabels(payload.labels ?? [])
      setPlayers(payload.players ?? [])
      setTournaments(payload.tournaments ?? [])
      setDivisions(!divisionError && Array.isArray(divisionResponse) ? (divisionResponse as TeamDivision[]) : [])
      // La disciplina del equipo es la marca de agua; se oculta si no tiene disciplina.
      setWatermark(payload.team.discipline?.name ?? null)
      setLoading(false)
    }
    void loadTeam()
  }, [params.id])

  if (loading) return <Shell><p className="text-[var(--ax-muted)]">Cargando equipo...</p></Shell>
  if (error || !team) return <Shell><div className="rounded-[10px] border border-red-400/30 bg-red-500/10 p-5 text-red-200">{error || 'Este equipo no está disponible.'}</div></Shell>

  // Plantilla: jugadores de las divisiones (con su división); si no hay divisiones, la lista general del equipo.
  const fullRoster = divisions.length
    ? divisions.flatMap((division) => division.players.map((player) => ({ ...player, division_id: division.id, division_name: division.name })))
    : players
  const uniqueRosterIds = new Set(fullRoster.map((player) => player.id))
  const roster = rosterFilter === 'all' ? fullRoster : fullRoster.filter((player) => player.division_id === rosterFilter)
  const staff = labels.filter((label) => staffRoles.includes(label.role))
  const typeLabelByRole = (label: Label) => label.role_label || roleNames[label.role] || label.role
  const visibleTournaments = tournaments.filter((tournament) => {
    if (tournamentFilter === 'all') return true
    if (tournamentFilter === 'created') return tournament.participation_type !== 'participated'
    return tournament.participation_type !== 'created'
  })
  const initials = team.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'
  const location = [team.city, team.country].filter(Boolean).join(', ')

  const stats = [
    { value: uniqueRosterIds.size, label: 'Jugadores' },
    { value: divisions.length, label: 'Divisiones' },
    { value: tournaments.length, label: 'Torneos' },
  ].filter((stat) => stat.value > 0)

  const teamData = [
    { label: 'Disciplina', value: team.discipline?.name ?? null },
    { label: 'Usuario público', value: team.handle ? `@${team.handle}` : null },
    { label: 'Ciudad', value: team.city },
    { label: 'País', value: team.country },
    { label: 'Código AthlonX', value: team.athlonx_code },
    { label: 'Organización', value: team.organization?.name ?? null },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value))

  const contactRows = [
    { icon: <Mail size={16} />, label: 'Correo', value: team.contact_email, href: team.contact_email ? `mailto:${team.contact_email}` : undefined },
    { icon: <Phone size={16} />, label: 'Teléfono', value: team.contact_phone, href: team.contact_phone ? `tel:${team.contact_phone}` : undefined },
    { icon: <Globe2 size={16} />, label: 'Sitio web', value: team.website_url, href: team.website_url ? externalUrl(team.website_url) : undefined },
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
              {team.logo_url ? <img src={team.logo_url} alt={`Logo de ${team.name}`} className="h-full w-full object-cover" /> : <span className="font-display text-6xl font-bold">{initials}</span>}
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              <p className="font-heading text-sm font-semibold uppercase tracking-[.22em] text-[var(--ax-accent-text)]">{['Equipo', team.discipline?.name].filter(Boolean).join(' · ')}</p>
              <h1 className="font-display text-4xl font-bold uppercase leading-[0.95] sm:text-6xl lg:text-[80px]">{team.name}</h1>
              <div className="flex flex-wrap gap-2.5">
                {[team.city, team.country, team.athlonx_code].filter(Boolean).map((item) => <span key={item} className="rounded-full border border-[var(--ax-line)] px-4 py-2 text-sm font-medium">{item}</span>)}
              </div>
              {tournaments.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-2">
                  <a href="#torneos" className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--ax-line)] px-7 py-4 text-base font-semibold transition hover:border-[var(--ax-accent-text)] hover:text-[var(--ax-accent-text)]">Ver torneos<ArrowUpRight size={18} /></a>
                </div>
              )}
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
          <div className="space-y-6 rounded-[28px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-8 sm:p-10">
            <h2 className="font-heading text-5xl font-semibold uppercase leading-none">Sobre el equipo</h2>
            <p className="text-lg leading-8 text-[var(--ax-muted)]">{team.description || 'Este equipo todavía no ha publicado una descripción.'}</p>
            {teamData.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {teamData.map((item) => <Datum key={item.label} label={item.label} value={item.value} />)}
              </div>
            )}
          </div>
          <div className="space-y-6">
            {team.organization && (
              <div className="space-y-4 rounded-[28px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-8">
                <h2 className="font-heading text-3xl font-semibold uppercase">Organización</h2>
                <p className="text-xl font-semibold">{team.organization.name}</p>
                <Link href={`/organizaciones/${team.organization.id}`} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--ax-line)] px-5 py-3 text-sm font-semibold transition hover:border-[var(--ax-accent-text)] hover:text-[var(--ax-accent-text)]">Ver organización<ArrowUpRight size={16} /></Link>
              </div>
            )}
            <div className="space-y-1 rounded-[28px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-8">
              <h2 className="mb-3 font-heading text-3xl font-semibold uppercase">Contacto</h2>
              {contactRows.map((row) => <ContactRow key={row.label} icon={row.icon} label={row.label} value={row.value} href={row.href} />)}
              {contactRows.length === 0 && <p className="text-sm text-[var(--ax-muted)]">Este equipo no ha publicado canales de contacto.</p>}
            </div>
          </div>
        </section>

        {/* Divisiones */}
        {divisions.length > 0 && (
          <section className="space-y-6">
            <SectionTitle title="Divisiones" action={`${divisions.length} ${divisions.length === 1 ? 'división' : 'divisiones'}`} />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {divisions.map((division) => (
                <article key={division.id} className="flex flex-col gap-3 rounded-[24px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-7">
                  <h3 className="font-display text-3xl font-bold uppercase leading-tight">{division.name}</h3>
                  <p className="text-sm text-[var(--ax-muted)]">{division.players.length} {division.players.length === 1 ? 'jugador' : 'jugadores'}</p>
                  {division.athlonx_code && <p className="mt-auto text-xs font-semibold tracking-[.1em] text-[var(--ax-accent-text)]">{division.athlonx_code}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Plantilla: filtros por división (con su género) y tarjetas que abren el perfil del jugador */}
        {fullRoster.length > 0 && (
          <section className="space-y-6">
            <SectionTitle title="Plantilla" action={`${uniqueRosterIds.size} ${uniqueRosterIds.size === 1 ? 'jugador' : 'jugadores'}`} />
            {divisions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setRosterFilter('all')} className={filterClass(rosterFilter === 'all')}>Todos</button>
                {divisions.map((division) => (
                  <button key={division.id} type="button" onClick={() => setRosterFilter(division.id)} className={filterClass(rosterFilter === division.id)}>{divisionLabel(division)}</button>
                ))}
              </div>
            )}
            {roster.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {roster.map((player) => (
                  <Link key={`${player.id}-${player.division_id ?? 'general'}`} href={`/jugadores/${player.id}`} className="group flex flex-col gap-4 rounded-[24px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--ax-accent-text)]/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[var(--ax-surface-raised)] font-display text-2xl font-bold text-[var(--ax-accent-text)]">
                        {player.avatar_url ? <img src={player.avatar_url} alt={`Foto de ${player.full_name}`} className="h-full w-full object-cover" /> : initialsOf(player.full_name)}
                      </div>
                      <span className="font-display text-5xl font-bold leading-none text-[var(--ax-accent-text)]">{player.shirt_number ?? '--'}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold">{player.full_name}</p>
                      <p className="text-sm text-[var(--ax-muted)]">{player.position || 'Posición pendiente'}</p>
                    </div>
                    {player.division_name && <span className="w-fit rounded-full border border-[var(--ax-line)] px-3 py-1 text-xs font-medium text-[var(--ax-text)]">{player.division_name}</span>}
                    <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-[var(--ax-accent-text)]">Ver jugador<ArrowUpRight size={16} /></span>
                  </Link>
                ))}
              </div>
            ) : <EmptyState>No hay jugadores en esta división.</EmptyState>}
          </section>
        )}

        {/* Cuerpo técnico y directivos */}
        {staff.length > 0 && (
          <section className="space-y-6">
            <SectionTitle title="Cuerpo técnico y directivos" />
            <div className="divide-y divide-[var(--ax-line)] rounded-[28px] border border-[var(--ax-line)] bg-[var(--ax-surface)] px-6">
              {staff.map((person) => (
                <Link key={`${person.user_id}-${person.role}`} href={`/perfil/${person.user_id}`} className="flex items-center justify-between gap-4 py-5 transition hover:text-[var(--ax-accent-text)]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--ax-surface-raised)] font-display text-xl font-bold text-[var(--ax-accent-text)]">
                      {person.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover" /> : person.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold">{person.full_name}</p>
                      <p className="text-sm text-[var(--ax-muted)]">{person.role_label || roleNames[person.role] || person.role}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-[var(--ax-line)] px-4 py-1.5 text-xs font-semibold text-[var(--ax-text)]">{typeLabelByRole(person)}</span>
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
                <button key={filter} type="button" onClick={() => setTournamentFilter(filter)} className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition ${tournamentFilter === filter ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'border border-[var(--ax-line)] text-[var(--ax-text)] hover:border-[var(--ax-accent-text)]'}`}>{filterLabels[filter]}</button>
              ))}
            </div>
            {visibleTournaments.length ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleTournaments.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)}
              </div>
            ) : <EmptyState>No hay torneos con este filtro.</EmptyState>}
          </section>
        )}

        <footer className="flex flex-col gap-2 border-t border-[var(--ax-line)] pt-8 text-sm text-[var(--ax-muted)] sm:flex-row sm:justify-between">
          <span>AthlonX · Perfil público de equipo</span>
          <span>Datos publicados por el equipo</span>
        </footer>
      </div>
    </main>
  )
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
      <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="truncate text-sm font-semibold text-[var(--ax-accent-text)] hover:underline">{value}</a>
    </div>
  )
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return <div className="flex flex-wrap items-end justify-between gap-4"><h2 className="font-heading text-5xl font-semibold uppercase leading-none">{title}</h2>{action && <span className="text-sm font-semibold text-[var(--ax-accent-text)]">{action}</span>}</div>
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const status = statusNames[tournament.status ?? ''] ?? null
  const initials = tournament.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'
  return (
    <Link href={`/torneos/ver/${tournament.id}`} className="group flex flex-col gap-4 rounded-[24px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-7 transition hover:-translate-y-0.5 hover:border-[var(--ax-accent-text)]/60">
      {/* Imagen del torneo con formato de foto de perfil; la resolución definitiva se decidirá con el diseño de torneos. */}
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[var(--ax-surface-raised)] font-display text-3xl font-bold text-[var(--ax-accent-text)]">
        {tournament.cover_url ? <img src={tournament.cover_url} alt={`Imagen de ${tournament.name}`} className="h-full w-full object-cover" /> : initials}
      </div>
      {status && <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[.1em] ${status === 'En curso' ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'border border-[var(--ax-line)] text-[var(--ax-text)]'}`}>{status}</span>}
      <h3 className="font-display text-3xl font-bold uppercase leading-tight">{tournament.name}</h3>
      <div className="space-y-1 text-sm text-[var(--ax-muted)]">
        {tournament.season && <p>Temporada {tournament.season}</p>}
        {tournament.discipline_name && <p>{tournament.discipline_name}</p>}
        {tournament.modality?.name && <p>{tournament.modality.name}</p>}
      </div>
      <div className="mt-auto space-y-2 text-sm">
        <p className="flex items-center gap-2 font-semibold"><CalendarDays size={16} className="text-[var(--ax-accent-text)]" />{formatDateRange(tournament.start_date, tournament.end_date)}</p>
        <p className="flex items-center gap-2 text-[var(--ax-accent-text)]"><Trophy size={16} />{participationNames[tournament.participation_type]}</p>
      </div>
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--ax-line)] px-5 py-2.5 text-sm font-semibold transition group-hover:border-[var(--ax-accent-text)]">Ver evento<ArrowUpRight size={16} /></span>
    </Link>
  )
}

function filterClass(active: boolean) {
  return `cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'border border-[var(--ax-line)] text-[var(--ax-text)] hover:border-[var(--ax-accent-text)]'}`
}

function divisionLabel(division: TeamDivision) {
  const gender = division.gender ? `${division.gender.charAt(0).toUpperCase()}${division.gender.slice(1)}` : ''
  return gender ? `${division.name} · ${gender}` : division.name
}

function initialsOf(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[24px] border border-dashed border-[var(--ax-line)] p-8 text-sm text-[var(--ax-muted)]">{children}</div>
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

function externalUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[var(--ax-bg)] px-5 py-8 text-[var(--ax-text)] lg:ml-64 lg:px-10"><div className="mx-auto max-w-[1280px]">{children}</div></main>
}

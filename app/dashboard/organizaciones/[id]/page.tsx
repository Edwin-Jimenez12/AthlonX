'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Award, Building2, CalendarDays, ChevronRight, ExternalLink, Globe2, Link2, Mail, MapPin, Network, Phone, Trophy, UserRound, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

type Discipline = { id: string; code: string; name: string }
type Modality = { id: string; code: string; name: string; discipline_id: string }
type Contact = { contact_email: string | null; contact_phone: string | null; website_url: string | null; social_links: Record<string, string> | null }
type Organization = { id: string; name: string; type: string; country: string | null; city: string | null; logo_url: string | null; description: string | null; slug: string | null; athlonx_code: string | null; handle: string | null } & Contact
type Team = { id: string; name: string; logo_url: string | null; country: string | null; city: string | null; discipline_id: string | null; discipline_code: string | null; discipline_name: string | null; athlonx_code: string | null; handle: string | null }
type Member = { user_id: string; full_name: string; avatar_url: string | null; username: string | null; role: string; role_label: string | null; team_names?: string[] }
type Relationship = { id: string; direction: 'superior' | 'subordinate'; relationship_type: string; organization_id: string; organization_name: string; discipline_name: string | null }
type Tournament = { id: string; name: string; slug: string | null; season: number | string | null; status: string | null; location: string | null; start_date: string | null; end_date: string | null; discipline_id: string | null; discipline_name: string | null; modality: { id: string; code: string; name: string } | null; participation_type: 'created' | 'participated' | 'created_and_participated'; participating_team_names: string[] }
type OrganizationPayload = { organization: Organization | null; disciplines: Discipline[]; modalities: Modality[]; teams: Team[]; members: Member[]; direct_athletes: Member[]; relationships: Relationship[]; tournaments: Tournament[] }
type Section = 'resumen' | 'equipos' | 'personas' | 'jerarquia' | 'eventos' | 'contacto'
type TournamentFilter = 'all' | 'created' | 'participated'

const organizationTypes: Record<string, string> = { organizacion_deportiva: 'Organización deportiva', comite_olimpico: 'Comité olímpico', institucion_gubernamental: 'Institución gubernamental', federacion: 'Federación', union: 'Unión', liga: 'Liga', otro: 'Organización' }
const relationshipNames: Record<string, string> = { supervisa: 'Supervisa', reconoce: 'Reconoce', afiliada_a: 'Afiliada a', avala: 'Avala', coordina: 'Coordina' }
const roleNames: Record<string, string> = { owner: 'Propietario', atleta: 'Atleta', entrenador: 'Entrenador', staff: 'Staff', directivo: 'Directivo' }
const participationNames: Record<TournamentFilter | Tournament['participation_type'], string> = { all: 'Todos', created: 'Creado por la organización', participated: 'Participó con sus equipos', created_and_participated: 'Creado y disputado' }

export default function PublicOrganizationPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<OrganizationPayload | null>(null)
  const [selectedDiscipline, setSelectedDiscipline] = useState('')
  const [section, setSection] = useState<Section>('resumen')
  const [tournamentFilter, setTournamentFilter] = useState<TournamentFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
      setData(payload)
      setLoading(false)
      if (!payload.organization) setError('Esta organización no está disponible.')
    }
    void loadOrganization()
  }, [params.id])

  const disciplines = data?.disciplines ?? []
  const teams = data?.teams ?? []
  const members = data?.members ?? []
  const directAthletes = data?.direct_athletes ?? []
  const relationships = data?.relationships ?? []
  const tournaments = data?.tournaments ?? []
  const activeDiscipline = disciplines.find((discipline) => discipline.id === selectedDiscipline)
  const visibleTeams = teams.filter((team) => !activeDiscipline || team.discipline_id === activeDiscipline.id)
  const visibleModalities = (data?.modalities ?? []).filter((modality) => !activeDiscipline || modality.discipline_id === activeDiscipline.id)
  const visibleTournaments = tournaments.filter((tournament) => {
    const matchesFilter = tournamentFilter === 'all' || tournament.participation_type === tournamentFilter || (tournamentFilter === 'created' && tournament.participation_type === 'created_and_participated') || (tournamentFilter === 'participated' && tournament.participation_type === 'created_and_participated')
    const matchesDiscipline = !activeDiscipline || tournament.discipline_id === activeDiscipline.id
    return matchesFilter && matchesDiscipline
  })
  const initials = data?.organization?.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'

  if (loading) return <OrganizationShell><p className="text-slate-400">Cargando organización...</p></OrganizationShell>
  if (error || !data?.organization) return <OrganizationShell><div className="rounded-[10px] border border-red-400/30 bg-red-500/10 p-5 text-red-200">{error || 'Esta organización no está disponible.'}</div></OrganizationShell>

  const organization = data.organization
  const navigateTo = (nextSection: Section) => setSection(nextSection)

  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10"><div className="mx-auto max-w-7xl space-y-6">
    <button type="button" onClick={() => router.back()} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-[#b4ff45]"><ArrowLeft size={18} />Volver a la búsqueda</button>
    <OrganizationHeader organization={organization} initials={initials} disciplines={disciplines} />
    <nav className="overflow-x-auto rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-2"><div className="flex min-w-max gap-2">{([['resumen', 'Resumen'], ['equipos', 'Equipos'], ['personas', 'Personas y roles'], ['jerarquia', 'Jerarquía'], ['eventos', 'Torneos y eventos'], ['contacto', 'Contacto']] as [Section, string][]).map(([value, label]) => <button key={value} type="button" onClick={() => navigateTo(value)} className={`cursor-pointer rounded-[5px] px-4 py-3 text-sm font-bold transition ${section === value ? 'bg-[#b4ff45] text-[#07131e]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{label}</button>)}</div></nav>
    <DisciplineBar disciplines={disciplines} selectedDiscipline={selectedDiscipline} onSelect={setSelectedDiscipline} />
    {section === 'resumen' && <SummarySection organization={organization} disciplines={disciplines} teams={visibleTeams} members={members} directAthletes={directAthletes} relationships={relationships} tournaments={tournaments} modalities={visibleModalities} onSectionChange={navigateTo} />}
    {section === 'equipos' && <TeamsSection teams={visibleTeams} hasTeams={teams.length > 0} />}
    {section === 'personas' && <PeopleSection members={members} directAthletes={directAthletes} />}
    {section === 'jerarquia' && <HierarchySection relationships={relationships} />}
    {section === 'eventos' && <EventsSection tournaments={visibleTournaments} filter={tournamentFilter} onFilterChange={setTournamentFilter} />}
    {section === 'contacto' && <ContactSection organization={organization} />}
  </div></main>
}

function OrganizationHeader({ organization, initials, disciplines }: { organization: Organization; initials: string; disciplines: Discipline[] }) {
  return <section className="overflow-hidden rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-center"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#b4ff45] font-display text-3xl text-[#07131e]">{organization.logo_url ? <img src={organization.logo_url} alt={`Logo de ${organization.name}`} className="h-full w-full object-cover" /> : initials}</div><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#b4ff45]">Perfil público de organización</p><h1 className="mt-2 truncate font-display text-4xl uppercase sm:text-5xl">{organization.name}</h1><div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400"><span>{organization.handle ? `@${organization.handle}` : 'Sin nombre de usuario'}</span><span className="font-mono text-[#b4ff45]">{organization.athlonx_code || 'Código pendiente'}</span></div></div></div><div className="mt-7 flex flex-wrap gap-2 border-t border-white/10 pt-5">{organization.city && <span className="inline-flex items-center gap-1.5 rounded-[5px] border border-[#29485d] px-3 py-1.5 text-sm text-slate-300"><MapPin size={15} />{organization.city}, {organization.country || 'Panamá'}</span>}<span className="rounded-[5px] border border-[#b4ff45]/40 bg-[#b4ff45]/10 px-3 py-1.5 text-sm font-semibold text-[#dcffb6]">{organizationTypes[organization.type] || 'Organización'}</span>{disciplines.map((discipline) => <span key={discipline.id} className="rounded-[5px] border border-[#29485d] px-3 py-1.5 text-sm text-slate-300">{discipline.name}</span>)}</div>{organization.description && <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-300">{organization.description}</p>}</section>
}

function DisciplineBar({ disciplines, selectedDiscipline, onSelect }: { disciplines: Discipline[]; selectedDiscipline: string; onSelect: (value: string) => void }) {
  return <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Award className="text-[#b4ff45]" size={19} /><h2 className="font-heading text-lg uppercase tracking-wide">Explorar por disciplina</h2></div><p className="mt-2 text-sm text-slate-400">Filtra equipos, modalidades y torneos de la organización.</p></div><button type="button" onClick={() => onSelect('')} className={`cursor-pointer rounded-[5px] px-4 py-2 text-sm font-bold transition ${selectedDiscipline === '' ? 'bg-[#b4ff45] text-[#07131e]' : 'border border-[#29485d] text-slate-300 hover:border-[#b4ff45]'}`}>Todas las disciplinas</button></div><div className="mt-5 flex flex-wrap gap-2">{disciplines.map((discipline) => <button key={discipline.id} type="button" onClick={() => onSelect(discipline.id)} className={`cursor-pointer rounded-[5px] border px-4 py-2 text-sm font-bold transition ${selectedDiscipline === discipline.id ? 'border-[#b4ff45] bg-[#b4ff45]/10 text-[#dcffb6]' : 'border-[#29485d] text-slate-300 hover:border-[#b4ff45] hover:text-white'}`}>{discipline.name}</button>)}{!disciplines.length && <p className="text-sm text-slate-500">No hay disciplinas públicas asignadas.</p>}</div></section>
}

function SummarySection({ organization, disciplines, teams, members, directAthletes, relationships, tournaments, modalities, onSectionChange }: { organization: Organization; disciplines: Discipline[]; teams: Team[]; members: Member[]; directAthletes: Member[]; relationships: Relationship[]; tournaments: Tournament[]; modalities: Modality[]; onSectionChange: (section: Section) => void }) {
  return <div className="space-y-6"><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Equipos afiliados" value={teams.length} onClick={() => onSectionChange('equipos')} /><StatCard label="Atletas independientes" value={directAthletes.length} onClick={() => onSectionChange('personas')} /><StatCard label="Personas vinculadas" value={members.length} onClick={() => onSectionChange('personas')} /><StatCard label="Torneos y eventos" value={tournaments.length} onClick={() => onSectionChange('eventos')} /></section><div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-center gap-2"><Building2 className="text-[#b4ff45]" size={21} /><h2 className="font-heading text-xl uppercase tracking-wide">Resumen institucional</h2></div><p className="mt-5 text-sm leading-7 text-slate-300">{organization.description || 'Esta organización todavía no ha publicado una descripción institucional.'}</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><InfoRow label="Tipo de organización" value={organizationTypes[organization.type] || 'Organización'} /><InfoRow label="Ubicación" value={[organization.city, organization.country].filter(Boolean).join(', ') || 'No publicada'} /><InfoRow label="Disciplinas" value={disciplines.map((discipline) => discipline.name).join(', ') || 'No publicadas'} /><InfoRow label="Modalidades" value={modalities.map((modality) => modality.name).join(', ') || 'No publicadas'} /></div></section><ContactPreview organization={organization} onOpen={() => onSectionChange('contacto')} /></div><section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Actividad pública</p><h2 className="mt-2 font-display text-3xl uppercase">Torneos recientes</h2></div><button type="button" onClick={() => onSectionChange('eventos')} className="cursor-pointer text-sm font-bold text-[#b4ff45] hover:text-white">Ver todos</button></div>{tournaments.length ? <div className="mt-5 grid gap-3 md:grid-cols-3">{tournaments.slice(0, 3).map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} compact />)}</div> : <p className="mt-5 text-sm text-slate-500">Esta organización todavía no tiene torneos públicos creados o disputados.</p>}</section><section className="grid gap-6 lg:grid-cols-2"><PreviewList title="Equipos afiliados" icon={<Users size={20} />} items={teams.slice(0, 4).map((team) => team.name)} empty="Todavía no hay equipos afiliados." onOpen={() => onSectionChange('equipos')} /><PreviewList title="Jerarquía institucional" icon={<Network size={20} />} items={relationships.slice(0, 4).map((relation) => `${relationshipNames[relation.relationship_type] || relation.relationship_type} · ${relation.organization_name}`)} empty="No hay relaciones institucionales públicas." onOpen={() => onSectionChange('jerarquia')} /></section></div>
}

function TeamsSection({ teams, hasTeams }: { teams: Team[]; hasTeams: boolean }) {
  return <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><SectionHeading eyebrow="Estructura deportiva" title="Equipos afiliados" icon={<Users size={27} />} description="Equipos vinculados públicamente con esta organización." />{teams.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{teams.map((team) => <Link key={team.id} href={`/dashboard/equipos/${team.id}`} className="group rounded-[10px] border border-[#29485d] bg-[#07131e] p-5 transition hover:border-[#b4ff45]/60"><div className="flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-[#b4ff45]/15 font-display text-xl text-[#b4ff45]">{team.logo_url ? <img src={team.logo_url} alt={`Logo de ${team.name}`} className="h-full w-full object-cover" /> : team.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><h3 className="truncate font-heading text-xl font-bold uppercase">{team.name}</h3><p className="mt-1 text-sm text-[#b4ff45]">{team.discipline_name || 'Disciplina pendiente'}</p></div><ChevronRight className="shrink-0 text-slate-500 transition group-hover:text-[#b4ff45]" size={20} /></div><div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm text-slate-400">{team.city && <p><MapPin className="mr-2 inline" size={15} />{team.city}, {team.country || 'Panamá'}</p>}<p className="font-mono text-xs text-slate-500">{team.athlonx_code || 'Código pendiente'}</p></div></Link>)}</div> : <EmptyState>{hasTeams ? 'No hay equipos en la disciplina seleccionada.' : 'Todavía no hay equipos vinculados a esta organización.'}</EmptyState>}</section>
}

function PeopleSection({ members, directAthletes }: { members: Member[]; directAthletes: Member[] }) {
  return <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><SectionHeading eyebrow="Afiliación directa" title="Atletas independientes" icon={<UserRound size={27} />} description="Atletas vinculados directamente con la organización y que no pertenecen a uno de sus equipos afiliados." />{directAthletes.length ? <PeopleGrid people={directAthletes} /> : <EmptyState>No hay atletas independientes publicados.</EmptyState>}</section><section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><SectionHeading eyebrow="Personas vinculadas" title="Personas y roles" icon={<Users size={27} />} description="Directivos, entrenadores, staff y atletas con una relación pública aceptada." />{members.length ? <PeopleGrid people={members} /> : <EmptyState>No hay personas vinculadas públicamente.</EmptyState>}</section></div>
}

function PeopleGrid({ people }: { people: Member[] }) {
  return <div className="mt-6 grid gap-3 sm:grid-cols-2">{people.map((person) => <Link key={`${person.user_id}-${person.role}-${person.role_label || ''}`} href={`/dashboard/perfil/${person.user_id}`} className="flex items-center gap-3 rounded-[10px] border border-[#29485d] bg-[#07131e] p-4 transition hover:border-[#b4ff45]/60"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-[#b4ff45] font-bold text-[#07131e]">{person.avatar_url ? <img src={person.avatar_url} alt={`Foto de ${person.full_name}`} className="h-full w-full object-cover" /> : person.full_name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate font-bold">{person.full_name}</p><p className="mt-1 text-sm text-[#b4ff45]">{person.role_label || roleNames[person.role] || person.role}</p>{person.team_names?.length ? <p className="mt-1 truncate text-xs text-slate-400">{person.team_names.join(' · ')}</p> : <p className="mt-1 text-xs text-slate-500">Afiliación directa</p>}{person.username && <p className="mt-1 text-xs text-slate-500">@{person.username}</p>}</div></Link>)}</div>
}

function HierarchySection({ relationships }: { relationships: Relationship[] }) {
  return <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><SectionHeading eyebrow="Autoridad institucional" title="Jerarquía y relaciones" icon={<Network size={27} />} description="Relaciones institucionales activas y aceptadas públicamente." />{relationships.length ? <div className="mt-6 grid gap-4 md:grid-cols-2">{relationships.map((relation) => <Link key={relation.id} href={`/dashboard/organizaciones/${relation.organization_id}`} className="group rounded-[10px] border border-[#29485d] bg-[#07131e] p-5 transition hover:border-[#b4ff45]/60"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#b4ff45]">{relation.direction === 'superior' ? 'Organización superior' : 'Organización subordinada'}</p><p className="mt-2 font-heading text-xl font-bold">{relation.organization_name}</p><p className="mt-2 text-sm text-slate-400">{relationshipNames[relation.relationship_type] || relation.relationship_type}{relation.discipline_name ? ` · ${relation.discipline_name}` : ''}</p></div><ChevronRight className="mt-1 shrink-0 text-slate-500 transition group-hover:text-[#b4ff45]" size={20} /></div></Link>)}</div> : <EmptyState>No hay relaciones institucionales públicas registradas.</EmptyState>}</section>
}

function EventsSection({ tournaments, filter, onFilterChange }: { tournaments: Tournament[]; filter: TournamentFilter; onFilterChange: (value: TournamentFilter) => void }) {
  return <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex flex-col gap-5 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between"><SectionHeading eyebrow="Actividad competitiva" title="Torneos y eventos" icon={<Trophy size={27} />} description="Eventos creados por la organización y torneos en los que participaron sus equipos." /><select value={filter} onChange={(event) => onFilterChange(event.target.value as TournamentFilter)} className="rounded-[5px] border border-[#31556b] bg-[#07131e] px-3 py-3 text-sm font-semibold text-white outline-none focus:border-[#b4ff45]"><option value="all">Todos los eventos</option><option value="created">Creados por la organización</option><option value="participated">Participación de sus equipos</option></select></div>{tournaments.length ? <div className="mt-6 grid gap-4 md:grid-cols-2">{tournaments.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)}</div> : <EmptyState>No hay torneos públicos para este filtro y disciplina.</EmptyState>}</section>
}

function TournamentCard({ tournament, compact = false }: { tournament: Tournament; compact?: boolean }) {
  const statusName: Record<string, string> = { published: 'Publicado', in_progress: 'En curso', finished: 'Finalizado' }
  const date = tournament.start_date ? new Date(`${tournament.start_date}T00:00:00`).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Fecha pendiente'
  return <Link href={`/dashboard/torneos/ver/${tournament.id}`} className={`group block rounded-[10px] border border-[#29485d] bg-[#07131e] transition hover:border-[#b4ff45]/60 ${compact ? 'p-4' : 'p-5'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-heading text-lg font-bold">{tournament.name}</p><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-[5px] border border-[#b4ff45]/40 bg-[#b4ff45]/10 px-2 py-1 font-semibold text-[#dcffb6]">{participationNames[tournament.participation_type]}</span>{tournament.status && <span className="rounded-[5px] border border-[#29485d] px-2 py-1 text-slate-400">{statusName[tournament.status] || tournament.status}</span>}</div></div><CalendarDays className="shrink-0 text-[#b4ff45]" size={20} /></div><div className="mt-4 space-y-1 text-sm text-slate-400"><p>{date}{tournament.location ? ` · ${tournament.location}` : ''}</p><p>{[tournament.discipline_name, tournament.modality?.name].filter(Boolean).join(' · ') || 'Disciplina pendiente'}</p>{tournament.participating_team_names.length > 0 && <p className="text-slate-500">Equipos: {tournament.participating_team_names.join(', ')}</p>}</div></Link>
}

function ContactSection({ organization }: { organization: Organization }) {
  const socialLinks = Object.entries(organization.social_links ?? {}).filter(([, value]) => Boolean(value))
  return <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><SectionHeading eyebrow="Canales públicos" title="Contacto institucional" icon={<Globe2 size={27} />} description="Información de contacto publicada por la organización." /><div className="mt-6 grid gap-4 md:grid-cols-2"><ContactItem icon={<Mail size={19} />} label="Correo institucional" value={organization.contact_email} href={organization.contact_email ? `mailto:${organization.contact_email}` : undefined} /><ContactItem icon={<Phone size={19} />} label="Teléfono o WhatsApp" value={organization.contact_phone} href={organization.contact_phone ? `tel:${organization.contact_phone}` : undefined} /><ContactItem icon={<Globe2 size={19} />} label="Página web" value={organization.website_url} href={organization.website_url ? externalUrl(organization.website_url) : undefined} /></div><div className="mt-4 rounded-[10px] border border-[#29485d] bg-[#07131e] p-5"><div className="flex items-center gap-2 text-[#b4ff45]"><Link2 size={19} /><h3 className="font-bold">Redes sociales</h3></div>{socialLinks.length ? <div className="mt-4 flex flex-wrap gap-3">{socialLinks.map(([network, value]) => <a key={network} href={externalUrl(value)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-[5px] border border-[#29485d] px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-[#b4ff45] hover:text-white"><ExternalLink size={15} />{network}</a>)}</div> : <p className="mt-3 text-sm text-slate-500">No hay redes sociales públicas registradas.</p>}</div></section>
}

function ContactPreview({ organization, onOpen }: { organization: Organization; onOpen: () => void }) {
  return <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Globe2 className="text-[#b4ff45]" size={21} /><h2 className="font-heading text-xl uppercase tracking-wide">Contacto público</h2></div><button type="button" onClick={onOpen} className="cursor-pointer text-sm font-bold text-[#b4ff45] hover:text-white">Ver detalles</button></div><div className="mt-6 space-y-4"><ContactLine icon={<Mail size={17} />} value={organization.contact_email} empty="Correo no publicado" /><ContactLine icon={<Phone size={17} />} value={organization.contact_phone} empty="Teléfono no publicado" /><ContactLine icon={<Globe2 size={17} />} value={organization.website_url} empty="Página web no publicada" /></div></section>
}

function ContactItem({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string | null; href?: string }) {
  return <div className="rounded-[10px] border border-[#29485d] bg-[#07131e] p-5"><div className="flex items-center gap-2 text-[#b4ff45]">{icon}<p className="text-xs font-bold uppercase tracking-[.16em]">{label}</p></div>{value ? href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} className="mt-3 block break-all text-sm font-semibold text-slate-200 hover:text-[#b4ff45]">{value}</a> : <p className="mt-3 break-all text-sm font-semibold text-slate-200">{value}</p> : <p className="mt-3 text-sm text-slate-500">No publicado</p>}</div>
}

function ContactLine({ icon, value, empty }: { icon: React.ReactNode; value: string | null; empty: string }) {
  return <div className="flex items-center gap-3 text-sm"><span className="text-[#b4ff45]">{icon}</span><span className={value ? 'break-all text-slate-300' : 'text-slate-500'}>{value || empty}</span></div>
}

function StatCard({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="cursor-pointer rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-5 text-left transition hover:border-[#b4ff45]/60"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">{label}</p><p className="mt-3 font-display text-4xl text-white">{value}</p><p className="mt-2 text-xs font-semibold text-[#b4ff45]">Explorar sección</p></button>
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[5px] border border-white/10 bg-[#07131e] p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">{label}</p><p className="mt-2 text-sm font-semibold text-slate-200">{value}</p></div>
}

function PreviewList({ title, icon, items, empty, onOpen }: { title: string; icon: React.ReactNode; items: string[]; empty: string; onOpen: () => void }) {
  return <section className="rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-6"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-[#b4ff45]">{icon}<h2 className="font-heading text-lg uppercase tracking-wide text-white">{title}</h2></div><button type="button" onClick={onOpen} className="cursor-pointer text-xs font-bold text-[#b4ff45] hover:text-white">Ver todos</button></div>{items.length ? <div className="mt-5 space-y-2">{items.map((item) => <div key={item} className="rounded-[5px] border border-white/10 bg-[#07131e] px-4 py-3 text-sm text-slate-300">{item}</div>)}</div> : <p className="mt-5 text-sm text-slate-500">{empty}</p>}</section>
}

function SectionHeading({ eyebrow, title, icon, description }: { eyebrow: string; title: string; icon: React.ReactNode; description: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">{eyebrow}</p><h2 className="mt-2 font-display text-3xl uppercase">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p></div><span className="shrink-0 text-[#b4ff45]">{icon}</span></div>
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 rounded-[10px] border border-dashed border-[#31556b] p-6 text-sm text-slate-400">{children}</div>
}

function externalUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function OrganizationShell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10"><div className="mx-auto max-w-7xl">{children}</div></main>
}

'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Building2, CalendarDays, ChevronRight, MapPin, Network, ShieldCheck, Trophy, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

type Organization = { id: string; name: string; type: string; country: string | null; city: string | null; logo_url: string | null; description: string | null; slug: string | null; athlonx_code: string | null; handle: string | null }
type Discipline = { id: string; code: string; name: string }
type Modality = { id: string; code: string; name: string; discipline_id: string }
type Team = { id: string; name: string; logo_url: string | null; country: string | null; city: string | null; discipline_id: string | null; discipline_code: string | null; discipline_name: string | null; athlonx_code: string | null; handle: string | null }
type Member = { user_id: string; full_name: string; avatar_url: string | null; username: string | null; role: string; role_label: string | null }
type Relationship = { id: string; direction: 'superior' | 'subordinate'; relationship_type: string; organization_id: string; organization_name: string; discipline_name: string | null }
type Tournament = { id: string; name: string; slug: string | null; season: number | string | null; status: string | null; location: string | null }
type OrganizationPayload = { organization: Organization | null; disciplines: Discipline[]; modalities: Modality[]; teams: Team[]; members: Member[]; relationships: Relationship[]; tournaments: Tournament[] }

const organizationTypes: Record<string, string> = { organizacion_deportiva: 'Organización deportiva', comite_olimpico: 'Comité olímpico', institucion_gubernamental: 'Institución gubernamental', federacion: 'Federación', union: 'Unión', liga: 'Liga', otro: 'Organización' }
const relationshipNames: Record<string, string> = { supervisa: 'Supervisa', reconoce: 'Reconoce', afiliada_a: 'Afiliada a', avala: 'Avala', coordina: 'Coordina' }
const roleNames: Record<string, string> = { owner: 'Propietario', atleta: 'Atleta', entrenador: 'Entrenador', staff: 'Staff', directivo: 'Directivo' }

export default function PublicOrganizationPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<OrganizationPayload | null>(null)
  const [selectedDiscipline, setSelectedDiscipline] = useState('')
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
      setSelectedDiscipline(payload.disciplines?.[0]?.id ?? '')
      if (!payload.organization) setError('Esta organización no está disponible.')
      setLoading(false)
    }
    void loadOrganization()
  }, [params.id])

  const disciplines = data?.disciplines ?? []
  const teams = data?.teams ?? []
  const modalities = data?.modalities ?? []
  const activeDiscipline = disciplines.find((discipline) => discipline.id === selectedDiscipline) ?? disciplines[0]
  const visibleTeams = teams.filter((team) => !activeDiscipline || team.discipline_id === activeDiscipline.id)
  const visibleModalities = modalities.filter((modality) => !activeDiscipline || modality.discipline_id === activeDiscipline.id)

  if (loading) return <OrganizationShell><p className="text-slate-400">Cargando organización...</p></OrganizationShell>
  if (error || !data?.organization) return <OrganizationShell><div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-red-200">{error || 'Esta organización no está disponible.'}</div></OrganizationShell>

  const organization = data.organization
  const initials = organization.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'

  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10"><div className="mx-auto max-w-6xl space-y-6">
    <button type="button" onClick={() => router.back()} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-[#b4ff45]"><ArrowLeft size={18} />Volver a la búsqueda</button>

    <section className="overflow-hidden rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-center"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-[#b4ff45] font-display text-3xl text-[#07131e]">{organization.logo_url ? <img src={organization.logo_url} alt={`Logo de ${organization.name}`} className="h-full w-full object-cover" /> : initials}</div><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#b4ff45]">Perfil público de organización</p><h1 className="mt-2 truncate font-display text-4xl uppercase sm:text-5xl">{organization.name}</h1><div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400"><span>{organization.handle ? `@${organization.handle}` : organizationTypes[organization.type] || 'Organización'}</span><span className="font-mono text-[#b4ff45]">{organization.athlonx_code || 'Código pendiente'}</span></div></div></div><div className="mt-7 flex flex-wrap gap-2 border-t border-white/10 pt-5">{organization.city && <span className="inline-flex items-center gap-1.5 rounded-full border border-[#29485d] px-3 py-1.5 text-sm text-slate-300"><MapPin size={15} />{organization.city}, {organization.country || 'Panamá'}</span>}{organizationTypes[organization.type] && <span className="rounded-full border border-[#b4ff45]/40 bg-[#b4ff45]/10 px-3 py-1.5 text-sm font-semibold text-[#dcffb6]">{organizationTypes[organization.type]}</span>}</div>{organization.description && <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300">{organization.description}</p>}</section>

    <section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-6"><div className="flex items-center gap-2"><Building2 className="text-[#b4ff45]" size={19} /><h2 className="font-heading text-lg uppercase tracking-wide">Disciplinas representadas</h2></div><div className="mt-5 flex flex-wrap gap-3">{disciplines.length ? disciplines.map((discipline) => <button key={discipline.id} type="button" onClick={() => setSelectedDiscipline(discipline.id)} className={`cursor-pointer rounded-full px-4 py-2 text-sm font-bold transition ${activeDiscipline?.id === discipline.id ? 'bg-[#b4ff45] text-[#07131e]' : 'border border-[#29485d] text-slate-300 hover:border-[#b4ff45] hover:text-white'}`}>{discipline.name}</button>) : <p className="text-sm text-slate-500">No hay disciplinas públicas asignadas.</p>}</div></section>

    <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">{activeDiscipline?.name || 'Estructura deportiva'}</p><h2 className="mt-2 font-display text-3xl uppercase">Equipos</h2></div><Users className="text-[#b4ff45]" size={27} /></div>{visibleTeams.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2">{visibleTeams.map((team) => <Link key={team.id} href={`/dashboard/equipos/${team.id}`} className="rounded-2xl border border-[#29485d] bg-[#07131e] p-4 transition hover:border-[#b4ff45]/60"><div className="flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#b4ff45]/15 font-bold text-[#b4ff45]">{team.logo_url ? <img src={team.logo_url} alt="" className="h-full w-full object-cover" /> : team.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate font-bold">{team.name}</p><p className="mt-1 text-xs text-slate-500">{team.city || team.country || 'Ubicación pendiente'}</p></div><ChevronRight className="shrink-0 text-[#b4ff45]" size={18} /></div><p className="mt-3 font-mono text-xs text-slate-500">{team.athlonx_code || 'Código pendiente'}</p></Link>)}</div> : <p className="mt-6 text-sm text-slate-500">No hay equipos públicos en esta disciplina.</p>}</section><section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-center gap-2 border-b border-white/10 pb-5"><ShieldCheck className="text-[#b4ff45]" size={21} /><h2 className="font-heading text-lg uppercase tracking-wide">Modalidades</h2></div>{visibleModalities.length ? <div className="mt-6 flex flex-wrap gap-2">{visibleModalities.map((modality) => <span key={modality.id} className="rounded-full border border-[#29485d] bg-[#07131e] px-3 py-2 text-sm text-slate-300">{modality.name}</span>)}</div> : <p className="mt-6 text-sm text-slate-500">No hay modalidades registradas para esta disciplina.</p>}</section></div>

    <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-center gap-2 border-b border-white/10 pb-5"><Network className="text-[#b4ff45]" size={21} /><h2 className="font-heading text-lg uppercase tracking-wide">Jerarquía institucional</h2></div>{data.relationships?.length ? <div className="mt-6 space-y-3">{data.relationships.map((relation) => <Link key={relation.id} href={`/dashboard/organizaciones/${relation.organization_id}`} className="block rounded-2xl border border-[#29485d] bg-[#07131e] p-4 transition hover:border-[#b4ff45]/60"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#b4ff45]">{relation.direction === 'superior' ? 'Organización relacionada' : 'Organización superior'}</p><p className="mt-2 font-bold">{relation.organization_name}</p><p className="mt-1 text-sm text-slate-400">{relationshipNames[relation.relationship_type] || relation.relationship_type}{relation.discipline_name ? ` · ${relation.discipline_name}` : ''}</p></div><ChevronRight className="mt-1 shrink-0 text-[#b4ff45]" size={18} /></div></Link>)}</div> : <p className="mt-6 text-sm text-slate-500">No hay relaciones institucionales públicas registradas.</p>}</section><section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-center gap-2 border-b border-white/10 pb-5"><Users className="text-[#b4ff45]" size={21} /><h2 className="font-heading text-lg uppercase tracking-wide">Integrantes y etiquetas</h2></div>{data.members?.length ? <div className="mt-6 space-y-3">{data.members.map((member) => <Link key={`${member.user_id}-${member.role}`} href={`/dashboard/perfil/${member.user_id}`} className="flex items-center gap-3 rounded-xl border border-[#29485d] bg-[#07131e] p-3 transition hover:border-[#b4ff45]/60"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#b4ff45] font-bold text-[#07131e]">{member.avatar_url ? <img src={member.avatar_url} alt="" className="h-full w-full object-cover" /> : member.full_name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{member.full_name}</p><p className="text-xs text-slate-400">{member.role_label || roleNames[member.role] || member.role}</p></div></Link>)}</div> : <p className="mt-6 text-sm text-slate-500">No hay integrantes públicos registrados.</p>}</section></div>

    <section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-center justify-between gap-3 border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Actividad pública</p><h2 className="mt-2 font-display text-3xl uppercase">Torneos</h2></div><Trophy className="text-[#b4ff45]" size={27} /></div>{data.tournaments?.length ? <div className="mt-6 grid gap-3 md:grid-cols-2">{data.tournaments.map((tournament) => <Link key={tournament.id} href={`/dashboard/torneos/ver/${tournament.id}`} className="flex items-center justify-between gap-4 rounded-2xl border border-[#29485d] bg-[#07131e] p-4 transition hover:border-[#b4ff45]/60"><div><p className="font-bold">{tournament.name}</p><p className="mt-1 text-sm text-slate-400">{tournament.season || 'Temporada pendiente'}{tournament.location ? ` · ${tournament.location}` : ''}</p></div><CalendarDays className="shrink-0 text-[#b4ff45]" size={20} /></Link>)}</div> : <p className="mt-6 text-sm text-slate-500">Esta organización todavía no tiene torneos públicos asociados.</p>}</section>
  </div></main>
}

function OrganizationShell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10"><div className="mx-auto max-w-6xl">{children}</div></main>
}

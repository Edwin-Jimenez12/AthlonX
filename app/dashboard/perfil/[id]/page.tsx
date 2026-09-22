'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Award, Building2, MapPin, ShieldCheck, Trophy, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

type PublicProfile = { id: string; full_name: string; avatar_url: string | null; username: string | null; athlonx_code: string | null }
type Role = { role: string }
type Label = { role: string; role_label: string | null; organization_id: string | null; organization_name: string | null; team_id: string | null; team_name: string | null }
type TeamAffiliation = { team_id: string; team_name: string; team_city: string | null; organization_id: string | null; organization_name: string | null; discipline_id: string | null; discipline_code: string | null; discipline_name: string | null; role: string; role_label: string | null }
type Discipline = { id: string; code: string; name: string }
type PublicProfilePayload = { profile: PublicProfile | null; roles: Role[]; labels: Label[]; team_affiliations: TeamAffiliation[]; disciplines: Discipline[] }

const roleNames: Record<string, string> = {
  atleta: 'Atleta',
  entrenador: 'Entrenador',
  staff: 'Staff',
  directivo: 'Directivo',
  owner: 'Propietario',
}

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<PublicProfilePayload | null>(null)
  const [selectedDiscipline, setSelectedDiscipline] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadPublicProfile() {
      if (!supabase || !params.id) {
        setError('No se pudo identificar el perfil.')
        setLoading(false)
        return
      }
      const { data: response, error: profileError } = await supabase.rpc('get_public_profile', { p_profile_id: params.id })
      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
      const payload = response as PublicProfilePayload
      setData(payload)
      setSelectedDiscipline(payload.disciplines?.[0]?.code ?? '')
      setLoading(false)
    }
    void loadPublicProfile()
  }, [params.id])

  const profile = data?.profile
  const labels = data?.labels ?? []
  const disciplines = data?.disciplines ?? []
  const teamAffiliations = data?.team_affiliations ?? []
  const activeDiscipline = disciplines.find((discipline) => discipline.code === selectedDiscipline) ?? disciplines[0]
  const visibleTeams = teamAffiliations.filter((team) => team.discipline_code === activeDiscipline?.code)
  const tags = useMemo(() => Array.from(new Set([
    ...(data?.roles ?? []).map((item) => roleNames[item.role] ?? item.role),
    ...labels.map((item) => item.role_label || roleNames[item.role] || item.role),
  ])), [data?.roles, labels])
  const initials = profile?.full_name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'

  if (loading) return <ProfileShell><p className="text-slate-400">Cargando perfil...</p></ProfileShell>
  if (error || !profile) return <ProfileShell><div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-red-200">{error || 'Este perfil no está disponible.'}</div></ProfileShell>

  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10">
    <div className="mx-auto max-w-6xl space-y-6">
      <button type="button" onClick={() => router.back()} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-[#b4ff45]"><ArrowLeft size={18} />Volver a la búsqueda</button>

      <section className="overflow-hidden rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-[#b4ff45] font-display text-4xl text-[#07131e]">{profile.avatar_url ? <img src={profile.avatar_url} alt={`Foto de ${profile.full_name}`} className="h-full w-full object-cover" /> : initials}</div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[.24em] text-[#b4ff45]">Perfil público</p>
            <h1 className="mt-2 truncate font-display text-4xl uppercase sm:text-5xl">{profile.full_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400"><span>{profile.username ? `@${profile.username}` : 'Sin nombre de usuario'}</span><span className="font-mono text-[#b4ff45]">{profile.athlonx_code || 'Código pendiente'}</span></div>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap gap-2 border-t border-white/10 pt-5">{tags.length ? tags.map((tag) => <span key={tag} className="inline-flex items-center gap-2 rounded-full border border-[#b4ff45]/40 bg-[#b4ff45]/10 px-3 py-1.5 text-sm font-semibold text-[#dcffb6]"><ShieldCheck size={15} />{tag}</span>) : <span className="text-sm text-slate-500">Sin etiquetas asignadas</span>}</div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <aside className="h-fit rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-6">
          <div className="flex items-center gap-2"><Award className="text-[#b4ff45]" size={19} /><h2 className="font-heading text-lg uppercase tracking-wide">Disciplinas</h2></div>
          <p className="mt-2 text-sm leading-6 text-slate-400">Selecciona una disciplina para ver sus equipos y la información deportiva relacionada.</p>
          <div className="mt-5 space-y-2">{disciplines.length ? disciplines.map((discipline) => <button key={discipline.id} type="button" onClick={() => setSelectedDiscipline(discipline.code)} className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition ${activeDiscipline?.code === discipline.code ? 'bg-[#b4ff45] text-[#07131e]' : 'bg-white/[.03] text-slate-300 hover:bg-white/10 hover:text-white'}`}><span>{discipline.name}</span><span className="text-xs opacity-70">{teamAffiliations.filter((team) => team.discipline_code === discipline.code).length} equipo{teamAffiliations.filter((team) => team.discipline_code === discipline.code).length === 1 ? '' : 's'}</span></button>) : <p className="text-sm text-slate-500">Sin disciplinas registradas.</p>}</div>
        </aside>

        <section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Vista por disciplina</p><h2 className="mt-2 font-display text-3xl uppercase">{activeDiscipline?.name || 'Perfil deportivo'}</h2></div><Trophy className="text-[#b4ff45]" size={27} /></div>
          <div className="mt-6"><p className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">Equipos en esta disciplina</p>{visibleTeams.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{visibleTeams.map((team) => <article key={`${team.team_id}-${team.role}`} className="rounded-2xl border border-[#29485d] bg-[#07131e] p-5"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#b4ff45]/15 text-[#b4ff45]"><Users size={20} /></div><div className="min-w-0"><h3 className="truncate text-lg font-bold">{team.team_name}</h3><p className="mt-1 text-sm text-[#b4ff45]">{team.role_label || roleNames[team.role] || team.role}</p></div></div><div className="mt-4 space-y-2 border-t border-white/10 pt-3 text-sm text-slate-400">{team.organization_name && <p><Building2 className="mr-2 inline text-slate-500" size={15} />{team.organization_name}</p>}{team.team_city && <p><MapPin className="mr-2 inline text-slate-500" size={15} />{team.team_city}</p>}</div></article>)}</div> : <div className="mt-3 rounded-2xl border border-dashed border-[#29485d] p-5 text-sm text-slate-400">No hay un equipo vinculado a esta persona en {activeDiscipline?.name || 'esta disciplina'}.</div>}</div>
          <div className="mt-7 border-t border-white/10 pt-6"><p className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">Etiquetas y pertenencias</p><div className="mt-3 space-y-2">{labels.length ? labels.map((label, index) => <div key={`${label.role}-${label.team_id || label.organization_id}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[.03] px-4 py-3"><span className="font-semibold text-white">{label.role_label || roleNames[label.role] || label.role}</span><span className="text-sm text-slate-400">{label.team_name || label.organization_name || 'AthlonX'}</span></div>) : <p className="text-sm text-slate-500">Sin pertenencias activas registradas.</p>}</div></div>
        </section>
      </section>
    </div>
  </main>
}

function ProfileShell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10"><div className="mx-auto max-w-6xl"><Link href="/dashboard/busqueda" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-[#b4ff45]"><ArrowLeft size={18} />Volver a la búsqueda</Link>{children}</div></main>
}

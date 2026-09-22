'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Building2, CalendarDays, MapPin, ShieldCheck, Trophy, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

type Discipline = { id: string; code: string; name: string }
type OrganizationSummary = { id: string; name: string; athlonx_code: string | null; handle: string | null }
type Team = { id: string; name: string; logo_url: string | null; country: string | null; city: string | null; athlonx_code: string | null; handle: string | null; discipline: Discipline | null; organization: OrganizationSummary | null }
type Label = { user_id: string; full_name: string; avatar_url: string | null; username: string | null; role: string; role_label: string | null }
type Player = { id: string; full_name: string; shirt_number: number | null; position: string | null }
type Tournament = { id: string; name: string; slug: string | null; season: number | string | null; status: string | null; location: string | null }
type TeamPayload = { team: Team | null; labels: Label[]; players: Player[]; tournaments: Tournament[] }

const roleNames: Record<string, string> = { owner: 'Propietario', atleta: 'Atleta', entrenador: 'Entrenador', staff: 'Staff', directivo: 'Directivo' }

export default function PublicTeamPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<TeamPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadTeam() {
      if (!supabase || !params.id) {
        setError('No se pudo identificar el equipo.')
        setLoading(false)
        return
      }
      const { data: response, error: teamError } = await supabase.rpc('get_public_team_profile', { p_team_id: params.id })
      if (teamError) {
        setError(teamError.message)
        setLoading(false)
        return
      }
      const payload = response as TeamPayload
      setData(payload)
      if (!payload.team) setError('Este equipo no está disponible.')
      setLoading(false)
    }
    void loadTeam()
  }, [params.id])

  if (loading) return <TeamShell><p className="text-slate-400">Cargando equipo...</p></TeamShell>
  if (error || !data?.team) return <TeamShell><div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-red-200">{error || 'Este equipo no está disponible.'}</div></TeamShell>

  const team = data.team
  const labels = data.labels ?? []
  const players = data.players ?? []
  const tournaments = data.tournaments ?? []
  const initials = team.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'

  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10">
    <div className="mx-auto max-w-6xl space-y-6">
      <button type="button" onClick={() => router.back()} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-[#b4ff45]"><ArrowLeft size={18} />Volver a la búsqueda</button>

      <section className="overflow-hidden rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-[#b4ff45] font-display text-3xl text-[#07131e]">{team.logo_url ? <img src={team.logo_url} alt={`Logo de ${team.name}`} className="h-full w-full object-cover" /> : initials}</div>
          <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#b4ff45]">Perfil público del equipo</p><h1 className="mt-2 truncate font-display text-4xl uppercase sm:text-5xl">{team.name}</h1><div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400"><span>{team.handle ? `@${team.handle}` : 'Sin nombre de usuario'}</span><span className="font-mono text-[#b4ff45]">{team.athlonx_code || 'Código pendiente'}</span></div></div>
        </div>
        <div className="mt-7 flex flex-wrap gap-2 border-t border-white/10 pt-5">{team.discipline && <span className="rounded-full border border-[#b4ff45]/40 bg-[#b4ff45]/10 px-3 py-1.5 text-sm font-semibold text-[#dcffb6]">{team.discipline.name}</span>}{team.city && <span className="inline-flex items-center gap-1.5 rounded-full border border-[#29485d] px-3 py-1.5 text-sm text-slate-300"><MapPin size={15} />{team.city}, {team.country || 'Panamá'}</span>}</div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <aside className="h-fit space-y-6">
          {team.organization && <section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6"><div className="flex items-center gap-2"><Building2 className="text-[#b4ff45]" size={19} /><h2 className="font-heading text-lg uppercase tracking-wide">Organización</h2></div><Link href={`/dashboard/organizaciones/${team.organization.id}`} className="mt-5 block rounded-2xl border border-[#29485d] bg-[#07131e] p-4 transition hover:border-[#b4ff45]/60"><p className="font-heading text-xl font-bold">{team.organization.name}</p><p className="mt-2 font-mono text-xs text-[#b4ff45]">{team.organization.athlonx_code || 'Código pendiente'}</p></Link></section>}
          <section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6"><div className="flex items-center gap-2"><ShieldCheck className="text-[#b4ff45]" size={19} /><h2 className="font-heading text-lg uppercase tracking-wide">Etiquetas del equipo</h2></div><div className="mt-5 space-y-3">{labels.length ? labels.map((label) => <Link key={`${label.user_id}-${label.role}`} href={`/dashboard/perfil/${label.user_id}`} className="flex items-center gap-3 rounded-xl border border-[#29485d] bg-[#07131e] p-3 transition hover:border-[#b4ff45]/60"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#b4ff45] font-bold text-[#07131e]">{label.avatar_url ? <img src={label.avatar_url} alt="" className="h-full w-full object-cover" /> : label.full_name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{label.full_name}</p><p className="text-xs text-slate-400">{label.role_label || roleNames[label.role] || label.role}</p></div></Link>) : <p className="text-sm text-slate-500">No hay etiquetas públicas asignadas.</p>}</div></section>
        </aside>

        <div className="space-y-6">
          <section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-center justify-between gap-3 border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Plantilla deportiva</p><h2 className="mt-2 font-display text-3xl uppercase">Atletas</h2></div><Users className="text-[#b4ff45]" size={27} /></div>{players.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2">{players.map((player) => <article key={player.id} className="rounded-2xl border border-[#29485d] bg-[#07131e] p-4"><p className="font-bold">{player.full_name}</p><p className="mt-2 text-sm text-slate-400">#{player.shirt_number ?? '--'} · {player.position || 'Posición pendiente'}</p></article>)}</div> : <p className="mt-6 text-sm text-slate-500">No hay atletas registrados en la plantilla.</p>}</section>
          <section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-center justify-between gap-3 border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Participación</p><h2 className="mt-2 font-display text-3xl uppercase">Torneos</h2></div><Trophy className="text-[#b4ff45]" size={27} /></div>{tournaments.length ? <div className="mt-6 space-y-3">{tournaments.map((tournament) => <Link key={tournament.id} href={`/dashboard/torneos/ver/${tournament.id}`} className="flex flex-col gap-2 rounded-2xl border border-[#29485d] bg-[#07131e] p-4 transition hover:border-[#b4ff45]/60 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{tournament.name}</p><p className="mt-1 text-sm text-slate-400">{tournament.season || 'Temporada pendiente'}{tournament.location ? ` · ${tournament.location}` : ''}</p></div><CalendarDays className="shrink-0 text-[#b4ff45]" size={20} /></Link>)}</div> : <p className="mt-6 text-sm text-slate-500">Este equipo todavía no tiene torneos asociados.</p>}</section>
        </div>
      </div>
    </div>
  </main>
}

function TeamShell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10"><div className="mx-auto max-w-6xl">{children}</div></main>
}

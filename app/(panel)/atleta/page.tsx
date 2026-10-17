'use client'

import { ArrowUpRight, Pencil } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AccountContext, loadAccountContexts } from '../../../lib/account-contexts'
import { supabase } from '../../../lib/supabase'
import { PersonaViewSwitcher } from '../../../Components/persona-view-switcher'

type TournamentRow = { id: string; name: string; cover_url: string | null; status: string; start_date: string | null }
type TournamentTeamRow = { tournament_id: string; team_id: string }

const statusLabels: Record<string, string> = { in_progress: 'En curso', finished: 'Finalizado' }
const roleLabels: Record<AccountContext['role'], string> = { atleta: 'Atleta', entrenador: 'Entrenador', staff: 'Staff', directivo: 'Directivo' }

function firstName(name: string) {
  return name.trim().split(/\s+/)[0]?.toUpperCase() || 'ATLETA'
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'
}

export default function AthleteDashboard() {
  const [userId, setUserId] = useState('')
  const [fullName, setFullName] = useState('Persona AthlonX')
  const [contexts, setContexts] = useState<AccountContext[]>([])
  const [tournaments, setTournaments] = useState<TournamentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) {
        setError('Supabase no está configurado.')
        setLoading(false)
        return
      }
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) {
        setError('Debes iniciar sesión para ver tu cuenta personal.')
        setLoading(false)
        return
      }
      const [{ data: profile }, accountContexts] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        loadAccountContexts(user.id),
      ])
      const teamIds = Array.from(new Set(accountContexts.flatMap((context) => (context.teamId ? [context.teamId] : []))))
      let tournamentRows: TournamentRow[] = []
      if (teamIds.length) {
        const { data: links } = await supabase.from('tournament_teams').select('tournament_id, team_id').in('team_id', teamIds)
        const tournamentIds = Array.from(new Set(((links ?? []) as TournamentTeamRow[]).map((link) => link.tournament_id)))
        if (tournamentIds.length) {
          const { data } = await supabase
            .from('tournaments')
            .select('id, name, cover_url, status, start_date')
            .in('id', tournamentIds)
            .neq('status', 'draft')
            .order('start_date', { ascending: true })
          tournamentRows = (data ?? []) as TournamentRow[]
        }
      }
      if (!active) return
      setUserId(user.id)
      setFullName(profile?.full_name || user.user_metadata?.full_name || 'Persona AthlonX')
      setContexts(accountContexts)
      setTournaments(tournamentRows)
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [])

  const affiliations = contexts.filter((context) => context.contextType !== 'personal' && (context.teamId || context.organizationId))
  const activeRoles = new Set(contexts.map((context) => context.role))
  const disciplines = new Set(contexts.flatMap((context) => (context.discipline ? [context.discipline] : [])))
  const value = (number: number) => (loading ? '—' : String(number))

  return (
    <main className="ax-panel-enter min-h-screen bg-transparent text-white lg:ml-64">
      <section className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-[#1f4057] pb-8">
          <PersonaViewSwitcher active="atleta" />
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[.24em] text-[#b4ff45]">Mi vista · Atleta</p>
              <h1 className="mt-3 font-display text-5xl uppercase leading-none sm:text-6xl">Hola, {firstName(fullName)}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">Tus equipos, organizaciones y torneos en un solo lugar.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/mi-perfil" className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] transition hover:brightness-110"><Pencil size={18} />Editar mi perfil</Link>
              {userId && <Link href={`/perfil/${userId}`} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#31556b] px-5 py-3 font-semibold text-slate-200 transition hover:border-[#b4ff45] hover:text-[#b4ff45]">Ver perfil público<ArrowUpRight size={18} /></Link>}
            </div>
          </div>
        </header>

        {error && <p role="alert" className="rounded-2xl border border-[#ff7d88]/40 bg-[#ff7d88]/10 p-4 text-sm text-[#ffb0b7]">{error}</p>}

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ['Afiliaciones', value(affiliations.length)],
            ['Roles activos', value(activeRoles.size)],
            ['Torneos', value(tournaments.length)],
            ['Disciplinas', value(disciplines.size)],
          ].map(([label, figure]) => (
            <article key={label} className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6">
              <p className="font-display text-5xl leading-none">{figure}</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-[.2em] text-slate-400">{label}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div className="space-y-4">
            <h2 className="font-display text-3xl uppercase">Mis afiliaciones</h2>
            {affiliations.length ? affiliations.map((item) => {
              const href = item.teamId ? `/equipos/${item.teamId}` : `/organizaciones/${item.organizationId}`
              return (
                <article key={item.id} className="flex flex-col gap-4 rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#b4ff45] font-display text-xl text-[#07131e]">{initials(item.name)}</div>
                    <div>
                      <h3 className="font-display text-2xl uppercase">{item.name}</h3>
                      <p className="mt-1 text-sm text-slate-400">{item.teamId ? 'Equipo' : 'Organización'} · {roleLabels[item.role]}{item.discipline ? ` · ${item.discipline}` : ''}</p>
                    </div>
                  </div>
                  <Link href={href} className="inline-flex cursor-pointer items-center gap-2 self-start rounded-xl border border-[#31556b] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#b4ff45] hover:text-[#b4ff45] sm:self-auto">{item.teamId ? 'Ver equipo' : 'Ver organización'}<ArrowUpRight size={16} /></Link>
                </article>
              )
            }) : !loading && <p className="rounded-3xl border border-dashed border-[#31556b] p-6 text-sm text-slate-400">Aún no estás afiliado a un equipo u organización.</p>}
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-3xl uppercase">Torneos y eventos</h2>
            {tournaments.length ? tournaments.map((tournament) => (
              <article key={tournament.id} className="overflow-hidden rounded-3xl border border-[#29485d] bg-[#0b1d2c]">
                <div className="flex h-28 items-center justify-center bg-[#1b3b50]">
                  {tournament.cover_url ? <img src={tournament.cover_url} alt="" className="h-full w-full object-cover" /> : <span className="font-display text-3xl text-slate-300">{initials(tournament.name)}</span>}
                </div>
                <div className="space-y-3 p-5">
                  <h3 className="font-display text-2xl uppercase">{tournament.name}</h3>
                  {statusLabels[tournament.status] && <span className="inline-flex rounded-full border border-[#b4ff45]/30 bg-[#b4ff45]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#cfff91]">{statusLabels[tournament.status]}</span>}
                  <Link href={`/torneos/ver/${tournament.id}`} className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-[#b4ff45] hover:text-white">Ver evento<ArrowUpRight size={16} /></Link>
                </div>
              </article>
            )) : !loading && <p className="rounded-3xl border border-dashed border-[#31556b] p-6 text-sm text-slate-400">Tus equipos aún no están inscritos en torneos.</p>}
          </div>
        </section>
      </section>
    </main>
  )
}

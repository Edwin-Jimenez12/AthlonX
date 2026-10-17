'use client'

import { ArrowUpRight, Gavel } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { PersonaViewSwitcher } from '../../../Components/persona-view-switcher'

type GrantRow = {
  id: string
  role: string
  starts_at: string
  ends_at: string
  tournament: { id: string; name: string; cover_url: string | null; status: string } | { id: string; name: string; cover_url: string | null; status: string }[] | null
}

type Grant = { id: string; starts_at: string; ends_at: string; tournamentId: string; tournamentName: string; cover_url: string | null; status: string }

const statusLabels: Record<string, string> = { in_progress: 'En curso', finished: 'Finalizado' }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-PA', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

// Staff solo tiene una opción por ahora: árbitro / juez. Cada permiso está limitado a una liga y vigencia,
// y el dueño de la liga puede revocarlo en cualquier momento (revoked_at en tournament_staff_grants).
export default function StaffDashboard() {
  const [grants, setGrants] = useState<Grant[]>([])
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
      if (!userData.user) {
        setError('Debes iniciar sesión para ver tus permisos.')
        setLoading(false)
        return
      }
      const { data, error: grantsError } = await supabase
        .from('tournament_staff_grants')
        .select('id, role, starts_at, ends_at, tournament:tournaments(id, name, cover_url, status)')
        .eq('staff_user_id', userData.user.id)
        .is('revoked_at', null)
        .gte('ends_at', new Date().toISOString())
        .order('ends_at', { ascending: true })
      if (!active) return
      if (grantsError) {
        setError(grantsError.message)
        setLoading(false)
        return
      }
      const rows = (data ?? []) as unknown as GrantRow[]
      setGrants(rows.flatMap((row) => {
        const tournament = Array.isArray(row.tournament) ? row.tournament[0] : row.tournament
        if (!tournament || row.role !== 'arbitro') return []
        return [{ id: row.id, starts_at: row.starts_at, ends_at: row.ends_at, tournamentId: tournament.id, tournamentName: tournament.name, cover_url: tournament.cover_url, status: tournament.status }]
      }))
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [])

  return (
    <main className="ax-panel-enter min-h-screen bg-transparent text-white lg:ml-64">
      <section className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-[#1f4057] pb-8">
          <PersonaViewSwitcher active="staff" />
          <div>
            <p className="text-sm font-bold uppercase tracking-[.24em] text-[#b4ff45]">Mi vista · Staff</p>
            <h1 className="mt-3 font-display text-5xl uppercase leading-none sm:text-6xl">Árbitro / Juez</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">Ligas donde tienes permiso de gestión. Cada permiso vence en la fecha indicada o cuando el dueño de la liga lo revoca.</p>
          </div>
          <div role="group" aria-label="Rol de staff" className="flex flex-wrap gap-2">
            <span aria-current="true" className="inline-flex items-center gap-2 rounded-full border border-[#b4ff45] bg-[#b4ff45] px-4 py-2 text-sm font-bold text-[#07131e]"><Gavel size={16} />Árbitro / Juez</span>
          </div>
        </header>

        {error && <p role="alert" className="rounded-2xl border border-[#ff7d88]/40 bg-[#ff7d88]/10 p-4 text-sm text-[#ffb0b7]">{error}</p>}

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6">
            <p className="font-display text-5xl leading-none">{loading ? '—' : grants.length}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-[.2em] text-slate-400">Ligas con permiso</p>
          </article>
          <article className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6">
            <p className="font-display text-3xl leading-none">{loading || !grants.length ? '—' : formatDate(grants[0].ends_at)}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-[.2em] text-slate-400">Permiso vigente hasta</p>
          </article>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-3xl uppercase">Permisos de gestión</h2>
          {grants.length ? grants.map((grant) => (
            <article key={grant.id} className="flex flex-col gap-5 overflow-hidden rounded-3xl border border-[#29485d] bg-[#0b1d2c] sm:flex-row">
              <div className="flex h-40 shrink-0 items-center justify-center bg-[#1b3b50] sm:w-64">
                {grant.cover_url ? <img src={grant.cover_url} alt="" className="h-full w-full object-cover" /> : <Gavel size={36} className="text-slate-300" />}
              </div>
              <div className="flex flex-1 flex-col justify-between gap-5 p-6">
                <div>
                  <h3 className="font-display text-3xl uppercase">{grant.tournamentName}</h3>
                  {statusLabels[grant.status] && <span className="mt-3 inline-flex rounded-full border border-[#b4ff45]/30 bg-[#b4ff45]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#cfff91]">{statusLabels[grant.status]}</span>}
                  <p className="mt-4 text-sm text-slate-300">Vigencia: {formatDate(grant.starts_at)} al {formatDate(grant.ends_at)}</p>
                  <p className="mt-1 text-xs text-slate-500">Puede revocarse en cualquier momento por el dueño de la liga.</p>
                </div>
                <Link href={`/torneos/ver/${grant.tournamentId}`} className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] transition hover:brightness-110">Gestionar liga<ArrowUpRight size={18} /></Link>
              </div>
            </article>
          )) : !loading && <p className="rounded-3xl border border-dashed border-[#31556b] p-6 text-sm text-slate-400">No tienes permisos de gestión vigentes.</p>}
        </section>
      </section>
    </main>
  )
}

'use client'

import { ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../../lib/supabase'
import { loadManagedTeams, ManagedTeam } from '../../../../../lib/team-access'
import { TeamCallupsPanel } from '../../../../../Components/team-callups-panel'
import { TeamRosterPanel } from '../../../../../Components/team-roster-panel'

type Tab = 'plantilla' | 'convocatorias'

// Roles que pueden administrar la plantilla y las convocatorias del equipo.
const managerRoles = ['entrenador', 'owner', 'directivo']

export default function TrainerTeamPage() {
  const params = useParams<{ id: string }>()
  const [team, setTeam] = useState<ManagedTeam | null>(null)
  const [tab, setTab] = useState<Tab>('plantilla')
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab')
    if (requested === 'convocatorias') setTab('convocatorias')
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) { setLoading(false); return }
      const { data } = await supabase.auth.getUser()
      if (!data.user) { setDenied(true); setLoading(false); return }
      const teams = await loadManagedTeams(data.user.id)
      const match = teams.find((item) => item.id === params.id && managerRoles.includes(item.role))
      if (!active) return
      setTeam(match ?? null)
      setDenied(!match)
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [params.id])

  return (
    <main className="ax-panel-enter min-h-screen bg-transparent text-white lg:ml-64">
      <section className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
        <Link href="/entrenador" className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-300 transition hover:text-[#b4ff45]"><ArrowLeft size={16} />Mis equipos</Link>

        {loading && <p className="text-sm text-slate-400">Cargando equipo…</p>}
        {!loading && denied && <p role="alert" className="rounded-2xl border border-[#ff7d88]/40 bg-[#ff7d88]/10 p-4 text-sm text-[#ffb0b7]">No tienes permisos para administrar este equipo.</p>}

        {team && (
          <>
            <header className="flex flex-col gap-6 border-b border-[#1f4057] pb-8 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[.24em] text-[#b4ff45]">Administrar equipo</p>
                <h1 className="mt-3 font-display text-5xl uppercase leading-none sm:text-6xl">{team.name}</h1>
                <p className="mt-4 text-base text-slate-400">{team.discipline}{team.city ? ` · ${team.city}` : ''}</p>
              </div>
              <div role="tablist" aria-label="Secciones del equipo" className="flex gap-2">
                {([['plantilla', 'Plantilla', Users], ['convocatorias', 'Convocatorias', Users]] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => setTab(value)}
                    className={`cursor-pointer rounded-full border px-5 py-2 text-sm font-bold transition duration-200 ${tab === value ? 'border-[#b4ff45] bg-[#b4ff45] text-[#07131e]' : 'border-[#31556b] text-slate-300 hover:border-[#b4ff45] hover:text-[#b4ff45]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </header>

            <div key={tab} className="ax-panel-enter">
              {tab === 'plantilla' ? <TeamRosterPanel teamId={team.id} /> : <TeamCallupsPanel teamId={team.id} teamName={team.name} />}
            </div>
          </>
        )}
      </section>
    </main>
  )
}

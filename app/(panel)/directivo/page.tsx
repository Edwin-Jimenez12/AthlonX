'use client'

import { ArrowUpRight, Building2, Shield } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AccountContext, loadAccountContexts } from '../../../lib/account-contexts'
import { supabase } from '../../../lib/supabase'
import { PersonaViewSwitcher } from '../../../Components/persona-view-switcher'

// Cada cuenta vinculada como directivo abre su propio panel: organización o equipo.
export default function DirectorDashboard() {
  const [linked, setLinked] = useState<AccountContext[]>([])
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
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        setError('Debes iniciar sesión para ver tus cuentas.')
        setLoading(false)
        return
      }
      const contexts = await loadAccountContexts(data.user.id)
      if (!active) return
      setLinked(contexts.filter((context) => context.contextType !== 'personal' && context.role === 'directivo' && (context.teamId || context.organizationId)))
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [])

  return (
    <main className="ax-panel-enter min-h-screen bg-transparent text-white lg:ml-64">
      <section className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-[#1f4057] pb-8">
          <PersonaViewSwitcher active="directivo" />
          <div>
            <p className="text-sm font-bold uppercase tracking-[.24em] text-[#b4ff45]">Mi vista · Directivo</p>
            <h1 className="mt-3 font-display text-5xl uppercase leading-none sm:text-6xl">Cuentas que diriges</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">Elige una cuenta para abrir su panel completo: organización o equipo, según la vinculación.</p>
          </div>
        </header>

        {error && <p role="alert" className="rounded-2xl border border-[#ff7d88]/40 bg-[#ff7d88]/10 p-4 text-sm text-[#ffb0b7]">{error}</p>}

        <section className="grid gap-4 md:grid-cols-2">
          {linked.map((context) => {
            const isOrganization = Boolean(context.organizationId)
            const href = isOrganization ? `/organizaciones/${context.organizationId}` : `/equipos/${context.teamId}`
            const Icon = isOrganization ? Building2 : Shield
            return (
              <article key={context.id} className="flex flex-col justify-between gap-6 rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#b4ff45] text-[#07131e]"><Icon size={24} /></div>
                  <div>
                    <h2 className="font-display text-3xl uppercase">{context.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">{isOrganization ? 'Organización' : 'Equipo'}{context.discipline ? ` · ${context.discipline}` : ''}{context.roleLabel ? ` · ${context.roleLabel}` : ''}</p>
                  </div>
                </div>
                <Link href={href} className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] transition hover:brightness-110">
                  {isOrganization ? 'Abrir panel de organización' : 'Abrir panel de equipo'}<ArrowUpRight size={18} />
                </Link>
              </article>
            )
          })}
        </section>

        {!loading && !linked.length && !error && <p className="rounded-3xl border border-dashed border-[#31556b] p-6 text-sm text-slate-400">Aún no diriges ninguna organización ni equipo.</p>}
      </section>
    </main>
  )
}

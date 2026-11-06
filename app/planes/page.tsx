'use client'

import { useEffect, useState } from 'react'
import SiteFooter from '../../Components/site-footer'
import { formatUsd } from '../../lib/admin'
import { supabase } from '../../lib/supabase'

type AccountKind = 'persona' | 'equipo' | 'organizacion'

type PublicPlan = {
  code: string
  name: string
  tagline: string | null
  includes_plan: string | null
  kind: 'individual' | 'grupo'
  account_type: AccountKind
  price_pending: boolean
  monthly_price: number
  annual_enabled: boolean
  annual_price: number | null
  seats: number
  features: string[]
}

const tabs: Array<{ id: AccountKind; label: string; hash: string }> = [
  { id: 'persona', label: 'Para ti', hash: 'personas' },
  { id: 'equipo', label: 'Para tu equipo', hash: 'equipos' },
  { id: 'organizacion', label: 'Para tu organización', hash: 'organizaciones' },
]

// Catálogo público: lo administra el panel. Solo se muestran los planes activos, por tipo de cuenta.
export default function PlanesPage() {
  const [plans, setPlans] = useState<PublicPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<AccountKind>('persona')

  useEffect(() => {
    const fromHash = tabs.find((item) => `#${item.hash}` === window.location.hash)
    if (fromHash) setTab(fromHash.id)
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) return setLoading(false)
      const { data } = await supabase
        .from('plans')
        .select('code, name, tagline, includes_plan, kind, account_type, price_pending, monthly_price, annual_enabled, annual_price, seats, features')
        .eq('is_active', true)
        .order('sort_order')
      if (!active) return
      setPlans((data ?? []) as PublicPlan[])
      setLoading(false)
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  function choose(next: AccountKind) {
    setTab(next)
    const hash = tabs.find((item) => item.id === next)?.hash
    if (hash) window.history.replaceState(null, '', `#${hash}`)
  }

  const visible = plans.filter((plan) => plan.kind === 'individual' && plan.account_type === tab)
  const groups = tab === 'persona' ? plans.filter((plan) => plan.kind === 'grupo') : []
  const nameOf = (code: string | null) => plans.find((plan) => plan.code === code)?.name ?? null

  return (
    <main className="text-white">
      <section className="px-6 pb-10 pt-16 md:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <p className="font-heading mb-6 text-xs font-semibold uppercase tracking-[.30em] text-slate-300">Planes</p>
          <h1 className="font-display text-6xl font-black uppercase leading-[.9] tracking-wide md:text-8xl">Elige tu plan</h1>

          <div role="tablist" aria-label="Tipo de cuenta" className="mt-10 inline-flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => choose(item.id)}
                className={`cursor-pointer rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${tab === item.id ? 'bg-[#B4FF45] text-[#07131e]' : 'text-slate-200 hover:bg-white/[0.06]'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
            ¿No sabes cuál? Si juegas o entrenas, <strong className="text-white">Para ti</strong>. Si administras un equipo, <strong className="text-white">Para tu equipo</strong>. Si organizas torneos o ligas, <strong className="text-white">Para tu organización</strong>.
          </p>
        </div>
      </section>

      <section className="px-6 pb-16 md:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl space-y-14">
          {loading && <p className="text-slate-300">Cargando planes…</p>}
          {!loading && visible.length === 0 && <p className="text-slate-300">Todavía no hay planes publicados para este tipo de cuenta.</p>}

          <div className={`grid gap-6 md:grid-cols-2 ${visible.length >= 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
            {visible.map((plan) => <PlanCard key={plan.code} plan={plan} baseName={nameOf(plan.includes_plan)} />)}
          </div>

          {tab === 'persona' && (
            <p className="text-sm text-slate-300">Staff y directivo son gratis. Sus herramientas vienen del plan de su equipo u organización.</p>
          )}

          {groups.length > 0 && (
            <div>
              <h2 className="font-display mb-6 text-3xl uppercase tracking-wide text-[#B4FF45]">AX Club · planes de grupo</h2>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {groups.map((plan) => <PlanCard key={plan.code} plan={plan} baseName={nameOf(plan.includes_plan)} />)}
              </div>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}

function PlanCard({ plan, baseName }: { plan: PublicPlan; baseName: string | null }) {
  const free = !plan.price_pending && plan.monthly_price === 0
  return (
    <article className="flex flex-col rounded-[20px] border border-white/10 bg-white/[0.03] p-7">
      <h3 className="font-display text-4xl uppercase text-white">{plan.name}</h3>
      {plan.tagline && <p className="mt-1 text-sm text-slate-300">{plan.tagline}</p>}
      <p className="mt-5 text-3xl font-semibold text-white">
        {plan.price_pending ? 'Precio por definir' : free ? 'Gratis' : formatUsd(plan.monthly_price)}
        {!plan.price_pending && !free && <span className="text-base font-normal text-slate-300"> / mes</span>}
      </p>
      {plan.annual_enabled && plan.annual_price !== null && (
        <p className="mt-1 text-sm text-slate-300">o {formatUsd(plan.annual_price)} al año</p>
      )}
      {plan.kind === 'grupo' && <p className="mt-1 text-sm text-slate-300">Hasta {plan.seats} cuentas · solo mensual</p>}
      <div className="my-6 h-px bg-white/10" />
      {baseName && <p className="mb-3 text-sm font-semibold text-white">Todo lo de {baseName}, más:</p>}
      <ul className="space-y-2.5 text-sm leading-6 text-slate-200">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span aria-hidden="true" className="text-[#B4FF45]">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

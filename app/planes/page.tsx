'use client'

import { useEffect, useState } from 'react'
import SiteFooter from '../../Components/site-footer'
import { formatUsd } from '../../lib/admin'
import { supabase } from '../../lib/supabase'

type PublicPlan = {
  code: string
  name: string
  kind: 'individual' | 'grupo'
  monthly_price: number
  annual_enabled: boolean
  annual_price: number | null
  seats: number
  features: string[]
}

// Catálogo público: lo administra el panel. Solo se muestran los planes activos.
export default function PlanesPage() {
  const [plans, setPlans] = useState<PublicPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) return setLoading(false)
      const { data } = await supabase
        .from('plans')
        .select('code, name, kind, monthly_price, annual_enabled, annual_price, seats, features')
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

  const individuals = plans.filter((plan) => plan.kind === 'individual')
  const groups = plans.filter((plan) => plan.kind === 'grupo')

  return (
    <main className="text-white">
      <section className="px-6 pb-12 pt-16 md:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <p className="font-heading mb-6 text-xs font-semibold uppercase tracking-[.30em] text-slate-300">Planes</p>
          <h1 className="font-display text-6xl font-black uppercase leading-[.9] tracking-wide md:text-8xl">
            Elige tu plan
          </h1>
        </div>
      </section>

      <section className="px-6 pb-16 md:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl space-y-14">
          {loading && <p className="text-slate-300">Cargando planes…</p>}
          <PlanGroup title="Planes individuales" plans={individuals} />
          {groups.length > 0 && <PlanGroup title="AX Club · planes de grupo" plans={groups} />}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}

function PlanGroup({ title, plans }: { title: string; plans: PublicPlan[] }) {
  if (plans.length === 0) return null
  return (
    <div>
      <h2 className="font-display mb-6 text-3xl uppercase tracking-wide text-[#B4FF45]">{title}</h2>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <article key={plan.code} className="flex flex-col rounded-[20px] border border-white/10 bg-white/[0.03] p-7">
            <h3 className="font-display text-4xl uppercase text-white">{plan.name}</h3>
            <p className="mt-4 text-3xl font-semibold text-white">
              {plan.monthly_price === 0 ? 'Gratis' : formatUsd(plan.monthly_price)}
              {plan.monthly_price > 0 && <span className="text-base font-normal text-slate-300"> / mes</span>}
            </p>
            {plan.annual_enabled && plan.annual_price !== null && (
              <p className="mt-1 text-sm text-slate-300">o {formatUsd(plan.annual_price)} al año</p>
            )}
            {plan.kind === 'grupo' && <p className="mt-1 text-sm text-slate-300">Hasta {plan.seats} cuentas · solo mensual</p>}
            <ul className="mt-6 space-y-2.5 text-sm leading-6 text-slate-200">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden="true" className="text-[#B4FF45]">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}

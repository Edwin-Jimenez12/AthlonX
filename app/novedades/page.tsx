'use client'

import { useEffect, useState } from 'react'
import SiteFooter from '../../Components/site-footer'
import { supabase } from '../../lib/supabase'

type Section = { title: string; body: string }
type Release = { version: string; title: string; published_at: string | null; sections: Section[] }

// Versiones publicadas desde el panel administrativo. Solo se muestran las que tienen estado publicada.
export default function NovedadesPage() {
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) return setLoading(false)
      const { data } = await supabase.rpc('platform_public_releases')
      if (!active) return
      setReleases((data ?? []) as Release[])
      setLoading(false)
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  return (
    <main className="text-white">
      <section className="px-6 pb-12 pt-16 md:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <p className="font-heading mb-6 text-xs font-semibold uppercase tracking-[.30em] text-slate-300">Novedades</p>
          <h1 className="font-display text-6xl font-black uppercase leading-[.9] tracking-wide md:text-8xl">
            Lo que hay de nuevo
            <span className="block text-[#B4FF45]">en AthlonX</span>
          </h1>
        </div>
      </section>

      <section className="px-6 pb-16 md:px-14 lg:px-24">
        <div className="mx-auto max-w-4xl space-y-14">
          {loading && <p className="text-slate-300">Cargando novedades…</p>}
          {!loading && releases.length === 0 && <p className="text-slate-300">Todavía no hay versiones publicadas.</p>}
          {releases.map((release) => (
            <article key={release.version} className="border-t border-white/10 pt-10">
              <p className="font-display text-5xl uppercase text-[#B4FF45]">{release.version}</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{release.title}</h2>
              {release.published_at && (
                <time className="mt-2 block text-sm text-slate-400" dateTime={release.published_at}>
                  {new Date(release.published_at).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' })}
                </time>
              )}
              <div className="mt-8 space-y-8">
                {release.sections.map((section) => (
                  <div key={section.title}>
                    <h3 className="font-display text-2xl uppercase tracking-wide text-white">{section.title}</h3>
                    <p className="mt-3 whitespace-pre-line text-base leading-7 text-slate-300">{section.body}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}

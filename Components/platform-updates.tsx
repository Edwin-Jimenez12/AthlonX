'use client'

import { ArrowRight, CalendarDays, CheckCircle2, Megaphone, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type PlatformUpdate = {
  id: string
  title: string
  summary: string
  content: string | null
  category: string
  version: string | null
  published_at: string | null
}

const fallbackUpdates: PlatformUpdate[] = [
  { id: 'fallback-1', title: 'Nuevo centro de eventos', summary: 'Las organizaciones y equipos ya pueden preparar sus próximos torneos desde un mismo espacio.', content: null, category: 'Nueva función', version: '0.8', published_at: '2026-09-17' },
  { id: 'fallback-2', title: 'Perfiles conectados', summary: 'Las invitaciones permiten vincular atletas, entrenadores, staff y directivos con sus equipos.', content: null, category: 'Mejora', version: '0.7', published_at: '2026-09-13' },
  { id: 'fallback-3', title: 'Búsqueda multidisciplinaria', summary: 'Encuentra organizaciones, equipos, torneos y atletas de Rugby y Baloncesto.', content: null, category: 'Actualización', version: '0.6', published_at: '2026-09-10' },
]

function formatDate(value: string | null) {
  if (!value) return 'Próximamente'
  return new Intl.DateTimeFormat('es-PA', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

export function PlatformUpdates() {
  const [updates, setUpdates] = useState<PlatformUpdate[]>(fallbackUpdates)

  useEffect(() => {
    async function loadUpdates() {
      if (!supabase) return
      const { data } = await supabase.from('platform_updates').select('id, title, summary, content, category, version, published_at').eq('is_published', true).order('published_at', { ascending: false }).limit(6)
      if (data?.length) setUpdates(data)
    }
    void loadUpdates()
  }, [])

  const [featured, ...rest] = updates

  return <section id="actualizaciones" className="relative overflow-hidden px-6 py-24 md:px-14 lg:px-24"><div className="pointer-events-none absolute -right-32 top-16 h-80 w-80 rounded-full bg-[#B4FF45]/10 blur-3xl" /><div className="relative mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-6 border-b border-white/15 pb-8 md:flex-row md:items-end"><div><p className="font-heading text-xs font-semibold uppercase tracking-[.42em] text-[#B4FF45]">Novedades de la plataforma</p><h2 className="font-display mt-5 text-6xl uppercase leading-none md:text-8xl">Actualizaciones</h2><p className="mt-4 max-w-2xl text-lg text-slate-300">Conoce lo que estamos construyendo para que la gestión deportiva sea más clara, conectada y eficiente.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#B4FF45]/30 bg-[#B4FF45]/10 px-4 py-2 text-sm font-semibold text-[#d9ffaf]"><Sparkles size={16} />Producto en evolución</span></div><div className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><article className="relative overflow-hidden rounded-[2rem] border border-[#B4FF45]/35 bg-[#0b1d2c]/90 p-6 shadow-2xl backdrop-blur-xl md:p-9"><div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#B4FF45]/10 blur-3xl" /><div className="relative"><div className="flex items-center justify-between gap-4"><span className="inline-flex items-center gap-2 rounded-full bg-[#B4FF45] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#07131e]"><CheckCircle2 size={14} />Última novedad</span><span className="font-mono text-xs text-slate-500">v{featured.version || '—'}</span></div><h3 className="font-display mt-12 max-w-2xl text-5xl uppercase leading-none md:text-7xl">{featured.title}</h3><p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">{featured.summary}</p><div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-slate-400"><span className="inline-flex items-center gap-2"><CalendarDays size={16} className="text-[#B4FF45]" />{formatDate(featured.published_at)}</span><span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-[#B4FF45]">{featured.category}</span></div></div></article><div className="grid gap-5">{rest.slice(0, 2).map((update) => <article key={update.id} className="rounded-[2rem] border border-white/15 bg-[#07131b]/85 p-6 shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:border-[#B4FF45]/50"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-[.2em] text-[#B4FF45]">{update.category}</span><span className="font-mono text-xs text-slate-500">v{update.version || '—'}</span></div><h3 className="font-heading mt-6 text-2xl font-semibold">{update.title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{update.summary}</p><div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-500"><span>{formatDate(update.published_at)}</span><Megaphone size={16} className="text-[#B4FF45]" /></div></article>)}</div></div><a href="#contacto" className="mt-8 inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-[#B4FF45] transition hover:text-white">¿Tienes una sugerencia? Cuéntanos <ArrowRight size={16} /></a></div></section>
}

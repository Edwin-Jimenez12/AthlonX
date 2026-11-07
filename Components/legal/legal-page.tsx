import Link from 'next/link'
import type { ReactNode } from 'react'
import SiteFooter from '../site-footer'

export type LegalSection = { id: string; title: string; content: ReactNode }

// Datos del responsable. Mientras no exista una empresa, el responsable es una persona natural.
// Cuando se constituya la sociedad: cambiar el nombre, poner kind 'empresa' y agregar el RUC (si está vacío no se muestra).
export const LEGAL_ENTITY = {
  name: '[Nombre del responsable]',
  kind: 'persona natural',
  ruc: '',
  address: 'la ciudad de Panamá, República de Panamá',
  email: 'athlonxteam@gmail.com',
  site: 'athlonx.world',
}

// "operada por X, persona natural, con domicilio en …" (el RUC solo aparece si existe).
export function operatorText() {
  return `${LEGAL_ENTITY.kind === 'empresa' ? '' : `, ${LEGAL_ENTITY.kind}`}${LEGAL_ENTITY.ruc ? `, RUC ${LEGAL_ENTITY.ruc}` : ''}, con domicilio en ${LEGAL_ENTITY.address}`
}

// Página legal (Términos, Privacidad): índice lateral en escritorio, secciones numeradas y resumen al inicio.
export function LegalPage({ eyebrow, title, intro, updated, summary, sections, related }: {
  eyebrow: string
  title: string
  intro: ReactNode
  updated: string
  summary: string[]
  sections: LegalSection[]
  related: { href: string; label: string }
}) {
  return (
    <main className="text-white">
      <section className="px-6 pb-10 pt-16 md:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <p className="font-heading mb-6 text-xs font-semibold uppercase tracking-[.30em] text-slate-300">{eyebrow}</p>
          <h1 className="font-display text-5xl font-black uppercase leading-[.9] tracking-wide md:text-7xl">{title}</h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300">{intro}</p>
          <p className="mt-4 text-sm text-slate-400">Última actualización: {updated}</p>
        </div>
      </section>

      <section className="px-6 pb-20 md:px-14 lg:px-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <nav aria-label="Contenido" className="rounded-[20px] border border-white/10 bg-white/[0.03] p-5 lg:max-h-[calc(100dvh-9rem)] lg:overflow-y-auto lg:overscroll-contain">
              <p className="font-heading text-xs font-semibold uppercase tracking-[.22em] text-[#B4FF45]">En esta página</p>
              <ol className="mt-4 space-y-1 text-sm">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="flex gap-2 rounded-lg px-2 py-1.5 text-slate-300 transition hover:bg-white/[0.05] hover:text-white">
                      <span className="w-6 shrink-0 tabular-nums text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                      <span>{section.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <div className="min-w-0 space-y-12">
            <div className="rounded-[20px] border border-[#B4FF45]/25 bg-[#B4FF45]/[0.06] p-6 md:p-7">
              <p className="font-heading text-xs font-semibold uppercase tracking-[.22em] text-[#B4FF45]">En resumen</p>
              <ul className="mt-4 space-y-2.5 text-[15px] leading-6 text-slate-100">
                {summary.map((item) => (
                  <li key={item} className="flex gap-3"><span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#B4FF45]" /><span>{item}</span></li>
                ))}
              </ul>
            </div>

            {sections.map((section, index) => (
              <article key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="flex items-baseline gap-3 font-display text-3xl uppercase leading-tight tracking-wide text-white md:text-4xl">
                  <span className="text-xl text-[#B4FF45] md:text-2xl">{String(index + 1).padStart(2, '0')}</span>
                  {section.title}
                </h2>
                <div className="legal-body mt-4 max-w-[72ch] space-y-4 text-[15px] leading-7 text-slate-300">{section.content}</div>
              </article>
            ))}

            <div className="flex flex-col gap-4 rounded-[20px] border border-white/10 bg-white/[0.03] p-6 sm:flex-row sm:items-center sm:justify-between md:p-7">
              <div>
                <p className="font-display text-2xl uppercase tracking-wide text-white">¿Tienes preguntas?</p>
                <p className="mt-1 text-sm text-slate-300">Escríbenos a <a className="font-semibold text-[#B4FF45] underline-offset-4 hover:underline" href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.</p>
              </div>
              <Link href={related.href} className="inline-flex h-11 shrink-0 items-center justify-center rounded-[10px] border border-white/20 px-5 text-sm font-semibold text-white transition hover:border-[#B4FF45] hover:text-[#B4FF45]">{related.label}</Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}

// Piezas de texto para las secciones legales.
export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3"><span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#B4FF45]" /><span>{item}</span></li>
      ))}
    </ul>
  )
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-white">{children}</strong>
}

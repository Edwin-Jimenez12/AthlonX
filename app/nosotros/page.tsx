import SiteFooter from '../../Components/site-footer'
import { BasketballIcon, RugbyBallIcon, SoccerBallIcon } from '../../Components/sport-icons'
import { Volleyball } from 'lucide-react'
import Link from 'next/link'

const problems = [
  'Confusión en horarios',
  'Fixtures duplicados',
  'Errores en los equipos',
  'Cambios difíciles de comunicar',
  'Resultados desactualizados',
  'Problemas con las canchas',
  'Tablas de posiciones incorrectas',
]

const pillars = [
  { title: 'Planificación', text: 'Configura el torneo, sus divisiones, equipos, jugadores y fixtures.' },
  { title: 'Operación', text: 'Asigna canchas y horarios, y registra eventos y resultados del partido.' },
  { title: 'Seguimiento', text: 'Actualiza tablas, estadísticas y llaves, y genera reportes en PDF.' },
]

const formats = [
  {
    title: 'Torneo oficial',
    text: 'Para ligas y competencias institucionales.',
    items: ['Equipos y jugadores registrados', 'Plantillas oficiales y perfiles deportivos', 'Historial de participación'],
  },
  {
    title: 'Torneo rápido',
    text: 'Para armar una competencia sin registro previo.',
    items: ['Equipos y jugadores cargados manualmente', 'No requiere que todos estén registrados', 'Ideal para torneos informales o de un día'],
  },
]

// Cada disciplina lleva su icono. El icono usa la altura del texto y el ancho automático.
const disciplines = [
  { name: 'Rugby', detail: 'Rugby Sevens', status: 'Disponible', Icon: RugbyBallIcon },
  { name: 'Fútbol', detail: 'Fútbol 8 vs 8', status: 'Disponible', Icon: SoccerBallIcon },
  { name: 'Baloncesto', detail: '3x3', status: 'En desarrollo', Icon: BasketballIcon },
  { name: 'Voleibol', detail: 'Próximamente', status: 'Futura disciplina', Icon: Volleyball },
]

const roadmap = [
  { title: 'Hoy', items: ['Torneos oficiales y rápidos', 'Fixtures, partidos y tablas', 'Reportes en PDF'] },
  { title: 'Próximamente', items: ['Rankings nacionales y por categorías', 'Estadísticas de atleta y equipo', 'Calendarios y comunicaciones deportivas'] },
  { title: 'Siguiente etapa', items: ['Aplicación móvil', 'Consulta de calendarios y resultados desde cualquier lugar', 'Seguimiento de competencias en tiempo real'] },
]

// Encabezado de sección reutilizable: etiqueta en verde y título grande.
function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="font-heading text-sm font-semibold uppercase tracking-[.3em] text-[#B4FF45]">{eyebrow}</p>
      <h2 className="font-display mt-4 text-5xl uppercase leading-none md:text-7xl">{title}</h2>
    </div>
  )
}

export default function NosotrosPage() {
  return (
    <main className="text-white">

      <section className="px-6 pb-20 pt-16 md:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <p className="font-heading mb-6 text-xs font-semibold uppercase tracking-[.30em] text-slate-300">Nosotros</p>
          <h1 className="font-display text-6xl font-black uppercase leading-[.9] tracking-wide md:text-8xl">
            Una plataforma de gestión
            <span className="block text-[#B4FF45]">deportiva</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
            AthlonX es una plataforma tecnológica creada para organizar y administrar torneos de diferentes
            disciplinas y modalidades. Conecta la planificación, la operación y el seguimiento de una competencia
            en un mismo sistema.
          </p>
        </div>
      </section>

      <section className="border-y border-white/10 px-6 py-20 md:px-14 lg:px-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.2fr]">
          <SectionHead eyebrow="El problema" title="Organizar una liga implica coordinar muchas partes" />
          <ul className="grid content-start gap-3 sm:grid-cols-2">
            {problems.map((item) => (
              <li key={item} className="rounded-[5px] border border-white/15 bg-[#102536]/85 px-5 py-4 font-semibold text-slate-100 backdrop-blur-sm">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-6 py-20 md:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <SectionHead eyebrow="La solución" title="Cuando todo está conectado, el torneo es más fácil de administrar" />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {pillars.map((pillar) => (
              <article key={pillar.title} className="rounded-[10px] border border-white/15 bg-[#0b1d2c]/85 p-7 backdrop-blur-sm">
                <h3 className="font-display text-4xl uppercase text-[#B4FF45]">{pillar.title}</h3>
                <p className="mt-3 leading-7 text-slate-300">{pillar.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 px-6 py-20 md:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <SectionHead eyebrow="Tipos de torneo" title="Una plataforma, dos formas de competir" />
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {formats.map((format) => (
              <article key={format.title} className="rounded-[10px] border border-white/15 bg-[#061019]/85 p-8 backdrop-blur-sm">
                <h3 className="font-display text-5xl uppercase">{format.title}</h3>
                <p className="mt-3 text-slate-300">{format.text}</p>
                <ul className="mt-6 space-y-3">
                  {format.items.map((item) => (
                    <li key={item} className="flex gap-3 text-slate-200">
                      <span className="text-[#B4FF45]">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <SectionHead eyebrow="Disciplinas y modalidades" title="Cada deporte tiene su propia lógica" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {disciplines.map(({ name, detail, status, Icon }) => (
              <article key={name} className="rounded-[10px] border border-white/15 bg-[#0b1d2c]/85 p-6 backdrop-blur-sm">
                <p className={`font-heading text-sm font-bold uppercase tracking-[.2em] ${status === 'Disponible' ? 'text-[#B4FF45]' : 'text-slate-400'}`}>
                  {status}
                </p>
                <h3 className="font-display mt-4 flex items-center gap-3 text-5xl uppercase leading-none">
                  <Icon className="h-[0.72em] w-auto shrink-0" />
                  <span>{name}</span>
                </h3>
                <p className="mt-2 text-slate-300">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <SectionHead eyebrow="Hacia dónde vamos" title="Del gestor de torneos a un ecosistema deportivo" />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {roadmap.map((stage) => (
              <article key={stage.title} className="rounded-[10px] border border-white/15 bg-[#0b1d2c]/85 p-7 backdrop-blur-sm">
                <h3 className="font-display text-4xl uppercase text-[#B4FF45]">{stage.title}</h3>
                <ul className="mt-5 space-y-3 text-slate-300">
                  {stage.items.map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 md:px-14 lg:px-24">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-[10px] border border-[#B4FF45]/30 bg-[#061019]/80 p-10 backdrop-blur-sm md:flex-row md:items-center">
          <h2 className="font-display text-5xl uppercase leading-none md:text-6xl">¿Quieres organizar tu próximo torneo?</h2>
          <Link href="/contactanos" className="font-heading inline-flex items-center rounded-[5px] bg-[#B4FF45] px-8 py-4 text-lg font-bold uppercase tracking-wide text-[#07131e] transition hover:bg-[#c8ff7a]">
            Contáctanos
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}

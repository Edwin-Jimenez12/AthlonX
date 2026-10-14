import SiteFooter from '../../Components/site-footer'
import { PlatformUpdates } from '../../Components/platform-updates'

export default function NovedadesPage() {
  return (
    <main className="text-white">

      <section className="px-6 pb-16 pt-16 md:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <p className="font-heading mb-6 text-xs font-semibold uppercase tracking-[.30em] text-slate-300">Novedades</p>
          <h1 className="font-display text-6xl font-black uppercase leading-[.9] tracking-wide md:text-8xl">
            Lo que hay de nuevo
            <span className="block text-[#B4FF45]">en AthlonX</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
            Aquí publicamos las funciones nuevas, mejoras, correcciones y avisos de la plataforma.
          </p>
        </div>
      </section>

      <PlatformUpdates />

      <SiteFooter />
    </main>
  )
}

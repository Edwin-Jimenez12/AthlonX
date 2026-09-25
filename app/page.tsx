'use client'

import { ArrowRight, BarChart3, CalendarDays, ClipboardList, MapPin, ShieldCheck, Users, UsersRound, X, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import Menu from '../Components/menu'
import AuthPanel from '../Components/auth-panel'
import { PlatformUpdates } from '../Components/platform-updates'

const highlights = [
  { icon: CalendarDays, title: 'Torneos', text: 'Organiza cada liga y torneo' },
  { icon: UsersRound, title: 'Equipos', text: 'Gestiona tus plantillas y sus jugadores' },
  { icon: BarChart3, title: 'Partidos', text: 'Información en tiempo real de cada partido' },
]

const benefits = [
  { icon: Zap, title: 'Organización eficiente', text: 'Todo en un solo lugar' },
  { icon: ShieldCheck, title: 'Más control', text: 'Información en tiempo real' },
  { icon: UsersRound, title: 'Mejores torneos', text: 'Equipos más conectados' },
  { icon: BarChart3, title: 'Crecimiento deportivo', text: 'Impulsa el talento' },
]

export default function Home() {
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null)

  useEffect(() => {
    const handleAuth = (event: Event) => {
      setAuthMode((event as CustomEvent<'login' | 'register'>).detail)
    }
    window.addEventListener('athlonx-auth', handleAuth)
    return () => window.removeEventListener('athlonx-auth', handleAuth)
  }, [])

  useEffect(() => {
    if (!authMode) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [authMode])

  return (
    <main className="min-h-screen overflow-hidden bg-[#061019] bg-cover bg-center bg-fixed bg-no-repeat text-white" style={{ backgroundImage: "linear-gradient(90deg, rgba(3,10,16,.97) 0%, rgba(3,10,16,.82) 38%, rgba(3,10,16,.2) 78%, rgba(3,10,16,.45) 100%), url('/MarcaAthlonX/fondo.png')", backgroundAttachment: 'fixed', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <Menu />
      <section className="relative isolate flex min-h-[calc(100vh-92px)] items-center bg-cover bg-center px-6 py-16 md:px-14 lg:px-24" >
        <div className="mx-auto flex w-full max-w-7xl flex-col">
          <div className="max-w-3xl">
            <p className="font-heading mb-6  text-xs font-semibold uppercase tracking-[.30em] text-slate-300">Plataforma de Gestión y Rendimiento Deportivo</p>
            <h1 className="font-display text-6xl font-black uppercase leading-[.9] tracking-wide md:text-8xl">Tus torneos, tus equipos, <span className=" text-[#B4FF45] md:hidden">tu</span>  <span className="block text-[#B4FF45] hidden md:block">tu organización</span><span className="block text-[#B4FF45] block md:hidden"> organización</span></h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-slate-300 md:text-lg">Todo, en un solo lugar. Gestiona atletas, entrenamientos, asistencia, estadísticas y competiciones con una plataforma diseñada para llevar el rendimiento deportivo a otro nivel.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={() => setAuthMode('login')} className="group inline-flex items-center justify-center gap-5 rounded-full bg-[#B4FF45] px-8 py-4 font-bold text-[#10151b] shadow-[0_0_30px_rgba(180,255,69,.3)] transition hover:scale-[1.03] hover:bg-[#c8ff7a]">Iniciar sesión <ArrowRight className="transition group-hover:translate-x-1" size={19} /></button><button onClick={() => setAuthMode('register')} className="inline-flex items-center justify-center gap-5 rounded-full border border-white/75 bg-black/15 px-8 py-4 font-bold text-white backdrop-blur-sm transition hover:bg-white/10">Registrarse <ArrowRight size={19} /></button></div>
          </div>
          <div className="mt-14 grid max-w-3xl grid-cols-1 border-y border-white/15 py-5 sm:grid-cols-3 sm:divide-x sm:divide-white/15">{highlights.map(({ icon: Icon, title, text }) => <div key={title} className="flex items-center gap-4 px-2 py-3 sm:px-6"><Icon className="shrink-0 text-[#B4FF45]" size={29} /><div><p className="font-metric text-xl font-bold">{title}</p><p className="text-sm text-slate-400">{text}</p></div></div>)}</div>
        </div>
      </section>
      <section id="nosotros" className="relative overflow-hidden bg-cover bg-center px-6 py-24 md:px-14 lg:px-24" >
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <h2 className="font-display mt-5 text-5xl uppercase leading-none md:text-7xl">TODO TU EQUIPO,<span className="text-[#B4FF45] md:block">EN UN SOLO LUGAR</span></h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">AthlonX centraliza la gestión deportiva para que jugadores, entrenadores y directivos puedan organizar, consultar y analizar la información que necesitan en cada etapa de la temporada.</p>
            <div className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">{['Gestión deportiva centralizada', 'Rendimiento basado en datos', 'Más control dentro y fuera de la cancha'].map((item, index) => <div key={item} className="flex items-center gap-4 rounded-[5px] bg-white/5 p-4"><span className="font-metric text-2xl text-[#B4FF45]">0{index + 1}</span><span className="font-heading text-lg">{item}</span></div>)}</div>
          </div>
          <div className="rounded-[10px] border border-white/15 bg-[#0b1722]/80 p-5 shadow-2xl backdrop-blur-xl md:p-7">
            <div className="flex items-center justify-between  pb-5"><div><p className="font-display mt-1 text-3xl uppercase">Torneo de rugby sevens</p></div><span className="rounded-full border border-[#B4FF45]/40 bg-[#B4FF45]/10 px-3 py-1 text-xs font-bold text-[#B4FF45]">EN VIVO</span></div>
            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center"><div><div className="mx-auto flex h-15 w-auto items-center justify-center rounded-2xl text-2xl"><img src="/equipos/cuervos.png" alt="cuervos" className='w-20 h-auto' /></div><p className="font-heading mt-3 text-lg">Cuervos</p></div><div><p className="font-display text-5xl">14 - 12</p><p className="text-sm text-slate-400">2T 04:21</p></div><div><div className="mx-auto flex  h-15 w-auto items-center justify-center rounded-2xl  text-2xl"><img src="/equipos/Titanes.png" alt="Titanes" className='w-20 h-auto' /></div><p className="font-heading mt-3 text-lg">Titanes</p></div></div>
            <div className="mt-8 overflow-hidden rounded-[5px] border border-white/10 bg-[#07131b]/80"><div className="flex items-center justify-center border-b border-white/10 px-4 py-4"><p className="font-heading text-xs uppercase tracking-[.3em] text-slate-400 text-center">Estadisticas</p></div><div className="grid grid-cols-[1fr_1.6fr_1fr] bg-[#0a2637]/80 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"><span className="text-slate-300">Cuervos</span><span className="text-slate-400"></span><span className="text-slate-300">Titanes</span></div>
            <div className="divide-y divide-white/10">{[['2', 'Tries', '2'], ['2', 'Conversiones', '1'], ['2', 'Penales', '3'], ['1', 'Tarjetas amarillas', '2'], ['0', 'Tarjetas rojas', '0'], ['5', 'Cambios', '4']].map(([home, label, away]) => <div key={label} className="grid grid-cols-[1fr_1.6fr_1fr] items-center px-4 py-2.5 text-center"><span className="font-metric text-xl font-bold text-white">{home}</span><span className="text-xs uppercase tracking-wide text-slate-400">{label}</span><span className="font-metric text-xl font-bold text-white">{away}</span></div>)}</div></div>
          </div>
        </div>
      </section>
      <section id="torneos" className="relative px-6 py-15 md:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><h2 className="font-display mt-4 text-6xl uppercase leading-none md:text-8xl">Torneos</h2><p className="mt-4 text-lg text-slate-300">Organiza competencias, controla resultados y lleva el seguimiento de cada partido.</p></div><button onClick={() => setAuthMode('login')} className="font-heading inline-flex items-center justify-center rounded-full bg-[#B4FF45] px-7 py-3.5 text-lg font-bold text-[#10151b] transition hover:bg-[#c8ff7a]">+ Crear torneo</button></div>
          <div className="mt-10 flex w-full max-w-xl gap-1 rounded-2xl border border-white/15 bg-[#07131b]/80 p-1 backdrop-blur-xl"><button onClick={() => setAuthMode('login')} className="font-heading flex-1 rounded-xl bg-[#B4FF45] px-4 py-3 text-[#10151b]">Todos</button><button onClick={() => setAuthMode('login')} className="font-heading flex-1 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-white/10">En curso</button><button onClick={() => setAuthMode('login')} className="font-heading flex-1 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-white/10">Próximos</button><button onClick={() => setAuthMode('login')} className="font-heading flex-1 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-white/10">Finalizados</button></div>
          <div className="mt-6 grid gap-5 xl:grid-cols-[repeat(3,minmax(0,1fr))_340px]">
            {[['Liga Panameña de Rugby - 2da temporada 2026', 'EN CURSO', '12 - 14 sept. 2026', 'Ciudad de Panamá', '16', '68%', 'Fase de grupos'], ['Liga Panameña de Rugby - 1ra temporada 2026', 'FINALIZADO', '03 - 04 may. 2026', 'Ciudad de Panamá', '12', '100%', 'Torneo completado'], ['Gran jaguar - Guatemala', 'PRÓXIMO', '03 - 04 oct. 2026', 'Panamá', '10', '40%', 'Inscripciones']].map(([title, status, date, location, teams, progress, stage]) => <article key={title} className="overflow-hidden rounded-3xl border border-white/15 bg-[#07131b]/85 shadow-xl backdrop-blur-xl"><div className="flex h-36 items-end bg-cover bg-center p-5" style={{ backgroundImage: "linear-gradient(180deg,rgba(4,17,28,.15),rgba(4,17,28,.95)),url('/upr.png')" }}><span className={`rounded-full border px-3 py-1 text-xs font-bold ${status === 'EN CURSO' ? 'border-[#B4FF45]/50 text-[#B4FF45]' : status === 'PRÓXIMO' ? 'border-cyan-300/50 text-cyan-300' : 'border-slate-400/50 text-slate-300'}`}>{status}</span></div><div className="p-5"><p className="font-heading text-2xl font-semibold">{title}</p><div className="mt-4 space-y-2 text-sm text-slate-400"><p><CalendarDays className="mr-2 inline text-[#B4FF45]" size={16} />{date}</p><p><MapPin className="mr-2 inline text-[#B4FF45]" size={16} />{location}</p><p><Users className="mr-2 inline text-[#B4FF45]" size={16} />{teams} equipos</p></div><div className="mt-5"><div className="flex justify-between text-xs uppercase tracking-wide text-slate-400"><span>{stage}</span><span>{progress}</span></div><div className="mt-2 h-2 rounded-full bg-white/10"><div className={`h-2 rounded-full ${status === 'FINALIZADO' ? 'bg-slate-300' : 'bg-[#B4FF45]'}`} style={{ width: progress }} /></div></div><button onClick={() => setAuthMode('login')} className="font-heading mt-6 border-t border-white/10 pt-4 text-lg text-white transition hover:text-[#B4FF45]">Ver torneo <ArrowRight className="ml-2 inline" size={18} /></button></div></article>)}
            <aside className="rounded-3xl border border-white/15 bg-[#07131b]/85 p-5 shadow-xl backdrop-blur-xl"><div className="flex items-center justify-between"><h3 className="font-heading text-2xl font-semibold">Próximos partidos</h3><button onClick={() => setAuthMode('login')} className="text-sm text-[#B4FF45] transition hover:text-white">Ver todos →</button></div><div className="mt-5 space-y-3">{[['Los Pumas 7s', 'San Isidro RC', '10:00'], ['Universidad XX', 'Hurling RC', '11:20']].map(([home, away, time]) => <div key={home} className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Liga Panameña de Rugby</p><div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center"><span className="font-heading text-sm">{home}</span><span className="font-display text-2xl text-[#B4FF45]">{time}</span><span className="font-heading text-sm">{away}</span></div></div>)}</div></aside>
          </div>
        </div>
      </section>
      <PlatformUpdates />
      <section id="contacto" className="relative px-6 py-24 md:px-14 lg:px-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[10px] border border-white/15 bg-[#0b1722]/85 p-6 shadow-2xl backdrop-blur-xl md:px-9 md:py-6">
            <h2 className="font-display text-5xl uppercase leading-none md:text-7xl">Tu opinión <span className='text-[#B4FF45]'>cuenta</span></h2>
            <p className=" text-lg leading-8 text-slate-300">Comparte tus ideas, sugerencias o comentarios y ayúdanos a seguir mejorando AthlonX.</p>
            <form className="mt-5 space-y-2" onSubmit={(event) => event.preventDefault()}>
              <label className="block"><span className="font-heading block text-lg">Nombre</span><input required className="w-full rounded-[5px] border border-white/15 bg-white/5 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-500 focus:border-[#B4FF45]" placeholder="Tu nombre" /></label>
              <label className="block"><span className="font-heading block text-lg">Correo electrónico</span><input required type="email" className="w-full rounded-[5px] border border-white/15 bg-white/5 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-500 focus:border-[#B4FF45]" placeholder="tu@ejemplo.com" /></label>
              <label className="block"><span className="font-heading block text-lg">Asunto</span><input required className="w-full rounded-[5px] border border-white/15 bg-white/5 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-500 focus:border-[#B4FF45]" placeholder="¿Sobre qué te gustaría hablar?" /></label>
              <label className="block"><span className="font-heading block text-lg">Mensaje</span><textarea required rows={3} className="w-full resize-none rounded-[5px] border border-white/15 bg-white/5 px-4 py-2 text-white outline-none transition placeholder:text-slate-500 focus:border-[#B4FF45]" placeholder="Cuéntanos más detalles..." /></label>
              <button type="submit" className="font-heading inline-flex w-full items-center justify-center gap-4 rounded-[5px] bg-[#B4FF45] px-6 py-4 text-xl font-bold text-[#10151b] transition hover:bg-[#c8ff7a]">Enviar mensaje <ArrowRight size={20} /></button>
            </form>
          </div>
          <div className="flex min-h-[560px] flex-col items-center justify-center text-center">
            <img className="w-full max-w-lg" src="/MarcaAthlonX/Marca.svg" alt="AthlonX" />
            <p className="font-heading mt-8 max-w-lg text-xl uppercase tracking-[.25em] text-slate-300">Plataforma de Gestión y Rendimiento Deportivo</p>
          </div>
        </div>
      </section>
      {authMode && (
  <div
    className="fixed inset-0 z-[60] flex h-[100dvh] items-center justify-center overflow-hidden bg-black/75 px-4 py-4 backdrop-blur-md sm:px-6 sm:py-6"
  >
    <div
      className="relative flex max-h-[calc(100dvh-2rem)] min-h-0 w-full max-w-2xl flex-col"
    >
      <button
        type="button"
        aria-label="Cerrar formulario"
        onClick={() => setAuthMode(null)}
        className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-white/15 bg-[#0b141e]/90 text-slate-300 shadow-lg transition hover:border-[#B4FF45] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4FF45]"
      >
        <X size={18} />
      </button>

      <AuthPanel initialMode={authMode} />
    </div>
  </div>
)}    </main>
  )
}

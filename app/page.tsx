'use client'

import { ArrowRight, BarChart3, CalendarDays, ClipboardList, MapPin, ShieldCheck, Users, UsersRound, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import SiteFooter from '../Components/site-footer'

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
  // El acceso vive en el layout del sitio y se abre con este evento.
  function openAuth(mode: 'login' | 'register') {
    window.dispatchEvent(new CustomEvent('athlonx-auth', { detail: mode }))
  }

  return (
    <main className="overflow-hidden text-white">
      <section className="relative isolate flex min-h-[calc(100vh-92px)] items-center bg-cover bg-center px-6 py-16 md:px-14 lg:px-24" >
        <div className="mx-auto flex w-full max-w-7xl flex-col">
          <div className="max-w-3xl">
            <p className="font-heading mb-6  text-xs font-semibold uppercase tracking-[.30em] text-slate-300">Plataforma de Gestión y Rendimiento Deportivo</p>
            <h1 className="font-display text-6xl font-black uppercase leading-[.9] tracking-wide md:text-8xl">Tus torneos, tus equipos, <span className=" text-[#B4FF45] md:hidden">tu</span>  <span className="block text-[#B4FF45] hidden md:block">tu organización</span><span className="block text-[#B4FF45] block md:hidden"> organización</span></h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-slate-300 md:text-lg">Todo, en un solo lugar. Gestiona atletas, entrenamientos, asistencia, estadísticas y competiciones con una plataforma diseñada para llevar el rendimiento deportivo a otro nivel.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={() => openAuth('login')} className="group inline-flex items-center justify-center gap-5 rounded-full bg-[#B4FF45] px-8 py-4 font-bold text-[#10151b] shadow-[0_0_30px_rgba(180,255,69,.3)] transition hover:scale-[1.03] hover:bg-[#c8ff7a]">Iniciar sesión <ArrowRight className="transition group-hover:translate-x-1" size={19} /></button><button onClick={() => openAuth('register')} className="inline-flex items-center justify-center gap-5 rounded-full border border-white/75 bg-black/15 px-8 py-4 font-bold text-white backdrop-blur-sm transition hover:bg-white/10">Registrarse <ArrowRight size={19} /></button></div>
          </div>
          <div className="mt-14 grid max-w-3xl grid-cols-1 border-y border-white/15 py-5 sm:grid-cols-3 sm:divide-x sm:divide-white/15">{highlights.map(({ icon: Icon, title, text }) => <div key={title} className="flex items-center gap-4 px-2 py-3 sm:px-6"><Icon className="shrink-0 text-[#B4FF45]" size={29} /><div><p className="font-metric text-xl font-bold">{title}</p><p className="text-sm text-slate-400">{text}</p></div></div>)}</div>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}

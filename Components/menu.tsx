'use client'

import Link from 'next/link'
import { Menu as MenuIcon, X, ArrowUpRight } from 'lucide-react'
import { useState } from 'react'

const links = [
  { label: 'Inicio', href: '/' },
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Torneos', href: '#torneos' },
  { label: 'Contacto', href: '#contacto' },
]

export default function Menu() {
  const [open, setOpen] = useState(false)
  const [activeLink, setActiveLink] = useState('Inicio')

  function closeMenu() {
    setOpen(false)
  }

  function selectLink(label: string) {
    setActiveLink(label)
    closeMenu()
  }

  function openAuth(mode: 'login' | 'register') {
    window.dispatchEvent(new CustomEvent('athlonx-auth', { detail: mode }))
    closeMenu()
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8 md:pt-6">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/15 bg-[#07111d]/70 px-5 py-3 shadow-2xl backdrop-blur-xl md:px-7">
        <Link href="/" onClick={() => selectLink('Inicio')} aria-label="AthlonX, inicio" className="shrink-0 transition hover:opacity-80">
          <img className="w-40 md:w-48" src="/MarcaAthlonX/MarcaHorizontal.svg" alt="AthlonX" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => <Link key={link.label} href={link.href} onClick={() => selectLink(link.label)} className={`font-heading group relative py-3 text-sm font-semibold transition ${activeLink === link.label ? 'text-white' : 'text-slate-300 hover:text-white'}`}><span>{link.label}</span><span className={`absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[#B4FF45] shadow-[0_0_10px_#B4FF45] transition-all duration-300 ${activeLink === link.label ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}`} /></Link>)}
          <button type="button" onClick={() => openAuth('login')} className="inline-flex items-center gap-2 rounded-full border border-[#B4FF45] px-5 py-2.5 text-sm font-bold text-[#d9ffb1] transition hover:bg-[#B4FF45] hover:text-[#10151b]"><span>Iniciar sesión</span><ArrowUpRight size={16} /></button>
        </div>

        <button type="button" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-xl border border-white/15 p-2.5 text-white transition hover:border-[#B4FF45] hover:text-[#B4FF45] md:hidden">
          {open ? <X size={23} /> : <MenuIcon size={23} />}
        </button>
      </nav>

      {open && <div onClick={closeMenu} className="fixed inset-0 -z-10 bg-black/50 backdrop-blur-sm md:hidden" />}
      <div className={`absolute left-4 right-4 top-[calc(100%+0.5rem)] overflow-hidden rounded-2xl border border-white/15 bg-[#0b1724]/95 shadow-2xl backdrop-blur-xl transition-all duration-300 md:hidden ${open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-3 opacity-0'}`}>
        <div className="p-3">
          {links.map((link) => <Link key={link.label} href={link.href} onClick={closeMenu} className="font-heading flex items-center justify-between rounded-xl px-4 py-4 text-lg font-semibold text-slate-200 transition hover:bg-white/10 hover:text-[#B4FF45]"><span>{link.label}</span><ArrowUpRight size={18} /></Link>)}
          <button type="button" onClick={() => openAuth('login')} className="mt-2 block w-full rounded-xl bg-[#B4FF45] px-4 py-4 text-center font-bold text-[#10151b] transition hover:bg-[#c8ff7a]">Iniciar sesión</button>
          <button type="button" onClick={() => openAuth('register')} className="mt-2 block w-full rounded-xl border border-white/20 px-4 py-4 text-center font-bold text-white transition hover:bg-white/10">Registrarse</button>
        </div>
      </div>
    </header>
  )
}

 'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, Trophy, UserCircle, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const navigation = [
  ['Mi perfil', UserCircle, '/dashboard/perfil'],
  ['Torneos', Trophy, '/dashboard/torneos'],
] as const

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileName, setProfileName] = useState('Espectador')
  const [roles, setRoles] = useState<string[]>(['espectador', 'atleta', 'entrenador', 'directivo'])
  const [activeRole, setActiveRole] = useState('espectador')
  const [notice, setNotice] = useState('')
  const pathname = usePathname()
  const sectionName = pathname?.split('/').filter(Boolean).pop() ?? 'Dashboard'
  const sectionLabel = sectionName.charAt(0).toUpperCase() + sectionName.slice(1)

  useEffect(() => {
    async function loadUserContext() {
      if (!supabase) return
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      const [{ data: profile }, { data: userRoles }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', userData.user.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userData.user.id),
      ])
      setProfileName(profile?.full_name || userData.user.user_metadata?.full_name || 'Espectador')
      const availableRoles = Array.from(new Set([...(userRoles?.map(({ role }) => role) ?? []), 'espectador', 'atleta', 'entrenador', 'directivo']))
      setRoles(availableRoles)
      setActiveRole(availableRoles.includes('espectador') ? 'espectador' : availableRoles[0] ?? 'espectador')
    }
    void loadUserContext()
  }, [])

  const closeMenu = () => setMenuOpen(false)
  const changeRole = (role: string) => {
    setActiveRole(role)
    window.localStorage.setItem('athlonx-active-role', role)
    window.dispatchEvent(new CustomEvent('athlonx-role-change', { detail: role }))
  }

  return (
    <>
      <button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menú de navegación" aria-expanded={menuOpen} className="fixed left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-xl bg-[#081522] text-white shadow-lg print:hidden lg:hidden">
        <Menu size={22} />
      </button>
      {menuOpen && <button type="button" aria-label="Cerrar menú" onClick={closeMenu} className="fixed inset-0 z-30 bg-[#081522]/60 print:hidden lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#081522] px-6 py-7 text-white shadow-2xl transition-transform duration-200 print:hidden lg:z-20 lg:block lg:w-64 lg:translate-x-0 lg:shadow-none ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-start justify-between">
          <Link href="/" onClick={closeMenu} className="block border-b border-white/10 pb-7 lg:w-full">
          <img src="/MarcaAthlonX/MarcaHorizontal.svg" alt="AthlonX" className="w-44" />
          <p className="mt-2 text-[10px] uppercase tracking-[.35em] text-slate-500">Gestión deportiva</p>
          </Link>
          <button type="button" onClick={closeMenu} aria-label="Cerrar menú de navegación" className="ml-4 rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"><X size={22} /></button>
        </div>
        <nav className="mt-8 space-y-2">
          {navigation.map(([label, Icon, href]) => (
            <Link key={label} href={href} onClick={closeMenu} className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-white/10 hover:text-white">
              <Icon size={20} />
              <span className="font-heading text-lg">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-7 left-6 right-6 flex items-center gap-2 border-t border-white/10 pt-4"><span className="whitespace-nowrap text-[11px] text-slate-400">Desarrollado por</span><span className="text-slate-600">|</span><img src="/NexDigital.svg" alt="Nex Digital" className="w-24 opacity-75" /></div>
      </aside>
      {pathname !== '/dashboard' && <div className="border-b border-slate-200 bg-white px-6 py-5 print:hidden lg:ml-64 md:px-10"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><div><p className="font-heading text-2xl font-black uppercase tracking-wide text-[#17212b]">{sectionLabel}</p><p className="font-body text-sm font-normal text-[#4c8500]">{profileName}</p></div></div></div>}
      {children}
      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-[#081522] px-5 py-4 text-center text-sm font-semibold text-white shadow-2xl"><div className="flex items-center justify-between gap-4"><span>{notice}</span><button type="button" onClick={() => setNotice('')} className="text-[#B4FF45]">Cerrar</button></div></div>}
    </>
  )
}

'use client'

import Link from 'next/link'
import { ArrowLeft, LockKeyhole, Menu as MenuIcon, ShieldCheck, UserCircle, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AccountMenu } from '../../../Components/account-menu'
import { LogoutAction } from '../../../Components/logout-confirmation'
import { supabase } from '../../../lib/supabase'
import { NotificationsMenu } from '../../../Components/notifications-menu'

type Profile = { full_name: string; phone: string | null; email_verified: boolean }
type Section = 'personal' | 'equipos' | 'seguridad' | 'cuenta'
type MenuItem = { id: Section; label: string; icon: typeof UserCircle }

const menu: MenuItem[] = [
  { id: 'personal', label: 'Información personal', icon: UserCircle },
  { id: 'equipos', label: 'Equipos y roles', icon: Users },
  { id: 'seguridad', label: 'Seguridad', icon: ShieldCheck },
  { id: 'cuenta', label: 'Cuenta', icon: LockKeyhole },
]

export default function SettingsPage() {
  const router = useRouter()
  const [section, setSection] = useState<Section>('personal')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [profileOpen, setProfileOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('athlonx-theme') === 'light' ? 'light' : 'dark'
    setTheme(storedTheme)
    document.documentElement.dataset.theme = storedTheme
  }, [])

  useEffect(() => {
    async function loadSettings() {
      if (!supabase) return setLoading(false)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return setLoading(false)
      const { data: profileData } = await supabase.from('profiles').select('full_name, phone, email_verified').eq('id', userData.user.id).maybeSingle()
      setEmail(userData.user.email ?? '')
      setProfile(profileData)
      setLoading(false)
    }
    void loadSettings()
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 4500)
    return () => window.clearTimeout(timer)
  }, [notice])

  const name = profile?.full_name || 'Usuario AthlonX'
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'

  function changeTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme
    window.localStorage.setItem('athlonx-theme', nextTheme)
    setProfileOpen(false)
  }

  function selectSection(nextSection: Section) {
    setMenuOpen(false)
    if (nextSection !== 'personal') {
      setNotice('Esta sección será habilitada en próximas actualizaciones.')
      return
    }
    setNotice('')
    setSection(nextSection)
  }

  return <main className="min-h-screen bg-[#07131e] text-white">
    <div className="grid min-h-screen lg:grid-cols-[256px_1fr]">
      {menuOpen && <button type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú lateral" className="fixed inset-0 z-30 cursor-pointer bg-[#020a11]/70 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#061b2b] px-7 py-8 shadow-2xl transition-transform duration-200 lg:static lg:min-h-screen lg:w-64 lg:translate-x-0 lg:shadow-none ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-start justify-between">
          <Link href="/" onClick={() => setMenuOpen(false)} className="border-b border-[#16415b] pb-8"><img src="/MarcaAthlonX/MarcaHorizontal.svg" alt="AthlonX" className="w-48" /><p className="mt-3 text-[10px] uppercase tracking-[.35em] text-slate-500">Gestión deportiva</p></Link>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú lateral" className="ml-3 cursor-pointer rounded-full p-2 text-slate-400 hover:bg-white/10 lg:hidden"><X size={19} /></button>
        </div>
        <nav className="mt-8 space-y-2">{menu.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => selectSection(id)} className={`flex w-full cursor-pointer items-center rounded-2xl px-4 py-3 text-left font-semibold transition ${section === id ? 'bg-[#b4ff45] text-[#07131e]' : 'text-slate-200 hover:bg-white/5'}`}><span className="flex items-center gap-3"><Icon size={19} />{label}</span></button>)}</nav>
        <LogoutAction className="mt-auto w-full rounded-2xl border border-red-400/30 px-4 py-3 text-left font-semibold text-red-300 hover:bg-red-400/10" />
      </aside>
      <div className="min-w-0 px-5 pt-5 sm:px-8 lg:px-10 lg:pt-5">
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menú de configuración" className="mb-4 flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-[#31556b] text-slate-300 hover:border-[#b4ff45] hover:text-[#b4ff45] lg:hidden"><MenuIcon size={21} /></button>
        <header className="flex min-w-0 items-center justify-between gap-3 border-b border-[#1e4057] pb-5"><div className="flex min-w-0 items-center gap-3 sm:gap-4"><button type="button" onClick={() => router.back()} aria-label="Volver" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#31556b] text-slate-300 hover:border-[#b4ff45] hover:text-[#b4ff45]"><ArrowLeft size={20} /></button><h1 className="truncate font-display text-3xl uppercase sm:text-5xl">Configuración</h1></div><div className="relative flex shrink-0 items-center gap-2 sm:gap-3"><NotificationsMenu /><span className="hidden h-7 w-px bg-[#294052] sm:block" /><button type="button" onClick={() => setProfileOpen((open) => !open)} aria-label="Abrir menú de cuenta" className="flex cursor-pointer items-center gap-2 rounded-full p-1 pr-2 hover:bg-white/5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b4ff45] font-heading font-bold text-[#07131e]">{initials}</span><span className="hidden max-w-32 truncate font-semibold sm:block">{name}</span></button>{profileOpen && <AccountMenu name={name} theme={theme} onTheme={changeTheme} onClose={() => setProfileOpen(false)} />}</div></header>
        {notice && <div role="status" className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-[#b4ff45]/30 bg-[#b4ff45]/10 px-4 py-3 text-sm text-[#d8ffac]"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Cerrar aviso" className="cursor-pointer rounded-full p-1 hover:bg-white/10"><X size={17} /></button></div>}
        <section className="max-w-6xl pt-10 pb-10"><Personal name={name} email={email} profile={profile} loading={loading} /></section>
      </div>
    </div>
  </main>
}

function Personal({ name, email, profile, loading }: { name: string; email: string; profile: Profile | null; loading: boolean }) {
  return <div><p className="text-sm font-bold uppercase tracking-[.2em] text-[#b4ff45]">Información personal</p><div className="mt-5 flex items-center gap-4 border-b border-[#263b4d] pb-7"><div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#b4ff45] font-display text-3xl text-[#07131e]">{name.slice(0, 1).toUpperCase()}</div><div><h2 className="font-display text-4xl uppercase">{loading ? 'Cargando' : name}</h2><p className="text-slate-400">Perfil de usuario AthlonX</p></div></div><div className="mt-8 grid gap-x-6 gap-y-5 md:grid-cols-2"><Field label="Nombre completo" value={name} /><Field label="Correo electrónico" value={email || 'Sin registrar'} /><Field label="Teléfono" value={profile?.phone || 'Sin registrar'} /><Field label="Estado del correo" value={profile?.email_verified ? 'Verificado' : 'Pendiente de verificación'} /></div><button type="button" className="mt-8 cursor-pointer rounded-xl bg-[#b4ff45] px-6 py-3 font-bold text-[#07131e]">Editar información</button></div>
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="border-b border-[#263b4d] pb-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 font-semibold text-white">{value}</p></div>
}

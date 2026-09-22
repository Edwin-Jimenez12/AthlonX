'use client'

import Link from 'next/link'
import { ArrowLeft, ChevronRight, LockKeyhole, MapPin, Menu as MenuIcon, ShieldCheck, UserCircle, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AccountMenu } from '../../../Components/account-menu'
import { LogoutAction } from '../../../Components/logout-confirmation'
import { supabase } from '../../../lib/supabase'
import { NotificationsMenu } from '../../../Components/notifications-menu'

type Profile = { full_name: string; phone: string | null; email_verified: boolean; allow_athlete_invitations: boolean }
type OrganizationTeam = { id: string; name: string; logo_url: string | null; country: string | null; city: string | null; discipline_id: string | null; athlonx_code: string | null; handle: string | null }
type Discipline = { id: string; name: string; code: string }
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
  const [accountType, setAccountType] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [organizationTeams, setOrganizationTeams] = useState<OrganizationTeam[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [disciplineFilter, setDisciplineFilter] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [allowAthleteInvitations, setAllowAthleteInvitations] = useState(true)
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
      const currentAccountType = userData.user.user_metadata?.account_type ?? 'persona'
      setAccountType(currentAccountType)
      const { data: profileData } = await supabase.from('profiles').select('full_name, phone, email_verified, allow_athlete_invitations').eq('id', userData.user.id).maybeSingle()
      setEmail(userData.user.email ?? '')
      setProfile(profileData)
      setAllowAthleteInvitations(profileData?.allow_athlete_invitations ?? true)
      if (currentAccountType === 'organizacion') {
        await supabase.rpc('ensure_my_organization')
        const [{ data: ownedOrganizations }, { data: memberships }] = await Promise.all([
          supabase.from('organizations').select('id, name').eq('created_by', userData.user.id).order('created_at', { ascending: false }).limit(1),
          supabase.from('organization_members').select('organization_id').eq('user_id', userData.user.id).in('role', ['owner', 'directivo']).eq('status', 'active').limit(1),
        ])
        const currentOrganization = ownedOrganizations?.[0]
        const currentOrganizationId = currentOrganization?.id ?? memberships?.[0]?.organization_id ?? ''
        setOrganizationId(currentOrganizationId)
        setOrganizationName(currentOrganization?.name ?? userData.user.user_metadata?.organization_name ?? profileData?.full_name ?? 'Organización')
      }
      setLoading(false)
    }
    void loadSettings()
  }, [])

  useEffect(() => {
    if (!supabase || accountType !== 'organizacion' || !organizationId) return
    let active = true
    async function loadOrganizationTeams() {
      const [{ data: teamData }, { data: disciplineData }] = await Promise.all([
        supabase.from('teams').select('id, name, logo_url, country, city, discipline_id, athlonx_code, handle').eq('organization_id', organizationId).order('name'),
        supabase.from('disciplines').select('id, name, code').eq('is_active', true).in('code', ['rugby', 'baloncesto']).order('name'),
      ])
      if (!active) return
      setOrganizationTeams((teamData ?? []) as OrganizationTeam[])
      setDisciplines((disciplineData ?? []) as Discipline[])
    }
    void loadOrganizationTeams()
    const refresh = () => { void loadOrganizationTeams() }
    window.addEventListener('athlonx-affiliation-updated', refresh)
    return () => {
      active = false
      window.removeEventListener('athlonx-affiliation-updated', refresh)
    }
  }, [accountType, organizationId])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 4500)
    return () => window.clearTimeout(timer)
  }, [notice])

  const isOrganization = accountType === 'organizacion'
  const name = isOrganization ? organizationName || profile?.full_name || 'Organización AthlonX' : profile?.full_name || 'Usuario AthlonX'
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
    if (nextSection === 'equipos' && isOrganization) {
      setNotice('')
      setSection(nextSection)
      return
    }
    if (nextSection !== 'personal') {
      setNotice('Esta sección será habilitada en próximas actualizaciones.')
      return
    }
    setNotice('')
    setSection(nextSection)
  }

  async function changeAthleteInvitationPreference(nextValue: boolean) {
    if (!supabase) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return setNotice('No se encontró una sesión activa.')
    setAllowAthleteInvitations(nextValue)
    const { error } = await supabase.from('profiles').update({ allow_athlete_invitations: nextValue }).eq('id', userData.user.id)
    if (error) {
      setAllowAthleteInvitations(!nextValue)
      return setNotice(error.message)
    }
    setNotice(nextValue ? 'Ahora puedes recibir invitaciones como atleta.' : 'Se desactivaron las invitaciones como atleta.')
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
        <section className="max-w-6xl pt-10 pb-10">{section === 'equipos' && isOrganization ? <OrganizationTeams teams={organizationTeams} disciplines={disciplines} disciplineFilter={disciplineFilter} onDisciplineFilterChange={setDisciplineFilter} /> : <Personal name={name} email={email} profile={profile} loading={loading} isOrganization={isOrganization} allowAthleteInvitations={allowAthleteInvitations} onAthleteInvitationChange={changeAthleteInvitationPreference} />}</section>
      </div>
    </div>
  </main>
}

function Personal({ name, email, profile, loading, isOrganization, allowAthleteInvitations, onAthleteInvitationChange }: { name: string; email: string; profile: Profile | null; loading: boolean; isOrganization: boolean; allowAthleteInvitations: boolean; onAthleteInvitationChange: (value: boolean) => Promise<void> }) {
  return <div><p className="text-sm font-bold uppercase tracking-[.2em] text-[#b4ff45]">Información personal</p><div className="mt-5 flex items-center gap-4 border-b border-[#263b4d] pb-7"><div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#b4ff45] font-display text-3xl text-[#07131e]">{name.slice(0, 1).toUpperCase()}</div><div><h2 className="font-display text-4xl uppercase">{loading ? 'Cargando' : name}</h2><p className="text-slate-400">{isOrganization ? 'Perfil institucional AthlonX' : 'Perfil de usuario AthlonX'}</p></div></div><div className="mt-8 grid gap-x-6 gap-y-5 md:grid-cols-2"><Field label={isOrganization ? 'Nombre de la organización' : 'Nombre completo'} value={name} /><Field label={isOrganization ? 'Correo institucional' : 'Correo electrónico'} value={email || 'Sin registrar'} /><Field label="Teléfono" value={profile?.phone || 'Sin registrar'} /><Field label="Estado del correo" value={profile?.email_verified ? 'Verificado' : 'Pendiente de verificación'} /></div>{!isOrganization && <section className="mt-8 rounded-2xl border border-[#29485d] bg-[#0b1d2c] p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-heading text-lg font-bold uppercase">Invitaciones como atleta</p><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">Permite que los equipos te encuentren y te envíen invitaciones para formar parte de sus plantillas.</p></div><label className="inline-flex cursor-pointer items-center gap-3 text-sm font-bold text-white"><input type="checkbox" checked={allowAthleteInvitations} onChange={(event) => void onAthleteInvitationChange(event.target.checked)} className="h-5 w-5 cursor-pointer accent-[#b4ff45]" />{allowAthleteInvitations ? 'Activadas' : 'Desactivadas'}</label></div></section>}<button type="button" className="mt-8 cursor-pointer rounded-xl bg-[#b4ff45] px-6 py-3 font-bold text-[#07131e]">Editar información</button></div>
}

function OrganizationTeams({ teams, disciplines, disciplineFilter, onDisciplineFilterChange }: { teams: OrganizationTeam[]; disciplines: Discipline[]; disciplineFilter: string; onDisciplineFilterChange: (value: string) => void }) {
  const visibleTeams = disciplineFilter ? teams.filter((team) => team.discipline_id === disciplineFilter) : teams
  return <div><p className="text-sm font-bold uppercase tracking-[.2em] text-[#b4ff45]">Equipos vinculados</p><div className="mt-5 flex flex-col gap-4 border-b border-[#263b4d] pb-7 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display text-4xl uppercase">Equipos y roles</h2><p className="mt-2 text-slate-400">Consulta los equipos vinculados a esta organización y sus perfiles deportivos.</p></div><label className="text-sm font-semibold text-slate-300">Disciplina<select value={disciplineFilter} onChange={(event) => onDisciplineFilterChange(event.target.value)} className="mt-2 block min-w-48 cursor-pointer rounded-xl border border-[#31556b] bg-[#0b1d2c] px-4 py-3 text-white"><option value="">Todas las disciplinas</option>{disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}</select></label></div><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleTeams.map((team) => { const discipline = disciplines.find((item) => item.id === team.discipline_id); const initials = team.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'; return <Link key={team.id} href={`/dashboard/equipos/${team.id}`} className="group rounded-2xl border border-[#29485d] bg-[#0b1d2c] p-5 transition hover:border-[#b4ff45]/70 hover:bg-[#102b3e]"><div className="flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#b4ff45] font-display text-xl text-[#07131e]">{team.logo_url ? <img src={team.logo_url} alt={`Logo de ${team.name}`} className="h-full w-full object-cover" /> : initials}</div><div className="min-w-0"><h3 className="truncate font-heading text-xl font-bold uppercase">{team.name}</h3><p className="mt-1 text-sm text-[#b4ff45]">{discipline?.name || 'Disciplina pendiente'}</p></div><ChevronRight className="ml-auto shrink-0 text-slate-500 transition group-hover:text-[#b4ff45]" size={20} /></div><div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm text-slate-400">{team.city && <p><MapPin className="mr-2 inline" size={15} />{team.city}, {team.country || 'Panamá'}</p>}{team.athlonx_code && <p className="font-mono text-xs text-slate-500">{team.athlonx_code}</p>}</div></Link>})}{!visibleTeams.length && <div className="rounded-2xl border border-dashed border-[#31556b] p-6 text-sm text-slate-400 sm:col-span-2 xl:col-span-3">{teams.length ? 'No hay equipos en esta disciplina.' : 'Todavía no hay equipos vinculados a esta organización.'}</div>}</div></div>
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="border-b border-[#263b4d] pb-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 font-semibold text-white">{value}</p></div>
}

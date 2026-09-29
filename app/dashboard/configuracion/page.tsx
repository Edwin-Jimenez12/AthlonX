'use client'

import Link from 'next/link'
import { ArrowLeft, ChevronRight, LockKeyhole, MapPin, Menu as MenuIcon, Settings, ShieldCheck, UserCircle, Users, X } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AccountMenu } from '../../../Components/account-menu'
import { LogoutAction } from '../../../Components/logout-confirmation'
import { supabase } from '../../../lib/supabase'
import { NotificationsMenu } from '../../../Components/notifications-menu'
import { TeamProfileSettings } from '../../../Components/team-profile-settings'
import { TeamDivisionSettings } from '../../../Components/team-division-settings'
import { loadManagedTeams } from '../../../lib/team-access'
import { StyledSelect } from '../../../Components/styled-select'

type Profile = { full_name: string; first_name: string | null; last_name: string | null; birth_date: string | null; blood_type: string | null; phone: string | null; allow_athlete_invitations: boolean }
type OrganizationTeam = { id: string; name: string; logo_url: string | null; country: string | null; city: string | null; discipline_id: string | null; athlonx_code: string | null; handle: string | null }
type Discipline = { id: string; name: string; code: string }
type PersonalTeam = { id: string; name: string; logo_url: string | null; city: string | null; discipline_id: string | null; discipline_name: string; athlonx_code: string | null; is_active: boolean; roles: string[] }
type PersonalRole = 'atleta' | 'entrenador' | 'directivo' | 'staff'
type Section = 'personal' | 'equipos' | 'seguridad' | 'cuenta'
type MenuItem = { id: Section; label: string; icon: typeof UserCircle; disabled: boolean }

const bloodTypeOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => ({ value: type, label: type }))
const personalRoleOptions: Array<{ value: PersonalRole; label: string }> = [
  { value: 'atleta', label: 'Atleta' },
  { value: 'entrenador', label: 'Entrenador' },
  { value: 'directivo', label: 'Directivo' },
  { value: 'staff', label: 'Staff' },
]

function normalizePersonalRoles(value: unknown): PersonalRole[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
  return [...new Set(values.filter((role): role is PersonalRole => typeof role === 'string' && personalRoleOptions.some((option) => option.value === role)))]
}

const menu: MenuItem[] = [
  { id: 'personal', label: 'Mi perfil', icon: UserCircle, disabled: false },
  { id: 'equipos', label: 'Equipos', icon: Users, disabled: false },
  { id: 'seguridad', label: 'Seguridad', icon: ShieldCheck, disabled: true },
  { id: 'cuenta', label: 'Cuenta', icon: LockKeyhole, disabled: true },
]

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [accountType, setAccountType] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [teamId, setTeamId] = useState('')
  const [organizationTeams, setOrganizationTeams] = useState<OrganizationTeam[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [disciplineFilter, setDisciplineFilter] = useState('')
  const [personalTeams, setPersonalTeams] = useState<PersonalTeam[]>([])
  const [personalTeamsLoading, setPersonalTeamsLoading] = useState(false)
  const [personalRoles, setPersonalRoles] = useState<PersonalRole[]>([])
  const [activeSection, setActiveSection] = useState<Section>('personal')
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
      const [{ data: profileData }, { data: roleData }, { data: contextData }] = await Promise.all([
        supabase.from('profiles').select('full_name, first_name, last_name, birth_date, blood_type, phone, allow_athlete_invitations').eq('id', userData.user.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userData.user.id),
        supabase.from('user_contexts').select('role').eq('user_id', userData.user.id).eq('context_type', 'personal').eq('status', 'active'),
      ])
      setEmail(userData.user.email ?? '')
      setProfile(profileData)
      const databaseRoles = normalizePersonalRoles((roleData ?? []).map(({ role }) => role))
      const contextRoles = normalizePersonalRoles((contextData ?? []).map(({ role }) => role))
      const metadataRoles = normalizePersonalRoles(userData.user.user_metadata?.roles ?? userData.user.user_metadata?.role)
      setPersonalRoles(databaseRoles.length ? databaseRoles : contextRoles.length ? contextRoles : metadataRoles.length ? metadataRoles : ['atleta'])
      setAllowAthleteInvitations(profileData?.allow_athlete_invitations ?? true)
      if (currentAccountType === 'persona') {
        setPersonalTeamsLoading(true)
        const { data: memberships } = await supabase.from('team_user_memberships').select('team_id, role, status').eq('user_id', userData.user.id)
        const teamIds = [...new Set((memberships ?? []).map((membership) => membership.team_id))]
        const [{ data: teamData }, { data: disciplineData }] = await Promise.all([
          teamIds.length ? supabase.from('teams').select('id, name, logo_url, city, discipline_id, athlonx_code').in('id', teamIds).order('name') : Promise.resolve({ data: [] }),
          supabase.from('disciplines').select('id, name, code').order('name'),
        ])
        setDisciplines((disciplineData ?? []) as Discipline[])
        const disciplineById = new Map((disciplineData ?? []).map((discipline) => [discipline.id, discipline.name]))
        setPersonalTeams((teamData ?? []).map((team) => {
          const teamMemberships = (memberships ?? []).filter((membership) => membership.team_id === team.id)
          return {
            id: team.id,
            name: team.name,
            logo_url: team.logo_url,
            city: team.city,
            discipline_id: team.discipline_id,
            discipline_name: disciplineById.get(team.discipline_id ?? '') || 'Disciplina pendiente',
            athlonx_code: team.athlonx_code,
            is_active: teamMemberships.some((membership) => membership.status === 'active'),
            roles: [...new Set(teamMemberships.map((membership) => membership.role))],
          }
        }) as PersonalTeam[])
        setPersonalTeamsLoading(false)
      }
      if (currentAccountType === 'equipo') {
        const managedTeams = await loadManagedTeams(userData.user.id)
        const storedTeamId = window.localStorage.getItem('athlonx-active-team-id')
        const selectedTeam = managedTeams.find((team) => team.id === storedTeamId) || managedTeams[0]
        setTeamId(selectedTeam?.id || '')
      }
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
        supabase.from('teams').select('id, name, logo_url, country, city, discipline_id, athlonx_code, handle').eq('organization_id', organizationId).eq('is_official', true).order('name'),
        supabase.from('disciplines').select('id, name, code').eq('is_active', true).order('name'),
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
          <Link href="/dashboard/busqueda" onClick={() => setMenuOpen(false)} className="border-b border-[#16415b] pb-8"><img src="/MarcaAthlonX/MarcaHorizontal.svg" alt="AthlonX" className="w-48" /></Link>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú lateral" className="ml-3 cursor-pointer rounded-full p-2 text-slate-400 hover:bg-white/10 lg:hidden"><X size={19} /></button>
        </div>
        <nav className="mt-8 space-y-2">{menu.map(({ id, label, icon: Icon, disabled }) => { const isDisabled = disabled || accountType === 'organizacion' || (id === 'equipos' && accountType !== 'persona'); return <button key={id} type="button" disabled={isDisabled} onClick={() => { if (!isDisabled) setActiveSection(id) }} title={isDisabled ? 'Disponible en próximas actualizaciones' : undefined} className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left font-semibold ${isDisabled ? 'cursor-not-allowed text-slate-500 opacity-70' : activeSection === id ? 'bg-[#b4ff45] text-[#07131e]' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}><span className="flex items-center gap-3"><Icon size={19} />{label}</span>{isDisabled && <span className="text-[9px] font-bold uppercase tracking-wider text-[#b4ff45]">Próximamente</span>}</button>})}</nav>
        <LogoutAction className="mt-auto w-full rounded-2xl border border-red-400/30 px-4 py-3 text-left font-semibold text-red-300 hover:bg-red-400/10" />
      </aside>
      <div className="min-w-0 px-5 pt-5 sm:px-8 lg:px-10 lg:pt-5">
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menú de configuración" className="mb-4 flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-[#31556b] text-slate-300 hover:border-[#b4ff45] hover:text-[#b4ff45] lg:hidden"><MenuIcon size={21} /></button>
        <header className="flex min-w-0 items-center justify-between gap-3 border-b border-[#1e4057] pb-5"><div className="flex min-w-0 items-center gap-3 sm:gap-4"><button type="button" onClick={() => router.back()} aria-label="Volver" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#31556b] text-slate-300 hover:border-[#b4ff45] hover:text-[#b4ff45]"><ArrowLeft size={20} /></button><h1 className="truncate font-display text-3xl uppercase sm:text-5xl">Configuración</h1></div><div className="relative flex shrink-0 items-center gap-2 sm:gap-3"><NotificationsMenu /><span className="hidden h-7 w-px bg-[#294052] sm:block" /><button type="button" onClick={() => setProfileOpen((open) => !open)} aria-label="Abrir menú de cuenta" className="flex cursor-pointer items-center gap-2 rounded-full p-1 pr-2 hover:bg-white/5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b4ff45] font-heading font-bold text-[#07131e]">{initials}</span><span className="hidden max-w-32 truncate font-semibold sm:block">{name}</span></button>{profileOpen && <AccountMenu name={name} theme={theme} onTheme={changeTheme} onClose={() => setProfileOpen(false)} />}</div></header>
        {notice && <div role="status" className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-[#b4ff45]/30 bg-[#b4ff45]/10 px-4 py-3 text-sm text-[#d8ffac]"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Cerrar aviso" className="cursor-pointer rounded-full p-1 hover:bg-white/10"><X size={17} /></button></div>}
        <section className="max-w-6xl space-y-8 pt-10 pb-10">
          {loading ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <p className="text-slate-400">Cargando configuración...</p>
            </div>
          ) : accountType === 'equipo' ? (
            <>
              {activeSection === 'personal' ? <>
                <PersonalInformationEditor name={name} email={email} profile={profile} loading={loading} isOrganization={false} canEditRoles={false} roles={personalRoles} onRolesSaved={setPersonalRoles} allowAthleteInvitations={allowAthleteInvitations} onAthleteInvitationChange={changeAthleteInvitationPreference} onSaved={(nextProfile) => setProfile((current) => current ? { ...current, ...nextProfile } : current)} />
                <TeamProfileSettings teamId={teamId} />
                <TeamDivisionSettings teamId={teamId} />
              </> : <PersonalTeamsSection teams={personalTeams} disciplines={disciplines} loading={personalTeamsLoading} />}
            </>
          ) : accountType === 'persona' ? (
            activeSection === 'personal' ? <PersonalInformationEditor name={name} email={email} profile={profile} loading={loading} isOrganization={false} canEditRoles roles={personalRoles} onRolesSaved={setPersonalRoles} allowAthleteInvitations={allowAthleteInvitations} onAthleteInvitationChange={changeAthleteInvitationPreference} onSaved={(nextProfile) => setProfile((current) => current ? { ...current, ...nextProfile } : current)} /> : <PersonalTeamsSection teams={personalTeams} disciplines={disciplines} loading={personalTeamsLoading} />
          ) : (
            <SettingsUnavailable />
          )}
        </section>
      </div>
    </div>
  </main>
}

function SettingsUnavailable() {
  return <div className="flex min-h-[60vh] items-center justify-center"><section className="w-full max-w-3xl rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-8 text-center shadow-xl sm:p-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[10px] bg-[#b4ff45] text-[#07131e]"><Settings size={30} /></div><p className="mt-6 font-heading text-sm uppercase tracking-[.28em] text-[#b4ff45]">Módulo en preparación</p><h2 className="mt-3 font-display text-4xl uppercase">Configuración</h2><p className="mx-auto mt-4 max-w-xl text-slate-400">Las opciones de cuenta de organización, equipos y roles, seguridad y cuenta estarán disponibles en próximas actualizaciones.</p></section></div>
}

function PersonalInformationEditor({ name, email, profile, loading, isOrganization, canEditRoles, roles, onRolesSaved, allowAthleteInvitations, onAthleteInvitationChange, onSaved }: { name: string; email: string; profile: Profile | null; loading: boolean; isOrganization: boolean; canEditRoles: boolean; roles: PersonalRole[]; onRolesSaved: (roles: PersonalRole[]) => void; allowAthleteInvitations: boolean; onAthleteInvitationChange: (value: boolean) => Promise<void>; onSaved: (profile: Pick<Profile, 'full_name' | 'first_name' | 'last_name' | 'birth_date' | 'blood_type' | 'phone'>) => void }) {
  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState(profile?.first_name || name.trim().split(/\s+/)[0] || '')
  const [lastName, setLastName] = useState(profile?.last_name || name.trim().split(/\s+/).slice(1).join(' ') || '')
  const [birthDate, setBirthDate] = useState(profile?.birth_date || '')
  const [bloodType, setBloodType] = useState(profile?.blood_type || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('success')

  useEffect(() => {
    const nameParts = name.trim().split(/\s+/)
    setFirstName(profile?.first_name || nameParts[0] || '')
    setLastName(profile?.last_name || nameParts.slice(1).join(' '))
    setBirthDate(profile?.birth_date || '')
    setBloodType(profile?.blood_type || '')
    setPhone(profile?.phone || '')
  }, [name, profile?.first_name, profile?.last_name, profile?.birth_date, profile?.blood_type, profile?.phone])

  async function savePersonalInformation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !firstName.trim() || !lastName.trim()) {
      setMessageKind('error')
      setMessage('Completa el nombre y el apellido.')
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setMessageKind('error')
      setMessage('Debes iniciar sesión para guardar tus datos.')
      return
    }

    setSaving(true)
    setMessage('')
    const nextFullName = `${firstName.trim()} ${lastName.trim()}`
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: nextFullName,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_date: birthDate || null,
        blood_type: bloodType || null,
        phone: phone.trim() || null,
      })
      .eq('id', userData.user.id)

    if (error) {
      setMessageKind('error')
      setMessage(error.message)
      setSaving(false)
      return
    }

    onSaved({ full_name: nextFullName, first_name: firstName.trim(), last_name: lastName.trim(), birth_date: birthDate || null, blood_type: bloodType || null, phone: phone.trim() || null })
    window.dispatchEvent(new CustomEvent('athlonx-profile-updated', { detail: { full_name: nextFullName } }))
    setEditing(false)
    setMessageKind('success')
    setMessage('Información personal actualizada.')
    setSaving(false)
  }

  return <div className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8">
    <div className="flex flex-col justify-between gap-5 border-b border-[#263b4d] pb-7 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#b4ff45] font-display text-3xl text-[#07131e]">{name.slice(0, 1).toUpperCase()}</div>
        <div>
          <p className="text-sm font-bold uppercase tracking-[.2em] text-[#b4ff45]">Mi perfil</p>
          <h2 className="mt-2 font-display text-4xl uppercase">{loading ? 'Cargando' : name}</h2>
          <p className="text-slate-400">{isOrganization ? 'Perfil institucional AthlonX' : 'Perfil de usuario AthlonX'}</p>
        </div>
      </div>
      {!editing && <button type="button" onClick={() => { setMessage(''); setEditing(true) }} className="cursor-pointer rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e]">Editar información</button>}
    </div>

    {editing ? (
      <form onSubmit={savePersonalInformation} className="mt-8 grid gap-5 md:grid-cols-2">
        <label className="block text-sm font-semibold">
          Nombre
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} required maxLength={80} className="mt-2 h-12 w-full rounded-xl border border-[#31556b] bg-[#071d2c] px-4 text-white outline-none focus:border-[#b4ff45]" />
        </label>
        <label className="block text-sm font-semibold">
          Apellido
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} required maxLength={120} className="mt-2 h-12 w-full rounded-xl border border-[#31556b] bg-[#071d2c] px-4 text-white outline-none focus:border-[#b4ff45]" />
        </label>
        <label className="block text-sm font-semibold">
          Correo electrónico
          <input value={email || 'Sin registrar'} readOnly className="mt-2 h-12 w-full cursor-not-allowed rounded-xl border border-[#31556b] bg-[#071d2c]/60 px-4 text-slate-400 outline-none" />
        </label>
        <label className="block text-sm font-semibold">
          Celular
          <input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} placeholder="Sin registrar" className="mt-2 h-12 w-full rounded-xl border border-[#31556b] bg-[#071d2c] px-4 text-white outline-none placeholder:text-slate-500 focus:border-[#b4ff45]" />
        </label>
        <label className="block text-sm font-semibold">
          Fecha de nacimiento
          <input type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setBirthDate(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#31556b] bg-[#071d2c] px-4 text-white outline-none focus:border-[#b4ff45]" />
        </label>
        <StyledSelect label="Tipo de sangre" value={bloodType} onChange={setBloodType} options={bloodTypeOptions} placeholder="Seleccionar tipo de sangre" />
        <div className="flex flex-col-reverse gap-3 md:col-span-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => { setEditing(false); const nameParts = name.trim().split(/\s+/); setFirstName(profile?.first_name || nameParts[0] || ''); setLastName(profile?.last_name || nameParts.slice(1).join(' ')); setBirthDate(profile?.birth_date || ''); setBloodType(profile?.blood_type || ''); setPhone(profile?.phone || '') }} className="cursor-pointer rounded-xl border border-[#31556b] px-5 py-3 font-bold text-slate-300 hover:border-white/50 hover:text-white">Cancelar</button>
          <button type="submit" disabled={saving} className="cursor-pointer rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] disabled:cursor-wait disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </form>
    ) : (
      <div className="mt-8 grid gap-x-6 gap-y-5 md:grid-cols-2">
        <Field label={isOrganization ? 'Nombre de la organización' : 'Nombre'} value={profile?.first_name || name.trim().split(/\s+/)[0] || 'Sin registrar'} />
        {!isOrganization && <Field label="Apellido" value={profile?.last_name || name.trim().split(/\s+/).slice(1).join(' ') || 'Sin registrar'} />}
        <Field label={isOrganization ? 'Correo institucional' : 'Correo electrónico'} value={email || 'Sin registrar'} />
        {!isOrganization && <Field label="Fecha de nacimiento" value={profile?.birth_date ? new Date(`${profile.birth_date}T00:00:00`).toLocaleDateString('es-PA') : 'Sin registrar'} />}
        {!isOrganization && <Field label="Edad" value={profile?.birth_date ? `${calculateAge(profile.birth_date)} años` : 'Sin registrar'} />}
        {!isOrganization && <Field label="Tipo de sangre" value={profile?.blood_type || 'Sin registrar'} />}
        <Field label={isOrganization ? 'Teléfono' : 'Celular'} value={profile?.phone || 'Sin registrar'} />
      </div>
    )}

    {!isOrganization && <section className="mt-8 rounded-2xl border border-[#29485d] bg-[#071d2c] p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-heading text-lg font-bold uppercase">Invitaciones como atleta</p><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">Permite que los equipos te encuentren y te envíen invitaciones para formar parte de sus plantillas.</p></div><label className="inline-flex cursor-pointer items-center gap-3 text-sm font-bold text-white"><input type="checkbox" checked={allowAthleteInvitations} onChange={(event) => void onAthleteInvitationChange(event.target.checked)} className="h-5 w-5 cursor-pointer accent-[#b4ff45]" />{allowAthleteInvitations ? 'Activadas' : 'Desactivadas'}</label></div></section>}
    {canEditRoles && <PersonalRolesEditor roles={roles} onSaved={onRolesSaved} />}
    {message && <p role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm ${messageKind === 'error' ? 'border-red-400/40 bg-red-400/10 text-red-200' : 'border-[#b4ff45]/30 bg-[#b4ff45]/10 text-[#dfffba]'}`}>{message}</p>}
  </div>
}

function PersonalRolesEditor({ roles, onSaved }: { roles: PersonalRole[]; onSaved: (roles: PersonalRole[]) => void }) {
  const [selectedRoles, setSelectedRoles] = useState<PersonalRole[]>(roles)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState('')
  const hasChanges = personalRoleOptions.some(({ value }) => selectedRoles.includes(value) !== roles.includes(value))

  useEffect(() => {
    setSelectedRoles(roles)
  }, [roles])

  function toggleRole(role: PersonalRole) {
    setSelectedRoles((current) => current.includes(role) ? current.filter((item) => item !== role) : [...current, role])
  }

  async function saveRoles() {
    setConfirming(false)
    if (!supabase || selectedRoles.length === 0) {
      setMessage('Selecciona al menos un rol.')
      return
    }
    setSaving(true)
    setMessage('')
    const { data, error } = await supabase.rpc('set_my_personal_roles', { p_roles: selectedRoles })
    if (error) {
      setMessage(error.code === '42883' || error.message.toLowerCase().includes('set_my_personal_roles')
        ? 'Falta aplicar la migración supabase/personal-role-management-migration.sql en Supabase.'
        : error.message)
      setSaving(false)
      return
    }
    const nextRoles = (data ?? selectedRoles) as PersonalRole[]
    onSaved(nextRoles)
    setMessage('Roles actualizados.')
    window.dispatchEvent(new CustomEvent('athlonx-roles-updated', { detail: { roles: nextRoles } }))
    setSaving(false)
  }

  return <section className="mt-8 rounded-2xl border border-[#29485d] bg-[#071d2c] p-5"><div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-heading text-lg font-bold uppercase">Mis roles</p><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">Define cómo participas en AthlonX. Estos son tus roles personales y no reemplazan los roles que te asignen dentro de un equipo u organización.</p><p className="mt-3 text-sm font-semibold text-[#dfffba]">Roles activos: {roles.map((role) => personalRoleOptions.find((option) => option.value === role)?.label).filter(Boolean).join(' · ') || 'Ninguno'}</p></div><button type="button" onClick={() => setConfirming(true)} disabled={!hasChanges || saving} className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar roles'}</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{personalRoleOptions.map(({ value, label }) => { const selected = selectedRoles.includes(value); return <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${selected ? 'border-[#b4ff45]/70 bg-[#b4ff45]/10 text-white' : 'border-[#31556b] text-slate-300 hover:border-[#b4ff45]/50'}`}><input type="checkbox" checked={selected} onChange={() => toggleRole(value)} className="h-5 w-5 accent-[#b4ff45]" /><span className="font-semibold">{label}</span>{selected && <span className="ml-auto rounded-full border border-[#b4ff45]/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#b4ff45]">Activo</span>}</label>})}</div>{message && <p role="status" className="mt-4 text-sm font-semibold text-[#dfffba]">{message}</p>}{confirming && <div role="dialog" aria-modal="true" aria-labelledby="roles-confirm-title" className="mt-5 rounded-xl border border-[#b4ff45]/40 bg-[#102a35] p-4"><p id="roles-confirm-title" className="font-heading text-lg font-bold uppercase">Confirmar actualización</p><p className="mt-2 text-sm leading-6 text-slate-300">¿Seguro que deseas actualizar tus roles personales? Este cambio modificará las vistas disponibles en tu cuenta.</p><div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setConfirming(false)} className="cursor-pointer rounded-xl border border-[#31556b] px-4 py-2 font-bold text-slate-300 hover:border-white/50 hover:text-white">Cancelar</button><button type="button" onClick={() => void saveRoles()} className="cursor-pointer rounded-xl bg-[#b4ff45] px-4 py-2 font-bold text-[#07131e]">Sí, guardar roles</button></div></div>}</section>
}

function PersonalTeamsSection({ teams, disciplines, loading }: { teams: PersonalTeam[]; disciplines: Discipline[]; loading: boolean }) {
  const [disciplineFilter, setDisciplineFilter] = useState('')
  const visibleTeams = disciplineFilter ? teams.filter((team) => team.discipline_id === disciplineFilter) : teams
  const selectedDiscipline = disciplines.find((discipline) => discipline.id === disciplineFilter)?.name

  return <div className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8">
    <div className="flex flex-col gap-5 border-b border-[#263b4d] pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-bold uppercase tracking-[.2em] text-[#b4ff45]">Participación deportiva</p>
        <h2 className="mt-2 font-display text-4xl uppercase">Equipos</h2>
        <p className="mt-2 max-w-2xl text-slate-400">Consulta los equipos a los que perteneces o perteneciste.</p>
      </div>
      <StyledSelect label="Disciplina" value={disciplineFilter} onChange={setDisciplineFilter} options={[{ value: '', label: 'Todas las disciplinas' }, ...disciplines.map((discipline) => ({ value: discipline.id, label: discipline.name }))]} className="w-full sm:w-64" />
    </div>
    {loading ? <p className="mt-8 rounded-2xl border border-dashed border-[#31556b] p-6 text-sm text-slate-400">Cargando equipos...</p> : visibleTeams.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleTeams.map((team) => <Link key={team.id} href={`/dashboard/equipos/${team.id}`} className="group rounded-2xl border border-[#29485d] bg-[#071d2c] p-5 transition hover:border-[#b4ff45]/70 hover:bg-[#102b3e]"><div className="flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#b4ff45] font-display text-xl text-[#07131e]">{team.logo_url ? <img src={team.logo_url} alt={`Logo de ${team.name}`} className="h-full w-full object-cover" /> : team.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><h3 className="truncate font-heading text-xl font-bold uppercase text-white">{team.name}</h3><p className="mt-1 text-sm text-[#b4ff45]">{team.discipline_name}</p></div></div><div className="mt-5 border-t border-white/10 pt-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{team.is_active ? 'Participación activa' : 'Participación anterior'}</p>{team.roles.length > 0 && <p className="mt-2 text-sm text-slate-300">{team.roles.map((role) => teamRoleLabel(role)).join(' · ')}</p>}{team.city && <p className="mt-2 text-sm text-slate-400">{team.city}</p>}{team.athlonx_code && <p className="mt-2 font-mono text-xs text-slate-500">{team.athlonx_code}</p>}</div></Link>)}</div> : <p className="mt-8 rounded-2xl border border-dashed border-[#31556b] p-6 text-sm text-slate-400">{selectedDiscipline ? `No perteneces a ningún equipo de ${selectedDiscipline}.` : 'No perteneces a ningún equipo.'}</p>}
  </div>
}

function teamRoleLabel(role: string) {
  const labels: Record<string, string> = { owner: 'Propietario', directivo: 'Directivo', entrenador: 'Entrenador', staff: 'Staff', atleta: 'Atleta' }
  return labels[role] || role
}

function OrganizationTeams({ teams, disciplines, disciplineFilter, onDisciplineFilterChange }: { teams: OrganizationTeam[]; disciplines: Discipline[]; disciplineFilter: string; onDisciplineFilterChange: (value: string) => void }) {
  const visibleTeams = disciplineFilter ? teams.filter((team) => team.discipline_id === disciplineFilter) : teams
  return <div><p className="text-sm font-bold uppercase tracking-[.2em] text-[#b4ff45]">Equipos vinculados</p><div className="mt-5 flex flex-col gap-4 border-b border-[#263b4d] pb-7 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display text-4xl uppercase">Equipos y roles</h2><p className="mt-2 text-slate-400">Consulta los equipos vinculados a esta organización y sus perfiles deportivos.</p></div><StyledSelect label="Disciplina" value={disciplineFilter} onChange={onDisciplineFilterChange} options={[{ value: '', label: 'Todas las disciplinas' }, ...disciplines.map((discipline) => ({ value: discipline.id, label: discipline.name }))]} className="min-w-48" /></div><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleTeams.map((team) => { const discipline = disciplines.find((item) => item.id === team.discipline_id); const initials = team.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'; return <Link key={team.id} href={`/dashboard/equipos/${team.id}`} className="group rounded-2xl border border-[#29485d] bg-[#0b1d2c] p-5 transition hover:border-[#b4ff45]/70 hover:bg-[#102b3e]"><div className="flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#b4ff45] font-display text-xl text-[#07131e]">{team.logo_url ? <img src={team.logo_url} alt={`Logo de ${team.name}`} className="h-full w-full object-cover" /> : initials}</div><div className="min-w-0"><h3 className="truncate font-heading text-xl font-bold uppercase">{team.name}</h3><p className="mt-1 text-sm text-[#b4ff45]">{discipline?.name || 'Disciplina pendiente'}</p></div><ChevronRight className="ml-auto shrink-0 text-slate-500 transition group-hover:text-[#b4ff45]" size={20} /></div><div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm text-slate-400">{team.city && <p><MapPin className="mr-2 inline" size={15} />{team.city}, {team.country || 'Panamá'}</p>}{team.athlonx_code && <p className="font-mono text-xs text-slate-500">{team.athlonx_code}</p>}</div></Link>})}{!visibleTeams.length && <div className="rounded-2xl border border-dashed border-[#31556b] p-6 text-sm text-slate-400 sm:col-span-2 xl:col-span-3">{teams.length ? 'No hay equipos en esta disciplina.' : 'Todavía no hay equipos vinculados a esta organización.'}</div>}</div></div>
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="border-b border-[#263b4d] pb-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 font-semibold text-white">{value}</p></div>
}

function calculateAge(birthDate: string) {
  const today = new Date()
  const birth = new Date(`${birthDate}T00:00:00`)
  let age = today.getFullYear() - birth.getFullYear()
  const birthdayHasPassed = today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
  if (!birthdayHasPassed) age -= 1
  return Math.max(age, 0)
}

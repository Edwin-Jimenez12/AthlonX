'use client'

import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { LocationFields } from './location-fields'
import { loadAccountContexts, AccountContext } from '../lib/account-contexts'
import { supabase } from '../lib/supabase'

type Discipline = { id: string; name: string; code: string }
type Modality = { id: string; name: string; discipline_id: string }

export default function AuthPanel({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<string[]>(['atleta'])
  const [accountType, setAccountType] = useState<'persona' | 'organizacion' | 'equipo'>('persona')
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [modalities, setModalities] = useState<Modality[]>([])
  const [disciplineError, setDisciplineError] = useState('')
  const [organizationDisciplines, setOrganizationDisciplines] = useState<string[]>([])
  const [organizationModalities, setOrganizationModalities] = useState<string[]>([])
  const [organizationCountry, setOrganizationCountry] = useState('Panamá')
  const [organizationCity, setOrganizationCity] = useState('')
  const [teamDiscipline, setTeamDiscipline] = useState('')
  const [teamCountry, setTeamCountry] = useState('Panamá')
  const [teamCity, setTeamCity] = useState('')
  const [inviteMode, setInviteMode] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const isRegister = mode === 'register'

  useEffect(() => {
    async function loadDisciplines() {
      if (!supabase) return
      const { data, error } = await supabase.from('disciplines').select('id, name, code').eq('is_active', true).in('code', ['rugby', 'baloncesto']).order('name')
      setDisciplines(data ?? [])
      if (error) setDisciplineError('No se pudieron cargar las disciplinas disponibles.')
      const { data: modalityData } = await supabase.from('sport_modalities').select('id, name, discipline_id').eq('is_active', true).order('name')
      setModalities(modalityData ?? [])
    }
    void loadDisciplines()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) {
      setMessage('Falta configurar Supabase en el archivo .env.local.')
      return
    }
    const form = event.currentTarget
    if (inviteMode) {
      setLoading(true)
      try {
        const { data, error } = await supabase.rpc('claim_participation_invite', { p_code: inviteCode })
        if (error) {
          setMessage(error.message)
          return
        }
        const claimed = Array.isArray(data) ? data[0] : data
        setMessage(`Participación confirmada para ${claimed?.full_name ?? 'tu perfil'}.`)
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'No se pudo procesar la invitación.')
      } finally {
        setLoading(false)
      }
      return
    }
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const fullName = (form.elements.namedItem('fullName') as HTMLInputElement | null)?.value ?? ''
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirmation = (form.elements.namedItem('confirmation') as HTMLInputElement | null)?.value
    const publicUsername = (form.elements.namedItem('publicUsername') as HTMLInputElement | null)?.value ?? ''
    const organizationName = (form.elements.namedItem('organizationName') as HTMLInputElement | null)?.value ?? ''
    const organizationType = (form.elements.namedItem('organizationType') as HTMLSelectElement | null)?.value ?? 'organizacion_deportiva'
    const teamName = (form.elements.namedItem('teamName') as HTMLInputElement | null)?.value ?? ''
    if (isRegister && password !== confirmation) {
      setMessage('Las contraseñas no coinciden.')
      return
    }
    if (isRegister && accountType === 'organizacion' && !organizationName.trim()) {
      setMessage('Ingresa el nombre de la organización.')
      return
    }
    if (isRegister && accountType === 'organizacion' && organizationDisciplines.length === 0) {
      setMessage('Selecciona al menos una disciplina para la organización.')
      return
    }
    if (isRegister && accountType === 'equipo' && !teamName.trim()) {
      setMessage('Ingresa el nombre del equipo.')
      return
    }
    if (isRegister && accountType === 'equipo' && !teamDiscipline) {
      setMessage('Selecciona la disciplina del equipo.')
      return
    }
    if (isRegister && accountType === 'equipo' && !teamCity) {
      setMessage('Selecciona la ciudad del equipo.')
      return
    }
    const normalizedUsername = publicUsername.trim().replace(/^@/, '').toLowerCase()
    if (isRegister && !/^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/.test(normalizedUsername)) {
      setMessage('El nombre de usuario debe tener entre 3 y 30 caracteres y usar letras, números, punto, guion o guion bajo.')
      return
    }
    setLoading(true)
    try {
      const result = isRegister
        ? await supabase.auth.signUp({ email, password, options: { data: { full_name: accountType === 'organizacion' ? organizationName : accountType === 'equipo' ? teamName : fullName, public_username: normalizedUsername, roles: accountType === 'organizacion' || accountType === 'equipo' ? ['directivo'] : roles, account_type: accountType, organization_name: organizationName, organization_type: organizationType, organization_country: organizationCountry, organization_city: organizationCity, organization_disciplines: organizationDisciplines, organization_modalities: organizationModalities, team_name: teamName, team_country: teamCountry, team_city: teamCity, team_discipline: teamDiscipline } } })
        : await supabase.auth.signInWithPassword({ email, password })

      if (result.error) {
        const errorMessage = result.error.message.toLowerCase()
        setMessage(errorMessage.includes('database error saving new user')
          ? 'Supabase rechazo el registro del equipo. Ejecuta team-registration-fix-migration.sql en el SQL Editor y vuelve a intentarlo.'
          : errorMessage.includes('already registered')
          ? 'Este correo ya está registrado. Cambia a Iniciar sesión para entrar a tu cuenta.'
          : result.error.message)
        return
      }

      if (isRegister && !result.data.session) {
        setMessage(`Cuenta de ${accountType} creada. Revisa tu correo para confirmar el acceso.`)
        return
      }

      setMessage(isRegister ? 'Cuenta creada correctamente.' : 'Sesión iniciada correctamente.')
      if (result.data.user) await supabase.rpc('ensure_my_public_identity')
      const sessionAccountType = isRegister ? accountType : result.data.user?.user_metadata?.account_type
      let assignedRoles = isRegister ? roles : []
      if (!isRegister && result.data.user) {
        const { data: storedRoles } = await supabase.from('user_roles').select('role').eq('user_id', result.data.user.id)
        assignedRoles = storedRoles?.map(({ role }) => role) ?? []
      }
      const isTrainer = assignedRoles.includes('entrenador') || result.data.user?.user_metadata?.roles?.includes?.('entrenador')
      const isStaff = assignedRoles.includes('staff') || result.data.user?.user_metadata?.roles?.includes?.('staff')
      const contexts = !isRegister && result.data.user ? await loadAccountContexts(result.data.user.id) : []
      const storedContextId = window.localStorage.getItem('athlonx-active-context-id')
      const selectedContext = contexts.find((context) => context.id === storedContextId) ?? contexts[0]
      if (selectedContext) {
        window.localStorage.setItem('athlonx-active-context-id', selectedContext.id)
        if (selectedContext.teamId) window.localStorage.setItem('athlonx-active-team-id', selectedContext.teamId)
      }
      router.push(selectedContext ? routeForContext(selectedContext) : sessionAccountType === 'organizacion' ? '/dashboard/organizaciones' : sessionAccountType === 'equipo' ? '/dashboard/equipo' : isTrainer ? '/dashboard/entrenador' : isStaff ? '/dashboard/staff' : '/dashboard/perfil')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo completar la operación.')
    } finally {
      setLoading(false)
    }
  }

  const activeTabClass = 'border-[#B4FF45] bg-[#B4FF45]/10 text-[#D9FFB1]'
  const inactiveTabClass = 'border-transparent text-slate-400 hover:border-white/30 hover:text-white'
  const fieldClass = 'h-11 w-full rounded-[5px] border border-white/15 bg-white/[.04] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#B4FF45] focus:bg-white/[.06]'
  const selectClass = `${fieldClass} cursor-pointer bg-[#101a24]`

  return (
    <div className="flex max-h-[min(860px,calc(100dvh-2rem))] min-h-0 w-full flex-col overflow-hidden rounded-[5px] border border-white/15 bg-[#0b141e]/95 shadow-2xl backdrop-blur-xl">
      <div className="shrink-0 border-b border-white/10 px-4 pt-4 sm:px-7 sm:pt-5">
        <div className="mb-4 flex items-center justify-between gap-4 pr-10">
          <div>
            <p className="font-heading text-lg uppercase tracking-[.25em] text-[#B4FF45]">AthlonX</p>
          </div>
        </div>
        <nav aria-label="Acceso a AthlonX" className="grid grid-cols-3">
          <button type="button" disabled={loading} onClick={() => { setInviteMode(false); setMode('login'); setMessage('') }} className={`border-b-2 px-2 py-3 text-xs font-semibold transition sm:text-sm ${!isRegister && !inviteMode ? activeTabClass : inactiveTabClass}`}>Iniciar sesión</button>
          <button type="button" disabled={loading} onClick={() => { setInviteMode(false); setMode('register'); setMessage('') }} className={`border-b-2 px-2 py-3 text-xs font-semibold transition sm:text-sm ${isRegister && !inviteMode ? activeTabClass : inactiveTabClass}`}>Registrarse</button>
          <button type="button" disabled={loading} onClick={() => { setInviteMode(true); setMode('login'); setMessage('') }} className={`border-b-2 px-2 py-3 text-xs font-semibold transition sm:text-sm ${inviteMode ? activeTabClass : inactiveTabClass}`}>Invitación</button>
        </nav>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-6 sm:px-7 sm:pb-8 sm:pt-7">
        <div className="max-w-xl">
          <h2 className="font-display text-4xl uppercase leading-none text-white sm:text-5xl">{inviteMode ? 'Ingresa por invitación' : isRegister ? 'Crea tu cuenta' : 'Bienvenido'}</h2>
          <p className=" max-w-lg text-sm leading-6 text-slate-400">{inviteMode ? 'Introduce el código temporal que te proporcionó la organización.' : isRegister && accountType === 'equipo' ? 'Crea el perfil de tu equipo para organizar su actividad deportiva.' : isRegister && accountType === 'organizacion' ? 'Registra tu organización para gestionar torneos y demás actividades.' : isRegister ? 'Crea tu cuenta para conectarte con equipos y organizaciones.' : 'Accede a tu perfil'}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {inviteMode && (
            <label className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-300">
              Código de invitación
              <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} required maxLength={32} className={`${fieldClass} mt-2 font-mono text-base tracking-widest`} placeholder="AX-XXXXXX" />
            </label>
          )}

          {isRegister && (
            <div className="grid grid-cols-3 overflow-hidden rounded-[5px] border border-white/15 bg-black/20">
              {(['persona', 'equipo', 'organizacion'] as const).map((type) => (
                <button key={type} type="button" disabled={loading} onClick={() => setAccountType(type)} className={`border-b-2 px-2 py-3 text-xs font-semibold transition sm:text-sm ${accountType === type ? 'border-[#B4FF45] bg-[#B4FF45]/10 text-[#D9FFB1]' : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                  {type === 'organizacion' ? 'Organización' : type[0].toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          )}

          {isRegister && (
            <label className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-300">
              Identificador público
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-bold text-[#B4FF45]">@</span>
                <input required name="publicUsername" className={`${fieldClass} pl-8`} placeholder="nombre.de.usuario" />
              </div>
            </label>
          )}

          {isRegister && accountType === 'persona' && (
            <>
              <label className="relative block">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#B4FF45]" size={17} />
                <input required name="fullName" className={`${fieldClass} pl-10`} placeholder="Nombre completo" />
              </label>
              <RoleSelector roles={roles} onChange={setRoles} />
            </>
          )}

          {isRegister && accountType === 'equipo' && (
            <section className="space-y-4 rounded-[5px] border border-[#B4FF45]/25 bg-white/[.03] p-4 sm:p-5">
              <div>
                <p className="font-heading text-lg uppercase tracking-wide text-[#B4FF45]">Datos del equipo</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Este perfil representará a tu equipo. Podrás completar la plantilla y los datos deportivos desde su panel.</p>
              </div>
              <input required name="teamName" className={fieldClass} placeholder="Nombre del equipo" />
              <select required name="teamDiscipline" value={teamDiscipline} onChange={(event) => setTeamDiscipline(event.target.value)} className={selectClass}>
                <option value="">{disciplineError ? 'Disciplinas no disponibles' : 'Seleccionar disciplina'}</option>
                {disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}
              </select>
              {disciplineError && <p className="text-xs leading-5 text-amber-200">{disciplineError}</p>}
              <LocationFields country={teamCountry} city={teamCity} onCountryChange={setTeamCountry} onCityChange={setTeamCity} />
            </section>
          )}

          {isRegister && accountType === 'organizacion' && (
            <section className="space-y-4 rounded-[5px] border border-[#B4FF45]/25 bg-white/[.03] p-4 sm:p-5">
              <div>
                <p className="font-heading text-lg uppercase tracking-wide text-[#B4FF45]">Datos de la organización</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Define la identidad institucional y las disciplinas que administra.</p>
              </div>
              <input required name="organizationName" className={fieldClass} placeholder="Nombre de la organización" />
              <select name="organizationType" className={selectClass}>
                <option value="organizacion_deportiva">Organización deportiva</option>
                <option value="comite_olimpico">Comité olímpico</option>
                <option value="institucion_gubernamental">Institución gubernamental</option>
                <option value="federacion">Federación</option>
                <option value="union">Unión</option>
                <option value="liga">Liga</option>
                <option value="otro">Otro</option>
              </select>
              <LocationFields country={organizationCountry} city={organizationCity} onCountryChange={setOrganizationCountry} onCityChange={setOrganizationCity} />
              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-[.12em] text-slate-300">Disciplinas representadas</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {disciplines.map((discipline) => <label key={discipline.id} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[5px] border border-white/10 px-3 text-sm text-slate-300 transition hover:border-[#B4FF45]/50"><input type="checkbox" checked={organizationDisciplines.includes(discipline.id)} onChange={(event) => setOrganizationDisciplines((current) => event.target.checked ? [...current, discipline.id] : current.filter((id) => id !== discipline.id))} className="accent-[#B4FF45]" />{discipline.name}</label>)}
                </div>
              </fieldset>
              {organizationDisciplines.length > 0 && <fieldset className="rounded-[5px]"><legend className="text-xs font-semibold uppercase tracking-[.12em] text-slate-300">Modalidades que maneja</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{modalities.filter((modality) => organizationDisciplines.includes(modality.discipline_id)).map((modality) => <label key={modality.id} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[5px] border border-white/10 px-3 text-sm text-slate-300 transition hover:border-[#B4FF45]/50"><input type="checkbox" checked={organizationModalities.includes(modality.id)} onChange={(event) => setOrganizationModalities((current) => event.target.checked ? [...current, modality.id] : current.filter((id) => id !== modality.id))} className="accent-[#B4FF45]" />{modality.name}</label>)}</div></fieldset>}
            </section>
          )}

          {!inviteMode && <FieldWithIcon icon={<Mail size={17} />}><input required name="email" type="email" className="h-11 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" placeholder="Correo electrónico" /></FieldWithIcon>}
          {!inviteMode && <PasswordField name="password" placeholder="Contraseña" visible={showPassword} onToggle={() => setShowPassword((current) => !current)} />}
          {isRegister && !inviteMode && <PasswordField name="confirmation" placeholder="Confirmar contraseña" visible={showConfirmation} onToggle={() => setShowConfirmation((current) => !current)} />}

          <button type="submit" disabled={loading} aria-busy={loading} className="font-heading inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[5px] bg-[#B4FF45] px-4 text-base font-bold text-[#10151b] transition hover:bg-[#C8FF7A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4FF45] disabled:cursor-wait disabled:opacity-60 sm:text-lg">
            {loading && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}
            {loading ? (inviteMode ? 'Verificando invitación' : isRegister ? 'Creando cuenta' : 'Iniciando sesión') : inviteMode ? 'Confirmar participación' : isRegister ? 'Crear cuenta' : 'Entrar a mi cuenta'}
          </button>
        </form>
        {message && <p role="status" aria-live="polite" className="mt-4 rounded-[5px] border border-[#B4FF45]/30 bg-[#B4FF45]/10 p-3 text-sm leading-5 text-[#D9FFB1]">{message}</p>}
      </div>
    </div>
  )
}

function routeForContext(context: AccountContext) {
  if (context.contextType === 'organization') return '/dashboard/organizaciones'
  if (context.role === 'entrenador') return '/dashboard/entrenador'
  if (context.role === 'staff') return '/dashboard/staff'
  if (context.role === 'atleta') return '/dashboard/atleta'
  if (context.contextType === 'team') return '/dashboard/equipo'
  return '/dashboard/perfil'
}

function FieldWithIcon({ icon, children }: { icon: ReactNode; children: ReactNode }) {
    return <div className="flex min-h-11 items-center gap-3 rounded-[5px] border border-white/15 bg-white/[.04] px-3 focus-within:border-[#B4FF45]"><span className="shrink-0 text-[#B4FF45]">{icon}</span>{children}</div>
}

function PasswordField({ name, placeholder, visible, onToggle }: { name: string; placeholder: string; visible: boolean; onToggle: () => void }) {
  return <FieldWithIcon icon={<LockKeyhole size={17} />}><input required name={name} type={visible ? 'text' : 'password'} className="h-11 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" placeholder={placeholder} /><button type="button" aria-label={visible ? `Ocultar ${placeholder.toLowerCase()}` : `Mostrar ${placeholder.toLowerCase()}`} onClick={onToggle} className="shrink-0 text-slate-400 transition hover:text-[#B4FF45]">{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></FieldWithIcon>
}

function RoleSelector({ roles, onChange }: { roles: string[]; onChange: (roles: string[]) => void }) {
  const availableRoles = [
    ['atleta', 'Atleta'],
    ['entrenador', 'Entrenador'],
    ['staff', 'Staff'],
    ['directivo', 'Directivo'],
  ]

  function toggleRole(role: string) {
    const nextRoles = roles.includes(role)
      ? roles.filter((currentRole) => currentRole !== role)
      : [...roles, role]

    onChange(nextRoles.length ? nextRoles : ['atleta'])
  }

  return (
    <fieldset className="rounded-[5px] border border-white/15 bg-white/[.03] p-4">
      <legend className="px-1 text-sm font-semibold text-slate-300">¿Cómo utilizarás AthlonX?</legend>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {availableRoles.map(([value, label]) => (
          <label key={value} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[5px] border border-transparent px-2 text-sm text-slate-300 transition hover:border-white/15 hover:bg-white/[.03]">
            <input type="checkbox" checked={roles.includes(value)} onChange={() => toggleRole(value)} className="accent-[#B4FF45]" />
            {label}
          </label>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">Puedes cambiar tus roles y vincularte a una organización después.</p>
    </fieldset>
  )
}

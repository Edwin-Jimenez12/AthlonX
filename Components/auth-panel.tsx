'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
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
      const { data, error } = await supabase.rpc('claim_participation_invite', { p_code: inviteCode })
      setLoading(false)
      if (error) {
        setMessage(error.message)
        return
      }
      const claimed = Array.isArray(data) ? data[0] : data
      setMessage(`Participación confirmada para ${claimed?.full_name ?? 'tu perfil'}.`)
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
    const normalizedUsername = publicUsername.trim().replace(/^@/, '').toLowerCase()
    if (isRegister && !/^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/.test(normalizedUsername)) {
      setMessage('El nombre de usuario debe tener entre 3 y 30 caracteres y usar letras, números, punto, guion o guion bajo.')
      return
    }
    setLoading(true)
    const result = isRegister
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: accountType === 'organizacion' ? organizationName : accountType === 'equipo' ? teamName : fullName, public_username: normalizedUsername, roles: accountType === 'organizacion' || accountType === 'equipo' ? ['directivo'] : roles, account_type: accountType, organization_name: organizationName, organization_type: organizationType, organization_country: organizationCountry, organization_city: organizationCity, organization_disciplines: organizationDisciplines, organization_modalities: organizationModalities, team_name: teamName, team_country: teamCountry, team_city: teamCity, team_discipline: teamDiscipline } } })
      : await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (result.error) {
      const errorMessage = result.error.message.toLowerCase()
      setMessage(errorMessage.includes('database error saving new user')
        ? 'No se pudo crear la cuenta. Revisa la configuración de Supabase y vuelve a intentarlo.'
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
  }

  return (
    <div className="w-full max-w-2xl rounded-3xl border border-white/15 bg-[#0b141e]/90 p-6 shadow-2xl backdrop-blur-xl md:p-9">
      <div className="mb-7 grid grid-cols-3 rounded-xl bg-black/25 p-1">
        <button type="button" onClick={() => { setInviteMode(false); setMode('login'); setMessage('') }} className={`rounded-lg px-3 py-3 font-heading text-base transition ${!isRegister && !inviteMode ? 'bg-[#B4FF45] text-[#10151b]' : 'text-slate-300 hover:text-white'}`}>Iniciar sesión</button>
        <button type="button" onClick={() => { setInviteMode(false); setMode('register'); setMessage('') }} className={`rounded-lg px-3 py-3 font-heading text-base transition ${isRegister && !inviteMode ? 'bg-[#B4FF45] text-[#10151b]' : 'text-slate-300 hover:text-white'}`}>Registrarse</button>
        <button type="button" onClick={() => { setInviteMode(true); setMode('login'); setMessage('') }} className={`rounded-lg px-3 py-3 font-heading text-base transition ${inviteMode ? 'bg-[#B4FF45] text-[#10151b]' : 'text-slate-300 hover:text-white'}`}>Invitación</button>
      </div>
      <p className="font-heading text-xs uppercase tracking-[.3em] text-[#B4FF45]">AthlonX sevens</p>
      <h2 className="font-display mt-2 text-4xl uppercase">{inviteMode ? 'Ingresa por invitación' : isRegister ? 'Crea tu cuenta' : 'Bienvenido'}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{inviteMode ? 'Introduce el código temporal que te proporcionó la organización.' : isRegister && accountType === 'equipo' ? 'Crea el perfil de tu equipo para organizar su actividad deportiva.' : isRegister && accountType === 'organizacion' ? 'Registra tu organización para gestionar torneos de Rugby y Baloncesto.' : isRegister ? 'Crea tu cuenta personal para conectarte con equipos y organizaciones.' : 'Accede a tu gestión de torneos.'}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        {inviteMode && <label className="block rounded-xl border border-white/15 bg-white/5 p-4 text-sm font-semibold text-slate-300">Código de invitación<input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} required maxLength={32} className="mt-2 w-full bg-transparent font-mono text-lg tracking-widest text-white outline-none placeholder:text-slate-500" placeholder="AX-XXXXXX" /></label>}
        {isRegister && <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/20 p-1"><button type="button" onClick={() => setAccountType('persona')} className={`cursor-pointer rounded-lg px-2 py-2 text-sm font-semibold ${accountType === 'persona' ? 'bg-[#B4FF45] text-[#10151b]' : 'text-slate-300'}`}>Persona</button><button type="button" onClick={() => setAccountType('equipo')} className={`cursor-pointer rounded-lg px-2 py-2 text-sm font-semibold ${accountType === 'equipo' ? 'bg-[#B4FF45] text-[#10151b]' : 'text-slate-300'}`}>Equipo</button><button type="button" onClick={() => setAccountType('organizacion')} className={`cursor-pointer rounded-lg px-2 py-2 text-sm font-semibold ${accountType === 'organizacion' ? 'bg-[#B4FF45] text-[#10151b]' : 'text-slate-300'}`}>Organización</button></div>}
        {isRegister && <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3"><span className="text-lg font-bold text-[#B4FF45]">@</span><input required name="publicUsername" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="nombre.de.usuario" /><span className="hidden text-xs text-slate-500 sm:block">Identificador público</span></label>}
        {isRegister && accountType === 'persona' && <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3"><UserRound className="text-[#B4FF45]" size={18} /><input required name="fullName" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Nombre completo" /></label>}
        {isRegister && accountType === 'persona' && <RoleSelector roles={roles} onChange={setRoles} />}
        {isRegister && accountType === 'equipo' && <div className="space-y-3 rounded-xl border border-[#B4FF45]/30 bg-white/5 p-4"><p className="text-sm font-semibold text-[#B4FF45]">Datos del equipo</p><p className="text-xs leading-5 text-slate-400">Este perfil representará a tu equipo. Podrás completar la plantilla y los datos deportivos desde su panel.</p><input required name="teamName" className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-sm outline-none placeholder:text-slate-500" placeholder="Nombre del equipo" /><select required name="teamDiscipline" value={teamDiscipline} onChange={(event) => setTeamDiscipline(event.target.value)} className="w-full rounded-lg border border-white/15 bg-[#101a24] px-3 py-3 text-sm text-white outline-none"><option value="">{disciplineError ? 'Disciplinas no disponibles' : 'Seleccionar disciplina'}</option>{disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}</select>{disciplineError && <p className="text-xs leading-5 text-amber-200">{disciplineError}</p>}<LocationFields country={teamCountry} city={teamCity} onCountryChange={setTeamCountry} onCityChange={setTeamCity} /></div>}
        {isRegister && accountType === 'organizacion' && <div className="space-y-3 rounded-xl border border-[#B4FF45]/30 bg-white/5 p-4"><p className="text-sm font-semibold text-[#B4FF45]">Datos de la organización</p><input required name="organizationName" className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-sm outline-none placeholder:text-slate-500" placeholder="Nombre de la organización" /><select name="organizationType" className="w-full rounded-lg border border-white/15 bg-[#101a24] px-3 py-3 text-sm text-white outline-none"><option value="organizacion_deportiva">Organización deportiva</option><option value="comite_olimpico">Comité olímpico</option><option value="institucion_gubernamental">Institución gubernamental</option><option value="federacion">Federación</option><option value="union">Unión</option><option value="liga">Liga</option><option value="otro">Otro</option></select><LocationFields country={organizationCountry} city={organizationCity} onCountryChange={setOrganizationCountry} onCityChange={setOrganizationCity} /><fieldset><legend className="text-sm font-semibold text-slate-300">Disciplinas representadas</legend><div className="mt-2 grid grid-cols-2 gap-2">{disciplines.map((discipline) => <label key={discipline.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300"><input type="checkbox" checked={organizationDisciplines.includes(discipline.id)} onChange={(event) => setOrganizationDisciplines((current) => event.target.checked ? [...current, discipline.id] : current.filter((id) => id !== discipline.id))} className="accent-[#B4FF45]" />{discipline.name}</label>)}</div></fieldset>{organizationDisciplines.length > 0 && <fieldset><legend className="text-sm font-semibold text-slate-300">Modalidades que maneja</legend><div className="mt-2 grid grid-cols-2 gap-2">{modalities.filter((modality) => organizationDisciplines.includes(modality.discipline_id)).map((modality) => <label key={modality.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300"><input type="checkbox" checked={organizationModalities.includes(modality.id)} onChange={(event) => setOrganizationModalities((current) => event.target.checked ? [...current, modality.id] : current.filter((id) => id !== modality.id))} className="accent-[#B4FF45]" />{modality.name}</label>)}</div></fieldset>}</div>}
        {!inviteMode && <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3"><Mail className="text-[#B4FF45]" size={18} /><input required name="email" type="email" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Correo electrónico" /></label>}
        {!inviteMode && <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3"><LockKeyhole className="text-[#B4FF45]" size={18} /><input required name="password" type={showPassword ? 'text' : 'password'} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Contraseña" /><button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-[#B4FF45]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></label>}
        {isRegister && !inviteMode && <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3"><LockKeyhole className="text-[#B4FF45]" size={18} /><input required name="confirmation" type={showConfirmation ? 'text' : 'password'} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Confirmar contraseña" /><button type="button" aria-label={showConfirmation ? 'Ocultar confirmación' : 'Mostrar confirmación'} onClick={() => setShowConfirmation(!showConfirmation)} className="text-slate-400 hover:text-[#B4FF45]">{showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}</button></label>}
        <button type="submit" disabled={loading} className="font-heading w-full cursor-pointer rounded-xl bg-[#B4FF45] py-3.5 text-lg font-bold text-[#10151b] transition hover:bg-[#c8ff7a] disabled:cursor-wait disabled:opacity-60">{loading ? 'Procesando...' : inviteMode ? 'Confirmar participación' : isRegister ? 'Crear cuenta' : 'Entrar a mi cuenta'}</button>
      </form>
      {message && <p className="mt-4 rounded-xl border border-[#B4FF45]/30 bg-[#B4FF45]/10 p-3 text-sm text-[#d9ffb1]">{message}</p>}
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
    <fieldset className="rounded-xl border border-white/15 bg-white/5 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-300">¿Cómo utilizarás AthlonX?</legend>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {availableRoles.map(([value, label]) => (
          <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={roles.includes(value)} onChange={() => toggleRole(value)} className="accent-[#B4FF45]" />
            {label}
          </label>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">Puedes cambiar tus roles y vincularte a una organización después.</p>
    </fieldset>
  )
}

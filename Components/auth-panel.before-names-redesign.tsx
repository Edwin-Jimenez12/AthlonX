'use client'

import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ChevronLeft, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, Search, UserRound, Users, X } from 'lucide-react'
import { LocationFields } from './location-fields'
import { StyledSelect } from './styled-select'
import { loadAccountContexts } from '../lib/account-contexts'
import { supabase } from '../lib/supabase'

type Discipline = { id: string; name: string; code: string }
type AuthView = 'login' | 'register' | 'forgot' | 'reset'
type AccountType = 'persona' | 'equipo' | 'organizacion'

const ACCOUNT_LABEL: Record<AccountType, string> = { persona: 'Persona', equipo: 'Equipo', organizacion: 'Organización' }

// Animación de entrada entre pasos. Se desactiva si el usuario pide movimiento reducido.
const STEP_STYLES = `
@keyframes athlonxStepIn { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
.athlonx-step { animation: athlonxStepIn 420ms cubic-bezier(.22,.8,.2,1) both; }
@media (prefers-reduced-motion: reduce) { .athlonx-step { animation: none; } }
`

export default function AuthPanel({ initialMode = 'login' }: { initialMode?: AuthView }) {
  const router = useRouter()
  const [view, setView] = useState<AuthView>(initialMode)
  const [registerStep, setRegisterStep] = useState<'type' | 'form'>('type')
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<string[]>(['atleta'])
  const [accountType, setAccountType] = useState<AccountType>('persona')
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [disciplineError, setDisciplineError] = useState('')
  const [organizationDisciplines, setOrganizationDisciplines] = useState<string[]>([])
  const [organizationCountry, setOrganizationCountry] = useState('Panamá')
  const [organizationCity, setOrganizationCity] = useState('')
  const [organizationType, setOrganizationType] = useState('organizacion_deportiva')
  const [teamDiscipline, setTeamDiscipline] = useState('')
  const [teamCountry, setTeamCountry] = useState('Panamá')
  const [teamCity, setTeamCity] = useState('')
  const isRegister = view === 'register'

  useEffect(() => {
    async function loadDisciplines() {
      if (!supabase) return
      const { data, error } = await supabase
        .from('disciplines')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name')
      setDisciplines(data ?? [])
      if (error) setDisciplineError('No se pudieron cargar las disciplinas disponibles.')
      else if (!data?.length) setDisciplineError('No hay disciplinas activas disponibles. Ejecuta la migración de acceso público en Supabase.')
      else setDisciplineError('')
    }
    void loadDisciplines()
  }, [])

  // Cambia la vista cuando el modal recibe otra petición (por ejemplo, un enlace de restablecimiento).
  useEffect(() => {
    setView(initialMode)
    setRegisterStep('type')
    setMessage('')
  }, [initialMode])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) {
      setMessage('Falta configurar Supabase en el archivo .env.local.')
      return
    }
    const form = event.currentTarget
    if (view === 'forgot') {
      await sendResetLink()
      return
    }
    if (view === 'reset') {
      await saveNewPassword(form)
      return
    }
    const fullName = (form.elements.namedItem('fullName') as HTMLInputElement | null)?.value ?? ''
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirmation = (form.elements.namedItem('confirmation') as HTMLInputElement | null)?.value
    const publicUsername = (form.elements.namedItem('publicUsername') as HTMLInputElement | null)?.value ?? ''
    const organizationName = (form.elements.namedItem('organizationName') as HTMLInputElement | null)?.value ?? ''
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
    if (isRegister && accountType === 'equipo' && !teamCity.trim()) {
      setMessage('Ingresa la ciudad del equipo.')
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
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: accountType === 'organizacion' ? organizationName : accountType === 'equipo' ? teamName : fullName,
                public_username: normalizedUsername,
                roles: accountType === 'persona' ? roles : ['directivo'],
                account_type: accountType,
                organization_name: organizationName,
                organization_type: organizationType,
                organization_country: organizationCountry,
                organization_city: organizationCity,
                organization_disciplines: organizationDisciplines,
                team_name: teamName,
                team_country: teamCountry,
                team_city: teamCity,
                team_discipline: teamDiscipline,
              },
            },
          })
        : await supabase.auth.signInWithPassword({ email, password })

      if (result.error) {
        const errorMessage = result.error.message.toLowerCase()
        setMessage(errorMessage.includes('database error saving new user')
          ? 'Supabase rechazó el registro. Ejecuta registration-accounts-migration.sql en el SQL Editor y vuelve a intentarlo.'
          : errorMessage.includes('already registered')
          ? 'Este correo ya está registrado. Cambia a Iniciar sesión para entrar a tu cuenta.'
          : result.error.message)
        return
      }

      if (isRegister && !result.data.session) {
        setMessage(`Cuenta de ${ACCOUNT_LABEL[accountType]} creada. Revisa tu correo para confirmar el acceso.`)
        return
      }

      setMessage(isRegister ? 'Cuenta creada correctamente.' : 'Sesión iniciada correctamente.')
      const sessionAccountType = isRegister ? accountType : result.data.user?.user_metadata?.account_type
      if (result.data.user) {
        await supabase.rpc('ensure_my_public_identity')
        const { error: organizationError } = await supabase.rpc('ensure_my_organization')
        if (organizationError && sessionAccountType === 'organizacion') {
          setMessage(`No se pudo preparar la cuenta de organización: ${organizationError.message}`)
          return
        }
      }
      const contexts = !isRegister && result.data.user ? await loadAccountContexts(result.data.user.id) : []
      const storedContextId = window.localStorage.getItem('athlonx-active-context-id')
      const selectedContext = contexts.find((context) => context.id === storedContextId) ?? contexts[0]
      if (selectedContext) {
        window.localStorage.setItem('athlonx-active-context-id', selectedContext.id)
        if (selectedContext.teamId) window.localStorage.setItem('athlonx-active-team-id', selectedContext.teamId)
      }
      router.push('/dashboard/busqueda')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo completar la operación.')
    } finally {
      setLoading(false)
    }
  }

  // Envía el enlace de restablecimiento al correo escrito en el inicio de sesión.
  async function sendResetLink() {
    if (!supabase) return
    const address = email.trim()
    if (!address) {
      setMessage('Escribe el correo de tu cuenta.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: `${window.location.origin}/` })
      if (error) {
        setMessage(error.message)
        return
      }
      setMessage(`Te enviaremos un correo a ${address} con el enlace para restablecer tu contraseña. El enlace es de un solo uso: si ya lo usaste o venció, pide uno nuevo. Revisa también tu carpeta de spam.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo enviar el correo.')
    } finally {
      setLoading(false)
    }
  }

  // Guarda la nueva contraseña del enlace y pide iniciar sesión de nuevo.
  async function saveNewPassword(form: HTMLFormElement) {
    if (!supabase) return
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirmation = (form.elements.namedItem('confirmation') as HTMLInputElement).value
    if (password.length < 8) {
      setMessage('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmation) {
      setMessage('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setMessage(error.message)
        return
      }
      window.localStorage.removeItem('athlonx-recovery-pending')
      await supabase.auth.signOut()
      window.history.replaceState(null, '', window.location.pathname)
      setEmail(userData.user?.email ?? '')
      setView('login')
      setMessage('Tu contraseña fue actualizada. Inicia sesión con tu nueva contraseña.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo actualizar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  function goToTypeStep() {
    setRegisterStep('type')
    setMessage('')
  }

  const activeTabClass = 'border-[#B4FF45] bg-[#B4FF45]/10 text-[#D9FFB1]'
  const inactiveTabClass = 'border-transparent text-slate-400 hover:border-white/30 hover:text-white'
  const fieldClass = 'h-11 w-full rounded-[5px] border border-white/15 bg-white/[.04] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#B4FF45] focus:bg-white/[.06]'
  const showTypeStep = isRegister && registerStep === 'type'

  const headline = view === 'forgot'
    ? 'Recupera tu acceso'
    : view === 'reset'
    ? 'Crea una nueva contraseña'
    : showTypeStep
    ? 'Elige tu cuenta'
    : isRegister
    ? 'Crea tu cuenta'
    : 'Bienvenido'

  const description = view === 'forgot'
    ? 'Te enviaremos un enlace a tu correo para crear una nueva contraseña.'
    : view === 'reset'
    ? 'Escribe tu nueva contraseña para volver a entrar a AthlonX.'
    : showTypeStep
    ? 'Selecciona el tipo de cuenta que necesitas. Después completas solo los datos que corresponden.'
    : isRegister && accountType === 'equipo'
    ? 'Crea el perfil de tu equipo para organizar su actividad deportiva.'
    : isRegister && accountType === 'organizacion'
    ? 'Registra tu organización para gestionar torneos y demás actividades.'
    : isRegister
    ? 'Crea tu cuenta para participar, seguir torneos y conectarte con equipos y organizaciones.'
    : 'Accede a tu perfil'

  return (
    <div className="flex max-h-[min(860px,calc(100dvh-2rem))] min-h-0 w-full flex-col overflow-hidden rounded-[5px] border border-white/15 bg-[#0b141e]/95 shadow-2xl backdrop-blur-xl">
      <style>{STEP_STYLES}</style>
      <div className="shrink-0 border-b border-white/10 px-4 pt-4 sm:px-7 sm:pt-5">
        <div className="mb-4 flex items-center justify-between gap-4 pr-10">
          <div>
            <p className="font-heading text-lg uppercase tracking-[.25em] text-[#B4FF45]">AthlonX</p>
          </div>
        </div>
        {(view === 'login' || view === 'register') && (
          <nav aria-label="Acceso a AthlonX" className="grid grid-cols-2">
            <button type="button" disabled={loading} onClick={() => { setView('login'); setMessage('') }} className={`border-b-2 px-2 py-3 text-xs font-semibold transition sm:text-sm ${view === 'login' ? activeTabClass : inactiveTabClass}`}>Iniciar sesión</button>
            <button type="button" disabled={loading} onClick={() => { setView('register'); goToTypeStep() }} className={`border-b-2 px-2 py-3 text-xs font-semibold transition sm:text-sm ${view === 'register' ? activeTabClass : inactiveTabClass}`}>Registrarse</button>
          </nav>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-6 sm:px-7 sm:pb-8 sm:pt-7">
        <div className="max-w-xl">
          <h2 className="font-display text-4xl uppercase leading-none text-white sm:text-5xl">{headline}</h2>
          <p className="max-w-lg text-sm leading-6 text-slate-400">{description}</p>
        </div>

        {showTypeStep ? (
          <AccountTypeStep
            onSelect={(type) => {
              setAccountType(type)
              setRegisterStep('form')
              setMessage('')
            }}
          />
        ) : (
          <form onSubmit={handleSubmit} className="mt-6">
            {/* La clave cambia con la vista o el tipo de cuenta: cada paso entra con su propia animación. */}
            <div key={`${view}-${accountType}`} className="athlonx-step space-y-4">
              {isRegister && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <button type="button" disabled={loading} onClick={goToTypeStep} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-300 transition hover:text-white">
                      <ChevronLeft size={16} aria-hidden="true" />
                      Cambiar tipo
                    </button>
                    <span className="text-xs font-semibold uppercase tracking-[.14em] text-[#B4FF45]">Paso 2 de 2 · {ACCOUNT_LABEL[accountType]}</span>
                  </div>
                  <RegisterProgress step={2} />
                </div>
              )}

              {isRegister && accountType === 'persona' && (
                <label className="relative block">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#B4FF45]" size={17} />
                  <input required name="fullName" className={`${fieldClass} pl-10`} placeholder="Nombre completo" />
                </label>
              )}

              {isRegister && accountType === 'equipo' && (
                <input required name="teamName" className={fieldClass} placeholder="Nombre del equipo" aria-label="Nombre del equipo" />
              )}

              {isRegister && accountType === 'organizacion' && (
                <input required name="organizationName" className={fieldClass} placeholder="Nombre de la organización" aria-label="Nombre de la organización" />
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

              {isRegister && accountType === 'persona' && <RoleSelector roles={roles} onChange={setRoles} />}

              {isRegister && accountType === 'equipo' && (
                <>
                  <StyledSelect label="Disciplina" name="teamDiscipline" value={teamDiscipline} onChange={setTeamDiscipline} options={disciplines.map((discipline) => ({ value: discipline.id, label: discipline.name }))} placeholder={disciplineError ? 'Disciplinas no disponibles' : 'Seleccionar disciplina'} required />
                  <LocationFields country={teamCountry} city={teamCity} onCountryChange={setTeamCountry} onCityChange={setTeamCity} />
                </>
              )}

              {isRegister && accountType === 'organizacion' && (
                <>
                  <StyledSelect label="Tipo de organización" name="organizationType" value={organizationType} onChange={setOrganizationType} options={[
                    { value: 'organizacion_deportiva', label: 'Organización deportiva' },
                    { value: 'comite_olimpico', label: 'Comité olímpico' },
                    { value: 'institucion_gubernamental', label: 'Institución gubernamental' },
                    { value: 'federacion', label: 'Federación' },
                    { value: 'union', label: 'Unión' },
                    { value: 'liga', label: 'Liga' },
                    { value: 'otro', label: 'Otro' },
                  ]} />
                  <LocationFields country={organizationCountry} city={organizationCity} onCountryChange={setOrganizationCountry} onCityChange={setOrganizationCity} />
                  <DisciplinePicker disciplines={disciplines} selected={organizationDisciplines} onChange={setOrganizationDisciplines} emptyMessage={disciplineError || 'Cargando disciplinas...'} />
                </>
              )}

              {view !== 'reset' && <FieldWithIcon icon={<Mail size={17} />}><input required name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" placeholder="Correo electrónico" /></FieldWithIcon>}
              {(view === 'login' || view === 'register' || view === 'reset') && <PasswordField name="password" placeholder={view === 'reset' ? 'Nueva contraseña' : 'Contraseña'} visible={showPassword} onToggle={() => setShowPassword((current) => !current)} />}
              {view === 'login' && (
                <div className="-mt-1 text-right">
                  <button type="button" disabled={loading} onClick={() => { setView('forgot'); setMessage('') }} className="text-sm font-semibold text-[#B4FF45] transition hover:text-white">¿Olvidaste tu contraseña?</button>
                </div>
              )}
              {(isRegister || view === 'reset') && <PasswordField name="confirmation" placeholder={view === 'reset' ? 'Confirmar nueva contraseña' : 'Confirmar contraseña'} visible={showConfirmation} onToggle={() => setShowConfirmation((current) => !current)} />}

              <button type="submit" disabled={loading} aria-busy={loading} className="font-heading inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[5px] bg-[#B4FF45] px-4 text-base font-bold text-[#10151b] transition hover:bg-[#C8FF7A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4FF45] disabled:cursor-wait disabled:opacity-60 sm:text-lg">
                {loading && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}
                {loading ? (isRegister ? 'Creando cuenta' : 'Procesando') : view === 'forgot' ? 'Enviar enlace' : view === 'reset' ? 'Guardar contraseña' : isRegister ? 'Crear cuenta' : 'Entrar a mi cuenta'}
              </button>
              {(view === 'forgot' || view === 'reset') && (
                <button type="button" disabled={loading} onClick={() => { setView('login'); setMessage('') }} className="mx-auto block text-sm font-semibold text-slate-300 transition hover:text-white">← Volver a iniciar sesión</button>
              )}
            </div>
          </form>
        )}

        {message && <p role="status" aria-live="polite" className="mt-4 rounded-[5px] border border-[#B4FF45]/30 bg-[#B4FF45]/10 p-3 text-sm leading-5 text-[#D9FFB1]">{message}</p>}
      </div>
    </div>
  )
}

// Paso 1: tres tarjetas grandes. Al elegir una, el formulario se muestra solo con sus campos.
function AccountTypeStep({ onSelect }: { onSelect: (type: AccountType) => void }) {
  const options: { type: AccountType; title: string; text: string; Icon: typeof UserRound }[] = [
    { type: 'persona', title: 'Persona', text: 'Atletas, entrenadores, staff o directivos que participan o siguen torneos.', Icon: UserRound },
    { type: 'equipo', title: 'Equipo', text: 'Un equipo con su disciplina, ciudad y plantilla.', Icon: Users },
    { type: 'organizacion', title: 'Organización', text: 'Instituciones, ligas o federaciones que organizan torneos y disciplinas.', Icon: Building2 },
  ]

  return (
    <div className="athlonx-step mt-6 space-y-4">
      <div className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-[.14em] text-[#B4FF45]">Paso 1 de 2 · Tipo de cuenta</span>
        <RegisterProgress step={1} />
      </div>
      <div className="grid gap-3">
        {options.map(({ type, title, text, Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className="group flex items-center gap-4 rounded-[5px] border border-white/15 bg-white/[.03] p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:border-[#B4FF45] hover:bg-[#B4FF45]/[.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4FF45] active:scale-[.99]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[5px] border border-[#B4FF45]/40 text-[#B4FF45] transition duration-300 group-hover:scale-105 group-hover:bg-[#B4FF45] group-hover:text-[#10151b]">
              <Icon size={22} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-heading block text-lg font-bold text-white">{title}</span>
              <span className="mt-1 block text-sm leading-5 text-slate-400">{text}</span>
            </span>
            <ChevronLeft size={18} aria-hidden="true" className="shrink-0 rotate-180 text-slate-500 transition duration-300 group-hover:translate-x-1 group-hover:text-[#B4FF45]" />
          </button>
        ))}
      </div>
    </div>
  )
}

function RegisterProgress({ step }: { step: 1 | 2 }) {
  return (
    <div className="h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
      <div className={`h-full rounded-full bg-[#B4FF45] transition-[width] duration-500 ease-out ${step === 1 ? 'w-1/2' : 'w-full'}`} />
    </div>
  )
}

// Disciplinas de una organización. Con muchas disciplinas aparece un buscador y la lista tiene desplazamiento.
function DisciplinePicker({ disciplines, selected, onChange, emptyMessage }: { disciplines: Discipline[]; selected: string[]; onChange: (ids: string[]) => void; emptyMessage: string }) {
  const [query, setQuery] = useState('')
  const normalizedQuery = normalizeText(query.trim())
  const visible = disciplines.filter((discipline) => normalizeText(discipline.name).includes(normalizedQuery))
  const selectedDisciplines = disciplines.filter((discipline) => selected.includes(discipline.id))

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((currentId) => currentId !== id) : [...selected, id])
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-semibold uppercase tracking-[.12em] text-slate-300">
        Disciplinas que representa <span className="normal-case tracking-normal text-slate-500">({selected.length} seleccionadas)</span>
      </legend>

      {selectedDisciplines.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedDisciplines.map((discipline) => (
            <span key={discipline.id} className="inline-flex items-center gap-1 rounded-full border border-[#B4FF45]/50 bg-[#B4FF45]/10 py-1 pl-3 pr-1 text-xs font-semibold text-[#D9FFB1]">
              {discipline.name}
              <button type="button" aria-label={`Quitar ${discipline.name}`} onClick={() => toggle(discipline.id)} className="inline-flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-white/10">
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {disciplines.length > 6 && (
        <div className="relative">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#B4FF45]" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar disciplina" aria-label="Buscar disciplina" className="h-10 w-full rounded-[5px] border border-white/15 bg-white/[.04] pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#B4FF45]" />
        </div>
      )}

      <div className="max-h-56 overflow-y-auto overscroll-contain rounded-[5px] border border-white/10 bg-black/20 p-1.5">
        {!disciplines.length && <p className="px-2 py-3 text-xs leading-5 text-amber-200">{emptyMessage}</p>}
        {disciplines.length > 0 && !visible.length && <p className="px-2 py-3 text-xs text-slate-400">No encontramos disciplinas con ese nombre.</p>}
        <div className="grid gap-1.5 sm:grid-cols-2">
          {visible.map((discipline) => {
            const checked = selected.includes(discipline.id)
            return (
              <label key={discipline.id} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-[5px] border px-3 text-sm transition ${checked ? 'border-[#B4FF45]/60 bg-[#B4FF45]/10 text-white' : 'border-white/10 text-slate-300 hover:border-[#B4FF45]/40'}`}>
                <input type="checkbox" checked={checked} onChange={() => toggle(discipline.id)} className="accent-[#B4FF45]" />
                {discipline.name}
              </label>
            )
          })}
        </div>
      </div>
    </fieldset>
  )
}

function normalizeText(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
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

'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AuthPanel({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<string[]>(['espectador'])
  const [accountType, setAccountType] = useState<'persona' | 'organizacion'>('persona')
  const [inviteMode, setInviteMode] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const isRegister = mode === 'register'

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
    const organizationName = (form.elements.namedItem('organizationName') as HTMLInputElement | null)?.value ?? ''
    const organizationType = (form.elements.namedItem('organizationType') as HTMLSelectElement | null)?.value ?? 'organizacion_deportiva'
    const organizationCity = (form.elements.namedItem('organizationCity') as HTMLInputElement | null)?.value ?? ''
    if (isRegister && password !== confirmation) {
      setMessage('Las contraseñas no coinciden.')
      return
    }
    if (isRegister && accountType === 'organizacion' && !organizationName.trim()) {
      setMessage('Ingresa el nombre de la organización.')
      return
    }
    setLoading(true)
    const result = isRegister
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: accountType === 'organizacion' ? organizationName : fullName, roles: accountType === 'organizacion' ? ['directivo'] : roles, account_type: accountType, organization_name: organizationName, organization_type: organizationType, organization_city: organizationCity } } })
      : await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (result.error) {
      setMessage(result.error.message.toLowerCase().includes('already registered')
        ? 'Este correo ya está registrado. Cambia a Iniciar sesión para entrar a tu cuenta.'
        : result.error.message)
      return
    }

    if (isRegister && accountType === 'organizacion' && result.data.user && result.data.session) {
      const { error: organizationError } = await supabase.from('organizations').insert({
        name: organizationName.trim(),
        type: organizationType,
        city: organizationCity.trim() || null,
        institutional_email: email,
        slug: organizationName.toLowerCase().trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, ''),
        created_by: result.data.user.id,
      })
      if (organizationError) {
        setLoading(false)
        setMessage(`Cuenta creada, pero no se pudo crear la organización: ${organizationError.message}`)
        return
      }
    }

    if (isRegister && !result.data.session) {
      setMessage('Cuenta creada. Revisa tu correo para confirmar el acceso. Luego podrás completar el perfil de tu organización.')
      return
    }

    setMessage(isRegister ? 'Cuenta creada correctamente.' : 'Sesión iniciada correctamente.')
    router.push('/dashboard/perfil')
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
      <p className="mt-2 text-sm leading-6 text-slate-400">{inviteMode ? 'Introduce el código temporal que te proporcionó la organización.' : isRegister ? 'Empieza a organizar tus torneos de rugby.' : 'Accede a tu gestión de torneos.'}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        {inviteMode && <label className="block rounded-xl border border-white/15 bg-white/5 p-4 text-sm font-semibold text-slate-300">Código de invitación<input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} required maxLength={32} className="mt-2 w-full bg-transparent font-mono text-lg tracking-widest text-white outline-none placeholder:text-slate-500" placeholder="AX-XXXXXX" /></label>}
        {isRegister && <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/20 p-1"><button type="button" onClick={() => setAccountType('persona')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${accountType === 'persona' ? 'bg-[#B4FF45] text-[#10151b]' : 'text-slate-300'}`}>Persona natural</button><button type="button" onClick={() => setAccountType('organizacion')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${accountType === 'organizacion' ? 'bg-[#B4FF45] text-[#10151b]' : 'text-slate-300'}`}>Organización</button></div>}
        {isRegister && accountType === 'persona' && <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3"><UserRound className="text-[#B4FF45]" size={18} /><input required name="fullName" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Nombre completo" /></label>}
        {isRegister && accountType === 'persona' && <RoleSelector roles={roles} onChange={setRoles} />}
        {isRegister && accountType === 'organizacion' && <div className="space-y-3 rounded-xl border border-[#B4FF45]/30 bg-white/5 p-4"><p className="text-sm font-semibold text-[#B4FF45]">Datos de la organización</p><input required name="organizationName" className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-sm outline-none placeholder:text-slate-500" placeholder="Nombre de la organización" /><select name="organizationType" className="w-full rounded-lg border border-white/15 bg-[#101a24] px-3 py-3 text-sm text-white outline-none"><option value="organizacion_deportiva">Organización deportiva</option><option value="federacion">Federación</option><option value="union">Unión</option><option value="liga">Liga</option><option value="equipo">Equipo</option></select><input name="organizationCity" className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-sm outline-none placeholder:text-slate-500" placeholder="Ciudad" /></div>}
        {!inviteMode && <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3"><Mail className="text-[#B4FF45]" size={18} /><input required name="email" type="email" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Correo electrónico" /></label>}
        {!inviteMode && <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3"><LockKeyhole className="text-[#B4FF45]" size={18} /><input required name="password" type={showPassword ? 'text' : 'password'} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Contraseña" /><button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-[#B4FF45]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></label>}
        {isRegister && !inviteMode && <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3"><LockKeyhole className="text-[#B4FF45]" size={18} /><input required name="confirmation" type={showConfirmation ? 'text' : 'password'} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Confirmar contraseña" /><button type="button" aria-label={showConfirmation ? 'Ocultar confirmación' : 'Mostrar confirmación'} onClick={() => setShowConfirmation(!showConfirmation)} className="text-slate-400 hover:text-[#B4FF45]">{showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}</button></label>}
        <button disabled={loading} className="font-heading w-full rounded-xl bg-[#B4FF45] py-3.5 text-lg font-bold text-[#10151b] transition hover:bg-[#c8ff7a] disabled:cursor-wait disabled:opacity-60">{loading ? 'Procesando...' : inviteMode ? 'Confirmar participación' : isRegister ? 'Crear cuenta' : 'Entrar a mi cuenta'}</button>
      </form>
      {message && <p className="mt-4 rounded-xl border border-[#B4FF45]/30 bg-[#B4FF45]/10 p-3 text-sm text-[#d9ffb1]">{message}</p>}
    </div>
  )
}

function RoleSelector({ roles, onChange }: { roles: string[]; onChange: (roles: string[]) => void }) {
  const availableRoles = [
    ['espectador', 'Espectador'],
    ['atleta', 'Atleta'],
    ['entrenador', 'Entrenador'],
    ['directivo', 'Directivo'],
  ]

  function toggleRole(role: string) {
    const nextRoles = roles.includes(role)
      ? roles.filter((currentRole) => currentRole !== role)
      : [...roles, role]

    onChange(nextRoles.length ? nextRoles : ['espectador'])
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

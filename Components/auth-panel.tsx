'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'

export default function AuthPanel({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [message, setMessage] = useState('')
  const isRegister = mode === 'register'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirmation = (form.elements.namedItem('confirmation') as HTMLInputElement | null)?.value
    if (isRegister && password !== confirmation) {
      setMessage('Las contraseñas no coinciden.')
      return
    }
    localStorage.setItem('athlonx-auth', 'true')
    setMessage(isRegister ? 'Cuenta creada correctamente.' : 'Sesión iniciada correctamente.')

    if (!isRegister) {
      router.push('/dashboard')
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0b141e]/80 p-6 shadow-2xl backdrop-blur-xl md:p-8">
      <div className="mb-7 grid grid-cols-2 rounded-xl bg-black/25 p-1">
        <button type="button" onClick={() => { setMode('login'); setMessage('') }} className={`rounded-lg px-3 py-3 font-heading text-base transition ${!isRegister ? 'bg-[#B4FF45] text-[#10151b]' : 'text-slate-300 hover:text-white'}`}>Iniciar sesión</button>
        <button type="button" onClick={() => { setMode('register'); setMessage('') }} className={`rounded-lg px-3 py-3 font-heading text-base transition ${isRegister ? 'bg-[#B4FF45] text-[#10151b]' : 'text-slate-300 hover:text-white'}`}>Registrarse</button>
      </div>
      <p className="font-heading text-xs uppercase tracking-[.3em] text-[#B4FF45]">AthlonX sevens</p>
      <h2 className="font-display mt-2 text-4xl uppercase">{isRegister ? 'Crea tu cuenta' : 'Bienvenido'}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{isRegister ? 'Empieza a organizar tus torneos de rugby.' : 'Accede a tu gestión de torneos.'}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        {isRegister && <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3"><UserRound className="text-[#B4FF45]" size={18} /><input required className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Nombre completo" /></label>}
        <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3"><Mail className="text-[#B4FF45]" size={18} /><input required type="email" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Correo electrónico" /></label>
        <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3"><LockKeyhole className="text-[#B4FF45]" size={18} /><input required name="password" type={showPassword ? 'text' : 'password'} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Contraseña" /><button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-[#B4FF45]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></label>
        {isRegister && <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3"><LockKeyhole className="text-[#B4FF45]" size={18} /><input required name="confirmation" type={showConfirmation ? 'text' : 'password'} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Confirmar contraseña" /><button type="button" aria-label={showConfirmation ? 'Ocultar confirmación' : 'Mostrar confirmación'} onClick={() => setShowConfirmation(!showConfirmation)} className="text-slate-400 hover:text-[#B4FF45]">{showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}</button></label>}
        <button className="font-heading w-full rounded-xl bg-[#B4FF45] py-3.5 text-lg font-bold text-[#10151b] transition hover:bg-[#c8ff7a]">{isRegister ? 'Crear cuenta' : 'Entrar a mi cuenta'}</button>
      </form>
      {message && <p className="mt-4 rounded-xl border border-[#B4FF45]/30 bg-[#B4FF45]/10 p-3 text-sm text-[#d9ffb1]">{message}</p>}
    </div>
  )
}

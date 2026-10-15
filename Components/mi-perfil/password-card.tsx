'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, Field, Modal, ReadValue, outlineButtonClass, primaryButtonClass } from './ui'

// Seguridad de cualquier cuenta (Persona, Equipo u Organización).
export function SecurityCards({ email }: { email: string }) {
  return (
    <>
      <PasswordCard email={email} />
      <EmailChangeCard email={email} />
    </>
  )
}

function PasswordCard({ email }: { email: string }) {
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function changePassword() {
    if (!supabase) return
    if (!current) return setError('Escribe tu contraseña actual.')
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (password !== repeat) return setError('Las contraseñas no coinciden.')
    if (!email) return setError('No pudimos confirmar tu correo. Vuelve a iniciar sesión.')
    setSaving(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: current })
    if (authError) {
      setSaving(false)
      return setError('La contraseña actual no es correcta.')
    }
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (updateError) return setError(updateError.message)
    setCurrent('')
    setPassword('')
    setRepeat('')
    setError('')
    setMessage('Contraseña actualizada.')
    window.setTimeout(() => setMessage(''), 2500)
  }

  return (
    <Card title="Cambiar contraseña" description="Usa al menos 8 caracteres. Tu contraseña nunca se muestra completa.">
      <Field label="Contraseña actual" type="password" value={current} onChange={setCurrent} autoComplete="current-password" />
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nueva contraseña" type="password" value={password} onChange={setPassword} hint="Mínimo 8 caracteres" autoComplete="new-password" />
        <Field label="Confirmar contraseña" type="password" value={repeat} onChange={setRepeat} autoComplete="new-password" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p role="status" className={`text-[14px] ${error ? 'text-[var(--mp-danger)]' : 'text-[var(--mp-muted)]'}`}>{error || message}</p>
        <button type="button" onClick={changePassword} disabled={saving || !current || !password || !repeat} className={primaryButtonClass}>
          {saving ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </div>
    </Card>
  )
}

function EmailChangeCard({ email }: { email: string }) {
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function requestChange() {
    if (!supabase) return
    const next = newEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) return setError('Escribe un correo válido.')
    if (next === email.toLowerCase()) return setError('Ese ya es tu correo actual.')
    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ email: next }, { emailRedirectTo: `${window.location.origin}/mi-perfil?seccion=seguridad` })
    setSaving(false)
    if (updateError) return setError(updateError.message)
    setError('')
    setSentTo(next)
    setNewEmail('')
  }

  return (
    <Card title="Cambiar correo electrónico" description="Te enviaremos un enlace de confirmación al nuevo correo. Tu correo no cambia hasta que lo confirmes.">
      <ReadValue label="Correo actual" value={email} />
      <Field label="Nuevo correo electrónico" type="email" value={newEmail} onChange={setNewEmail} autoComplete="email" placeholder="nuevo@correo.com" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p role="status" className="text-[14px] text-[var(--mp-danger)]">{error}</p>
        <button type="button" onClick={requestChange} disabled={saving || !newEmail.trim()} className={outlineButtonClass}>
          {saving ? 'Enviando…' : 'Cambiar correo electrónico'}
        </button>
      </div>
      <Modal open={sentTo !== null} onClose={() => setSentTo(null)}>
        <div className="flex flex-col items-start gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mp-lime)] text-[24px] font-bold text-[var(--mp-on-lime)]">✓</div>
          <h2 className="font-heading text-[28px] font-bold uppercase">Revisa tu correo</h2>
          <p className="text-[15px] text-[var(--mp-muted)]">Enviamos un enlace de confirmación a {sentTo}. Tu correo cambiará cuando lo abras.</p>
          <button type="button" onClick={() => setSentTo(null)} className={outlineButtonClass}>Entendido</button>
        </div>
      </Modal>
    </Card>
  )
}

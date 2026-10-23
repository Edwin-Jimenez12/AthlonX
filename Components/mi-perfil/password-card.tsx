'use client'

import { Check, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button, Notice as InlineNotice } from '../mi-equipo/ui'
import { Card, CardRow, Field, Hint, LockedField } from './ui'

// Seguridad de cualquier cuenta (Persona, Equipo u Organización).
export function SecurityCards({ email }: { email: string }) {
  return (
    <CardRow>
      <PasswordCard email={email} />
      <EmailChangeCard email={email} />
    </CardRow>
  )
}

// Fuerza simple: largo, números y mezcla de mayúsculas y símbolos.
function strengthOf(password: string) {
  if (!password) return 0
  let score = password.length >= 8 ? 1 : 0
  if (/\d/.test(password)) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1
  return score
}

const strengthLabels = ['Muy corta', 'Débil', 'Aceptable', 'Segura', 'Muy segura']

function PasswordCard({ email }: { email: string }) {
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<{ field: 'current' | 'password' | 'repeat' | 'form'; text: string } | null>(null)
  const strength = strengthOf(password)

  async function changePassword() {
    if (!supabase) return
    setMessage('')
    if (!current) return setError({ field: 'current', text: 'Escribe tu contraseña actual.' })
    if (password.length < 8) return setError({ field: 'password', text: 'La contraseña debe tener al menos 8 caracteres.' })
    if (password !== repeat) return setError({ field: 'repeat', text: 'Las contraseñas no coinciden.' })
    if (!email) return setError({ field: 'form', text: 'No pudimos confirmar tu correo. Vuelve a iniciar sesión.' })
    setSaving(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: current })
    if (authError) {
      setSaving(false)
      return setError({ field: 'current', text: 'La contraseña actual no es correcta.' })
    }
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (updateError) return setError({ field: 'form', text: updateError.message })
    setCurrent('')
    setPassword('')
    setRepeat('')
    setError(null)
    setMessage('Contraseña actualizada.')
    window.setTimeout(() => setMessage(''), 3000)
  }

  const errorFor = (field: 'current' | 'password' | 'repeat') => (error?.field === field ? error.text : undefined)

  return (
    <Card title="Cambiar contraseña" description="Usa al menos 8 caracteres. Tu contraseña nunca se muestra completa.">
      <form onSubmit={(event) => { event.preventDefault(); void changePassword() }} className="space-y-4">
        <Field label="Contraseña actual" type="password" value={current} onChange={(value) => { setCurrent(value); setError(null) }} autoComplete="current-password" error={errorFor('current')} />
        <Field label="Nueva contraseña" type="password" value={password} onChange={(value) => { setPassword(value); setError(null) }} autoComplete="new-password" error={errorFor('password')} />
        <Field label="Confirmar contraseña" type="password" value={repeat} onChange={(value) => { setRepeat(value); setError(null) }} autoComplete="new-password" error={errorFor('repeat')} />
        {password && <div className="space-y-1.5" aria-live="polite">
          <div aria-hidden="true" className="flex gap-1">{[1, 2, 3, 4].map((step) => <span key={step} className={`h-1 flex-1 rounded-full ${strength >= step ? 'bg-[var(--ax-accent)]' : 'bg-[var(--ax-line-strong)]'}`} />)}</div>
          <p className="text-xs text-[var(--ax-muted)]">{strengthLabels[strength]} · 8 caracteres o más, con números</p>
        </div>}
        {error?.field === 'form' && <p role="alert" className="text-[13px] font-medium text-[var(--ax-danger-text)]">{error.text}</p>}
        {message && <InlineNotice tone="success" icon={Check}>{message}</InlineNotice>}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" icon={Lock} disabled={saving || !current || !password || !repeat}>{saving ? 'Guardando…' : 'Actualizar contraseña'}</Button>
        </div>
      </form>
    </Card>
  )
}

function EmailChangeCard({ email }: { email: string }) {
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function requestChange(target = newEmail) {
    if (!supabase) return
    const next = target.trim().toLowerCase()
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
      <form onSubmit={(event) => { event.preventDefault(); void requestChange() }} className="space-y-4">
        <LockedField label="Correo actual" value={email} />
        <Field label="Nuevo correo electrónico" type="email" value={newEmail} onChange={(value) => { setNewEmail(value); setError('') }} autoComplete="email" placeholder="nuevo@correo.com" error={error || undefined} />
        {sentTo
          ? <div role="status" className="space-y-3 rounded-[10px] bg-[var(--ax-accent-soft)] p-3">
            <div className="flex items-start gap-2.5">
              <Mail size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--ax-accent-text)]" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--ax-accent-text)] [overflow-wrap:anywhere]">Enlace enviado a {sentTo}</p>
                <p className="mt-0.5 text-[13px] text-[var(--ax-text-secondary)]">Revisa tu bandeja y la carpeta de spam. Tu correo cambia cuando abras el enlace.</p>
              </div>
            </div>
            <Button size="sm" icon={Mail} disabled={saving} onClick={() => void requestChange(sentTo)}>{saving ? 'Enviando…' : 'Reenviar enlace'}</Button>
          </div>
          : <Hint icon={Mail}>Si no lo confirmas, sigues usando tu correo actual.</Hint>}
        <div className="flex justify-end">
          <Button type="submit" icon={Mail} disabled={saving || !newEmail.trim()}>{saving && !sentTo ? 'Enviando…' : 'Enviar enlace de confirmación'}</Button>
        </div>
      </form>
    </Card>
  )
}

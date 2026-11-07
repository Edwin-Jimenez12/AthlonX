'use client'

import { AlertTriangle, LogIn, LogOut, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatLongDate } from '../../lib/mi-perfil'
import { Button } from '../mi-equipo/ui'
import { Card, Field, InlineConfirm } from './ui'

// Cierra la sesión en este dispositivo sin ventana de confirmación: se puede volver a entrar en cualquier momento.
export function SessionCard() {
  const [busy, setBusy] = useState(false)
  async function signOut() {
    setBusy(true)
    await supabase?.auth.signOut()
    window.location.href = '/'
  }
  return (
    <Card title="Sesión" description="Cierra tu sesión en este dispositivo. Podrás volver a entrar cuando quieras.">
      <div><Button icon={LogOut} onClick={() => void signOut()} disabled={busy}>{busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</Button></div>
    </Card>
  )
}

// Eliminación de cuenta: confirmación inline con contraseña y periodo de recuperación de 15 días calendario.
// Cuenta que entra con Google (sin contraseña de AthlonX): se confirma volviendo a entrar con Google y escribiendo el correo.
const RECENT_MS = 10 * 60 * 1000

export function DeleteAccountCard({ warning }: { warning?: string } = {}) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)
  const [googleOnly, setGoogleOnly] = useState(false)
  const [recentGoogle, setRecentGoogle] = useState(false)

  useEffect(() => {
    let active = true
    void supabase?.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return
      const providers = (data.user.app_metadata?.providers as string[] | undefined) ?? [data.user.app_metadata?.provider as string]
      const onlyGoogle = providers.includes('google') && !providers.includes('email')
      setGoogleOnly(onlyGoogle)
      const lastSignIn = data.user.last_sign_in_at ? new Date(data.user.last_sign_in_at).getTime() : 0
      const recent = Date.now() - lastSignIn < RECENT_MS
      setRecentGoogle(recent)
      // Vuelve de confirmar con Google: abre directamente la confirmación.
      const params = new URLSearchParams(window.location.search)
      if (onlyGoogle && params.get('eliminar') === '1') {
        setOpen(true)
        params.delete('eliminar')
        window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`)
      }
    })
    return () => { active = false }
  }, [])

  async function reauthWithGoogle() {
    if (!supabase) return
    setBusy(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/mi-perfil?seccion=cuenta&eliminar=1`, queryParams: { prompt: 'select_account' } },
    })
    if (oauthError) {
      setBusy(false)
      setError(oauthError.message)
    }
  }

  function close() {
    if (busy) return
    setOpen(false)
    setPassword('')
    setError('')
  }

  async function confirmDeletion() {
    if (!supabase) return
    if (!password) return setError(googleOnly ? 'Escribe el correo de tu cuenta para continuar.' : 'Escribe tu contraseña para continuar.')
    setBusy(true)
    const { data, error: rpcError } = googleOnly
      ? await supabase.rpc('request_account_deletion_google', { p_email: password })
      : await supabase.rpc('request_account_deletion', { p_password: password })
    setBusy(false)
    if (rpcError) return setError(rpcError.message)
    setOpen(false)
    setPassword('')
    setScheduledAt(typeof data === 'string' ? data : new Date(Date.now() + 15 * 86400000).toISOString())
  }

  async function finish() {
    if (supabase) await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <Card tone="danger" title="Zona de riesgo" description="Al eliminar la cuenta se borran tu perfil y tus datos personales. Tendrás 15 días calendario para recuperarla iniciando sesión.">
      {scheduledAt ? (
        <div role="status" className="space-y-3 rounded-[14px] border border-[var(--ax-danger-line)] bg-[var(--ax-danger-soft)] p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--ax-danger-text)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--ax-text)]">Eliminación programada</p>
              <p className="mt-1 text-[13px] leading-5 text-[var(--ax-text-secondary)]">Tu cuenta quedará eliminada el {formatLongDate(scheduledAt)} si no vuelves a iniciar sesión antes de esa fecha.</p>
            </div>
          </div>
          <Button variant="primary" icon={LogOut} onClick={() => void finish()}>Cerrar sesión</Button>
        </div>
      ) : open ? (
        <InlineConfirm
          title="¿Eliminar tu cuenta?"
          description={`${warning ? warning + ' ' : ''}Tienes 15 días calendario para recuperarla volviendo a iniciar sesión. Después se elimina para siempre.`}
          confirmLabel="Eliminar cuenta"
          danger
          busy={busy}
          error={error}
          onConfirm={() => void confirmDeletion()}
          onCancel={close}
        >
          {googleOnly ? (
            recentGoogle ? (
              <Field label="Confirma escribiendo el correo de tu cuenta" type="email" value={password} onChange={(value) => { setPassword(value); setError('') }} autoComplete="off" />
            ) : (
              <div className="space-y-2">
                <p className="text-[13px] leading-5 text-[var(--ax-text-secondary)]">Tu cuenta entra con Google. Por seguridad, vuelve a entrar con Google para confirmar que eres tú.</p>
                <Button icon={LogIn} onClick={() => void reauthWithGoogle()} disabled={busy}>{busy ? 'Abriendo Google…' : 'Confirmar con Google'}</Button>
              </div>
            )
          ) : (
            <Field label="Confirma con tu contraseña" type="password" value={password} onChange={(value) => { setPassword(value); setError('') }} autoComplete="current-password" />
          )}
        </InlineConfirm>
      ) : (
        <div><Button variant="danger" icon={Trash2} onClick={() => setOpen(true)}>Eliminar cuenta</Button></div>
      )}
    </Card>
  )
}

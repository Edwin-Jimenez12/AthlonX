'use client'

import { AlertTriangle, LogOut, Trash2 } from 'lucide-react'
import { useState } from 'react'
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
    <Card title="Sesión" description="Cierra tu sesión en este dispositivo. Podrás volver a entrar con tu correo y contraseña.">
      <div><Button icon={LogOut} onClick={() => void signOut()} disabled={busy}>{busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</Button></div>
    </Card>
  )
}

// Eliminación de cuenta: confirmación inline con contraseña y periodo de recuperación de 15 días calendario.
export function DeleteAccountCard() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)

  function close() {
    if (busy) return
    setOpen(false)
    setPassword('')
    setError('')
  }

  async function confirmDeletion() {
    if (!supabase) return
    if (!password) return setError('Escribe tu contraseña para continuar.')
    setBusy(true)
    const { data, error: rpcError } = await supabase.rpc('request_account_deletion', { p_password: password })
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
          description="Tienes 15 días calendario para recuperarla volviendo a iniciar sesión. Después se elimina para siempre."
          confirmLabel="Eliminar cuenta"
          danger
          busy={busy}
          error={error}
          onConfirm={() => void confirmDeletion()}
          onCancel={close}
        >
          <Field label="Confirma con tu contraseña" type="password" value={password} onChange={(value) => { setPassword(value); setError('') }} autoComplete="current-password" />
        </InlineConfirm>
      ) : (
        <div><Button variant="danger" icon={Trash2} onClick={() => setOpen(true)}>Eliminar cuenta</Button></div>
      )}
    </Card>
  )
}

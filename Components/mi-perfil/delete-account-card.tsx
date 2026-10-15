'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatLongDate } from '../../lib/mi-perfil'
import { Card, ConfirmModal, Field, Modal, dangerOutlineButtonClass, primaryButtonClass } from './ui'

// Eliminación de cuenta: confirmación con contraseña y periodo de recuperación de 15 días calendario.
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
    <>
      <Card tone="danger" title="Zona de riesgo" description="Al eliminar la cuenta se borran tu perfil y tus datos personales. Tendrás 15 días calendario para recuperarla iniciando sesión.">
        <div>
          <button type="button" onClick={() => setOpen(true)} className={dangerOutlineButtonClass}>Eliminar cuenta</button>
        </div>
      </Card>

      <ConfirmModal
        open={open}
        title="¿Estás seguro de que deseas eliminar la cuenta?"
        description="Si deseas recuperarla, tienes 15 días calendario para volver a iniciar sesión. Después de ese tiempo, la cuenta será eliminada permanentemente."
        confirmLabel="Eliminar cuenta"
        danger
        busy={busy}
        error={error}
        onConfirm={confirmDeletion}
        onCancel={close}
      >
        <Field label="Confirma con tu contraseña" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
      </ConfirmModal>

      <Modal open={scheduledAt !== null} onClose={finish}>
        <div className="flex flex-col items-start gap-5">
          <h2 className="font-heading text-[28px] font-bold uppercase leading-tight">Eliminación programada</h2>
          <p className="text-[15px] text-[var(--mp-muted)]">
            Tu cuenta quedará eliminada el {scheduledAt ? formatLongDate(scheduledAt) : 'plazo indicado'} si no vuelves a iniciar sesión antes de esa fecha.
          </p>
          <button type="button" onClick={finish} className={primaryButtonClass}>Cerrar sesión</button>
        </div>
      </Modal>
    </>
  )
}

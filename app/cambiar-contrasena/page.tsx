'use client'

import { Info } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { callPanel } from '../../Components/admin/admin-shell'
import { Button, Card, CardHeader, FieldLabel, Notice, inputClass } from '../../Components/mi-equipo/ui'
import { ThemeSync } from '../../Components/theme-sync'
import { supabase } from '../../lib/supabase'

// Primer ingreso con contraseña temporal: la persona define su propia contraseña antes de usar el panel.
export default function CambiarContrasenaPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function check() {
      try {
        const access = await callPanel<{ must_change_password?: boolean } | null>('platform_my_access')
        if (!active) return
        if (!access) return router.replace('/busqueda')
        if (!access.must_change_password) return router.replace('/panel-admin')
        setChecking(false)
      } catch {
        if (active) router.replace('/busqueda')
      }
    }
    void check()
    return () => {
      active = false
    }
  }, [router])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 12) return setMessage('La contraseña debe tener al menos 12 caracteres.')
    if (password !== confirm) return setMessage('Las contraseñas no coinciden.')
    if (!supabase) return setMessage('La conexión no está disponible.')

    setSaving(true)
    setMessage(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setSaving(false)
      return setMessage(error.message)
    }
    try {
      await callPanel('platform_finish_password_change')
      router.replace('/panel-admin')
    } catch (err) {
      setMessage((err as Error).message)
      setSaving(false)
    }
  }

  if (checking) {
    return (
      <div className="athlonx-dashboard flex min-h-screen items-center justify-center">
        <ThemeSync />
        <p className="text-sm text-[var(--ax-muted)]">Cargando…</p>
      </div>
    )
  }

  return (
    <div className="athlonx-dashboard flex min-h-screen items-center justify-center p-6">
      <ThemeSync />
      <div className="ax-v2 w-full max-w-md space-y-6">
        {message && <Notice tone="danger" icon={Info}>{message}</Notice>}
        <Card>
          <CardHeader id="cambiar-titulo" title="Cambia tu contraseña" />
          <p className="mt-3 text-sm text-[var(--ax-muted)]">
            Tu cuenta tiene una contraseña temporal. Define una nueva para entrar al panel.
          </p>
          <form className="mt-6 space-y-5" onSubmit={submit}>
            <label className="block">
              <FieldLabel>Nueva contraseña</FieldLabel>
              <input className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label className="block">
              <FieldLabel>Repite la nueva contraseña</FieldLabel>
              <input className={inputClass} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
            <Button type="submit" variant="primary" className="w-full" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar y entrar'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

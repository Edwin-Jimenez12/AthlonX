'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { Briefcase, Check, ClipboardList, Info, Trophy, Wrench } from 'lucide-react'
import { loadAccountContexts } from '../lib/account-contexts'
import { supabase } from '../lib/supabase'
import { Button, Card, CardHeader, Notice, cx } from './mi-equipo/ui'

// Secciones que se pueden usar sin rol deportivo: buscar, ver avisos (por ejemplo, una invitación) y el perfil.
const freePaths = ['/busqueda', '/notificaciones', '/mi-perfil', '/perfil', '/configuracion']
const CACHE_KEY = 'athlonx-has-role'

const roleOptions: Array<{ value: string; label: string; description: string; icon: LucideIcon }> = [
  { value: 'atleta', label: 'Atleta', description: 'Juegas o entrenas en un equipo.', icon: Trophy },
  { value: 'entrenador', label: 'Entrenador', description: 'Diriges entrenamientos y convocatorias.', icon: ClipboardList },
  { value: 'staff', label: 'Staff', description: 'Apoyas al equipo: médico, utilero, analista…', icon: Wrench },
  { value: 'directivo', label: 'Directivo', description: 'Administras un equipo o club.', icon: Briefcase },
]

// Cuenta de persona sin rol: el menú muestra todo, pero fuera de las secciones libres el contenido se reemplaza
// por el panel "Elige tu rol deportivo". Al guardar, se muestra la sección según los roles elegidos.
export function RoleGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  const [state, setState] = useState<'loading' | 'ok' | 'norole'>('loading')

  useLayoutEffect(() => {
    try {
      const cached = window.localStorage.getItem(CACHE_KEY)
      if (cached === '1') setState('ok')
      if (cached === '0') setState('norole')
    } catch { /* sin almacenamiento */ }
  }, [])

  useEffect(() => {
    let active = true
    async function check() {
      if (!supabase) return setState('ok')
      const { data } = await supabase.auth.getUser()
      if (!active) return
      const user = data.user
      const accountType = user?.user_metadata?.account_type
      if (!user || accountType === 'equipo' || accountType === 'organizacion') return setState('ok')
      const [{ data: roles }, contexts] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        loadAccountContexts(user.id),
      ])
      if (!active) return
      const hasRole = Boolean(roles?.length) || contexts.some((context) => context.contextType !== 'organization')
      try { window.localStorage.setItem(CACHE_KEY, hasRole ? '1' : '0') } catch { /* sin almacenamiento */ }
      setState(hasRole ? 'ok' : 'norole')
    }
    void check()
    const refresh = () => { void check() }
    window.addEventListener('athlonx-roles-updated', refresh)
    return () => {
      active = false
      window.removeEventListener('athlonx-roles-updated', refresh)
    }
  }, [])

  const free = freePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  if (state !== 'norole' || free) return <>{children}</>
  return <ChooseRolePanel onSaved={() => setState('ok')} />
}

function ChooseRolePanel({ onSaved }: { onSaved: () => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const labels = roleOptions.filter((option) => selected.includes(option.value)).map((option) => option.label)

  function toggle(value: string) {
    setConfirming(false)
    setError('')
    setSelected((current) => current.includes(value) ? current.filter((role) => role !== value) : [...current, value])
  }

  async function save() {
    if (!supabase || !selected.length) return
    setSaving(true)
    setError('')
    const { error: saveError } = await supabase.rpc('set_my_personal_roles', { p_roles: selected })
    setSaving(false)
    if (saveError) return setError(saveError.message)
    try {
      window.localStorage.setItem(CACHE_KEY, '1')
      window.localStorage.removeItem('athlonx-active-context-id')
    } catch { /* sin almacenamiento */ }
    window.dispatchEvent(new Event('athlonx-roles-updated'))
    onSaved()
  }

  return (
    <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
      <div className="mx-auto max-w-[880px] space-y-5 px-4 pb-16 pt-5 sm:px-8 sm:pt-8 lg:px-10">
        <Card>
          <CardHeader id="elige-rol" size="lg" title="Elige tu rol deportivo" subtitle="Con tu rol se activan las secciones que te corresponden. Puedes elegir más de uno." />
          <div role="group" aria-labelledby="elige-rol" className="mt-6 grid gap-3 sm:grid-cols-2">
            {roleOptions.map(({ value, label, description, icon: Icon }) => {
              const active = selected.includes(value)
              return (
                <button key={value} type="button" aria-pressed={active} onClick={() => toggle(value)} className={cx(
                  'flex cursor-pointer items-start gap-3 rounded-[14px] border p-4 text-left transition-colors duration-150',
                  active ? 'border-[var(--ax-accent-line)] bg-[var(--ax-accent-soft)]' : 'border-[var(--ax-line)] hover:bg-[var(--ax-hover)]',
                )}>
                  <span aria-hidden="true" className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]', active ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'bg-[var(--ax-surface-raised)] text-[var(--ax-accent-text)]')}><Icon size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-[var(--ax-text)]">{label}</span>
                    <span className="mt-0.5 block text-[13px] leading-[18px] text-[var(--ax-muted)]">{description}</span>
                  </span>
                  {active && <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--ax-accent)] text-[var(--ax-on-accent)]"><Check size={12} /></span>}
                </button>
              )
            })}
          </div>

          {!confirming ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-[var(--ax-muted)]">{selected.length ? `${selected.length} ${selected.length === 1 ? 'rol elegido' : 'roles elegidos'}` : 'Elige al menos un rol.'}</p>
              <Button variant="primary" disabled={!selected.length} onClick={() => setConfirming(true)}>Continuar</Button>
            </div>
          ) : (
            <div role="group" aria-label="Confirmar roles" className="ax-drop-in mt-6 space-y-3 rounded-[14px] border border-[var(--ax-accent-line)] bg-[var(--ax-surface-raised)] p-4">
              <p className="text-sm font-semibold text-[var(--ax-text)]">Vas a guardar: {labels.join(', ')}.</p>
              <p className="text-[13px] leading-5 text-[var(--ax-text-secondary)]">Puedes cambiar tus roles cuando quieras en Mi perfil → Equipo y roles.</p>
              {error && <p role="alert" className="text-[13px] font-medium text-[var(--ax-danger-text)]">{error}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" disabled={saving} onClick={() => setConfirming(false)}>Cambiar</Button>
                <Button variant="primary" disabled={saving} onClick={() => void save()}>{saving ? 'Guardando…' : 'Guardar roles'}</Button>
              </div>
            </div>
          )}
        </Card>
        <Notice tone="neutral" icon={Info}>Mientras tanto puedes usar Búsqueda, Notificaciones y Mi perfil.</Notice>
      </div>
    </main>
  )
}

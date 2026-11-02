'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Card } from '../mi-equipo/ui'
import { hasPermission, roleLabels, type Permission, type PlatformAccess } from '../../lib/admin'
import { supabase } from '../../lib/supabase'
import { useThemeMode } from '../../lib/theme'
import { ThemeSync } from '../theme-sync'

const AccessContext = createContext<PlatformAccess>(null)

// Permisos del usuario actual dentro del panel (ya validados por el servidor al cargar).
export function useAdminAccess() {
  return useContext(AccessContext)
}

// Llama a una función del panel. La base de datos valida el permiso; la pantalla solo muestra el resultado.
export async function callPanel<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error('La conexión no está disponible.')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

const NAV: Array<{ label: string; href: string; permission: Permission | 'equipo' }> = [
  { label: 'Ingresos', href: '/panel-admin', permission: 'ingresos' },
  { label: 'Cuentas', href: '/panel-admin/cuentas', permission: 'estadisticas' },
  { label: 'Planes', href: '/panel-admin/planes', permission: 'planes' },
  { label: 'Novedades', href: '/panel-admin/novedades', permission: 'novedades' },
  { label: 'Promociones', href: '/panel-admin/promociones', permission: 'promociones' },
  { label: 'Sugerencias', href: '/panel-admin/sugerencias', permission: 'sugerencias' },
  { label: 'Equipo y roles', href: '/panel-admin/equipo', permission: 'equipo' },
]

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [themeMode] = useThemeMode()
  const [access, setAccess] = useState<PlatformAccess>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const data = await callPanel<PlatformAccess>('platform_my_access')
        if (!active) return
        if (!data) {
          router.replace('/busqueda')
          return
        }
        setAccess(data)
        setReady(true)
      } catch {
        if (active) router.replace('/busqueda')
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [router])

  if (!ready || !access) {
    return (
      <div className="athlonx-dashboard flex min-h-screen items-center justify-center">
        <ThemeSync />
        <p className="text-sm text-[var(--ax-muted)]">Cargando panel…</p>
      </div>
    )
  }

  const canSeeTeam = access.role === 'propietario' || access.role === 'administrador'
  const items = NAV.filter((item) => (item.permission === 'equipo' ? canSeeTeam : hasPermission(access, item.permission)))
  const light = themeMode === 'light'

  return (
    <AccessContext.Provider value={access}>
      <div className="athlonx-dashboard flex min-h-screen">
        <ThemeSync />
        <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-6 border-r border-[var(--ax-line)] bg-[var(--ax-surface)] p-5">
          <Link href="/panel-admin" className="block px-2 pt-2">
            <img
              src={light ? '/MarcaAthlonX/MarcaHorizontalClara.svg' : '/MarcaAthlonX/MarcaHorizontal.svg'}
              alt="AthlonX"
              style={{ width: 180, height: 24, maxWidth: 'none' }}
            />
          </Link>
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--ax-muted)]">Panel administrativo</p>
          <nav className="flex flex-col gap-1" aria-label="Secciones del panel">
            {items.map((item) => {
              const current = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current ? 'page' : undefined}
                  className={
                    current
                      ? 'rounded-[10px] bg-[var(--ax-accent-soft)] px-3 py-2.5 text-sm font-semibold text-[var(--ax-accent-text)]'
                      : 'rounded-[10px] px-3 py-2.5 text-sm font-medium text-[var(--ax-text-secondary)] hover:bg-[var(--ax-surface-raised)] hover:text-[var(--ax-text)]'
                  }
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="mt-auto rounded-[14px] border border-[var(--ax-line)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--ax-muted)]">Tu rol</p>
            <p className="mt-1 text-sm font-semibold text-[var(--ax-text)]">{roleLabels[access.role]}</p>
          </div>
        </aside>
        <main className="ax-v2 min-w-0 flex-1 space-y-6 p-6 md:p-10">{children}</main>
      </div>
    </AccessContext.Provider>
  )
}

// Tarjeta de indicador: número grande y una línea de apoyo.
export function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--ax-muted)]">{label}</p>
      <p className="mt-3 font-display text-[44px] leading-none text-[var(--ax-accent-text)]">{value}</p>
      {hint && <p className="mt-2 text-xs text-[var(--ax-muted)]">{hint}</p>}
    </Card>
  )
}

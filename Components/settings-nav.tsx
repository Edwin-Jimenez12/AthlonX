'use client'

import { Circle, ShieldCheck, SlidersHorizontal, UserCog, UserRound, Users } from 'lucide-react'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type SettingsSection = { id: string; label: string }
type SettingsNavConfig = { sections: SettingsSection[]; activeSection: string; onSection: (id: string) => void }
type SettingsNavContextValue = { config: SettingsNavConfig | null; setConfig: (config: SettingsNavConfig | null) => void }

const SettingsNavContext = createContext<SettingsNavContextValue | null>(null)

export const settingsSectionIcons: Record<string, typeof Circle> = {
  identidad: UserRound,
  participacion: Users,
  roles: Users,
  equipos: Users,
  configuracion: SlidersHorizontal,
  seguridad: ShieldCheck,
  cuenta: UserCog,
}

// La barra lateral principal lee de aquí las secciones de Mi perfil: así es una sola barra que solo cambia sus secciones.
export function SettingsNavProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SettingsNavConfig | null>(null)
  const value = useMemo(() => ({ config, setConfig }), [config])
  return <SettingsNavContext.Provider value={value}>{children}</SettingsNavContext.Provider>
}

export function useSettingsNavConfig(): SettingsNavConfig | null {
  return useContext(SettingsNavContext)?.config ?? null
}

// Las páginas de Mi perfil registran sus secciones mientras están montadas.
export function useRegisterSettingsNav(sections: SettingsSection[], activeSection: string, onSection: (id: string) => void) {
  const setConfig = useContext(SettingsNavContext)?.setConfig
  useEffect(() => {
    setConfig?.({ sections, activeSection, onSection })
  }, [setConfig, sections, activeSection, onSection])
  useEffect(() => () => setConfig?.(null), [setConfig])
}

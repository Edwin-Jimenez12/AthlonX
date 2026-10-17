import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'athlonx-theme'
const CHANGE_EVENT = 'athlonx-theme-change'

// Caché local solo para pintar la pantalla al cargar; la fuente de verdad es account_preferences.
export function readCachedTheme(): ThemeMode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

// Aplica el tema en toda la plataforma y avisa a los componentes que lo muestran.
export function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Sin almacenamiento local: el tema igual se aplica en esta pantalla.
  }
  window.dispatchEvent(new CustomEvent<ThemeMode>(CHANGE_EVENT, { detail: mode }))
}

// Tema guardado en la cuenta. Devuelve null si no hay sesión.
export async function loadAccountTheme(): Promise<ThemeMode | null> {
  if (!supabase) return null
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null
  const { data } = await supabase.from('account_preferences').select('theme').eq('user_id', userData.user.id).maybeSingle()
  return data?.theme === 'claro' ? 'light' : 'dark'
}

// Al entrar a cualquier pantalla del panel se aplica el tema de la cuenta.
export async function syncAccountTheme() {
  const accountTheme = await loadAccountTheme()
  if (accountTheme) applyTheme(accountTheme)
}

// Cambia el tema en toda la plataforma y lo guarda en la cuenta.
export async function setThemePreference(mode: ThemeMode) {
  applyTheme(mode)
  if (!supabase) return
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return
  await supabase.from('account_preferences').upsert(
    { user_id: userData.user.id, theme: mode === 'light' ? 'claro' : 'oscuro', updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
}

// Tema compartido por el header, el menú de cuenta y Configuración.
export function useThemeMode(): [ThemeMode, (mode: ThemeMode) => Promise<void>] {
  const [mode, setMode] = useState<ThemeMode>('dark')
  useEffect(() => {
    setMode(readCachedTheme())
    function handleChange(event: Event) {
      setMode((event as CustomEvent<ThemeMode>).detail)
    }
    window.addEventListener(CHANGE_EVENT, handleChange)
    return () => window.removeEventListener(CHANGE_EVENT, handleChange)
  }, [])
  return [mode, setThemePreference]
}

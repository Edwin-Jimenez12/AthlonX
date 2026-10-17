'use client'

import { useEffect } from 'react'
import { applyTheme, readCachedTheme, syncAccountTheme } from '../lib/theme'

// Monta el tema de la cuenta en todo el panel: primero la caché local y luego la preferencia guardada.
export function ThemeSync() {
  useEffect(() => {
    applyTheme(readCachedTheme())
    void syncAccountTheme()
  }, [])
  return null
}

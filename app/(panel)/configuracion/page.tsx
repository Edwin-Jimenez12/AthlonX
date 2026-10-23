'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// La configuración de la cuenta vive en Mi perfil. Esta ruta redirige para no romper enlaces antiguos.
export default function LegacySettingsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/mi-perfil?seccion=configuracion')
  }, [router])

  return null
}

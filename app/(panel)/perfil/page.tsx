'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Mi perfil ahora vive en /mi-perfil. Esta ruta redirige para no romper enlaces antiguos.
export default function LegacyProfileRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/mi-perfil')
  }, [router])

  return null
}

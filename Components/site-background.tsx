'use client'

import { useEffect, useState } from 'react'

// Fondos por modalidad. La rotación sigue este orden.
const backgrounds = [
  { modality: 'Rugby', src: '/MarcaAthlonX/fondo.png' },
  { modality: 'Fútbol', src: '/MarcaAthlonX/fondo2.png' },
  { modality: 'Baloncesto', src: '/MarcaAthlonX/fondo3.png' },
]

const ROTATION_MS = 8000

// Fondo fijo de todo el sitio. Cambia entre modalidades con un fundido suave.
// Si el usuario pide menos movimiento, se queda en el primer fondo.
export default function SiteBackground() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    } catch {
      // Si el navegador no soporta la consulta, se mantiene la rotación.
    }
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % backgrounds.length)
    }, ROTATION_MS)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#061019]">
      {backgrounds.map((background, index) => (
        <div
          key={background.modality}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[1500ms] ${index === active ? 'opacity-100' : 'opacity-0'}`}
          style={{ backgroundImage: `url('${background.src}')` }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(3,10,16,.97) 0%, rgba(3,10,16,.82) 38%, rgba(3,10,16,.2) 78%, rgba(3,10,16,.45) 100%)',
        }}
      />
    </div>
  )
}

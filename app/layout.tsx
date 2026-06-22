import './globals.css'
import type { ReactNode  } from 'react'

export const metadata = {
  title: 'AthlonX',
  description: 'Plataforma integral de gestión y rendimiento deportivo',
}

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}

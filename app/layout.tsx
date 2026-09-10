import './globals.css'
import type { ReactNode  } from 'react'
import localFont from 'next/font/local'

const inter = localFont({
  src: './fonts/Inter/Inter-VariableFont_opsz,wght.ttf',
  variable: '--font-inter',
  display: 'swap',
})

const bebasNeue = localFont({
  src: './fonts/Bebas_Neue/BebasNeue-Regular.ttf',
  variable: '--font-bebas-neue',
  display: 'swap',
  weight: '400',
})

const oswald = localFont({
  src: './fonts/Oswald/Oswald-VariableFont_wght.ttf',
  variable: '--font-oswald',
  display: 'swap',
  weight: '200 700',
})

const barlowCondensed = localFont({
  src: './fonts/Barlow_Condensed/BarlowCondensed-Regular.ttf',
  variable: '--font-barlow-condensed',
  display: 'swap',
  weight: '400',
})

export const metadata = {
  title: 'AthlonX',
  description: 'Plataforma integral de gestión y rendimiento deportivo',
}

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${bebasNeue.variable} ${oswald.variable} ${barlowCondensed.variable}`}>
        {children}
      </body>
    </html>
  )
}

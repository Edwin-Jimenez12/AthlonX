import './globals.css'

export const metadata = {
  title: 'AthlonX',
  description: 'Plataforma integral de gestión y rendimiento deportivo',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}

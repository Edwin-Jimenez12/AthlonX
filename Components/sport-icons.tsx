// Iconos de disciplina con el mismo trazo que lucide-react.
// RugbyBall es el icono oficial de lucide (rugby-ball). Fútbol y baloncesto no están en lucide,
// por eso se dibujan aquí con el mismo estilo. La altura se controla desde className.

type IconProps = { className?: string }

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

// Mismo dibujo que lucide-react RugbyBall (v1.56.0).
export function RugbyBallIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...strokeProps}>
      <path d="m10 10 4 4" />
      <path d="m13 7 4 4" />
      <path d="M15.34 2.138A15 15 0 002.138 15.34c-.357 2.94.004 4.919.805 5.717.798.8 2.778 1.162 5.718.805A15 15 0 0021.862 8.661c.357-2.94-.004-4.92-.805-5.718-.798-.8-2.778-1.162-5.717-.805" />
      <path d="M17 7 7 17" />
      <path d="m7 13 4 4" />
    </svg>
  )
}

export function SoccerBallIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...strokeProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8.2l3.3 2.4-1.3 3.8h-4l-1.3-3.8z" />
      <path d="M12 8.2V3M15.3 10.6l4.8-1.6M14 14.4l3 3.6M10 14.4l-3 3.6M8.7 10.6l-4.8-1.6" />
    </svg>
  )
}

export function BasketballIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...strokeProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2v20" />
      <path d="M5.2 4.9c2.6 2.6 2.6 11.6 0 14.2M18.8 4.9c-2.6 2.6-2.6 11.6 0 14.2" />
    </svg>
  )
}

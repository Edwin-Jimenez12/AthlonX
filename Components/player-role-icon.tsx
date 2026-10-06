'use client'

import { Footprints, Hand } from 'lucide-react'

type Props = {
  position?: string | null
  showLabel?: boolean
}

function isGoalkeeper(position?: string | null) {
  const normalized = (position || '').toLocaleLowerCase('es-PA')
  return ['portero', 'arquero', 'guardameta', 'goalkeeper', 'keeper'].some(
    (term) => normalized.includes(term),
  )
}

export function PlayerRoleIcon({ position, showLabel = false }: Props) {
  const goalkeeper = isGoalkeeper(position)
  const label = goalkeeper ? 'Portero' : 'Jugador'
  const Icon = goalkeeper ? Hand : Footprints

  return (
    <span
      className="inline-flex items-center gap-1 text-[#b4ff45]"
      title={label}
      aria-label={label}
    >
      <Icon size={14} aria-hidden="true" />
      {showLabel && <span>{label}</span>}
    </span>
  )
}

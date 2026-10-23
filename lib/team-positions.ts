// Posiciones que se ofrecen al editar un jugador en Mi equipo, según la disciplina del equipo.
// Rugby usa la nomenclatura de XV, que también cubre las posiciones de Sevens
// (mismos nombres que Components/quick-tournament-teams-section.tsx).

const rugbyPositions = [
  'Pilar izquierdo',
  'Hooker',
  'Pilar derecho',
  'Segunda línea izquierdo',
  'Segunda línea derecho',
  'Ala cerrado',
  'Ala abierto',
  'Octavo',
  'Medio scrum',
  'Apertura',
  'Ala izquierdo',
  'Centro interior',
  'Centro exterior',
  'Ala derecho',
  'Zaguero',
]

const footballPositions = ['Portero', 'Defensa', 'Lateral', 'Mediocampista', 'Extremo', 'Delantero']

const basketballPositions = ['Base', 'Escolta', 'Alero', 'Ala-pívot', 'Pívot']

export function teamPositionOptions(discipline: string | null | undefined, disciplineCode?: string | null) {
  const key = `${disciplineCode || ''} ${discipline || ''}`.toLocaleLowerCase('es-PA')
  if (key.includes('rugby')) return rugbyPositions
  if (key.includes('futbol') || key.includes('fútbol')) return footballPositions
  if (key.includes('basket') || key.includes('baloncesto') || key.includes('básquet') || key.includes('basquet')) return basketballPositions
  return []
}

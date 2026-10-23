export const rugby = {
  // Minutos de expulsión temporal por tarjeta amarilla según la modalidad.
  sinBinMinutes: { seven: 2, xv: 10 } as Record<string, number>,
  points: { try: 5, conversion: 2, penalty: 3 },
} as const

type RugbyCardEvent = {
  id?: string
  player_id?: string | null
  team_id?: string | null
  event_type: string
  match_second?: number | null
  created_at?: string | null
  is_corrected?: boolean
}

export function rugbySinBinSeconds(modalityCode?: string | null) {
  return (rugby.sinBinMinutes[modalityCode || ''] ?? rugby.sinBinMinutes.xv) * 60
}

// Expulsiones temporales que siguen corriendo. El reloj del partido se reinicia
// en cada tiempo, así que también se exige que la tarjeta sea reciente.
export function rugbyActiveSinBins(events: RugbyCardEvent[], currentSecond: number, durationSeconds: number, now = Date.now()) {
  const wallLimit = (durationSeconds + 15 * 60) * 1000
  return events
    .filter((event) => event.event_type === 'yellow_card' && !event.is_corrected && event.player_id)
    .filter((event) => !event.created_at || now - Date.parse(event.created_at) < wallLimit)
    .map((event) => ({ ...event, remaining: durationSeconds - (currentSecond - (event.match_second ?? 0)) }))
    .filter((event) => event.remaining > 0 && event.remaining <= durationSeconds)
}

type FootballCardEvent = {
  player_id?: string | null
  event_type: string
  is_corrected?: boolean
}

// Estado disciplinario de un jugador: dos amarillas equivalen a una roja.
export function footballPlayerCards(events: FootballCardEvent[], playerId: string) {
  const own = events.filter((event) => event.player_id === playerId && !event.is_corrected)
  const yellows = own.filter((event) => event.event_type === 'yellow_card').length
  const reds = own.filter((event) => event.event_type === 'red_card').length
  return { yellows, sentOff: reds > 0 || yellows >= 2 }
}

// Indica si la próxima amarilla de este jugador debe convertirse en roja.
export function footballNextYellowIsRed(events: FootballCardEvent[], playerId: string) {
  const { yellows, sentOff } = footballPlayerCards(events, playerId)
  return !sentOff && yellows === 1
}

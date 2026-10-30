export const basketball = {
  teams: 16, courts: 1, minRoster: 3, maxRoster: 6, playersOnCourt: 3,
  winningMargin: 2, rounds: ['Octavos de final', 'Cuartos de final', 'Semifinales', 'Final'],
  events: { basket_inside: 1, basket_outside: 2, basket_free_throw: 1, basket_foul: 0 },
} as const
export type BasketballEventType = keyof typeof basketball.events
export type BasketballSettings = {
  tournament_id?: string; period_minutes: number; interval_minutes: number; overtime_minutes: number;
  opens_at: string; closes_at: string; venue: string;
}
export type BasketballTeam = { id: string; name: string; division_id: string; division_name?: string; colors?: string }
export type BasketballMatch = {
  id: string; local_team_id: string; visitor_team_id: string; local_score: number; visitor_score: number;
  status: string; scheduled_time?: string | null; elapsed_seconds?: number; started_at?: string | null;
  is_paused?: boolean; match_phase?: string; basketball_version?: number;
}
export type BasketballBracketMatch = { id: string; stage_id: string; position: number; local_team_id: string | null; visitor_team_id: string | null; winner_team_id: string | null; source_match_id: string | null }
export type BasketballStage = { id: string; round_number: number; name: string }
export function basketballTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)) return NaN
  const [h, m] = value.split(':').map(Number); return h * 60 + m
}
export function validateBasketballSettings(s: BasketballSettings) {
  if (!Number.isInteger(s.period_minutes) || s.period_minutes < 1 || s.period_minutes > 120
    || !Number.isInteger(s.interval_minutes) || s.interval_minutes < 0 || s.interval_minutes > 120
    || !Number.isInteger(s.overtime_minutes) || s.overtime_minutes < 1 || s.overtime_minutes > 120) return 'Completa la duración del periodo, el intervalo y la duración de cada bloque de prórroga.'
  const start = basketballTime(s.opens_at), end = basketballTime(s.closes_at)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 'Revisa el horario de apertura y cierre.'
  if (15 * s.period_minutes + 14 * s.interval_minutes > end - start) return 'Los 15 partidos no caben en el horario de la jornada.'
  if (!s.venue.trim()) return 'Completa la sede.'
  return ''
}
export function basketballSchedule(s: BasketballSettings) {
  const error = validateBasketballSettings(s); if (error) throw new Error(error)
  let index = 0
  return basketball.rounds.flatMap((name, round) => Array.from({ length: 8 / 2 ** round }, (_, position) => {
    const minutes = basketballTime(s.opens_at) + index++ * (s.period_minutes + s.interval_minutes)
    return { round: round + 1, position: position + 1, name, time: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}` }
  }))
}
export function basketballElapsed(m: BasketballMatch, now = Date.now()) {
  return (m.elapsed_seconds || 0) + (m.status === 'live' && !m.is_paused && m.started_at ? Math.max(0, Math.floor((now - Date.parse(m.started_at)) / 1000)) : 0)
}
export function basketballCanFinish(m: BasketballMatch, settings: BasketballSettings, elapsed: number) {
  return m.match_phase === 'extra_time' ? Math.abs(m.local_score - m.visitor_score) >= 2 : elapsed >= settings.period_minutes * 60 && m.local_score !== m.visitor_score
}
export function basketballScore(events: { team_id?: string | null; event_type: string; points: number; is_corrected?: boolean }[], localId: string, visitorId: string) {
  const score = { local: 0, visitor: 0 }
  for (const e of events) {
    if (e.is_corrected || !Object.hasOwn(basketball.events, e.event_type)) continue
    const points = basketball.events[e.event_type as BasketballEventType]
    if (e.team_id === localId) score.local += points
    if (e.team_id === visitorId) score.visitor += points
  }
  return score
}
export function basketballStandings(teams: BasketballTeam[], stages: BasketballStage[], bracket: BasketballBracketMatch[]) {
  const final = bracket.find(b => stages.find(s => s.id === b.stage_id)?.round_number === 4)
  return teams.map(team => {
    const played = bracket.filter(b => b.local_team_id === team.id || b.visitor_team_id === team.id)
    const eliminated = played.find(b => b.winner_team_id && b.winner_team_id !== team.id)
    const round = eliminated ? stages.find(s => s.id === eliminated.stage_id)?.round_number : undefined
    const champion = final?.winner_team_id === team.id
    const rank = champion ? 1 : round ? ({ 1: 9, 2: 5, 3: 3, 4: 2 }[round] || null) : null
    return { ...team, rank, label: champion ? 'Campeón' : round === 4 ? 'Finalista' : round ? `Eliminado en ${basketball.rounds[round - 1].toLowerCase()}` : 'En competencia' }
  }).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || a.name.localeCompare(b.name, 'es'))
}
export type BasketballSummaryGame = {
  round: number; position: number; stageName: string; time: string
  localId: string | null; visitorId: string | null; match: BasketballMatch
}
// Partidos de la llave ya programados, ordenados por ronda y posición. Sin partido creado no aparecen.
export function basketballSummaryGames(
  slots: { round: number; position: number; time: string }[],
  stages: BasketballStage[],
  bracket: BasketballBracketMatch[],
  matches: BasketballMatch[],
): BasketballSummaryGame[] {
  return bracket.flatMap((b) => {
    const stage = stages.find((s) => s.id === b.stage_id)
    const match = matches.find((m) => m.id === b.source_match_id)
    if (!stage || !match) return []
    const slot = slots.find((s) => s.round === stage.round_number && s.position === b.position)
    return [{
      round: stage.round_number, position: b.position, stageName: stage.name,
      time: match.scheduled_time?.slice(0, 5) || slot?.time || '',
      localId: b.local_team_id, visitorId: b.visitor_team_id, match,
    }]
  }).sort((a, b) => a.round - b.round || a.position - b.position)
}
export function basketballChampionId(stages: BasketballStage[], bracket: BasketballBracketMatch[]) {
  const final = stages.find((s) => s.round_number === 4)
  return final ? bracket.find((b) => b.stage_id === final.id)?.winner_team_id ?? null : null
}
export function basketballUpcoming(games: BasketballSummaryGame[], limit = 5) {
  return games.filter((g) => g.match.status !== 'finished').slice(0, limit)
}
export function basketballRecent(games: BasketballSummaryGame[], limit = 5) {
  return games.filter((g) => g.match.status === 'finished').sort((a, b) => b.round - a.round || b.position - a.position).slice(0, limit)
}
export function basketballFeatured(games: BasketballSummaryGame[]) {
  return games.find((g) => g.match.status === 'live') ?? basketballUpcoming(games, 1)[0] ?? null
}
export function basketballShuffle(ids: string[]) {
  const result = [...ids]
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] }
  return result
}

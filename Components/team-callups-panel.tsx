'use client'

import { ArrowUpRight, Users } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TournamentCallupsPanel } from './tournament-callups-panel'

type TeamTournamentLink = { tournament_id: string; division_id: string; tournament_divisions: { name: string } | Array<{ name: string }> | null }
type TeamTournament = { id: string; name: string; status: string; start_date: string | null }
type TeamDivision = { id: string; name: string }
type TeamRow = { id: string; name: string; division_id: string; division_name: string }
type MatchRow = { id: string; fixture_id: string; date_number: number; calendar_date: string | null; scheduled_time: string | null; division_id: string; local_team_id: string; visitor_team_id: string; local: { name: string } | Array<{ name: string }> | null; visitor: { name: string } | Array<{ name: string }> | null }
type RosterRow = { team_id: string; division_id: string | null; division_name: string | null; player_id: string; full_name: string; shirt_number: number | null; position: string | null }
type TeamPlayerProfile = { id: string; full_name: string; shirt_number: number | null; position: string | null }
type TournamentWithCallups = TeamTournament & { divisions: TeamDivision[]; teams: TeamRow[]; matches: ReturnType<typeof normalizeMatch>[]; rosters: RosterRow[] }

function relatedName(value: MatchRow['local']) {
  return Array.isArray(value) ? value[0]?.name || 'Rival pendiente' : value?.name || 'Rival pendiente'
}

export function TeamCallupsPanel({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [tournaments, setTournaments] = useState<TournamentWithCallups[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) { setLoading(false); return }
      const { data: links, error: linksError } = await supabase.from('tournament_teams').select('tournament_id, division_id, tournament_divisions(name)').eq('team_id', teamId)
      if (linksError) { setError(linksError.message); setLoading(false); return }
      const typedLinks = (links ?? []) as TeamTournamentLink[]
      const tournamentIds = Array.from(new Set(typedLinks.map((link) => link.tournament_id)))
      if (!tournamentIds.length) { setTournaments([]); setLoading(false); return }
      const [{ data: tournamentRows }, { data: fixtures }, { data: playerLinks }, { data: teamDivisions }] = await Promise.all([
        supabase.from('tournaments').select('id, name, status, start_date').in('id', tournamentIds).neq('status', 'finished').order('start_date', { ascending: true }),
        supabase.from('fixtures').select('id, tournament_id, date_number, calendar_date').in('tournament_id', tournamentIds).order('date_number'),
        supabase.from('team_players').select('team_id, division_id, player_id').eq('team_id', teamId),
        supabase.from('team_division_catalog').select('id, name').eq('team_id', teamId),
      ])
      const fixtureIds = (fixtures ?? []).map((fixture) => fixture.id)
      const playerIds = (playerLinks ?? []).map((link) => link.player_id)
      const [{ data: matchRows }, { data: players }] = await Promise.all([
        fixtureIds.length ? supabase.from('matches').select('id, fixture_id, division_id, scheduled_time, local_team_id, visitor_team_id, local:teams!matches_local_team_id_fkey(name), visitor:teams!matches_visitor_team_id_fkey(name)').in('fixture_id', fixtureIds) : Promise.resolve({ data: [] }),
        playerIds.length ? supabase.from('players').select('id, full_name, shirt_number, position').in('id', playerIds) : Promise.resolve({ data: [] }),
      ])
      const divisionNames = new Map<string, string>()
      typedLinks.forEach((link) => { const division = Array.isArray(link.tournament_divisions) ? link.tournament_divisions[0] : link.tournament_divisions; divisionNames.set(link.division_id, division?.name || 'División') })
      const teamDivisionNames = new Map((teamDivisions ?? []).map((division) => [division.id, division.name]))
      const tournamentDivisionByName = new Map(Array.from(divisionNames.entries()).map(([id, name]) => [name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(), id]))
      const rosterById = new Map((players as TeamPlayerProfile[] ?? []).map((player) => [player.id, player]))
      const rosters: RosterRow[] = (playerLinks ?? []).map((link) => {
        const player = rosterById.get(link.player_id)
        const divisionName = teamDivisionNames.get(link.division_id) || null
        const normalizedDivisionName = divisionName?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
        const tournamentDivisionId = (normalizedDivisionName ? tournamentDivisionByName.get(normalizedDivisionName) : null) || (link.division_id && divisionNames.has(link.division_id) ? link.division_id : null)
        return player ? { team_id: teamId, division_id: tournamentDivisionId, division_name: divisionName, player_id: link.player_id, full_name: player.full_name, shirt_number: player.shirt_number, position: player.position } : null
      }).filter((row): row is RosterRow => Boolean(row))
      const fixtureById = new Map((fixtures ?? []).map((fixture) => [fixture.id, fixture]))
      const normalizedMatches = ((matchRows ?? []) as MatchRow[]).map((match) => normalizeMatch(match, fixtureById, divisionNames))
      const nextTournaments = ((tournamentRows ?? []) as TeamTournament[]).map((tournament) => {
        const tournamentLinks = typedLinks.filter((link) => link.tournament_id === tournament.id)
        const divisions = Array.from(new Map(tournamentLinks.map((link) => [link.division_id, { id: link.division_id, name: divisionNames.get(link.division_id) || 'División' }])).values())
        const teams = divisions.map((division) => ({ id: teamId, name: teamName, division_id: division.id, division_name: division.name }))
        return { ...tournament, divisions, teams, matches: normalizedMatches.filter((match) => match.tournament_id === tournament.id), rosters }
      }).filter((tournament) => tournament.matches.length > 0)
      if (!active) return
      setTournaments(nextTournaments)
      setError('')
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [teamId, teamName])

  return <section className="rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Competencias del equipo</p><h3 className="mt-2 font-display text-3xl uppercase">Convocatorias</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Selecciona la fecha y la división para preparar directamente la plantilla de jugadores de tu equipo.</p></div><Users className="text-[#b4ff45]" size={25} /></div>{loading ? <p className="mt-5 text-sm text-slate-400">Cargando competencias...</p> : error ? <p className="mt-5 rounded-2xl border border-[#ff7d88]/40 bg-[#ff7d88]/10 p-4 text-sm text-[#ffb0b7]">{error}</p> : tournaments.length ? <div className="mt-5 space-y-6">{tournaments.map((tournament) => <article key={tournament.id} className="rounded-2xl border border-[#31556b] bg-[#07131e] p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center"><div><h4 className="font-bold text-white">{tournament.name}</h4><p className="mt-1 text-xs uppercase tracking-wider text-slate-500">{tournament.status} · {teamName}</p></div><Link href={`/dashboard/torneos/ver/${tournament.id}?tab=convocatorias`} className="inline-flex items-center gap-2 text-sm font-bold text-[#b4ff45] hover:text-white">Ver competencia <ArrowUpRight size={16} /></Link></div><div className="mt-4"><TournamentCallupsPanel tournamentId={tournament.id} divisions={tournament.divisions} teams={tournament.teams} matches={tournament.matches} rosters={tournament.rosters} isOwner={false} managedTeamId={teamId} tournamentStartDate={tournament.start_date} /></div></article>)}</div> : <p className="mt-5 rounded-2xl border border-dashed border-[#31556b] p-4 text-sm text-slate-400">No hay torneos activos asociados a este equipo.</p>}</section>
}

function normalizeMatch(match: MatchRow, fixtureById: Map<string, { id: string; tournament_id: string; date_number: number; calendar_date: string | null }>, divisionNames: Map<string, string>) {
  const fixture = fixtureById.get(match.fixture_id)
  return { id: match.id, fixture_id: match.fixture_id, tournament_id: fixture?.tournament_id || '', date_number: fixture?.date_number || 0, calendar_date: fixture?.calendar_date || null, scheduled_time: match.scheduled_time, division_name: divisionNames.get(match.division_id) || 'División', local_team_id: match.local_team_id, local_team_name: relatedName(match.local), visitor_team_id: match.visitor_team_id, visitor_team_name: relatedName(match.visitor) }
}

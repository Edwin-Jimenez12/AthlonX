'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export const DIVISION_OPTIONS = ['Primera división', 'Segunda división', 'Femenina']

export type MemberRole = 'owner' | 'atleta' | 'entrenador' | 'staff' | 'directivo'

export const roleNames: Record<MemberRole, string> = {
  owner: 'Propietario',
  atleta: 'Jugador',
  entrenador: 'Entrenador',
  staff: 'Staff',
  directivo: 'Directivo',
}

export type TeamDivision = { id: string; name: string }

export type TeamMember = {
  user_id: string
  full_name: string
  avatar_url: string | null
  username: string | null
  athlonx_code: string | null
  role: MemberRole
  role_label: string | null
  division_id: string | null
  division_name: string | null
}

export type PendingInvitation = {
  id: string
  userId: string
  fullName: string
  username: string | null
  avatarUrl: string | null
  role: MemberRole
  roleLabel: string | null
  divisionId: string | null
}

// Un jugador de la plantilla. Puede venir de team_players (con dorsal y posición),
// de una membresía de atleta sin fila en team_players, o de una invitación pendiente.
export type RosterPlayer = {
  key: string
  source: 'roster' | 'member' | 'invitation'
  playerId: string | null
  userId: string | null
  profileId: string | null
  divisionId: string | null
  fullName: string
  username: string | null
  avatarUrl: string | null
  shirtNumber: number | null
  position: string | null
  pending: boolean
  member: TeamMember | null
  invitationId: string | null
}

type PlayerRow = { player_id: string; division_id: string | null; players: { id: string; user_id: string | null; full_name: string; shirt_number: number | null; position: string | null; photo_url: string | null } | Array<{ id: string; user_id: string | null; full_name: string; shirt_number: number | null; position: string | null; photo_url: string | null }> | null }

type ProfileRow = { id: string; full_name: string; username: string | null; avatar_url: string | null }

export function useTeamRoster(teamId: string | undefined) {
  const [divisions, setDivisions] = useState<TeamDivision[]>([])
  const [players, setPlayers] = useState<RosterPlayer[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!supabase || !teamId) { setLoading(false); return }
    const [divisionResult, playerResult, memberResult, invitationResult] = await Promise.all([
      supabase.from('team_division_catalog').select('id, name').eq('team_id', teamId).order('name'),
      supabase.from('team_players').select('player_id, division_id, players(id, user_id, full_name, shirt_number, position, photo_url)').eq('team_id', teamId),
      supabase.rpc('get_team_members_for_manager', { p_team_id: teamId }),
      // Solo devuelve las invitaciones que la persona actual creó (política de affiliation_requests).
      supabase.from('affiliation_requests').select('id, target_user_id, role, role_label, division_id').eq('source_team_id', teamId).eq('status', 'pending'),
    ])

    let playerRows = playerResult.data as PlayerRow[] | null
    let playerError = playerResult.error
    if (playerError?.message.toLowerCase().includes('team_players.division_id')) {
      const fallback = await supabase.from('team_players').select('player_id, players(id, user_id, full_name, shirt_number, position, photo_url)').eq('team_id', teamId)
      playerRows = fallback.data ? (fallback.data as PlayerRow[]).map((row) => ({ ...row, division_id: null })) : null
      playerError = fallback.error
    }
    if (divisionResult.error || playerError) {
      setError(divisionResult.error?.message || playerError?.message || 'No se pudo cargar la plantilla.')
      setLoading(false)
      return
    }

    const allowed = new Set(DIVISION_OPTIONS.map((name) => name.toLowerCase()))
    const nextDivisions = ((divisionResult.data ?? []) as TeamDivision[])
      .filter((division) => allowed.has(division.name.trim().toLowerCase()))
      .sort((a, b) => DIVISION_OPTIONS.findIndex((name) => name.toLowerCase() === a.name.trim().toLowerCase()) - DIVISION_OPTIONS.findIndex((name) => name.toLowerCase() === b.name.trim().toLowerCase()))
    const nextMembers = memberResult.error ? [] : ((memberResult.data ?? []) as TeamMember[])
    const pendingRows = invitationResult.error ? [] : ((invitationResult.data ?? []) as Array<{ id: string; target_user_id: string; role: MemberRole; role_label: string | null; division_id: string | null }>)

    const roster = (playerRows ?? []).map((row) => ({ divisionId: row.division_id, player: Array.isArray(row.players) ? row.players[0] : row.players })).filter((row) => Boolean(row.player))
    const rosterUserIds = new Set(roster.map((row) => row.player!.user_id).filter((id): id is string => Boolean(id)))
    const profileIds = [...new Set([...rosterUserIds, ...pendingRows.map((row) => row.target_user_id)])]
    const { data: profileRows } = profileIds.length ? await supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', profileIds) : { data: [] as ProfileRow[] }
    const profiles = new Map(((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]))
    const memberByUser = new Map(nextMembers.filter((member) => member.role === 'atleta').map((member) => [member.user_id, member]))

    const nextPlayers: RosterPlayer[] = [
      ...roster.map(({ divisionId, player }) => {
        const profile = player!.user_id ? profiles.get(player!.user_id) : undefined
        return {
          key: `roster-${player!.id}`,
          source: 'roster' as const,
          playerId: player!.id,
          userId: player!.user_id,
          profileId: player!.user_id || player!.id,
          divisionId,
          fullName: profile?.full_name || player!.full_name,
          username: profile?.username ?? null,
          avatarUrl: profile?.avatar_url || player!.photo_url,
          shirtNumber: player!.shirt_number,
          position: player!.position,
          pending: false,
          member: player!.user_id ? memberByUser.get(player!.user_id) ?? null : null,
          invitationId: null,
        }
      }),
      // Atletas con membresía que todavía no tienen fila en team_players.
      ...nextMembers.filter((member) => member.role === 'atleta' && !rosterUserIds.has(member.user_id)).map((member) => ({
        key: `member-${member.user_id}-${member.division_id || 'global'}`,
        source: 'member' as const,
        playerId: null,
        userId: member.user_id,
        profileId: member.user_id,
        divisionId: member.division_id,
        fullName: member.full_name,
        username: member.username,
        avatarUrl: member.avatar_url,
        shirtNumber: null,
        position: null,
        pending: false,
        member,
        invitationId: null,
      })),
      ...pendingRows.filter((row) => row.role === 'atleta').map((row) => {
        const profile = profiles.get(row.target_user_id)
        return {
          key: `invitation-${row.id}`,
          source: 'invitation' as const,
          playerId: null,
          userId: row.target_user_id,
          profileId: row.target_user_id,
          divisionId: row.division_id,
          fullName: profile?.full_name || 'Persona invitada',
          username: profile?.username ?? null,
          avatarUrl: profile?.avatar_url ?? null,
          shirtNumber: null,
          position: null,
          pending: true,
          member: null,
          invitationId: row.id,
        }
      }),
    ]

    setDivisions(nextDivisions)
    setPlayers(nextPlayers)
    setMembers(nextMembers)
    setInvitations(pendingRows.filter((row) => row.role !== 'atleta').map((row) => {
      const profile = profiles.get(row.target_user_id)
      return { id: row.id, userId: row.target_user_id, fullName: profile?.full_name || 'Persona invitada', username: profile?.username ?? null, avatarUrl: profile?.avatar_url ?? null, role: row.role, roleLabel: row.role_label, divisionId: row.division_id }
    }))
    setError(memberResult.error?.message || '')
    setLoading(false)
  }, [teamId])

  useEffect(() => {
    void load()
    const refresh = () => void load()
    window.addEventListener('athlonx-team-members-change', refresh)
    return () => window.removeEventListener('athlonx-team-members-change', refresh)
  }, [load])

  return { divisions, players, members, invitations, loading, error, reload: load }
}

// Avisa al resto del panel (cabecera, notificaciones, convocatorias) que cambió la plantilla.
export function announceTeamChange() {
  window.dispatchEvent(new CustomEvent('athlonx-team-members-change'))
}

export function sortPlayers(players: RosterPlayer[]) {
  return [...players].sort((a, b) => {
    if (a.pending !== b.pending) return a.pending ? 1 : -1
    if (a.shirtNumber !== null && b.shirtNumber !== null && a.shirtNumber !== b.shirtNumber) return a.shirtNumber - b.shirtNumber
    if (a.shirtNumber === null && b.shirtNumber !== null) return 1
    if (a.shirtNumber !== null && b.shirtNumber === null) return -1
    return a.fullName.localeCompare(b.fullName, 'es')
  })
}

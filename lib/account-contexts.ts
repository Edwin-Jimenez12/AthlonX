import { supabase } from './supabase'

export type AccountContext = {
  id: string
  contextType: 'personal' | 'team' | 'organization'
  teamId: string | null
  organizationId: string | null
  name: string
  discipline: string | null
  role: 'atleta' | 'entrenador' | 'staff' | 'directivo'
  roleLabel: string | null
}

export async function loadAccountContexts(userId: string): Promise<AccountContext[]> {
  if (!supabase) return []

  const { data: rows, error } = await supabase
    .from('user_contexts')
    .select('id, context_type, team_id, organization_id, role, role_label')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error || !rows?.length) return []

  const teamIds = rows.flatMap((row) => row.team_id ? [row.team_id] : [])
  const organizationIds = rows.flatMap((row) => row.organization_id ? [row.organization_id] : [])
  const [{ data: teams }, { data: organizations }] = await Promise.all([
    teamIds.length ? supabase.from('teams').select('id, name, discipline_id').in('id', teamIds) : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from('organizations').select('id, name').in('id', organizationIds) : Promise.resolve({ data: [] }),
  ])

  const teamNames = new Map((teams ?? []).map((team) => [team.id, team.name]))
  const organizationNames = new Map((organizations ?? []).map((organization) => [organization.id, organization.name]))

  return rows.map((row) => ({
    id: row.id,
    contextType: row.context_type,
    teamId: row.team_id,
    organizationId: row.organization_id,
    name: row.context_type === 'personal'
      ? 'Mi cuenta'
      : row.team_id ? (teamNames.get(row.team_id) ?? 'Equipo') : (organizationNames.get(row.organization_id ?? '') ?? 'Organización'),
    discipline: null,
    role: row.role,
    roleLabel: row.role_label,
  }))
}

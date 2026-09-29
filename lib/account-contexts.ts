import { supabase } from './supabase'

export type AccountRole = 'atleta' | 'entrenador' | 'staff' | 'directivo'

export type AccountContext = {
  id: string
  contextType: 'personal' | 'team' | 'organization'
  teamId: string | null
  organizationId: string | null
  name: string
  discipline: string | null
  role: AccountRole
  roleLabel: string | null
}

const accountRoles: AccountRole[] = ['atleta', 'entrenador', 'staff', 'directivo']

function normalizeRole(value: unknown): AccountRole | null {
  return typeof value === 'string' && accountRoles.includes(value as AccountRole)
    ? value as AccountRole
    : null
}

function roleFromTeamContext(value: unknown): AccountRole {
  if (value === 'owner') return 'directivo'
  if (value === 'coach') return 'entrenador'
  if (value === 'arbitro' || value === 'analista') return 'staff'
  return normalizeRole(value) ?? 'staff'
}

export async function loadAccountContexts(userId: string): Promise<AccountContext[]> {
  if (!supabase) return []

  const [{ data: contextRows }, { data: roleRows }, { data: authData }] = await Promise.all([
    supabase
    .from('user_contexts')
    .select('id, context_type, team_id, organization_id, role, role_label')
    .eq('user_id', userId)
    .eq('status', 'active'),
    supabase.from('user_roles').select('role').eq('user_id', userId),
    supabase.auth.getUser(),
  ])

  const rows = contextRows ?? []
  const contextPersonalRoles = rows
    .filter((row) => row.context_type === 'personal')
    .map((row) => normalizeRole(row.role))
    .filter((role): role is AccountRole => Boolean(role))
  const metadataRoles = authData.user?.user_metadata?.roles
  const fallbackRoles = Array.isArray(metadataRoles)
    ? metadataRoles.map((role: unknown) => normalizeRole(role)).filter((role: AccountRole | null): role is AccountRole => Boolean(role))
    : normalizeRole(authData.user?.user_metadata?.role) ? [normalizeRole(authData.user?.user_metadata?.role) as AccountRole] : []
  const databaseRoles = (roleRows ?? [])
    .map((row) => normalizeRole(row.role))
    .filter((role): role is AccountRole => Boolean(role))
  const personalRoles = [...new Set([...contextPersonalRoles, ...databaseRoles, ...fallbackRoles])]
  const existingPersonalRoles = new Set(contextPersonalRoles)
  const generatedPersonalRows = personalRoles
    .filter((role) => !existingPersonalRoles.has(role))
    .map((role) => ({
      id: `personal:${userId}:${role}`,
      context_type: 'personal' as const,
      team_id: null,
      organization_id: null,
      role,
      role_label: null,
    }))
  const personalRows = [...rows.filter((row) => row.context_type === 'personal'), ...generatedPersonalRows]
  const contextRowsWithoutPersonal = rows.filter((row) => row.context_type !== 'personal')
  const allRows = [...personalRows, ...contextRowsWithoutPersonal]

  if (!allRows.length) return []

  const teamIds = allRows.flatMap((row) => row.team_id ? [row.team_id] : [])
  const organizationIds = allRows.flatMap((row) => row.organization_id ? [row.organization_id] : [])
  const [{ data: teams }, { data: organizations }, { data: disciplines }] = await Promise.all([
    teamIds.length ? supabase.from('teams').select('id, name, discipline_id').in('id', teamIds).eq('is_official', true) : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from('organizations').select('id, name').in('id', organizationIds) : Promise.resolve({ data: [] }),
    supabase.from('disciplines').select('id, name').eq('is_active', true),
  ])

  const teamNames = new Map((teams ?? []).map((team) => [team.id, team.name]))
  const teamDisciplines = new Map((teams ?? []).map((team) => [team.id, team.discipline_id]))
  const disciplineNames = new Map((disciplines ?? []).map((discipline) => [discipline.id, discipline.name]))
  const organizationNames = new Map((organizations ?? []).map((organization) => [organization.id, organization.name]))

  return allRows.map((row) => ({
    id: row.id,
    contextType: row.context_type,
    teamId: row.team_id,
    organizationId: row.organization_id,
    name: row.context_type === 'personal'
      ? 'Mi vista'
      : row.team_id ? (teamNames.get(row.team_id) ?? 'Equipo') : (organizationNames.get(row.organization_id ?? '') ?? 'Organización'),
    discipline: row.team_id ? disciplineNames.get(teamDisciplines.get(row.team_id) ?? '') ?? null : null,
    role: row.context_type === 'personal' ? normalizeRole(row.role) ?? 'atleta' : roleFromTeamContext(row.role),
    roleLabel: row.role_label,
  }))
}

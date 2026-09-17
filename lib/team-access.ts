import { supabase } from './supabase'

export type ManagedTeam = {
  id: string
  name: string
  city: string | null
  disciplineId: string
  discipline: string
  disciplineCode: string
  role: string
}

export async function loadManagedTeams(userId: string): Promise<ManagedTeam[]> {
  if (!supabase) return []

  const { data: memberships, error: membershipError } = await supabase
    .from('team_user_memberships')
    .select('team_id, role')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (membershipError || !memberships?.length) return []

  const teamIds = memberships.map((membership) => membership.team_id)
  const [{ data: teams }, { data: disciplines }] = await Promise.all([
    supabase.from('teams').select('id, name, city, discipline_id').in('id', teamIds),
    supabase.from('disciplines').select('id, name, code').eq('is_active', true),
  ])

  const disciplineById = new Map((disciplines ?? []).map((discipline) => [discipline.id, discipline]))
  return (teams ?? []).map((team) => {
    const discipline = disciplineById.get(team.discipline_id)
    const membership = memberships.find((item) => item.team_id === team.id)
    return {
      id: team.id,
      name: team.name,
      city: team.city,
      disciplineId: team.discipline_id ?? '',
      discipline: discipline?.name ?? 'Disciplina pendiente',
      disciplineCode: discipline?.code ?? '',
      role: membership?.role ?? 'staff',
    }
  })
}

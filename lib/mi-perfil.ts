import { supabase } from './supabase'

export type Theme = 'oscuro' | 'claro'
export type PrivacyField = 'email' | 'phone' | 'age'
export type Visibility = 'owner' | 'public'

export type PersonaProfile = {
  userId: string
  email: string
  emailVerified: boolean
  firstName: string
  lastName: string
  fullName: string
  phone: string
  bloodType: string
  birthDate: string | null
  athlonxCode: string
  allowInvitations: boolean
  privacy: Record<PrivacyField, Visibility>
  roles: string[]
  staffPositionName: string | null
  teams: Array<{ id: string; name: string; athlonxCode: string; discipline: string; role: string; roleLabel: string | null; status: string; shirtNumber: number | null }>
  organizations: Array<{ id: string; name: string; athlonxCode: string; role: string; status: string }>
  tournaments: Array<{ id: string; name: string; season: string | null; visible: boolean }>
}

export type TeamDivision = { id: string; name: string; athlonxCode: string; level: string | null; ageGroup: string | null; gender: string | null }

export type TeamMember = {
  userId: string
  fullName: string
  role: string
  roleLabel: string | null
  divisionId: string | null
  divisionName: string | null
}

export type TeamProfile = {
  id: string
  name: string
  handle: string
  athlonxCode: string
  city: string
  country: string
  description: string
  disciplineId: string
  disciplineName: string
  organizationName: string | null
  isPublic: boolean
  contactEmail: string
  contactPhone: string
  websiteUrl: string
  logoUrl: string
  myRole: string
  memberCounts: Record<string, number>
  divisions: TeamDivision[]
  members: TeamMember[]
}

export type OrganizationProfile = {
  id: string
  name: string
  handle: string
  athlonxCode: string
  type: string
  country: string
  city: string
  description: string
  contactEmail: string
  contactPhone: string
  websiteUrl: string
  isPublic: boolean
  disciplineIds: string[]
  disciplineNames: string[]
  modalityIds: string[]
  socialLinks: Record<string, string>
  logoUrl: string
  teams: Array<{ id: string; name: string; athlonxCode: string }>
  directivos: Array<{ userId: string; fullName: string; role: string }>
  tournaments: Array<{ id: string; name: string; season: string | null }>
  canEdit: boolean
}

export type Discipline = { id: string; name: string }

const empty = { data: null, error: null }

export function completenessOf(checks: boolean[]) {
  const done = checks.filter(Boolean).length
  return Math.round((done / checks.length) * 100)
}

export async function loadPersonaProfile(userId: string, email: string, emailVerified: boolean): Promise<PersonaProfile | null> {
  if (!supabase) return null
  const [profileRes, privacyRes, roleRes, contextRes, staffRes, membershipRes, memberRes, visibilityRes, createdTournamentsRes] = await Promise.all([
    supabase.from('profiles').select('first_name, last_name, full_name, phone, blood_type, birth_date, athlonx_code, allow_athlete_invitations').eq('id', userId).maybeSingle(),
    supabase.from('profile_privacy_settings').select('field_key, visibility').eq('user_id', userId),
    supabase.from('user_roles').select('role').eq('user_id', userId),
    supabase.from('user_contexts').select('role').eq('user_id', userId).eq('context_type', 'personal').eq('status', 'active'),
    supabase.from('team_user_memberships').select('staff_position_code').eq('user_id', userId).not('staff_position_code', 'is', null).limit(1),
    supabase.from('team_user_memberships').select('team_id, role, role_label, status').eq('user_id', userId),
    supabase.from('organization_members').select('organization_id, role, status').eq('user_id', userId),
    supabase.from('profile_tournament_visibility').select('tournament_id, is_visible').eq('user_id', userId),
    supabase.from('tournaments').select('id, name, season').eq('created_by', userId),
  ])
  const profile = profileRes.data
  if (!profile && profileRes.error) return null

  const privacy: Record<PrivacyField, Visibility> = { email: 'owner', phone: 'owner', age: 'owner' }
  for (const row of privacyRes.data ?? []) privacy[row.field_key as PrivacyField] = row.visibility as Visibility

  const teamIds = [...new Set((membershipRes.data ?? []).map((row) => row.team_id))]
  const orgIds = [...new Set((memberRes.data ?? []).map((row) => row.organization_id))]
  const [teamRes, orgRes, staffNameRes, tournamentRes] = await Promise.all([
    teamIds.length ? supabase.from('teams').select('id, name, athlonx_code, discipline_id').in('id', teamIds) : Promise.resolve({ data: [] as Array<{ id: string; name: string; athlonx_code: string | null; discipline_id: string | null }>, error: null }),
    orgIds.length ? supabase.from('organizations').select('id, name, athlonx_code').in('id', orgIds) : Promise.resolve({ data: [] as Array<{ id: string; name: string; athlonx_code: string | null }>, error: null }),
    staffRes.data?.[0]?.staff_position_code
      ? supabase.from('staff_positions').select('name').eq('code', staffRes.data[0].staff_position_code).maybeSingle()
      : Promise.resolve(empty),
    visibilityRes.data?.length
      ? supabase.from('tournaments').select('id, name, season').in('id', visibilityRes.data.map((row) => row.tournament_id))
      : Promise.resolve(empty),
  ])
  const disciplineRes = await supabase.from('disciplines').select('id, name')
  const disciplineNames = new Map((disciplineRes.data ?? []).map((item) => [item.id, item.name]))
  const teamNames = new Map((teamRes.data ?? []).map((team) => [team.id, team]))
  const orgNames = new Map((orgRes.data ?? []).map((org) => [org.id, org]))
  const visibleIds = new Set((visibilityRes.data ?? []).filter((row) => row.is_visible).map((row) => row.tournament_id))
  const tournamentById = new Map<string, { id: string; name: string; season: string | null }>()
  for (const item of [...(tournamentRes.data ?? []), ...(createdTournamentsRes.data ?? [])]) tournamentById.set(item.id, item)

  const roles = [...new Set([
    ...(roleRes.data ?? []).map((row) => row.role),
    ...(contextRes.data ?? []).map((row) => row.role),
  ])]

  return {
    userId,
    email,
    emailVerified,
    firstName: profile?.first_name ?? '',
    lastName: profile?.last_name ?? '',
    fullName: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    bloodType: profile?.blood_type ?? '',
    birthDate: profile?.birth_date ?? null,
    athlonxCode: profile?.athlonx_code ?? '',
    allowInvitations: profile?.allow_athlete_invitations ?? true,
    privacy,
    roles,
    staffPositionName: staffNameRes.data?.name ?? null,
    teams: (membershipRes.data ?? []).map((row) => {
      const team = teamNames.get(row.team_id)
      return {
        id: row.team_id,
        name: team?.name ?? 'Equipo',
        athlonxCode: team?.athlonx_code ?? '',
        discipline: disciplineNames.get(team?.discipline_id ?? '') ?? 'Disciplina pendiente',
        role: row.role,
        roleLabel: row.role_label,
        status: row.status,
        shirtNumber: null,
      }
    }),
    organizations: (memberRes.data ?? []).map((row) => {
      const org = orgNames.get(row.organization_id)
      return { id: row.organization_id, name: org?.name ?? 'Organización', athlonxCode: org?.athlonx_code ?? '', role: row.role, status: row.status }
    }),
    tournaments: [...tournamentById.values()].map((item) => ({ id: item.id, name: item.name, season: item.season, visible: visibleIds.has(item.id) })),
  }
}

export async function loadTeamProfile(teamId: string, myRole: string): Promise<TeamProfile | null> {
  if (!supabase) return null
  const [teamRes, divisionRes, memberRes, disciplineRes] = await Promise.all([
    supabase.from('teams').select('id, name, handle, athlonx_code, city, country, description, discipline_id, organization_id, is_public, contact_email, contact_phone, website_url, logo_url').eq('id', teamId).maybeSingle(),
    supabase.from('team_division_catalog').select('id, name, athlonx_code, level, age_group, gender').eq('team_id', teamId).order('name'),
    supabase.from('team_user_memberships').select('role').eq('team_id', teamId).eq('status', 'active'),
    supabase.from('disciplines').select('id, name').eq('is_active', true),
  ])
  const membersRes = await supabase.rpc('get_team_members_for_manager', { p_team_id: teamId })
  const team = teamRes.data
  if (!team) return null
  const discipline = (disciplineRes.data ?? []).find((item) => item.id === team.discipline_id)
  let organizationName: string | null = null
  if (team.organization_id) {
    const { data: org } = await supabase.from('organizations').select('name').eq('id', team.organization_id).maybeSingle()
    organizationName = org?.name ?? null
  }
  const memberCounts: Record<string, number> = {}
  for (const row of memberRes.data ?? []) memberCounts[row.role] = (memberCounts[row.role] ?? 0) + 1

  return {
    id: team.id,
    name: team.name ?? '',
    handle: team.handle ?? '',
    athlonxCode: team.athlonx_code ?? '',
    city: team.city ?? '',
    country: team.country ?? 'Panamá',
    description: team.description ?? '',
    disciplineId: team.discipline_id ?? '',
    disciplineName: discipline?.name ?? 'Disciplina pendiente',
    organizationName,
    isPublic: team.is_public ?? true,
    contactEmail: team.contact_email ?? '',
    contactPhone: team.contact_phone ?? '',
    websiteUrl: team.website_url ?? '',
    logoUrl: team.logo_url ?? '',
    myRole,
    memberCounts,
    members: membersRes.error ? [] : ((membersRes.data ?? []) as Array<{ user_id: string; full_name: string | null; role: string; role_label: string | null; division_id: string | null; division_name: string | null }>).map((row) => ({
      userId: row.user_id,
      fullName: row.full_name ?? 'Integrante',
      role: row.role,
      roleLabel: row.role_label,
      divisionId: row.division_id,
      divisionName: row.division_name,
    })),
    divisions: (divisionRes.data ?? []).map((division) => ({
      id: division.id,
      name: division.name,
      athlonxCode: division.athlonx_code ?? '',
      level: division.level,
      ageGroup: division.age_group,
      gender: division.gender,
    })),
  }
}

export async function loadOrganizationProfile(organizationId: string): Promise<OrganizationProfile | null> {
  if (!supabase) return null
  const [orgRes, discLinks, disciplineRes, teamRes, memberRes, tournamentRes, managerRes] = await Promise.all([
    supabase.from('organizations').select('id, name, handle, athlonx_code, type, country, city, description, contact_email, institutional_email, contact_phone, phone, website_url, is_public, social_links, logo_url').eq('id', organizationId).maybeSingle(),
    supabase.from('organization_disciplines').select('discipline_id').eq('organization_id', organizationId),
    supabase.from('disciplines').select('id, name').eq('is_active', true),
    supabase.from('teams').select('id, name, athlonx_code').eq('organization_id', organizationId).eq('is_official', true).order('name'),
    supabase.from('organization_members').select('user_id, role').eq('organization_id', organizationId).in('role', ['owner', 'directivo']).eq('status', 'active'),
    supabase.from('tournaments').select('id, name, season').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(20),
    supabase.rpc('is_organization_manager', { target_organization_id: organizationId }),
  ])
  const org = orgRes.data
  if (!org) return null
  const { data: modalityRows } = await supabase.from('organization_modalities').select('modality_id').eq('organization_id', organizationId)
  const disciplineIds = (discLinks.data ?? []).map((item) => item.discipline_id)
  const names = new Map((disciplineRes.data ?? []).map((item) => [item.id, item.name]))
  const userIds = (memberRes.data ?? []).map((item) => item.user_id)
  const { data: people } = userIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] as Array<{ id: string; full_name: string }> }
  const peopleById = new Map((people ?? []).map((person) => [person.id, person.full_name]))

  return {
    id: org.id,
    name: org.name ?? '',
    handle: org.handle ?? '',
    athlonxCode: org.athlonx_code ?? '',
    type: org.type ?? '',
    country: org.country ?? 'Panamá',
    city: org.city ?? '',
    description: org.description ?? '',
    contactEmail: org.contact_email ?? org.institutional_email ?? '',
    contactPhone: org.contact_phone ?? org.phone ?? '',
    websiteUrl: org.website_url ?? '',
    isPublic: org.is_public ?? true,
    disciplineIds,
    modalityIds: (modalityRows ?? []).map((item) => item.modality_id),
    logoUrl: org.logo_url ?? '',
    socialLinks: (org.social_links ?? {}) as Record<string, string>,
    disciplineNames: disciplineIds.map((id) => names.get(id)).filter((name): name is string => Boolean(name)),
    teams: (teamRes.data ?? []).map((team) => ({ id: team.id, name: team.name, athlonxCode: team.athlonx_code ?? '' })),
    directivos: (memberRes.data ?? []).map((item) => ({ userId: item.user_id, fullName: peopleById.get(item.user_id) ?? 'Directivo', role: item.role })),
    tournaments: (tournamentRes.data ?? []).map((item) => ({ id: item.id, name: item.name, season: item.season })),
    canEdit: managerRes.data === true,
  }
}

export async function loadDisciplines(): Promise<Discipline[]> {
  if (!supabase) return []
  const { data } = await supabase.from('disciplines').select('id, name').eq('is_active', true).order('name')
  return data ?? []
}

export async function loadPreferences(userId: string): Promise<{ theme: Theme; noticesEnabled: boolean }> {
  if (!supabase) return { theme: 'oscuro', noticesEnabled: true }
  const { data } = await supabase.from('account_preferences').select('theme, notices_enabled').eq('user_id', userId).maybeSingle()
  return { theme: data?.theme === 'claro' ? 'claro' : 'oscuro', noticesEnabled: data?.notices_enabled ?? true }
}

export type AccountMeta = {
  email: string
  createdAt: string | null
  lastSignInAt: string | null
  deletionScheduledAt: string | null
}

// Datos de la cuenta: correo y fechas desde Supabase Auth, eliminación programada desde profiles.
export async function loadAccountMeta(): Promise<AccountMeta> {
  const empty: AccountMeta = { email: '', createdAt: null, lastSignInAt: null, deletionScheduledAt: null }
  if (!supabase) return empty
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return empty
  const { data: profile } = await supabase.from('profiles').select('deletion_scheduled_at').eq('id', user.id).maybeSingle()
  return {
    email: user.email ?? '',
    createdAt: user.created_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
    deletionScheduledAt: profile?.deletion_scheduled_at ?? null,
  }
}

export function formatLongDate(iso: string | null) {
  if (!iso) return 'Pendiente'
  return new Date(iso).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatLastAccess(iso: string | null) {
  if (!iso) return 'Pendiente'
  const date = new Date(iso)
  const time = date.toLocaleTimeString('es-PA', { hour: 'numeric', minute: '2-digit' })
  if (date.toDateString() === new Date().toDateString()) return `Hoy · ${time}`
  return `${formatLongDate(iso)} · ${time}`
}

// Usuario público estilo Instagram: minúsculas, números, puntos y guiones bajos (3 a 30 caracteres).
export const handlePattern = /^[a-z0-9._]{3,30}$/
export function normalizeHandle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._]/g, '')
}

export type Country = { name: string; code: string; dialCode: string; flagCode: string }

export const fallbackCountries: Country[] = [{ name: 'Panamá', code: 'PA', dialCode: '507', flagCode: 'PA' }]

// Catálogo de países desde Supabase (solo Panamá en AthlonX).
export async function loadCountries(): Promise<Country[]> {
  if (!supabase) return fallbackCountries
  const { data, error } = await supabase.from('athlonx_countries').select('name, code, dial_code, flag_code').eq('active', true).order('name')
  if (error || !data?.length) return fallbackCountries
  return data.map((row) => ({ name: row.name, code: row.code, dialCode: row.dial_code, flagCode: row.flag_code }))
}

export type PhoneParts = { code: string; number: string }

// Teléfono guardado como "+507 6509-4159". Sin prefijo se trata todo como número.
export function parsePhone(stored: string | null | undefined): PhoneParts {
  if (!stored) return { code: '', number: '' }
  const match = stored.match(/^\+(\d{1,4})\s*(.*)$/)
  if (!match) return { code: '', number: stored }
  return { code: match[1], number: match[2] }
}

// Formato panameño: 8 dígitos en grupos de 4 (6509-4159).
export function formatPanamaNumber(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  return digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits
}

// Números de países no registrados: solo dígitos, sin guiones automáticos.
export function plainPhoneNumber(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 15)
}

export function joinPhone(code: string, number: string) {
  return code ? `+${code} ${number}`.trim() : number
}

// El código de país es obligatorio: un número sin código no se puede guardar.
export function phoneError(value: string) {
  const parts = parsePhone(value)
  return !parts.code && parts.number.replace(/\D/g, '') ? 'Ingresa el código de país antes del número.' : ''
}

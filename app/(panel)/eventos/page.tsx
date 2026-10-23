'use client'

import { CalendarPlus, ChevronDown, Trophy, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DraftRow, EventCard } from '../../../Components/eventos/event-cards'
import { Button, Card, CardHeader, EmptyState, Notice, PageHeader, SearchField, Segment, Select } from '../../../Components/mi-equipo/ui'
import { OrganizationEventsPanel } from '../../../Components/organization-events-panel'
import { loadAccountContexts, AccountContext } from '../../../lib/account-contexts'
import { supabase } from '../../../lib/supabase'
import { loadOrganizationScope } from '../../../lib/organization-hierarchy'

type Discipline = { id: string; name: string; code: string }
type Modality = { id: string; name: string; code: string; discipline_id: string }
type Tournament = { id: string; name: string; slug: string | null; athlonx_code: string | null; status: string; is_quick: boolean; season: string | null; cover_url: string | null; discipline_id: string | null; modality_id: string | null; created_by: string; country: string | null; location: string | null; start_date: string | null; end_date: string | null; created_at: string; organization_id: string | null; organizer_team_id: string | null; organizationName: string | null; teamName: string | null }

const PAGE_SIZE = 6
const statusSegments = [{ value: 'all', label: 'Todos' }, { value: 'in_progress', label: 'En curso' }, { value: 'published', label: 'Publicados' }, { value: 'finished', label: 'Finalizados' }]

export default function EventsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [modalities, setModalities] = useState<Modality[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [discipline, setDiscipline] = useState('all')
  const [currentUserId, setCurrentUserId] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [sourceTeamId, setSourceTeamId] = useState('')
  const [activeContext, setActiveContext] = useState<AccountContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [visibleTournamentIds, setVisibleTournamentIds] = useState<string[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  async function loadEvents(userId?: string, context?: AccountContext | null) {
    if (!supabase) { setError('Supabase no está configurado.'); setLoading(false); return }
    setLoading(true)
    const user = userId ? { id: userId } : (await supabase.auth.getUser()).data.user
    if (!user) { setError('Debes iniciar sesión para ver los eventos.'); setLoading(false); return }
    const [{ data: rows, error: tournamentError }, { data: disciplineRows }, { data: modalityRows }, { data: organizations }, { data: teams }] = await Promise.all([
      supabase.from('tournaments').select('id, name, slug, athlonx_code, status, is_quick, season, cover_url, discipline_id, modality_id, created_by, country, location, start_date, end_date, created_at, organization_id, organizer_team_id').order('created_at', { ascending: false }),
      supabase.from('disciplines').select('id, name, code').eq('is_active', true).order('name'),
      supabase.from('sport_modalities').select('id, name, code, discipline_id').eq('is_active', true).order('name'),
      supabase.from('organizations').select('id, name'),
      supabase.from('teams').select('id, name').eq('is_official', true),
    ])
    if (tournamentError) setError(tournamentError.message)
    const organizationMap = new Map((organizations ?? []).map((item) => [item.id, item.name]))
    const teamMap = new Map((teams ?? []).map((item) => [item.id, item.name]))
    const mappedTournaments = (rows ?? []).map((row) => ({ ...row, organizationName: organizationMap.get(row.organization_id) ?? null, teamName: teamMap.get(row.organizer_team_id) ?? null })) as Tournament[]
    setTournaments(mappedTournaments)
    if (context?.contextType === 'organization' && context.organizationId) {
      const scope = await loadOrganizationScope(context.organizationId)
      if (scope.error) {
        setError(scope.error.message)
        setVisibleTournamentIds([])
        setLoading(false)
        return
      }
      const { data: organizationTeams } = await supabase.from('teams').select('id').in('organization_id', scope.ids).eq('is_official', true)
      const organizationTeamIds = (organizationTeams ?? []).map((team) => team.id)
      const { data: participatedRows } = organizationTeamIds.length
        ? await supabase.from('tournament_teams').select('tournament_id').in('team_id', organizationTeamIds)
        : { data: [] }
      const participatedIds = (participatedRows ?? []).map((item) => item.tournament_id)
      setVisibleTournamentIds(mappedTournaments.filter((tournament) => scope.ids.includes(tournament.organization_id || '') || participatedIds.includes(tournament.id)).map((tournament) => tournament.id))
    } else {
      setVisibleTournamentIds(null)
    }
    setDisciplines((disciplineRows ?? []) as Discipline[])
    setModalities((modalityRows ?? []) as Modality[])
    setCurrentUserId(user.id)
    setLoading(false)
  }

  useEffect(() => {
    async function loadContext() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const userAccountType = data.user.user_metadata?.account_type || ''
      const contexts = await loadAccountContexts(data.user.id)
      const storedId = window.localStorage.getItem('athlonx-active-context-id')
      let selected = contexts.find((context) => context.id === storedId) || contexts[0] || null
      const invalidSelectedContext = !selected
        || (userAccountType === 'organizacion' && selected.contextType !== 'organization')
        || (userAccountType === 'equipo' && selected.contextType !== 'team')
      if (invalidSelectedContext) {
        if (userAccountType === 'organizacion') {
          const [{ data: ownedOrganizations }, { data: memberships }] = await Promise.all([
            supabase.from('organizations').select('id, name').eq('created_by', data.user.id).order('created_at', { ascending: false }),
            supabase.from('organization_members').select('organization_id').eq('user_id', data.user.id).in('role', ['owner', 'directivo']).eq('status', 'active').order('created_at', { ascending: false }),
          ])
          const organizationIds = Array.from(new Set([
            ...(ownedOrganizations ?? []).map((organization) => organization.id),
            ...(memberships ?? []).map((membership) => membership.organization_id),
          ]))
          const organization = ownedOrganizations?.[0] ?? (organizationIds.length
            ? (await supabase.from('organizations').select('id, name').in('id', organizationIds).limit(1).maybeSingle()).data
            : null)
          if (organization) selected = { id: organization.id, contextType: 'organization', teamId: null, organizationId: organization.id, name: organization.name, discipline: null, organizationType: null, role: 'directivo', roleLabel: 'Directivo' }
        } else if (userAccountType === 'equipo') {
          const { data: team } = await supabase.from('teams').select('id, name, discipline_id').eq('created_by', data.user.id).eq('is_official', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
          if (team) selected = { id: team.id, contextType: 'team', teamId: team.id, organizationId: null, name: team.name, discipline: null, organizationType: null, role: 'directivo', roleLabel: 'Directivo' }
        }
      }
      setActiveContext(selected)
      setOrganizationId(selected?.contextType === 'organization' ? selected.organizationId || '' : '')
      setSourceTeamId(selected?.contextType === 'team' ? selected.teamId || '' : '')
      await loadEvents(data.user.id, selected)
    }
    void loadContext()
  }, [])

  // Reautentica con la contraseña antes de borrar, porque no se puede deshacer. Devuelve el error a mostrar en la fila.
  async function deleteDraft(tournament: Tournament, password: string) {
    if (!supabase || tournament.status !== 'draft' || tournament.created_by !== currentUserId) return 'No puedes eliminar este borrador.'
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user?.email) return 'No se pudo identificar el correo de la cuenta.'
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: userData.user.email, password })
    if (reauthError) return 'La contraseña no es correcta. El borrador no se eliminó.'
    const { error: deleteError } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournament.id)
      .eq('created_by', userData.user.id)
      .eq('status', 'draft')
    if (deleteError) return deleteError.message
    await loadEvents(userData.user.id, activeContext)
    return null
  }

  useEffect(() => {
    const syncContext = (event: Event) => {
      const context = (event as CustomEvent<AccountContext>).detail
      setActiveContext(context)
      setOrganizationId(context?.contextType === 'organization' ? context.organizationId || '' : '')
      setSourceTeamId(context?.contextType === 'team' ? context.teamId || '' : '')
      void loadEvents(currentUserId, context)
    }
    window.addEventListener('athlonx-context-change', syncContext)
    return () => window.removeEventListener('athlonx-context-change', syncContext)
  }, [])

  const filteredTournaments = useMemo(() => {
    const term = query.trim().toLowerCase()
    return tournaments.filter((tournament) => {
      const isVisibleForOrganization = visibleTournamentIds === null || visibleTournamentIds.includes(tournament.id)
      const matchesDiscipline = discipline === 'all' || tournament.discipline_id === discipline
      const searchValues = [tournament.name, tournament.athlonx_code, tournament.slug, tournament.season, tournament.location, tournament.organizationName, tournament.teamName].filter(Boolean).join(' ').toLowerCase()
      return isVisibleForOrganization && matchesDiscipline && (!term || searchValues.includes(term))
    })
  }, [discipline, query, tournaments, visibleTournamentIds])

  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [discipline, query, status])

  const nonDraftTournaments = filteredTournaments.filter((tournament) => tournament.status !== 'draft')
  const statusTournaments = status === 'all' ? nonDraftTournaments : nonDraftTournaments.filter((tournament) => tournament.status === status)
  const shownTournaments = statusTournaments.slice(0, visibleCount)
  const draftTournaments = filteredTournaments.filter((tournament) => tournament.status === 'draft' && tournament.created_by === currentUserId && (activeContext?.contextType !== 'organization' || tournament.organization_id === organizationId))
  const canCreate = Boolean(organizationId || sourceTeamId)
  const isOrganization = activeContext?.contextType === 'organization'
  const labelFor = (tournament: Tournament) => modalities.find((item) => item.id === tournament.modality_id)?.name || disciplines.find((item) => item.id === tournament.discipline_id)?.name
  const canEdit = (tournament: Tournament) => tournament.created_by === currentUserId && (!isOrganization || tournament.organization_id === organizationId)

  return <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
    <div className="mx-auto max-w-[1184px] space-y-5 px-4 pb-16 pt-5 sm:space-y-6 sm:px-8 sm:pt-8 lg:px-10">
      <PageHeader
        title="Eventos"
        description={isOrganization ? 'Torneos que organiza tu organización y aquellos en los que participan sus equipos.' : 'Explora los torneos de AthlonX, desde los más recientes hasta los más antiguos.'}
        actions={canCreate && <Button variant="primary" icon={CalendarPlus} aria-expanded={creating} onClick={() => setCreating((current) => !current)} className="w-full sm:w-auto">Crear evento</Button>}
      />

      {canCreate && creating && <OrganizationEventsPanel organizationId={organizationId || undefined} sourceTeamId={sourceTeamId || undefined} disciplines={disciplines} onClose={() => setCreating(false)} onCreated={() => void loadEvents(currentUserId, activeContext)} />}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField value={query} onChange={setQuery} placeholder="Nombre, código o sede" label="Buscar torneo" className="lg:w-[300px] lg:shrink-0" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-1">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0" aria-label="Estado del torneo">
            {statusSegments.map(({ value, label }) => <Segment key={value} active={status === value} label={label} count={value === 'all' ? nonDraftTournaments.length : nonDraftTournaments.filter((tournament) => tournament.status === value).length} onClick={() => setStatus(value)} />)}
          </div>
          <div className="sm:w-[210px] sm:shrink-0"><Select label="Disciplina" hideLabel value={discipline} onChange={setDiscipline} options={[{ value: 'all', label: 'Todas las disciplinas' }, ...disciplines.map((item) => ({ value: item.id, label: item.name }))]} /></div>
        </div>
      </div>

      {error && <Notice tone="danger" icon={X}>{error}</Notice>}

      {canCreate && draftTournaments.length > 0 && <Card labelledBy="event-drafts" className="space-y-2">
        <CardHeader id="event-drafts" title="Borradores" subtitle="Solo tú los ves. Complétalos para publicarlos." />
        <ul>{draftTournaments.map((tournament) => <DraftRow key={tournament.id} tournament={tournament} label={labelFor(tournament)} onDelete={(password) => deleteDraft(tournament, password)} />)}</ul>
      </Card>}

      <section aria-labelledby="event-tournaments" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 id="event-tournaments" className="font-display text-[28px] uppercase leading-none tracking-[.02em] text-[var(--ax-text)] sm:text-[32px]">Torneos</h2>
          {!loading && statusTournaments.length > 0 && <span className="text-[13px] text-[var(--ax-muted)]">Mostrando {shownTournaments.length} de {statusTournaments.length}</span>}
        </div>
        {loading ? <div aria-hidden="true" className="grid gap-4 md:grid-cols-2">{[0, 1].map((index) => <div key={index} className="h-[220px] animate-pulse rounded-[20px] border border-[var(--ax-line)] bg-[var(--ax-surface)]" />)}</div>
          : !statusTournaments.length ? !error && <EmptyState icon={Trophy} title="No hay torneos" description={query || discipline !== 'all' || status !== 'all' ? 'No hay torneos que coincidan con la búsqueda o los filtros.' : isOrganization ? 'Esta organización todavía no ha creado torneos ni participado con sus equipos.' : 'Todavía no hay torneos para mostrar.'} action={(query || discipline !== 'all' || status !== 'all') ? <Button size="sm" onClick={() => { setQuery(''); setStatus('all'); setDiscipline('all') }}>Quitar filtros</Button> : undefined} />
          : <>
            <div className="grid gap-4 md:grid-cols-2">{shownTournaments.map((tournament) => <EventCard key={tournament.id} tournament={tournament} label={labelFor(tournament)} canEdit={canEdit(tournament)} />)}</div>
            {shownTournaments.length < statusTournaments.length && <Button onClick={() => setVisibleCount((current) => current + PAGE_SIZE)} className="w-full">Ver más torneos<ChevronDown size={16} aria-hidden="true" /></Button>}
          </>}
      </section>
    </div>
  </main>
}

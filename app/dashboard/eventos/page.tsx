'use client'

import { CalendarDays, Check, ChevronRight, LockKeyhole, Search, SlidersHorizontal, Trash2, Trophy, Users, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { OrganizationEventsPanel } from '../../../Components/organization-events-panel'
import { StyledSelect } from '../../../Components/styled-select'
import { loadAccountContexts, AccountContext } from '../../../lib/account-contexts'
import { supabase } from '../../../lib/supabase'
import { loadOrganizationScope } from '../../../lib/organization-hierarchy'

type Discipline = { id: string; name: string; code: string }
type Modality = { id: string; name: string; code: string; discipline_id: string }
type Tournament = { id: string; name: string; slug: string | null; athlonx_code: string | null; status: string; season: string | null; cover_url: string | null; discipline_id: string | null; modality_id: string | null; created_by: string; country: string | null; location: string | null; start_date: string | null; end_date: string | null; created_at: string; organization_id: string | null; organizer_team_id: string | null; organizationName: string | null; teamName: string | null }

const statusOptions = [{ value: 'all', label: 'Todos los estados' }, { value: 'draft', label: 'Borradores' }, { value: 'published', label: 'Publicados' }, { value: 'in_progress', label: 'En curso' }, { value: 'finished', label: 'Finalizados' }]

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
  const [draftToDelete, setDraftToDelete] = useState<Tournament | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deletingDraft, setDeletingDraft] = useState(false)

  async function loadEvents(userId?: string, context?: AccountContext | null) {
    if (!supabase) { setError('Supabase no está configurado.'); setLoading(false); return }
    setLoading(true)
    const user = userId ? { id: userId } : (await supabase.auth.getUser()).data.user
    if (!user) { setError('Debes iniciar sesión para ver los eventos.'); setLoading(false); return }
    const [{ data: rows, error: tournamentError }, { data: disciplineRows }, { data: modalityRows }, { data: organizations }, { data: teams }] = await Promise.all([
      supabase.from('tournaments').select('id, name, slug, athlonx_code, status, season, cover_url, discipline_id, modality_id, created_by, country, location, start_date, end_date, created_at, organization_id, organizer_team_id').order('created_at', { ascending: false }),
      supabase.from('disciplines').select('id, name, code').eq('is_active', true).in('code', ['rugby', 'baloncesto']).order('name'),
      supabase.from('sport_modalities').select('id, name, code, discipline_id').eq('is_active', true).order('name'),
      supabase.from('organizations').select('id, name'),
      supabase.from('teams').select('id, name'),
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
      const { data: organizationTeams } = await supabase.from('teams').select('id').in('organization_id', scope.ids)
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
          if (organization) selected = { id: organization.id, contextType: 'organization', teamId: null, organizationId: organization.id, name: organization.name, discipline: null, role: 'directivo', roleLabel: 'Directivo' }
        } else if (userAccountType === 'equipo') {
          const { data: team } = await supabase.from('teams').select('id, name, discipline_id').eq('created_by', data.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
          if (team) selected = { id: team.id, contextType: 'team', teamId: team.id, organizationId: null, name: team.name, discipline: null, role: 'directivo', roleLabel: 'Directivo' }
        }
      }
      setActiveContext(selected)
      setOrganizationId(selected?.contextType === 'organization' ? selected.organizationId || '' : '')
      setSourceTeamId(selected?.contextType === 'team' ? selected.teamId || '' : '')
      await loadEvents(data.user.id, selected)
    }
    void loadContext()
  }, [])

  function requestDeleteDraft(tournament: Tournament) {
    if (tournament.status !== 'draft' || tournament.created_by !== currentUserId) return
    setDeleteError('')
    setDraftToDelete(tournament)
  }

  async function confirmDeleteDraft(password: string) {
    if (!supabase || !draftToDelete) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user?.email) {
      setDeleteError('No se pudo identificar el correo de la cuenta.')
      return
    }

    setDeletingDraft(true)
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: userData.user.email, password })
    if (reauthError) {
      setDeletingDraft(false)
      setDeleteError('La contraseña no es correcta. El borrador no se eliminó.')
      return
    }

    const { error: deleteErrorResponse } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', draftToDelete.id)
      .eq('created_by', userData.user.id)
      .eq('status', 'draft')

    if (deleteErrorResponse) {
      setDeletingDraft(false)
      setDeleteError(deleteErrorResponse.message)
      return
    }

    setDraftToDelete(null)
    setDeleteError('')
    await loadEvents(userData.user.id, activeContext)
    setDeletingDraft(false)
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
      const matchesStatus = status === 'all' || tournament.status === status
      const matchesDiscipline = discipline === 'all' || tournament.discipline_id === discipline
      const searchValues = [tournament.name, tournament.athlonx_code, tournament.slug, tournament.season, tournament.location, tournament.organizationName, tournament.teamName].filter(Boolean).join(' ').toLowerCase()
      return isVisibleForOrganization && matchesStatus && matchesDiscipline && (!term || searchValues.includes(term))
    })
  }, [discipline, query, status, tournaments, visibleTournamentIds])

  const nonDraftTournaments = filteredTournaments.filter((tournament) => tournament.status !== 'draft')
  const draftTournaments = filteredTournaments.filter((tournament) => tournament.status === 'draft' && tournament.created_by === currentUserId && (activeContext?.contextType !== 'organization' || tournament.organization_id === organizationId))
  const canCreate = Boolean(organizationId || sourceTeamId)
  const eventDisciplines = disciplines.length ? disciplines : []

  return <main className="min-h-screen bg-[#07131e] text-white lg:ml-64"><section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
    <header className="flex flex-col justify-between gap-6 border-b border-[#1f4057] pb-8 md:flex-row md:items-end"><div><p className="text-sm font-bold uppercase tracking-[.24em] text-[#b4ff45]">Actividad deportiva</p><h1 className="mt-3 font-display text-5xl uppercase leading-none sm:text-6xl">Eventos</h1><p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">Explora todos los torneos de AthlonX, desde los más recientes hasta los más antiguos.</p></div><div className="rounded-[5px] border border-[#31556b] bg-[#0b1d2c] px-4 py-3 text-sm text-slate-300"><span className="font-bold text-[#b4ff45]">{filteredTournaments.length}</span> torneos visibles</div></header>
     <div className="mt-8 grid gap-6 lg:grid-cols-[270px_1fr] lg:items-start"><aside className="rounded-[5px] border border-[#1f4057] bg-[#0b1d2c] p-5"><div className="flex items-center gap-2"><SlidersHorizontal size={18} className="text-[#b4ff45]" /><h2 className="font-heading text-lg uppercase tracking-wide">Filtros</h2></div><div className="mt-6"><label htmlFor="tournament-search" className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Buscar torneo</label><div className="relative mt-3"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b4ff45]" size={17} /><input id="tournament-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o AX-TOR..." className="h-12 w-full rounded-[5px] border border-[#29485d] bg-[#07131e] pl-10 pr-9 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#b4ff45]" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500 hover:text-white"><X size={16} /></button>}</div><p className="mt-2 text-xs leading-5 text-slate-500">Acepta nombre, código AthlonX, slug, temporada o ubicación.</p></div><div className="mt-5"><StyledSelect label="Estado" value={status} onChange={setStatus} options={statusOptions} /></div><div className="mt-5"><StyledSelect label="Disciplina" value={discipline} onChange={setDiscipline} options={[{ value: 'all', label: 'Todas las disciplinas' }, ...disciplines.map((item) => ({ value: item.id, label: item.name }))]} /></div><button type="button" onClick={() => { setQuery(''); setStatus('all'); setDiscipline('all') }} className="mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-[#31556b] px-3 py-3 text-sm font-bold text-slate-300 hover:border-[#b4ff45] hover:text-white"><Check size={16} />Limpiar filtros</button></aside>
      <section className="min-w-0"><div className="grid gap-4">{loading && <p className="rounded-[5px] border border-[#1f4057] bg-[#0b1d2c] p-6 text-slate-400">Cargando torneos...</p>}{error && <p role="alert" className="rounded-[5px] border border-[#ff7d88]/30 bg-[#ff7d88]/10 p-4 text-sm text-[#ffb0b7]">{error}</p>}{!loading && !error && nonDraftTournaments.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} discipline={disciplines.find((item) => item.id === tournament.discipline_id)} modality={modalities.find((item) => item.id === tournament.modality_id)} canEdit={tournament.created_by === currentUserId && (activeContext?.contextType !== 'organization' || tournament.organization_id === organizationId)} />)}{!loading && !error && !nonDraftTournaments.length && !draftTournaments.length && <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[5px] border border-dashed border-[#31556b] bg-[#0b1d2c] p-8 text-center"><Trophy className="text-[#b4ff45]" size={30} /><h2 className="mt-4 font-heading text-2xl uppercase">No hay torneos</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">Esta organización todavía no ha creado torneos ni participado con sus equipos, o no hay coincidencias con los filtros.</p></div>}</div></section></div>
    {canCreate && <div className="mt-8"><OrganizationEventsPanel organizationId={organizationId || undefined} sourceTeamId={sourceTeamId || undefined} disciplines={eventDisciplines} onCreated={() => void loadEvents(currentUserId, activeContext)} /></div>}
    {canCreate && draftTournaments.length > 0 && <section className="mt-8 rounded-[5px] border border-[#1f4057] bg-[#0b1d2c] p-5 sm:p-6"><div className="flex flex-col justify-between gap-3 border-b border-[#1f4057] pb-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.24em] text-[#b4ff45]">Configuración pendiente</p><h2 className="mt-2 font-heading text-2xl font-bold uppercase sm:text-3xl">Borradores</h2><p className="mt-2 text-sm text-slate-400">Completa la información, los equipos y los fixtures de tus torneos guardados.</p></div><span className="rounded-[5px] border border-[#31556b] px-3 py-2 text-sm text-slate-300"><strong className="text-[#b4ff45]">{draftTournaments.length}</strong> borradores</span></div><div className="mt-5 grid gap-4">{draftTournaments.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} discipline={disciplines.find((item) => item.id === tournament.discipline_id)} modality={modalities.find((item) => item.id === tournament.modality_id)} canEdit={true} onDeleteDraft={requestDeleteDraft} deleting={deletingDraft && draftToDelete?.id === tournament.id} />)}</div></section>}
    {draftToDelete && <DraftDeleteOverlay tournament={draftToDelete} message={deleteError} loading={deletingDraft} onCancel={() => { if (!deletingDraft) { setDraftToDelete(null); setDeleteError('') } }} onConfirm={confirmDeleteDraft} />}
  </section></main>
}

function TournamentCard({ tournament, discipline, modality, canEdit, onDeleteDraft, deleting = false }: { tournament: Tournament; discipline?: Discipline; modality?: Modality; canEdit: boolean; onDeleteDraft?: (tournament: Tournament) => void; deleting?: boolean }) {
  const statusLabel: Record<string, string> = { draft: 'Borrador', published: 'Publicado', in_progress: 'En curso', finished: 'Finalizado' }
  const dateRange = tournament.start_date || tournament.end_date ? `${formatDate(tournament.start_date)}${tournament.end_date ? ` → ${formatDate(tournament.end_date)}` : ''}` : 'Fechas por definir'
  return <article className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-5 transition hover:border-[#b4ff45]/60 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-start"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-[#b4ff45] text-[#07131e]">{tournament.cover_url ? <img src={tournament.cover_url} alt="" className="h-full w-full object-cover" /> : <Trophy size={26} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-[5px] bg-[#b4ff45]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#d8ffad]">{statusLabel[tournament.status] || tournament.status}</span>{discipline && <span className="rounded-[5px] border border-[#31556b] px-2.5 py-1 text-xs text-slate-300">{discipline.name}</span>}{modality && <span className="rounded-[5px] border border-[#b4ff45]/30 px-2.5 py-1 text-xs text-[#d8ffad]">{modality.name}</span>}</div><h2 className="mt-3 truncate font-heading text-2xl font-bold uppercase sm:text-3xl">{tournament.name}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400"><span className="font-mono text-[#b4ff45]">{tournament.athlonx_code || 'Código pendiente'}</span><span>{dateRange}</span>{tournament.location && <span>{tournament.location}</span>}</div><p className="mt-3 text-sm text-slate-500">{tournament.organizationName ? `Organiza ${tournament.organizationName}` : tournament.teamName ? `Organiza ${tournament.teamName}` : 'Torneo independiente'}</p></div><div className="flex shrink-0 flex-col gap-2 sm:items-end"><Link href={`/dashboard/torneos/ver/${tournament.id}`} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-[#31556b] px-4 py-2.5 text-sm font-bold text-slate-200 hover:border-[#b4ff45] hover:text-white">Ver torneo <ChevronRight size={16} /></Link>{canEdit && <Link href={`/dashboard/torneos/ver/${tournament.id}?editar=1`} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-2.5 text-sm font-bold text-[#07131e]">Editar torneo</Link>}{tournament.status === 'draft' && canEdit && onDeleteDraft && <button type="button" disabled={deleting} onClick={() => onDeleteDraft(tournament)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-[#ff7d88]/50 px-4 py-2.5 text-sm font-bold text-[#ff9ca5] hover:border-[#ff7d88] hover:bg-[#ff7d88]/10 disabled:cursor-wait disabled:opacity-60"><Trash2 size={16} />{deleting ? 'Eliminando...' : 'Eliminar borrador'}</button>}</div></div></article>
}

function DraftDeleteOverlay({ tournament, message, loading, onCancel, onConfirm }: { tournament: Tournament; message: string; loading: boolean; onCancel: () => void; onConfirm: (password: string) => void }) {
  const [password, setPassword] = useState('')
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02070c]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="delete-draft-title"><div className="w-full max-w-lg rounded-[5px] border border-[#ff7d88]/40 bg-[#0b1d2c] p-5 text-white shadow-2xl sm:p-7"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[5px] bg-[#ff7d88]/15 text-[#ff9ca5]"><Trash2 size={21} /></div><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#ff9ca5]">Eliminar borrador</p><h2 id="delete-draft-title" className="mt-1 font-display text-2xl uppercase">¿Eliminar este torneo?</h2><p className="mt-2 text-sm leading-6 text-slate-400">Se eliminará permanentemente <strong className="text-white">{tournament.name}</strong>, su división inicial y cualquier configuración guardada.</p></div></div><div className="mt-6 rounded-[5px] border border-[#ff7d88]/30 bg-[#ff7d88]/10 p-3 text-sm text-[#ffb0b7]">Esta acción no se puede deshacer.</div><label className="mt-6 block text-sm font-semibold">Contraseña de la cuenta<input autoFocus required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" placeholder="Escribe tu contraseña" /></label>{message && <p role="alert" className="mt-4 rounded-[5px] border border-[#ff7d88]/30 bg-[#ff7d88]/10 p-3 text-sm text-[#ffb0b7]">{message}</p>}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={loading} onClick={onCancel} className="cursor-pointer rounded-[5px] border border-[#31556b] px-5 py-3 font-bold text-slate-300 hover:border-white hover:text-white disabled:opacity-50">Cancelar</button><button type="button" disabled={!password || loading} onClick={() => void onConfirm(password)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] bg-[#ff7d88] px-5 py-3 font-bold text-[#25070a] disabled:cursor-not-allowed disabled:opacity-50">{loading && <LockKeyhole size={16} />}{loading ? 'Eliminando...' : 'Confirmar eliminación'}</button></div></div></div>
}

function formatDate(value: string | null) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Por definir' }

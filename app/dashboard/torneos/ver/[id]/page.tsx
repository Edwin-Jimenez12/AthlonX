'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, Check, ChevronDown, Clock3, Cog, LockKeyhole, MapPin, Search, ShieldCheck, Table2, Trophy, Users, Wand2, X } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { LocationFields } from '../../../../../Components/location-fields'
import { StyledSelect } from '../../../../../Components/styled-select'
import { supabase } from '../../../../../lib/supabase'

type Discipline = { id: string; code: string; name: string }
type Modality = { id: string; code: string; name: string; discipline_id?: string }
type OrganizationSummary = { id: string; name: string; athlonx_code: string | null; handle: string | null }
type TeamSummary = { id: string; name: string; athlonx_code: string | null; handle: string | null }
type Tournament = { id: string; name: string; slug: string; season: string | null; status: string; start_date: string | null; end_date: string | null; location: string | null; country: string | null; cover_url: string | null; athlonx_code: string | null; discipline: Discipline | null; modality: Modality | null; organization: OrganizationSummary | null; organizer_team: TeamSummary | null }
type Division = { id: string; name: string; sort_order: number }
type TournamentTeam = { id: string; name: string; logo_url: string | null; city: string | null; division_id: string; division_name: string; athlonx_code: string | null; handle: string | null }
type ManualPairing = { divisionId: string; localTeamId: string; visitorTeamId: string }
type Match = { id: string; fixture_id: string; date_number: number; calendar_date: string | null; division_name: string | null; scheduled_time: string | null; status: string; local_team_id: string; local_team_name: string; local_logo_url: string | null; visitor_team_id: string; visitor_team_name: string; visitor_logo_url: string | null; local_score: number; visitor_score: number }
type MatchEvent = { match_id: string; event_type: string; points: number }
type RosterEntry = { team_id: string; player_id: string; user_id: string | null; full_name: string; shirt_number: number | null; is_substitute: boolean }
type EditHistory = { id: string; edited_by: string; changes: Record<string, { before: string | null; after: string | null }>; created_at: string }
type TournamentPayload = { tournament: Tournament | null; divisions: Division[]; teams: TournamentTeam[]; matches: Match[] }
type EditValues = { name: string; season: string; status: string; start_date: string; end_date: string; country: string; location: string; discipline_id: string; modality_id: string }
type PendingChange = { label: string; before: string; after: string; beforeValue: string | null; afterValue: string | null }
type PendingOperation = { title: string; changes: PendingChange[]; kind: 'add-team' | 'remove-team' | 'generate-fixture'; payload: Record<string, string> }

const statusNames: Record<string, string> = { draft: 'Borrador', published: 'Publicado', in_progress: 'En curso', finished: 'Finalizado' }
const statusOptions = Object.entries(statusNames).map(([value, label]) => ({ value, label }))

export default function PublicTournamentPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<TournamentPayload | null>(null)
  const [history, setHistory] = useState<EditHistory[]>([])
  const [rosters, setRosters] = useState<RosterEntry[]>([])
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([])
  const [ownerId, setOwnerId] = useState('')
  const [availableDisciplines, setAvailableDisciplines] = useState<Discipline[]>([])
  const [availableModalities, setAvailableModalities] = useState<Modality[]>([])
  const [section, setSection] = useState<'resumen' | 'tablas' | 'equipos' | 'fixtures' | 'partidos' | 'general' | 'historial'>('resumen')
  const [editMode, setEditMode] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChange> | null>(null)
  const [pendingOperation, setPendingOperation] = useState<PendingOperation | null>(null)
  const [dirtySection, setDirtySection] = useState<string | null>(null)
  const [pendingSection, setPendingSection] = useState<typeof section | null>(null)
  const [saveDestination, setSaveDestination] = useState<typeof section | null>(null)
  const [availableTeams, setAvailableTeams] = useState<TeamSummary[]>([])
  const [numberRequest, setNumberRequest] = useState<{ teamId: string; playerId: string; playerName: string; currentNumber: number | null } | null>(null)

  async function loadTournament() {
    if (!supabase || !params.id) {
      setError('No se pudo identificar el torneo.')
      setLoading(false)
      return
    }
    setLoading(true)
    const [{ data: response, error: tournamentError }, { data: historyRows }, { data: ownerRow }, { data: userData }, { data: disciplineRows }, { data: modalityRows }, { data: teamRows }] = await Promise.all([
      supabase.rpc('get_public_tournament_profile', { p_tournament_id: params.id }),
      supabase.from('tournament_edit_history').select('id, edited_by, changes, created_at').eq('tournament_id', params.id).order('created_at', { ascending: false }),
      supabase.from('tournaments').select('created_by').eq('id', params.id).maybeSingle(),
      supabase.auth.getUser(),
      supabase.from('disciplines').select('id, code, name').eq('is_active', true).in('code', ['rugby', 'baloncesto']).order('name'),
      supabase.from('sport_modalities').select('id, code, name, discipline_id').eq('is_active', true).order('name'),
      supabase.from('teams').select('id, name, athlonx_code, handle').eq('is_public', true).order('name'),
    ])
    if (tournamentError) {
      setError(tournamentError.message)
      setLoading(false)
      return
    }
    const payload = response as TournamentPayload
    setData(payload)
    setHistory((historyRows ?? []) as EditHistory[])
    setCurrentUserId(userData.user?.id || '')
    setOwnerId(ownerRow?.created_by || '')
    setAvailableDisciplines((disciplineRows ?? []) as Discipline[])
    setAvailableModalities((modalityRows ?? []) as Modality[])
    setAvailableTeams((teamRows ?? []) as TeamSummary[])
    if (ownerRow?.created_by === userData.user?.id) setEditMode(new URLSearchParams(window.location.search).get('editar') === '1')
    if (payload.tournament) {
      const matchIds = (payload.matches ?? []).map((match) => match.id)
      if (matchIds.length) {
        const { data: eventRows } = await supabase.from('match_events').select('match_id, event_type, points').in('match_id', matchIds)
        setMatchEvents((eventRows ?? []) as MatchEvent[])
      } else setMatchEvents([])
      const teamIds = (payload.teams ?? []).map((team) => team.id)
      if (teamIds.length) {
        const { data: links } = await supabase.from('team_players').select('team_id, player_id, is_substitute').in('team_id', teamIds)
        const playerIds = (links ?? []).map((link) => link.player_id)
        const { data: players } = playerIds.length ? await supabase.from('players').select('id, user_id, full_name, shirt_number').in('id', playerIds) : { data: [] }
        const playerMap = new Map((players ?? []).map((player) => [player.id, player]))
        setRosters((links ?? []).flatMap((link) => { const player = playerMap.get(link.player_id); return player ? [{ team_id: link.team_id, player_id: link.player_id, user_id: player.user_id || null, full_name: player.full_name, shirt_number: player.shirt_number, is_substitute: link.is_substitute }] : [] }))
      } else setRosters([])
    }
    if (!payload.tournament) setError('Este torneo no está disponible.')
    setLoading(false)
  }

  useEffect(() => { void loadTournament() }, [params.id])

  if (loading) return <TournamentShell><p className="text-slate-400">Cargando torneo...</p></TournamentShell>
  if (error || !data?.tournament) return <TournamentShell><div className="rounded-[5px] border border-red-400/30 bg-red-500/10 p-5 text-red-200">{error || 'Este torneo no está disponible.'}</div></TournamentShell>

  const tournament = data.tournament
  const teams = data.teams ?? []
  const uniqueTeams = Array.from(new Map(teams.map((team) => [team.id, team])).values())
  const matches = data.matches ?? []
  const dates = Array.from(new Set(matches.map((match) => match.date_number))).sort((a, b) => a - b)
  const canManage = Boolean(currentUserId && currentUserId === ownerId)
  const disciplines = availableDisciplines.length ? availableDisciplines : tournament.discipline ? [tournament.discipline] : []
  const modalities = availableModalities.length ? availableModalities : tournament.modality ? [{ ...tournament.modality, discipline_id: tournament.discipline?.id }] : []

  function requestSave(values: EditValues) {
    const before: EditValues = { name: tournament.name, season: tournament.season || '', status: tournament.status, start_date: tournament.start_date || '', end_date: tournament.end_date || '', country: tournament.country || 'Panamá', location: tournament.location || '', discipline_id: tournament.discipline?.id || '', modality_id: tournament.modality?.id || '' }
    const labels: Record<keyof EditValues, string> = { name: 'Nombre', season: 'Temporada', status: 'Estado', start_date: 'Fecha inicial', end_date: 'Fecha final', country: 'País', location: 'Ciudad', discipline_id: 'Disciplina', modality_id: 'Modalidad' }
    const changes = Object.keys(values).reduce<Record<string, PendingChange>>((current, key) => { const field = key as keyof EditValues; if (before[field] !== values[field]) current[field] = { label: labels[field], before: formatEditValue(field, before[field], disciplines, modalities), after: formatEditValue(field, values[field], disciplines, modalities), beforeValue: before[field] || null, afterValue: values[field] || null }; return current }, {})
    if (!Object.keys(changes).length) return setMessage('No hay cambios nuevos para guardar.')
    if (!values.name.trim() || !values.start_date || !values.end_date) return setMessage('Completa el nombre y las fechas del torneo.')
    if (new Date(values.end_date) < new Date(values.start_date)) return setMessage('La fecha final no puede ser anterior a la fecha inicial.')
    setMessage('')
    setPendingChanges(changes)
  }

  function requestSection(nextSection: typeof section) {
    if (nextSection === section) return
    if (editMode && dirtySection === section) {
      setPendingSection(nextSection)
      return
    }
    setSection(nextSection)
  }

  function discardUnsavedChanges() {
    if (!pendingSection) return
    setDirtySection(null)
    setSection(pendingSection)
    setPendingSection(null)
    setMessage('')
  }

  function saveBeforeNavigate() {
    if (section === 'general') {
      setSaveDestination(pendingSection)
      setPendingSection(null)
      const form = document.getElementById('edit-tournament-form') as HTMLFormElement | null
      form?.requestSubmit()
    }
  }

  async function confirmSave(password: string) {
    if (!supabase || !pendingChanges || !tournament) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user?.email) return setMessage('No se pudo identificar el correo de la cuenta.')
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: userData.user.email, password })
    if (reauthError) return setMessage('La contraseña no es correcta. No se guardaron cambios.')
    const changes: Partial<EditValues> = Object.fromEntries(Object.entries(pendingChanges).map(([field, change]) => [field, change.afterValue]))
    const { error: updateError } = await supabase.from('tournaments').update(changes).eq('id', tournament.id).eq('created_by', userData.user.id)
    if (updateError) return setMessage(updateError.message)
    setPendingChanges(null)
    setDirtySection(null)
    const destination = saveDestination || pendingSection
    setPendingSection(null)
    setSaveDestination(null)
    setMessage('Cambios guardados correctamente.')
    await loadTournament()
    if (destination) setSection(destination)
  }

  function requestGenerateFixture(teamIds: string[] = uniqueTeams.map((team) => team.id), mode: 'automatic' | 'manual' = 'automatic', pairings: ManualPairing[] = []) {
    setPendingOperation({ title: mode === 'automatic' ? 'Generar fecha automáticamente' : 'Generar fecha manualmente', kind: 'generate-fixture', payload: { teamIds: teamIds.join(','), mode, pairings: JSON.stringify(pairings) }, changes: [{ label: 'Modo', before: 'Sin cambios', after: mode === 'automatic' ? 'Automático' : 'Manual', beforeValue: null, afterValue: mode }, { label: 'Acción', before: 'Sin cambios', after: `Generar fecha ${(dates.at(-1) || 0) + 1} con ${mode === 'manual' ? pairings.length : teamIds.length} partidos/equipos`, beforeValue: null, afterValue: String((dates.at(-1) || 0) + 1) }] })
  }

  async function performGenerateFixture() {
    if (!supabase || !canManage) return
    if (uniqueTeams.length < 2) return setMessage('Agrega al menos dos equipos antes de generar un fixture.')
    const nextDate = (dates.at(-1) || 0) + 1
    const { data: fixture, error: fixtureError } = await supabase.from('fixtures').insert({ tournament_id: tournament.id, date_number: nextDate, calendar_date: tournament.start_date, generated_at: new Date().toISOString() }).select('id').single()
    if (fixtureError || !fixture) return setMessage(fixtureError?.message || 'No se pudo crear la fecha.')
    const pairs: { fixture_id: string; division_id: string; local_team_id: string; visitor_team_id: string }[] = []
    const selectedTeamIds = pendingOperation?.payload.teamIds ? pendingOperation.payload.teamIds.split(',').filter(Boolean) : teams.map((team) => team.id)
    const mode = pendingOperation?.payload.mode || 'automatic'
    if (mode === 'manual') {
      const manualPairings = JSON.parse(pendingOperation?.payload.pairings || '[]') as ManualPairing[]
      pairs.push(...manualPairings.map((pairing) => ({ fixture_id: fixture.id, division_id: pairing.divisionId, local_team_id: pairing.localTeamId, visitor_team_id: pairing.visitorTeamId })))
    } else for (const division of data.divisions) {
      const divisionTeams = teams.filter((team) => selectedTeamIds.includes(team.id) && team.division_id === division.id)
      for (let index = 0; index < divisionTeams.length - 1; index += 2) {
        const local = divisionTeams[index]
        const visitor = divisionTeams[index + 1]
        if (local && visitor) pairs.push({ fixture_id: fixture.id, division_id: division.id, local_team_id: local.id, visitor_team_id: visitor.id })
      }
    }
    if (pairs.length) await supabase.from('matches').insert(pairs)
    setMessage(`Fecha ${nextDate} generada correctamente.`)
    await loadTournament()
  }

  function requestAddTeam(teamId: string, divisionId: string) {
    const team = availableTeams.find((item) => item.id === teamId)
    const division = data.divisions.find((item) => item.id === divisionId)
    if (!team || !division) return
    setPendingOperation({ title: 'Agregar equipo al torneo', kind: 'add-team', payload: { teamId, divisionId }, changes: [{ label: 'Equipo', before: 'No inscrito', after: `${team.name} · ${division.name}`, beforeValue: null, afterValue: teamId }] })
  }

  function requestRemoveTeam(team: TournamentTeam) {
    setPendingOperation({ title: 'Retirar equipo del torneo', kind: 'remove-team', payload: { teamId: team.id }, changes: [{ label: 'Equipo', before: `${team.name} · ${team.division_name}`, after: 'Retirado del torneo', beforeValue: team.id, afterValue: null }] })
  }

  async function confirmOperation(password: string) {
    if (!supabase || !pendingOperation || !tournament) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user?.email) return setMessage('No se pudo identificar el correo de la cuenta.')
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: userData.user.email, password })
    if (reauthError) return setMessage('La contraseña no es correcta. No se guardaron cambios.')
    let operationError: string | null = null
    if (pendingOperation.kind === 'add-team') {
      const { error } = await supabase.from('tournament_teams').insert({ tournament_id: tournament.id, team_id: pendingOperation.payload.teamId, division_id: pendingOperation.payload.divisionId })
      operationError = error?.message || null
    } else if (pendingOperation.kind === 'remove-team') {
      const { error } = await supabase.from('tournament_teams').delete().eq('tournament_id', tournament.id).eq('team_id', pendingOperation.payload.teamId)
      operationError = error?.message || null
    } else {
      await performGenerateFixture()
    }
    if (operationError) return setMessage(operationError)
    await supabase.rpc('record_tournament_edit', { p_tournament_id: tournament.id, p_changes: Object.fromEntries(pendingOperation.changes.map((change, index) => [`${pendingOperation.kind}_${index}`, { before: change.before, after: change.after }])) })
    setPendingOperation(null)
    setDirtySection(null)
    if (pendingOperation.kind !== 'generate-fixture') {
      setMessage(pendingOperation.kind === 'add-team' ? 'Equipo agregado al torneo.' : 'Equipo retirado del torneo.')
      await loadTournament()
    }
  }

  async function requestPlayerNumber(teamId: string, playerId: string, playerName: string, currentNumber: number | null, requestedNumber: number) {
    if (!supabase) return
    if (!Number.isInteger(requestedNumber) || requestedNumber < 0 || requestedNumber > 99) return setMessage('El número debe ser un entero entre 0 y 99.')
    const { error: requestError } = await supabase.rpc('create_player_number_change_request', { p_team_id: teamId, p_player_id: playerId, p_requested_number: requestedNumber, p_league_name: tournament.name, p_tournament_id: tournament.id })
    if (requestError) return setMessage(requestError.message)
    setNumberRequest(null)
    setMessage(`Solicitud enviada para cambiar el número de ${playerName}.`)
  }

  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10"><div className="mx-auto max-w-6xl space-y-6">
    <button type="button" onClick={() => router.back()} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-[#b4ff45]"><ArrowLeft size={18} />Volver</button>

    <section className="overflow-hidden rounded-[5px] border border-[#29485d] bg-[#0b1d2c]"><div className="grid gap-0 lg:grid-cols-[.8fr_1.2fr]"><div className="flex min-h-64 items-center justify-center bg-[#102a3d] p-6">{tournament.cover_url ? <img src={tournament.cover_url} alt={`Portada de ${tournament.name}`} className="max-h-72 w-full rounded-[5px] object-contain" /> : <Trophy className="text-[#b4ff45]" size={92} />}</div><div className="p-6 sm:p-8"><div className="flex flex-wrap items-center gap-2"><span className="rounded-[5px] bg-[#b4ff45] px-3 py-1 text-xs font-bold uppercase text-[#07131e]">{statusNames[tournament.status] || tournament.status}</span>{tournament.discipline && <span className="rounded-[5px] border border-[#b4ff45]/40 px-3 py-1 text-xs font-semibold text-[#dcffb6]">{tournament.discipline.name}</span>}{tournament.modality && <span className="rounded-[5px] border border-[#b4ff45]/40 bg-[#b4ff45]/10 px-3 py-1 text-xs font-semibold text-[#dcffb6]">{tournament.modality.name}</span>}</div><p className="mt-5 text-xs font-bold uppercase tracking-[.24em] text-[#b4ff45]">Información pública del torneo</p><h1 className="mt-2 font-display text-4xl uppercase sm:text-5xl">{tournament.name}</h1><p className="mt-3 text-lg text-slate-400">Temporada {tournament.season || 'pendiente'}</p><div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-300"><span className="inline-flex items-center gap-2"><CalendarDays size={17} className="text-[#b4ff45]" />{formatDateRange(tournament.start_date, tournament.end_date)}</span>{tournament.location && <span className="inline-flex items-center gap-2"><MapPin size={17} className="text-[#b4ff45]" />{tournament.location}</span>}</div><p className="mt-5 font-mono text-xs text-[#b4ff45]">{tournament.athlonx_code || 'Código pendiente'}</p></div></div></section>

    <div className="grid gap-4 sm:grid-cols-4"><StatCard title="Equipos" value={String(uniqueTeams.length)} icon={<Users size={20} />} /><StatCard title="Divisiones" value={String(data.divisions?.length ?? 0)} icon={<Trophy size={20} />} /><StatCard title="Partidos" value={String(matches.length)} icon={<CalendarDays size={20} />} /><StatCard title="Fechas" value={String(dates.length)} icon={<Table2 size={20} />} /></div>

    <section className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-8"><nav className="flex flex-wrap gap-2 border-b border-white/10 pb-5">{([['resumen', 'Resumen'], ['tablas', 'Tablas'], ['equipos', 'Equipos y plantillas'], ['fixtures', 'Generador de fixtures'], ['partidos', 'Partidos'], ['general', 'Información general'], ['historial', 'Historial']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => requestSection(value)} className={`cursor-pointer rounded-[5px] px-4 py-2.5 text-sm font-bold transition ${section === value ? 'bg-[#b4ff45] text-[#07131e]' : 'border border-[#29485d] text-slate-300 hover:border-[#b4ff45] hover:text-white'}`}>{label}</button>)}</nav>{section === 'resumen' && <SummarySection tournament={tournament} divisions={data.divisions ?? []} teams={teams} matches={matches} events={matchEvents} onOpenFixtures={() => requestSection('fixtures')} canManage={canManage && editMode} />}{section === 'tablas' && <StandingsSection teams={teams} matches={matches} />}{section === 'equipos' && <TeamsSection teams={teams} rosters={rosters} dates={dates} divisions={data.divisions ?? []} availableTeams={availableTeams.filter((team) => !teams.some((current) => current.id === team.id))} canManage={canManage} editMode={editMode} currentUserId={currentUserId} onAddTeam={requestAddTeam} onRemoveTeam={requestRemoveTeam} onNumberRequest={(request) => setNumberRequest(request)} />}{section === 'fixtures' && <FixturesSection tournament={tournament} teams={teams} dates={dates} canManage={canManage && editMode} onGenerate={requestGenerateFixture} />}{section === 'partidos' && <MatchesSection matches={matches} dates={dates} events={matchEvents} onOpenFixtures={() => requestSection('fixtures')} canManage={canManage && editMode} />}{section === 'general' && <GeneralInfoSection tournament={tournament} disciplines={disciplines} modalities={modalities} editMode={editMode && canManage} onRequestSave={requestSave} onDirtyChange={(dirty) => setDirtySection(dirty ? 'general' : null)} onCancel={() => { setEditMode(false); setDirtySection(null); setMessage('') }} onEdit={() => setEditMode(true)} />}{section === 'historial' && <EditHistorySection history={history} />}</section>
    {message && <p role="status" className="rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/10 p-4 text-sm text-[#dfffba]">{message}</p>}
  </div>{pendingChanges && <EditConfirmationOverlay changes={pendingChanges} onCancel={() => setPendingChanges(null)} onConfirm={confirmSave} message={message} />}{pendingOperation && <EditConfirmationOverlay title={pendingOperation.title} changes={Object.fromEntries(pendingOperation.changes.map((change, index) => [`${change.label}-${index}`, change]))} onCancel={() => setPendingOperation(null)} onConfirm={confirmOperation} message={message} />}{pendingSection && <UnsavedChangesOverlay onCancel={() => setPendingSection(null)} onDiscard={discardUnsavedChanges} onSave={saveBeforeNavigate} />}{numberRequest && <PlayerNumberRequestModal request={numberRequest} onCancel={() => setNumberRequest(null)} onSubmit={(requestedNumber) => void requestPlayerNumber(numberRequest.teamId, numberRequest.playerId, numberRequest.playerName, numberRequest.currentNumber, requestedNumber)} />}</main>
}

function SummarySection({ tournament, divisions, teams, matches, events, onOpenFixtures, canManage }: { tournament: Tournament; divisions: Division[]; teams: TournamentTeam[]; matches: Match[]; events: MatchEvent[]; onOpenFixtures: () => void; canManage: boolean }) {
  const featuredMatch = getFeaturedMatch(matches)
  const uniqueTeamCount = new Set(teams.map((team) => team.id)).size
  return <div className="space-y-8 pt-6"><div className="grid gap-6 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Resumen del torneo</p><h2 className="mt-2 font-display text-3xl uppercase">Actividad competitiva</h2><p className="mt-3 text-sm leading-6 text-slate-400">Consulta la estructura, el partido prioritario y la actividad registrada de esta competencia.</p><div className="mt-6 space-y-3"><InfoRow label="Organización responsable" value={tournament.organization?.name || 'Torneo independiente'} /><InfoRow label="Equipo organizador" value={tournament.organizer_team?.name || 'No especificado'} /></div></div><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Configuración deportiva</p><div className="mt-3 space-y-3"><InfoRow label="Disciplina" value={tournament.discipline?.name || 'No especificada'} /><InfoRow label="Modalidad" value={tournament.modality?.name || 'No especificada'} /><InfoRow label="Divisiones" value={divisions.map((division) => division.name).join(' · ') || 'Sin divisiones'} /><InfoRow label="Equipos inscritos" value={`${uniqueTeamCount} equipos · ${matches.length} partidos`} /></div></div></div><div><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Estado competitivo</p><h2 className="mt-2 font-display text-3xl uppercase">Partido destacado</h2></div>{featuredMatch && <span className="rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300">{featuredMatch.status === 'live' ? 'En vivo' : featuredMatch.status === 'finished' ? 'Último partido' : 'Próximo partido'}</span>}</div>{featuredMatch ? <MatchHighlight match={featuredMatch} events={events.filter((event) => event.match_id === featuredMatch.id)} /> : <div className="mt-5 rounded-[5px] border border-dashed border-[#31556b] bg-[#07131e] p-6"><p className="text-sm leading-6 text-slate-400">No hay partidos programados porque todavía no se ha generado un fixture.</p>{canManage && <button type="button" onClick={onOpenFixtures} className="mt-4 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]">Generar fixture</button>}</div>}</div></div>
}

function StandingsSection({ teams, matches }: { teams: TournamentTeam[]; matches: Match[] }) {
  const standings = teams.map((team) => { const row = { team, played: 0, wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, points: 0 }; matches.filter((match) => match.status === 'finished' && (match.local_team_id === team.id || match.visitor_team_id === team.id)).forEach((match) => { const local = match.local_team_id === team.id; const scored = local ? match.local_score : match.visitor_score; const conceded = local ? match.visitor_score : match.local_score; row.played += 1; row.pointsFor += scored; row.pointsAgainst += conceded; if (scored > conceded) { row.wins += 1; row.points += 4 } else if (scored === conceded) { row.draws += 1; row.points += 2 } else row.losses += 1 }); return row }).sort((a, b) => b.points - a.points || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst))
  return <div className="pt-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Competencia</p><h2 className="mt-2 font-display text-3xl uppercase">Tabla de puntuación</h2><p className="mt-2 text-sm text-slate-400">Los puntos se calculan con los partidos finalizados: victoria 4, empate 2.</p></div><Table2 className="text-[#b4ff45]" /></div><div className="mt-6 overflow-x-auto rounded-[5px] border border-[#29485d]"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-[#102a3d] text-xs uppercase tracking-wider text-slate-400"><tr><th className="p-4">Equipo</th><th className="p-4">PJ</th><th className="p-4">PG</th><th className="p-4">PE</th><th className="p-4">PP</th><th className="p-4">PF</th><th className="p-4">PC</th><th className="p-4 text-[#b4ff45]">PTS</th></tr></thead><tbody>{standings.map((row, index) => <tr key={row.team.id} className="border-t border-[#29485d]"><td className="p-4 font-bold"><span className="mr-3 text-[#b4ff45]">{index + 1}</span>{row.team.name}</td><td className="p-4 text-slate-300">{row.played}</td><td className="p-4 text-slate-300">{row.wins}</td><td className="p-4 text-slate-300">{row.draws}</td><td className="p-4 text-slate-300">{row.losses}</td><td className="p-4 text-slate-300">{row.pointsFor}</td><td className="p-4 text-slate-300">{row.pointsAgainst}</td><td className="p-4 font-bold text-[#b4ff45]">{row.points}</td></tr>)}</tbody></table>{!standings.length && <p className="p-6 text-sm text-slate-400">Todavía no hay equipos para construir la tabla.</p>}</div></div>
}

function TeamsSection({ teams, rosters, dates, divisions, availableTeams, canManage, editMode, currentUserId, onAddTeam, onRemoveTeam, onNumberRequest }: { teams: TournamentTeam[]; rosters: RosterEntry[]; dates: number[]; divisions: Division[]; availableTeams: TeamSummary[]; canManage: boolean; editMode: boolean; currentUserId: string; onAddTeam: (teamId: string, divisionId: string) => void; onRemoveTeam: (team: TournamentTeam) => void; onNumberRequest: (request: { teamId: string; playerId: string; playerName: string; currentNumber: number | null }) => void }) {
  const [expandedTeams, setExpandedTeams] = useState<string[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showRemove, setShowRemove] = useState(false)
  const [newTeamId, setNewTeamId] = useState('')
  const [teamQuery, setTeamQuery] = useState('')
  const [newDivisionId, setNewDivisionId] = useState(divisions[0]?.id || '')
  const filteredTeams = availableTeams.filter((team) => `${team.name} ${team.handle || ''} ${team.athlonx_code || ''}`.toLowerCase().includes(teamQuery.toLowerCase()))
  const groupedTeams = teams.reduce<Array<TournamentTeam & { divisions: string[] }>>((groups, team) => { const existing = groups.find((item) => item.id === team.id); if (existing) { if (!existing.divisions.includes(team.division_name)) existing.divisions.push(team.division_name) } else groups.push({ ...team, divisions: [team.division_name] }); return groups }, [])
  return <div className="pt-6"><div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Participantes</p><h2 className="mt-2 font-display text-3xl uppercase">Equipos y plantillas</h2><p className="mt-2 text-sm text-slate-400">Selecciona un equipo para desplegar su plantilla y todas sus divisiones.</p></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-[5px] border border-[#31556b] px-3 py-2 text-xs font-bold text-slate-300">{groupedTeams.length} equipos</span>{canManage && editMode && <><button type="button" onClick={() => { setShowAdd(!showAdd); setShowRemove(false) }} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-3 py-2 text-xs font-bold text-[#07131e]"><Users size={15} />Agregar equipo</button><button type="button" onClick={() => { setShowRemove(!showRemove); setShowAdd(false) }} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#ff7d88]/50 px-3 py-2 text-xs font-bold text-[#ff9ca5]"><X size={15} />Expulsar</button></>}</div></div>{canManage && editMode && showAdd && <form onSubmit={(event) => { event.preventDefault(); onAddTeam(newTeamId, newDivisionId); setNewTeamId(''); setTeamQuery(''); setShowAdd(false) }} className="mt-5 grid gap-3 rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/5 p-4 sm:grid-cols-[1fr_1fr_auto]"><label className="text-sm font-semibold sm:col-span-2">Buscar equipo<div className="relative mt-2"><Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" /><input required value={teamQuery} onChange={(event) => { setTeamQuery(event.target.value); setNewTeamId('') }} placeholder="Nombre, @usuario o código AthlonX" className="w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] py-3 pl-10 pr-3 outline-none focus:border-[#b4ff45]" /></div>{teamQuery && <div className="mt-2 max-h-40 overflow-y-auto rounded-[5px] border border-[#31556b] bg-[#0d2232]">{filteredTeams.map((team) => <button key={team.id} type="button" onClick={() => { setNewTeamId(team.id); setTeamQuery(team.name) }} className={`block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-[#b4ff45]/10 ${newTeamId === team.id ? 'bg-[#b4ff45]/10 text-[#dfffba]' : 'text-slate-200'}`}>{team.name}<span className="ml-2 text-xs text-slate-500">{team.athlonx_code || team.handle || ''}</span></button>)}{!filteredTeams.length && <p className="px-3 py-3 text-sm text-slate-500">No se encontraron equipos.</p>}</div>}</label><label className="text-sm font-semibold">División<select required value={newDivisionId} onChange={(event) => setNewDivisionId(event.target.value)} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3"><option value="">Seleccionar división</option>{divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}</select></label><button type="submit" disabled={!newTeamId} className="self-end rounded-[5px] bg-[#b4ff45] px-4 py-3 font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50">Continuar</button></form>}{canManage && editMode && showRemove && <p className="mt-5 rounded-[5px] border border-[#ff7d88]/30 bg-[#ff7d88]/5 p-4 text-sm text-[#ffb0b7]">Selecciona “Expulsar del torneo” en el equipo que deseas retirar.</p>}<div className="mt-6 space-y-3">{groupedTeams.length ? groupedTeams.map((team) => { const expanded = expandedTeams.includes(team.id); const teamRoster = rosters.filter((player) => player.team_id === team.id); return <article key={team.id} className="rounded-[5px] border border-[#29485d] bg-[#07131e]"><button type="button" onClick={() => setExpandedTeams((current) => current.includes(team.id) ? current.filter((id) => id !== team.id) : [...current, team.id])} className="flex w-full cursor-pointer items-center gap-3 p-4 text-left sm:p-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-[#b4ff45]/15 font-bold text-[#b4ff45]">{team.logo_url ? <img src={team.logo_url} alt="" className="h-full w-full object-cover" /> : team.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate font-bold">{team.name}</p><p className="mt-1 text-xs text-slate-400">{team.divisions.join(' · ')} · {team.athlonx_code || 'Código pendiente'} · {teamRoster.length} atletas</p></div><ChevronDown size={18} className={`shrink-0 text-[#b4ff45] transition ${expanded ? 'rotate-180' : ''}`} /></button>{showRemove && canManage && editMode && <div className="border-t border-white/10 px-4 pb-4 pt-3 sm:px-5"><button type="button" onClick={() => onRemoveTeam(team)} className="rounded-[5px] border border-[#ff7d88]/50 px-3 py-2 text-xs font-bold text-[#ff9ca5]">Expulsar del torneo</button></div>}{expanded && <div className="border-t border-white/10 p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Plantilla registrada</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{teamRoster.map((player) => <div key={player.player_id} className="flex items-center justify-between gap-3 rounded-[5px] border border-white/10 px-3 py-2 text-sm"><span className="min-w-0 truncate">{player.full_name}{player.is_substitute && <span className="ml-2 text-xs text-slate-500">Suplente</span>}</span><span className="flex items-center gap-2 text-xs text-slate-400">#{player.shirt_number ?? '--'}{player.user_id === currentUserId && <button type="button" onClick={() => onNumberRequest({ teamId: team.id, playerId: player.player_id, playerName: player.full_name, currentNumber: player.shirt_number })} className="cursor-pointer rounded-[5px] border border-[#31556b] px-2 py-1 font-bold text-[#dfffba] hover:border-[#b4ff45]">Cambiar</button>}</span></div>)}{!teamRoster.length && <p className="text-sm text-slate-500">Plantilla pendiente.</p>}</div></div>}</article> }) : <p className="text-sm text-slate-500">Todavía no hay equipos inscritos.</p>}</div></div>
}

function FixturesSection({ tournament, teams, dates, canManage, onGenerate }: { tournament: Tournament; teams: TournamentTeam[]; dates: number[]; canManage: boolean; onGenerate: (teamIds: string[], mode: 'automatic' | 'manual', pairings?: ManualPairing[]) => void }) {
  const [mode, setMode] = useState<'automatic' | 'manual'>('automatic')
  const [query, setQuery] = useState('')
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(Array.from(new Set(teams.map((team) => team.id))))
  const [manualPairings, setManualPairings] = useState<ManualPairing[]>([])
  const [manualDivisionId, setManualDivisionId] = useState(teams[0]?.division_id || '')
  const [localTeamId, setLocalTeamId] = useState('')
  const [visitorTeamId, setVisitorTeamId] = useState('')
  const groupedTeams = teams.reduce<Array<TournamentTeam & { divisions: string[] }>>((groups, team) => { const existing = groups.find((item) => item.id === team.id); if (existing) { if (!existing.divisions.includes(team.division_name)) existing.divisions.push(team.division_name) } else groups.push({ ...team, divisions: [team.division_name] }); return groups }, [])
  const filteredTeams = groupedTeams.filter((team) => `${team.name} ${team.handle || ''} ${team.athlonx_code || ''}`.toLowerCase().includes(query.toLowerCase()))
  const divisionTeams = Array.from(new Map(teams.filter((team) => team.division_id === manualDivisionId && selectedTeamIds.includes(team.id)).map((team) => [team.id, team])).values())
  const toggleTeam = (teamId: string) => setSelectedTeamIds((current) => current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId])
  const addManualPairing = () => { if (!manualDivisionId || !localTeamId || !visitorTeamId || localTeamId === visitorTeamId) return; setManualPairings((current) => [...current, { divisionId: manualDivisionId, localTeamId, visitorTeamId }]); setLocalTeamId(''); setVisitorTeamId('') }
  const canGenerate = mode === 'automatic' ? selectedTeamIds.length >= 2 : manualPairings.length > 0
  return <div className="pt-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Planificación</p><h2 className="mt-2 font-display text-3xl uppercase">Generador de fixtures</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Elige si quieres crear los emparejamientos automáticamente o definir cada partido manualmente.</p></div>{canManage && <button type="button" onClick={() => onGenerate(selectedTeamIds, mode, manualPairings)} disabled={!canGenerate} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50"><Wand2 size={17} />Generar fecha</button>}</div><div className="mt-6 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setMode('automatic')} className={`rounded-[5px] border px-4 py-3 text-left ${mode === 'automatic' ? 'border-[#b4ff45] bg-[#b4ff45]/10 text-[#dfffba]' : 'border-[#31556b] text-slate-400'}`}><span className="block font-bold">Generación automática</span><span className="mt-1 block text-xs">Empareja equipos consecutivos dentro de cada división.</span></button><button type="button" onClick={() => setMode('manual')} className={`rounded-[5px] border px-4 py-3 text-left ${mode === 'manual' ? 'border-[#b4ff45] bg-[#b4ff45]/10 text-[#dfffba]' : 'border-[#31556b] text-slate-400'}`}><span className="block font-bold">Generación manual</span><span className="mt-1 block text-xs">Define local, visitante y división partido por partido.</span></button></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><InfoRow label="Fechas generadas" value={String(dates.length)} /><InfoRow label="Equipos seleccionados" value={String(selectedTeamIds.length)} /><InfoRow label="Estado" value={tournament.status === 'finished' ? 'Torneo finalizado' : 'Configuración abierta'} /></div><div className="mt-6 rounded-[5px] border border-[#31556b] bg-[#07131e] p-4"><label className="block text-sm font-semibold">Buscar equipos<div className="relative mt-2"><Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, @usuario o código AthlonX" className="w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] py-3 pl-10 pr-3 outline-none focus:border-[#b4ff45]" /></div></label><div className="mt-3 grid gap-2 sm:grid-cols-2">{filteredTeams.map((team) => <label key={team.id} className={`flex cursor-pointer items-center gap-3 rounded-[5px] border px-3 py-3 text-sm ${selectedTeamIds.includes(team.id) ? 'border-[#b4ff45]/60 bg-[#b4ff45]/10' : 'border-white/10'}`}><input type="checkbox" checked={selectedTeamIds.includes(team.id)} onChange={() => toggleTeam(team.id)} className="accent-[#b4ff45]" /><span className="min-w-0 flex-1 truncate">{team.name}</span><span className="text-xs text-slate-500">{team.divisions.join(' · ')}</span></label>)}{!filteredTeams.length && <p className="text-sm text-slate-500">No se encontraron equipos.</p>}</div></div>{mode === 'manual' && <div className="mt-6 rounded-[5px] border border-[#31556b] bg-[#07131e] p-4"><p className="text-sm font-bold text-[#dfffba]">Partidos manuales</p><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"><select value={manualDivisionId} onChange={(event) => { setManualDivisionId(event.target.value); setLocalTeamId(''); setVisitorTeamId('') }} className="rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3"><option value="">División</option>{Array.from(new Map(teams.map((team) => [team.division_id, team.division_name])).entries()).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select value={localTeamId} onChange={(event) => setLocalTeamId(event.target.value)} className="rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3"><option value="">Local</option>{divisionTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select value={visitorTeamId} onChange={(event) => setVisitorTeamId(event.target.value)} className="rounded-[5px] border border-[#31556b] bg-[#0d2232] px-3 py-3"><option value="">Visitante</option>{divisionTeams.filter((team) => team.id !== localTeamId).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><button type="button" onClick={addManualPairing} className="rounded-[5px] border border-[#b4ff45] px-4 py-3 font-bold text-[#dfffba]">Agregar</button></div><div className="mt-4 space-y-2">{manualPairings.map((pairing, index) => { const local = teams.find((team) => team.id === pairing.localTeamId); const visitor = teams.find((team) => team.id === pairing.visitorTeamId); const division = teams.find((team) => team.division_id === pairing.divisionId)?.division_name || 'División'; return <div key={`${pairing.localTeamId}-${pairing.visitorTeamId}-${index}`} className="flex items-center justify-between rounded-[5px] border border-white/10 px-3 py-2 text-sm"><span>{division}: {local?.name} vs {visitor?.name}</span><button type="button" onClick={() => setManualPairings((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-[#ff9ca5]">Quitar</button></div> })}{!manualPairings.length && <p className="text-sm text-slate-500">Agrega al menos un partido manual.</p>}</div></div>}<div className="mt-6 rounded-[5px] border border-dashed border-[#31556b] bg-[#07131e] p-5 text-sm text-slate-400">La fecha se creará con los equipos seleccionados y quedará registrada en el historial del torneo.</div></div>
}

function MatchesSection({ matches, dates, events, onOpenFixtures, canManage }: { matches: Match[]; dates: number[]; events: MatchEvent[]; onOpenFixtures: () => void; canManage: boolean }) {
  const featuredMatch = getFeaturedMatch(matches)
  return <div className="space-y-8 pt-6"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Seguimiento</p><h2 className="mt-2 font-display text-3xl uppercase">Partidos</h2><p className="mt-2 text-sm text-slate-400">Consulta el estado del partido prioritario y el cronograma completo por fecha.</p></div>{featuredMatch ? <MatchHighlight match={featuredMatch} events={events.filter((event) => event.match_id === featuredMatch.id)} /> : <div className="rounded-[5px] border border-dashed border-[#31556b] bg-[#07131e] p-6"><p className="text-sm text-slate-400">No hay partidos programados porque todavía no se ha generado un fixture.</p>{canManage && <button type="button" onClick={onOpenFixtures} className="mt-4 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]">Generar fixture</button>}</div>}<div><div className="flex items-center gap-2 border-b border-white/10 pb-3"><CalendarDays className="text-[#b4ff45]" size={18} /><h3 className="font-heading text-xl uppercase">Cronograma por fecha</h3></div>{matches.length ? <div className="mt-5 space-y-6">{dates.map((date) => <div key={date}><p className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">Fecha {date}</p><div className="mt-3 grid gap-3 lg:grid-cols-2">{matches.filter((match) => match.date_number === date).map((match) => <MatchCard key={match.id} match={match} />)}</div></div>)}</div> : <p className="mt-5 text-sm text-slate-500">Genera un fixture para ver el cronograma.</p>}</div></div>
}

function MatchHighlight({ match, events }: { match: Match; events: MatchEvent[] }) {
  const status = match.status === 'live' ? 'En vivo' : match.status === 'finished' ? 'Finalizado' : match.status === 'cancelled' ? 'Cancelado' : 'Programado'
  const points = events.reduce((total, event) => total + (event.points || 0), 0)
  return <article className="mt-5 rounded-[5px] border border-[#b4ff45]/40 bg-[#b4ff45]/5 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><span className={`rounded-[5px] px-3 py-1 text-xs font-bold uppercase ${match.status === 'live' ? 'bg-[#ff7d88] text-[#07131e]' : 'bg-[#b4ff45] text-[#07131e]'}`}>{status}</span><span className="text-xs text-slate-400">Fecha {match.date_number}{match.scheduled_time ? ` · ${match.scheduled_time.slice(0, 5)}` : ''}</span></div><div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center"><TeamMatchName name={match.local_team_name} logo={match.local_logo_url} /><div><p className="font-display text-3xl text-[#b4ff45]">{match.status === 'scheduled' ? 'VS' : `${match.local_score} - ${match.visitor_score}`}</p><p className="mt-2 text-xs text-slate-400">{events.length} eventos · {points} puntos registrados</p></div><TeamMatchName name={match.visitor_team_name} logo={match.visitor_logo_url} /></div></article>
}

function MatchCard({ match }: { match: Match }) {
  const status = match.status === 'finished' ? 'Finalizado' : match.status === 'live' ? 'En vivo' : match.status === 'cancelled' ? 'Cancelado' : 'Programado'
  return <article className="rounded-[5px] border border-[#29485d] bg-[#07131e] p-5"><div className="flex items-center justify-between gap-3 text-xs text-slate-500"><span>{match.division_name || 'Sin división'}</span><span className="inline-flex items-center gap-1">{match.scheduled_time ? <><Clock3 size={13} />{match.scheduled_time.slice(0, 5)}</> : 'Horario pendiente'}</span></div><div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center"><TeamMatchName name={match.local_team_name} logo={match.local_logo_url} /><div><p className="font-display text-2xl text-[#b4ff45]">{match.status === 'scheduled' ? 'VS' : `${match.local_score} - ${match.visitor_score}`}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{status}</p></div><TeamMatchName name={match.visitor_team_name} logo={match.visitor_logo_url} /></div></article>
}

function getFeaturedMatch(matches: Match[]) {
  return matches.find((match) => match.status === 'live') || [...matches].filter((match) => match.status === 'finished').sort((a, b) => b.date_number - a.date_number).at(0) || [...matches].filter((match) => match.status === 'scheduled').sort((a, b) => a.date_number - b.date_number).at(0) || null
}

function TeamMatchName({ name, logo }: { name: string; logo: string | null }) { return <div className="min-w-0"><div className="mx-auto flex h-11 w-11 items-center justify-center overflow-hidden rounded-[5px] bg-[#b4ff45]/15 font-bold text-[#b4ff45]">{logo ? <img src={logo} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}</div><p className="mt-2 truncate text-sm font-bold">{name || 'Equipo pendiente'}</p></div> }

function EditHistorySection({ history }: { history: EditHistory[] }) {
  const labels: Record<string, string> = { name: 'Nombre', season: 'Temporada', status: 'Estado', start_date: 'Fecha inicial', end_date: 'Fecha final', country: 'País', location: 'Ciudad', discipline_id: 'Disciplina', modality_id: 'Modalidad' }
  return <section className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-8"><div className="flex items-center gap-3 border-b border-white/10 pb-5"><Clock3 className="text-[#b4ff45]" size={20} /><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Transparencia</p><h2 className="mt-1 font-display text-2xl uppercase">Historial de ediciones</h2></div></div>{history.length ? <div className="mt-6 space-y-4">{history.map((entry) => <article key={entry.id} className="rounded-[5px] border border-[#29485d] bg-[#07131e] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-white">Torneo actualizado</p><time className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString('es-PA', { dateStyle: 'medium', timeStyle: 'short' })}</time></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(entry.changes).map(([field, change]) => <div key={field} className="rounded-[5px] border border-white/10 p-3 text-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{labels[field] || field}</p><p className="mt-1 text-slate-300"><span className="text-slate-500">{change.before || 'Sin valor'}</span><span className="mx-2 text-[#b4ff45]">→</span><span className="font-semibold text-white">{change.after || 'Sin valor'}</span></p></div>)}</div></article>)}</div> : <p className="mt-6 text-sm text-slate-400">Todavía no se han registrado ediciones.</p>}</section>
}

function GeneralInfoSection({ tournament, disciplines, modalities, editMode, onRequestSave, onDirtyChange, onCancel, onEdit }: { tournament: Tournament; disciplines: Discipline[]; modalities: Modality[]; editMode: boolean; onRequestSave: (values: EditValues) => void; onDirtyChange: (dirty: boolean) => void; onCancel: () => void; onEdit: () => void }) {
  return <section className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-5 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Configuración</p><h2 className="mt-1 font-display text-3xl uppercase">Información general</h2><p className="mt-2 text-sm text-slate-400">Datos oficiales del torneo y su organización responsable.</p></div>{editMode ? <button type="submit" form="edit-tournament-form" className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]"><Check size={17} />Confirmar cambio</button> : <button type="button" onClick={onEdit} className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]"><Cog size={17} />Editar torneo</button>}</div>{editMode ? <EditTournamentForm tournament={tournament} disciplines={disciplines} modalities={modalities} onRequestSave={onRequestSave} onDirtyChange={onDirtyChange} onCancel={onCancel} /> : <div className="mt-6 grid gap-3 sm:grid-cols-2"><InfoRow label="Nombre del torneo" value={tournament.name} /><InfoRow label="Código AthlonX" value={tournament.athlonx_code || 'Pendiente'} /><InfoRow label="Estado" value={statusNames[tournament.status] || tournament.status} /><InfoRow label="Temporada" value={tournament.season || 'Pendiente'} /><InfoRow label="Disciplina" value={tournament.discipline?.name || 'No especificada'} /><InfoRow label="Modalidad" value={tournament.modality?.name || 'No especificada'} /><InfoRow label="Ubicación" value={[tournament.country, tournament.location].filter(Boolean).join(' · ') || 'Pendiente'} /><InfoRow label="Fechas" value={formatDateRange(tournament.start_date, tournament.end_date)} /></div>}</section>
}

function EditTournamentForm({ tournament, disciplines, modalities, onRequestSave, onDirtyChange, onCancel }: { tournament: Tournament; disciplines: Discipline[]; modalities: Modality[]; onRequestSave: (values: EditValues) => void; onDirtyChange: (dirty: boolean) => void; onCancel: () => void }) {
  const [values, setValues] = useState<EditValues>({ name: tournament.name, season: tournament.season || '', status: tournament.status, start_date: tournament.start_date || '', end_date: tournament.end_date || '', country: tournament.country || 'Panamá', location: tournament.location || '', discipline_id: tournament.discipline?.id || '', modality_id: tournament.modality?.id || '' })
  const availableModalities = modalities.filter((modality) => !values.discipline_id || modality.discipline_id === values.discipline_id)
  useEffect(() => { const original = { name: tournament.name, season: tournament.season || '', status: tournament.status, start_date: tournament.start_date || '', end_date: tournament.end_date || '', country: tournament.country || 'Panamá', location: tournament.location || '', discipline_id: tournament.discipline?.id || '', modality_id: tournament.modality?.id || '' }; onDirtyChange(Object.keys(original).some((key) => original[key as keyof EditValues] !== values[key as keyof EditValues])) }, [values, tournament, onDirtyChange])
  return <form id="edit-tournament-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onRequestSave(values) }} className="mt-6"><div className="flex items-center gap-2 rounded-[5px] border border-[#b4ff45]/30 bg-[#b4ff45]/10 p-3 text-sm text-[#dfffba]"><ShieldCheck size={17} />Los cambios se mostrarán antes de solicitar la contraseña.</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold sm:col-span-2">Nombre del torneo<input required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label><label className="block text-sm font-semibold">Temporada<input value={values.season} onChange={(event) => setValues({ ...values, season: event.target.value })} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label><StyledSelect label="Estado" value={values.status} onChange={(status) => setValues({ ...values, status })} options={statusOptions} required /><StyledSelect label="Disciplina" value={values.discipline_id} onChange={(discipline_id) => setValues({ ...values, discipline_id, modality_id: '' })} options={disciplines.map((discipline) => ({ value: discipline.id, label: discipline.name }))} required /><StyledSelect label="Modalidad" value={values.modality_id} onChange={(modality_id) => setValues({ ...values, modality_id })} options={availableModalities.map((modality) => ({ value: modality.id, label: modality.name }))} disabled={!availableModalities.length} required /><LocationFields country={values.country} city={values.location} onCountryChange={(country) => setValues({ ...values, country })} onCityChange={(location) => setValues({ ...values, location })} className="sm:col-span-2" /><label className="block text-sm font-semibold">Fecha inicial<input required type="date" value={values.start_date} onChange={(event) => setValues({ ...values, start_date: event.target.value })} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label><label className="block text-sm font-semibold">Fecha final<input required type="date" value={values.end_date} onChange={(event) => setValues({ ...values, end_date: event.target.value })} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label></div><div className="mt-6 flex justify-end border-t border-white/10 pt-5"><button type="button" onClick={onCancel} className="cursor-pointer rounded-[5px] border border-[#31556b] px-5 py-3 font-bold text-slate-300 hover:border-white hover:text-white">Cancelar edición</button></div></form>
}

function EditConfirmationOverlay({ title = 'Guardar cambios', changes, onCancel, onConfirm, message }: { title?: string; changes: Record<string, PendingChange>; onCancel: () => void; onConfirm: (password: string) => void; message: string }) {
  const [password, setPassword] = useState('')
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#02070c]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="confirm-tournament-changes"><div className="my-8 w-full max-w-xl rounded-[5px] border border-[#31556b] bg-[#0b1d2c] p-5 text-white shadow-2xl sm:p-7"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[5px] bg-[#b4ff45]/15 text-[#b4ff45]"><LockKeyhole size={21} /></div><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Confirmación segura</p><h2 id="confirm-tournament-changes" className="mt-1 font-display text-2xl uppercase">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">Revisa la acción. La contraseña confirma y registra esta operación.</p></div></div><div className="mt-6 space-y-2">{Object.values(changes).map((change) => <div key={change.label} className="rounded-[5px] border border-white/10 bg-[#07131e] p-3"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{change.label}</p><p className="mt-1 text-sm"><span className="text-slate-500">{change.before}</span><span className="mx-2 text-[#b4ff45]">→</span><span className="font-bold text-white">{change.after}</span></p></div>)}</div><label className="mt-6 block text-sm font-semibold">Contraseña de la cuenta<input autoFocus required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" placeholder="Escribe tu contraseña" /></label>{message && <p role="alert" className="mt-4 rounded-[5px] border border-[#ff7d88]/30 bg-[#ff7d88]/10 p-3 text-sm text-[#ffb0b7]">{message}</p>}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="cursor-pointer rounded-[5px] border border-[#31556b] px-5 py-3 font-bold text-slate-300 hover:border-white hover:text-white">Cancelar</button><button type="button" onClick={() => void onConfirm(password)} disabled={!password} className="cursor-pointer rounded-[5px] bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] disabled:cursor-not-allowed disabled:opacity-50">Confirmar y guardar</button></div></div></div>
}

function UnsavedChangesOverlay({ onCancel, onDiscard, onSave }: { onCancel: () => void; onDiscard: () => void; onSave: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02070c]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-[5px] border border-[#31556b] bg-[#0b1d2c] p-6 text-white shadow-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Cambios sin guardar</p><h2 className="mt-2 font-display text-2xl uppercase">¿Cambiar de sección?</h2><p className="mt-3 text-sm leading-6 text-slate-400">Todavía tienes cambios pendientes. Puedes confirmarlos con tu contraseña o descartarlos antes de continuar.</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="rounded-[5px] border border-[#31556b] px-4 py-3 text-sm font-bold text-slate-300">Seguir editando</button><button type="button" onClick={onDiscard} className="rounded-[5px] border border-[#ff7d88]/50 px-4 py-3 text-sm font-bold text-[#ff9ca5]">Descartar</button><button type="button" onClick={onSave} className="rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]">Confirmar cambio</button></div></div></div>
}

function PlayerNumberRequestModal({ request, onCancel, onSubmit }: { request: { playerName: string; currentNumber: number | null }; onCancel: () => void; onSubmit: (number: number) => void }) {
  const [number, setNumber] = useState(String(request.currentNumber ?? ''))
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02070c]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true"><form onSubmit={(event) => { event.preventDefault(); onSubmit(Number(number)) }} className="w-full max-w-md rounded-[5px] border border-[#31556b] bg-[#0b1d2c] p-6 text-white shadow-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Solicitud de plantilla</p><h2 className="mt-2 font-display text-2xl uppercase">Cambiar número</h2><p className="mt-3 text-sm leading-6 text-slate-400">La solicitud de <strong className="text-white">{request.playerName}</strong> será enviada al equipo para su aprobación.</p><label className="mt-6 block text-sm font-semibold">Nuevo número<input required min="0" max="99" type="number" value={number} onChange={(event) => setNumber(event.target.value)} className="mt-2 w-full rounded-[5px] border border-[#31556b] bg-[#0d2232] px-4 py-3 outline-none focus:border-[#b4ff45]" /></label><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-[5px] border border-[#31556b] px-4 py-3 text-sm font-bold text-slate-300">Cancelar</button><button type="submit" className="rounded-[5px] bg-[#b4ff45] px-4 py-3 text-sm font-bold text-[#07131e]">Enviar solicitud</button></div></form></div>
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) { return <div className="rounded-[5px] border border-[#29485d] bg-[#0b1d2c] p-5"><div className="flex items-center justify-between gap-3 text-[#b4ff45]"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{title}</p>{icon}</div><p className="mt-3 font-display text-4xl">{value}</p></div> }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="rounded-[5px] border border-[#29485d] bg-[#07131e] p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">{label}</p><p className="mt-2 font-semibold text-white">{value}</p></div> }
function TournamentShell({ children }: { children: React.ReactNode }) { return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10"><div className="mx-auto max-w-6xl">{children}</div></main> }
function formatDateRange(start: string | null, end: string | null) { if (!start && !end) return 'Fechas por definir'; const format = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Por definir'; return start && end ? `${format(start)} - ${format(end)}` : format(start || end) }
function formatEditValue(field: keyof EditValues, value: string, disciplines: Discipline[], modalities: Modality[]) { if (!value) return 'Sin valor'; if (field === 'status') return statusNames[value] || value; if (field === 'discipline_id') return disciplines.find((discipline) => discipline.id === value)?.name || value; if (field === 'modality_id') return modalities.find((modality) => modality.id === value)?.name || value; return value }

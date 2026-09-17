'use client'

import { CalendarDays, MapPin, Plus, Trophy, Users, X } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LocationFields } from '../../../Components/location-fields'
import { normalizePanamaCity, PANAMA_COUNTRY } from '../../../lib/location-options'
import { supabase } from '../../../lib/supabase'

type Team = { name: string; division: string }
type FixtureMatch = { date: number; division: string; local: string; visitor: string }
type Discipline = { id: string; code: string; name: string }
type Organization = { id: string; name: string }
type Tournament = { id?: string; name: string; status: string; season: string; cover: string; teams: Team[]; fixture: FixtureMatch[]; discipline?: string; createdBy?: string; country?: string; location?: string; startDate?: string; endDate?: string }
const fixture: string[][] = []
const categorias: { id: string; nombre: string; tabla: { equipo: string }[] }[] = []

export default function TournamentsPage() {
  const router = useRouter()
  const [showCreator, setShowCreator] = useState(false)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  const [databaseTournaments, setDatabaseTournaments] = useState<Tournament[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [name, setName] = useState('')
  const [seasonNumber, setSeasonNumber] = useState('2')
  const [year, setYear] = useState('2026')
  const [location, setLocation] = useState('Panamá')
  const [startDate, setStartDate] = useState('2026-09-12')
  const [endDate, setEndDate] = useState('2026-09-14')
  const [format, setFormat] = useState('Liga todos contra todos')
  const [fixtureMode, setFixtureMode] = useState('pendiente')
  const [matchDuration, setMatchDuration] = useState('14')
  const [breakDuration, setBreakDuration] = useState('5')
  const [playersPerTeam, setPlayersPerTeam] = useState('7')
  const [substitutesPerTeam, setSubstitutesPerTeam] = useState('5')
  const [pointsWin, setPointsWin] = useState('4')
  const [pointsDraw, setPointsDraw] = useState('2')
  const [pointsLoss, setPointsLoss] = useState('0')
  const [timezone, setTimezone] = useState('America/Panama')
  const [cover, setCover] = useState('/upr.png')
  const [organizationId, setOrganizationId] = useState('')
  const [disciplineId, setDisciplineId] = useState('')
  const [divisions, setDivisions] = useState(['1ra División', '2da División', 'Femenina'])
  const [teams, setTeams] = useState<Team[]>([{ name: 'Titanes', division: '1ra División' }])
  const [isSpectator, setIsSpectator] = useState(true)
  const [profileName, setProfileName] = useState('Usuario AthlonX')
  const [currentUserId, setCurrentUserId] = useState('')
  const [roles, setRoles] = useState<string[]>(['atleta', 'entrenador', 'staff', 'directivo'])
  const [activeRole, setActiveRole] = useState('atleta')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    async function loadRole() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      setCurrentUserId(data.user.id)
      const [{ data: profile }, { data: userRoles }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', data.user.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', data.user.id),
      ])
      setProfileName(profile?.full_name || data.user.user_metadata?.full_name || 'Usuario AthlonX')
      const availableRoles = Array.from(new Set([...(userRoles?.map(({ role }) => role) ?? []), ...(Array.isArray(data.user.user_metadata?.roles) ? data.user.user_metadata.roles : []), 'atleta', 'entrenador', 'staff', 'directivo']))
      setRoles(availableRoles)
      setActiveRole(availableRoles[0] || 'atleta')
      setIsSpectator(!(userRoles?.some(({ role }) => role === 'directivo') ?? false))
    }
    void loadRole()
  }, [])

  useEffect(() => {
    async function loadTournaments() {
      if (!supabase) return
      await supabase.rpc('ensure_my_organization')
      const [{ data }, { data: organizationRows }, { data: disciplineRows }] = await Promise.all([
        supabase.from('tournaments').select('id, name, status, season, cover_url, discipline_id, created_by, country, location, start_date, end_date').order('created_at', { ascending: false }),
        supabase.from('organizations').select('id, name').order('name'),
        supabase.from('disciplines').select('id, code, name').eq('is_active', true).in('code', ['rugby', 'baloncesto']).order('name'),
      ])
      if (organizationRows) setOrganizations(organizationRows)
      if (disciplineRows) {
        setDisciplines(disciplineRows)
        setDisciplineId((current) => current || disciplineRows.find((item) => item.code === 'rugby')?.id || disciplineRows[0]?.id || '')
      }
      if (data) setDatabaseTournaments(data.map((item) => ({ id: item.id, name: item.name, status: item.status, season: item.season, cover: item.cover_url || '/upr.png', teams: [], fixture: [], createdBy: item.created_by, country: item.country || PANAMA_COUNTRY, location: item.location || '', startDate: item.start_date || '', endDate: item.end_date || '', discipline: disciplineRows?.find((discipline) => discipline.id === item.discipline_id)?.name })))
    }
    void loadTournaments()
  }, [])

  useEffect(() => {
    const syncRole = (event: Event) => {
      const role = (event as CustomEvent<string>).detail
      setActiveRole(role)
      setIsSpectator(role !== 'directivo')
    }
    window.addEventListener('athlonx-role-change', syncRole)
    return () => window.removeEventListener('athlonx-role-change', syncRole)
  }, [])

  function toggleDivision(division: string) {
    setDivisions((current) => current.includes(division) ? current.filter((item) => item !== division) : [...current, division])
  }

  async function updateTournament(tournamentId: string, changes: { name: string; season: string; location: string; start_date: string | null; end_date: string | null; status: string }) {
    if (!supabase) return
    const { data, error } = await supabase.from('tournaments').update(changes).eq('id', tournamentId).select('id, name, status, season, country, location, start_date, end_date').single()
    if (error || !data) {
      setCreateError(error?.message || 'No se pudo actualizar el torneo en Supabase.')
      return
    }
    setDatabaseTournaments((current) => current.map((item) => item.id === tournamentId ? { ...item, name: data.name, status: data.status, season: data.season, country: data.country || PANAMA_COUNTRY, location: data.location || '', startDate: data.start_date || '', endDate: data.end_date || '' } : item))
    setEditingTournament(null)
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError('')
    if (!name.trim() || divisions.length === 0 || !disciplineId) {
      setCreateError('Completa el nombre, la disciplina y al menos una división.')
      return
    }
    if (!supabase) { setCreateError('Supabase no está configurado. No se puede crear un torneo local.'); return }
    const newTournament = { name: name.trim(), status: 'Publicado' as const, season: `${seasonNumber} · ${year}`, cover, teams: teams.filter((team) => team.name.trim()), fixture: [], createdBy: '' }
    {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { setCreateError('No hay una sesión activa en Supabase. Inicia sesión e inténtalo nuevamente.'); return }
      newTournament.createdBy = userData.user.id
      const { data: inserted, error } = await supabase.from('tournaments').insert({ name: newTournament.name, slug: slugify(newTournament.name), season: newTournament.season, start_date: startDate, end_date: endDate, country: PANAMA_COUNTRY, location, cover_url: cover, status: 'published', created_by: userData.user.id, organization_id: organizationId || null, discipline_id: disciplineId }).select('id').single()
      if (error || !inserted) { setCreateError(error?.message || 'No se pudo crear el torneo en Supabase.'); return }
      for (const [index, division] of divisions.entries()) {
        const { data: divisionRow, error: divisionError } = await supabase.from('tournament_divisions').insert({ tournament_id: inserted.id, name: division, sort_order: index }).select('id').single()
        if (divisionError || !divisionRow) {
          setCreateError(divisionError?.message || `No se pudo crear la división ${division}.`)
          return
        }

        const divisionTeams = newTournament.teams.filter((team) => team.division === division)
        for (const team of divisionTeams) {
          const { data: teamRow, error: teamError } = await supabase.from('teams').insert({ name: team.name, city: location, logo_url: null, created_by: userData.user.id }).select('id').single()
          if (teamError || !teamRow) {
            setCreateError(teamError?.message || `No se pudo crear el equipo ${team.name}.`)
            return
          }

          const { error: linkError } = await supabase.from('tournament_teams').insert({ tournament_id: inserted.id, division_id: divisionRow.id, team_id: teamRow.id })
          if (linkError) {
            setCreateError(linkError.message)
            return
          }

        }
      }

      setDatabaseTournaments((current) => [{ ...newTournament, id: inserted.id, discipline: disciplines.find((item) => item.id === disciplineId)?.name }, ...current])
    }
    setShowCreator(false)
    router.push(`/dashboard/torneos/${slugify(newTournament.name)}`)
  }

  const matchesSearch = (nameToSearch: string) => nameToSearch.toLowerCase().includes(searchTerm.trim().toLowerCase())

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#17212b] lg:pl-64">
      <section className="mx-auto max-w-7xl space-y-6 p-6 md:p-10 print:hidden">
        <div className="flex justify-end"><button type="button" onClick={() => setShowCreator(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#B4FF45] px-5 py-3 font-bold text-[#17212b] shadow-sm hover:bg-[#9ff02e]"><Plus size={18} /> Crear torneo</button></div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="flex flex-1 gap-2 rounded-xl border border-slate-200 bg-white p-1">{['Todos', 'En curso', 'Próximos', 'Finalizados'].map((filter) => <button key={filter} type="button" onClick={() => setStatusFilter(filter)} className={`flex-1 rounded-lg px-4 py-3 font-semibold ${statusFilter === filter ? 'bg-[#B4FF45] text-[#17212b]' : 'text-slate-500 hover:bg-slate-50'}`}>{filter}</button>)}</div><label className="flex w-full items-center rounded-xl border border-slate-200 bg-white px-4 py-3 lg:max-w-sm"><span className="mr-3 text-slate-400">⌕</span><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar torneo" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" /></label></div>
        <div className="grid gap-5 xl:grid-cols-3">
          {databaseTournaments.filter((tournament) => statusFilter === 'Todos' || (statusFilter === 'En curso' && tournament.status === 'in_progress') || (statusFilter === 'Próximos' && tournament.status === 'published') || (statusFilter === 'Finalizados' && tournament.status === 'finished')).map((tournament) => matchesSearch(tournament.name) && <TournamentCard key={`db-${tournament.id}`} name={tournament.name} status={tournament.status === 'published' ? 'Publicado' : tournament.status === 'in_progress' ? 'En curso' : tournament.status === 'finished' ? 'Finalizado' : 'Borrador'} season={tournament.season} discipline={tournament.discipline} cover={tournament.cover} onOpen={() => router.push(`/dashboard/torneos/${slugify(tournament.name)}`)} actions={tournament.createdBy === currentUserId && <button type="button" onClick={() => setEditingTournament(tournament)} className="cursor-pointer rounded-lg border border-[#B4FF45] px-3 py-2 font-semibold text-[#B4FF45]">Editar torneo</button>} />)}
          {!databaseTournaments.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No hay torneos registrados en Supabase.</div>}
        </div>
      </section>
      {showCreator && <Creator name={name} setName={setName} seasonNumber={seasonNumber} setSeasonNumber={setSeasonNumber} year={year} setYear={setYear} location={location} setLocation={setLocation} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} format={format} setFormat={setFormat} fixtureMode={fixtureMode} setFixtureMode={setFixtureMode} matchDuration={matchDuration} setMatchDuration={setMatchDuration} breakDuration={breakDuration} setBreakDuration={setBreakDuration} playersPerTeam={playersPerTeam} setPlayersPerTeam={setPlayersPerTeam} substitutesPerTeam={substitutesPerTeam} setSubstitutesPerTeam={setSubstitutesPerTeam} pointsWin={pointsWin} setPointsWin={setPointsWin} pointsDraw={pointsDraw} setPointsDraw={setPointsDraw} pointsLoss={pointsLoss} setPointsLoss={setPointsLoss} timezone={timezone} setTimezone={setTimezone} cover={cover} setCover={setCover} divisions={divisions} toggleDivision={toggleDivision} teams={teams} setTeams={setTeams} organizations={organizations} organizationId={organizationId} setOrganizationId={setOrganizationId} disciplineId={disciplineId} setDisciplineId={setDisciplineId} disciplines={disciplines} createError={createError} onSubmit={handleCreate} onClose={() => setShowCreator(false)} />}
      {editingTournament?.id && <TournamentEditor tournament={editingTournament} onSave={updateTournament} onClose={() => setEditingTournament(null)} />}
    </main>
  )
}

function TournamentEditor({ tournament, onSave, onClose }: { tournament: Tournament; onSave: (id: string, changes: { name: string; season: string; location: string; start_date: string | null; end_date: string | null; status: string }) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(tournament.name)
  const [season, setSeason] = useState(tournament.season)
  const [location, setLocation] = useState(normalizePanamaCity(tournament.location))
  const [startDate, setStartDate] = useState(tournament.startDate || '')
  const [endDate, setEndDate] = useState(tournament.endDate || '')
  const [status, setStatus] = useState(tournament.status)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!tournament.id || !name.trim()) return
    await onSave(tournament.id, { name: name.trim(), season: season.trim(), location: location.trim(), start_date: startDate || null, end_date: endDate || null, status })
  }

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4"><form onSubmit={handleSubmit} className="mx-auto my-8 max-w-2xl rounded-2xl bg-white p-6 shadow-2xl md:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-wider text-[#70b719]">Gestión del torneo</p><h2 className="mt-1 font-heading text-3xl font-black uppercase text-[#081522]">Editar torneo</h2></div><button type="button" onClick={onClose} className="cursor-pointer text-2xl text-slate-500" aria-label="Cerrar">×</button></div><div className="mt-6 space-y-4"><label className="block font-semibold">Nombre<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block font-semibold">Temporada<input value={season} onChange={(event) => setSeason(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label><label className="block font-semibold">Estado<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 px-4 py-3"><option value="draft">Borrador</option><option value="published">Publicado</option><option value="in_progress">En curso</option><option value="finished">Finalizado</option></select></label></div><LocationFields country={PANAMA_COUNTRY} city={location} onCityChange={setLocation} variant="light" /><div className="grid gap-4 sm:grid-cols-2"><label className="block font-semibold">Fecha de inicio<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 px-4 py-3" /></label><label className="block font-semibold">Fecha de finalización<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 px-4 py-3" /></label></div></div><div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="cursor-pointer rounded-xl border border-slate-300 px-5 py-3 font-semibold">Cancelar</button><button type="submit" className="cursor-pointer rounded-xl bg-[#B4FF45] px-5 py-3 font-bold text-[#081522]">Guardar cambios</button></div></form></div>
}

function TournamentDetail({ tournament, onClose }: { tournament: Tournament; onClose: () => void }) {
  const [section, setSection] = useState('Resumen')
  const sections = ['Resumen', 'Equipos', 'Partidos', 'Puntajes']
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f4f6f8]"><div className="mx-auto min-h-screen max-w-7xl"><header className="flex items-start justify-between border-b border-slate-200 bg-white px-6 py-6 md:px-10"><div><p className="text-sm font-bold uppercase tracking-wider text-[#70b719]">Torneo publicado</p><h1 className="mt-1 text-3xl font-black uppercase">{tournament.name}</h1><p className="mt-1 text-[#4c8500]">Temporada {tournament.season}</p></div><button type="button" onClick={onClose} aria-label="Cerrar"><X /></button></header><main className="p-6 md:p-10"><section className="rounded-2xl bg-[#081522] p-6 text-white md:p-10"><p className="font-heading text-sm uppercase tracking-[.2em] text-[#B4FF45]">Vista pública del torneo</p><h2 className="mt-2 font-display text-4xl uppercase md:text-6xl">{tournament.name}</h2><p className="mt-4 text-slate-300">12 - 14 sept. 2026 · Ciudad de Panamá · Publicado</p><nav className="mt-6 flex flex-wrap gap-2">{sections.map((item) => <button key={item} type="button" onClick={() => setSection(item)} className={`rounded-full border px-5 py-2 font-bold ${section === item ? 'border-[#B4FF45] bg-[#B4FF45] text-[#081522]' : 'border-white/20 text-white'}`}>{item}</button>)}</nav></section><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><StatCard title="Equipos" value={String(tournament.teams.length)} /><StatCard title="Partidos jugados" value="0" /><StatCard title="Próximos partidos" value={String(tournament.fixture.length)} /><StatCard title="Divisiones" value={String(new Set(tournament.teams.map((team) => team.division)).size)} /></div><section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-display text-3xl uppercase">{section}</h2>{section === 'Resumen' && <div className="mt-5 grid gap-4 sm:grid-cols-3"><InfoCard title="Estado" value="Publicado" /><InfoCard title="Resultados recientes" value="0 partidos finalizados" /><InfoCard title="Líderes" value="Sin resultados todavía" /></div>}{section === 'Equipos' && <div className="mt-5 grid gap-3 sm:grid-cols-2">{tournament.teams.length ? tournament.teams.map((team) => <InfoCard key={`${team.name}-${team.division}`} title={team.name} value={team.division} />) : <InfoCard title="Equipos" value="0 equipos registrados" />}</div>}{section === 'Partidos' && <div className="mt-5 space-y-3">{tournament.fixture.length ? tournament.fixture.map((match, index) => <InfoCard key={index} title={`Fecha ${match.date} · ${match.division}`} value={`${match.local} vs. ${match.visitor}`} />) : <InfoCard title="Partidos" value="0 partidos programados" />}</div>}{section === 'Puntajes' && <InfoCard title="Tabla de posiciones" value="0 puntos · 0 partidos jugados" />}</section></main></div></div>
}

function StatCard({ title, value }: { title: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-3xl font-black">{value}</p></div> }
function InfoCard({ title, value }: { title: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p><p className="mt-2 font-semibold">{value}</p></div> }

function TournamentPreview({ tournament, onClose }: { tournament: Tournament; onClose: () => void }) {
  const dates = Array.from(new Set(tournament.fixture.map((match) => match.date)))
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4"><div className="mx-auto my-8 max-w-5xl rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 p-6"><div><p className="text-sm font-bold uppercase tracking-wider text-[#70b719]">Vista del torneo</p><h2 className="mt-1 text-3xl font-black">{tournament.name}</h2><p className="mt-2 text-slate-500">Temporada {tournament.season}</p></div><button type="button" onClick={onClose} aria-label="Cerrar"><X /></button></div><div className="grid gap-5 p-6 md:grid-cols-[1.2fr_1fr]"><div className="overflow-hidden rounded-xl bg-[#081522]"><img src={tournament.cover} alt={`Portada de ${tournament.name}`} className="h-56 w-full object-contain bg-white" /><div className="p-5 text-white"><span className="rounded-full border border-[#B4FF45] px-3 py-1 text-xs font-bold text-[#B4FF45]">{tournament.status}</span><h3 className="mt-4 text-2xl font-bold">{tournament.name}</h3><p className="mt-2 text-slate-300">12 - 14 sept. 2026 · Ciudad de Panamá</p><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-sm">{tournament.teams.length} equipos</span><span className="rounded-full bg-white/10 px-3 py-1 text-sm">{tournament.fixture.length} partidos</span></div></div></div><div className="space-y-4"><PreviewBlock title="Resumen" value={`0 partidos jugados · ${new Set(tournament.teams.map((team) => team.division)).size} divisiones`} /><PreviewBlock title="Equipos" value={tournament.teams.map((team) => `${team.name} · ${team.division}`).join(' | ') || 'Sin equipos registrados'} /><div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Fixture por fecha</p>{tournament.fixture.length === 0 ? <p className="mt-2 text-sm text-slate-500">Agrega al menos dos equipos de una división para generar partidos.</p> : <div className="mt-2 max-h-64 space-y-4 overflow-y-auto">{dates.map((date) => <div key={date}><p className="border-b border-slate-200 pb-1 font-bold text-[#365e00]">Fecha {date}</p><div className="mt-2 space-y-2">{tournament.fixture.filter((match) => match.date === date).map((match, index) => <div key={`${date}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-bold">{match.division}</p><p className="mt-1">{match.local} <span className="text-slate-400">vs.</span> {match.visitor}</p></div>)}</div></div>)}</div>}</div><PreviewBlock title="Puntajes" value="La tabla se actualizará con los resultados" /><button type="button" onClick={onClose} className="w-full rounded-lg border border-slate-300 px-4 py-3 font-semibold">Cerrar</button></div></div></div></div>
}

function PreviewBlock({ title, value }: { title: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p><p className="mt-2 font-semibold text-[#17212b]">{value}</p></div> }

function slugify(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') }

function TournamentCard({ name, status, season, discipline, cover, onOpen, actions }: { name: string; status: string; season: string; discipline?: string; cover: string; onOpen: () => void; actions?: React.ReactNode }) {
  return <article className="overflow-hidden rounded-3xl border border-slate-200 bg-[#081522] text-white shadow-sm"><div className="relative flex h-48 items-center justify-center bg-white p-2 sm:h-52"><img src={cover} alt={`Portada de ${name}`} className="h-full w-full scale-110 object-contain object-center" /><span className="absolute left-4 top-4 rounded-full border border-[#70b719] bg-white/90 px-3 py-1 text-xs font-bold uppercase text-[#4c8500]">{status}</span></div><div className="p-5"><p className="text-sm text-slate-400">Temporada {season}</p><p className="mt-1 text-sm font-semibold text-[#B4FF45]">{discipline || 'Disciplina pendiente'}</p><h2 className="mt-2 text-xl font-bold">{name}</h2><p className="mt-4 text-sm text-slate-400"><CalendarDays className="mr-2 inline text-[#B4FF45]" size={16} />12 - 14 sept. 2026</p><p className="mt-2 text-sm text-slate-400"><MapPin className="mr-2 inline text-[#B4FF45]" size={16} />Ciudad de Panamá</p><p className="mt-2 text-sm text-slate-400"><Users className="mr-2 inline text-[#B4FF45]" size={16} />3 divisiones</p><button type="button" onClick={onOpen} className="mt-6 w-full border-t border-white/10 pt-4 text-left font-semibold hover:text-[#B4FF45]">Abrir torneo →</button>{actions && <div className="mt-3 border-t border-white/10 pt-3 text-sm">{actions}</div>}</div></article>
}

function Config({ title, value }: { title: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-4"><p className="text-sm text-slate-500">{title}</p><p className="mt-1 font-bold">{value}</p></div> }

function Creator({ name, setName, seasonNumber, setSeasonNumber, year, setYear, location, setLocation, startDate, setStartDate, endDate, setEndDate, format, setFormat, matchDuration, setMatchDuration, breakDuration, setBreakDuration, playersPerTeam, setPlayersPerTeam, substitutesPerTeam, setSubstitutesPerTeam, pointsWin, setPointsWin, pointsDraw, setPointsDraw, pointsLoss, setPointsLoss, timezone, setTimezone, createError, cover, setCover, divisions, toggleDivision, teams, setTeams, organizations, organizationId, setOrganizationId, disciplines, disciplineId, setDisciplineId, onSubmit, onClose }: any) {
  const addTeam = () => {
    setTeams([...teams, { name: '', division: divisions[0] ?? '1ra División' }])
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
      <div className="mx-auto my-4 grid max-w-6xl gap-5 md:grid-cols-[1fr_380px]">
        <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow-2xl md:p-8">
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-[#70b719]">Configuración</p>
              <h2 className="text-3xl font-bold">Crear torneo</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar">
              <X />
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block font-semibold">Nombre *</span>
              <input required value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3" />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block font-semibold">Organización <span className="text-sm font-normal text-slate-500">(opcional)</span></span>
                <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3">
                  <option value="">Torneo independiente</option>
                  {organizations.map((organization: Organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1 block font-semibold">Disciplina *</span>
                <select required value={disciplineId} onChange={(event) => setDisciplineId(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3">
                  <option value="">Seleccionar disciplina</option>
                  {disciplines.map((discipline: Discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label>
                <span className="mb-1 block font-semibold">Temporada</span>
                <select value={seasonNumber} onChange={(event) => setSeasonNumber(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3">
                  {[1, 2, 3, 4, 5, 6].map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1 block font-semibold">Año</span>
                <input type="number" value={year} onChange={(event) => setYear(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3" />
              </label>
              <label>
                <span className="mb-1 block font-semibold">Portada</span>
                <span className="block cursor-pointer rounded-lg border border-dashed border-slate-300 px-3 py-3 text-center text-sm font-semibold text-slate-600 hover:border-[#70b719]">
                  Adjuntar portada
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) setCover(URL.createObjectURL(file)) }} />
                </span>
              </label>
            </div>

            <LocationFields country={PANAMA_COUNTRY} city={location} onCityChange={setLocation} variant="light" />

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-bold">Calendario y formato</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label><span className="mb-1 block text-sm font-semibold">Fecha de inicio</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3" /></label>
                <label><span className="mb-1 block text-sm font-semibold">Fecha de finalización</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3" /></label>
                <label><span className="mb-1 block text-sm font-semibold">Formato</span><select value={format} onChange={(event) => setFormat(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3"><option>Liga todos contra todos</option><option>Grupos y eliminatoria</option><option>Eliminación directa</option></select></label>
                <label><span className="mb-1 block text-sm font-semibold">Zona horaria</span><select value={timezone} onChange={(event) => setTimezone(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3"><option>America/Panama</option><option>America/Costa_Rica</option><option>America/New_York</option></select></label>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-bold">Reglas del partido</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label><span className="mb-1 block text-sm font-semibold">Minutos por partido</span><input type="number" min="1" value={matchDuration} onChange={(event) => setMatchDuration(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3" /></label>
                <label><span className="mb-1 block text-sm font-semibold">Descanso (min)</span><input type="number" min="0" value={breakDuration} onChange={(event) => setBreakDuration(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3" /></label>
                <label><span className="mb-1 block text-sm font-semibold">Jugadores</span><input type="number" min="1" value={playersPerTeam} onChange={(event) => setPlayersPerTeam(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3" /></label>
                <label><span className="mb-1 block text-sm font-semibold">Suplentes</span><input type="number" min="0" value={substitutesPerTeam} onChange={(event) => setSubstitutesPerTeam(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3" /></label>
              </div>
              <p className="mt-4 text-sm font-semibold">Puntos de clasificación</p>
              <div className="mt-2 grid gap-4 sm:grid-cols-3"><label><span className="mb-1 block text-xs text-slate-500">Victoria</span><input type="number" value={pointsWin} onChange={(event) => setPointsWin(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label><span className="mb-1 block text-xs text-slate-500">Empate</span><input type="number" value={pointsDraw} onChange={(event) => setPointsDraw(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label><span className="mb-1 block text-xs text-slate-500">Derrota</span><input type="number" value={pointsLoss} onChange={(event) => setPointsLoss(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label></div>
            </div>

            <div>
              <span className="font-semibold">Divisiones</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {['1ra División', '2da División', 'Femenina'].map((division) => (
                  <button key={division} type="button" onClick={() => toggleDivision(division)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${divisions.includes(division) ? 'border-[#70b719] bg-[#e9fbd0] text-[#4c8500]' : 'border-slate-300 text-slate-400'}`}>
                    {division}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="font-semibold">Equipos</span>
              {teams.map((team: Team, index: number) => (
                <div key={index} className="mt-2 grid gap-2 sm:grid-cols-[1fr_150px]">
                  <input value={team.name} onChange={(event) => setTeams(teams.map((item: Team, itemIndex: number) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="Nombre del equipo" className="rounded-lg border border-slate-300 px-3 py-2" />
                  <select value={team.division} onChange={(event) => setTeams(teams.map((item: Team, itemIndex: number) => itemIndex === index ? { ...item, division: event.target.value } : item))} className="rounded-lg border border-slate-300 px-3 py-2">
                    {divisions.map((division: string) => <option key={division}>{division}</option>)}
                  </select>
                </div>
              ))}
              <button type="button" onClick={addTeam} className="mt-3 font-semibold text-[#5c9d12] hover:underline">
                + Añadir equipo
              </button>
            </div>

            {createError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{createError}</p>}
            <button type="submit" className="w-full rounded-lg bg-[#B4FF45] px-5 py-3 font-bold">Crear torneo</button>
          </div>
        </form>

        <aside className="hidden h-fit rounded-2xl bg-[#081522] p-6 text-white shadow-2xl md:block">
          <p className="text-xs font-bold uppercase tracking-wider text-[#B4FF45]">Vista previa</p>
          <div className="mt-4 h-32 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url('${cover}')` }} />
          <h2 className="mt-4 text-2xl font-bold">{name || 'Nombre del torneo'}</h2>
          <p className="mt-2 text-slate-400">Temporada {seasonNumber} · {year}</p>
          <p className="mt-1 text-slate-400">{location}</p>
          <p className="mt-1 text-slate-400">{startDate} → {endDate}</p>
          <p className="mt-1 text-slate-400">{format} · Fixture pendiente de configuración</p>
          <div className="mt-5 flex flex-wrap gap-2">{divisions.map((division: string) => <span key={division} className="rounded-full border border-[#B4FF45]/40 px-3 py-1 text-sm text-[#B4FF45]">{division}</span>)}</div>
          <div className="mt-5 space-y-1 text-sm text-slate-300">
            {teams.filter((team: Team) => team.name.trim()).map((team: Team, index: number) => <p key={`${team.name}-${index}`}>{team.name} · {team.division}</p>)}
          </div>
        </aside>
      </div>
    </div>
  )
}

function PrintableFixture() {
  return (
    <section className="hidden print:block print:min-h-screen print:p-7 print:text-black">
      <div className="flex items-center justify-between"><img src="/MarcaAthlonX/MarcaNegro.svg" alt="AthlonX" className="h-14 w-44 object-contain object-left" /><img src="/upr.png" alt="U.P.R." className="h-20 w-36 object-contain object-right" /></div>
      <h1 className="mt-7 text-center text-3xl font-black">FIXTURE LIGA PANAMEÑA RUGBY 7S</h1>
      <p className="mt-2 text-center">Serie 7s · III fecha · 29 de marzo</p>
      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        {categorias.map((category) => (
          <div key={category.id}>
            <h2 className="text-sm font-black uppercase">{category.nombre}</h2>
            <ul className="mt-2 border border-slate-300 text-sm">
              {category.tabla.map((team) => <li key={team.equipo} className="border border-slate-300 p-2">{team.equipo}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <h2 className="mt-8 border-b-2 border-[#081522] pb-2 text-center text-lg font-black uppercase">Cronograma de partidos</h2>
      <table className="mt-6 w-full border-collapse text-sm">
        <thead><tr><th className="border p-2 text-left">Partido</th><th className="border p-2 text-left">Horario</th><th className="border p-2 text-left">División</th><th className="border p-2 text-left">Enfrentamiento</th></tr></thead>
        <tbody>{fixture.map(([number, time, division, local, visitor]) => <tr key={number}><td className="border-b border-slate-300 p-2 font-semibold">{number}</td><td className="border-b border-slate-300 p-2">{time}</td><td className="border-b border-slate-300 p-2">{division}</td><td className="border-b border-slate-300 p-2 font-semibold">{local} vs. {visitor}</td></tr>)}<tr><td colSpan={4} className="p-4 text-center font-bold">RECESO · 9:10 AM - 9:20 AM</td></tr></tbody>
      </table>
    </section>
  )
}

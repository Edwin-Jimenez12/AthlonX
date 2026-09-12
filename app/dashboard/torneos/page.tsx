'use client'

import { CalendarDays, MapPin, Plus, Trophy, Users, X } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { categorias, torneoActivo } from '../../../simulaDatos'
import { supabase } from '../../../lib/supabase'

const fixture = [
  ['Partido 1', '8:10 AM - 8:30 AM', '1ra División', 'Guerreros', 'Titanes'],
  ['Partido 2', '8:35 AM - 8:50 AM', '2da División', 'Vikingos', 'Cuervos'],
  ['Partido 3', '8:55 AM - 9:10 AM', 'Femenina', 'Titanes', 'Lycans'],
  ['Partido 4', '9:20 AM - 9:35 AM', '1ra División', 'Centauros', 'Titanes'],
  ['Partido 5', '9:40 AM - 9:55 AM', '2da División', 'Titanes', 'Power Clan'],
  ['Partido 6', '10:00 AM - 10:15 AM', 'Femenina', 'Lycans', 'Targarens'],
  ['Partido 7', '10:25 AM - 10:40 AM', '1ra División', 'Guerreros', 'Centauros'],
]

type Team = { name: string; division: string }
type Tournament = { name: string; status: 'Borrador' | 'Publicado'; season: string; cover: string }

export default function TournamentsPage() {
  const router = useRouter()
  const [showCreator, setShowCreator] = useState(false)
  const [openTournament, setOpenTournament] = useState(false)
  const [created, setCreated] = useState<Tournament[]>([])
  const [name, setName] = useState('')
  const [seasonNumber, setSeasonNumber] = useState('2')
  const [year, setYear] = useState('2026')
  const [location, setLocation] = useState('Ciudad de Panamá')
  const [cover, setCover] = useState('/upr.png')
  const [divisions, setDivisions] = useState(['1ra División', '2da División', 'Femenina'])
  const [teams, setTeams] = useState<Team[]>([{ name: 'Titanes', division: '1ra División' }])
  const [isSpectator, setIsSpectator] = useState(true)
  const [profileName, setProfileName] = useState('Espectador')
  const [roles, setRoles] = useState<string[]>(['espectador', 'atleta', 'entrenador', 'directivo'])
  const [activeRole, setActiveRole] = useState('espectador')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function loadRole() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const [{ data: profile }, { data: userRoles }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', data.user.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', data.user.id),
      ])
      setProfileName(profile?.full_name || data.user.user_metadata?.full_name || 'Espectador')
      const availableRoles = Array.from(new Set([...(userRoles?.map(({ role }) => role) ?? []), ...(Array.isArray(data.user.user_metadata?.roles) ? data.user.user_metadata.roles : []), 'espectador', 'atleta', 'entrenador', 'directivo']))
      setRoles(availableRoles)
      setActiveRole(availableRoles.includes('espectador') ? 'espectador' : availableRoles[0])
      setIsSpectator(!(userRoles?.some(({ role }) => role === 'directivo') ?? false))
    }
    void loadRole()
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

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || divisions.length === 0) return
    setCreated((current) => [...current, { name: name.trim(), status: 'Borrador', season: `${seasonNumber} · ${year}`, cover }])
    setShowCreator(false)
  }

  const matchesFilter = (status: string) => statusFilter === 'Todos' || statusFilter.toLowerCase() === status.toLowerCase()
  const matchesSearch = (nameToSearch: string) => nameToSearch.toLowerCase().includes(searchTerm.trim().toLowerCase())

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#17212b] lg:pl-64">
      <section className="mx-auto max-w-7xl space-y-6 p-6 md:p-10 print:hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="flex flex-1 gap-2 rounded-xl border border-slate-200 bg-white p-1">{['Todos', 'En curso', 'Próximos', 'Finalizados'].map((filter) => <button key={filter} type="button" onClick={() => setStatusFilter(filter)} className={`flex-1 rounded-lg px-4 py-3 font-semibold ${statusFilter === filter ? 'bg-[#B4FF45] text-[#17212b]' : 'text-slate-500 hover:bg-slate-50'}`}>{filter}</button>)}</div><label className="flex w-full items-center rounded-xl border border-slate-200 bg-white px-4 py-3 lg:max-w-sm"><span className="mr-3 text-slate-400">⌕</span><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar torneo" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" /></label></div>
        <div className="grid gap-5 xl:grid-cols-3">
          {matchesFilter('En curso') && matchesSearch(torneoActivo.nombre) && <TournamentCard name={torneoActivo.nombre} status="En curso" season="2 · 2026" cover="/upr.png" onOpen={() => isSpectator ? router.push('/dashboard/torneos/liga-panamena-rugby') : setOpenTournament(true)} />}
          {matchesFilter('Finalizado') && matchesSearch('Liga Panameña de Rugby - 1ra temporada 2026') && <TournamentCard name="Liga Panameña de Rugby - 1ra temporada 2026" status="Finalizado" season="1 · 2026" cover="/upr.png" onOpen={() => isSpectator ? router.push('/dashboard/torneos/liga-panamena-rugby') : setOpenTournament(true)} />}
          {[
            ['Copa Istmo Rugby 7s', 'Próximo', '3 · 2026'],
            ['Torneo Metropolitano UPR', 'En curso', '1 · 2026'],
            ['Festival Juvenil Panamá', 'Próximo', '1 · 2026'],
            ['Copa del Pacífico Femenina', 'Finalizado', '2 · 2025'],
            ['Serie Nacional de Clubes', 'Finalizado', '4 · 2025'],
          ].map(([leagueName, status, season]) => matchesFilter(status) && matchesSearch(leagueName) && <TournamentCard key={leagueName} name={leagueName} status={status} season={season} cover="/upr.png" onOpen={() => setOpenTournament(true)} />)}
          {created.map((tournament, index) => matchesFilter(tournament.status === 'Publicado' ? 'Próximos' : 'Borrador') && <TournamentCard key={`${tournament.name}-${index}`} name={tournament.name} status={tournament.status} season={tournament.season} cover={tournament.cover} onOpen={() => setOpenTournament(true)} actions={<><button type="button" onClick={() => setCreated((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, status: 'Publicado' } : item))} className="font-semibold text-[#5c9d12]">Publicar</button><button type="button" onClick={() => setCreated((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="ml-4 font-semibold text-red-600">Eliminar</button></>} />)}
        </div>
      </section>
      {showCreator && <Creator name={name} setName={setName} seasonNumber={seasonNumber} setSeasonNumber={setSeasonNumber} year={year} setYear={setYear} location={location} setLocation={setLocation} cover={cover} setCover={setCover} divisions={divisions} toggleDivision={toggleDivision} teams={teams} setTeams={setTeams} onSubmit={handleCreate} onClose={() => setShowCreator(false)} />}
      {openTournament && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4"><div className="mx-auto my-10 max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex justify-between"><div><p className="text-sm font-bold uppercase text-[#70b719]">Configuración editable</p><h2 className="text-3xl font-bold">Editar torneo</h2></div><button type="button" onClick={() => setOpenTournament(false)} aria-label="Cerrar"><X /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold text-slate-500">Nombre de la liga</span><input value={name || torneoActivo.nombre} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3" /></label><label><span className="mb-1 block text-sm font-semibold text-slate-500">Temporada</span><input value={seasonNumber} onChange={(event) => setSeasonNumber(event.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3" /></label><label><span className="mb-1 block text-sm font-semibold text-slate-500">Año</span><input value={year} onChange={(event) => setYear(event.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3" /></label><label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold text-slate-500">Ubicación</span><input value={location} onChange={(event) => setLocation(event.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3" /></label><Config title="Divisiones activas" value={divisions.join(' · ')} /><Config title="Fixture" value={`${fixture.length} partidos programados`} /></div><div className="mt-6 flex gap-3"><button type="button" onClick={() => setOpenTournament(false)} className="flex-1 rounded-lg bg-[#B4FF45] px-4 py-3 font-bold">Guardar cambios</button><button type="button" onClick={() => setOpenTournament(false)} className="rounded-lg border border-slate-300 px-4 py-3 font-semibold">Cancelar</button></div></div></div>}
    </main>
  )
}

function TournamentCard({ name, status, season, cover, onOpen, actions }: { name: string; status: string; season: string; cover: string; onOpen: () => void; actions?: React.ReactNode }) {
  return <article className="overflow-hidden rounded-3xl border border-slate-200 bg-[#081522] text-white shadow-sm"><div className="relative flex h-48 items-center justify-center bg-white p-2 sm:h-52"><img src={cover} alt={`Portada de ${name}`} className="h-full w-full scale-110 object-contain object-center" /><span className="absolute left-4 top-4 rounded-full border border-[#70b719] bg-white/90 px-3 py-1 text-xs font-bold uppercase text-[#4c8500]">{status}</span></div><div className="p-5"><p className="text-sm text-slate-400">Temporada {season}</p><h2 className="mt-2 text-xl font-bold">{name}</h2><p className="mt-4 text-sm text-slate-400"><CalendarDays className="mr-2 inline text-[#B4FF45]" size={16} />12 - 14 sept. 2026</p><p className="mt-2 text-sm text-slate-400"><MapPin className="mr-2 inline text-[#B4FF45]" size={16} />Ciudad de Panamá</p><p className="mt-2 text-sm text-slate-400"><Users className="mr-2 inline text-[#B4FF45]" size={16} />3 divisiones</p><button type="button" onClick={onOpen} className="mt-6 w-full border-t border-white/10 pt-4 text-left font-semibold hover:text-[#B4FF45]">Abrir torneo →</button>{actions && <div className="mt-3 border-t border-white/10 pt-3 text-sm">{actions}</div>}</div></article>
}

function Config({ title, value }: { title: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-4"><p className="text-sm text-slate-500">{title}</p><p className="mt-1 font-bold">{value}</p></div> }

function Creator({ name, setName, seasonNumber, setSeasonNumber, year, setYear, location, setLocation, cover, setCover, divisions, toggleDivision, teams, setTeams, onSubmit, onClose }: any) {
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

            <label className="block">
              <span className="mb-1 block font-semibold">Ubicación</span>
              <input value={location} onChange={(event) => setLocation(event.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3" />
            </label>

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

            <button type="submit" className="w-full rounded-lg bg-[#B4FF45] px-5 py-3 font-bold">Crear torneo</button>
          </div>
        </form>

        <aside className="hidden h-fit rounded-2xl bg-[#081522] p-6 text-white shadow-2xl md:block">
          <p className="text-xs font-bold uppercase tracking-wider text-[#B4FF45]">Vista previa</p>
          <div className="mt-4 h-32 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url('${cover}')` }} />
          <h2 className="mt-4 text-2xl font-bold">{name || 'Nombre del torneo'}</h2>
          <p className="mt-2 text-slate-400">Temporada {seasonNumber} · {year}</p>
          <p className="mt-1 text-slate-400">{location}</p>
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

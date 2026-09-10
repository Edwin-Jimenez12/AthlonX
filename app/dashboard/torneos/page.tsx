'use client'

import { CalendarDays, Download, MapPin, Plus, Trophy, Users, X } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { categorias, torneoActivo } from '../../../simulaDatos'

const fixture = [
  ['Partido 1', '8:10 AM - 8:30 AM', '1ra División', 'Guerreros', 'Titanes'],
  ['Partido 2', '8:35 AM - 8:50 AM', '2da División', 'Vikingos', 'Cuervos'],
  ['Partido 3', '8:55 AM - 9:10 AM', 'Femenina', 'Titanes', 'Lycans'],
  ['Partido 4', '9:20 AM - 9:35 AM', '1ra División', 'Centauros', 'Titanes'],
  ['Partido 5', '9:40 AM - 9:55 AM', '2da División', 'Titanes', 'Power Clan'],
  ['Partido 6', '10:00 AM - 10:15 AM', 'Femenina', 'Lycans', 'Targarens'],
]

type Team = { name: string; division: string }
type Tournament = { name: string; status: 'Borrador' | 'Publicado'; season: string; cover: string }

export default function TournamentsPage() {
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

  function toggleDivision(division: string) {
    setDivisions((current) => current.includes(division) ? current.filter((item) => item !== division) : [...current, division])
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || divisions.length === 0) return
    setCreated((current) => [...current, { name: name.trim(), status: 'Borrador', season: `${seasonNumber} · ${year}`, cover }])
    setShowCreator(false)
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#17212b] lg:pl-64">
      <header className="border-b border-slate-200 bg-white px-6 py-5 md:px-10 print:hidden"><div className="mx-auto flex max-w-7xl items-center justify-between"><div><p className="text-sm font-semibold text-slate-500">Gestión de competencias</p><h1 className="text-3xl font-bold">Torneos</h1></div><button type="button" onClick={() => setShowCreator(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#081522] px-4 py-3 font-bold text-white"><Plus size={18} /> Crear torneo</button></div></header>
      <section className="mx-auto max-w-7xl space-y-6 p-6 md:p-10 print:hidden">
        <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-1 md:max-w-3xl"><button className="flex-1 rounded-lg bg-[#B4FF45] px-4 py-3 font-semibold">Todos</button><button className="flex-1 rounded-lg px-4 py-3 text-slate-500">En curso</button><button className="flex-1 rounded-lg px-4 py-3 text-slate-500">Próximos</button><button className="flex-1 rounded-lg px-4 py-3 text-slate-500">Finalizados</button></div>
        <div className="grid gap-5 xl:grid-cols-[repeat(3,minmax(0,1fr))_340px]">
          <TournamentCard name={torneoActivo.nombre} status="En curso" season="2 · 2026" cover="/upr.png" onOpen={() => setOpenTournament(true)} />
          <TournamentCard name="Liga Panameña de Rugby - 1ra temporada 2026" status="Finalizado" season="1 · 2026" cover="/upr.png" onOpen={() => setOpenTournament(true)} />
          {created.map((tournament, index) => <TournamentCard key={`${tournament.name}-${index}`} name={tournament.name} status={tournament.status} season={tournament.season} cover={tournament.cover} onOpen={() => setOpenTournament(true)} actions={<><button type="button" onClick={() => setCreated((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, status: 'Publicado' } : item))} className="font-semibold text-[#5c9d12]">Publicar</button><button type="button" onClick={() => setCreated((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="ml-4 font-semibold text-red-600">Eliminar</button></>} />)}
          <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-2xl font-bold">Próximos partidos</h2><div className="mt-5 space-y-3">{fixture.slice(0, 2).map((match) => <div key={match[0]} className="rounded-lg border border-slate-200 p-4"><p className="text-xs uppercase text-slate-500">{match[2]}</p><div className="mt-4 flex justify-between font-semibold"><span>{match[3]}</span><span className="text-[#70b719]">{match[1].split(' ')[0]}</span><span>{match[4]}</span></div></div>)}</div></aside>
        </div>
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold">Fixture · Serie 7s - III fecha</h2><p className="mt-1 text-slate-500">29 de marzo · Cronograma simulado de partidos</p></div><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-3 font-semibold"><Download size={18} /> Descargar PDF</button></div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-[#dce8f7] font-bold"><tr><th className="px-4 py-3">Partido</th><th>Horario</th><th>División</th><th>Enfrentamiento</th></tr></thead><tbody>{fixture.map(([number, time, division, local, visitor]) => <tr key={number} className="border-t border-slate-100"><td className="px-4 py-3 font-bold">{number}</td><td>{time}</td><td>{division}</td><td className="font-semibold">{local} <span className="mx-2 text-slate-400">vs.</span> {visitor}</td></tr>)}</tbody></table></div></section>
      </section>
      <PrintableFixture />
      {showCreator && <Creator name={name} setName={setName} seasonNumber={seasonNumber} setSeasonNumber={setSeasonNumber} year={year} setYear={setYear} location={location} setLocation={setLocation} cover={cover} setCover={setCover} divisions={divisions} toggleDivision={toggleDivision} teams={teams} setTeams={setTeams} onSubmit={handleCreate} onClose={() => setShowCreator(false)} />}
      {openTournament && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4"><div className="mx-auto my-10 max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex justify-between"><div><p className="text-sm font-bold uppercase text-[#70b719]">Administración</p><h2 className="text-3xl font-bold">Liga Panameña de Rugby</h2></div><button onClick={() => setOpenTournament(false)}><X /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><Config title="Divisiones" value="1ra · 2da · Femenina" /><Config title="Temporada" value="2da temporada · 2026" /><Config title="Fixture" value="6 partidos programados" /><Config title="Ubicación" value={location} /></div><button onClick={() => setOpenTournament(false)} className="mt-6 w-full rounded-lg bg-[#081522] px-4 py-3 font-bold text-white">Cerrar configuración</button></div></div>}
    </main>
  )
}

function TournamentCard({ name, status, season, cover, onOpen, actions }: { name: string; status: string; season: string; cover: string; onOpen: () => void; actions?: React.ReactNode }) {
  return <article className="overflow-hidden rounded-3xl border border-slate-200 bg-[#081522] text-white shadow-sm"><div className="h-36 bg-cover bg-center p-4" style={{ backgroundImage: `linear-gradient(180deg,rgba(8,21,34,.15),rgba(8,21,34,.95)),url('${cover}')` }}><span className="rounded-full border border-[#B4FF45]/60 px-3 py-1 text-xs font-bold uppercase text-[#B4FF45]">{status}</span></div><div className="p-5"><p className="text-sm text-slate-400">Temporada {season}</p><h2 className="mt-2 text-xl font-bold">{name}</h2><p className="mt-4 text-sm text-slate-400"><CalendarDays className="mr-2 inline text-[#B4FF45]" size={16} />12 - 14 sept. 2026</p><p className="mt-2 text-sm text-slate-400"><MapPin className="mr-2 inline text-[#B4FF45]" size={16} />Ciudad de Panamá</p><p className="mt-2 text-sm text-slate-400"><Users className="mr-2 inline text-[#B4FF45]" size={16} />3 divisiones</p><button type="button" onClick={onOpen} className="mt-6 w-full border-t border-white/10 pt-4 text-left font-semibold hover:text-[#B4FF45]">Abrir torneo →</button>{actions && <div className="mt-3 border-t border-white/10 pt-3 text-sm">{actions}</div>}</div></article>
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
    <section className="hidden print:block print:p-6 print:text-black">
      <h1 className="text-3xl font-black">FIXTURE LIGA PANAMEÑA RUGBY 7S</h1>
      <p className="mt-2">Serie 7s · III fecha · 29 de marzo</p>
      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        {categorias.map((category) => (
          <div key={category.id} className="rounded border p-3">
            <h2 className="font-bold">{category.nombre}</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {category.tabla.map((team) => <li key={team.equipo}>{team.equipo}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <table className="mt-6 w-full border-collapse text-sm">
        <thead><tr><th className="border p-2 text-left">Partido</th><th className="border p-2 text-left">Horario</th><th className="border p-2 text-left">División</th><th className="border p-2 text-left">Enfrentamiento</th></tr></thead>
        <tbody>{fixture.map(([number, time, division, local, visitor]) => <tr key={number}><td className="border p-2">{number}</td><td className="border p-2">{time}</td><td className="border p-2">{division}</td><td className="border p-2">{local} vs. {visitor}</td></tr>)}</tbody>
      </table>
    </section>
  )
}


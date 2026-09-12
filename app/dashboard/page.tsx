'use client'

import { BarChart3, CalendarDays, ChevronRight, ClipboardList, MapPin, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { categorias, partidoActual, proximosPartidos, resumenDashboard, torneoActivo } from '../../simulaDatos'
import { supabase } from '../../lib/supabase'

const summaryCards = [
  ['Torneos activos', resumenDashboard.torneosActivos],
  ['Equipos registrados', resumenDashboard.equiposRegistrados],
  ['Partidos jugados', resumenDashboard.partidosJugados],
  ['Atletas', resumenDashboard.atletas],
]

export default function Dashboard() {
  const router = useRouter()
  const [categoryId, setCategoryId] = useState('mayor')
  const [profileName, setProfileName] = useState('Espectador')
  const [roles, setRoles] = useState<string[]>(['espectador', 'atleta', 'entrenador', 'directivo'])
  const [activeRole, setActiveRole] = useState('espectador')
  const [loadingSession, setLoadingSession] = useState(true)
  const category = categorias.find((item) => item.id === categoryId) ?? categorias[0]
  const isSpectator = activeRole === 'espectador' || activeRole === 'atleta'

  useEffect(() => {
    async function loadUserContext() {
      if (!supabase) {
        setLoadingSession(false)
        return
      }

      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.replace('/')
        return
      }

      const [{ data: profile }, { data: userRoles }] = await Promise.all([
        supabase.from('profiles').select('full_name, email_verified').eq('id', userData.user.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userData.user.id),
      ])

      const metadataRoles = Array.isArray(userData.user.user_metadata?.roles)
        ? userData.user.user_metadata.roles
        : []
      const availableRoles = Array.from(new Set([
        ...(userRoles?.map(({ role }) => role) ?? []),
        ...metadataRoles,
        'espectador',
        'atleta',
        'entrenador',
        'directivo',
      ]))

      setProfileName(profile?.full_name || userData.user.user_metadata?.full_name || 'Espectador')
      setRoles(availableRoles)
      setActiveRole(availableRoles.includes('espectador') ? 'espectador' : availableRoles[0] ?? 'espectador')
      setLoadingSession(false)
    }

    void loadUserContext()
  }, [router])

  useEffect(() => {
    const syncRole = (event: Event) => setActiveRole((event as CustomEvent<string>).detail)
    window.addEventListener('athlonx-role-change', syncRole)
    return () => window.removeEventListener('athlonx-role-change', syncRole)
  }, [])

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#17212b]">
      <section className="min-h-screen px-5 py-7 md:px-10 lg:ml-64 lg:px-12">
        <header className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div><p className="text-3xl font-bold md:text-4xl">Bienvenido, <span className="text-[#4c8500]">{loadingSession ? 'cargando...' : profileName}</span></p><p className="mt-2 text-sm text-slate-500">Selecciona una vista para continuar.</p></div>
          {activeRole === 'directivo' && <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#B4FF45] px-4 py-3 font-bold text-[#10151b] hover:bg-[#9ff02e]"><Plus size={18} /> Crear torneo</button>}
        </header>

        {!isSpectator && <div className="mx-auto mt-8 grid max-w-7xl gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(([label, value]) => <article key={label as string} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label as string}</p><p className="mt-2 text-3xl font-bold">{value}</p></article>)}
        </div>}

        <section className="mx-auto mt-6 max-w-7xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-[#e9fbd0] px-3 py-1 text-xs font-bold uppercase text-[#4c8500]">{partidoActual.enVivo ? partidoActual.estado : 'PRÓXIMO PARTIDO'}</span><span className="text-sm text-slate-500">{torneoActivo.nombre}</span></div><h2 className="mt-3 text-2xl font-bold">{partidoActual.categoria} · {partidoActual.jornada}</h2><div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500"><span><MapPin className="mr-1 inline text-[#70b719]" size={16} />{torneoActivo.ubicacion}</span><span><CalendarDays className="mr-1 inline text-[#70b719]" size={16} />{torneoActivo.jornadas}</span></div></div><button type="button" onClick={() => router.push('/dashboard/torneos/liga-panamena-rugby/partidos')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#081522] px-4 py-3 font-semibold text-white hover:bg-[#172b3b]">Ver partido <ChevronRight size={18} /></button></div>
          <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-xl bg-[#f4f8ef] p-5 text-center md:px-12"><div><div className="mx-auto flex h-20 w-20 items-center justify-center"><img src={partidoActual.localLogo} alt={`Logo de ${partidoActual.local}`} className="h-full w-full object-contain" /></div><p className="mt-2 text-lg font-bold">{partidoActual.local}</p><p className="text-sm text-slate-500">{partidoActual.localPuntos} puntos</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-[#70b719]">{partidoActual.enVivo ? partidoActual.periodo : 'Próximo'}</p><p className="mt-1 text-3xl font-bold text-[#081522]">{partidoActual.enVivo ? `${partidoActual.localPuntos} - ${partidoActual.visitantePuntos}` : 'VS'}</p><p className="text-sm text-slate-500">{partidoActual.enVivo ? partidoActual.tiempo : 'Horario pendiente'}</p></div><div><div className="mx-auto flex h-20 w-20 items-center justify-center"><img src={partidoActual.visitanteLogo} alt={`Logo de ${partidoActual.visitante}`} className="h-full w-full object-contain" /></div><p className="mt-2 text-lg font-bold">{partidoActual.visitante}</p><p className="text-sm text-slate-500">{partidoActual.visitantePuntos} puntos</p></div></div>
        </section>

        <div className="mx-auto mt-6 grid max-w-7xl min-w-0 gap-6 xl:grid-cols-2">
          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-center"><h2 className="font-display text-4xl uppercase">Tabla de posiciones</h2><div className="mt-5 flex justify-start overflow-x-auto pb-1"><div className="flex min-w-max rounded-lg bg-slate-100 p-1">{categorias.map((item) => <button key={item.id} type="button" onClick={() => setCategoryId(item.id)} className={`rounded-md px-4 py-2 text-sm font-semibold transition ${categoryId === item.id ? 'bg-[#081522] text-white' : 'text-slate-500 hover:text-slate-900'}`}>{item.nombre.replace('Liga ', '')}</button>)}</div></div></div>
            <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left"><thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-3">Pos.</th><th className="px-3 py-3">Equipo</th><th className="bg-[#e9fbd0] px-3 py-3 text-center text-[#17212b]">PTS</th>{['PJ', 'G', 'E', 'P', '+PT', '-PT', 'DIF'].map((heading) => <th key={heading} className="px-3 py-3 text-center">{heading}</th>)}</tr></thead><tbody>{category.tabla.map((team, index) => <tr key={team.equipo} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-bold text-[#70b719]">{index + 1}</td><td className="px-3 py-4 font-semibold">{team.equipo}</td><td className="bg-[#f0f8e8] px-3 py-4 text-center text-lg font-black text-[#4c8500]">{team.puntos}</td><td className="px-3 py-4 text-center text-slate-500">{team.pj}</td><td className="px-3 py-4 text-center text-slate-500">{team.ganados}</td><td className="px-3 py-4 text-center text-slate-500">{team.empatados}</td><td className="px-3 py-4 text-center text-slate-500">{team.perdidos}</td><td className="px-3 py-4 text-center text-slate-500">{team.aFavor}</td><td className="px-3 py-4 text-center text-slate-500">{team.enContra}</td><td className="px-3 py-4 text-center font-bold">{team.aFavor - team.enContra}</td></tr>)}</tbody></table></div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold">Próximos partidos</h2><p className="mt-1 text-sm text-slate-500">Agenda de la próxima jornada.</p></div><ClipboardList className="text-[#70b719]" /></div>
            <div className="mt-6 space-y-3">
              {proximosPartidos.map((match) => (
                <article key={`${match.hora}-${match.local}`} className="overflow-hidden rounded-lg border border-slate-200 p-4 sm:p-5">
                  <div className="flex justify-between text-xs text-slate-500"><span>{match.categoria}</span><span>{match.fecha}</span></div>
                  <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-center sm:gap-4">
                    <div className="min-w-0"><div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden sm:h-20 sm:w-20"><TeamLogo src={match.localLogo} name={match.local} /></div><p className="mt-2 truncate text-lg font-semibold">{match.local}</p><p className="text-sm text-slate-500">{match.localDetail}</p></div>
                    <div className="flex min-w-[70px] flex-col items-center gap-2"><span className="font-heading text-3xl font-black italic text-[#081522]">VS</span><span className="whitespace-nowrap rounded bg-slate-200 px-3 py-1 text-sm font-bold text-slate-600">{formatTime(match.hora)}</span></div>
                    <div className="min-w-0"><div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden sm:h-20 sm:w-20"><TeamLogo src={match.visitanteLogo} name={match.visitante} /></div><p className="mt-2 truncate text-lg font-semibold">{match.visitante}</p><p className="text-sm text-slate-500">{match.visitanteDetail}</p></div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

function TeamLogo({ src, name }: { src: string; name: string }) {
  if (src) return <img src={src} alt={`Logo de ${name}`} className="h-full w-full object-contain" />
  return <span className="font-heading text-lg font-bold text-[#B4FF45]">{name.slice(0, 2).toUpperCase()}</span>
}

function formatTime(time: string) {
  const [rawHour, minutes] = time.split(':')
  const hour = Number(rawHour)
  return `${hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`
}

function RoleSwitcher({ roles, activeRole, onChange }: { roles: string[]; activeRole: string; onChange: (role: string) => void }) {
  const labels: Record<string, string> = {
    espectador: 'Espectador',
    atleta: 'Atleta',
    entrenador: 'Entrenador',
    directivo: 'Directivo',
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-full bg-[#e9fbd0] px-4 py-2 text-sm font-semibold text-[#4c8500]">
      <span>Vista:</span>
      <select value={activeRole} onChange={(event) => onChange(event.target.value)} className="cursor-pointer bg-transparent font-bold outline-none">
        {roles.map((role) => <option key={role} value={role}>{labels[role] ?? role}</option>)}
      </select>
    </label>
  )
}

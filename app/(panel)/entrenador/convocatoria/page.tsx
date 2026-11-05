'use client'

import { Megaphone } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadManagedTeams, ManagedTeam } from '../../../../lib/team-access'
import { supabase } from '../../../../lib/supabase'
import { PersonaShell } from '../../../../Components/persona/persona-ui'
import { TeamCallupsCard } from '../../../../Components/mi-equipo/team-callups-card'
import { Card, CardHeader, Notice, PageHeader, Segment } from '../../../../Components/mi-equipo/ui'

// Entrenador · Convocatoria (Figma: Convocatoria): convocar jugadores por fecha de cada torneo de su equipo.
export default function TrainerCallupPage() {
  const [teams, setTeams] = useState<ManagedTeam[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) {
        setError('Supabase no está configurado.')
        setLoading(false)
        return
      }
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        setError('Debes iniciar sesión para convocar jugadores.')
        setLoading(false)
        return
      }
      const coached = (await loadManagedTeams(data.user.id)).filter((team) => team.role === 'entrenador')
      if (!active) return
      setTeams(coached)
      setSelectedId(coached[0]?.id ?? '')
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [])

  const selected = teams.find((team) => team.id === selectedId) ?? null

  return (
    <PersonaShell>
      <PageHeader
        title="Convocatoria"
        description="Convoca a los jugadores de cada fecha. Las respuestas se ven en Mi equipo."
        actions={<Link href="/entrenador" className="text-sm font-semibold text-[var(--ax-accent-text)] underline underline-offset-4">Volver a Mi equipo</Link>}
      />
      {error && <Notice tone="danger" icon={Megaphone}>{error}</Notice>}
      {teams.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Equipo a convocar">
          {teams.map((team) => <Segment key={team.id} active={team.id === selected?.id} label={team.name} onClick={() => setSelectedId(team.id)} />)}
        </div>
      )}
      {selected ? <TeamCallupsCard teamId={selected.id} teamName={selected.name} /> : !loading && (
        <Card labelledBy="sin-equipo"><CardHeader id="sin-equipo" title="Sin equipos a cargo" subtitle="Necesitas un equipo donde tengas el cargo de entrenador." /></Card>
      )}
    </PersonaShell>
  )
}

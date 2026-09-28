'use client'

import { Check, Layers3, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const DIVISION_OPTIONS = [
  { value: 'Primera división', description: 'Equipo principal de la institución.' },
  { value: 'Segunda división', description: 'Segunda categoría competitiva.' },
  { value: 'Tercera división', description: 'Tercera categoría competitiva.' },
  { value: 'Femenina', description: 'División femenina del equipo.' },
]

export function TeamDivisionSettings({ teamId }: { teamId?: string }) {
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadDivisions() {
      if (!supabase || !teamId) return

      setLoading(true)
      const { data, error } = await supabase
        .from('team_division_catalog')
        .select('name')
        .eq('team_id', teamId)
        .is('discipline_id', null)
        .order('name')

      setLoading(false)

      if (error) {
        setMessage(error.message)
        return
      }

      const availableNames = new Set(DIVISION_OPTIONS.map((division) => division.value.toLowerCase()))
      setSelectedDivisions(
        (data ?? [])
          .map((division) => division.name)
          .filter((name) => availableNames.has(name.trim().toLowerCase())),
      )
    }

    void loadDivisions()
  }, [teamId])

  function toggleDivision(division: string) {
    setSelectedDivisions((current) =>
      current.includes(division)
        ? current.filter((item) => item !== division)
        : [...current, division],
    )
    setMessage('')
  }

  async function saveDivisions() {
    if (!supabase || !teamId) return

    setSaving(true)
    setMessage('')
    const { error } = await supabase.rpc('save_team_divisions', {
      p_team_id: teamId,
      p_divisions: selectedDivisions,
    })
    setSaving(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Las divisiones del equipo se guardaron correctamente.')
  }

  return (
    <section className="mt-8 rounded-3xl border border-[#1f4057] bg-[#0b1d2c] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">
            Perfil deportivo
          </p>
          <h2 className="mt-2 font-display text-3xl uppercase">Divisiones del equipo</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Selecciona las divisiones que mantiene este equipo. Son generales y aplican a todos
            los deportes.
          </p>
        </div>
        <Layers3 className="text-[#b4ff45]" size={26} />
      </div>

      {loading ? (
        <p className="mt-7 rounded-2xl border border-dashed border-[#31556b] p-5 text-sm text-slate-400">
          Cargando divisiones...
        </p>
      ) : (
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {DIVISION_OPTIONS.map((division) => {
            const isSelected = selectedDivisions.includes(division.value)

            return (
              <button
                type="button"
                key={division.value}
                onClick={() => toggleDivision(division.value)}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? 'border-[#b4ff45]/60 bg-[#b4ff45]/10'
                    : 'border-[#29485d] bg-[#07131e] hover:border-[#b4ff45]/50'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    isSelected
                      ? 'border-[#b4ff45] bg-[#b4ff45] text-[#07131e]'
                      : 'border-[#31556b] text-transparent'
                  }`}
                >
                  <Check size={14} />
                </span>
                <span>
                  <span className="block font-bold text-white">{division.value}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">
                    {division.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4 border-t border-[#1f4057] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">
          {selectedDivisions.length
            ? `${selectedDivisions.length} división${selectedDivisions.length === 1 ? '' : 'es'} seleccionada${selectedDivisions.length === 1 ? '' : 's'}.`
            : 'No hay divisiones seleccionadas.'}
        </p>
        <button
          type="button"
          onClick={() => void saveDivisions()}
          disabled={!teamId || loading || saving}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] transition hover:bg-[#d5ff9b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save size={17} />
          {saving ? 'Guardando...' : 'Guardar divisiones'}
        </button>
      </div>

      {message && (
        <p role="status" className="mt-4 rounded-xl bg-[#07131e] px-4 py-3 text-sm font-semibold text-slate-300">
          {message}
        </p>
      )}
    </section>
  )
}

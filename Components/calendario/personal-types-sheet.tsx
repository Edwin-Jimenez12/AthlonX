'use client'

import { Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button, FieldLabel, inputClass } from '../mi-equipo/ui'

export type PersonalType = {
  id: string
  category: 'training' | 'match' | 'meeting' | 'personal' | 'other'
  label: string
  color: string
  default_key: string | null
}

// Paleta fija de 12 colores: se leen bien sobre tema claro y oscuro.
export const palette = ['#b4ff45', '#4ea8ff', '#a78bfa', '#ff9f43', '#ff6b6b', '#2dd4bf', '#facc15', '#f472b6', '#22c55e', '#7dd3fc', '#818cf8', '#94a3b8']

const categoryLabels: Record<PersonalType['category'], string> = {
  training: 'Entrenamiento',
  match: 'Partido',
  meeting: 'Reunión',
  personal: 'Personal',
  other: 'Otro',
}

const sheetClass = 'ax-drop-in fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[14px] border border-b-0 border-[var(--ax-line-strong)] bg-[var(--ax-surface)] shadow-[var(--ax-shadow-pop)] sm:inset-x-auto sm:right-6 sm:w-[560px] sm:max-h-[min(80vh,720px)]'

function PaletteGrid({ value, onPick, label }: { value: string; onPick: (color: string) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-6 gap-2 sm:grid-cols-12">
      {palette.map((color) => (
        <button
          key={color}
          type="button"
          aria-pressed={value === color}
          aria-label={`Color ${color}`}
          onClick={() => onPick(color)}
          className={`h-11 w-11 cursor-pointer rounded-full border border-[var(--ax-line-strong)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ax-accent-soft)] ${value === color ? 'ring-2 ring-[var(--ax-text)] ring-offset-2 ring-offset-[var(--ax-surface)]' : ''}`}
          style={{ background: color }}
        />
      ))}
    </div>
  )
}

// Hoja para administrar los tipos de evento de la cuenta personal: renombrar, cambiar color, agregar y borrar.
// Los predefinidos no se borran; sus nombres se pueden restablecer con confirmación.
export function PersonalTypesSheet({ types, userId, onChanged, onClose }: { types: PersonalType[]; userId: string; onChanged: () => Promise<void>; onClose: () => void }) {
  const [openColorFor, setOpenColorFor] = useState<string | null>(null)
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [newLabel, setNewLabel] = useState('')
  const [newCategory, setNewCategory] = useState<PersonalType['category']>('personal')
  const [newColor, setNewColor] = useState(palette[0])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  function fail(error: { message: string }) {
    setMessage({ tone: 'danger', text: error.message.includes('duplicate') || error.message.includes('unique') ? 'Ya tienes un tipo con ese nombre.' : error.message })
  }

  async function rename(type: PersonalType) {
    const label = (drafts[type.id] ?? type.label).trim()
    if (label === type.label) return setDrafts((current) => { const next = { ...current }; delete next[type.id]; return next })
    if (!label || label.length > 40) return setMessage({ tone: 'danger', text: 'El nombre debe tener entre 1 y 40 caracteres.' })
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.from('personal_event_types').update({ label }).eq('id', type.id)
    setBusy(false)
    if (error) return fail(error)
    setDrafts((current) => { const next = { ...current }; delete next[type.id]; return next })
    setMessage({ tone: 'success', text: 'Nombre guardado.' })
    await onChanged()
  }

  async function recolor(type: PersonalType, color: string) {
    if (!supabase || color === type.color) return setOpenColorFor(null)
    setBusy(true)
    const { error } = await supabase.from('personal_event_types').update({ color }).eq('id', type.id)
    setBusy(false)
    if (error) return fail(error)
    setOpenColorFor(null)
    await onChanged()
  }

  async function remove(type: PersonalType) {
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.from('personal_event_types').delete().eq('id', type.id)
    setBusy(false)
    if (error) return fail(error)
    setConfirmDeleteFor(null)
    setMessage({ tone: 'success', text: 'Tipo borrado. Las actividades que lo usaban conservan su categoría.' })
    await onChanged()
  }

  async function add() {
    const label = newLabel.trim()
    if (!label || label.length > 40) return setMessage({ tone: 'danger', text: 'Escribe un nombre de 1 a 40 caracteres.' })
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.from('personal_event_types').insert({ user_id: userId, category: newCategory, label, color: newColor })
    setBusy(false)
    if (error) return fail(error)
    setNewLabel('')
    setMessage({ tone: 'success', text: `Tipo "${label}" agregado.` })
    await onChanged()
  }

  async function reset() {
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.rpc('personal_types_reset_defaults')
    setBusy(false)
    if (error) return fail(error)
    setConfirmReset(false)
    setMessage({ tone: 'success', text: 'Nombres predefinidos restablecidos.' })
    await onChanged()
  }

  const ordered = [...types].sort((a, b) => Number(b.default_key !== null) - Number(a.default_key !== null))

  return (
    <section role="dialog" aria-modal="false" aria-labelledby="tipos-titulo" className={sheetClass}>
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--ax-line)] bg-[var(--ax-surface-raised)] py-2 pl-4 pr-2">
        <h2 id="tipos-titulo" className="min-w-0 flex-1 truncate font-display text-[22px] uppercase leading-none tracking-[.02em] text-[var(--ax-text)]">Tipos de evento</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar tipos de evento" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-[var(--ax-text-secondary)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]">
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
        {message && <p role="status" className={`mb-3 text-sm ${message.tone === 'danger' ? 'text-[var(--ax-danger-text)]' : 'text-[var(--ax-accent-text)]'}`}>{message.text}</p>}

        <ul className="divide-y divide-[var(--ax-line)] rounded-[14px] border border-[var(--ax-line)]">
          {ordered.map((type) => {
            const isDefault = type.default_key !== null
            const draft = drafts[type.id] ?? type.label
            return (
              <li key={type.id} className="space-y-3 px-3 py-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOpenColorFor(openColorFor === type.id ? null : type.id)}
                    aria-label={`Cambiar color de ${type.label}`}
                    aria-expanded={openColorFor === type.id}
                    className="h-7 w-7 shrink-0 cursor-pointer rounded-full border border-[var(--ax-line-strong)]"
                    style={{ background: type.color }}
                  />
                  <input
                    className={`${inputClass} min-w-0 flex-1`}
                    aria-label={`Nombre de ${type.label}`}
                    value={draft}
                    maxLength={40}
                    onChange={(event) => setDrafts({ ...drafts, [type.id]: event.target.value })}
                    onBlur={() => void rename(type)}
                    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
                  />
                  {isDefault
                    ? <span className="shrink-0 rounded-full border border-[var(--ax-line-strong)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ax-muted)]">Predefinido</span>
                    : confirmDeleteFor === type.id ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteFor(null)}>No</Button>
                        <Button size="sm" variant="danger" disabled={busy} onClick={() => void remove(type)}>Borrar</Button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmDeleteFor(type.id)} aria-label={`Borrar ${type.label}`} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-[var(--ax-danger-text)] hover:bg-[var(--ax-danger-soft)]">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    )}
                </div>
                {openColorFor === type.id && <PaletteGrid value={type.color} label={`Color de ${type.label}`} onPick={(color) => void recolor(type, color)} />}
              </li>
            )
          })}
        </ul>

        <div className="mt-6 space-y-3 rounded-[14px] border border-[var(--ax-line)] p-4">
          <FieldLabel>Nuevo tipo</FieldLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={inputClass} placeholder="Ej. Práctica de tiro" maxLength={40} value={newLabel} onChange={(event) => setNewLabel(event.target.value)} aria-label="Nombre del nuevo tipo" />
            <select className={inputClass} value={newCategory} onChange={(event) => setNewCategory(event.target.value as PersonalType['category'])} aria-label="Categoría del nuevo tipo">
              {(Object.keys(categoryLabels) as PersonalType['category'][]).map((key) => <option key={key} value={key}>{categoryLabels[key]}</option>)}
            </select>
          </div>
          <p className="text-xs text-[var(--ax-muted)]">La categoría decide cómo cuenta el evento (filtros, límites y reglas). El nombre lo eliges tú.</p>
          <PaletteGrid value={newColor} label="Color del nuevo tipo" onPick={setNewColor} />
          <div className="flex justify-end">
            <Button variant="primary" icon={Plus} disabled={busy} onClick={() => void add()}>Agregar tipo</Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ax-line)] pt-4">
          {confirmReset ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--ax-text-secondary)]">¿Restablecer los nombres originales de los 5 tipos predefinidos? Tus tipos propios no cambian.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>Cancelar</Button>
                <Button size="sm" variant="danger" disabled={busy} onClick={() => void reset()}>Restablecer</Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" icon={RotateCcw} onClick={() => setConfirmReset(true)}>Restablecer nombres predefinidos</Button>
          )}
        </div>
      </div>
    </section>
  )
}

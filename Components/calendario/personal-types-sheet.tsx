'use client'

import { GripVertical, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { Button, FieldLabel, inputClass } from '../mi-equipo/ui'

export type PersonalType = {
  id: string
  category: 'training' | 'match' | 'meeting' | 'personal' | 'other'
  label: string
  color: string
  default_key: string | null
  sort_order?: number
}

// Paleta fija de 12 colores: se leen bien sobre tema claro y oscuro.
export const palette = ['#b4ff45', '#4ea8ff', '#a78bfa', '#ff9f43', '#ff6b6b', '#2dd4bf', '#facc15', '#f472b6', '#22c55e', '#7dd3fc', '#818cf8', '#94a3b8']

const sheetClass = 'ax-drop-in fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[14px] border border-b-0 border-[var(--ax-line-strong)] bg-[var(--ax-surface)] shadow-[var(--ax-shadow-pop)] sm:inset-x-auto sm:right-6 sm:w-[560px] sm:max-h-[min(80vh,720px)]'

// Tiempo que hay que mantener presionado un tipo para levantarlo y moverlo.
const LONG_PRESS_MS = 350

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

// Hoja para administrar los tipos de evento de la cuenta personal: renombrar, cambiar color, reordenar, agregar y borrar.
// Los predefinidos no se borran; sus nombres se pueden restablecer con confirmación.
export function PersonalTypesSheet({ types, userId, onChanged, onClose }: { types: PersonalType[]; userId: string; onChanged: () => Promise<void>; onClose: () => void }) {
  const [openColorFor, setOpenColorFor] = useState<string | null>(null)
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState(palette[0])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  // Orden mientras se mueve un tipo: la lista local manda hasta que se suelta.
  const [liftedId, setLiftedId] = useState<string | null>(null)
  const [localOrder, setLocalOrder] = useState<string[] | null>(null)
  const liftedRef = useRef<string | null>(null)
  const orderRef = useRef<string[] | null>(null)
  const pressRef = useRef<{ timer: number | null; pointerId: number; startY: number; el: HTMLElement | null }>({ timer: null, pointerId: -1, startY: 0, el: null })
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({})

  const list = localOrder
    ? localOrder.map((id) => types.find((type) => type.id === id)).filter((type): type is PersonalType => Boolean(type))
    : types

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

  async function saveOrder(ids: string[]) {
    if (!supabase) return
    const { error } = await supabase.rpc('personal_types_reorder', { p_ids: ids })
    if (error) return fail(error)
    await onChanged()
  }

  // Mueve un tipo a otra posición de la lista (índice de origen y de destino).
  function moveTo(ids: string[], from: number, to: number) {
    const next = [...ids]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    return next
  }

  function onRowPointerDown(event: ReactPointerEvent<HTMLLIElement>, type: PersonalType) {
    const target = event.target as HTMLElement
    // Los campos y botones de la fila siguen funcionando; solo el asa o el área libre levantan el tipo.
    if (target.closest('input, select, textarea') || (target.closest('button') && !target.closest('[data-grip]'))) return
    const press = pressRef.current
    press.pointerId = event.pointerId
    press.startY = event.clientY
    press.el = event.currentTarget
    press.timer = window.setTimeout(() => {
      liftedRef.current = type.id
      const ids = list.map((item) => item.id)
      orderRef.current = ids
      setLiftedId(type.id)
      setLocalOrder(ids)
      press.el?.setPointerCapture?.(press.pointerId)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(12)
    }, LONG_PRESS_MS)
  }

  function onRowPointerMove(event: ReactPointerEvent<HTMLLIElement>) {
    const press = pressRef.current
    if (!liftedRef.current) {
      // Si se mueve antes de tiempo es un desplazamiento normal: se cancela el levantamiento.
      if (press.timer !== null && Math.abs(event.clientY - press.startY) > 8) {
        window.clearTimeout(press.timer)
        press.timer = null
      }
      return
    }
    event.preventDefault()
    const ids = orderRef.current ?? []
    const from = ids.indexOf(liftedRef.current)
    let to = ids.length - 1
    for (let index = 0; index < ids.length; index += 1) {
      const rect = rowRefs.current[ids[index]]?.getBoundingClientRect()
      if (rect && event.clientY < rect.top + rect.height / 2) { to = index; break }
    }
    if (from >= 0 && to !== from) {
      const next = moveTo(ids, from, to)
      orderRef.current = next
      setLocalOrder(next)
    }
  }

  async function onRowPointerUp() {
    const press = pressRef.current
    if (press.timer !== null) window.clearTimeout(press.timer)
    press.timer = null
    if (!liftedRef.current) return
    const ids = orderRef.current ?? []
    const original = types.map((type) => type.id)
    liftedRef.current = null
    setLiftedId(null)
    if (ids.join() !== original.join()) {
      setBusy(true)
      await saveOrder(ids)
      setBusy(false)
    }
    setLocalOrder(null)
    orderRef.current = null
  }

  // Con teclado: el asa responde a las flechas arriba y abajo.
  async function moveWithKeys(event: ReactKeyboardEvent<HTMLDivElement>, index: number) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const to = event.key === 'ArrowUp' ? index - 1 : index + 1
    if (to < 0 || to >= types.length) return
    const ids = moveTo(types.map((type) => type.id), index, to)
    await saveOrder(ids)
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
    const { error } = await supabase.from('personal_event_types').insert({ user_id: userId, category: 'other', label, color: newColor, sort_order: types.length + 1 })
    setBusy(false)
    if (error) return fail(error)
    setNewLabel('')
    setMessage({ tone: 'success', text: `Etiqueta "${label}" guardada.` })
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
        <p className="mb-3 text-xs text-[var(--ax-muted)]">Mantén presionado un tipo y muévelo para cambiar su lugar. Así también se ordenan los filtros del calendario.</p>

        <ul className="divide-y divide-[var(--ax-line)] rounded-[14px] border border-[var(--ax-line)]">
          {list.map((type, index) => {
            const isDefault = type.default_key !== null
            const draft = drafts[type.id] ?? type.label
            const lifted = liftedId === type.id
            return (
              <li
                key={type.id}
                ref={(el) => { rowRefs.current[type.id] = el }}
                onPointerDown={(event) => onRowPointerDown(event, type)}
                onPointerMove={onRowPointerMove}
                onPointerUp={() => void onRowPointerUp()}
                onPointerCancel={() => void onRowPointerUp()}
                className={`space-y-3 px-3 py-3 transition-[transform,box-shadow,background-color] duration-150 select-none ${lifted ? 'relative z-10 scale-[1.02] rounded-[10px] bg-[var(--ax-surface-raised)] shadow-[var(--ax-shadow-pop)]' : ''}`}
                style={{ touchAction: lifted ? 'none' : 'pan-y', WebkitTouchCallout: 'none' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    data-grip
                    role="button"
                    tabIndex={0}
                    aria-label={`Mover ${type.label}. Usa las flechas arriba y abajo.`}
                    onKeyDown={(event) => void moveWithKeys(event, index)}
                    className="flex h-9 w-6 shrink-0 cursor-grab items-center justify-center text-[var(--ax-muted)] focus-visible:outline-none focus-visible:text-[var(--ax-text)]"
                  >
                    <GripVertical size={18} aria-hidden="true" />
                  </div>
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
          <FieldLabel>Nueva etiqueta</FieldLabel>
          <input
            className={inputClass}
            placeholder="Ej. Práctica de tiro"
            maxLength={40}
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void add() } }}
            aria-label="Nombre de la nueva etiqueta"
          />
          <PaletteGrid value={newColor} label="Color del nuevo tipo" onPick={setNewColor} />
          <div className="flex justify-end">
            <Button variant="primary" icon={Plus} disabled={busy} onClick={() => void add()}>Guardar etiqueta</Button>
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

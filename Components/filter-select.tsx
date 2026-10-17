'use client'

import { Check, ChevronDown, Search } from 'lucide-react'
import { createPortal } from 'react-dom'
import { CSSProperties, KeyboardEvent, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'

const CLOSE_MS = 180

export type FilterOption = { value: string; label: string }

type FilterSelectProps = {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}

const SEARCH_THRESHOLD = 8
const VIEWPORT_MARGIN = 16
const MAX_LIST_HEIGHT = 360

// Lista desplegable que se dibuja en <body>, así nunca queda recortada por el panel de filtros.
// Se abre hacia arriba si no hay espacio abajo y tiene búsqueda interna cuando hay muchas opciones.
export function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [listStyle, setListStyle] = useState<CSSProperties>({})
  // La lista permanece montada un instante al cerrarse para poder animar la salida.
  const [present, setPresent] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const selected = options.find((option) => option.value === value)
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return normalized ? options.filter((option) => option.label.toLowerCase().includes(normalized)) : options
  }, [options, query])

  function measure() {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN
    const spaceAbove = rect.top - VIEWPORT_MARGIN
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow
    const available = openUp ? spaceAbove : spaceBelow
    const maxHeight = Math.max(180, Math.min(MAX_LIST_HEIGHT, available))
    setListStyle({
      left: rect.left,
      width: rect.width,
      maxHeight,
      ...(openUp ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
    })
  }

  function openList() {
    measure()
    setPresent(true)
    setQuery('')
    setActive(Math.max(0, options.findIndex((option) => option.value === value)))
    setOpen(true)
  }

  function choose(nextValue: string) {
    onChange(nextValue)
    setOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (open) {
      setPresent(true)
      return
    }
    const timer = window.setTimeout(() => setPresent(false), CLOSE_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    measure()
    function onScroll(event: Event) {
      if (listRef.current?.contains(event.target as Node)) return
      measure()
    }
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', onScroll, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    if (searchRef.current) searchRef.current.focus()
    else listRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      if (!open) openList()
    }
  }

  function onListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => Math.min(filtered.length - 1, current + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => Math.max(0, current - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = filtered[active]
      if (option) choose(option.value)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }
  }

  return <div className="flex flex-col gap-2">
    <span id={`${id}-label`} className="font-body text-xs tracking-[1.2px] text-[#91a8ba]">{label}</span>
    <button
      ref={triggerRef}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={`${id}-list`}
      aria-labelledby={`${id}-label`}
      onClick={() => (open ? setOpen(false) : openList())}
      onKeyDown={onTriggerKeyDown}
      className={`flex h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border bg-[#102536] px-4 text-left font-body text-sm font-semibold text-[#e8eef3] transition-all duration-300 hover:border-[#b4ff45]/70 focus:outline-none focus-visible:border-[#b4ff45] ${open ? 'border-[#b4ff45] shadow-[0_0_0_4px_rgba(180,255,69,.12)]' : 'border-[#29485d]'}`}
    >
      <span className="truncate">{selected?.label ?? 'Seleccionar'}</span>
      <ChevronDown size={16} className={`shrink-0 text-[#91a8ba] transition-transform duration-300 ${open ? 'rotate-180 text-[#b4ff45]' : ''}`} />
    </button>

    {present && createPortal(
      <div
        ref={listRef}
        tabIndex={-1}
        onKeyDown={onListKeyDown}
        className={`${open ? 'ax-drop-in' : 'ax-drop-out pointer-events-none'} fixed z-[90] flex origin-top flex-col overflow-hidden rounded-2xl border border-[#31556b] bg-[#0b1d2c] shadow-2xl outline-none`}
        style={listStyle}
      >
        {options.length > SEARCH_THRESHOLD && (
          <div className="shrink-0 border-b border-[#1f4057] p-2">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#91a8ba]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => { setQuery(event.target.value); setActive(0) }}
                placeholder="Buscar..."
                aria-label={`Buscar en ${label}`}
                className="h-9 w-full rounded-lg border border-[#29485d] bg-[#102536] pl-9 pr-3 font-body text-sm text-[#e8eef3] outline-none placeholder:text-[#91a8ba] focus:border-[#b4ff45]"
              />
            </div>
          </div>
        )}
        <div id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
          {filtered.map((option, index) => {
            const isSelected = option.value === value
            const isActive = index === active
            return <button
              key={option.value}
              type="button"
              style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
              role="option"
              aria-selected={isSelected}
              data-active={isActive}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(option.value)}
              className={`ax-option-in flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left font-body text-sm transition-colors duration-150 ${isActive ? 'bg-white/[.07] text-white' : 'text-[#c9d6e0]'} ${isSelected ? 'font-semibold text-[#b4ff45]' : ''}`}
            >
              <span className="truncate">{option.label}</span>
              {isSelected && <Check size={15} className="shrink-0" />}
            </button>
          })}
          {!filtered.length && <p className="px-3 py-4 text-center font-body text-sm text-[#91a8ba]">Sin resultados</p>}
        </div>
      </div>,
      document.body,
    )}
  </div>
}

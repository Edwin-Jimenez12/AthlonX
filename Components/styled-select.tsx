'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

export type StyledSelectOption = { value: string; label: string }

type StyledSelectProps = {
  label: string
  value: string
  options: StyledSelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  variant?: 'dark' | 'light'
}

export function StyledSelect({ label, value, options, onChange, placeholder = 'Seleccionar', disabled = false, required = false, variant = 'dark' }: StyledSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const selectedOption = options.find((option) => option.value === value)
  const dark = variant === 'dark'

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  function selectOption(nextValue: string) {
    onChange(nextValue)
    setOpen(false)
  }

  return <div ref={containerRef} className="relative min-w-0">
    <label className={`block text-sm font-bold ${dark ? 'text-slate-200' : 'text-[#17212b]'}`}>
      {label}
      <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={listboxId} onClick={() => setOpen((current) => !current)} className={`mt-2 flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-[5px] border px-4 py-3 text-left text-sm font-semibold outline-none transition focus:border-[#b4ff45] disabled:cursor-not-allowed disabled:opacity-50 ${dark ? 'border-white/15 bg-[#0d2232] text-white hover:border-[#b4ff45]/70' : 'border-slate-300 bg-white text-[#17212b] hover:border-[#70b719]'}`}>
        <span className={selectedOption ? '' : dark ? 'text-slate-500' : 'text-slate-400'}>{selectedOption?.label || placeholder}</span>
        <ChevronDown size={17} className={`shrink-0 transition ${open ? 'rotate-180 text-[#b4ff45]' : dark ? 'text-slate-400' : 'text-slate-500'}`} />
      </button>
    </label>
    {required && <input tabIndex={-1} aria-hidden="true" required value={value} onChange={() => undefined} className="pointer-events-none absolute h-px w-px opacity-0" />}
    {open && !disabled && <div id={listboxId} role="listbox" aria-label={label} className={`absolute left-0 right-0 z-[70] mt-2 max-h-64 overflow-y-auto rounded-[5px] border p-1 shadow-2xl backdrop-blur-xl ${dark ? 'border-[#31556b] bg-[#0a1722]/[.98]' : 'border-slate-300 bg-white'}`}>
      {options.length ? options.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => selectOption(option.value)} className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-[5px] px-3 py-2.5 text-left text-sm transition ${option.value === value ? dark ? 'bg-[#b4ff45] font-bold text-[#07131e]' : 'bg-[#b4ff45] font-bold text-[#07131e]' : dark ? 'text-slate-200 hover:bg-white/10 hover:text-white' : 'text-[#17212b] hover:bg-slate-100'}`}>
        <span>{option.label}</span>{option.value === value && <Check size={15} />}
      </button>) : <p className={`px-3 py-3 text-sm ${dark ? 'text-slate-500' : 'text-slate-400'}`}>No hay opciones disponibles</p>}
    </div>}
  </div>
}

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useRegisterSettingsNav } from '../settings-nav'
import { ArrowLeft, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, ShieldCheck, SlidersHorizontal, UserCog, UserRound, Users, Circle } from 'lucide-react'
import * as Flags from 'country-flag-icons/react/3x2'
import type { Country, Theme } from '../../lib/mi-perfil'
import { formatPanamaNumber, joinPhone, parsePhone, phoneError, plainPhoneNumber } from '../../lib/mi-perfil'

// Tokens tomados de los frames "Oscuro" de Figma (Mi perfil).
const darkTokens: Record<string, string> = {
  '--mp-bg': '#07131E',
  '--mp-surface': '#0B1D2C',
  '--mp-raised': '#102536',
  '--mp-line': '#29485D',
  '--mp-text': '#E8EEF3',
  '--mp-muted': '#91A8BA',
  '--mp-lime': '#B4FF45',
  '--mp-lime-soft': '#17290F',
  '--mp-on-lime': '#07131E',
  '--mp-danger': '#FF6B6B',
  '--mp-danger-soft': '#2A1216',
}

// Tokens del tema claro: aproximación pendiente de validar con el frame "Claro" de Figma.
const lightTokens: Record<string, string> = {
  '--mp-bg': '#F3F6F8',
  '--mp-surface': '#FFFFFF',
  '--mp-raised': '#EEF3F6',
  '--mp-line': '#D5E0E8',
  '--mp-text': '#081522',
  '--mp-muted': '#5B7185',
  '--mp-lime': '#4C8500',
  '--mp-lime-soft': '#E9FBD0',
  '--mp-on-lime': '#FFFFFF',
  '--mp-danger': '#C23B3B',
  '--mp-danger-soft': '#FBE9E9',
}

export function themeStyle(theme: Theme): CSSProperties {
  return (theme === 'claro' ? lightTokens : darkTokens) as CSSProperties
}

export const labelClass = 'text-[11px] font-semibold uppercase tracking-[0.88px] text-[var(--mp-muted)]'
export const primaryButtonClass = 'cursor-pointer rounded-full bg-[var(--mp-lime)] px-[22px] py-3 text-[15px] font-semibold text-[var(--mp-on-lime)] transition disabled:cursor-not-allowed disabled:opacity-50'
export const outlineButtonClass = 'cursor-pointer rounded-full border border-[var(--mp-line)] px-[22px] py-3 text-[15px] font-semibold text-[var(--mp-text)] transition hover:border-[var(--mp-lime)] disabled:cursor-not-allowed disabled:opacity-50'
export const dangerButtonClass = 'cursor-pointer rounded-full bg-[var(--mp-danger)] px-[22px] py-3 text-[15px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50'
export const dangerOutlineButtonClass = 'cursor-pointer rounded-full border border-[var(--mp-danger)] px-[22px] py-3 text-[15px] font-semibold text-[var(--mp-danger)] transition disabled:cursor-not-allowed disabled:opacity-50'

export type SectionItem = { id: string; label: string; description?: string }

export type Notice = { type: 'ok' | 'error'; text: string }

export function Shell({
  theme,
  sectionLabel,
  sections,
  activeSection,
  onSection,
  children,
  notice,
  publicProfileHref,
  unsaved = false,
  onSaveChanges,
  onDiscardChanges,
}: {
  theme: Theme
  notice?: Notice | null
  publicProfileHref?: string | null
  unsaved?: boolean
  onSaveChanges?: () => Promise<string>
  onDiscardChanges?: () => void
  sectionLabel: string
  sections: SectionItem[]
  activeSection: string
  onSection: (id: string) => void
  children: ReactNode
}) {
  const router = useRouter()
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [leaveError, setLeaveError] = useState('')
  const [leaveBusy, setLeaveBusy] = useState(false)

  useRegisterSettingsNav(sections, activeSection, onSection)

  useEffect(() => {
    if (!unsaved) return
    function warnBeforeClose(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeClose)
    return () => window.removeEventListener('beforeunload', warnBeforeClose)
  }, [unsaved])

  function guardNavigation(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!unsaved) return
    event.preventDefault()
    setLeaveError('')
    setPendingHref(href)
  }

  async function saveAndLeave() {
    if (!onSaveChanges || !pendingHref) return
    setLeaveBusy(true)
    const failure = await onSaveChanges()
    setLeaveBusy(false)
    if (failure) return setLeaveError(failure)
    const href = pendingHref
    setPendingHref(null)
    router.push(href)
  }

  function discardAndLeave() {
    const href = pendingHref
    onDiscardChanges?.()
    setPendingHref(null)
    if (href) router.push(href)
  }

  return (
    <div style={{ ...themeStyle(theme), colorScheme: theme === 'claro' ? 'light' : 'dark' } as CSSProperties} className="min-h-screen text-[var(--mp-text)]">

      {pendingHref && (
        <div role="dialog" aria-modal="true" aria-labelledby="unsaved-changes-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5">
          <div className="w-full max-w-[460px] rounded-[24px] border border-[var(--mp-line)] bg-[var(--mp-surface)] p-7 text-[var(--mp-text)] shadow-2xl">
            <h2 id="unsaved-changes-title" className="font-heading text-3xl font-semibold uppercase">Cambios sin guardar</h2>
            <p className="mt-3 text-[15px] text-[var(--mp-muted)]">Hiciste cambios en este perfil. ¿Deseas guardarlos o descartarlos antes de salir?</p>
            {leaveError && <p className="mt-4 rounded-[12px] border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{leaveError}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setPendingHref(null)} disabled={leaveBusy} className={`${outlineButtonClass} disabled:opacity-60`}>Seguir editando</button>
              <button type="button" onClick={discardAndLeave} disabled={leaveBusy} className="rounded-full border border-red-400/40 px-5 py-3 text-[15px] font-semibold text-red-200 transition hover:bg-red-500/10 disabled:opacity-60">Descartar</button>
              <button type="button" onClick={saveAndLeave} disabled={leaveBusy} className="rounded-full bg-[var(--mp-lime)] px-5 py-3 text-[15px] font-semibold text-[var(--mp-on-lime)] transition hover:brightness-110 disabled:opacity-60">{leaveBusy ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col lg:ml-64">
        <header className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-10 lg:py-[22px]">        <div className="flex flex-wrap items-center gap-4">
          <Link href="/busqueda" onClick={(event) => guardNavigation(event, '/busqueda')} className={`${outlineButtonClass} inline-flex items-center gap-2`}>
            <ArrowLeft size={16} aria-hidden="true" />
            Volver
          </Link>
          {publicProfileHref ? (
            <Link href={publicProfileHref} onClick={(event) => guardNavigation(event, publicProfileHref)} className="rounded-full border border-[var(--mp-line)] px-[22px] py-3 text-[15px] font-semibold text-[var(--mp-text)] transition hover:border-[var(--mp-lime)] hover:text-[var(--mp-lime)]">
              Ver perfil público
            </Link>
          ) : (
            <span title="Perfil público no disponible" className="cursor-not-allowed rounded-full border border-[var(--mp-line)] px-[22px] py-3 text-[15px] font-semibold text-[var(--mp-text)] opacity-60">
              Ver perfil público
            </span>
          )}
        </div>
        </header>
        <div className="flex min-w-0 flex-1 flex-col gap-5 p-5 lg:p-10">
          {notice && (
            <p role="status" className={`rounded-[12px] border px-4 py-3 text-[14px] ${notice.type === 'error' ? 'border-[var(--mp-danger)] text-[var(--mp-danger)]' : 'border-[var(--mp-lime)] text-[var(--mp-lime)]'}`}>
              {notice.text}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}

export function Hero({
  initials,
  kindLabel,
  title,
  code,
  chips,
  canEdit = true,
  editing,
  saving = false,
  onEdit,
  onSave,
  onCancel,
}: {
  initials: string
  kindLabel: string
  title: string
  code?: string
  chips?: ReactNode
  canEdit?: boolean
  editing: boolean
  saving?: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <section className="flex flex-col gap-7 rounded-[20px] border border-[var(--mp-line)] bg-[var(--mp-surface)] p-7 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[48px] bg-[var(--mp-lime)] font-heading text-[35px] font-bold text-[var(--mp-on-lime)]">
          {initials || 'AX'}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-[12px] font-semibold uppercase tracking-[1.44px] text-[var(--mp-lime)]">{kindLabel}</p>
          <h1 className="break-words font-heading text-[40px] font-bold uppercase leading-[1.05] lg:text-[56px]">{title}</h1>
          {code && (
            <div className="flex items-center gap-2.5 text-[15px] text-[var(--mp-muted)]">
              <span>{code}</span>
              <CopyCodeButton value={code} label="Copiar código AthlonX" />
            </div>
          )}
          {chips && <div className="flex flex-wrap gap-2">{chips}</div>}
        </div>
      </div>
      {canEdit && (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {editing && (
            <button type="button" onClick={onCancel} disabled={saving} className={outlineButtonClass}>
              Cancelar
            </button>
          )}
          <button type="button" onClick={editing ? onSave : onEdit} disabled={saving} className={primaryButtonClass}>
            {editing ? (saving ? 'Guardando…' : 'Guardar cambios') : 'Editar información'}
          </button>
        </div>
      )}
    </section>
  )
}

export function Card({ title, description, children, tone = 'default' }: { title: string; description?: string; children: ReactNode; tone?: 'default' | 'danger' }) {
  const danger = tone === 'danger'
  return (
    <section className={`flex flex-col gap-[18px] rounded-[20px] border p-7 ${danger ? 'border-[var(--mp-danger)] bg-[var(--mp-danger-soft)]' : 'border-[var(--mp-line)] bg-[var(--mp-surface)]'}`}>
      <div className="flex flex-col gap-1.5">
        <h2 className={`font-heading text-[24px] font-bold uppercase leading-tight ${danger ? 'text-[var(--mp-danger)]' : 'text-[var(--mp-text)]'}`}>{title}</h2>
        {description && <p className="text-[14px] text-[var(--mp-muted)]">{description}</p>}
      </div>
      {children}
    </section>
  )
}

const inputClass = 'w-full rounded-[12px] border border-[var(--mp-line)] bg-[var(--mp-raised)] px-4 py-3 text-[15px] text-[var(--mp-text)] outline-none placeholder:text-[var(--mp-muted)] focus:border-[var(--mp-lime)] disabled:cursor-default disabled:opacity-100'

export function Field({
  label,
  value,
  onChange,
  disabled = false,
  type = 'text',
  maxLength,
  hint,
  placeholder,
  as = 'input',
  autoComplete,
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  disabled?: boolean
  type?: string
  maxLength?: number
  hint?: string
  placeholder?: string
  as?: 'input' | 'textarea'
  autoComplete?: string
}) {
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  return (
    <label className="flex w-full flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      {as === 'textarea' ? (
        <textarea className={`${inputClass} min-h-[120px] resize-y`} value={value} disabled={disabled} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange?.(event.target.value)} />
      ) : (
        <div className="relative">
          <input
            className={`${inputClass} ${isPassword ? 'pr-12' : ''}`}
            type={isPassword && revealed ? 'text' : type}
            value={value}
            disabled={disabled}
            maxLength={maxLength}
            placeholder={placeholder}
            autoComplete={autoComplete}
            onChange={(event) => onChange?.(event.target.value)}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setRevealed((current) => !current)}
              aria-label={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[8px] text-[var(--mp-muted)] transition hover:text-[var(--mp-text)]"
            >
              {revealed ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          )}
        </div>
      )}
      {hint && <span className="text-[12px] text-[var(--mp-muted)]">{hint}</span>}
    </label>
  )
}

export function SelectField({ label, value, onChange, disabled = false, options }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; options: Array<{ value: string; label: string }> }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="flex w-full flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <div ref={wrapperRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className={`flex w-full items-center justify-between gap-3 rounded-[12px] border bg-[var(--mp-raised)] px-4 py-3 text-left text-[15px] text-[var(--mp-text)] outline-none transition disabled:cursor-default disabled:opacity-100 ${open ? 'border-[var(--mp-lime)]' : 'border-[var(--mp-line)]'} ${disabled ? '' : 'cursor-pointer hover:border-[var(--mp-lime)]'}`}
        >
          <span className={`min-w-0 truncate ${selected ? '' : 'text-[var(--mp-muted)]'}`}>{selected?.label ?? 'Seleccionar'}</span>
          {!disabled && <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-[var(--mp-muted)] transition ${open ? 'rotate-180' : ''}`} />}
        </button>
        {open && (
          <ul role="listbox" className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-72 overflow-auto rounded-[14px] border border-[var(--mp-line)] bg-[var(--mp-surface)] p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
            {options.map((option) => {
              const active = option.value === value
              return (
                <li key={option.value || 'none'} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-[9px] px-3 py-2.5 text-left text-[15px] transition ${active ? 'bg-[var(--mp-lime-soft)] font-semibold text-[var(--mp-lime)]' : 'text-[var(--mp-text)] hover:bg-[var(--mp-raised)]'}`}
                  >
                    {option.label}
                    {active && <Check size={16} aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const weekdayShort = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']
const isoPattern = /^\d{4}-\d{2}-\d{2}$/

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

function partsOf(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month: month - 1, day }
}

// Selector de fecha con el estilo de AthlonX (reemplaza el calendario nativo del navegador).
export function DateField({ label, value, onChange, disabled = false, hint, min = '1900-01-01', max }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; hint?: string; min?: string; max?: string }) {
  const today = todayIso()
  const maxIso = max ?? today
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'days' | 'years'>('days')
  const [viewYear, setViewYear] = useState(() => partsOf(maxIso).year)
  const [viewMonth, setViewMonth] = useState(() => partsOf(maxIso).month)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const yearListRef = useRef<HTMLDivElement>(null)

  const valid = isoPattern.test(value)
  const selected = valid ? partsOf(value) : null
  const displayValue = selected ? `${pad2(selected.day)}/${pad2(selected.month + 1)}/${selected.year}` : ''
  const minParts = partsOf(min)
  const maxParts = partsOf(maxIso)
  const monthIndex = viewYear * 12 + viewMonth
  const prevDisabled = monthIndex <= minParts.year * 12 + minParts.month
  const nextDisabled = monthIndex >= maxParts.year * 12 + maxParts.month

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (open && view === 'years') yearListRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'center' })
  }, [open, view])

  function openPanel() {
    const base = selected ?? maxParts
    setViewYear(base.year)
    setViewMonth(base.month)
    setView('days')
    setOpen(true)
  }

  function shiftMonth(delta: number) {
    const next = monthIndex + delta
    setViewYear(Math.floor(next / 12))
    setViewMonth(next % 12)
  }

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: Array<number | null> = [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)]
  while (cells.length % 7 !== 0) cells.push(null)
  const years = Array.from({ length: maxParts.year - minParts.year + 1 }, (_, index) => maxParts.year - index)

  function isoOf(day: number) {
    return `${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`
  }

  function pick(iso: string) {
    onChange(iso)
    setOpen(false)
  }

  const todayAllowed = today >= min && today <= maxIso

  return (
    <div className="flex w-full flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <div ref={wrapperRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => (open ? setOpen(false) : openPanel())}
          className={`flex w-full items-center justify-between gap-3 rounded-[12px] border bg-[var(--mp-raised)] px-4 py-3 text-left text-[15px] text-[var(--mp-text)] outline-none transition disabled:cursor-default disabled:opacity-100 ${open ? 'border-[var(--mp-lime)]' : 'border-[var(--mp-line)]'} ${disabled ? '' : 'cursor-pointer hover:border-[var(--mp-lime)]'}`}
        >
          <span className={`min-w-0 truncate ${displayValue ? '' : 'text-[var(--mp-muted)]'}`}>{displayValue || 'Selecciona una fecha'}</span>
          {!disabled && <CalendarDays size={18} aria-hidden="true" className="shrink-0 text-[var(--mp-muted)]" />}
        </button>

        {open && (
          <div role="dialog" aria-label={label} className="absolute left-0 top-full z-40 mt-1.5 w-[300px] max-w-[calc(100vw-2rem)] rounded-[14px] border border-[var(--mp-line)] bg-[var(--mp-surface)] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                disabled={prevDisabled || view === 'years'}
                aria-label="Mes anterior"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[var(--mp-text)] transition hover:bg-[var(--mp-raised)] hover:text-[var(--mp-lime)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setView((current) => (current === 'days' ? 'years' : 'days'))}
                className="flex cursor-pointer items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[15px] font-semibold capitalize text-[var(--mp-text)] transition hover:bg-[var(--mp-raised)]"
              >
                {view === 'days' ? `${monthNames[viewMonth]} ${viewYear}` : 'Seleccionar año'}
                <ChevronDown size={15} aria-hidden="true" className={`text-[var(--mp-lime)] transition ${view === 'years' ? 'rotate-180' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                disabled={nextDisabled || view === 'years'}
                aria-label="Mes siguiente"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[var(--mp-text)] transition hover:bg-[var(--mp-raised)] hover:text-[var(--mp-lime)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>

            {view === 'days' ? (
              <>
                <div className="grid grid-cols-7 gap-1 pb-2">
                  {weekdayShort.map((day) => (
                    <span key={day} className="text-center text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--mp-muted)]">{day}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((day, index) => {
                    if (day === null) return <span key={`empty-${index}`} />
                    const iso = isoOf(day)
                    const isSelected = iso === value
                    const isToday = iso === today
                    const outOfRange = iso < min || iso > maxIso
                    return (
                      <button
                        key={iso}
                        type="button"
                        disabled={outOfRange}
                        onClick={() => pick(iso)}
                        aria-pressed={isSelected}
                        className={`mx-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[14px] transition disabled:cursor-not-allowed disabled:opacity-30 ${isSelected ? 'bg-[var(--mp-lime)] font-bold text-[var(--mp-on-lime)]' : isToday ? 'border border-[var(--mp-lime)] text-[var(--mp-lime)] hover:bg-[var(--mp-lime-soft)]' : 'text-[var(--mp-text)] hover:bg-[var(--mp-raised)]'}`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <div ref={yearListRef} className="grid max-h-64 grid-cols-4 gap-1.5 overflow-y-auto pr-1">
                {years.map((year) => {
                  const active = year === viewYear
                  return (
                    <button
                      key={year}
                      type="button"
                      data-active={active}
                      onClick={() => {
                        setViewYear(year)
                        setView('days')
                      }}
                      className={`cursor-pointer rounded-[9px] py-2 text-[14px] transition ${active ? 'bg-[var(--mp-lime)] font-bold text-[var(--mp-on-lime)]' : 'text-[var(--mp-text)] hover:bg-[var(--mp-raised)]'}`}
                    >
                      {year}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-[var(--mp-line)] pt-3">
              <button type="button" onClick={() => pick('')} className="cursor-pointer rounded-[8px] px-3 py-1.5 text-[14px] font-semibold text-[var(--mp-muted)] transition hover:text-[var(--mp-text)]">Borrar</button>
              <button
                type="button"
                disabled={!todayAllowed}
                onClick={() => pick(today)}
                className="cursor-pointer rounded-[8px] px-3 py-1.5 text-[14px] font-semibold text-[var(--mp-lime)] transition hover:bg-[var(--mp-lime-soft)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Hoy
              </button>
            </div>
          </div>
        )}
      </div>
      {hint && <span className="text-xs text-[var(--mp-muted)]">{hint}</span>}
    </div>
  )
}

// Bandera ISO 3166-1 alpha-2 desde country-flag-icons; si el código no existe en la librería no se muestra nada.
export function CountryFlag({ flagCode, name }: { flagCode: string; name: string }) {
  const key = flagCode.toUpperCase() as keyof typeof Flags
  const Flag = Flags[key]
  if (!Flag) return null
  return <Flag title={`Bandera de ${name}`} className="h-[18px] w-[27px] shrink-0 rounded-[3px]" />
}

export function PhoneField({ label, value, onChange, disabled = false, countries }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; countries: Country[] }) {
  const parts = parsePhone(value)
  const registered = parts.code ? countries.find((country) => country.dialCode === parts.code) : undefined
  const unknownCode = parts.code !== '' && !registered
  const missingCode = phoneError(value)

  // Panamá usa formato 6509-4159; los demás países se escriben solo con dígitos.
  function formatFor(code: string, raw: string) {
    const match = countries.find((country) => country.dialCode === code)
    return match?.code === 'PA' ? formatPanamaNumber(raw) : plainPhoneNumber(raw)
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <div className="flex items-stretch gap-2">
        <div className={`flex shrink-0 items-center gap-2 rounded-[12px] border bg-[var(--mp-raised)] px-3 ${unknownCode || missingCode ? 'border-[var(--mp-danger)]' : 'border-[var(--mp-line)]'}`}>
          <span className="text-[15px] text-[var(--mp-muted)]">+</span>
          <input
            inputMode="numeric"
            aria-label="Código de país"
            className="w-12 bg-transparent py-3 text-[15px] text-[var(--mp-text)] outline-none disabled:cursor-default disabled:opacity-100"
            value={parts.code}
            disabled={disabled}
            placeholder="507"
            maxLength={4}
            required
            aria-required="true"
            onChange={(event) => {
              const code = event.target.value.replace(/\D/g, '').slice(0, 4)
              // Sin código no hay número: al borrar el código se limpia el número.
              onChange(code ? joinPhone(code, formatFor(code, parts.number)) : '')
            }}
          />
          {registered && <CountryFlag flagCode={registered.flagCode} name={registered.name} />}
        </div>
        <input
          inputMode="tel"
          aria-label="Número de teléfono"
          className={`${inputClass} min-w-0 flex-1`}
          value={parts.number}
          disabled={disabled || !parts.code}
          placeholder={parts.code ? (registered?.code === 'PA' ? '6000-0000' : 'Número') : 'Primero el código de país'}
          onChange={(event) => onChange(joinPhone(parts.code, formatFor(parts.code, event.target.value)))}
        />
      </div>
      {missingCode && <span role="alert" className="text-[12px] text-[var(--mp-danger)]">{missingCode}</span>}
      {!missingCode && unknownCode && (
        <span role="alert" className="text-[12px] text-[var(--mp-danger)]">Número de país no registrado en AthlonX.</span>
      )}
    </div>
  )
}

export function CopyCodeButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Código copiado' : label}
      title={copied ? 'Copiado' : label}
      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-[var(--mp-line)] bg-[var(--mp-raised)] transition hover:border-[var(--mp-lime)]"
    >
      <span className="relative block h-4 w-4" aria-hidden="true">
        <span className="absolute left-[5px] top-0 h-2.5 w-2.5 rounded-[2px] border-[1.6px] border-[var(--mp-lime)]" />
        <span className="absolute left-0 top-[5px] h-2.5 w-2.5 rounded-[2px] border-[1.6px] border-[var(--mp-lime)] bg-[var(--mp-raised)]" />
      </span>
    </button>
  )
}

export function ReadValue({ label, value, copyable = false, hint }: { label: string; value: string; copyable?: boolean; hint?: string }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <div className="flex min-h-[46px] items-center justify-between gap-3 rounded-[12px] border border-[var(--mp-line)] bg-[var(--mp-raised)] px-4 py-3">
        <span className="min-w-0 break-words text-[15px] text-[var(--mp-text)]">{value || 'Pendiente'}</span>
        {copyable && value && <CopyCodeButton value={value} label={`Copiar ${label.toLowerCase()}`} />}
      </div>
      {hint && <span className="text-[12px] text-[var(--mp-muted)]">{hint}</span>}
    </div>
  )
}

export function Chip({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'lime' }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-semibold ${tone === 'lime' ? 'border-[var(--mp-lime)] bg-[var(--mp-lime-soft)] text-[var(--mp-lime)]' : 'border-[var(--mp-line)] text-[var(--mp-text)]'}`}>
      {children}
    </span>
  )
}

export function Toggle({ label, description, checked, onChange, disabled = false }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center justify-between gap-4 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold">{label}</span>
        {description && <span className="block text-[12px] text-[var(--mp-muted)]">{description}</span>}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full border transition ${checked ? 'border-[var(--mp-lime)] bg-[var(--mp-lime)]' : 'border-[var(--mp-line)] bg-[var(--mp-raised)]'}`}>
        <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full transition ${checked ? 'left-[23px] bg-[var(--mp-on-lime)]' : 'left-[3px] bg-[var(--mp-muted)]'}`} />
      </span>
    </label>
  )
}

export function Segmented<T extends string>({ options, value, onChange, disabled = false }: { options: Array<{ value: T; label: string }>; value: T; onChange: (value: T) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" className="inline-flex gap-[2px] rounded-[12px] border border-[var(--mp-line)] bg-[var(--mp-raised)] p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer rounded-[9px] px-3 py-[7px] text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${active ? 'bg-[var(--mp-lime)] text-[var(--mp-on-lime)]' : 'text-[var(--mp-muted)]'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function SettingRow({ title, description, right }: { title: string; description?: string; right: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">{title}</p>
        {description && <p className="text-[12px] text-[var(--mp-muted)]">{description}</p>}
      </div>
      {right}
    </div>
  )
}

export function ListRow({ initials, title, meta, right }: { initials?: string; title: string; meta?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[14px] border border-[var(--mp-line)] bg-[var(--mp-raised)] p-4">
      {initials && (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--mp-lime)] font-heading text-[17px] font-bold text-[var(--mp-on-lime)]">{initials}</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{title}</p>
        {meta && <p className="text-[13px] text-[var(--mp-muted)]">{meta}</p>}
      </div>
      {right}
    </div>
  )
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  busy = false,
  error,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  danger?: boolean
  busy?: boolean
  error?: string
  onConfirm: () => void
  onCancel: () => void
  children?: ReactNode
}) {
  return (
    <Modal open={open} onClose={busy ? () => undefined : onCancel}>
      <div className="flex flex-col gap-5">
        <h2 className="font-heading text-[28px] font-bold uppercase leading-tight">{title}</h2>
        {description && <p className="text-[15px] text-[var(--mp-muted)]">{description}</p>}
        {children}
        {error && <p role="alert" className="text-[14px] text-[var(--mp-danger)]">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className={outlineButtonClass}>Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={danger ? dangerButtonClass : primaryButtonClass}>
            {busy ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function Pending({ children }: { children: ReactNode }) {
  return <p className="rounded-[12px] border border-dashed border-[var(--mp-line)] px-4 py-3 text-[14px] text-[var(--mp-muted)]">{children}</p>
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,19,30,0.9)] p-5">
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-[520px] rounded-[20px] border border-[var(--mp-line)] bg-[var(--mp-surface)] p-8 text-[var(--mp-text)]">
        {children}
      </div>
    </div>
  )
}

export function Avatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--mp-lime)] font-heading text-[17px] font-bold text-[var(--mp-on-lime)]">{initials}</div>
  )
}

export function initialsOf(text: string) {
  return text.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

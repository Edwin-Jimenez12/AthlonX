'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, Info, Lock, Pencil, Search } from 'lucide-react'
import * as Flags from 'country-flag-icons/react/3x2'
import { useRegisterSettingsNav } from '../settings-nav'
import { Badge, Button, Notice as InlineNotice, Segment, Select, cx, inputClass, useDismiss } from '../mi-equipo/ui'
import type { Country } from '../../lib/mi-perfil'
import type { CountryCode } from 'libphonenumber-js'
import { formatNational, joinPhone, phoneCountries, phoneError, splitPhone } from '../../lib/phone'

// Piezas de Mi perfil con el lenguaje del rediseño (página "Claude" en Figma, desde y≈24 000).
// Usan solo tokens --ax-* dentro de .ax-v2, así que siguen el tema claro u oscuro del panel.

export type SectionItem = { id: string; label: string; description?: string; icon?: LucideIcon }

export type Notice = { type: 'ok' | 'error'; text: string }

// Contenedor de Mi perfil: registra las secciones en la barra lateral, muestra pestañas en tablet y móvil,
// y la barra de cambios fija abajo mientras se edita. "Volver al panel" con cambios pendientes no navega:
// la barra pasa a aviso con "Seguir editando", "Descartar" y "Guardar y salir".
export function Shell({
  navTitle,
  sections,
  activeSection,
  onSection,
  hero,
  children,
  notice,
  editing = false,
  unsaved = false,
  saving = false,
  saveError = '',
  onSave,
  onDiscard,
}: {
  navTitle: string
  sections: SectionItem[]
  activeSection: string
  onSection: (id: string) => void
  hero: ReactNode
  children: ReactNode
  notice?: Notice | null
  editing?: boolean
  unsaved?: boolean
  saving?: boolean
  saveError?: string
  onSave?: () => Promise<string>
  onDiscard?: () => void
}) {
  const router = useRouter()
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [leaveError, setLeaveError] = useState('')
  const [leaving, setLeaving] = useState(false)

  // "Volver al panel" de la barra lateral: se registra una sola vez y lee el estado actual desde la ref,
  // porque registrar una función nueva en cada render volvería a actualizar la barra sin fin.
  const unsavedRef = useRef(unsaved)
  unsavedRef.current = unsaved
  const goBack = useCallback(() => {
    if (unsavedRef.current) {
      setLeaveError('')
      setPendingHref('/busqueda')
      return
    }
    router.push('/busqueda')
  }, [router])

  useRegisterSettingsNav(sections, activeSection, onSection, navTitle, goBack)

  useEffect(() => {
    if (!unsaved) setPendingHref(null)
    if (!unsaved) return
    function warnBeforeClose(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeClose)
    return () => window.removeEventListener('beforeunload', warnBeforeClose)
  }, [unsaved])

  async function saveAndLeave() {
    if (!onSave || !pendingHref) return
    setLeaving(true)
    const failure = await onSave()
    setLeaving(false)
    if (failure) return setLeaveError(failure)
    const href = pendingHref
    setPendingHref(null)
    router.push(href)
  }

  function discardAndLeave() {
    const href = pendingHref
    onDiscard?.()
    setPendingHref(null)
    if (href) router.push(href)
  }

  const pendingLabel = pendingHref === '/busqueda' ? 'volver al panel' : 'salir de Mi perfil'

  return (
      <main className="ax-v2 min-h-screen bg-transparent text-[var(--ax-text)] lg:ml-64">
        <div className="mx-auto max-w-[1184px] space-y-5 px-4 pb-16 pt-5 sm:space-y-6 sm:px-8 sm:pt-8 lg:px-10">
          {hero}
          <nav aria-label="Secciones de Mi perfil" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-8 sm:px-8 lg:hidden">
            {sections.map((item) => <Segment key={item.id} active={item.id === activeSection} label={item.label} onClick={() => onSection(item.id)} />)}
          </nav>
          {notice && <InlineNotice tone={notice.type === 'error' ? 'danger' : 'success'} icon={notice.type === 'error' ? AlertTriangle : Check}>{notice.text}</InlineNotice>}
          {children}
          {editing && (pendingHref
            ? <div role="alertdialog" aria-labelledby="leave-title" className="ax-drop-in sticky bottom-4 z-30 space-y-3 rounded-[14px] bg-[var(--ax-surface-raised)] [background-image:linear-gradient(var(--ax-warning-soft),var(--ax-warning-soft))] p-3.5 shadow-[var(--ax-shadow-pop)] sm:p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} aria-hidden="true" className="mt-px shrink-0 text-[var(--ax-warning-text)]" />
                <div className="min-w-0">
                  <p id="leave-title" className="text-sm font-semibold text-[var(--ax-warning-text)]">Guarda o descarta antes de salir</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-[var(--ax-text-secondary)]">Ibas a {pendingLabel}. Tus cambios siguen sin guardar.</p>
                  {leaveError && <p role="alert" className="mt-1 text-[13px] font-medium text-[var(--ax-danger-text)]">{leaveError}</p>}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => setPendingHref(null)} disabled={leaving}>Seguir editando</Button>
                <Button onClick={discardAndLeave} disabled={leaving}>Descartar</Button>
                <Button variant="primary" icon={Check} onClick={() => void saveAndLeave()} disabled={leaving}>{leaving ? 'Guardando…' : 'Guardar y salir'}</Button>
              </div>
            </div>
            : <div role="region" aria-label="Cambios sin guardar" className="ax-drop-in sticky bottom-4 z-30 flex flex-col gap-3 rounded-[14px] border border-[var(--ax-accent-line)] bg-[var(--ax-surface-raised)] p-3 shadow-[var(--ax-shadow-pop)] sm:flex-row sm:items-center sm:justify-between sm:pl-4">
              <div className="flex min-w-0 items-start gap-2.5">
                <Info size={18} aria-hidden="true" className="mt-px shrink-0 text-[var(--ax-accent-text)]" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--ax-text)]">{unsaved ? 'Tienes cambios sin guardar' : 'Estás editando tu perfil'}</p>
                  <p className={cx('text-[13px]', saveError ? 'font-medium text-[var(--ax-danger-text)]' : 'text-[var(--ax-muted)]')}>{saveError || (unsaved ? 'Se aplican a tu perfil al guardar.' : 'Haz cambios en las secciones que se pueden editar.')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <Button variant="ghost" onClick={onDiscard} disabled={saving}>{unsaved ? 'Descartar' : 'Cancelar'}</Button>
                <Button variant="primary" icon={Check} onClick={() => void onSave?.()} disabled={saving || !unsaved}>{saving ? 'Guardando…' : 'Guardar cambios'}</Button>
              </div>
            </div>)}
        </div>
      </main>
  )
}

// Cabecera del perfil: avatar (redondo para personas), nombre, tipo de cuenta, código y Editar.
// "Ver perfil público" está en el menú de cuenta de la barra superior.
export function Hero({
  initials,
  round = true,
  kindLabel,
  title,
  code,
  chips,
  canEdit = true,
  editing,
  onEdit,
}: {
  initials: string
  round?: boolean
  kindLabel: string
  title: string
  code?: string
  chips?: ReactNode
  canEdit?: boolean
  editing: boolean
  onEdit: () => void
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
      <div className="flex min-w-0 items-center gap-3.5 sm:gap-5">
        <span aria-hidden="true" className={cx('flex h-14 w-14 shrink-0 items-center justify-center bg-[var(--ax-accent)] font-display text-[24px] text-[var(--ax-on-accent)] sm:h-[72px] sm:w-[72px] sm:text-[30px] lg:h-20 lg:w-20 lg:text-[34px]', round ? 'rounded-full' : 'rounded-[14px] lg:rounded-[18px]')}>{initials || 'AX'}</span>
        <div className="min-w-0 space-y-2">
          <h1 className="font-display text-[34px] uppercase leading-[36px] tracking-[.02em] text-[var(--ax-text)] [overflow-wrap:anywhere] sm:text-[40px] sm:leading-[42px] lg:text-[48px] lg:leading-[50px]">{title}</h1>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Badge>{kindLabel}</Badge>
            {code && <span className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--ax-text-secondary)]">{code}<CopyCodeButton value={code} label="Copiar código AthlonX" /></span>}
            {chips}
            {editing && <Badge tone="warning">Editando</Badge>}
          </div>
        </div>
      </div>
      {canEdit && !editing && <Button variant="primary" icon={Pencil} onClick={onEdit} className="w-full sm:w-auto">Editar información</Button>}
    </header>
  )
}

export function Card({ title, description, children, tone = 'default', action, className }: { title: string; description?: string; children: ReactNode; tone?: 'default' | 'danger'; action?: ReactNode; className?: string }) {
  const danger = tone === 'danger'
  return (
    <section className={cx('flex min-w-0 flex-col gap-4 rounded-2xl border bg-[var(--ax-surface)] p-4 sm:gap-5 sm:rounded-[20px] sm:p-6', danger ? 'border-[var(--ax-danger-line)]' : 'border-[var(--ax-line)]', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <h2 className={cx('font-display text-[24px] uppercase leading-none tracking-[.02em] sm:text-[26px]', danger ? 'text-[var(--ax-danger-text)]' : 'text-[var(--ax-text)]')}>{title}</h2>
          {description && <p className="text-[13px] leading-[18px] text-[var(--ax-muted)]">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  )
}

// Dos tarjetas lado a lado en escritorio, apiladas en tablet y móvil.
export function CardRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 sm:gap-6 lg:grid-cols-2 lg:items-start">{children}</div>
}

export function FieldGrid({ children, columns = 3 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  return <div className={cx('grid gap-x-6 gap-y-4 sm:grid-cols-2 sm:gap-y-5', columns === 3 && 'xl:grid-cols-3', columns === 4 && 'xl:grid-cols-4')}>{children}</div>
}

const labelClass = 'block text-[13px] font-semibold text-[var(--ax-text-secondary)]'

// Valor en modo lectura (componente "Dato/Lectura"): los datos vacíos se muestran atenuados.
export function ReadValue({ label, value, copyable = false, hint, empty = 'Sin registrar' }: { label: string; value: string; copyable?: boolean; hint?: string; empty?: string }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <span className={labelClass}>{label}</span>
      <p className={cx('flex min-h-6 items-center gap-1 text-[15px] [overflow-wrap:anywhere]', value ? 'text-[var(--ax-text)]' : 'text-[var(--ax-muted)]')}>
        {value || empty}
        {copyable && value && <CopyCodeButton value={value} label={`Copiar ${label.toLowerCase()}`} />}
      </p>
      {hint && <p className="text-xs leading-[18px] text-[var(--ax-muted)]">{hint}</p>}
    </div>
  )
}

// Campo de texto. Sin edición (disabled) se muestra como dato de lectura, no como un campo apagado.
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
  error,
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
  error?: string
}) {
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  if (disabled && !isPassword) {
    if (as === 'textarea') return <div className="space-y-1.5"><span className="sr-only">{label}</span><p className={cx('whitespace-pre-line text-[15px] leading-6', value ? 'text-[var(--ax-text-secondary)]' : 'text-[var(--ax-muted)]')}>{value || 'Sin descripción todavía.'}</p></div>
    return <ReadValue label={label} value={value} hint={hint} />
  }
  const fieldClass = cx(inputClass, error && 'border-[var(--ax-danger-line)]')
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className={labelClass}>{label}</span>
      {as === 'textarea' ? (
        <textarea className={cx(fieldClass, 'h-auto min-h-[120px] resize-y py-2.5 leading-6')} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange?.(event.target.value)} />
      ) : (
        <span className="relative block">
          <input
            className={cx(fieldClass, isPassword && 'pr-11')}
            type={isPassword && revealed ? 'text' : type}
            value={value}
            disabled={disabled}
            maxLength={maxLength}
            placeholder={placeholder}
            autoComplete={autoComplete}
            aria-invalid={Boolean(error)}
            onChange={(event) => onChange?.(event.target.value)}
          />
          {isPassword && (
            <button type="button" onClick={() => setRevealed((current) => !current)} aria-label={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-[var(--ax-muted)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]">
              {revealed ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            </button>
          )}
        </span>
      )}
      {error ? <span role="alert" className="block text-xs text-[var(--ax-danger-text)]">{error}</span> : hint && <span className="block text-xs text-[var(--ax-muted)]">{hint}</span>}
    </label>
  )
}

// Campo bloqueado: se ve en edición pero no se puede cambiar (edad calculada, correo actual).
export function LockedField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <span className={labelClass}>{label}</span>
      <div className="flex h-10 items-center justify-between gap-2 rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] px-3 text-sm text-[var(--ax-muted)]">
        <span className="truncate">{value || 'Sin registrar'}</span>
        <Lock size={15} aria-hidden="true" className="shrink-0" />
      </div>
      {hint && <span className="block text-xs text-[var(--ax-muted)]">{hint}</span>}
    </div>
  )
}

export function SelectField({ label, value, onChange, disabled = false, options }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; options: Array<{ value: string; label: string }> }) {
  if (disabled) return <ReadValue label={label} value={value ? options.find((option) => option.value === value)?.label ?? value : ''} />
  return <Select label={label} value={value} onChange={onChange} options={options.map((option) => ({ value: option.value, label: option.label }))} />
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

const roundIconButton = 'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--ax-text)] hover:bg-[var(--ax-hover)] disabled:cursor-not-allowed disabled:opacity-30'

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

  if (disabled) return <ReadValue label={label} value={selected ? `${selected.day} de ${monthNames[selected.month]} de ${selected.year}` : ''} hint={hint} />

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
    <div className="min-w-0 space-y-1.5">
      <span className={labelClass}>{label}</span>
      <div ref={wrapperRef} className="relative">
        <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => (open ? setOpen(false) : openPanel())} className={cx(inputClass, 'flex cursor-pointer items-center justify-between gap-2 text-left', open && 'border-[var(--ax-accent-text)]')}>
          <span className={cx('truncate', !displayValue && 'text-[var(--ax-muted)]')}>{displayValue || 'Selecciona una fecha'}</span>
          <CalendarDays size={16} aria-hidden="true" className="shrink-0 text-[var(--ax-muted)]" />
        </button>

        {open && (
          <div role="dialog" aria-label={label} className="ax-drop-in absolute left-0 top-full z-40 mt-2 w-[300px] max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--ax-line-strong)] bg-[var(--ax-surface-raised)] p-3.5 shadow-[var(--ax-shadow-pop)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button type="button" onClick={() => shiftMonth(-1)} disabled={prevDisabled || view === 'years'} aria-label="Mes anterior" className={roundIconButton}><ChevronLeft size={18} aria-hidden="true" /></button>
              <button type="button" onClick={() => setView((current) => (current === 'days' ? 'years' : 'days'))} className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold capitalize text-[var(--ax-text)] hover:bg-[var(--ax-hover)]">
                {view === 'days' ? `${monthNames[viewMonth]} ${viewYear}` : 'Seleccionar año'}
                <ChevronDown size={15} aria-hidden="true" className={cx('text-[var(--ax-accent-text)] transition-transform duration-150', view === 'years' && 'rotate-180')} />
              </button>
              <button type="button" onClick={() => shiftMonth(1)} disabled={nextDisabled || view === 'years'} aria-label="Mes siguiente" className={roundIconButton}><ChevronRight size={18} aria-hidden="true" /></button>
            </div>

            {view === 'days' ? (
              <>
                <div className="grid grid-cols-7 gap-1 pb-2">
                  {weekdayShort.map((day) => <span key={day} className="text-center text-[11px] font-semibold text-[var(--ax-muted)]">{day}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((day, index) => {
                    if (day === null) return <span key={`empty-${index}`} />
                    const iso = isoOf(day)
                    const isSelected = iso === value
                    const isToday = iso === today
                    const outOfRange = iso < min || iso > maxIso
                    return (
                      <button key={iso} type="button" disabled={outOfRange} onClick={() => pick(iso)} aria-pressed={isSelected} className={cx(
                        'mx-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sm disabled:cursor-not-allowed disabled:opacity-30',
                        isSelected ? 'bg-[var(--ax-accent)] font-bold text-[var(--ax-on-accent)]' : isToday ? 'border border-[var(--ax-accent-line)] text-[var(--ax-accent-text)] hover:bg-[var(--ax-accent-soft)]' : 'text-[var(--ax-text)] hover:bg-[var(--ax-hover)]',
                      )}>{day}</button>
                    )
                  })}
                </div>
              </>
            ) : (
              <div ref={yearListRef} className="grid max-h-64 grid-cols-4 gap-1.5 overflow-y-auto pr-1">
                {years.map((year) => {
                  const active = year === viewYear
                  return <button key={year} type="button" data-active={active} onClick={() => { setViewYear(year); setView('days') }} className={cx('cursor-pointer rounded-lg py-2 text-sm', active ? 'bg-[var(--ax-accent)] font-bold text-[var(--ax-on-accent)]' : 'text-[var(--ax-text)] hover:bg-[var(--ax-hover)]')}>{year}</button>
                })}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-[var(--ax-line)] pt-3">
              <button type="button" onClick={() => pick('')} className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--ax-muted)] hover:text-[var(--ax-text)]">Borrar</button>
              <button type="button" disabled={!todayAllowed} onClick={() => pick(today)} className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--ax-accent-text)] hover:bg-[var(--ax-accent-soft)] disabled:cursor-not-allowed disabled:opacity-30">Hoy</button>
            </div>
          </div>
        )}
      </div>
      {hint && <span className="block text-xs text-[var(--ax-muted)]">{hint}</span>}
    </div>
  )
}

// Bandera ISO 3166-1 alpha-2 desde country-flag-icons; si el código no existe en la librería no se muestra nada.
export function CountryFlag({ flagCode, name }: { flagCode: string; name: string }) {
  const key = flagCode.toUpperCase() as keyof typeof Flags
  const Flag = Flags[key]
  if (!Flag) return null
  return <Flag title={`Bandera de ${name}`} className="h-[14px] w-[21px] shrink-0 rounded-[2px]" />
}

// Teléfono de cualquier país: selector con buscador, bandera y código, y el número con el formato del país.
export function PhoneField({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; countries?: Country[] }) {
  const [iso, setIso] = useState<CountryCode>(() => splitPhone(value).iso)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const numberRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  useDismiss(wrapperRef, open, () => setOpen(false))
  useEffect(() => { if (open) searchRef.current?.focus() }, [open])

  // Si el valor cambia desde fuera (descartar cambios), el país se toma del número guardado.
  const parts = splitPhone(value, iso)
  useEffect(() => { if (parts.iso !== iso && value) setIso(parts.iso) }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  if (disabled) {
    const shown = value ? splitPhone(value) : null
    return (
      <div className="min-w-0 space-y-1.5">
        <span className={labelClass}>{label}</span>
        <p className={cx('flex min-h-6 items-center gap-2 text-[15px]', value ? 'text-[var(--ax-text)]' : 'text-[var(--ax-muted)]')}>
          {shown && <CountryFlag flagCode={shown.iso} name={countryName(shown.iso)} />}
          {value || 'Sin registrar'}
        </p>
      </div>
    )
  }

  const countries = phoneCountries()
  const selected = countries.find((country) => country.iso === iso) ?? countries[0]
  const term = query.trim().toLowerCase().replace(/^\+/, '')
  const filtered = term ? countries.filter((country) => country.name.toLowerCase().includes(term) || country.dialCode.startsWith(term) || country.iso.toLowerCase() === term) : countries
  const error = phoneError(value)

  function pick(next: CountryCode) {
    setIso(next)
    setOpen(false)
    setQuery('')
    onChange(joinPhone(next, formatNational(next, parts.national)))
    window.requestAnimationFrame(() => numberRef.current?.focus())
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <span className={labelClass}>{label}</span>
      <div ref={wrapperRef} className="relative flex gap-2">
        <button type="button" aria-label={`País del teléfono: ${selected.name} +${selected.dialCode}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((current) => !current)} className={cx('flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] border bg-[var(--ax-surface-sunken)] px-2.5 text-sm text-[var(--ax-text)] transition-[border-color] duration-150 hover:border-[var(--ax-muted)]', open ? 'border-[var(--ax-accent-text)]' : error ? 'border-[var(--ax-danger-line)]' : 'border-[var(--ax-line-strong)]')}>
          <CountryFlag flagCode={selected.iso} name={selected.name} />
          <span className="tabular-nums">+{selected.dialCode}</span>
          <ChevronDown size={14} aria-hidden="true" className={cx('text-[var(--ax-muted)] transition-transform duration-150', open && 'rotate-180')} />
        </button>
        <input
          ref={numberRef}
          inputMode="tel"
          autoComplete="tel-national"
          aria-label={`${label}: número`}
          aria-invalid={Boolean(error)}
          className={cx(inputClass, 'min-w-0 flex-1 tabular-nums', error && 'border-[var(--ax-danger-line)]')}
          value={parts.national}
          placeholder={iso === 'PA' ? '6000-0000' : 'Número'}
          onChange={(event) => onChange(joinPhone(iso, formatNational(iso, event.target.value)))}
        />
        {open && (
          <div className="ax-drop-in absolute left-0 top-full z-40 mt-2 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-[var(--ax-line-strong)] bg-[var(--ax-surface-raised)] p-1.5 shadow-[var(--ax-shadow-pop)]">
            <label className="relative mb-1.5 block">
              <span className="sr-only">Buscar país</span>
              <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ax-muted)]" />
              <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && filtered[0]) { event.preventDefault(); pick(filtered[0].iso) } }} placeholder="Buscar país o código" className={cx(inputClass, 'h-9 pl-8')} />
            </label>
            <ul id={listId} role="listbox" aria-label="País del teléfono" className="max-h-64 overflow-y-auto">
              {filtered.length ? filtered.map((country) => {
                const active = country.iso === iso
                return <li key={country.iso} role="option" aria-selected={active}>
                  <button type="button" onClick={() => pick(country.iso)} className={cx('flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm', active ? 'bg-[var(--ax-accent-soft)] font-semibold text-[var(--ax-accent-text)]' : 'text-[var(--ax-text)] hover:bg-[var(--ax-hover)]')}>
                    <CountryFlag flagCode={country.iso} name={country.name} />
                    <span className="min-w-0 flex-1 truncate">{country.name}</span>
                    <span className={cx('tabular-nums', active ? '' : 'text-[var(--ax-muted)]')}>+{country.dialCode}</span>
                  </button>
                </li>
              }) : <li className="px-2.5 py-3 text-[13px] text-[var(--ax-muted)]">No hay países con “{query}”.</li>}
            </ul>
          </div>
        )}
      </div>
      {error && <span role="alert" className="block text-xs text-[var(--ax-danger-text)]">{error}</span>}
    </div>
  )
}

function countryName(iso: CountryCode) {
  return phoneCountries().find((country) => country.iso === iso)?.name ?? iso
}

// Copia el código y confirma con "Copiado" durante 2 segundos.
export function CopyCodeButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }
  return (
    <button type="button" onClick={() => void copy()} aria-label={copied ? 'Código copiado' : label} title={copied ? 'Copiado' : label} className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 text-[var(--ax-muted)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]">
      {copied ? <><Check size={14} aria-hidden="true" className="text-[var(--ax-accent-text)]" /><span className="text-xs font-semibold text-[var(--ax-accent-text)]">Copiado</span></> : <Copy size={14} aria-hidden="true" />}
    </button>
  )
}

export function Chip({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'lime' }) {
  return tone === 'lime'
    ? <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-[var(--ax-accent-soft)] px-2.5 text-xs font-semibold whitespace-nowrap text-[var(--ax-accent-text)]">{children}</span>
    : <Badge>{children}</Badge>
}

// Insignia de visibilidad fija ("Siempre público", "Solo tú").
export function FixedChip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-[var(--ax-line-strong)] px-2.5 text-xs font-semibold whitespace-nowrap text-[var(--ax-text-secondary)]"><Icon size={12} aria-hidden="true" className="text-[var(--ax-muted)]" />{children}</span>
}

// Lista de filas separadas por líneas (ajustes, equipos, directivos).
export function RowList({ children }: { children: ReactNode }) {
  return <div className="-my-1 divide-y divide-[var(--ax-line)]">{children}</div>
}

export function Switch({ checked, onChange, disabled = false, label }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={cx('relative h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50', checked ? 'bg-[var(--ax-accent)]' : 'bg-[var(--ax-line-strong)]')}>
      <span aria-hidden="true" className={cx('absolute top-[3px] h-[18px] w-[18px] rounded-full transition-[left,background-color] duration-150', checked ? 'left-[19px] bg-[var(--ax-on-accent)]' : 'left-[3px] bg-[var(--ax-text-secondary)]')} />
    </button>
  )
}

export function Toggle({ label, description, checked, onChange, disabled = false }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <SettingRow title={label} description={description} right={<Switch label={label} checked={checked} onChange={onChange} disabled={disabled} />} />
}

export function Segmented<T extends string>({ options, value, onChange, disabled = false, label }: { options: Array<{ value: T; label: string; icon?: LucideIcon }>; value: T; onChange: (value: T) => void; disabled?: boolean; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 gap-0.5 rounded-[10px] border border-[var(--ax-line-strong)] bg-[var(--ax-surface-sunken)] p-[3px]">
      {options.map((option) => {
        const active = option.value === value
        const Icon = option.icon
        return (
          <button key={option.value} type="button" role="radio" aria-checked={active} disabled={disabled} onClick={() => onChange(option.value)} className={cx('inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60', active ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'text-[var(--ax-text-secondary)] hover:text-[var(--ax-text)]')}>
            {Icon && <Icon size={14} aria-hidden="true" />}{option.label}
          </button>
        )
      })}
    </div>
  )
}

export function SettingRow({ title, description, right }: { title: string; description?: string; right: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--ax-text)]">{title}</p>
        {description && <p className="mt-0.5 text-[13px] leading-[18px] text-[var(--ax-muted)]">{description}</p>}
      </div>
      {right}
    </div>
  )
}

export function ListRow({ initials, icon: Icon, round = false, title, meta, right, children }: { initials?: string; icon?: LucideIcon; round?: boolean; title: string; meta?: string; right?: ReactNode; children?: ReactNode }) {
  return (
    <div className="py-3">
      <div className="flex items-center gap-3.5">
        {Icon ? <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--ax-accent-soft)] text-[var(--ax-accent-text)]"><Icon size={18} /></span>
          : initials && <span aria-hidden="true" className={cx('flex h-10 w-10 shrink-0 items-center justify-center text-[13px] font-bold', round ? 'rounded-full bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'rounded-[10px] border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] text-[var(--ax-text)]')}>{initials}</span>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--ax-text)]">{title}</p>
          {meta && <p className="mt-0.5 truncate text-[13px] text-[var(--ax-muted)]">{meta}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

// Estado vacío dentro de una tarjeta.
export function Pending({ children }: { children: ReactNode }) {
  return <p className="rounded-[10px] border border-dashed border-[var(--ax-line-strong)] px-4 py-3 text-[13px] text-[var(--ax-muted)]">{children}</p>
}

// Nota dentro de una tarjeta (componente "aviso" neutro de Figma).
export function Hint({ icon: Icon = Info, children }: { icon?: LucideIcon; children: ReactNode }) {
  return <div className="flex items-start gap-2 rounded-[10px] bg-[var(--ax-surface-raised)] px-3 py-2.5 text-[13px] leading-[18px] text-[var(--ax-text-secondary)]"><Icon size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--ax-muted)]" /><div className="min-w-0">{children}</div></div>
}

// Confirmación en línea (reemplaza las ventanas de confirmación).
export function InlineConfirm({ title, description, confirmLabel, danger = false, busy = false, error, onConfirm, onCancel, children }: { title: string; description?: string; confirmLabel: string; danger?: boolean; busy?: boolean; error?: string; onConfirm: () => void; onCancel: () => void; children?: ReactNode }) {
  return (
    <div role="group" aria-label={title} className={cx('ax-drop-in mt-3 space-y-3 rounded-[14px] border p-4', danger ? 'border-[var(--ax-danger-line)] bg-[var(--ax-danger-soft)]' : 'border-[var(--ax-accent-line)] bg-[var(--ax-surface-raised)]')}>
      <div>
        <p className="text-sm font-semibold text-[var(--ax-text)] [overflow-wrap:anywhere]">{title}</p>
        {description && <p className="mt-1 text-[13px] leading-5 text-[var(--ax-text-secondary)]">{description}</p>}
      </div>
      {children}
      {error && <p role="alert" className="text-[13px] font-medium text-[var(--ax-danger-text)]">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>{busy ? 'Procesando…' : confirmLabel}</Button>
      </div>
    </div>
  )
}

// Confirmación breve de un guardado inmediato ("Guardado").
export function SaveStatus({ state }: { state: 'idle' | 'saving' | 'saved' | string }) {
  if (state === 'idle') return null
  if (state === 'saving') return <span role="status" className="text-xs font-semibold text-[var(--ax-muted)]">Guardando…</span>
  if (state === 'saved') return <span role="status" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ax-accent-text)]"><Check size={14} aria-hidden="true" />Guardado</span>
  return <span role="alert" className="text-xs font-semibold text-[var(--ax-danger-text)]">{state}</span>
}

// Estado de guardado inmediato: muestra "Guardado" unos segundos o el error.
export function useSaveStatus() {
  const [state, setState] = useState<string>('idle')
  const timer = useRef<number | null>(null)
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])
  async function run(task: () => Promise<string>) {
    if (timer.current) window.clearTimeout(timer.current)
    setState('saving')
    const failure = await task()
    setState(failure || 'saved')
    if (!failure) timer.current = window.setTimeout(() => setState('idle'), 2500)
    return failure
  }
  return { state, run }
}

export function Avatar({ initials, size = 56 }: { initials: string; size?: 40 | 56 | 64 }) {
  return <span aria-hidden="true" className={cx('flex shrink-0 items-center justify-center rounded-full bg-[var(--ax-accent)] font-display text-[var(--ax-on-accent)]', size === 40 ? 'h-10 w-10 text-lg' : size === 64 ? 'h-16 w-16 text-[28px]' : 'h-14 w-14 text-2xl')}>{initials || 'AX'}</span>
}

export function initialsOf(text: string) {
  return text.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

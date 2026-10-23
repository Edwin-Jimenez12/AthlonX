'use client'

import { Check, ChevronDown, MoreHorizontal, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

// Piezas base del rediseño de Mi equipo. Replican los componentes de la página
// "Claude" en Figma (Botón/*, Insignia/*, Avatar, Segmento/*, Campo/Buscar) y
// usan solo tokens --ax-*, así que funcionan igual en tema claro y oscuro.

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-[var(--ax-accent-text)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ax-bg)]'

const buttonVariants = {
  primary: 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)] hover:brightness-[1.06]',
  secondary: 'border border-[var(--ax-line-strong)] text-[var(--ax-text)] hover:border-[var(--ax-accent-text)] hover:bg-[var(--ax-hover)]',
  accent: 'border border-[var(--ax-accent-line)] text-[var(--ax-accent-text)] hover:bg-[var(--ax-accent-soft)]',
  ghost: 'text-[var(--ax-text-secondary)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]',
  danger: 'border border-[var(--ax-danger-line)] text-[var(--ax-danger-text)] hover:bg-[var(--ax-danger-soft)]',
}

const buttonSizes = {
  md: 'h-10 px-4 text-sm',
  sm: 'h-9 px-3.5 text-[13px]',
  lg: 'h-11 px-5 text-sm',
}

export function buttonClass(variant: keyof typeof buttonVariants = 'secondary', size: keyof typeof buttonSizes = 'md') {
  return cx(
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[10px] font-semibold whitespace-nowrap transition-[background-color,border-color,color,transform,filter] duration-150 ease-out active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
    focusRing,
    buttonVariants[variant],
    buttonSizes[size],
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants
  size?: keyof typeof buttonSizes
  icon?: LucideIcon
}

export function Button({ variant = 'secondary', size = 'md', icon: Icon, className, children, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cx(buttonClass(variant, size), className)} {...props}>
    {Icon && <Icon size={16} aria-hidden="true" className="shrink-0" />}
    {children}
  </button>
}

export function ButtonLink({ href, variant = 'secondary', size = 'md', icon: Icon, className, children }: { href: string; variant?: keyof typeof buttonVariants; size?: keyof typeof buttonSizes; icon?: LucideIcon; className?: string; children: ReactNode }) {
  return <Link href={href} className={cx(buttonClass(variant, size), className)}>
    {Icon && <Icon size={16} aria-hidden="true" className="shrink-0" />}
    {children}
  </Link>
}

export function IconButton({ icon: Icon, label, size = 40, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; size?: 36 | 40 }) {
  return <button type="button" aria-label={label} title={label} className={cx(
    'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-[var(--ax-line-strong)] text-[var(--ax-text)] transition-[background-color,border-color,color] duration-150 hover:border-[var(--ax-accent-text)] hover:bg-[var(--ax-hover)] disabled:cursor-not-allowed disabled:opacity-50',
    size === 36 ? 'h-9 w-9' : 'h-10 w-10',
    focusRing,
    className,
  )} {...props}>
    <Icon size={size === 36 ? 17 : 18} aria-hidden="true" />
  </button>
}

const badgeTones = {
  success: 'bg-[var(--ax-accent-soft)] text-[var(--ax-accent-text)]',
  warning: 'bg-[var(--ax-warning-soft)] text-[var(--ax-warning-text)]',
  danger: 'bg-[var(--ax-danger-soft)] text-[var(--ax-danger-text)]',
  neutral: 'border border-[var(--ax-line-strong)] text-[var(--ax-text-secondary)]',
}

export type BadgeTone = keyof typeof badgeTones

export function Badge({ tone = 'neutral', dot = tone !== 'neutral', children, className }: { tone?: BadgeTone; dot?: boolean; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap', badgeTones[tone], className)}>
    {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
    {children}
  </span>
}

export function initialsOf(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AX'
}

export function Avatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: 32 | 36 | 40 }) {
  const dimension = size === 32 ? 'h-8 w-8 text-xs' : size === 40 ? 'h-10 w-10 text-sm' : 'h-9 w-9 text-[13px]'
  return <span className={cx('flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--ax-accent)] font-bold text-[var(--ax-on-accent)]', dimension)}>
    {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initialsOf(name)}
  </span>
}

export function Segment({ active, label, count, onClick, disabled }: { active: boolean; label: string; count?: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} className={cx(
    'inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-[background-color,border-color,color] duration-150 disabled:cursor-not-allowed disabled:opacity-60',
    focusRing,
    active ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'border border-[var(--ax-line-strong)] text-[var(--ax-text-secondary)] hover:border-[var(--ax-accent-text)] hover:text-[var(--ax-text)]',
  )}>
    {label}
    {count !== undefined && <span className={cx('font-medium tabular-nums', active ? 'text-[var(--ax-on-accent)]' : 'text-[var(--ax-muted)]')}>{count}</span>}
  </button>
}

export const inputClass = cx(
  'h-10 w-full rounded-[10px] border border-[var(--ax-line-strong)] bg-[var(--ax-surface-sunken)] px-3 text-sm text-[var(--ax-text)] transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--ax-muted)] hover:border-[var(--ax-muted)] focus:border-[var(--ax-accent-text)] focus:shadow-[0_0_0_3px_var(--ax-accent-soft)] focus:outline-none disabled:opacity-60',
)

export function SearchField({ value, onChange, placeholder, label, className }: { value: string; onChange: (value: string) => void; placeholder: string; label: string; className?: string }) {
  return <label className={cx('relative block', className)}>
    <span className="sr-only">{label}</span>
    <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ax-muted)]" />
    <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={cx(inputClass, 'pl-9 [&::-webkit-search-cancel-button]:hidden')} />
    {value && <button type="button" onClick={() => onChange('')} aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-[var(--ax-muted)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-text)]"><X size={14} /></button>}
  </label>
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-[13px] font-semibold text-[var(--ax-text-secondary)]">{children}</span>
}

export type SelectOption = { value: string; label: string }

// Selector propio del rediseño: mismo aspecto que los campos y menú con los tokens del panel.
export function Select({ label, value, options, onChange, disabled, placeholder = 'Seleccionar' }: { label: string; value: string; options: SelectOption[]; onChange: (value: string) => void; disabled?: boolean; placeholder?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find((option) => option.value === value)
  useDismiss(ref, open, () => setOpen(false))

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const index = options.findIndex((option) => option.value === value)
      const next = options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]
      if (next) onChange(next.value)
    }
  }

  return <div ref={ref} className="relative min-w-0">
    <FieldLabel>{label}</FieldLabel>
    <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((current) => !current)} onKeyDown={onKeyDown} className={cx(inputClass, 'flex cursor-pointer items-center justify-between gap-2 text-left')}>
      <span className={selected ? '' : 'text-[var(--ax-muted)]'}>{selected?.label || placeholder}</span>
      <ChevronDown size={16} aria-hidden="true" className={cx('shrink-0 text-[var(--ax-muted)] transition-transform duration-150', open && 'rotate-180')} />
    </button>
    {open && <div id={listId} role="listbox" aria-label={label} className="ax-drop-in absolute left-0 right-0 z-40 mt-2 max-h-64 overflow-y-auto rounded-xl border border-[var(--ax-line-strong)] bg-[var(--ax-surface-raised)] p-1.5 shadow-[var(--ax-shadow-pop)]">
      {options.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); setOpen(false) }} className={cx('flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 text-left text-sm', option.value === value ? 'bg-[var(--ax-accent-soft)] font-semibold text-[var(--ax-accent-text)]' : 'text-[var(--ax-text)] hover:bg-[var(--ax-hover)]')}>
        {option.label}{option.value === value && <Check size={15} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>
}

export function useDismiss(ref: React.RefObject<HTMLElement | null>, active: boolean, onDismiss: () => void) {
  useEffect(() => {
    if (!active) return
    function onPointer(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onDismiss()
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onDismiss()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [active, onDismiss, ref])
}

export type MenuItem = { label: string; icon: LucideIcon; onSelect?: () => void; href?: string; tone?: 'danger'; separated?: boolean }

// Menú ⋯ de cada fila (componente "Menú/Acciones fila" en Figma).
export function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = () => setOpen(false)
  useDismiss(ref, open, close)
  if (!items.length) return <span className="h-9 w-9 shrink-0" aria-hidden="true" />
  return <div ref={ref} className="relative shrink-0">
    <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={cx('flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] text-[var(--ax-muted)] transition-[background-color,border-color,color] duration-150 hover:bg-[var(--ax-surface-raised)] hover:text-[var(--ax-text)]', open && 'border border-[var(--ax-line-strong)] bg-[var(--ax-surface-raised)] text-[var(--ax-text)]', focusRing)}>
      <MoreHorizontal size={18} aria-hidden="true" />
    </button>
    {open && <div role="menu" className="ax-drop-in absolute right-0 top-full z-40 mt-1.5 w-60 rounded-xl border border-[var(--ax-line-strong)] bg-[var(--ax-surface-raised)] p-1.5 shadow-[var(--ax-shadow-pop)]">
      {items.map(({ label: itemLabel, icon: Icon, onSelect, href, tone, separated }) => {
        const className = cx('flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium transition-colors duration-100', tone === 'danger' ? 'text-[var(--ax-danger-text)] hover:bg-[var(--ax-danger-soft)]' : 'text-[var(--ax-text)] hover:bg-[var(--ax-hover)]')
        const content = <><Icon size={16} aria-hidden="true" className="shrink-0" />{itemLabel}</>
        return <div key={itemLabel}>
          {separated && <div className="my-1 h-px bg-[var(--ax-line)]" />}
          {href ? <Link role="menuitem" href={href} onClick={close} className={className}>{content}</Link> : <button type="button" role="menuitem" onClick={() => { close(); onSelect?.() }} className={className}>{content}</button>}
        </div>
      })}
    </div>}
  </div>
}

export function Card({ children, className, labelledBy }: { children: ReactNode; className?: string; labelledBy?: string }) {
  return <section aria-labelledby={labelledBy} className={cx('min-w-0 rounded-2xl border border-[var(--ax-line)] bg-[var(--ax-surface)] p-4 sm:rounded-[20px] sm:p-6', className)}>{children}</section>
}

export function CardHeader({ id, title, subtitle, actions, size = 'md' }: { id: string; title: string; subtitle?: ReactNode; actions?: ReactNode; size?: 'md' | 'lg' }) {
  return <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h2 id={id} className={cx('font-display uppercase leading-none tracking-[.02em] text-[var(--ax-text)] [text-wrap:balance]', size === 'lg' ? 'text-[28px] sm:text-[32px]' : 'text-[26px]')}>{title}</h2>
      {subtitle && <p className="mt-1.5 text-[13px] text-[var(--ax-muted)]">{subtitle}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
}

// Aviso inline (componente "aviso" de Figma): éxito, advertencia, neutro o error.
export function Notice({ tone = 'neutral', icon: Icon, children, action }: { tone?: 'success' | 'warning' | 'neutral' | 'danger'; icon: LucideIcon; children: ReactNode; action?: ReactNode }) {
  const tones = {
    success: 'bg-[var(--ax-accent-soft)] text-[var(--ax-accent-text)]',
    warning: 'bg-[var(--ax-warning-soft)] text-[var(--ax-warning-text)]',
    danger: 'bg-[var(--ax-danger-soft)] text-[var(--ax-danger-text)]',
    neutral: 'border border-[var(--ax-line)] bg-[var(--ax-surface-raised)] text-[var(--ax-text-secondary)]',
  }
  return <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('flex items-start gap-2.5 rounded-[10px] p-3 text-[13px] font-medium leading-[18px]', tones[tone])}>
    <Icon size={16} aria-hidden="true" className="mt-px shrink-0" />
    <div className="min-w-0 flex-1">{children}</div>
    {action}
  </div>
}

// Estado vacío con acción (tablero "Estados" en Figma).
export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-[var(--ax-line-strong)] px-6 py-8 text-center">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ax-accent-soft)] text-[var(--ax-accent-text)]"><Icon size={20} aria-hidden="true" /></span>
    <p className="text-[15px] font-semibold text-[var(--ax-text)]">{title}</p>
    <p className="max-w-sm text-[13px] leading-5 text-[var(--ax-muted)]">{description}</p>
    {action}
  </div>
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return <div aria-hidden="true" className="space-y-0">
    {Array.from({ length: count }, (_, index) => <div key={index} className="flex h-[60px] items-center gap-4 px-4">
      <span className="h-3 w-5 animate-pulse rounded bg-[var(--ax-surface-raised)]" />
      <span className="h-9 w-9 animate-pulse rounded-full bg-[var(--ax-surface-raised)]" />
      <span className={cx('h-3 animate-pulse rounded-md bg-[var(--ax-surface-raised)]', index % 2 ? 'w-28' : 'w-40')} />
      <span className="h-3 w-20 animate-pulse rounded-md bg-[var(--ax-surface-raised)]" />
    </div>)}
  </div>
}

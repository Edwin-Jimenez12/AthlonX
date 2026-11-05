'use client'

import { Building2, Check, ChevronDown, Shield, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { AccountContext, contextDetail, contextTitle } from '../lib/account-contexts'
import { announceHeaderMenu, useDismissableMenu } from './header-menu-dismiss'

type ContextSwitcherProps = {
  contexts: AccountContext[]
  activeContextId: string
  onChange: (context: AccountContext) => void
}

function contextIcon(context: AccountContext) {
  if (context.contextType === 'organization') return Building2
  if (context.contextType === 'team') return Shield
  return UserRound
}

function contextInitials(context: AccountContext) {
  if (context.contextType === 'personal') return contextTitle(context).slice(0, 2).toUpperCase()
  return context.name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'AX'
}

// Subtítulo de cada vista: la cuenta personal dice que es personal; los equipos y organizaciones dicen su tipo.
function contextSubtitle(context: AccountContext) {
  if (context.contextType === 'personal') return 'Cuenta personal'
  return contextDetail(context) ?? (context.contextType === 'team' ? 'Equipo' : 'Organización')
}

export function ContextSwitcher({ contexts, activeContextId, onChange }: ContextSwitcherProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useDismissableMenu(containerRef, 'contexts', open, () => setOpen(false))
  const activeContext = contexts.find((context) => context.id === activeContextId) ?? contexts[0]
  if (!activeContext) return null

  function toggle() {
    if (!open) announceHeaderMenu('contexts')
    setOpen(!open)
  }

  return <div ref={containerRef} className="relative">
    <button
      type="button"
      onClick={toggle}
      aria-expanded={open}
      aria-haspopup="menu"
      className="group flex w-64 max-w-[calc(100vw-9rem)] cursor-pointer items-center gap-3 rounded-[14px] border border-[var(--ax-line-strong)] bg-[var(--ax-surface)] py-2 pl-2 pr-3 text-left transition-colors duration-200 hover:border-[var(--ax-accent-line)] hover:bg-[var(--ax-hover)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ax-accent-soft)]"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] font-display text-base text-[var(--ax-on-accent)] ${activeContext.imageUrl ? '' : 'bg-[var(--ax-accent)]'}`}>{activeContext.imageUrl ? <img src={activeContext.imageUrl} alt="" className="h-full w-full object-cover" /> : contextInitials(activeContext)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-tight text-[var(--ax-text)]">{contextTitle(activeContext)}</span>
        <span className="block truncate text-xs leading-tight text-[var(--ax-muted)]">{contextSubtitle(activeContext)}</span>
      </span>
      <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-[var(--ax-muted)] transition-transform duration-300 group-hover:text-[var(--ax-accent-text)] ${open ? 'rotate-180' : ''}`} />
    </button>

    {open && <div role="menu" aria-label="Cambiar vista" className="ax-drop-in absolute right-0 top-[calc(100%+8px)] z-50 w-80 origin-top-right overflow-hidden rounded-[14px] border border-[var(--ax-line-strong)] bg-[var(--ax-surface-raised)] shadow-[0_18px_40px_-20px_rgba(0,0,0,.45)]">
      <p className="px-4 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--ax-muted)]">Cambiar vista</p>
      <div className="flex flex-col gap-1 p-2">
        {contexts.map((context, index) => {
          const isActive = context.id === activeContext.id
          const Icon = contextIcon(context)
          return <button
            key={context.id}
            type="button"
            role="menuitem"
            aria-current={isActive ? 'true' : undefined}
            onClick={() => { setOpen(false); onChange(context) }}
            style={{ animationDelay: `${index * 45}ms` }}
            className={`ax-option-in flex w-full cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-colors duration-200 ${isActive ? 'border-[var(--ax-accent-line)] bg-[var(--ax-accent-soft)]' : 'border-transparent hover:bg-[var(--ax-hover)]'}`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] ${context.imageUrl ? '' : 'bg-[var(--ax-surface-sunken)] text-[var(--ax-accent-text)]'}`}>{context.imageUrl ? <img src={context.imageUrl} alt="" className="h-full w-full object-cover" /> : <Icon size={17} aria-hidden="true" />}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[var(--ax-text)]">{contextTitle(context)}</span>
              <span className="block truncate text-xs text-[var(--ax-muted)]">{contextSubtitle(context)}</span>
            </span>
            {isActive && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ax-accent)] text-[var(--ax-on-accent)]" aria-label="Vista actual"><Check size={14} aria-hidden="true" /></span>}
          </button>
        })}
      </div>
    </div>}
  </div>
}

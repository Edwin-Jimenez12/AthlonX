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
      className="group flex w-64 max-w-[calc(100vw-9rem)] cursor-pointer items-center gap-3 rounded-2xl border border-[#29485d] bg-[#0b1d2c]/80 py-2 pl-2 pr-3 text-left text-white transition-all duration-300 hover:border-[#b4ff45]/70 hover:bg-[#102536]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#b4ff45] font-heading text-base font-bold text-[#07131e]">{contextInitials(activeContext)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-body text-sm font-semibold leading-tight text-[#e8eef3]">{contextTitle(activeContext)}</span>
        <span className="block truncate font-body text-xs leading-tight text-[#91a8ba]">{contextDetail(activeContext) ?? 'Vista personal'}</span>
      </span>
      <ChevronDown size={16} className={`shrink-0 text-[#91a8ba] transition-transform duration-300 group-hover:text-[#b4ff45] ${open ? 'rotate-180' : ''}`} />
    </button>

    {open && <div role="menu" className="ax-drop-in absolute right-0 top-[calc(100%+8px)] z-50 w-80 origin-top-right overflow-hidden rounded-2xl border border-[#31485c] bg-[#0b1d2c] shadow-2xl">
      <p className="px-4 pb-2 pt-3 font-barlow text-xs font-semibold uppercase tracking-[0.16em] text-[#91a8ba]">Cambiar vista</p>
      <div className="flex flex-col gap-1 p-2">
        {contexts.map((context, index) => {
          const isActive = context.id === activeContext.id
          const Icon = contextIcon(context)
          return <button
            key={context.id}
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onChange(context) }}
            style={{ animationDelay: `${index * 45}ms` }}
            className={`ax-option-in flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 ${isActive ? 'bg-[#b4ff45] text-[#07131e]' : 'text-[#e8eef3] hover:bg-white/[.06]'}`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-[#07131e]/10' : 'bg-[#b4ff45]/10 text-[#b4ff45]'}`}><Icon size={17} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-body text-sm font-semibold">{contextTitle(context)}</span>
              <span className={`block truncate font-body text-xs ${isActive ? 'text-[#07131e]/70' : 'text-[#91a8ba]'}`}>{contextDetail(context) ?? 'Vista personal'}</span>
            </span>
            {isActive && <span className="flex shrink-0 items-center gap-1 font-body text-[10px] font-bold uppercase tracking-wider"><Check size={14} />Actual</span>}
          </button>
        })}
      </div>
    </div>}
  </div>
}

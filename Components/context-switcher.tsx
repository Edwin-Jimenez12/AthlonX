'use client'

import { ChevronDown, Layers3 } from 'lucide-react'
import { useState } from 'react'
import { AccountContext } from '../lib/account-contexts'

type ContextSwitcherProps = {
  contexts: AccountContext[]
  activeContextId: string
  onChange: (context: AccountContext) => void
}

const roleLabels: Record<AccountContext['role'], string> = {
  atleta: 'Atleta',
  entrenador: 'Entrenador',
  staff: 'Staff',
  directivo: 'Directivo',
}

export function ContextSwitcher({ contexts, activeContextId, onChange }: ContextSwitcherProps) {
  const [open, setOpen] = useState(false)
  const activeContext = contexts.find((context) => context.id === activeContextId) ?? contexts[0]
  if (!activeContext) return null

  return <div className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex max-w-64 cursor-pointer items-center gap-2 rounded-full border border-[#294052] px-2 py-1.5 text-left text-white transition hover:border-[#b4ff45]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#b4ff45] text-xs font-bold text-[#07131e]">{activeContext.name.slice(0, 2).toUpperCase()}</span>
      <span className="hidden min-w-0 sm:block"><span className="block truncate text-xs font-bold">{activeContext.name}</span><span className="block truncate text-[10px] text-slate-400">{roleLabels[activeContext.role]}</span></span>
      <ChevronDown size={15} className="shrink-0 text-slate-400" />
    </button>
    {open && <div className="absolute right-0 top-14 z-50 w-72 rounded-2xl border border-[#31485c] bg-[#0d1d2b] p-2 text-white shadow-2xl">
      <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Cambiar vista</p>
      {contexts.map((context) => <button key={context.id} type="button" onClick={() => { setOpen(false); onChange(context) }} className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left transition ${context.id === activeContext.id ? 'bg-[#b4ff45] text-[#07131e]' : 'text-slate-200 hover:bg-white/5'}`}><Layers3 size={17} /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{context.name}</span><span className="block truncate text-xs opacity-70">{roleLabels[context.role]}{context.roleLabel ? ` · ${context.roleLabel}` : ''}</span></span></button>)}
    </div>}
  </div>
}

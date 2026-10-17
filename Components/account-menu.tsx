'use client'

import Link from 'next/link'
import { Moon, Sun, UserCircle } from 'lucide-react'
import type { ThemeMode } from '../lib/theme'
import { LogoutAction } from './logout-confirmation'

type AccountMenuProps = {
  name: string
  theme: ThemeMode
  onTheme: (mode: ThemeMode) => void
  onClose: () => void
}

const themeOptions: { mode: ThemeMode; label: string; icon: typeof Moon }[] = [
  { mode: 'dark', label: 'Oscuro', icon: Moon },
  { mode: 'light', label: 'Claro', icon: Sun },
]

export function AccountMenu({ theme, onTheme, onClose }: AccountMenuProps) {
  return <div className="absolute right-0 top-14 z-50 w-60 rounded-[5px] border border-[var(--ax-line)] bg-[var(--ax-surface)] p-2 text-[var(--ax-text)] shadow-2xl">
    <Link href="/mi-perfil" onClick={onClose} className="flex cursor-pointer items-center gap-3 rounded-[5px] px-3 py-3 text-sm hover:bg-[var(--ax-surface-raised)]"><UserCircle size={17} />Mi perfil</Link>
    <div className="px-3 pb-2 pt-3">

      <div role="group" aria-label="Tema de la plataforma" className="grid grid-cols-2 gap-1 rounded-[5px] bg-[var(--ax-surface-raised)] p-1">
        {themeOptions.map(({ mode, label, icon: Icon }) => {
          const active = theme === mode
          return <button key={mode} type="button" aria-pressed={active} onClick={() => onTheme(mode)} className={`flex cursor-pointer items-center justify-center gap-2 rounded-[5px] px-2 py-2 text-sm font-semibold transition ${active ? 'bg-[var(--ax-accent)] text-[var(--ax-on-accent)]' : 'text-[var(--ax-muted)] hover:text-[var(--ax-text)]'}`}><Icon size={15} aria-hidden="true" />{label}</button>
        })}
      </div>
    </div>
    <LogoutAction compact className="w-full rounded-[5px] px-3 py-3 text-sm text-red-400 hover:bg-red-400/10" />
  </div>
}

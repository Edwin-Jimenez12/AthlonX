'use client'

import Link from 'next/link'
import { Moon, Sun, UserCircle } from 'lucide-react'
import { LogoutAction } from './logout-confirmation'

type AccountMenuProps = {
  name: string
  theme: 'dark' | 'light'
  onTheme: () => void
  onClose: () => void
}

export function AccountMenu({ theme, onTheme, onClose }: AccountMenuProps) {
  return <div className="absolute right-0 top-14 z-50 w-60 rounded-[5px] border border-[#31485c] bg-[#0d1d2b] p-2 text-white shadow-2xl">
    <Link href="/dashboard/configuracion" onClick={onClose} className="flex cursor-pointer items-center gap-3 rounded-[5px] px-3 py-3 text-sm hover:bg-white/5"><UserCircle size={17} />Mi cuenta</Link>
    <button type="button" onClick={onTheme} className="flex w-full cursor-pointer items-center gap-3 rounded-[5px] px-3 py-3 text-left text-sm hover:bg-white/5">{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</button>
    <LogoutAction compact className="w-full rounded-[5px] px-3 py-3 text-sm text-red-300 hover:bg-red-400/10" />
  </div>
}

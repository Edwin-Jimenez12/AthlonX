'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AccountRole, loadAccountContexts } from '../lib/account-contexts'
import { supabase } from '../lib/supabase'

const views: { role: AccountRole; label: string; href: string }[] = [
  { role: 'atleta', label: 'Atleta', href: '/atleta' },
  { role: 'entrenador', label: 'Entrenador', href: '/entrenador' },
  { role: 'directivo', label: 'Directivo', href: '/directivo' },
  { role: 'staff', label: 'Staff', href: '/staff' },
]

// Muestra solo las vistas que la cuenta tiene activas en la base (user_contexts, user_roles, team_user_memberships).
export function PersonaViewSwitcher({ active }: { active: AccountRole }) {
  const [roles, setRoles] = useState<AccountRole[]>([active])

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const contexts = await loadAccountContexts(data.user.id)
      if (!mounted) return
      setRoles(Array.from(new Set<AccountRole>([...contexts.map((context) => context.role), active])))
    }
    void load()
    return () => { mounted = false }
  }, [active])

  return (
    <nav aria-label="Vistas de mi cuenta" className="flex flex-wrap gap-2">
      {views.filter((view) => roles.includes(view.role)).map((view) => (
        <Link
          key={view.role}
          href={view.href}
          aria-current={view.role === active ? 'page' : undefined}
          className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-bold transition duration-200 ${view.role === active ? 'border-[#b4ff45] bg-[#b4ff45] text-[#07131e]' : 'border-[#31556b] text-slate-300 hover:border-[#b4ff45] hover:text-[#b4ff45]'}`}
        >
          {view.label}
        </Link>
      ))}
    </nav>
  )
}

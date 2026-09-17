'use client'

import { LogOut, X } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type LogoutActionProps = {
  className?: string
  compact?: boolean
}

export function LogoutAction({ className = '', compact = false }: LogoutActionProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function confirmLogout() {
    setLoading(true)
    await supabase?.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className={`flex cursor-pointer items-center gap-3 ${className}`}>
      <LogOut size={compact ? 17 : 19} />
      <span>Cerrar sesión</span>
    </button>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020a11]/75 p-5 backdrop-blur-md">
      <div role="dialog" aria-modal="true" aria-labelledby="logout-title" className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0d1d2b]/95 p-6 text-white shadow-2xl shadow-black/40 sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-[#b4ff45]">AthlonX</p>
            <h2 id="logout-title" className="mt-2 font-display text-3xl uppercase sm:text-4xl">¿Cerrar sesión?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Tu sesión actual se cerrará en este dispositivo.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Cancelar cierre de sesión" className="cursor-pointer rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X size={20} /></button>
        </div>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setOpen(false)} className="cursor-pointer rounded-xl border border-white/15 px-5 py-3 font-semibold text-slate-200 hover:bg-white/10">Cancelar</button>
          <button type="button" onClick={() => void confirmLogout()} disabled={loading} className="cursor-pointer rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] hover:bg-[#c4ff72] disabled:cursor-wait disabled:opacity-60">{loading ? 'Cerrando sesión...' : 'Cerrar sesión'}</button>
        </div>
      </div>
    </div>}
  </>
}

'use client'

import { Shield } from 'lucide-react'

export default function ParticipantsPage() {
  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10">
    <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center">
      <section className="w-full rounded-[10px] border border-[#29485d] bg-[#0b1d2c] p-8 text-center shadow-xl sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[10px] bg-[#b4ff45] text-[#07131e]"><Shield size={30} /></div>
        <p className="mt-6 font-heading text-sm uppercase tracking-[.28em] text-[#b4ff45]">Módulo en preparación</p>
        <h1 className="mt-3 font-heading text-4xl font-black uppercase">Participantes</h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-400">Esta sección estará disponible en próximas actualizaciones. Mientras tanto, el botón permanece visible pero no se puede utilizar.</p>
      </section>
    </div>
  </main>
}

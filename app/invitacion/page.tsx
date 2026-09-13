'use client'

import { FormEvent, useState } from 'react'
export default function InvitationPage() {
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('La validación de invitaciones se activará al ejecutar la migración de Supabase.')
  }

  return (
    <main className="min-h-screen bg-[#f3f6f8] px-5 py-12 lg:ml-64 lg:px-10">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="font-heading text-sm uppercase tracking-[.28em] text-[#4c8500]">Participación</p>
        <h1 className="mt-2 font-heading text-4xl font-black uppercase text-[#081522]">Ingresar por invitación</h1>
        <p className="mt-3 text-slate-600">Introduce el código temporal que te proporcionó la organización.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-sm font-bold text-[#17212b]">Código de invitación<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required maxLength={32} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-mono uppercase outline-none focus:border-[#72b800]" placeholder="AX-XXXXXX" /></label>
          <button type="submit" className="w-full rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#081522]">Confirmar participación</button>
        </form>
        {message && <p role="status" className="mt-5 rounded-xl bg-[#081522] p-4 text-sm font-semibold text-white">{message}</p>}
      </div>
    </main>
  )
}

'use client'

import { useState } from 'react'
import SiteFooter, { ATHLONX_CONTACT_EMAIL, ATHLONX_WHATSAPP_NUMBER } from '../../Components/site-footer'

type ContactForm = {
  name: string
  email: string
  phone: string
  organization: string
  message: string
}

const emptyForm: ContactForm = { name: '', email: '', phone: '', organization: '', message: '' }

// Arma el texto que se envía por WhatsApp con los datos del formulario.
function buildWhatsAppMessage(form: ContactForm) {
  const lines: (string | null)[] = [
    'Hola AthlonX, quiero más información.',
    '',
    `Nombre: ${form.name}`,
    form.email ? `Correo: ${form.email}` : null,
    form.phone ? `Teléfono: ${form.phone}` : null,
    form.organization ? `Organización o equipo: ${form.organization}` : null,
    '',
    form.message,
  ]
  return lines.filter((line): line is string => line !== null).join('\n')
}

const inputClass =
  'w-full rounded-[5px] border border-white/15 bg-[#07131E] px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#B4FF45]'

export default function ContactanosPage() {
  const [form, setForm] = useState<ContactForm>(emptyForm)

  function updateField(field: keyof ContactForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  // El botón de envío abre WhatsApp con el mensaje ya escrito.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const url = `https://wa.me/${ATHLONX_WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsAppMessage(form))}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <main className="text-white">

      <section className="px-6 pb-12 pt-16 md:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <p className="font-heading mb-6 text-xs font-semibold uppercase tracking-[.30em] text-slate-300">Contáctanos</p>
          <h1 className="font-display text-6xl font-black uppercase leading-[.9] tracking-wide md:text-8xl">
            Escríbenos y seguimos
            <span className="block text-[#B4FF45]">por WhatsApp</span>
          </h1>
        </div>
      </section>

      <section className="px-6 pb-24 md:px-14 lg:px-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.4fr_1fr]">
          <form onSubmit={handleSubmit} className="rounded-[10px] border border-white/15 bg-[#0b1d2c]/85 p-6 backdrop-blur-sm md:p-10">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="font-heading mb-2 block text-sm font-bold uppercase tracking-[.15em] text-slate-300">Nombre</span>
                <input required value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Tu nombre completo" className={inputClass} />
              </label>
              <label className="block">
                <span className="font-heading mb-2 block text-sm font-bold uppercase tracking-[.15em] text-slate-300">Correo</span>
                <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="tu@correo.com" className={inputClass} />
              </label>
              <label className="block">
                <span className="font-heading mb-2 block text-sm font-bold uppercase tracking-[.15em] text-slate-300">Teléfono (opcional)</span>
                <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+507 0000-0000" className={inputClass} />
              </label>
              <label className="block">
                <span className="font-heading mb-2 block text-sm font-bold uppercase tracking-[.15em] text-slate-300">Organización o equipo (opcional)</span>
                <input value={form.organization} onChange={(e) => updateField('organization', e.target.value)} placeholder="Nombre de tu institución" className={inputClass} />
              </label>
            </div>
            <label className="mt-5 block">
              <span className="font-heading mb-2 block text-sm font-bold uppercase tracking-[.15em] text-slate-300">Mensaje</span>
              <textarea required rows={5} value={form.message} onChange={(e) => updateField('message', e.target.value)} placeholder="Cuéntanos qué necesitas organizar" className={`${inputClass} resize-none`} />
            </label>
            <button type="submit" className="font-heading mt-6 inline-flex w-full items-center justify-center rounded-[5px] bg-[#B4FF45] px-6 py-4 text-xl font-bold uppercase tracking-wide text-[#07131E] transition hover:bg-[#c8ff7a]">
              Enviar por WhatsApp
            </button>
            <p className="mt-4 text-sm text-slate-400">Al enviar, se abrirá WhatsApp con tu mensaje listo para enviar.</p>
          </form>

          <aside className="grid content-start gap-4">
            <div className="rounded-[10px] border border-white/15 bg-[#0b1d2c]/85 p-6 backdrop-blur-sm">
              <p className="font-heading text-sm font-bold uppercase tracking-[.2em] text-[#B4FF45]">WhatsApp</p>
              <p className="mt-2 text-xl font-semibold">+507 6559-1976</p>
            </div>
            <div className="rounded-[10px] border border-white/15 bg-[#0b1d2c]/85 p-6 backdrop-blur-sm">
              <p className="font-heading text-sm font-bold uppercase tracking-[.2em] text-[#B4FF45]">Instagram</p>
              <a href="https://www.instagram.com/athlonx.pan" target="_blank" rel="noopener noreferrer" className="mt-2 block text-xl font-semibold transition hover:text-[#B4FF45]">@athlonx.pan</a>
            </div>
            <div className="rounded-[10px] border border-white/15 bg-[#0b1d2c]/85 p-6 backdrop-blur-sm">
              <p className="font-heading text-sm font-bold uppercase tracking-[.2em] text-[#B4FF45]">Correo</p>
              <a href={`mailto:${ATHLONX_CONTACT_EMAIL}`} className="mt-2 block break-all text-xl font-semibold transition hover:text-[#B4FF45]">{ATHLONX_CONTACT_EMAIL}</a>
            </div>
          </aside>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}

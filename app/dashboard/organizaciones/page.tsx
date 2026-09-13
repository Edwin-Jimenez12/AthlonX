'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Organization = { id: string; name: string; type: string; country: string; city: string | null; description: string | null; slug: string | null }

const organizationTypes = [
  ['organizacion_deportiva', 'Organización deportiva'],
  ['federacion', 'Federación'],
  ['union', 'Unión'],
  ['liga', 'Liga'],
  ['equipo', 'Equipo'],
] as const

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState('organizacion_deportiva')
  const [country, setCountry] = useState('Panamá')
  const [city, setCity] = useState('')
  const [email, setEmail] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState('')
  const [message, setMessage] = useState('')

  async function loadOrganizations() {
    if (!supabase) return
    const { data } = await supabase.from('organizations').select('id, name, type, country, city, description, slug').order('created_at', { ascending: false })
    setOrganizations(data ?? [])
  }

  useEffect(() => { void loadOrganizations() }, [])

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    if (!supabase) return setMessage('Supabase no está configurado.')
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return setMessage('Debes iniciar sesión para crear una organización.')
    const { data, error } = await supabase.from('organizations').insert({ name: name.trim(), type, country: country.trim(), city: city.trim() || null, institutional_email: email.trim() || null, description: description.trim() || null, slug: slugify(name), parent_organization_id: parentId || null, created_by: userData.user.id }).select('id, name, type, country, city, description, slug').single()
    if (error) return setMessage(error.message)
    if (data) {
      setOrganizations((current) => [data, ...current])
      setName('')
      setCity('')
      setEmail('')
      setDescription('')
      setParentId('')
      setMessage('Organización creada correctamente en Supabase.')
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f6f8] px-5 py-8 lg:ml-64 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header><p className="font-heading text-sm uppercase tracking-[.28em] text-[#4c8500]">Estructura institucional</p><h1 className="mt-2 font-heading text-5xl font-black uppercase text-[#081522]">Organizaciones</h1><p className="mt-2 text-slate-600">Crea perfiles para federaciones, ligas, equipos y organizaciones deportivas.</p></header>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <form onSubmit={createOrganization} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-heading text-2xl font-black uppercase text-[#081522]">Nueva organización</h2>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-bold text-[#17212b]">Nombre<input value={name} onChange={(event) => setName(event.target.value)} required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Nex Digital" /></label>
              <label className="block text-sm font-bold text-[#17212b]">Tipo<select value={type} onChange={(event) => setType(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3">{organizationTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="block text-sm font-bold text-[#17212b]">Organización superior opcional<select value={parentId} onChange={(event) => setParentId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"><option value="">Ninguna</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-[#17212b]">País<input value={country} onChange={(event) => setCountry(event.target.value)} required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label><label className="block text-sm font-bold text-[#17212b]">Ciudad<input value={city} onChange={(event) => setCity(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label></div>
              <label className="block text-sm font-bold text-[#17212b]">Correo institucional<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="contacto@nexdigital.com" /></label>
              <label className="block text-sm font-bold text-[#17212b]">Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
            </div>
            <button type="submit" className="mt-6 w-full rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#081522]">Crear organización</button>
          </form>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-heading text-2xl font-black uppercase text-[#081522]">Mis organizaciones</h2><div className="mt-5 space-y-3">{organizations.length ? organizations.map((organization) => <article key={organization.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-heading text-xl font-black uppercase text-[#081522]">{organization.name}</h3><p className="mt-1 text-sm capitalize text-[#4c8500]">{organizationTypes.find(([value]) => value === organization.type)?.[1] ?? organization.type}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#b4ff45] font-heading font-black text-[#081522]">{organization.name.slice(0, 2).toUpperCase()}</span></div><p className="mt-3 text-sm text-slate-500">{organization.city || organization.country}</p><p className="mt-1 font-mono text-xs text-slate-400">/{organization.slug || slugify(organization.name)}</p></article>) : <p className="text-slate-500">Todavía no tienes organizaciones registradas.</p>}</div></section>
        </div>
        {message && <div role="status" className="rounded-xl bg-[#081522] p-4 font-semibold text-white">{message}</div>}
      </div>
    </main>
  )
}

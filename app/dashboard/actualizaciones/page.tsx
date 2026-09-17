'use client'

import { Archive, Edit3, Eye, Megaphone, Plus, Save, X } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type PlatformUpdate = { id: string; title: string; summary: string; content: string | null; category: string; version: string | null; is_published: boolean; published_at: string | null; created_at: string }

const categories = ['Nueva función', 'Mejora', 'Corrección', 'Aviso']

export default function UpdatesAdminPage() {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updates, setUpdates] = useState<PlatformUpdate[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [version, setVersion] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [message, setMessage] = useState('')

  async function loadData() {
    if (!supabase) return setLoading(false)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return setLoading(false)
    const { data: admin } = await supabase.from('platform_update_admins').select('user_id').eq('user_id', userData.user.id).maybeSingle()
    if (!admin) return setLoading(false)
    setAuthorized(true)
    const { data } = await supabase.from('platform_updates').select('id, title, summary, content, category, version, is_published, published_at, created_at').order('created_at', { ascending: false })
    setUpdates(data ?? [])
    setLoading(false)
  }

  useEffect(() => { void loadData() }, [])

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setSummary('')
    setContent('')
    setCategory(categories[0])
    setVersion('')
    setIsPublished(true)
  }

  function editUpdate(update: PlatformUpdate) {
    setEditingId(update.id)
    setTitle(update.title)
    setSummary(update.summary)
    setContent(update.content || '')
    setCategory(update.category)
    setVersion(update.version || '')
    setIsPublished(update.is_published)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    if (!supabase || !title.trim() || !summary.trim()) return setMessage('Completa el título y el resumen.')
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return setMessage('Tu sesión expiró. Inicia sesión nuevamente.')
    const payload = { title: title.trim(), summary: summary.trim(), content: content.trim() || null, category, version: version.trim() || null, is_published: isPublished, published_at: isPublished ? new Date().toISOString() : null }
    const query = editingId
      ? supabase.from('platform_updates').update(payload).eq('id', editingId)
      : supabase.from('platform_updates').insert({ ...payload, created_by: userData.user.id })
    const { error } = await query
    if (error) return setMessage(error.message)
    setMessage(editingId ? 'Actualización guardada.' : 'Actualización creada.')
    resetForm()
    await loadData()
  }

  async function archiveUpdate(id: string) {
    if (!supabase) return
    const { error } = await supabase.from('platform_updates').update({ is_published: false, published_at: null }).eq('id', id)
    if (error) return setMessage(error.message)
    setMessage('Actualización archivada.')
    await loadData()
  }

  if (loading) return <main className="min-h-screen bg-[#07131e] px-6 py-12 text-white lg:ml-64">Cargando panel de actualizaciones...</main>
  if (!authorized) return <main className="min-h-screen bg-[#07131e] px-6 py-12 text-white lg:ml-64"><div className="mx-auto max-w-3xl rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-8"><p className="text-xs font-bold uppercase tracking-[.25em] text-[#b4ff45]">Acceso restringido</p><h1 className="mt-3 font-display text-5xl uppercase">Actualizaciones</h1><p className="mt-3 text-slate-400">Este panel está disponible únicamente para administradores de plataforma.</p></div></main>

  return <main className="min-h-screen bg-[#07131e] px-5 py-8 text-white lg:ml-64 lg:px-10"><div className="mx-auto max-w-7xl space-y-8"><header className="flex flex-col justify-between gap-4 border-b border-[#1f4057] pb-8 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.3em] text-[#b4ff45]">Centro de contenido</p><h1 className="mt-3 font-display text-5xl uppercase sm:text-6xl">Actualizaciones</h1><p className="mt-3 max-w-2xl text-slate-400">Publica novedades, mejoras y avisos de AthlonX sin modificar el código.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#b4ff45]/30 bg-[#b4ff45]/10 px-4 py-2 text-sm font-semibold text-[#d9ffaf]"><Megaphone size={16} />{updates.filter((update) => update.is_published).length} publicadas</span></header><div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]"><form onSubmit={saveUpdate} className="h-fit rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">{editingId ? 'Editar contenido' : 'Nueva publicación'}</p><h2 className="mt-2 font-heading text-2xl font-bold uppercase">{editingId ? 'Actualizar novedad' : 'Crear actualización'}</h2></div>{editingId ? <button type="button" onClick={resetForm} aria-label="Cancelar edición" className="cursor-pointer rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X size={18} /></button> : <Plus className="text-[#b4ff45]" size={22} />}</div><div className="mt-6 space-y-4"><label className="block text-sm font-semibold">Título<input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#07131e] px-4 py-3 text-white outline-none focus:border-[#b4ff45]" placeholder="Nuevo centro de eventos" /></label><label className="block text-sm font-semibold">Resumen<textarea required value={summary} onChange={(event) => setSummary(event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-xl border border-white/15 bg-[#07131e] px-4 py-3 text-white outline-none focus:border-[#b4ff45]" placeholder="Describe brevemente la actualización..." /></label><label className="block text-sm font-semibold">Contenido ampliado <span className="font-normal text-slate-500">(opcional)</span><textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} className="mt-2 w-full resize-none rounded-xl border border-white/15 bg-[#07131e] px-4 py-3 text-white outline-none focus:border-[#b4ff45]" placeholder="Detalles para la futura vista completa..." /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Categoría<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full cursor-pointer rounded-xl border border-white/15 bg-[#07131e] px-4 py-3 text-white outline-none focus:border-[#b4ff45]">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block text-sm font-semibold">Versión <span className="font-normal text-slate-500">(opcional)</span><input value={version} onChange={(event) => setVersion(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#07131e] px-4 py-3 text-white outline-none focus:border-[#b4ff45]" placeholder="0.9" /></label></div><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm font-semibold"><input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} className="h-4 w-4 accent-[#b4ff45]" />Publicar inmediatamente</label></div>{message && <p role="status" className="mt-5 rounded-xl border border-[#b4ff45]/30 bg-[#b4ff45]/10 p-3 text-sm text-[#d9ffaf]">{message}</p>}<button type="submit" className="mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#b4ff45] px-5 py-3 font-bold text-[#07131e] transition hover:bg-[#c8ff7a]"><Save size={17} />{editingId ? 'Guardar cambios' : 'Publicar actualización'}</button></form><section className="rounded-3xl border border-[#29485d] bg-[#0b1d2c] p-6 sm:p-8"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b4ff45]">Biblioteca</p><h2 className="mt-2 font-heading text-2xl font-bold uppercase">Tus publicaciones</h2></div><Eye className="text-slate-400" size={21} /></div><div className="mt-6 space-y-3">{updates.length ? updates.map((update) => <article key={update.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${update.is_published ? 'bg-[#b4ff45] text-[#07131e]' : 'bg-white/10 text-slate-400'}`}>{update.is_published ? 'Publicada' : 'Borrador'}</span><span className="text-xs text-[#b4ff45]">{update.category}</span>{update.version && <span className="font-mono text-xs text-slate-500">v{update.version}</span>}</div><h3 className="mt-3 font-heading text-xl font-semibold">{update.title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{update.summary}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => editUpdate(update)} aria-label={`Editar ${update.title}`} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-300 hover:border-[#b4ff45] hover:text-[#b4ff45]"><Edit3 size={14} />Editar</button>{update.is_published && <button type="button" onClick={() => void archiveUpdate(update.id)} aria-label={`Archivar ${update.title}`} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#ff7d88]/30 px-3 py-2 text-xs font-bold text-[#ff9ca5] hover:bg-[#ff7d88]/10"><Archive size={14} />Archivar</button>}</div></div></article>) : <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-500">Todavía no hay actualizaciones.</p>}</div></section></div></div></main>
}

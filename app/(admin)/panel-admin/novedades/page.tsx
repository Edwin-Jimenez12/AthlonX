'use client'

import { Info, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { callPanel, useAdminAccess } from '../../../../Components/admin/admin-shell'
import { Button, Card, CardHeader, FieldLabel, Notice, PageHeader, inputClass } from '../../../../Components/mi-equipo/ui'
import { hasPermission, validateRelease } from '../../../../lib/admin'

type Section = { title: string; body: string }
type Release = { id: string; version: string; title: string; status: 'borrador' | 'publicada'; published_at: string | null; sections: Section[] }
type Draft = { id: string | null; version: string; title: string; sections: Section[] }

const emptyDraft: Draft = { id: null, version: '', title: '', sections: [{ title: '', body: '' }] }

export default function NovedadesAdminPage() {
  const access = useAdminAccess()
  const canEdit = hasPermission(access, 'novedades')
  const [releases, setReleases] = useState<Release[]>([])
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [status, setStatus] = useState<'borrador' | 'publicada'>('borrador')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  async function load() {
    setReleases(await callPanel<Release[]>('platform_list_releases'))
  }

  useEffect(() => {
    if (!canEdit) return
    load().catch((err: Error) => setMessage({ tone: 'danger', text: err.message }))
    // Carga inicial de las versiones.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit])

  if (!canEdit) return <Notice tone="warning" icon={Info}>No tienes permiso para gestionar novedades.</Notice>

  function openRelease(release: Release) {
    setDraft({ id: release.id, version: release.version, title: release.title, sections: release.sections.length ? release.sections : [{ title: '', body: '' }] })
    setStatus(release.status)
  }

  function setSection(index: number, key: keyof Section, value: string) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, i) => (i === index ? { ...section, [key]: value } : section)),
    }))
  }

  async function save(nextStatus: 'borrador' | 'publicada') {
    const problem = validateRelease({ version: draft.version, title: draft.title, sections: draft.sections })
    if (problem) return setMessage({ tone: 'danger', text: problem })
    setSaving(true)
    setMessage(null)
    try {
      await callPanel('platform_save_release', {
        p_id: draft.id,
        p_version: draft.version.trim(),
        p_title: draft.title.trim(),
        p_status: nextStatus,
        p_sections: draft.sections.map((s) => ({ title: s.title.trim(), body: s.body.trim() })),
      })
      setStatus(nextStatus)
      setMessage({ tone: 'success', text: nextStatus === 'publicada' ? 'Versión publicada.' : 'Borrador guardado.' })
      await load()
    } catch (err) {
      setMessage({ tone: 'danger', text: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Novedades" actions={<Button variant="primary" onClick={() => setDraft(emptyDraft)}>Nueva versión</Button>} />
      {message && <Notice tone={message.tone === 'success' ? 'success' : 'danger'} icon={Info}>{message.text}</Notice>}
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card>
          <CardHeader id="novedades-lista" title="Versiones" />
          <ul className="mt-5 space-y-2">
            {releases.map((release) => (
              <li key={release.id}>
                <button type="button" onClick={() => openRelease(release)} className="w-full rounded-[14px] border border-[var(--ax-line)] p-4 text-left hover:border-[var(--ax-line-strong)]">
                  <span className="block font-display text-[26px] uppercase leading-none text-[var(--ax-accent-text)]">{release.version}</span>
                  <span className="mt-2 block text-sm text-[var(--ax-text)]">{release.title}</span>
                  <span className="mt-1 block text-xs text-[var(--ax-muted)]">{release.status === 'publicada' ? 'Publicada' : 'Borrador'}</span>
                </button>
              </li>
            ))}
            {releases.length === 0 && <li className="text-sm text-[var(--ax-muted)]">Todavía no hay versiones.</li>}
          </ul>
        </Card>

        <Card>
          <CardHeader id="novedades-editor" title={draft.id ? `Editar ${draft.version}` : 'Nueva versión'} size="lg" />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="block">
              <FieldLabel>Código de versión</FieldLabel>
              <input className={inputClass} placeholder="v2.5.0" value={draft.version} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, version: e.target.value })} />
            </label>
            <label className="block">
              <FieldLabel>Título de la versión</FieldLabel>
              <input className={inputClass} value={draft.title} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </label>
          </div>

          <div className="mt-8 space-y-5">
            {draft.sections.map((section, index) => (
              <div key={index} className="rounded-[14px] border border-[var(--ax-line)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--ax-muted)]">Sección {index + 1}</p>
                  {draft.sections.length > 1 && (
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setDraft({ ...draft, sections: draft.sections.filter((_, i) => i !== index) })}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ax-muted)] hover:text-[var(--ax-text)]"
                    >
                      <Trash2 size={14} aria-hidden="true" /> Quitar
                    </button>
                  )}
                </div>
                <label className="mt-4 block">
                  <FieldLabel>Título de la sección</FieldLabel>
                  <input className={inputClass} value={section.title} disabled={!canEdit} onChange={(e) => setSection(index, 'title', e.target.value)} />
                </label>
                <label className="mt-4 block">
                  <FieldLabel>Párrafo</FieldLabel>
                  <textarea className={`${inputClass} min-h-28 py-3`} value={section.body} disabled={!canEdit} onChange={(e) => setSection(index, 'body', e.target.value)} />
                </label>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" icon={Plus} disabled={!canEdit} onClick={() => setDraft({ ...draft, sections: [...draft.sections, { title: '', body: '' }] })}>
              Agregar sección
            </Button>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" disabled={!canEdit || saving} onClick={() => void save('borrador')}>Guardar borrador</Button>
              <Button variant="primary" disabled={!canEdit || saving} onClick={() => void save('publicada')}>
                {status === 'publicada' ? 'Actualizar versión' : 'Publicar versión'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}

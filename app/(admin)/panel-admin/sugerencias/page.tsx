'use client'

import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Kpi, callPanel, useAdminAccess } from '../../../../Components/admin/admin-shell'
import { Card, CardHeader, Notice, PageHeader, Segment } from '../../../../Components/mi-equipo/ui'
import { hasPermission } from '../../../../lib/admin'

type Item = {
  id: string
  kind: 'sugerencia' | 'valoracion'
  category: string | null
  other_category_name: string | null
  title: string | null
  body: string
  rating: number | null
  status: string
  created_at: string
  is_anonymous: boolean
  publish_identity: boolean
  author_name: string | null
}

type Inbox = {
  resumen: { recibidas: number; en_revision: number; planeadas: number; valoracion_promedio: number | null; valoraciones: number }
  items: Item[]
}

const categoryLabels: Record<string, string> = { mejora: 'Mejora', nueva_funcion: 'Nueva función', error: 'Error', otra: 'Otra' }
const statusLabels: Record<string, string> = { recibida: 'Recibida', en_revision: 'En revisión', planeada: 'Planeada', lista: 'Lista', descartada: 'Descartada' }

function itemName(item: Item) {
  if (item.kind === 'valoracion') return `${'★'.repeat(item.rating ?? 0)}${'☆'.repeat(5 - (item.rating ?? 0))}`
  return item.title || 'Sin título'
}

function authorLabel(item: Item) {
  if (item.is_anonymous || !item.author_name) return 'Anónimo'
  return item.author_name
}

export default function SugerenciasPage() {
  const access = useAdminAccess()
  const allowed = hasPermission(access, 'sugerencias')
  const [filter, setFilter] = useState<'todas' | 'sugerencia' | 'valoracion'>('todas')
  const [inbox, setInbox] = useState<Inbox | null>(null)
  const [selected, setSelected] = useState<Item | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!allowed) return
    callPanel<Inbox>('platform_list_suggestions', { p_kind: filter === 'todas' ? null : filter })
      .then((data) => {
        setInbox(data)
        setSelected(data.items[0] ?? null)
      })
      .catch((err: Error) => setError(err.message))
  }, [allowed, filter])

  if (!allowed) return <Notice tone="warning" icon={Info}>No tienes permiso para ver sugerencias.</Notice>

  const resumen = inbox?.resumen

  return (
    <>
      <PageHeader title="Sugerencias" />
      {error && <Notice tone="danger" icon={Info}>{error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Recibidas" value={String(resumen?.recibidas ?? 0)} />
        <Kpi label="En revisión" value={String(resumen?.en_revision ?? 0)} />
        <Kpi label="Planeadas" value={String(resumen?.planeadas ?? 0)} />
        <Kpi label="Valoración promedio" value={resumen?.valoracion_promedio ? `${resumen.valoracion_promedio} ★` : '—'} hint={`${resumen?.valoraciones ?? 0} valoraciones`} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Segment active={filter === 'todas'} label="Todas" onClick={() => setFilter('todas')} />
        <Segment active={filter === 'sugerencia'} label="Sugerencias" onClick={() => setFilter('sugerencia')} />
        <Segment active={filter === 'valoracion'} label="Valoraciones" onClick={() => setFilter('valoracion')} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader id="sug-lista" title="Bandeja" />
          <ul className="mt-5 space-y-2">
            {(inbox?.items ?? []).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  aria-current={selected?.id === item.id ? 'true' : undefined}
                  className={
                    selected?.id === item.id
                      ? 'w-full rounded-[14px] border border-[var(--ax-accent)] p-4 text-left'
                      : 'w-full rounded-[14px] border border-[var(--ax-line)] p-4 text-left hover:border-[var(--ax-line-strong)]'
                  }
                >
                  <span className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--ax-muted)]">
                    <span>{item.kind === 'valoracion' ? 'Valoración' : 'Sugerencia'}</span>
                    <span>{new Date(item.created_at).toLocaleDateString('es-PA', { day: '2-digit', month: 'short' })}</span>
                  </span>
                  <span className="mt-2 block text-[15px] font-semibold text-[var(--ax-text)]">{itemName(item)}</span>
                  <span className="mt-1 block text-xs text-[var(--ax-muted)]">{authorLabel(item)} · {statusLabels[item.status] ?? item.status}</span>
                </button>
              </li>
            ))}
          </ul>
          {inbox && inbox.items.length === 0 && <p className="mt-5 text-sm text-[var(--ax-muted)]">Todavía no hay envíos.</p>}
        </Card>

        <Card>
          <CardHeader id="sug-detalle" title="Detalle" />
          {selected ? (
            <div className="mt-5 space-y-4 text-sm">
              <p className="font-display text-[30px] uppercase leading-none text-[var(--ax-accent-text)]">{itemName(selected)}</p>
              {selected.kind === 'sugerencia' && (
                <p className="text-[var(--ax-muted)]">
                  Categoría: {selected.category === 'otra' ? selected.other_category_name : categoryLabels[selected.category ?? ''] ?? '—'}
                </p>
              )}
              <p className="text-[var(--ax-muted)]">Autor: {authorLabel(selected)}</p>
              <p className="whitespace-pre-line leading-6 text-[var(--ax-text)]">{selected.body}</p>
              {selected.kind === 'valoracion' && (
                <p className="text-[var(--ax-muted)]">
                  {selected.publish_identity ? 'El autor autorizó publicar su valoración con nombre y foto.' : 'La valoración no se publica con identidad.'}
                </p>
              )}
              <p className="text-[var(--ax-muted)]">Estado: {statusLabels[selected.status] ?? selected.status}</p>
            </div>
          ) : (
            <p className="mt-5 text-sm text-[var(--ax-muted)]">Elige un envío de la bandeja.</p>
          )}
        </Card>
      </div>
    </>
  )
}

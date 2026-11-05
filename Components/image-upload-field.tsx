'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { clampFrameOffset, frameScale, frameSizes, maxMargin, sourceCropFromFrame, type ImageKind } from '../lib/image-compress'
import { uploadProfileImage } from '../lib/image-upload'

type Pending = { file: File; url: string; imgWidth: number; imgHeight: number }

function readSize(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error('No se pudo leer esa imagen. Prueba con JPG, PNG o WebP.'))
    image.src = url
  })
}

// Sube una imagen: el usuario ajusta el encuadre y el navegador la comprime antes de enviarla.
export function ImageUploadField({ label, value, kind, folder, slot, disabled = false, hint, onChange }: {
  label: string
  value: string | null
  kind: ImageKind
  folder: string
  slot: string
  disabled?: boolean
  hint?: string
  onChange: (url: string | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  // Margen alrededor de la imagen (fracción del recuadro): evita que choque con el borde.
  const [margin, setMargin] = useState(0.1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const frame = frameSizes[kind]

  useEffect(() => () => { if (pending) URL.revokeObjectURL(pending.url) }, [pending])

  function centered(imgWidth: number, imgHeight: number, nextZoom: number) {
    const scale = frameScale(imgWidth, imgHeight, frame.width, frame.height, nextZoom)
    return clampFrameOffset((frame.width - imgWidth * scale) / 2, (frame.height - imgHeight * scale) / 2, imgWidth, imgHeight, frame.width, frame.height, scale)
  }

  async function pick(file: File | undefined) {
    if (!file) return
    setError('')
    try {
      const url = URL.createObjectURL(file)
      const size = await readSize(url).catch((cause) => { URL.revokeObjectURL(url); throw cause })
      setPending({ file, url, imgWidth: size.width, imgHeight: size.height })
      setZoom(1)
      setMargin(0.1)
      setOffset(centered(size.width, size.height, 1))
    } catch (cause) {
      setError((cause as Error).message || 'No se pudo abrir la imagen.')
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  function changeZoom(nextZoom: number) {
    if (!pending) return
    setZoom(nextZoom)
    setOffset(centered(pending.imgWidth, pending.imgHeight, nextZoom))
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, startX: offset.x, startY: offset.y }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pending || !drag.current) return
    const scale = frameScale(pending.imgWidth, pending.imgHeight, frame.width, frame.height, zoom)
    const k = 1 - 2 * margin
    const next = clampFrameOffset(
      drag.current.startX + (event.clientX - drag.current.x) / k,
      drag.current.startY + (event.clientY - drag.current.y) / k,
      pending.imgWidth, pending.imgHeight, frame.width, frame.height, scale,
    )
    setOffset(next)
  }

  function closeCrop() {
    if (pending) URL.revokeObjectURL(pending.url)
    setPending(null)
    drag.current = null
  }

  async function confirm() {
    if (!pending) return
    setBusy(true)
    setError('')
    try {
      const crop = sourceCropFromFrame(pending.imgWidth, pending.imgHeight, frame.width, frame.height, zoom, offset.x, offset.y)
      const url = await uploadProfileImage(pending.file, kind, folder, slot, crop, margin)
      onChange(url)
      closeCrop()
    } catch (cause) {
      setError((cause as Error).message || 'No se pudo subir la imagen.')
    } finally {
      setBusy(false)
    }
  }

  const button = 'inline-flex h-10 cursor-pointer items-center rounded-[10px] border border-[var(--ax-line-strong)] px-4 text-[13px] font-semibold text-[var(--ax-text)] transition-colors hover:bg-[var(--ax-hover)] disabled:cursor-not-allowed disabled:opacity-50'
  const primary = 'inline-flex h-10 cursor-pointer items-center rounded-[10px] bg-[var(--ax-accent)] px-4 text-[13px] font-bold text-[var(--ax-on-accent)] disabled:cursor-not-allowed disabled:opacity-50'
  const preview = kind === 'avatar' ? 'h-24 w-24 rounded-[14px]' : 'h-28 w-full max-w-md rounded-[14px]'
  const scale = pending ? frameScale(pending.imgWidth, pending.imgHeight, frame.width, frame.height, zoom) : 1
  const previewWidth = kind === 'avatar' ? 80 : 160
  const previewK = previewWidth / frame.width
  // La imagen ocupa el recuadro menos el margen: k es esa proporción.
  const k = 1 - 2 * margin
  const inset = { left: margin * frame.width, top: margin * frame.height }

  return <div className="space-y-2">
    <p className="text-sm font-semibold text-[var(--ax-text)]">{label}</p>
    {!pending && <div className="flex flex-wrap items-center gap-3">
      <div className={`${preview} flex items-center justify-center overflow-hidden border border-[var(--ax-line)] bg-[var(--ax-surface-raised)]`}>
        {value
          ? <img src={value} alt="" className="h-full w-full object-cover" />
          : <span className="px-2 text-center text-xs text-[var(--ax-muted)]">Sin imagen</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled || busy} onClick={() => input.current?.click()} className={button}>{value ? 'Cambiar imagen' : 'Subir imagen'}</button>
        {value && <button type="button" disabled={disabled || busy} onClick={() => onChange(null)} className={button}>Quitar</button>}
      </div>
    </div>}
    {pending && <div className="space-y-4 rounded-[14px] border border-[var(--ax-line-strong)] bg-[var(--ax-surface-sunken)] p-4">
      <p className="text-xs text-[var(--ax-muted)]">Arrastra la imagen para elegir la parte visible y ajusta el zoom.</p>
      <div className="flex flex-wrap items-start gap-4">
        <div
          role="application"
          aria-label="Encuadre de la imagen"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => { drag.current = null }}
          onPointerCancel={() => { drag.current = null }}
          style={{ width: frame.width, height: frame.height }}
          className="relative max-w-full cursor-grab touch-none select-none overflow-hidden rounded-[10px] border border-[var(--ax-accent-line)] bg-[var(--ax-surface-raised)] active:cursor-grabbing"
        >
          <img
            src={pending.url}
            alt=""
            draggable={false}
            style={{ left: inset.left + offset.x * k, top: inset.top + offset.y * k, width: pending.imgWidth * scale * k, height: pending.imgHeight * scale * k, maxWidth: 'none' }}
            className="pointer-events-none absolute"
          />
        </div>
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold text-[var(--ax-text)]">Así se verá</p>
          <div style={{ width: previewWidth, height: frame.height * previewK }} className={`${kind === 'avatar' ? 'rounded-full' : 'rounded-[10px]'} relative overflow-hidden border border-[var(--ax-line)]`}>
            <img src={pending.url} alt="" draggable={false} style={{ left: (inset.left + offset.x * k) * previewK, top: (inset.top + offset.y * k) * previewK, width: pending.imgWidth * scale * k * previewK, height: pending.imgHeight * scale * k * previewK, maxWidth: 'none' }} className="pointer-events-none absolute" />
          </div>
          <label className="block text-xs text-[var(--ax-muted)]">
            Margen (espacio alrededor)
            <input type="range" min={0} max={maxMargin} step={0.01} value={margin} disabled={busy} onChange={(event) => setMargin(Number(event.target.value))} className="mt-1 block w-full" />
          </label>
          <label className="block text-xs text-[var(--ax-muted)]">
            Zoom
            <input type="range" min={1} max={3} step={0.05} value={zoom} disabled={busy} onChange={(event) => changeZoom(Number(event.target.value))} className="mt-1 block w-full" />
          </label>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={confirm} className={primary}>{busy ? 'Comprimiendo y subiendo…' : 'Guardar imagen'}</button>
        <button type="button" disabled={busy} onClick={closeCrop} className={button}>Cancelar</button>
      </div>
    </div>}
    <input ref={input} type="file" accept="image/*" className="sr-only" aria-label={label} disabled={disabled || busy} onChange={(event) => void pick(event.target.files?.[0])} />
    {hint && !pending && <p className="text-xs text-[var(--ax-muted)]">{hint}</p>}
    {error && <p role="alert" className="text-xs text-red-200">{error}</p>}
  </div>
}

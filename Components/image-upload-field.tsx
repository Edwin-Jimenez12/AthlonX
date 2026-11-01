'use client'

import { useRef, useState } from 'react'
import type { ImageKind } from '../lib/image-compress'
import { uploadProfileImage } from '../lib/image-upload'

// Sube una imagen grande: el navegador la comprime antes de enviarla al almacenamiento.
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pick(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      onChange(await uploadProfileImage(file, kind, folder, slot))
    } catch (cause) {
      setError((cause as Error).message || 'No se pudo subir la imagen.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const frame = kind === 'avatar' ? 'h-24 w-24 rounded-[14px]' : 'h-28 w-full max-w-md rounded-[14px]'
  const button = 'inline-flex h-10 cursor-pointer items-center rounded-[10px] border border-[var(--ax-line-strong)] px-4 text-[13px] font-semibold text-[var(--ax-text)] transition-colors hover:bg-[var(--ax-hover)] disabled:cursor-not-allowed disabled:opacity-50'

  return <div className="space-y-2">
    <p className="text-sm font-semibold text-[var(--ax-text)]">{label}</p>
    <div className="flex flex-wrap items-center gap-3">
      <div className={`${frame} flex items-center justify-center overflow-hidden border border-[var(--ax-line)] bg-[var(--ax-surface-raised)]`}>
        {value
          ? <img src={value} alt="" className="h-full w-full object-cover" />
          : <span className="px-2 text-center text-xs text-[var(--ax-muted)]">Sin imagen</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled || busy} onClick={() => input.current?.click()} className={button}>
          {busy ? 'Comprimiendo y subiendo…' : value ? 'Cambiar imagen' : 'Subir imagen'}
        </button>
        {value && <button type="button" disabled={disabled || busy} onClick={() => onChange(null)} className={button}>Quitar</button>}
      </div>
    </div>
    <input ref={input} type="file" accept="image/*" className="sr-only" aria-label={label} disabled={disabled || busy} onChange={(event) => void pick(event.target.files?.[0])} />
    {hint && <p className="text-xs text-[var(--ax-muted)]">{hint}</p>}
    {error && <p role="alert" className="text-xs text-red-200">{error}</p>}
  </div>
}

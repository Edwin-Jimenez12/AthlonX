// Compresión de imágenes en el navegador antes de subirlas.
// Acepta archivos grandes, los recorta (centrado o con el encuadre del usuario) y los guarda en webp.

export type ImageKind = 'avatar' | 'banner'

export const imageTargets: Record<ImageKind, { width: number; height: number; maxBytes: number }> = {
  avatar: { width: 512, height: 512, maxBytes: 150 * 1024 },
  banner: { width: 1600, height: 480, maxBytes: 300 * 1024 },
}

// Tamaño del marco de encuadre en pantalla, con la misma proporción del destino.
export const frameSizes: Record<ImageKind, { width: number; height: number }> = {
  avatar: { width: 240, height: 240 },
  banner: { width: 480, height: 144 },
}

// Límite de lo que se acepta del disco; el archivo se comprime antes de subirse.
export const maxInputBytes = 25 * 1024 * 1024

export type SourceCrop = { sx: number; sy: number; sw: number; sh: number }

// Recorte centrado que cubre el destino sin deformar la imagen.
export function coverCropRect(srcWidth: number, srcHeight: number, targetWidth: number, targetHeight: number): SourceCrop {
  const targetRatio = targetWidth / targetHeight
  const srcRatio = srcWidth / srcHeight
  if (srcRatio > targetRatio) {
    const sw = Math.round(srcHeight * targetRatio)
    return { sx: Math.round((srcWidth - sw) / 2), sy: 0, sw, sh: srcHeight }
  }
  const sh = Math.round(srcWidth / targetRatio)
  return { sx: 0, sy: Math.round((srcHeight - sh) / 2), sw: srcWidth, sh }
}

// Escala a la que se dibuja la imagen dentro del marco: cubre el marco y luego aplica el zoom.
export function frameScale(imgWidth: number, imgHeight: number, frameWidth: number, frameHeight: number, zoom: number) {
  return Math.max(frameWidth / imgWidth, frameHeight / imgHeight) * zoom
}

// Zoom mínimo: el que muestra la imagen completa dentro del marco (sin recortar los lados).
export function fitZoom(imgWidth: number, imgHeight: number, frameWidth: number, frameHeight: number) {
  const fit = Math.min(frameWidth / imgWidth, frameHeight / imgHeight)
  const cover = Math.max(frameWidth / imgWidth, frameHeight / imgHeight)
  return fit / cover
}

// Si la imagen es más grande que el marco, no puede dejar huecos; si es más pequeña, se centra.
export function clampFrameOffset(x: number, y: number, imgWidth: number, imgHeight: number, frameWidth: number, frameHeight: number, scale: number) {
  const minX = frameWidth - imgWidth * scale
  const minY = frameHeight - imgHeight * scale
  const clampAxis = (value: number, min: number) => (min >= 0 ? min / 2 : Math.min(0, Math.max(min, value)))
  return { x: clampAxis(x, minX), y: clampAxis(y, minY) }
}

// Encuadre final: escala y posición de la imagen dentro del marco (en píxeles del marco).
export type FrameView = { scale: number; x: number; y: number; frameWidth: number; frameHeight: number }

export function defaultFrameView(imgWidth: number, imgHeight: number, frameWidth: number, frameHeight: number): FrameView {
  const scale = Math.max(frameWidth / imgWidth, frameHeight / imgHeight)
  return { scale, x: (frameWidth - imgWidth * scale) / 2, y: (frameHeight - imgHeight * scale) / 2, frameWidth, frameHeight }
}

// Traduce el encuadre visible (zoom y desplazamiento en pantalla) a la zona de la imagen original.
export function sourceCropFromFrame(imgWidth: number, imgHeight: number, frameWidth: number, frameHeight: number, zoom: number, x: number, y: number): SourceCrop {
  const scale = frameScale(imgWidth, imgHeight, frameWidth, frameHeight, zoom)
  const offset = clampFrameOffset(x, y, imgWidth, imgHeight, frameWidth, frameHeight, scale)
  return {
    sx: -offset.x / scale,
    sy: -offset.y / scale,
    sw: frameWidth / scale,
    sh: frameHeight / scale,
  }
}

export type CompressedImage = { blob: Blob; width: number; height: number; mime: string }

// Margen: fracción del tamaño de salida que queda vacía alrededor de la imagen (0 a 0.3).
export const maxMargin = 0.3

// Dibuja la imagen completa según el encuadre, dentro del área que deja el margen (lo demás queda transparente).
function render(bitmap: ImageBitmap, width: number, height: number, view: FrameView, margin = 0) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('El navegador no permite procesar imágenes.')
  context.imageSmoothingQuality = 'high'
  const inset = Math.min(Math.max(margin, 0), maxMargin)
  const innerX = width * inset
  const innerY = height * inset
  const innerW = width * (1 - 2 * inset)
  const innerH = height * (1 - 2 * inset)
  const kx = innerW / view.frameWidth
  const ky = innerH / view.frameHeight
  context.save()
  context.beginPath()
  context.rect(innerX, innerY, innerW, innerH)
  context.clip()
  context.drawImage(bitmap, innerX + view.x * kx, innerY + view.y * ky, bitmap.width * view.scale * kx, bitmap.height * view.scale * ky)
  context.restore()
  return canvas
}

function encode(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality))
}

// Recorta (centrado o con el encuadre dado) y baja calidad o tamaño hasta quedar bajo el límite del destino.
export async function compressImage(file: File, kind: ImageKind, view?: FrameView, margin = 0): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) throw new Error('Elige un archivo de imagen.')
  if (file.size > maxInputBytes) throw new Error('La imagen supera los 25 MB.')
  const target = imageTargets[kind]
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('No se pudo leer esa imagen. Prueba con JPG, PNG o WebP.')
  })
  const frame = view ?? defaultFrameView(bitmap.width, bitmap.height, target.width, target.height)
  let smallest = { width: target.width, height: target.height }
  try {
    for (const scale of [1, 0.75, 0.5]) {
      const width = Math.round(target.width * scale)
      const height = Math.round(target.height * scale)
      const canvas = render(bitmap, width, height, frame, margin)
      smallest = { width, height }
      for (const quality of [0.85, 0.75, 0.6, 0.45]) {
        const blob = await encode(canvas, 'image/webp', quality)
        if (blob && blob.type === 'image/webp' && blob.size <= target.maxBytes) {
          return { blob, width, height, mime: 'image/webp' }
        }
      }
    }
    // Si el navegador no genera WebP (Safari): PNG, que conserva la transparencia (escudos y logos sin fondo).
    for (const scale of [1, 0.75, 0.5]) {
      const width = Math.round(target.width * scale)
      const height = Math.round(target.height * scale)
      const png = await encode(render(bitmap, width, height, frame, margin), 'image/png', 1)
      if (png && png.type === 'image/png' && png.size <= target.maxBytes) return { blob: png, width, height, mime: 'image/png' }
    }
    // Último recurso: JPEG en el tamaño más pequeño, ya dentro del límite.
    const canvas = render(bitmap, smallest.width, smallest.height, frame, margin)
    const blob = await encode(canvas, 'image/jpeg', 0.6)
    if (!blob) throw new Error('No se pudo comprimir la imagen.')
    if (blob.size > target.maxBytes) throw new Error('La imagen sigue siendo muy pesada después de comprimirla. Prueba con otra.')
    return { blob, width: smallest.width, height: smallest.height, mime: 'image/jpeg' }
  } finally {
    bitmap.close()
  }
}

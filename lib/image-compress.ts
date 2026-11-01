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

// La imagen nunca puede dejar un hueco dentro del marco.
export function clampFrameOffset(x: number, y: number, imgWidth: number, imgHeight: number, frameWidth: number, frameHeight: number, scale: number) {
  const minX = frameWidth - imgWidth * scale
  const minY = frameHeight - imgHeight * scale
  return { x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) }
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

function render(bitmap: ImageBitmap, width: number, height: number, crop: SourceCrop) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('El navegador no permite procesar imágenes.')
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height)
  return canvas
}

function encode(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality))
}

// Recorta (centrado o con el encuadre dado) y baja calidad o tamaño hasta quedar bajo el límite del destino.
export async function compressImage(file: File, kind: ImageKind, crop?: SourceCrop): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) throw new Error('Elige un archivo de imagen.')
  if (file.size > maxInputBytes) throw new Error('La imagen supera los 25 MB.')
  const target = imageTargets[kind]
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('No se pudo leer esa imagen. Prueba con JPG, PNG o WebP.')
  })
  const region = crop ?? coverCropRect(bitmap.width, bitmap.height, target.width, target.height)
  let smallest = { width: target.width, height: target.height }
  try {
    for (const scale of [1, 0.75, 0.5]) {
      const width = Math.round(target.width * scale)
      const height = Math.round(target.height * scale)
      const canvas = render(bitmap, width, height, region)
      smallest = { width, height }
      for (const quality of [0.85, 0.75, 0.6, 0.45]) {
        const blob = await encode(canvas, 'image/webp', quality)
        if (blob && blob.type === 'image/webp' && blob.size <= target.maxBytes) {
          return { blob, width, height, mime: 'image/webp' }
        }
      }
    }
    // Último recurso: JPEG en el tamaño más pequeño, ya dentro del límite.
    const canvas = render(bitmap, smallest.width, smallest.height, region)
    const blob = await encode(canvas, 'image/jpeg', 0.6)
    if (!blob) throw new Error('No se pudo comprimir la imagen.')
    if (blob.size > target.maxBytes) throw new Error('La imagen sigue siendo muy pesada después de comprimirla. Prueba con otra.')
    return { blob, width: smallest.width, height: smallest.height, mime: 'image/jpeg' }
  } finally {
    bitmap.close()
  }
}

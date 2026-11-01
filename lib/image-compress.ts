// Compresión de imágenes en el navegador antes de subirlas.
// Acepta archivos grandes y los reduce a webp con recorte centrado al tamaño del destino.

export type ImageKind = 'avatar' | 'banner'

export const imageTargets: Record<ImageKind, { width: number; height: number; maxBytes: number }> = {
  avatar: { width: 512, height: 512, maxBytes: 150 * 1024 },
  banner: { width: 1600, height: 480, maxBytes: 300 * 1024 },
}

// Límite de lo que se acepta del disco; el archivo se comprime antes de subirse.
export const maxInputBytes = 25 * 1024 * 1024

// Recorte centrado que cubre el destino sin deformar la imagen.
export function coverCropRect(srcWidth: number, srcHeight: number, targetWidth: number, targetHeight: number) {
  const targetRatio = targetWidth / targetHeight
  const srcRatio = srcWidth / srcHeight
  if (srcRatio > targetRatio) {
    const sw = Math.round(srcHeight * targetRatio)
    return { sx: Math.round((srcWidth - sw) / 2), sy: 0, sw, sh: srcHeight }
  }
  const sh = Math.round(srcWidth / targetRatio)
  return { sx: 0, sy: Math.round((srcHeight - sh) / 2), sw: srcWidth, sh }
}

export type CompressedImage = { blob: Blob; width: number; height: number; mime: string }

async function decode(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file)
}

function render(bitmap: ImageBitmap, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('El navegador no permite procesar imágenes.')
  const crop = coverCropRect(bitmap.width, bitmap.height, width, height)
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height)
  return canvas
}

function encode(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality))
}

// Baja la calidad y, si hace falta, el tamaño hasta quedar bajo el límite del destino.
export async function compressImage(file: File, kind: ImageKind): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) throw new Error('Elige un archivo de imagen.')
  if (file.size > maxInputBytes) throw new Error('La imagen supera los 25 MB.')
  const target = imageTargets[kind]
  const bitmap = await decode(file).catch(() => {
    throw new Error('No se pudo leer esa imagen. Prueba con JPG, PNG o WebP.')
  })
  let smallest = { width: target.width, height: target.height }
  try {
    for (const scale of [1, 0.75, 0.5]) {
      const width = Math.round(target.width * scale)
      const height = Math.round(target.height * scale)
      const canvas = render(bitmap, width, height)
      smallest = { width, height }
      for (const quality of [0.85, 0.75, 0.6, 0.45]) {
        const blob = await encode(canvas, 'image/webp', quality)
        if (blob && blob.type === 'image/webp' && blob.size <= target.maxBytes) {
          return { blob, width, height, mime: 'image/webp' }
        }
      }
    }
    // Último recurso: JPEG en el tamaño más pequeño, ya dentro del límite.
    const canvas = render(bitmap, smallest.width, smallest.height)
    const blob = await encode(canvas, 'image/jpeg', 0.6)
    if (!blob) throw new Error('No se pudo comprimir la imagen.')
    if (blob.size > target.maxBytes) throw new Error('La imagen sigue siendo muy pesada después de comprimirla. Prueba con otra.')
    return { blob, width: canvas.width, height: canvas.height, mime: 'image/jpeg' }
  } finally {
    bitmap.close()
  }
}

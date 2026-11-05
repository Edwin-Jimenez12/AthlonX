import { compressImage, type FrameView, type ImageKind } from './image-compress'
import { supabase } from './supabase'

export const imageBucket = 'avatars'

// Comprime en el navegador y sube a una ruta fija: al cambiar la imagen se reemplaza, sin archivos huérfanos.
export async function uploadProfileImage(file: File, kind: ImageKind, folder: string, slot: string, view?: FrameView, margin = 0) {
  if (!supabase) throw new Error('La conexión no está disponible.')
  const image = await compressImage(file, kind, view, margin)
  const extension = image.mime === 'image/webp' ? 'webp' : image.mime === 'image/png' ? 'png' : 'jpg'
  const path = `${folder}/${slot}.${extension}`
  const { error } = await supabase.storage.from(imageBucket).upload(path, image.blob, {
    upsert: true,
    contentType: image.mime,
    cacheControl: '604800',
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(imageBucket).getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}

export const imageFolders = {
  persona: (userId: string) => `persona/${userId}`,
  jugador: (playerId: string) => `jugador/${playerId}`,
  equipo: (teamId: string) => `equipo/${teamId}`,
  organizacion: (organizationId: string) => `organizacion/${organizationId}`,
  torneo: (tournamentId: string) => `torneo/${tournamentId}`,
}

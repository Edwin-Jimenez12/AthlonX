'use client'

import { supabase } from '../../lib/supabase'

export * from '../../lib/team-finance'

// Abre un comprobante o contrato del almacenamiento privado con un enlace temporal.
export async function openFile(path: string) {
  if (!supabase) return
  const { data } = await supabase.storage.from('team-finance').createSignedUrl(path, 60)
  if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
}

export async function uploadFile(teamId: string, folder: string, file: File) {
  if (!supabase) throw new Error('La conexión no está disponible.')
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${teamId}/${folder}/${crypto.randomUUID()}-${safe}`
  const { error } = await supabase.storage.from('team-finance').upload(path, file)
  if (error) throw new Error(error.message)
  return path
}


'use client'

import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

type LiveRow = Record<string, unknown>

export type LiveSource = {
  table: string
  // Decide si el cambio pertenece a la pantalla. Si la fila no trae la clave (un DELETE solo trae el id),
  // conviene devolver true para no perder cambios.
  belongs?: (row: LiveRow) => boolean
}

const DEFAULT_DELAY_MS = 350

// Escucha cambios de Supabase Realtime en las tablas indicadas y llama a `refresh` (con antirrebote),
// para actualizar los datos sin recargar la página.
export function useLiveRefresh(channelName: string, sources: LiveSource[], refresh: () => void, delayMs = DEFAULT_DELAY_MS) {
  const refreshRef = useRef(refresh)
  const sourcesRef = useRef(sources)

  useEffect(() => {
    refreshRef.current = refresh
    sourcesRef.current = sources
  })

  useEffect(() => {
    if (!supabase || !channelName) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        refreshRef.current()
      }, delayMs)
    }

    let channel = supabase.channel(channelName)
    for (const source of sourcesRef.current) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: source.table },
        (payload) => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as LiveRow | undefined
          if (!row) return schedule()
          const belongs = sourcesRef.current.find((item) => item.table === source.table)?.belongs
          if (!belongs || belongs(row)) schedule()
        },
      )
    }
    channel.subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
    // Los orígenes cambian al cargar datos; se leen desde la referencia para no reconectar el canal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, delayMs])
}

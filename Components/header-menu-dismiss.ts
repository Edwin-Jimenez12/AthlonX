import { useEffect, type RefObject } from 'react'

const EVENT_NAME = 'athlonx-header-menu'

// Avisa a los demás menús del encabezado que este se abrió, para que se cierren.
export function announceHeaderMenu(id: string) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: id }))
}

// Cierra el menú al hacer clic fuera, al presionar Escape o al abrir otro menú del encabezado.
export function useDismissableMenu(ref: RefObject<HTMLElement | null>, id: string, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    const onOtherMenu = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) close()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener(EVENT_NAME, onOtherMenu)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener(EVENT_NAME, onOtherMenu)
    }
  }, [ref, id, open, close])
}

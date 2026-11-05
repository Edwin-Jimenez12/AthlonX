'use client'

import { PersonaPendingPage } from '../../../Components/persona/persona-ui'

// Anuncios: comunicados del equipo. Quién publica y si se notifica por push queda por definir.
export default function AnnouncementsPage() {
  return (
    <PersonaPendingPage
      title="Anuncios"
      description="Comunicados para todo el equipo o para una división."
      reason="Los anuncios todavía no tienen modelo de datos. Falta definir quién publica y si se notifica por push o solo dentro de la app."
      items={[
        { label: 'Publicar anuncios y comunicados al equipo', plan: 'Pro' },
        { label: 'Ver cuántas personas lo han visto', plan: 'Pro' },
      ]}
    />
  )
}

'use client'

import { PersonaPendingPage } from '../../../Components/persona/persona-ui'

// Formaciones: mapeo de la cancha. Función de Pro para el entrenador; deporte y forma de guardado por definir.
export default function FormationsPage() {
  return (
    <PersonaPendingPage
      title="Formaciones"
      description="Arma alineaciones sobre la cancha y compártelas con tus jugadores."
      reason="Las formaciones todavía no tienen modelo de datos. Falta definir con el entrenador qué deporte va primero y si se guardan por partido o por plantilla."
      items={[
        { label: 'Formaciones y mapeo de cancha', plan: 'Pro' },
        { label: 'Guardar formación por partido o por plantilla', plan: 'Pro', note: 'Por definir.' },
      ]}
    />
  )
}

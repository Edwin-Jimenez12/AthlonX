'use client'

import { PersonaPendingPage } from '../../../Components/persona/persona-ui'

// Entrenamientos: sesiones que el entrenador planifica y el atleta confirma. Sin tablas todavía.
export default function TrainingPage() {
  return (
    <PersonaPendingPage
      title="Entrenamientos"
      description="Las sesiones que tu entrenador programa, y tu respuesta a cada una."
      reason="Los entrenamientos todavía no tienen modelo de datos en la plataforma. Esta pantalla se conecta cuando se apliquen sus tablas."
      items={[
        { label: 'Ver los entrenamientos programados por tu entrenador', plan: 'Free' },
        { label: 'Confirmar asistencia a entrenamientos (Voy, Tal vez, No voy)', plan: 'Free' },
        { label: 'Planificar sesiones, ejercicios y plantillas', plan: 'Free', note: 'Vista del entrenador.' },
        { label: 'Asignar entrenamientos a jugadores o divisiones', plan: 'Free', note: 'Vista del entrenador.' },
      ]}
    />
  )
}

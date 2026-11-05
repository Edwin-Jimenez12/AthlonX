'use client'

import { PersonaPendingPage } from '../../../Components/persona/persona-ui'

// Carga y salud: carga semanal y disponibilidad. Requiere decisiones de salud (revisión médica y legal) antes de construirse.
export default function LoadHealthPage() {
  return (
    <PersonaPendingPage
      title="Carga y salud"
      description="Tu carga semanal, quién la puede ver y tu disponibilidad."
      reason="La carga y la disponibilidad dependen de decisiones pendientes de salud (revisión médica y legal, Ley 81 de 2019). No se muestran datos hasta que existan sus tablas y permisos."
      items={[
        { label: 'Registrar tu carga de trabajo semanal', plan: 'Free' },
        { label: 'Ver quién puede ver tu carga (tú y tu médico por defecto)', plan: 'Free' },
        { label: 'Ver el estado de disponibilidad asignado por tu médico', plan: 'Free' },
        { label: 'Reportar una molestia al médico (con consentimiento)', plan: 'Free', note: 'Por definir: falta el formulario y la revisión legal.' },
      ]}
    />
  )
}

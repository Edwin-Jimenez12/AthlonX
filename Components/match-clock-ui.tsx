'use client'

import type { PhaseStep } from '../lib/match-clock'
import { Button, cx } from './mi-equipo/ui'

// Barra de fases del partido: la misma para todos los deportes.
export function PhaseBar({ steps }: { steps: PhaseStep[] }) {
  return <ol aria-label="Fases del partido" className="ax-scroll-x mt-4 flex justify-center gap-1.5 overflow-x-auto">
    {steps.map((step) => <li key={step.label} aria-current={step.current ? 'step' : undefined} className={cx('shrink-0 rounded-full px-3 py-1 text-xs font-semibold', step.current ? 'border border-[var(--ax-accent-line)] bg-[var(--ax-accent-soft)] text-[var(--ax-accent-text)]' : step.done ? 'bg-[var(--ax-surface-raised)] text-[var(--ax-text-secondary)]' : 'text-[var(--ax-muted)]')}>{step.label}</li>)}
  </ol>
}

// Aviso inline cuando se quiere cortar un tiempo antes de que termine.
export function EarlyFinishNotice({ remaining, onKeepPlaying, onFinishNow }: { remaining: string; onKeepPlaying: () => void; onFinishNow: () => void }) {
  return <div role="group" aria-label="Confirmar fin del tiempo" className="ax-drop-in mx-auto mt-4 flex max-w-lg flex-wrap items-center gap-2 rounded-[12px] border border-[var(--ax-card-yellow-line)] bg-[var(--ax-warning-soft)] p-3">
    <p className="min-w-0 flex-1 text-[13px] text-[var(--ax-text)]">Este tiempo aún no termina: faltan <span className="font-semibold tabular-nums">{remaining}</span>. ¿Terminarlo ahora?</p>
    <Button size="sm" variant="ghost" onClick={onKeepPlaying}>Seguir jugando</Button>
    <Button size="sm" variant="primary" onClick={onFinishNow}>Terminar ahora</Button>
  </div>
}

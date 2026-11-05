'use client'

import { FieldLabel, Segment, inputClass } from '../mi-equipo/ui'

export type PeriodMode = 'semana' | 'mes' | 'anio'

const pad = (value: number) => String(value).padStart(2, '0')
export const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

// Rango de fechas: semana (lunes a domingo), mes completo o año completo (1 de enero al 31 de diciembre).
export function rangeFor(mode: PeriodMode, anchor: string, year: number) {
  if (mode === 'anio') return { from: `${year}-01-01`, to: `${year}-12-31` }
  const [y, m, d] = anchor.split('-').map(Number)
  if (mode === 'mes') return { from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)) }
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7
  return { from: isoDate(new Date(y, m - 1, d - weekday)), to: isoDate(new Date(y, m - 1, d - weekday + 6)) }
}

// Años que la cuenta puede ver: Free solo el año en curso; Pro también los anteriores.
export function yearsFor(isPro: boolean, currentYear: number) {
  return isPro ? Array.from({ length: 5 }, (_, index) => currentYear - index) : [currentYear]
}

export function PeriodControls({ mode, onMode, anchor, onAnchor, year, onYear, years }: { mode: PeriodMode; onMode: (mode: PeriodMode) => void; anchor: string; onAnchor: (value: string) => void; year: number; onYear: (year: number) => void; years: number[] }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Periodo">
        {(['semana', 'mes', 'anio'] as PeriodMode[]).map((item) => (
          <Segment key={item} active={mode === item} label={item === 'anio' ? 'Año' : item === 'mes' ? 'Mes' : 'Semana'} onClick={() => onMode(item)} />
        ))}
      </div>
      {mode === 'anio' ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Año">
          {years.map((option) => <Segment key={option} active={year === option} label={String(option)} onClick={() => onYear(option)} />)}
        </div>
      ) : (
        <label className="block w-full sm:w-auto">
          <FieldLabel>{mode === 'mes' ? 'Mes de referencia' : 'Semana de referencia'}</FieldLabel>
          <input type="date" className={`${inputClass} sm:w-auto`} value={anchor} onChange={(event) => onAnchor(event.target.value)} />
        </label>
      )}
    </div>
  )
}

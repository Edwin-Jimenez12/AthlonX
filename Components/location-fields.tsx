'use client'

import { ATHLONX_COUNTRIES, PANAMA_CITIES } from '../lib/location-options'
import { StyledSelect } from './styled-select'

type LocationFieldsProps = {
  country: string
  city: string
  onCountryChange?: (value: string) => void
  onCityChange: (value: string) => void
  variant?: 'dark' | 'light'
  required?: boolean
  className?: string
}

export function LocationFields({ country, city, onCountryChange, onCityChange, variant = 'dark', required = false, className = '' }: LocationFieldsProps) {
  const dark = variant === 'dark'
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      <StyledSelect label="País" value={country} onChange={(value) => onCountryChange?.(value)} options={ATHLONX_COUNTRIES.map((item) => ({ value: item.value, label: item.label }))} required={required} variant={variant} />
      <StyledSelect label="Ciudad" value={city} onChange={onCityChange} options={PANAMA_CITIES.map((item) => ({ value: item, label: item }))} placeholder="Seleccionar ciudad" required={required} variant={variant} />
    </div>
  )
}

'use client'

import { ATHLONX_COUNTRIES, PANAMA_CITIES } from '../lib/location-options'

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
  const labelClass = dark ? 'text-slate-300' : 'text-[#17212b]'
  const selectClass = dark
    ? 'border-white/15 bg-[#101a24] text-white placeholder:text-slate-500'
    : 'border-slate-300 bg-white text-[#17212b]'

  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      <label className={`block text-sm font-bold ${labelClass}`}>
        País
        <select value={country} onChange={(event) => onCountryChange?.(event.target.value)} required={required} className={`mt-2 w-full cursor-pointer rounded-[5px] border px-3 py-2.5 outline-none focus:border-[#b4ff45] ${selectClass}`}>
          {ATHLONX_COUNTRIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className={`block text-sm font-bold ${labelClass}`}>
        Ciudad
        <select value={city} onChange={(event) => onCityChange(event.target.value)} required={required} className={`mt-2 w-full cursor-pointer rounded-[5px] border px-3 py-2.5 outline-none focus:border-[#b4ff45] ${selectClass}`}>
          <option value="">Seleccionar ciudad</option>
          {PANAMA_CITIES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { fallbackCountries, loadCountries } from '../../lib/mi-perfil'
import type { Country } from '../../lib/mi-perfil'

export function useCountries(): Country[] {
  const [countries, setCountries] = useState<Country[]>(fallbackCountries)
  useEffect(() => {
    void loadCountries().then(setCountries)
  }, [])
  return countries
}

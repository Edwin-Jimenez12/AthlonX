export const ATHLONX_COUNTRIES = [{ value: 'Panamá', label: 'Panamá' }] as const

// AthlonX currently starts with Panama; the UI calls provinces "Ciudad" so the
// same field can be extended to other countries without changing the forms.
export const PANAMA_CITIES = [
  'Bocas del Toro',
  'Chiriquí',
  'Coclé',
  'Colón',
  'Darién',
  'Emberá-Wounaan',
  'Guna Yala',
  'Herrera',
  'Los Santos',
  'Ngäbe-Buglé',
  'Panamá',
  'Panamá Oeste',
  'Veraguas',
] as const

export const PANAMA_COUNTRY = ATHLONX_COUNTRIES[0].value

export function normalizePanamaCity(value: string | null | undefined) {
  if (!value) return ''
  if (value.trim().toLowerCase() === 'ciudad de panamá') return 'Panamá'
  return PANAMA_CITIES.includes(value as (typeof PANAMA_CITIES)[number]) ? value : ''
}

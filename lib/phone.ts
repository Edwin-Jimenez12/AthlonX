import { AsYouType, getCountries, getCountryCallingCode, isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js'
import type { CountryCode } from 'libphonenumber-js'

// Teléfonos de cualquier país con libphonenumber-js: códigos, formato por país y validación.
// Se guardan como "+507 6123-4567" (código internacional y número con el formato del país).

export type PhoneCountry = { iso: CountryCode; name: string; dialCode: string }

export const defaultPhoneCountry: CountryCode = 'PA'

let cachedCountries: PhoneCountry[] | null = null

// Todos los países con su nombre en español, Panamá primero y el resto en orden alfabético.
export function phoneCountries(): PhoneCountry[] {
  if (cachedCountries) return cachedCountries
  const names = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['es'], { type: 'region' }) : null
  const list = getCountries().map((iso) => ({ iso, name: names?.of(iso) ?? iso, dialCode: getCountryCallingCode(iso) }))
  list.sort((left, right) => (left.iso === defaultPhoneCountry ? -1 : right.iso === defaultPhoneCountry ? 1 : left.name.localeCompare(right.name, 'es')))
  cachedCountries = list
  return list
}

// País y número nacional a partir del valor guardado. Sin prefijo se asume Panamá.
export function splitPhone(stored: string | null | undefined, preferred?: CountryCode): { iso: CountryCode; national: string } {
  const value = (stored ?? '').trim()
  if (!value) return { iso: preferred ?? defaultPhoneCountry, national: '' }
  const match = value.match(/^\+(\d{1,4})\s*(.*)$/)
  if (!match) return { iso: preferred ?? defaultPhoneCountry, national: value }
  const [, dialCode, national] = match
  // Varios países comparten código (+1, +7, +44): se usa el que indica el número o el que eligió la persona.
  const detected = parsePhoneNumberFromString(value)?.country
  const sameCode = phoneCountries().filter((country) => country.dialCode === dialCode)
  const iso = detected ?? (preferred && sameCode.some((country) => country.iso === preferred) ? preferred : sameCode[0]?.iso) ?? preferred ?? defaultPhoneCountry
  return { iso, national }
}

// Da formato al número mientras se escribe, según el país (Panamá: 6123-4567).
export function formatNational(iso: CountryCode, raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 15)
  if (!digits) return ''
  return new AsYouType(iso).input(digits)
}

export function joinPhone(iso: CountryCode, national: string) {
  return national.trim() ? `+${getCountryCallingCode(iso)} ${national.trim()}` : ''
}

// Mensaje de error del teléfono, o vacío si se puede guardar. Un campo vacío es válido.
export function phoneError(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (!trimmed.startsWith('+')) return 'Elige el país del número.'
  if (!/\d/.test(trimmed.replace(/^\+\d{1,4}\s*/, ''))) return ''
  return isValidPhoneNumber(trimmed) ? '' : 'El número no es válido para el país elegido.'
}

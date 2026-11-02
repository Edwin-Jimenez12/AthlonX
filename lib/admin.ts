// Reglas del panel administrativo de la plataforma. La seguridad real vive en la base de datos (funciones platform_*);
// estas funciones sirven para mostrar y validar en pantalla antes de enviar.

export type StaffRole = 'propietario' | 'administrador' | 'colaborador'
export type Permission = 'estadisticas' | 'ingresos' | 'planes' | 'novedades' | 'promociones' | 'sugerencias'
export type PlatformAccess = { role: StaffRole; permissions: Permission[] } | null

export const roleLabels: Record<StaffRole, string> = {
  propietario: 'Propietario',
  administrador: 'Administrador',
  colaborador: 'Colaborador',
}

export const permissionLabels: Record<Permission, string> = {
  estadisticas: 'Estadísticas de cuentas',
  ingresos: 'Ingresos',
  planes: 'Planes',
  novedades: 'Novedades',
  promociones: 'Promociones',
  sugerencias: 'Sugerencias',
}

// Propietario y administrador ven todas las secciones. El colaborador solo las que tenga asignadas.
export function hasPermission(access: PlatformAccess, permission: Permission) {
  if (!access) return false
  if (access.role === 'propietario' || access.role === 'administrador') return true
  return access.permissions.includes(permission)
}

// Quién puede crear o asignar cada rol. Nadie crea otro propietario.
export function canCreateRole(caller: StaffRole | null, target: StaffRole) {
  if (caller === 'propietario') return target === 'administrador' || target === 'colaborador'
  if (caller === 'administrador') return target === 'colaborador'
  return false
}

export function formatUsd(value: number) {
  return `US$ ${value.toFixed(2)}`
}

export type PromoStatus = 'Activo' | 'Programado' | 'Agotado' | 'Vencido' | 'Pausado'

export function promoStatus(
  promo: { is_active: boolean; starts_at: string; ends_at: string | null; max_uses: number | null; uses_count: number },
  now: Date = new Date(),
): PromoStatus {
  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) return 'Agotado'
  if (promo.ends_at && Date.parse(promo.ends_at) <= now.getTime()) return 'Vencido'
  if (Date.parse(promo.starts_at) > now.getTime()) return 'Programado'
  if (!promo.is_active) return 'Pausado'
  return 'Activo'
}

export function normalizePromoCode(code: string) {
  return code.trim().toUpperCase()
}

export function validatePlan(input: {
  name: string
  kind: 'individual' | 'grupo'
  monthly: number
  annualEnabled: boolean
  annual: number | null
  seats: number
  limit: number | null
  features: string[]
}): string | null {
  if (!input.name.trim()) return 'El plan necesita un nombre.'
  if (!Number.isFinite(input.monthly) || input.monthly < 0) return 'El precio mensual no puede ser negativo.'
  if (input.annualEnabled && input.kind === 'grupo') return 'Los planes de grupo solo se cobran al mes.'
  if (input.annualEnabled && (input.annual === null || !Number.isFinite(input.annual) || input.annual < 0)) {
    return 'Indica el precio anual del plan.'
  }
  if (!Number.isInteger(input.seats) || input.seats < 1) return 'Los cupos deben ser al menos 1.'
  if (input.limit !== null && (!Number.isInteger(input.limit) || input.limit < 0)) {
    return 'El límite de actividades debe ser un número entero o quedar vacío (ilimitado).'
  }
  if (input.features.length === 0) return 'Agrega al menos una función incluida.'
  return null
}

export function validatePromo(input: {
  code: string
  type: 'percent' | 'fixed'
  amount: number
  maxUses: number | null
  starts: string
  ends: string | null
}): string | null {
  const code = normalizePromoCode(input.code)
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return 'El código usa de 3 a 30 letras, números, guiones o guiones bajos.'
  if (!Number.isFinite(input.amount) || input.amount <= 0) return 'El descuento debe ser mayor que cero.'
  if (input.type === 'percent' && input.amount > 100) return 'El porcentaje no puede pasar de 100.'
  if (input.maxUses !== null && (!Number.isInteger(input.maxUses) || input.maxUses < 1)) return 'El límite de usos debe ser al menos 1.'
  if (input.ends && Date.parse(input.ends) <= Date.parse(input.starts)) return 'La fecha de vencimiento debe ser posterior al inicio.'
  return null
}

export function validateRelease(input: { version: string; title: string; sections: { title: string; body: string }[] }): string | null {
  if (!/^v\d+\.\d+\.\d+$/.test(input.version.trim())) return 'El código de versión debe tener la forma v2.4.0.'
  if (!input.title.trim()) return 'La versión necesita un título.'
  if (input.sections.length === 0) return 'Agrega al menos una sección.'
  if (input.sections.some((s) => !s.title.trim() || !s.body.trim())) return 'Cada sección necesita título y párrafo.'
  return null
}

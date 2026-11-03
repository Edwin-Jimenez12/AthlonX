// Asigna correo y contraseña a la cuenta propietaria del panel administrativo.
//
// Uso (la contraseña se pide sin mostrarse en pantalla y no queda en el historial):
//   export SUPABASE_URL="https://mlvtsgseneqzihwkiatg.supabase.co"
//   export SUPABASE_SERVICE_ROLE_KEY="<clave service_role, desde Supabase > Settings > API>"
//   read -rs OWNER_PASSWORD && export OWNER_PASSWORD
//   node scripts/set-owner-credentials.mjs --email correo@dominio.com
//
// La clave de servicio nunca va en el repo: solo en la terminal donde se ejecuta.
import { createClient } from '@supabase/supabase-js'

function fail(message) {
  console.error(`Error: ${message}`)
  process.exit(1)
}

function argValue(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index > -1 ? process.argv[index + 1] : undefined
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = argValue('email')?.trim().toLowerCase()
const password = process.env.OWNER_PASSWORD

if (!url || !serviceKey) fail('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.')
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Indica un correo válido con --email.')
if (!password || password.length < 12) fail('Define OWNER_PASSWORD con al menos 12 caracteres.')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

// Busca el único propietario en el panel (la clave de servicio omite RLS).
const { data: owners, error: ownerError } = await admin
  .from('platform_staff')
  .select('user_id')
  .eq('role', 'propietario')
if (ownerError) fail(ownerError.message)
if (owners.length !== 1) fail(`Se esperaba 1 propietario y hay ${owners.length}. No se cambió nada.`)

const { data, error } = await admin.auth.admin.updateUserById(owners[0].user_id, {
  email,
  password,
  email_confirm: true,
})
if (error) fail(error.message)

console.log(`Listo. La cuenta propietaria ahora inicia sesión con: ${data.user.email}`)

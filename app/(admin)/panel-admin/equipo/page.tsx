'use client'

import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { callPanel, useAdminAccess } from '../../../../Components/admin/admin-shell'
import { Button, Card, CardHeader, FieldLabel, Notice, PageHeader, Segment, inputClass } from '../../../../Components/mi-equipo/ui'
import { canCreateRole, permissionLabels, roleLabels, type Permission, type StaffRole } from '../../../../lib/admin'

type Member = {
  user_id: string
  role: StaffRole
  is_active: boolean
  email: string
  name: string
  created_at: string
  created_by_name: string
  permissions: Permission[]
}

type TempAccount = { email: string; password: string }

const allPermissions = Object.keys(permissionLabels) as Permission[]

// Contraseña temporal: el campo ya viene lleno y al hacer clic se copia al portapapeles.
function TempPasswordBox({ account, onClose }: { account: TempAccount; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(account.password)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card>
      <CardHeader
        id="equipo-temporal"
        title="Contraseña temporal"
        subtitle={`Para ${account.email}. Al ingresar, la cuenta debe cambiarla por una propia.`}
        actions={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}
      />
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          readOnly
          aria-label="Contraseña temporal"
          value={account.password}
          onClick={(e) => {
            e.currentTarget.select()
            void copy()
          }}
          className={`${inputClass} font-mono`}
        />
        <Button variant="primary" onClick={() => void copy()}>{copied ? 'Copiada' : 'Copiar'}</Button>
      </div>
      <p className="mt-3 text-xs text-[var(--ax-muted)]">Esta contraseña solo se muestra ahora. Entrégala por un canal privado.</p>
    </Card>
  )
}

export default function EquipoPage() {
  const access = useAdminAccess()
  const caller = access?.role ?? null
  const [members, setMembers] = useState<Member[]>([])
  const [email, setEmail] = useState('')
  const [newRole, setNewRole] = useState<StaffRole>('colaborador')
  const [saving, setSaving] = useState(false)
  const [temp, setTemp] = useState<TempAccount | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  const creatableRoles = (['administrador', 'colaborador'] as StaffRole[]).filter((role) => canCreateRole(caller, role))

  async function load() {
    setMembers(await callPanel<Member[]>('platform_list_staff'))
  }

  useEffect(() => {
    if (!caller || caller === 'colaborador') return
    load().catch((err: Error) => setMessage({ tone: 'danger', text: err.message }))
    // Carga inicial del equipo del panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caller])

  useEffect(() => {
    if (creatableRoles.length && !creatableRoles.includes(newRole)) setNewRole(creatableRoles[0])
    // Solo reajusta el rol elegido cuando cambian los roles que puede crear.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caller])

  if (!caller || caller === 'colaborador') {
    return <Notice tone="warning" icon={Info}>Solo el propietario y los administradores gestionan el equipo del panel.</Notice>
  }

  // Quién puede tocar cada cuenta: propietario a administradores y colaboradores; administrador a colaboradores.
  function canManage(target: StaffRole) {
    if (target === 'propietario') return false
    return canCreateRole(caller, target)
  }

  async function run(action: () => Promise<unknown>, success: string) {
    setSaving(true)
    setMessage(null)
    try {
      await action()
      setMessage({ tone: 'success', text: success })
      await load()
    } catch (err) {
      setMessage({ tone: 'danger', text: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  async function addMember() {
    const target = email.trim()
    setSaving(true)
    setMessage(null)
    try {
      const userId = await callPanel<string>('platform_create_staff', { p_email: target, p_role: newRole })
      const password = await callPanel<string>('platform_reset_staff_password', { p_user: userId })
      setTemp({ email: target, password })
      setEmail('')
      setMessage({ tone: 'success', text: 'Cuenta agregada al panel con contraseña temporal.' })
      await load()
    } catch (err) {
      setMessage({ tone: 'danger', text: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  async function newTemporaryPassword(member: Member) {
    setSaving(true)
    setMessage(null)
    try {
      const password = await callPanel<string>('platform_reset_staff_password', { p_user: member.user_id })
      setTemp({ email: member.email, password })
      setMessage({ tone: 'success', text: 'Se generó una nueva contraseña temporal. Sus sesiones abiertas se cerraron.' })
      await load()
    } catch (err) {
      setMessage({ tone: 'danger', text: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  async function removeMember(member: Member) {
    setConfirmId(null)
    await run(() => callPanel('platform_remove_staff', { p_user: member.user_id }), 'Cuenta quitada del panel. Su cuenta de AthlonX sigue activa.')
  }

  return (
    <>
      <PageHeader title="Equipo y roles" />
      {message && <Notice tone={message.tone === 'success' ? 'success' : 'danger'} icon={Info}>{message.text}</Notice>}
      {temp && <TempPasswordBox account={temp} onClose={() => setTemp(null)} />}

      {creatableRoles.length > 0 && (
        <Card>
          <CardHeader id="equipo-nuevo" title="Agregar a la cuenta" />
          <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="block">
              <FieldLabel>Correo de una cuenta de AthlonX</FieldLabel>
              <input className={inputClass} type="email" placeholder="persona@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <div>
              <FieldLabel>Rol</FieldLabel>
              <div className="flex gap-2">
                {creatableRoles.map((role) => (
                  <Segment key={role} active={newRole === role} label={roleLabels[role]} onClick={() => setNewRole(role)} />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="primary" disabled={saving || !email.trim()} onClick={() => void addMember()}>
              Agregar con contraseña temporal
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader id="equipo-lista" title="Cuentas del panel" />
        <ul className="mt-5 divide-y divide-[var(--ax-line)]">
          {members.map((member) => {
            const manageable = canManage(member.role)
            const confirming = confirmId === member.user_id
            return (
              <li key={member.user_id} className="py-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--ax-text)]">{member.name}</p>
                    <p className="text-sm text-[var(--ax-muted)]">{member.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-semibold text-[var(--ax-accent-text)]">{roleLabels[member.role]}</span>
                    <span className="text-[var(--ax-muted)]">{member.is_active ? 'Activa' : 'Desactivada'}</span>
                    <span className="text-[var(--ax-muted)]">Creada por {member.created_by_name}</span>
                    {manageable && (
                      <>
                        <Button variant="secondary" disabled={saving} onClick={() => void newTemporaryPassword(member)}>Contraseña temporal</Button>
                        <Button variant="secondary" disabled={saving} onClick={() => run(() => callPanel('platform_set_staff_active', { p_user: member.user_id, p_active: !member.is_active }), member.is_active ? 'Cuenta desactivada.' : 'Cuenta activada.')}>
                          {member.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                        {!confirming && (
                          <Button variant="secondary" disabled={saving} onClick={() => setConfirmId(member.user_id)}>Quitar del panel</Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {confirming && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--ax-line)] p-4">
                    <p className="text-sm text-[var(--ax-text)]">
                      ¿Quitar a {member.name} del panel? Perderá el acceso a estas secciones. Su cuenta de AthlonX no se borra.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setConfirmId(null)}>Cancelar</Button>
                      <Button variant="primary" disabled={saving} onClick={() => void removeMember(member)}>Sí, quitar</Button>
                    </div>
                  </div>
                )}
                {member.role === 'colaborador' && manageable && (
                  <div className="mt-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--ax-muted)]">Permisos asignados</p>
                    <div className="flex flex-wrap gap-2">
                      {allPermissions.map((permission) => {
                        const on = member.permissions.includes(permission)
                        return (
                          <Segment
                            key={permission}
                            active={on}
                            label={permissionLabels[permission]}
                            disabled={saving}
                            onClick={() => run(() => callPanel('platform_grant_permission', { p_user: member.user_id, p_permission: permission, p_granted: !on }), 'Permisos actualizados.')}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader id="equipo-permisos" title="Permisos por rol" />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[.14em] text-[var(--ax-muted)]">
              <tr>
                <th className="py-2 font-semibold">Acción</th>
                <th className="py-2 font-semibold">Propietario</th>
                <th className="py-2 font-semibold">Administrador</th>
                <th className="py-2 font-semibold">Colaborador</th>
              </tr>
            </thead>
            <tbody className="text-[var(--ax-text)]">
              {[
                ['Ver ingresos, planes, novedades, promociones y sugerencias', '✓', '✓', '○'],
                ['Ver estadísticas de todas las cuentas', '✓', '✓', '○'],
                ['Crear cuentas de colaborador', '✓', '✓', '—'],
                ['Gestionar cuentas de colaborador', '✓', '✓', '—'],
                ['Crear cuentas de administrador', '✓', '—', '—'],
                ['Gestionar cuentas de administrador', '✓', '—', '—'],
              ].map(([action, owner, admin, collab]) => (
                <tr key={action} className="border-t border-[var(--ax-line)]">
                  <td className="py-3">{action}</td>
                  <td className="py-3">{owner}</td>
                  <td className="py-3">{admin}</td>
                  <td className="py-3">{collab}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-[var(--ax-muted)]">✓ siempre incluido · ○ permiso asignable por el propietario o un administrador · — no incluido</p>
      </Card>
    </>
  )
}

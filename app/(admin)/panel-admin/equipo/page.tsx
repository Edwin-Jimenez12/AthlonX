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

const allPermissions = Object.keys(permissionLabels) as Permission[]

export default function EquipoPage() {
  const access = useAdminAccess()
  const caller = access?.role ?? null
  const [members, setMembers] = useState<Member[]>([])
  const [email, setEmail] = useState('')
  const [newRole, setNewRole] = useState<StaffRole>('colaborador')
  const [saving, setSaving] = useState(false)
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

  return (
    <>
      <PageHeader title="Equipo y roles" />
      {message && <Notice tone={message.tone === 'success' ? 'success' : 'danger'} icon={Info}>{message.text}</Notice>}

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
            <Button
              variant="primary"
              disabled={saving || !email.trim()}
              onClick={() => run(() => callPanel('platform_create_staff', { p_email: email.trim(), p_role: newRole }), 'Cuenta agregada al panel.').then(() => setEmail(''))}
            >
              Agregar al panel
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader id="equipo-lista" title="Cuentas del panel" />
        <ul className="mt-5 divide-y divide-[var(--ax-line)]">
          {members.map((member) => {
            const manageable = canManage(member.role)
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
                      <Button
                        variant="secondary"
                        disabled={saving}
                        onClick={() => run(() => callPanel('platform_set_staff_active', { p_user: member.user_id, p_active: !member.is_active }), member.is_active ? 'Cuenta desactivada.' : 'Cuenta activada.')}
                      >
                        {member.is_active ? 'Desactivar' : 'Activar'}
                      </Button>
                    )}
                  </div>
                </div>
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

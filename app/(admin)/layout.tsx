import { AdminShell } from '../../Components/admin/admin-shell'

// Panel oculto: no tiene enlaces desde la plataforma. Solo entran propietario, administradores y colaboradores.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}

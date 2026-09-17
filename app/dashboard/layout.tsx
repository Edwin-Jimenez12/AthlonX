'use client'

import { usePathname } from 'next/navigation'
import { DashboardHeader } from '../../Components/dashboard-header'
import { DashboardSidebar } from '../../Components/dashboard-sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSettings = pathname?.startsWith('/dashboard/configuracion') ?? false

  if (isSettings) return children

  return <>
    <DashboardSidebar />
    <DashboardHeader />
    {children}
  </>
}

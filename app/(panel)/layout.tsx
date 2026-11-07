'use client'

import { DashboardHeader } from '../../Components/dashboard-header'
import { DashboardSidebar } from '../../Components/dashboard-sidebar'
import { SettingsNavProvider } from '../../Components/settings-nav'
import { ThemeSync } from '../../Components/theme-sync'
import { RoleGate } from '../../Components/role-gate'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SettingsNavProvider>
    <div className="athlonx-dashboard">
      <ThemeSync />
      <DashboardSidebar />
      <DashboardHeader />
      <RoleGate>{children}</RoleGate>
    </div>
  </SettingsNavProvider>
}

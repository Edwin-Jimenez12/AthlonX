'use client'

import { DashboardHeader } from '../../Components/dashboard-header'
import { DashboardSidebar } from '../../Components/dashboard-sidebar'
import { SettingsNavProvider } from '../../Components/settings-nav'
import { ThemeSync } from '../../Components/theme-sync'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SettingsNavProvider>
    <div className="athlonx-dashboard">
      <ThemeSync />
      <DashboardSidebar />
      <DashboardHeader />
      {children}
    </div>
  </SettingsNavProvider>
}

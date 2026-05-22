import { Outlet } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { authAPI } from '@/api/ccms'
import { useIsMobile } from '@/hooks/use-mobile'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import AppSidebar from './AppSidebar'
import AppHeader from './AppHeader'
import { AppRouteBreadcrumbs } from './AppRouteBreadcrumbs'

export default function AppLayout() {
  const { setUser, user } = useAuthStore()
  const isMobile = useIsMobile()
  const [desktopOpen, setDesktopOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!user) {
      authAPI.me().then(({ data }) => setUser(data)).catch(() => {})
    }
  }, [])

  const handleToggle = () => {
    if (isMobile) {
      setMobileOpen((o) => !o)
    } else {
      setDesktopOpen((o) => !o)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div
        className={`hidden md:flex flex-col shrink-0 transition-all duration-300 overflow-hidden ${
          desktopOpen ? 'w-64' : 'w-[70px]'
        }`}
      >
        <AppSidebar collapsed={!desktopOpen} />
      </div>

      {/* Mobile sidebar via Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <AppHeader onToggle={handleToggle} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <AppRouteBreadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  )
}

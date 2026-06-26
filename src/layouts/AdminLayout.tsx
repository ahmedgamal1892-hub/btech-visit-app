import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { Sidebar } from '@/components/layout/Sidebar'
import { TopNavbar } from '@/components/layout/TopNavbar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks'

export function AdminLayout() {
  const isMobile = useIsMobile()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex min-h-svh bg-background">
      {!isMobile && (
        <div className="fixed inset-y-0 left-0 z-40 hidden md:block">
          <Sidebar />
        </div>
      )}

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-72 border-none bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground"
          showCloseButton
        >
          <Sidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-svh flex-1 flex-col md:pl-64">
        <TopNavbar
          showMenuButton={isMobile}
          onMenuClick={() => setMobileNavOpen(true)}
        />

        <main className="flex-1 px-4 py-6 md:px-6 md:py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

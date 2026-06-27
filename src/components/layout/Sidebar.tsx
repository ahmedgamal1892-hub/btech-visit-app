import { NavLink, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { AppBrand } from '@/components/branding'
import { SidebarUserProfile } from '@/components/layout/SidebarUserProfile'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { GhostButton } from '@/components/ui/action-buttons'
import { getNavItemsForRole, LOGOUT_NAV_ITEM } from '@/lib/constants'
import { useAuth } from '@/hooks'
import { cn } from '@/lib/utils'

type SidebarProps = {
  onNavigate?: () => void
  className?: string
}

export function Sidebar({ onNavigate, className }: SidebarProps) {
  const navigate = useNavigate()
  const { signOut, profile } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const navItems = getNavItemsForRole(profile?.role)

  const handleLogout = async () => {
    setIsSigningOut(true)

    try {
      await signOut()
      onNavigate?.()
      void navigate('/login', { replace: true })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <aside
      className={cn(
        'flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground',
        className,
      )}
    >
      <div className="px-5 py-6">
        <AppBrand variant="on-dark" showTagline />
      </div>

      <Separator className="bg-sidebar-border" />

      <ScrollArea className="flex-1 px-3 py-5">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 overflow-hidden rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ease-out',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                    : 'text-sidebar-foreground/75 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'absolute inset-y-2 left-0 w-1 rounded-r-full bg-sidebar-primary-foreground transition-opacity duration-200',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden="true"
                  />
                  <item.icon
                    className={cn(
                      'size-5 shrink-0 transition-transform duration-200',
                      'group-hover:scale-105',
                    )}
                    aria-hidden="true"
                  />
                  <span>{item.title}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      <div className="mt-auto space-y-3 border-t border-sidebar-border p-4">
        <SidebarUserProfile
          fullName={profile?.full_name}
          role={profile?.role}
        />
        <GhostButton
          type="button"
          disabled={isSigningOut}
          onClick={() => void handleLogout()}
          className="w-full justify-start gap-3 rounded-xl px-3.5 py-2.5 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {isSigningOut ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <LOGOUT_NAV_ITEM.icon
              className="size-5 shrink-0"
              aria-hidden="true"
            />
          )}
          <span>{LOGOUT_NAV_ITEM.title}</span>
        </GhostButton>
      </div>
    </aside>
  )
}

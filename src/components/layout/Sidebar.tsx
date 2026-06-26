import { NavLink, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  APP_NAME,
  APP_TAGLINE,
  getNavItemsForRole,
  LOGOUT_NAV_ITEM,
} from '@/lib/constants'
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
      <div className="px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <span className="text-sm font-bold">BT</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{APP_NAME}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">
              {APP_TAGLINE}
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <item.icon className="size-5 shrink-0" aria-hidden="true" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      <div className="mt-auto border-t border-sidebar-border p-3">
        <Button
          type="button"
          variant="ghost"
          disabled={isSigningOut}
          onClick={() => void handleLogout()}
          className="w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
        </Button>
      </div>
    </aside>
  )
}

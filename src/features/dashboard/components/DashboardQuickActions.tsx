import type { LucideIcon } from 'lucide-react'
import {
  ArrowUpRight,
  ClipboardList,
  History,
  MapPinPlus,
  Settings,
  Upload,
  Users,
} from 'lucide-react'
import { memo } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '@/hooks'
import { cn } from '@/lib/utils'

type QuickAction = {
  title: string
  description: string
  href: string
  icon: LucideIcon
  adminOnly?: boolean
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: 'New Visit',
    description: 'Start a branch inspection visit.',
    href: '/new-visit',
    icon: MapPinPlus,
  },
  {
    title: 'Daily Upload',
    description: 'Import the latest operational snapshot.',
    href: '/daily-upload',
    icon: Upload,
    adminOnly: true,
  },
  {
    title: 'Visit History',
    description: 'Browse and review submitted visits.',
    href: '/visit-history',
    icon: History,
  },
  {
    title: 'Reports',
    description: 'Generate operational visit reports.',
    href: '/reports',
    icon: ClipboardList,
  },
  {
    title: 'Users',
    description: 'Manage users and access control.',
    href: '/users',
    icon: Users,
    adminOnly: true,
  },
  {
    title: 'Audit Log',
    description: 'Review system activity and changes.',
    href: '/audit-log',
    icon: ClipboardList,
    adminOnly: true,
  },
  {
    title: 'Settings',
    description: 'Configure enterprise preferences.',
    href: '/settings',
    icon: Settings,
    adminOnly: true,
  },
]

export const DashboardQuickActions = memo(function DashboardQuickActions() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'Admin'

  const actions = QUICK_ACTIONS.filter((action) => !action.adminOnly || isAdmin)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon

        return (
          <Link key={action.title} to={action.href} className="group block">
            <article
              className={cn(
                'relative h-full overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-sm',
                'transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg',
              )}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-primary to-primary/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground">
                    {action.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
              </div>
            </article>
          </Link>
        )
      })}
    </div>
  )
})

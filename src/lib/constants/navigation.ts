import {
  ClipboardList,
  FileBarChart,
  History,
  LayoutDashboard,
  LogOut,
  MapPinPlus,
  Settings,
  Trophy,
  Upload,
  Users,
} from 'lucide-react'

import type { NavItem } from '@/types'

export { APP_NAME, APP_TAGLINE } from './branding'

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Daily Upload',
    href: '/daily-upload',
    icon: Upload,
    roles: ['Admin'],
  },
  {
    title: 'New Visit',
    href: '/new-visit',
    icon: MapPinPlus,
  },
  {
    title: 'Visit History',
    href: '/visit-history',
    icon: History,
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: FileBarChart,
  },
  {
    title: 'Ranking',
    href: '/ranking',
    icon: Trophy,
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
    roles: ['Admin'],
  },
  {
    title: 'Audit Log',
    href: '/audit-log',
    icon: ClipboardList,
    roles: ['Admin'],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['Admin'],
  },
]

export const LOGOUT_NAV_ITEM = {
  title: 'Logout',
  icon: LogOut,
} as const

export function getNavItemsForRole(role: 'Admin' | 'Visitor' | undefined) {
  if (!role) {
    return NAV_ITEMS.filter((item) => !item.roles)
  }

  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
}

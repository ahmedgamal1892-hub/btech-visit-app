import {
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  MapPinPlus,
  Settings,
  Upload,
  Users,
} from 'lucide-react'

import type { NavItem } from '@/types'

export const APP_NAME = 'BTECH Visit App'
export const APP_TAGLINE = 'Store Visit Management System for B.TECH'

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

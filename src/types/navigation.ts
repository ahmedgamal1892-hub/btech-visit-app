import type { LucideIcon } from 'lucide-react'

import type { UserRole } from '@/types/auth'

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  roles?: UserRole[]
}

export type AppRoute = NavItem['href']

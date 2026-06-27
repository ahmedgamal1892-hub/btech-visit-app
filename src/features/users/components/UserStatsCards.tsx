import {
  ClipboardList,
  ShieldCheck,
  UserCheck,
  UserRound,
  Users,
  UserX,
} from 'lucide-react'

import { StatCard, StatCardGridSkeleton } from '@/components/common'
import type { UserDirectoryStats } from '@/features/users/types/user-directory.types'

type UserStatsCardsProps = {
  stats?: UserDirectoryStats
  isLoading?: boolean
}

export function UserStatsCards({
  stats,
  isLoading = false,
}: UserStatsCardsProps) {
  if (isLoading) {
    return <StatCardGridSkeleton count={6} />
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3 2xl:grid-cols-6">
      <StatCard
        title="Total Users"
        description="Registered accounts in the directory"
        icon={Users}
        value={stats?.totalUsers ?? 0}
      />
      <StatCard
        title="Admins"
        description="Users with administration access"
        icon={ShieldCheck}
        value={stats?.admins ?? 0}
      />
      <StatCard
        title="Visitors"
        description="Field users conducting store visits"
        icon={UserRound}
        value={stats?.visitors ?? 0}
      />
      <StatCard
        title="Active Users"
        description="Accounts currently enabled to sign in"
        icon={UserCheck}
        value={stats?.activeUsers ?? 0}
      />
      <StatCard
        title="Inactive Users"
        description="Accounts disabled by an administrator"
        icon={UserX}
        value={stats?.inactiveUsers ?? 0}
      />
      <StatCard
        title="Total Visits"
        description="Submitted visits across all users"
        icon={ClipboardList}
        value={stats?.totalVisits ?? 0}
      />
    </div>
  )
}

import type { VisitHistoryStatusFilter } from '@/types/visit-history'

export type ExecutiveDashboardFilters = {
  fromDate: string
  toDate: string
  visitorId: string
  branchId: string
  governorate: string
  brand: string
  status: VisitHistoryStatusFilter
}

export type DashboardTrend = {
  label: string
  direction: 'up' | 'down' | 'neutral'
}

export type ExecutiveDashboardKpis = {
  totalBranches: number
  visitedBranches: number
  remainingBranches: number
  completionPercent: number
  visitsToday: number
  visitsThisWeek: number
  visitsThisMonth: number
  totalProductsChecked: number
  totalPhotosUploaded: number
  openIssues: number
  trends: {
    visitsThisWeek: DashboardTrend
    visitsThisMonth: DashboardTrend
    openIssues: DashboardTrend
  }
}

export type ExecutiveSummary = {
  totalBranches: number
  visitedBranches: number
  remainingBranches: number
  completionPercent: number
}

export type PersonalPerformance = {
  visitsToday: number
  visitsThisWeek: number
  visitsThisMonth: number
  lastVisitDate: string | null
  lastBranchVisited: string | null
  totalPhotosUploaded: number
  totalProductsChecked: number
  averageVisitDurationMinutes: number | null
  averageVisitDurationLabel: string
  currentRank: number | null
  totalRankedVisitors: number
}

export type DashboardInsight = {
  id: string
  title: string
  value: string
  description: string
}

export type DashboardChartPoint = {
  label: string
  value: number
  color?: string
}

export type ExecutiveDashboardCharts = {
  visitsPerDay: DashboardChartPoint[]
  visitsPerWeek: DashboardChartPoint[]
  visitsPerMonth: DashboardChartPoint[]
  visitsByVisitor: DashboardChartPoint[]
  visitsByBranch: DashboardChartPoint[]
  brandObservations: DashboardChartPoint[]
  photoUploadTrend: DashboardChartPoint[]
}

export type VisitorLeaderboardRow = {
  rank: number
  userId: string
  visitorName: string
  visits: number
  branchesCovered: number
  productsChecked: number
  photosUploaded: number
}

export type RecentActivityRow = {
  visitId: string
  visitorName: string
  branchName: string
  visitTime: string
  status: string
  photoCount: number
}

export type TopVisitorRow = {
  userId: string
  userName: string
  visits: number
  lastVisitDate: string | null
}

export type MostVisitedBranchRow = {
  branchId: string | null
  branchName: string
  visits: number
}

export type RecentVisitRow = {
  visitId: string
  visitDate: string
  branchName: string
  visitorName: string
  status: string
}

export type ExecutiveDashboardTables = {
  topVisitors: TopVisitorRow[]
  mostVisitedBranches: MostVisitedBranchRow[]
  recentVisits: RecentVisitRow[]
  leaderboard: VisitorLeaderboardRow[]
  recentActivity: RecentActivityRow[]
}

export type ExecutiveDashboardFilterOptions = {
  visitors: Array<{ id: string; name: string }>
  branches: Array<{ id: string; name: string }>
  governorates: string[]
  brands: string[]
}

export type ExecutiveDashboardData = {
  summary: ExecutiveSummary
  kpis: ExecutiveDashboardKpis
  personalPerformance?: PersonalPerformance
  charts: ExecutiveDashboardCharts
  tables: ExecutiveDashboardTables
  insights: DashboardInsight[]
  filterOptions: ExecutiveDashboardFilterOptions
}

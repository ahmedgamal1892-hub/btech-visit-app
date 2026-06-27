import type { VisitHistoryStatusFilter } from '@/types/visit-history'

export type ReportSectionId =
  | 'executive'
  | 'visitor'
  | 'branch'
  | 'product'
  | 'photo'
  | 'performance'

export type ReportsFilters = {
  fromDate: string
  toDate: string
  visitorId: string
  branchId: string
  brand: string
  category: string
  product: string
  status: VisitHistoryStatusFilter
}

export type ReportChartPoint = {
  label: string
  value: number
  color?: string
}

export type ExecutiveReportData = {
  totalVisits: number
  completedVisits: number
  pendingVisits: number
  cancelledVisits: number
  branchesCovered: number
  productsChecked: number
  photosUploaded: number
  visitorsActive: number
  averageVisitsPerDay: number
  topVisitor: string
  topBranch: string
  topProduct: string
  statusChart: ReportChartPoint[]
  trendChart: ReportChartPoint[]
}

export type VisitorReportRow = {
  userId: string
  visitorName: string
  visits: number
  branches: number
  products: number
  photos: number
  averagePerDay: number
  lastVisit: string | null
}

export type BranchReportRow = {
  branchId: string | null
  branchName: string
  visitCount: number
  lastVisit: string | null
  productsChecked: number
  photos: number
  averageScore: number
  mostCommonIssue: string
  notVisitedDays: number
}

export type ProductReportRow = {
  productName: string
  brand: string
  category: string
  observations: number
  photoCount: number
  rank: 'most' | 'least' | 'neutral'
}

export type PhotoReportData = {
  totalPhotos: number
  byVisitor: ReportChartPoint[]
  byBranch: ReportChartPoint[]
  byProduct: ReportChartPoint[]
  timeline: ReportChartPoint[]
}

export type PerformancePeriod = {
  label: string
  visits: number
  growthPercent: number | null
}

export type PerformanceReportData = {
  daily: PerformancePeriod[]
  weekly: PerformancePeriod[]
  monthly: PerformancePeriod[]
  quarterly: PerformancePeriod[]
  yearly: PerformancePeriod[]
  trendChart: ReportChartPoint[]
  growthChart: ReportChartPoint[]
}

export type ReportsFilterOptions = {
  visitors: Array<{ id: string; name: string }>
  branches: Array<{ id: string; name: string }>
  brands: string[]
  categories: string[]
  products: string[]
}

export type ReportsCenterData = {
  executive: ExecutiveReportData
  visitors: VisitorReportRow[]
  branches: BranchReportRow[]
  products: ProductReportRow[]
  photos: PhotoReportData
  performance: PerformanceReportData
  filterOptions: ReportsFilterOptions
}

export type ReportBadgeTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'

export type ReportPerformanceRow = {
  brand: string
  target: string
  actual: string
  achievementPercent: string
  achievementTone: ReportBadgeTone
}

export type ReportInspectionItem = {
  id: string
  brand: string
  productName: string
  status: string
  statusTone: ReportBadgeTone
  notes: string
}

export type ReportPhoto = {
  id: string
  alt: string
  src: string
}

export type ReportViewModel = {
  appName: string
  tagline: string
  reportTitle: string
  logoSrc: string
  logoAlt: string
  visitNumber: string
  visitDate: string
  branchName: string
  brandName: string
  visitorName: string
  visitType: string
  visitStatus: string
  visitStatusTone: ReportBadgeTone
  createdDate: string
  performance: ReportPerformanceRow[]
  inspectionItems: ReportInspectionItem[]
  photos: ReportPhoto[]
  generalNotesHtml: string
  footerText: string
  generatedAt: string
}

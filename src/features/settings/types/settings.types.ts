export type SettingsSectionId =
  | 'general'
  | 'branding'
  | 'visit'
  | 'upload'
  | 'pdf'
  | 'security'
  | 'system'
  | 'about'

export type GeneralSettings = {
  companyName: string
  applicationName: string
  companyEmail: string
  companyPhone: string
  companyAddress: string
  timeZone: string
  dateFormat: string
  language: string
}

export type VisitSettings = {
  allowDraftVisits: boolean
  allowVisitEditing: boolean
  allowVisitDeletion: boolean
  requireNotes: boolean
  requirePhotos: boolean
  maxPhotosPerVisit: number
  maxNoteLength: number
}

export type PdfSettings = {
  headerTitle: string
  footerText: string
  paperSize: string
  orientation: string
  showPhotos: boolean
  showProductStatus: boolean
  showNotes: boolean
}

export type SecuritySettings = {
  passwordPolicy: string
  minimumPasswordLength: number
  sessionTimeoutMinutes: number
  maximumLoginAttempts: number
}

export type EnterpriseSettingsState = {
  general: GeneralSettings
  visit: VisitSettings
  pdf: PdfSettings
  security: SecuritySettings
}

import { APP_NAME, APP_TAGLINE, PDF_BRANDING } from '@/lib/constants/branding'

import type { EnterpriseSettingsState } from '../types/settings.types'

export const ENTERPRISE_SETTINGS_DEFAULTS: EnterpriseSettingsState = {
  general: {
    companyName: 'BTECH',
    applicationName: APP_NAME,
    companyEmail: 'support@btech.com',
    companyPhone: '+20 16000',
    companyAddress: 'Cairo, Egypt',
    timeZone: 'Africa/Cairo',
    dateFormat: 'DD/MM/YYYY',
    language: 'English',
  },
  visit: {
    allowDraftVisits: true,
    allowVisitEditing: true,
    allowVisitDeletion: true,
    requireNotes: false,
    requirePhotos: false,
    maxPhotosPerVisit: 20,
    maxNoteLength: 2000,
  },
  pdf: {
    headerTitle: PDF_BRANDING.appName,
    footerText: PDF_BRANDING.footerText,
    paperSize: 'A4',
    orientation: 'Portrait',
    showPhotos: true,
    showProductStatus: true,
    showNotes: true,
  },
  security: {
    passwordPolicy: 'Minimum length with mixed characters recommended',
    minimumPasswordLength: 8,
    sessionTimeoutMinutes: 480,
    maximumLoginAttempts: 5,
  },
}

export const ABOUT_SETTINGS = {
  developer: 'BTECH IT',
  copyright: `© ${new Date().getFullYear()} BTECH. All rights reserved.`,
  supportEmail: ENTERPRISE_SETTINGS_DEFAULTS.general.companyEmail,
  tagline: APP_TAGLINE,
} as const

export const DEFAULT_MAX_IMAGE_SIZE_MB = 5

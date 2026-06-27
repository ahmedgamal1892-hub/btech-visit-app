import {
  useDashboardStats,
  useImportSettings,
} from '@/features/daily-upload/hooks'
import { useAuth, useSupabaseConnection } from '@/hooks'
import {
  APP_ENVIRONMENT,
  APP_VERSION,
  BUILD_VERSION,
} from '@/lib/constants/app-meta'
import { APP_NAME, LOGO_PATH, PDF_BRANDING } from '@/lib/constants/branding'
import { MAX_PHOTO_SIZE_BYTES } from '@/services/visits/visit-photo.service'

import { DEFAULT_MAX_IMAGE_SIZE_MB } from '../constants/defaults'

export function useSettingsPageData() {
  const { profile } = useAuth()
  const connection = useSupabaseConnection()
  const importSettingsQuery = useImportSettings()
  const dashboardStatsQuery = useDashboardStats()

  const importSettings = importSettingsQuery.data
  const dashboardStats = dashboardStatsQuery.data

  const isLoading =
    connection.isChecking ||
    importSettingsQuery.isLoading ||
    dashboardStatsQuery.isLoading

  const maxImageSizeMb = Math.round(
    MAX_PHOTO_SIZE_BYTES / (1024 * 1024) || DEFAULT_MAX_IMAGE_SIZE_MB,
  )

  return {
    isLoading,
    isImportSettingsLoading: importSettingsQuery.isLoading,
    isDashboardLoading: dashboardStatsQuery.isLoading,
    isConnectionLoading: connection.isChecking,
    connection,
    importSettings,
    dashboardStats,
    profile,
    appMeta: {
      applicationName: APP_NAME,
      version: APP_VERSION,
      buildVersion: BUILD_VERSION,
      environment: APP_ENVIRONMENT,
      logoPath: LOGO_PATH,
      pdfBranding: PDF_BRANDING,
    },
    uploadDisplay: {
      allowedFileTypes: importSettings?.allowedExtensions ?? ['xlsx', 'xls'],
      maxExcelSizeMb: importSettings?.maxFileSizeMb ?? 10,
      maxImageSizeMb,
      currentSnapshotStatus: dashboardStats?.currentSnapshotLabel ?? '—',
      lastUploadDate: dashboardStats?.lastUploadLabel ?? '—',
    },
    systemDisplay: {
      supabaseConnection: connection.isConnected ? 'Connected' : 'Disconnected',
      databaseStatus: connection.isConnected ? 'Operational' : 'Unavailable',
      lastSnapshotDate: dashboardStats?.currentSnapshotLabel ?? '—',
      lastDeploymentDate: import.meta.env.PROD
        ? 'Production deployment'
        : 'Local development',
      currentUserRole: profile?.role ?? 'Visitor',
    },
  }
}

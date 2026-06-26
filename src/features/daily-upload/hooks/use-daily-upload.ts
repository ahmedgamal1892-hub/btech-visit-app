import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  confirmSnapshotImport,
  fetchDashboardStats,
  fetchImportSettings,
  logFailedImport,
} from '@/services/import'
import type { ImportValidationError } from '@/types/import'

import {
  DASHBOARD_STATS_QUERY_KEY,
  IMPORT_SETTINGS_QUERY_KEY,
} from '../constants'

export function useImportSettings() {
  return useQuery({
    queryKey: [IMPORT_SETTINGS_QUERY_KEY],
    queryFn: fetchImportSettings,
    staleTime: 5 * 60_000,
  })
}

export function useDashboardStats() {
  return useQuery({
    queryKey: [DASHBOARD_STATS_QUERY_KEY],
    queryFn: fetchDashboardStats,
  })
}

type ConfirmImportInput = {
  uploadedBy: string
  displayFileName: string
  achFileName: string
  displayHash: string
  achHash: string
  validationReport: Record<string, unknown>
  stores: Parameters<typeof confirmSnapshotImport>[0]['stores']
  storeDisplay: Parameters<typeof confirmSnapshotImport>[0]['storeDisplay']
  salesAchievement: Parameters<
    typeof confirmSnapshotImport
  >[0]['salesAchievement']
}

export function useConfirmImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ConfirmImportInput) => confirmSnapshotImport(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [DASHBOARD_STATS_QUERY_KEY],
      })
    },
  })
}

export function useLogFailedImport() {
  return useMutation({
    mutationFn: (input: {
      uploadedBy: string
      displayFileName: string
      achFileName: string
      displayHash?: string
      achHash?: string
      validationErrors: ImportValidationError[]
      errorLog?: Record<string, unknown>
    }) => logFailedImport(input),
  })
}

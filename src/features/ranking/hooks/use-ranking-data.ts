import { useQuery } from '@tanstack/react-query'

import {
  STORE_RANKING_CATEGORIES_QUERY_KEY,
  STORE_RANKING_RECORDS_QUERY_KEY,
} from '@/features/ranking/constants'
import {
  loadStoreRankingCategories,
  loadStoreRankingRecords,
} from '@/services/ranking'

export function useStoreRankingCategories(storeId: string | null) {
  return useQuery({
    queryKey: [STORE_RANKING_CATEGORIES_QUERY_KEY, storeId],
    queryFn: () => loadStoreRankingCategories(storeId!),
    enabled: Boolean(storeId),
    staleTime: 30_000,
  })
}

export function useStoreRankingRecords(storeId: string | null) {
  return useQuery({
    queryKey: [STORE_RANKING_RECORDS_QUERY_KEY, storeId],
    queryFn: () => loadStoreRankingRecords(storeId!),
    enabled: Boolean(storeId),
    staleTime: 30_000,
  })
}

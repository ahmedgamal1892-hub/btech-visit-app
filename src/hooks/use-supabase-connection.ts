import { useEffect, useState } from 'react'

import {
  verifySupabaseConnection,
  type SupabaseConnectionStatus,
} from '@/services/supabase/client'

type UseSupabaseConnectionResult = {
  isChecking: boolean
  isConnected: boolean
  errorMessage: string | null
}

export function useSupabaseConnection(): UseSupabaseConnectionResult {
  const [isChecking, setIsChecking] = useState(true)
  const [status, setStatus] = useState<SupabaseConnectionStatus>({
    connected: true,
  })

  useEffect(() => {
    let isMounted = true

    const checkConnection = async () => {
      const result = await verifySupabaseConnection()

      if (isMounted) {
        setStatus(result)
        setIsChecking(false)
      }
    }

    void checkConnection()

    return () => {
      isMounted = false
    }
  }, [])

  return {
    isChecking,
    isConnected: status.connected,
    errorMessage: status.connected ? null : status.message,
  }
}

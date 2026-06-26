import { Navigate, Outlet } from 'react-router-dom'

import { LoadingScreen } from '@/components/common/LoadingScreen'
import { useAuth } from '@/hooks'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen message="Loading your workspace..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

import { Navigate, Outlet } from 'react-router-dom'

import { LoadingScreen } from '@/components/common/LoadingScreen'
import { useAuth } from '@/hooks'

export function AdminRoute() {
  const { profile, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen message="Checking permissions..." />
  }

  if (!profile || profile.role !== 'Admin' || !profile.is_active) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

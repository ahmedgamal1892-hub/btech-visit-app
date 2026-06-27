import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminRoute, GuestRoute, ProtectedRoute } from '@/components/auth'
import { AdminLayout } from '@/layouts'
import {
  AuditLogPage,
  DailyUploadPage,
  DashboardPage,
  LoginPage,
  NewVisitPage,
  SettingsPage,
  UsersPage,
  VisitSubmitSuccessPage,
  VisitDetailsPage,
  VisitHistoryPage,
  ReportsPage,
} from '@/pages'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/new-visit/success"
            element={<VisitSubmitSuccessPage />}
          />
          <Route path="/new-visit" element={<NewVisitPage />} />
          <Route path="/visit-history" element={<VisitHistoryPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route
            path="/visit-history/:visitId"
            element={<VisitDetailsPage />}
          />

          <Route element={<AdminRoute />}>
            <Route path="/daily-upload" element={<DailyUploadPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

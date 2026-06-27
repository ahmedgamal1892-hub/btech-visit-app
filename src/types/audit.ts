export type AuditLogEntry = {
  id: string
  createdAt: string
  actorUserId: string | null
  actorUsername: string
  action: string
  entityType: string
  entityId: string | null
  entityName: string | null
  details: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
}

export type AuditLogFilters = {
  search: string
  actorUserId: string
  action: string
  entityType: string
  fromDate: string
  toDate: string
  page: number
  pageSize: number
}

export type AuditLogResult = {
  rows: AuditLogEntry[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export type AuditLogFilterOptions = {
  actions: string[]
  entityTypes: string[]
  actors: Array<{
    id: string
    username: string
    fullName: string
  }>
}

export type ClientAuditContext = {
  ipAddress?: string | null
  userAgent?: string | null
}

export const AUDIT_ACTIONS = [
  'User Login',
  'User Logout',
  'Visit Created',
  'Visit Updated',
  'Visit Deleted',
  'User Created',
  'User Updated',
  'User Activated',
  'User Deactivated',
  'User Deleted',
  'Password Reset',
  'Excel Upload',
  'Settings Updated',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

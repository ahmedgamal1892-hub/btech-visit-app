import * as XLSX from 'xlsx'

import type { AuditLogEntry } from '@/types/audit'

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value))
}

export function exportAuditLogsToExcel(
  rows: AuditLogEntry[],
  filename = 'audit-logs.xlsx',
): void {
  const worksheetRows = rows.map((row) => ({
    Timestamp: formatTimestamp(row.createdAt),
    Actor: row.actorUsername,
    Action: row.action,
    'Entity Type': row.entityType,
    'Entity ID': row.entityId ?? '',
    'Entity Name': row.entityName ?? '',
    Details: JSON.stringify(row.details),
    'IP Address': row.ipAddress ?? '',
    'User Agent': row.userAgent ?? '',
  }))

  const worksheet = XLSX.utils.json_to_sheet(worksheetRows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Logs')
  XLSX.writeFile(workbook, filename)
}

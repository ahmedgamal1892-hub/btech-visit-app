import { Loader2 } from 'lucide-react'

import { EmptyState } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import {
  SecondaryButton,
  TableActionButton,
} from '@/components/ui/action-buttons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AuditLogEntry } from '@/types/audit'

type AuditLogDetailsDialogProps = {
  entry: AuditLogEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value))
}

export function AuditLogDetailsDialog({
  entry,
  open,
  onOpenChange,
}: AuditLogDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
          <DialogDescription>
            Full metadata for the selected audit event.
          </DialogDescription>
        </DialogHeader>

        {entry ? (
          <div className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Timestamp</dt>
                <dd className="font-medium">
                  {formatTimestamp(entry.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Actor</dt>
                <dd className="font-medium">{entry.actorUsername}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Action</dt>
                <dd>
                  <Badge variant="secondary">{entry.action}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Entity</dt>
                <dd className="font-medium">
                  {entry.entityType}
                  {entry.entityName ? ` · ${entry.entityName}` : ''}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Entity ID</dt>
                <dd className="font-mono text-xs break-all">
                  {entry.entityId ?? '—'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">IP Address</dt>
                <dd>{entry.ipAddress ?? '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">User Agent</dt>
                <dd className="break-all">{entry.userAgent ?? '—'}</dd>
              </div>
            </dl>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Details
              </p>
              <pre className="max-h-72 overflow-auto rounded-xl border border-border/70 bg-muted/30 p-4 text-xs whitespace-pre-wrap">
                {JSON.stringify(entry.details, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

type AuditLogTableProps = {
  rows: AuditLogEntry[]
  onSelect: (entry: AuditLogEntry) => void
}

function AuditLogCard({
  row,
  onSelect,
}: {
  row: AuditLogEntry
  onSelect: (entry: AuditLogEntry) => void
}) {
  return (
    <button
      type="button"
      className="w-full rounded-2xl border border-border/70 p-4 text-left transition-colors hover:bg-muted/30"
      onClick={() => onSelect(row)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{row.action}</p>
          <p className="text-sm text-muted-foreground">{row.actorUsername}</p>
        </div>
        <Badge variant="secondary">{row.entityType}</Badge>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {formatTimestamp(row.createdAt)}
      </p>
      <p className="mt-1 text-sm">{row.entityName ?? row.entityId ?? '—'}</p>
    </button>
  )
}

export function AuditLogTableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  )
}

export function AuditLogTable({ rows, onSelect }: AuditLogTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No audit logs found"
        description="Try adjusting your search or filters to review application activity."
        useBrandLogo
      />
    )
  }

  return (
    <>
      <div className="grid gap-4 md:hidden">
        {rows.map((row) => (
          <AuditLogCard key={row.id} row={row} onSelect={onSelect} />
        ))}
      </div>

      <TableContainer maxHeight="70vh" className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Entity Name</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatTimestamp(row.createdAt)}</TableCell>
                <TableCell>{row.actorUsername}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{row.action}</Badge>
                </TableCell>
                <TableCell>{row.entityType}</TableCell>
                <TableCell>{row.entityName ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <TableActionButton
                    label="View"
                    onClick={() => onSelect(row)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}

export function AuditLogExportButton({
  isExporting,
  onExport,
}: {
  isExporting: boolean
  onExport: () => void
}) {
  return (
    <SecondaryButton type="button" disabled={isExporting} onClick={onExport}>
      {isExporting ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Exporting...
        </>
      ) : (
        'Export to Excel'
      )}
    </SecondaryButton>
  )
}

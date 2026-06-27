import { ArrowUpDown, Eye, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { EmptyState } from '@/components/common'
import {
  PrimaryButton,
  TableActionButton,
} from '@/components/ui/action-buttons'
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
import { highlightMatch } from '@/lib/utils/highlight-text'

import { VisitStatusBadge } from '@/features/history/components/VisitStatusBadge'
import type {
  VisitHistoryRow,
  VisitHistorySortBy,
  VisitHistorySortDir,
} from '@/types/visit-history'

type VisitHistoryTableProps = {
  rows: VisitHistoryRow[]
  sortBy: VisitHistorySortBy
  sortDir: VisitHistorySortDir
  searchQuery?: string
  onSort: (sortBy: VisitHistorySortBy) => void
  canDeleteVisit: (row: VisitHistoryRow) => boolean
  onDelete: (row: VisitHistoryRow) => void
}

function formatVisitDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatVisitNumber(value: string | null): string {
  return value ?? 'Draft'
}

function SortableHeader({
  label,
  column,
  sortBy,
  sortDir,
  onSort,
}: {
  label: string
  column: VisitHistorySortBy
  sortBy: VisitHistorySortBy
  sortDir: VisitHistorySortDir
  onSort: (sortBy: VisitHistorySortBy) => void
}) {
  const isActive = sortBy === column

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
      onClick={() => onSort(column)}
    >
      {label}
      <ArrowUpDown
        className={`size-3.5 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
        aria-hidden="true"
      />
      {isActive ? (
        <span className="sr-only">
          Sorted {sortDir === 'asc' ? 'ascending' : 'descending'}
        </span>
      ) : null}
    </button>
  )
}

function VisitHistoryCard({
  row,
  onView,
  canDelete,
  onDelete,
  searchQuery = '',
}: {
  row: VisitHistoryRow
  onView: (row: VisitHistoryRow) => void
  canDelete: boolean
  onDelete: (row: VisitHistoryRow) => void
  searchQuery?: string
}) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {highlightMatch(formatVisitNumber(row.visitNumber), searchQuery)}
          </p>
          <p className="mt-1 font-medium text-foreground">
            {highlightMatch(row.branchName, searchQuery)}
          </p>
          <p className="text-sm text-muted-foreground">
            {highlightMatch(row.visitorName, searchQuery)}
          </p>
        </div>
        <VisitStatusBadge
          status={row.status}
          reviewDecision={row.reviewDecision}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Visit Date</dt>
          <dd className="font-medium">{formatVisitDate(row.visitDate)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Inspection Items</dt>
          <dd className="font-medium">{row.inspectionItemsCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Photos</dt>
          <dd className="font-medium">{row.photosCount}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <TableActionButton
          icon={Eye}
          label="View"
          onClick={() => onView(row)}
        />
        {canDelete ? (
          <TableActionButton
            icon={Trash2}
            label="Delete"
            tone="danger"
            onClick={() => onDelete(row)}
          />
        ) : null}
      </div>
    </div>
  )
}

export function VisitHistoryTableSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="surface-card space-y-3 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        ))}
      </div>

      <TableContainer maxHeight="70vh" className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 8 }).map((_, index) => (
                <TableHead key={index}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: 8 }).map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton className="h-4 w-full max-w-28" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}

export function VisitHistoryTable({
  rows,
  sortBy,
  sortDir,
  searchQuery = '',
  onSort,
  canDeleteVisit,
  onDelete,
}: VisitHistoryTableProps) {
  const navigate = useNavigate()

  function handleView(row: VisitHistoryRow) {
    if (row.status === 'Draft') {
      navigate(`/new-visit?draftId=${row.visitId}`)
      return
    }

    navigate(`/visit-history/${row.visitId}`)
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No visits found"
        description="Try adjusting your search or filters, or start a new visit."
        useBrandLogo
        action={
          <PrimaryButton type="button" onClick={() => navigate('/new-visit')}>
            New Visit
          </PrimaryButton>
        }
      />
    )
  }

  return (
    <>
      <div className="grid gap-4 md:hidden">
        {rows.map((row) => (
          <VisitHistoryCard
            key={row.visitId}
            row={row}
            onView={handleView}
            canDelete={canDeleteVisit(row)}
            onDelete={onDelete}
            searchQuery={searchQuery}
          />
        ))}
      </div>

      <TableContainer maxHeight="70vh" className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visit Number</TableHead>
              <TableHead>
                <SortableHeader
                  label="Visit Date"
                  column="visit_date"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Branch"
                  column="branch"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Visitor"
                  column="visitor"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                />
              </TableHead>
              <TableHead>Inspection Items</TableHead>
              <TableHead>Photos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.visitId}>
                <TableCell className="font-medium">
                  {highlightMatch(
                    formatVisitNumber(row.visitNumber),
                    searchQuery,
                  )}
                </TableCell>
                <TableCell>{formatVisitDate(row.visitDate)}</TableCell>
                <TableCell>
                  {highlightMatch(row.branchName, searchQuery)}
                </TableCell>
                <TableCell>
                  {highlightMatch(row.visitorName, searchQuery)}
                </TableCell>
                <TableCell>{row.inspectionItemsCount}</TableCell>
                <TableCell>{row.photosCount}</TableCell>
                <TableCell>
                  <VisitStatusBadge
                    status={row.status}
                    reviewDecision={row.reviewDecision}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <TableActionButton
                      icon={Eye}
                      label="View"
                      onClick={() => handleView(row)}
                    />
                    {canDeleteVisit(row) ? (
                      <TableActionButton
                        icon={Trash2}
                        label="Delete"
                        tone="danger"
                        onClick={() => onDelete(row)}
                      />
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}

import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import type { StoreBranch } from '@/types/visit'
import type {
  VisitHistoryFilters,
  VisitHistoryVisitorOption,
} from '@/types/visit-history'

type VisitHistoryFiltersProps = {
  filters: VisitHistoryFilters
  branches: StoreBranch[]
  visitors: VisitHistoryVisitorOption[]
  showVisitorFilter: boolean
  onChange: (filters: VisitHistoryFilters) => void
}

export function VisitHistoryFilters({
  filters,
  branches,
  visitors,
  showVisitorFilter,
  onChange,
}: VisitHistoryFiltersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <div className="space-y-2 md:col-span-2 xl:col-span-2 2xl:col-span-2">
        <Label htmlFor="visit-history-search">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="visit-history-search"
            value={filters.search}
            onChange={(event) =>
              onChange({ ...filters, search: event.target.value, page: 1 })
            }
            placeholder="Visit number, branch, or visitor"
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="visit-history-branch">Branch</Label>
        <Select
          id="visit-history-branch"
          value={filters.branchId}
          onChange={(event) =>
            onChange({ ...filters, branchId: event.target.value, page: 1 })
          }
        >
          <option value="all">All branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
      </div>

      {showVisitorFilter ? (
        <div className="space-y-2">
          <Label htmlFor="visit-history-visitor">Visitor</Label>
          <Select
            id="visit-history-visitor"
            value={filters.visitorId}
            onChange={(event) =>
              onChange({ ...filters, visitorId: event.target.value, page: 1 })
            }
          >
            <option value="all">All visitors</option>
            {visitors.map((visitor) => (
              <option key={visitor.id} value={visitor.id}>
                {visitor.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="visit-history-status">Status</Label>
        <Select
          id="visit-history-status"
          value={filters.status}
          onChange={(event) =>
            onChange({
              ...filters,
              status: event.target.value as VisitHistoryFilters['status'],
              page: 1,
            })
          }
        >
          <option value="all">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="Submitted">Submitted</option>
          <option value="Reviewed">Reviewed</option>
          <option value="Closed">Closed</option>
          <option value="needs_follow_up">Needs Follow-up</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="visit-history-from-date">From Date</Label>
        <Input
          id="visit-history-from-date"
          type="date"
          value={filters.fromDate}
          onChange={(event) =>
            onChange({ ...filters, fromDate: event.target.value, page: 1 })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="visit-history-to-date">To Date</Label>
        <Input
          id="visit-history-to-date"
          type="date"
          value={filters.toDate}
          onChange={(event) =>
            onChange({ ...filters, toDate: event.target.value, page: 1 })
          }
        />
      </div>
    </div>
  )
}

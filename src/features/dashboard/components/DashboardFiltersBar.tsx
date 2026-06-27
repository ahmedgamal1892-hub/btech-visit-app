import { Download } from 'lucide-react'

import { PageFiltersBar } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import type {
  ExecutiveDashboardFilterOptions,
  ExecutiveDashboardFilters,
} from '@/features/dashboard/types/executive-dashboard.types'

type DashboardFiltersBarProps = {
  filters: ExecutiveDashboardFilters
  options: ExecutiveDashboardFilterOptions
  onChange: (filters: ExecutiveDashboardFilters) => void
  onReset: () => void
  onRefresh: () => void
  onExportPdf: () => void
  onExportExcel: () => void
  isRefreshing?: boolean
  canExport?: boolean
}

export function DashboardFiltersBar({
  filters,
  options,
  onChange,
  onReset,
  onRefresh,
  onExportPdf,
  onExportExcel,
  isRefreshing = false,
  canExport = false,
}: DashboardFiltersBarProps) {
  const update = (patch: Partial<ExecutiveDashboardFilters>) => {
    onChange({ ...filters, ...patch })
  }

  return (
    <PageFiltersBar
      title="Dashboard Filters"
      description="Adjust filters to refresh all dashboard widgets."
      onReset={onReset}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportPdf}
            disabled={!canExport}
            title="Export dashboard to PDF"
          >
            <Download className="size-4" aria-hidden="true" />
            Export PDF
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onExportExcel}
            disabled={!canExport}
            title="Export dashboard to Excel"
          >
            <Download className="size-4" aria-hidden="true" />
            Export Excel
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="dashboard-from-date">From Date</Label>
          <Input
            id="dashboard-from-date"
            type="date"
            value={filters.fromDate}
            onChange={(event) => update({ fromDate: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dashboard-to-date">To Date</Label>
          <Input
            id="dashboard-to-date"
            type="date"
            value={filters.toDate}
            onChange={(event) => update({ toDate: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dashboard-visitor">Visitor</Label>
          <Select
            id="dashboard-visitor"
            value={filters.visitorId}
            onChange={(event) => update({ visitorId: event.target.value })}
          >
            <option value="all">All visitors</option>
            {options.visitors.map((visitor) => (
              <option key={visitor.id} value={visitor.id}>
                {visitor.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dashboard-branch">Branch</Label>
          <Select
            id="dashboard-branch"
            value={filters.branchId}
            onChange={(event) => update({ branchId: event.target.value })}
          >
            <option value="all">All branches</option>
            {options.branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dashboard-governorate">Governorate</Label>
          <Select
            id="dashboard-governorate"
            value={filters.governorate}
            onChange={(event) => update({ governorate: event.target.value })}
          >
            <option value="all">All governorates</option>
            {options.governorates.map((governorate) => (
              <option key={governorate} value={governorate}>
                {governorate}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dashboard-brand">Brand</Label>
          <Select
            id="dashboard-brand"
            value={filters.brand}
            onChange={(event) => update({ brand: event.target.value })}
          >
            <option value="all">All brands</option>
            {options.brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dashboard-status">Visit Status</Label>
          <Select
            id="dashboard-status"
            value={filters.status}
            onChange={(event) =>
              update({
                status: event.target
                  .value as ExecutiveDashboardFilters['status'],
              })
            }
          >
            <option value="all">All statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Draft">Draft</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Closed">Closed</option>
          </Select>
        </div>
      </div>
    </PageFiltersBar>
  )
}

import { PageFiltersBar } from '@/components/common'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

import type {
  ReportsFilterOptions,
  ReportsFilters,
} from '../types/reports.types'

type ReportsFiltersBarProps = {
  filters: ReportsFilters
  options: ReportsFilterOptions
  onChange: (filters: ReportsFilters) => void
  onReset: () => void
  onRefresh: () => void
  isRefreshing?: boolean
}

export function ReportsFiltersBar({
  filters,
  options,
  onChange,
  onReset,
  onRefresh,
  isRefreshing = false,
}: ReportsFiltersBarProps) {
  const update = (patch: Partial<ReportsFilters>) => {
    onChange({ ...filters, ...patch })
  }

  return (
    <PageFiltersBar
      title="Global Report Filters"
      description="Filters apply across all report sections."
      onReset={onReset}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="reports-from-date">From Date</Label>
          <Input
            id="reports-from-date"
            type="date"
            value={filters.fromDate}
            onChange={(event) => update({ fromDate: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reports-to-date">To Date</Label>
          <Input
            id="reports-to-date"
            type="date"
            value={filters.toDate}
            onChange={(event) => update({ toDate: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reports-visitor">Visitor</Label>
          <Select
            id="reports-visitor"
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
          <Label htmlFor="reports-branch">Branch</Label>
          <Select
            id="reports-branch"
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
          <Label htmlFor="reports-brand">Brand</Label>
          <Select
            id="reports-brand"
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
          <Label htmlFor="reports-category">Category</Label>
          <Select
            id="reports-category"
            value={filters.category}
            onChange={(event) => update({ category: event.target.value })}
          >
            <option value="all">All categories</option>
            {options.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reports-product">Product</Label>
          <Select
            id="reports-product"
            value={filters.product}
            onChange={(event) => update({ product: event.target.value })}
          >
            <option value="all">All products</option>
            {options.products.map((product) => (
              <option key={product} value={product}>
                {product}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reports-status">Status</Label>
          <Select
            id="reports-status"
            value={filters.status}
            onChange={(event) =>
              update({
                status: event.target.value as ReportsFilters['status'],
              })
            }
          >
            <option value="all">All statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Closed">Closed</option>
          </Select>
        </div>
      </div>
    </PageFiltersBar>
  )
}

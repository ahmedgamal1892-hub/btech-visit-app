import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

type TablePaginationProps = {
  label: string
  page: number
  totalPages: number
  pageSize: number
  pageSizeOptions: readonly number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizeId?: string
}

export function TablePagination({
  label,
  page,
  totalPages,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  pageSizeId = 'table-page-size',
}: TablePaginationProps) {
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm text-muted-foreground">{label}</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Label htmlFor={pageSizeId} className="sr-only">
            Rows per page
          </Label>
          <Select
            id={pageSizeId}
            value={String(pageSize)}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} rows
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

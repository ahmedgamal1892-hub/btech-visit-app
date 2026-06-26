import { Label } from '@/components/ui/label'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'
import type { StoreBranch } from '@/types/visit'

type BranchSelectorProps = {
  branches: StoreBranch[]
  value: string
  onChange: (branchId: string) => void
  disabled?: boolean
  isLoading?: boolean
}

export function BranchSelector({
  branches,
  value,
  onChange,
  disabled = false,
  isLoading = false,
}: BranchSelectorProps) {
  const options = branches.map((branch) => ({
    value: branch.id,
    label: branch.name,
  }))

  return (
    <div className="space-y-2">
      <Label htmlFor="branch-selector">
        Branch <span className="text-destructive">*</span>
      </Label>
      <SearchableCombobox
        id="branch-selector"
        options={options}
        value={value}
        onChange={onChange}
        placeholder={isLoading ? 'Loading branches...' : 'Search branch...'}
        disabled={disabled || isLoading}
        emptyMessage="No branch found"
        aria-label="Search branch"
      />
    </div>
  )
}

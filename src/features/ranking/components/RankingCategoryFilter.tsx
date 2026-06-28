import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SearchableMultiCombobox } from '@/components/ui/searchable-multi-combobox'

type RankingCategoryFilterProps = {
  categories: string[]
  value: string[]
  onChange: (categories: string[]) => void
  disabled?: boolean
  isLoading?: boolean
}

export function RankingCategoryFilter({
  categories,
  value,
  onChange,
  disabled = false,
  isLoading = false,
}: RankingCategoryFilterProps) {
  const options = useMemo(
    () =>
      categories.map((category) => ({
        value: category,
        label: category,
      })),
    [categories],
  )

  const isDisabled = disabled || isLoading || categories.length === 0
  const selectedCountLabel =
    value.length === 0
      ? 'All categories combined'
      : `${value.length} Categor${value.length === 1 ? 'y' : 'ies'} Selected`

  function handleSelectAll() {
    onChange([...categories])
  }

  function handleClearAll() {
    onChange([])
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="ranking-category-filter" className="min-w-0 shrink">
          Categories
        </Label>
        <span className="max-w-full min-w-0 truncate text-xs font-medium text-muted-foreground">
          {selectedCountLabel}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDisabled}
          onClick={handleSelectAll}
        >
          Select All
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDisabled || value.length === 0}
          onClick={handleClearAll}
        >
          Clear All
        </Button>
      </div>

      <SearchableMultiCombobox
        id="ranking-category-filter"
        options={options}
        value={value}
        onChange={onChange}
        placeholder={
          isLoading
            ? 'Loading categories...'
            : 'Select one or more categories...'
        }
        disabled={isDisabled}
        clearable
        showCheckboxes
        emptyMessage="No categories found"
        aria-label="Select categories"
      />
    </div>
  )
}

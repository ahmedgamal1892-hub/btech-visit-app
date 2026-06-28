import { Label } from '@/components/ui/label'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'
import type { StoreBranch } from '@/types/visit'

type RankingStoreSelectorProps = {
  stores: StoreBranch[]
  value: string
  onChange: (storeId: string) => void
  disabled?: boolean
  isLoading?: boolean
}

export function RankingStoreSelector({
  stores,
  value,
  onChange,
  disabled = false,
  isLoading = false,
}: RankingStoreSelectorProps) {
  const options = stores.map((store) => ({
    value: store.id,
    label: store.name,
  }))

  return (
    <div className="w-full min-w-0 max-w-full space-y-2">
      <Label htmlFor="ranking-store-selector">
        Store <span className="text-destructive">*</span>
      </Label>
      <SearchableCombobox
        id="ranking-store-selector"
        options={options}
        value={value}
        onChange={onChange}
        placeholder={isLoading ? 'Loading stores...' : 'Search Store...'}
        disabled={disabled || isLoading}
        clearable
        emptyMessage="No results found"
        aria-label="Search Store"
      />
    </div>
  )
}

import { Camera, ChevronDown, ImageIcon, Trash2 } from 'lucide-react'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { getProductsForBrand } from '@/services/visits'
import type {
  BranchProduct,
  VisitProductDraft,
  VisitProductStatus,
  VisitStatusOption,
} from '@/types/visit'
import {
  isVisitProductIncomplete,
  isVisitProductStatus,
  visitStatusIcon,
} from '@/types/visit'

type VisitProductCardProps = {
  index: number
  product: VisitProductDraft
  branchBrands: string[]
  branchProducts: BranchProduct[]
  hasBranch: boolean
  statusOptions: VisitStatusOption[]
  selectedProductIds: string[]
  isExpanded: boolean
  visitPhotosCount: number
  firstVisitPhotoUrl?: string | null
  onToggleExpand: () => void
  onChange: (product: VisitProductDraft) => void
  onRemove: () => void
}

export function VisitProductCard({
  index,
  product,
  branchBrands,
  branchProducts,
  hasBranch,
  statusOptions,
  selectedProductIds,
  isExpanded,
  visitPhotosCount,
  firstVisitPhotoUrl,
  onToggleExpand,
  onChange,
  onRemove,
}: VisitProductCardProps) {
  const brandOptions = useMemo(
    () =>
      branchBrands.map((brand) => ({
        value: brand,
        label: brand,
      })),
    [branchBrands],
  )

  const productsForBrand = useMemo(
    () => getProductsForBrand(branchProducts, product.brand),
    [branchProducts, product.brand],
  )

  const selectableProducts = productsForBrand.filter(
    (item) =>
      item.id === product.productId || !selectedProductIds.includes(item.id),
  )

  const productOptions = useMemo(
    () =>
      selectableProducts.map((item) => ({
        value: item.id,
        label: item.product_name,
      })),
    [selectableProducts],
  )

  const selectedProduct = branchProducts.find(
    (item) => item.id === product.productId,
  )

  const isIncomplete = isVisitProductIncomplete(product)
  const hasStatus = isVisitProductStatus(product.status)

  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm transition-all duration-200 hover:border-primary/20 hover:shadow-md">
      <CardHeader className="p-0">
        <button
          type="button"
          className="flex w-full items-start gap-4 rounded-2xl px-4 py-4 text-left transition-colors hover:bg-muted/30 sm:items-center"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          aria-controls={`product-panel-${product.clientId}`}
        >
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/30">
            {firstVisitPhotoUrl ? (
              <img
                src={firstVisitPhotoUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <ImageIcon className="size-6 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-semibold sm:text-base">
                {selectedProduct?.product_name || `Product #${index + 1}`}
              </span>
              {isIncomplete ? (
                <Badge variant="secondary" className="rounded-full">
                  Incomplete
                </Badge>
              ) : (
                <Badge variant="success" className="rounded-full">
                  Reviewed
                </Badge>
              )}
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Item Code:</span>{' '}
                {selectedProduct?.item_code || '—'}
              </p>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Status:</span>{' '}
                {hasStatus ? (
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    <span aria-hidden="true">
                      {visitStatusIcon(product.status as VisitProductStatus)}
                    </span>
                    {product.status}
                  </span>
                ) : (
                  '—'
                )}
              </p>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Condition:</span>{' '}
                {selectedProduct?.sub_category?.trim() || product.status || '—'}
              </p>
              <p className="text-muted-foreground sm:col-span-2 xl:col-span-3">
                <span className="font-medium text-foreground">Notes:</span>{' '}
                {product.notes.trim() || '—'}
              </p>
              <p className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Camera className="size-3.5" />
                <span className="font-medium text-foreground">
                  Photo Count:
                </span>{' '}
                {visitPhotosCount}
              </p>
            </div>
          </div>

          <ChevronDown
            className={cn(
              'mt-0.5 size-5 shrink-0 text-muted-foreground transition-transform sm:mt-0',
              isExpanded && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>
      </CardHeader>

      {isExpanded ? (
        <CardContent
          id={`product-panel-${product.clientId}`}
          className="space-y-5 border-t pt-6"
        >
          <div className="space-y-2">
            <Label htmlFor={`brand-${product.clientId}`}>
              Brand <span className="text-destructive">*</span>
            </Label>
            <SearchableCombobox
              id={`brand-${product.clientId}`}
              options={brandOptions}
              value={product.brand}
              onChange={(brand) =>
                onChange({
                  ...product,
                  brand,
                  productId: '',
                })
              }
              placeholder="Select brand..."
              disabled={!hasBranch}
              emptyMessage="No brand found"
              aria-label="Select brand"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`product-${product.clientId}`}>
              Product <span className="text-destructive">*</span>
            </Label>
            <SearchableCombobox
              id={`product-${product.clientId}`}
              options={productOptions}
              value={product.productId}
              onChange={(productId) =>
                onChange({
                  ...product,
                  productId,
                })
              }
              placeholder="Search product..."
              disabled={!hasBranch || !product.brand}
              emptyMessage="No product found"
              aria-label="Search product"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`status-${product.clientId}`}>Status</Label>
            <Select
              id={`status-${product.clientId}`}
              value={product.status}
              onChange={(event) => {
                const value = event.target.value
                onChange({
                  ...product,
                  status: isVisitProductStatus(value) ? value : '',
                })
              }}
            >
              <option value="">Select status</option>
              {statusOptions.map((status) => (
                <option key={status.id} value={status.label}>
                  {visitStatusIcon(status.label)} {status.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`notes-${product.clientId}`}>Notes</Label>
            <Textarea
              id={`notes-${product.clientId}`}
              value={product.notes}
              placeholder="Add product-specific notes..."
              onChange={(event) =>
                onChange({
                  ...product,
                  notes: event.target.value,
                })
              }
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
              Remove Product
            </Button>
          </div>
        </CardContent>
      ) : null}
    </Card>
  )
}

import { Loader2, Plus, Store } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import {
  BranchBrandPerformanceCard,
  BranchSelector,
  NewVisitActionBar,
  NewVisitCollapsibleSection,
  NewVisitValidationSummary,
  VisitPhotosUploader,
  VisitProductCard,
  useBranchBrandPerformance,
  useBranchProducts,
  useBranches,
  useSubmitVisit,
  useVisitStatuses,
} from '@/features/visits'
import { useFollowUpDraftVisit } from '@/features/visits/hooks/use-follow-up-draft'
import { useAuth } from '@/hooks'
import {
  canAddProduct,
  scrollToNewVisitSection,
  validateNewVisit,
  type NewVisitSectionId,
} from '@/lib/validations/new-visit'
import { getDistinctBrands } from '@/services/visits'
import type { VisitPhotoDraft, VisitProductDraft } from '@/types/visit'
import { createFallbackVisitStatusOptions } from '@/types/visit'

const DEFAULT_EXPANDED_SECTIONS: Record<
  Exclude<NewVisitSectionId, 'submit'>,
  boolean
> = {
  info: true,
  branch: true,
  performance: true,
  inspection: true,
  photos: true,
  notes: true,
}

function createProductDraft(): VisitProductDraft {
  return {
    clientId: crypto.randomUUID(),
    brand: '',
    productId: '',
    status: '',
    notes: '',
  }
}

function formatVisitDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
  }).format(date)
}

function ProductCardsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={index}
          className="space-y-4 rounded-xl border border-border/70 p-4"
        >
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  )
}

export function NewVisitPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const draftId = searchParams.get('draftId')
  const { profile, isLoading: isAuthLoading } = useAuth()
  const { toast } = useToast()
  const submitVisitMutation = useSubmitVisit()
  const { data: branches = [], isLoading: isBranchesLoading } = useBranches()
  const { data: visitStatuses = createFallbackVisitStatusOptions() } =
    useVisitStatuses()

  const [branchId, setBranchId] = useState('')
  const {
    data: followUpDraft,
    isLoading: isFollowUpDraftLoading,
    isError: isFollowUpDraftError,
    error: followUpDraftError,
  } = useFollowUpDraftVisit(draftId)
  const activeBranchId = followUpDraft?.storeId ?? branchId
  const followUpDraftVisitId = followUpDraft?.visitId ?? null
  const [products, setProducts] = useState<VisitProductDraft[]>([])
  const [expandedProductId, setExpandedProductId] = useState<string | null>(
    null,
  )
  const [visitPhotos, setVisitPhotos] = useState<VisitPhotoDraft[]>([])
  const [generalNotes, setGeneralNotes] = useState('')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [showValidationSummary, setShowValidationSummary] = useState(false)
  const [expandedSections, setExpandedSections] = useState(
    DEFAULT_EXPANDED_SECTIONS,
  )

  const {
    data: branchProducts = [],
    isLoading: isBranchProductsLoading,
    isFetching: isBranchProductsFetching,
  } = useBranchProducts(activeBranchId || null)

  const {
    data: brandPerformance = [],
    isLoading: isBrandPerformanceLoading,
    isFetching: isBrandPerformanceFetching,
  } = useBranchBrandPerformance(activeBranchId || null)

  const selectedBranch =
    branches.find((branch) => branch.id === activeBranchId) ?? null

  const visitDateLabel = useMemo(() => formatVisitDate(new Date()), [])
  const userLabel =
    profile?.full_name?.trim() || profile?.username || 'Unknown user'

  const selectedProductIds = products
    .map((product) => product.productId)
    .filter(Boolean)

  const validation = validateNewVisit({
    branchId: activeBranchId || null,
    products,
  })

  const isProductsLoading =
    Boolean(activeBranchId) &&
    (isBranchProductsLoading || isBranchProductsFetching)

  const isBrandPerformanceLoadingState =
    Boolean(activeBranchId) &&
    (isBrandPerformanceLoading || isBrandPerformanceFetching)

  const branchBrands = useMemo(
    () => getDistinctBrands(branchProducts),
    [branchProducts],
  )

  useEffect(() => {
    if (!isFollowUpDraftError) {
      return
    }

    toast({
      variant: 'error',
      title: 'Unable to load follow-up visit',
      description:
        followUpDraftError instanceof Error
          ? followUpDraftError.message
          : 'The follow-up draft could not be loaded.',
    })
    navigate('/visit-history', { replace: true })
  }, [followUpDraftError, isFollowUpDraftError, navigate, toast])

  useEffect(() => {
    return () => {
      for (const photo of visitPhotos) {
        if (!photo.persisted && photo.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(photo.previewUrl)
        }
      }
    }
  }, [visitPhotos])

  function toggleSection(sectionId: Exclude<NewVisitSectionId, 'submit'>) {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }))
  }

  function handleBranchChange(nextBranchId: string) {
    setBranchId(nextBranchId)
    setProducts([])
    setExpandedProductId(null)
    setVisitPhotos([])
    setGeneralNotes('')
    setActionMessage(null)
    setShowValidationSummary(false)
  }

  function handleAddProduct() {
    if (!canAddProduct(activeBranchId || null)) {
      const message = 'Select a branch before adding products.'
      setActionMessage(message)
      toast({
        variant: 'error',
        title: 'Branch required',
        description: message,
      })
      return
    }

    if (branchProducts.length === 0) {
      const message = 'No products available for this branch.'
      setActionMessage(message)
      toast({
        variant: 'error',
        title: 'No products available',
        description: message,
      })
      return
    }

    if (branchBrands.length === 0) {
      const message = 'No brands available for this branch.'
      setActionMessage(message)
      toast({
        variant: 'error',
        title: 'No brands available',
        description: message,
      })
      return
    }

    setActionMessage(null)
    const newProduct = createProductDraft()
    setProducts((current) => [...current, newProduct])
    setExpandedProductId(newProduct.clientId)
  }

  function updateProduct(clientId: string, nextProduct: VisitProductDraft) {
    setProducts((current) =>
      current.map((product) =>
        product.clientId === clientId ? nextProduct : product,
      ),
    )
  }

  function removeProduct(clientId: string) {
    setProducts((current) =>
      current.filter((item) => item.clientId !== clientId),
    )

    setExpandedProductId((current) => (current === clientId ? null : current))
  }

  function toggleProductExpanded(clientId: string) {
    setExpandedProductId((current) => (current === clientId ? null : clientId))
  }

  async function handleSubmitVisit() {
    const validationResult = validateNewVisit({
      branchId: activeBranchId || null,
      products,
    })

    if (!validationResult.isValid || !selectedBranch) {
      setShowValidationSummary(true)
      setActionMessage(null)
      scrollToNewVisitSection(validationResult.issues[0]?.sectionId ?? 'branch')
      toast({
        variant: 'error',
        title: 'Cannot submit visit',
        description: 'Please complete all required fields before submitting.',
      })
      return
    }

    setActionMessage(null)
    setShowValidationSummary(false)

    const result = await submitVisitMutation.mutateAsync({
      storeId: selectedBranch.id,
      storeName: selectedBranch.name,
      generalNotes,
      branchProducts,
      products,
      photos: visitPhotos,
      statusOptions: visitStatuses,
      draftVisitId: followUpDraftVisitId ?? undefined,
    })

    if (!result.success) {
      setShowValidationSummary(true)
      setActionMessage(result.message)
      scrollToNewVisitSection('submit')
      toast({
        variant: 'error',
        title: 'Visit submission failed',
        description: result.message,
      })
      return
    }

    navigate('/new-visit/success', {
      replace: true,
      state: {
        visitId: result.visitId,
        visitNumber: result.visitNumber,
        submittedAt: new Date().toISOString(),
        branchName: selectedBranch.name,
        visitorName: userLabel,
      },
    })
  }

  if (isAuthLoading || (draftId && isFollowUpDraftLoading)) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading new visit...
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 pb-28">
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Store className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">New Visit</h2>
            <p className="text-sm text-muted-foreground">
              {followUpDraftVisitId
                ? 'Complete the follow-up visit for the linked parent visit.'
                : 'Create a branch visit, add products, and capture notes and photos.'}
            </p>
          </div>
        </div>

        {showValidationSummary &&
        (actionMessage || validation.issues.length > 0) ? (
          <NewVisitValidationSummary
            issues={validation.issues}
            actionMessage={actionMessage}
          />
        ) : null}

        <NewVisitCollapsibleSection
          sectionId="info"
          title="Visit Information"
          description="Details for this store visit session."
          expanded={expandedSections.info}
          onToggle={() => toggleSection('info')}
        >
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Visit Date
              </dt>
              <dd className="text-sm font-medium">{visitDateLabel}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Logged In User
              </dt>
              <dd className="text-sm font-medium">{userLabel}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Selected Branch
              </dt>
              <dd className="text-sm font-medium">
                {selectedBranch?.name ?? 'Not selected'}
              </dd>
            </div>
          </dl>
        </NewVisitCollapsibleSection>

        <NewVisitCollapsibleSection
          sectionId="branch"
          title="Branch"
          description="Choose the branch you are visiting. Products load from the current snapshot for that branch."
          expanded={expandedSections.branch}
          onToggle={() => toggleSection('branch')}
        >
          <BranchSelector
            branches={branches}
            value={activeBranchId}
            onChange={handleBranchChange}
            isLoading={isBranchesLoading}
            disabled={Boolean(followUpDraftVisitId)}
          />
        </NewVisitCollapsibleSection>

        <NewVisitCollapsibleSection
          sectionId="performance"
          title="Branch Performance"
          description="Month-to-date sales target and achievement by brand for the selected branch."
          expanded={expandedSections.performance}
          onToggle={() => toggleSection('performance')}
        >
          {!activeBranchId ? (
            <p className="text-sm text-muted-foreground" role="status">
              Select a branch to view performance data.
            </p>
          ) : (
            <BranchBrandPerformanceCard
              rows={brandPerformance}
              isLoading={isBrandPerformanceLoadingState}
              embedded
            />
          )}
        </NewVisitCollapsibleSection>

        <NewVisitCollapsibleSection
          sectionId="inspection"
          title="Inspection Items"
          description="Add one or more products observed during this visit."
          expanded={expandedSections.inspection}
          onToggle={() => toggleSection('inspection')}
        >
          <div className="space-y-4">
            {!activeBranchId ? (
              <p className="text-sm text-muted-foreground" role="status">
                Select a branch before adding inspection items.
              </p>
            ) : null}

            {activeBranchId && isProductsLoading ? (
              <ProductCardsSkeleton />
            ) : null}

            {activeBranchId &&
            !isProductsLoading &&
            branchProducts.length === 0 ? (
              <div
                className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground"
                role="status"
              >
                No products available for this branch.
              </div>
            ) : null}

            {activeBranchId &&
            !isProductsLoading &&
            branchProducts.length > 0 &&
            products.length === 0 ? (
              <p className="text-sm text-muted-foreground" role="status">
                No inspection items yet. Add at least one product to continue.
              </p>
            ) : null}

            {products.map((product, index) => (
              <VisitProductCard
                key={product.clientId}
                index={index}
                product={product}
                branchBrands={branchBrands}
                branchProducts={branchProducts}
                hasBranch={Boolean(activeBranchId)}
                statusOptions={visitStatuses}
                selectedProductIds={selectedProductIds}
                isExpanded={expandedProductId === product.clientId}
                onToggleExpand={() => toggleProductExpanded(product.clientId)}
                onChange={(nextProduct) =>
                  updateProduct(product.clientId, nextProduct)
                }
                onRemove={() => removeProduct(product.clientId)}
              />
            ))}

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-auto min-h-16 w-full border-dashed py-6 text-base"
              onClick={handleAddProduct}
            >
              <Plus className="size-5" />
              Add Product
            </Button>
          </div>
        </NewVisitCollapsibleSection>

        <NewVisitCollapsibleSection
          sectionId="photos"
          title="Visit Photos"
          description="Upload photos for this visit. Images are attached to the visit, not individual products."
          expanded={expandedSections.photos}
          onToggle={() => toggleSection('photos')}
        >
          <VisitPhotosUploader photos={visitPhotos} onChange={setVisitPhotos} />
        </NewVisitCollapsibleSection>

        <NewVisitCollapsibleSection
          sectionId="notes"
          title="General Notes"
          description="Add visit-level notes that apply to the entire branch visit."
          expanded={expandedSections.notes}
          onToggle={() => toggleSection('notes')}
        >
          <div className="space-y-2">
            <Label htmlFor="general-notes">Notes</Label>
            <Textarea
              id="general-notes"
              value={generalNotes}
              placeholder="Enter general visit notes..."
              onChange={(event) => setGeneralNotes(event.target.value)}
            />
          </div>
        </NewVisitCollapsibleSection>
      </div>

      <NewVisitActionBar
        onSubmit={() => void handleSubmitVisit()}
        isSubmitting={submitVisitMutation.isPending}
      />
    </div>
  )
}

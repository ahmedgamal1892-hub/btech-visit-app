import { Loader2, MapPinPlus, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { AlertBanner, PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import {
  BranchBrandPerformanceCard,
  BranchDetailsPanel,
  BranchSelector,
  NewVisitActionBar,
  NewVisitCollapsibleSection,
  NewVisitHeader,
  NewVisitProgress,
  NewVisitSummaryPanel,
  NewVisitValidationSummary,
  VisitDateField,
  VisitPhotosUploader,
  VisitProductCard,
  useBranchBrandPerformance,
  useBranchProducts,
  useBranches,
  useSubmitVisit,
  useVisitStatuses,
} from '@/features/visits'
import { useSaveVisitDraft } from '@/features/visits/hooks/use-save-visit-draft'
import { useUnsavedChangesWarning } from '@/features/visits/hooks/use-unsaved-changes-warning'
import { useVisitDraftAutosave } from '@/features/visits/hooks/use-visit-draft-autosave'
import { useVisitDraftResume } from '@/features/visits/hooks/use-visit-draft-resume'
import {
  getVisitCompletionPercent,
  getVisitProgressSteps,
} from '@/features/visits/utils/visit-progress'
import {
  countAvailableBranchProducts,
  sortVisitProducts,
} from '@/features/visits/utils/auto-add-products'
import { useAuth } from '@/hooks'
import {
  canAddProduct,
  scrollToNewVisitSection,
  validateNewVisit,
  type NewVisitSectionId,
} from '@/lib/validations/new-visit'
import {
  formatVisitDateInputLabel,
  getTodayDateInputValue,
  isVisitDateAllowed,
  startedAtToVisitDateInput,
  visitDateInputToStartedAt,
} from '@/lib/utils/visit-date'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const draftIdFromUrl = searchParams.get('draftId')
  const { profile, isLoading: isAuthLoading } = useAuth()
  const { toast } = useToast()
  const submitVisitMutation = useSubmitVisit()
  const saveDraftMutation = useSaveVisitDraft()
  const { data: branches = [], isLoading: isBranchesLoading } = useBranches()
  const { data: visitStatuses = createFallbackVisitStatusOptions() } =
    useVisitStatuses()

  const {
    data: resumedDraft,
    isLoading: isDraftResumeLoading,
    isError: isDraftResumeError,
    error: draftResumeError,
  } = useVisitDraftResume(draftIdFromUrl, Boolean(draftIdFromUrl))

  const [branchId, setBranchId] = useState('')
  const [visitDate, setVisitDate] = useState(getTodayDateInputValue)
  const [savedDraftVisitId, setSavedDraftVisitId] = useState<string | null>(
    draftIdFromUrl,
  )
  const [visitNumberLabel, setVisitNumberLabel] = useState('Draft · Pending')
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
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isDraftHydrated, setIsDraftHydrated] = useState(!draftIdFromUrl)
  const hasHydratedDraft = useRef(false)

  const activeBranchId = resumedDraft?.storeId ?? branchId
  const draftVisitId = savedDraftVisitId ?? resumedDraft?.visitId ?? null
  const isFollowUpDraft = Boolean(resumedDraft?.isFollowUp)

  const selectedBranch = useMemo(
    () =>
      branches.find((branch) => branch.id === activeBranchId) ??
      (resumedDraft
        ? {
            id: resumedDraft.storeId,
            name: resumedDraft.storeName,
            budget_channel: null,
          }
        : null),
    [activeBranchId, branches, resumedDraft],
  )

  const {
    data: branchProducts = [],
    isLoading: isBranchProductsLoading,
    isFetching: isBranchProductsFetching,
  } = useBranchProducts(activeBranchId || null, selectedBranch?.name ?? null)

  const {
    data: brandPerformance = [],
    isLoading: isBrandPerformanceLoading,
    isFetching: isBrandPerformanceFetching,
  } = useBranchBrandPerformance(activeBranchId || null)

  const userLabel =
    profile?.full_name?.trim() || profile?.username || 'Unknown user'

  const visitDateLabel = formatVisitDateInputLabel(visitDate)

  const selectedProductIds = products
    .map((product) => product.productId)
    .filter(Boolean)

  const validation = validateNewVisit({
    branchId: activeBranchId || null,
    products,
  })

  const visitStatus = validation.isValid ? 'Ready' : 'Draft'

  const progressSteps = getVisitProgressSteps({
    branchSelected: Boolean(activeBranchId),
    products,
    photosCount: visitPhotos.length,
    isReady: validation.isValid,
  })

  const completionPercent = getVisitCompletionPercent(progressSteps)

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

  const firstVisitPhotoUrl = visitPhotos[0]?.previewUrl ?? null

  function renderProductCard(product: VisitProductDraft, index: number) {
    return (
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
        visitPhotosCount={visitPhotos.length}
        firstVisitPhotoUrl={firstVisitPhotoUrl}
        onToggleExpand={() => toggleProductExpanded(product.clientId)}
        onChange={(nextProduct) => updateProduct(product.clientId, nextProduct)}
        onRemove={() => removeProduct(product.clientId)}
      />
    )
  }

  useEffect(() => {
    if (!resumedDraft || hasHydratedDraft.current) {
      return
    }

    hasHydratedDraft.current = true
    setIsDraftHydrated(true)
    setBranchId(resumedDraft.storeId)
    setSavedDraftVisitId(resumedDraft.visitId)
    setVisitDate(startedAtToVisitDateInput(resumedDraft.startedAt))
    setProducts(sortVisitProducts(resumedDraft.products))
    setGeneralNotes(resumedDraft.generalNotes)
    setVisitNumberLabel(
      resumedDraft.visitNumber ??
        `Draft · ${resumedDraft.visitId.slice(0, 8).toUpperCase()}`,
    )
    setIsDirty(false)
  }, [resumedDraft])

  useEffect(() => {
    if (!isDraftResumeError) {
      return
    }

    toast({
      variant: 'error',
      title: 'Unable to load draft visit',
      description:
        draftResumeError instanceof Error
          ? draftResumeError.message
          : 'The draft visit could not be loaded.',
    })
    navigate('/visit-history', { replace: true })
  }, [draftResumeError, isDraftResumeError, navigate, toast])

  useEffect(() => {
    return () => {
      for (const photo of visitPhotos) {
        if (!photo.persisted && photo.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(photo.previewUrl)
        }
      }
    }
  }, [visitPhotos])

  const markDirty = useCallback(() => {
    setIsDirty(true)
  }, [])

  const saveDraft = useCallback(async () => {
    if (!selectedBranch || submitVisitMutation.isPending) {
      return
    }

    const result = await saveDraftMutation.mutateAsync({
      visitId: draftVisitId,
      storeId: selectedBranch.id,
      storeName: selectedBranch.name,
      generalNotes,
      products,
      startedAt: visitDateInputToStartedAt(visitDate),
    })

    if (!result.success) {
      toast({
        variant: 'error',
        title: 'Draft save failed',
        description: result.message,
      })
      return
    }

    setSavedDraftVisitId(result.visitId)
    setLastSavedAt(new Date())
    setIsDirty(false)

    if (draftIdFromUrl !== result.visitId) {
      setSearchParams({ draftId: result.visitId }, { replace: true })
    }

    if (visitNumberLabel === 'Draft · Pending') {
      setVisitNumberLabel(`Draft · ${result.visitId.slice(0, 8).toUpperCase()}`)
    }
  }, [
    draftIdFromUrl,
    draftVisitId,
    generalNotes,
    products,
    saveDraftMutation,
    selectedBranch,
    setSearchParams,
    submitVisitMutation.isPending,
    toast,
    visitDate,
    visitNumberLabel,
  ])

  useVisitDraftAutosave({
    enabled:
      Boolean(activeBranchId) && isDirty && !submitVisitMutation.isPending,
    onSave: saveDraft,
  })

  useUnsavedChangesWarning(
    isDirty && !submitVisitMutation.isPending && !saveDraftMutation.isPending,
  )

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
    markDirty()
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

    const addedProductIds = new Set(
      products.map((product) => product.productId).filter(Boolean),
    )
    const availableProducts = countAvailableBranchProducts(
      branchProducts,
      addedProductIds,
    )

    if (availableProducts === 0) {
      const message = 'All branch products have already been added.'
      setActionMessage(message)
      toast({
        variant: 'error',
        title: 'No products available',
        description: message,
      })
      return
    }

    setActionMessage(null)
    const newProduct = createProductDraft()
    setProducts((current) => sortVisitProducts([...current, newProduct]))
    setExpandedProductId(newProduct.clientId)
    markDirty()
  }

  function updateProduct(clientId: string, nextProduct: VisitProductDraft) {
    setProducts((current) =>
      current.map((product) =>
        product.clientId === clientId ? nextProduct : product,
      ),
    )
    markDirty()
  }

  function removeProduct(clientId: string) {
    setProducts((current) =>
      current.filter((item) => item.clientId !== clientId),
    )
    setExpandedProductId((current) => (current === clientId ? null : current))
    markDirty()
  }

  function toggleProductExpanded(clientId: string) {
    setExpandedProductId((current) => (current === clientId ? null : clientId))
  }

  function handleCancel() {
    if (
      isDirty &&
      !window.confirm(
        'You have unsaved changes. Leave this visit and discard your progress?',
      )
    ) {
      return
    }

    navigate('/dashboard')
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

    if (!isVisitDateAllowed(visitDate)) {
      setShowValidationSummary(true)
      setActionMessage('Visit date cannot be in the future.')
      scrollToNewVisitSection('info')
      toast({
        variant: 'error',
        title: 'Invalid visit date',
        description: 'Visit date cannot be in the future.',
      })
      return
    }

    setActionMessage(null)
    setShowValidationSummary(false)

    const result = await submitVisitMutation.mutateAsync({
      storeId: selectedBranch.id,
      storeName: selectedBranch.name,
      generalNotes,
      startedAt: visitDateInputToStartedAt(visitDate),
      branchProducts,
      products,
      photos: visitPhotos,
      statusOptions: visitStatuses,
      draftVisitId: draftVisitId ?? undefined,
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

    setIsDirty(false)

    navigate('/new-visit/success', {
      replace: true,
      state: {
        visitId: result.visitId,
        visitNumber: result.visitNumber,
        visitDate: visitDateInputToStartedAt(visitDate),
        submittedAt: new Date().toISOString(),
        branchName: selectedBranch.name,
        visitorName: userLabel,
      },
    })
  }

  if (
    isAuthLoading ||
    (draftIdFromUrl && isDraftResumeLoading && !isDraftHydrated)
  ) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading new visit...
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 pb-32">
      <div className="space-y-6">
        <PageHeader
          title="New Visit"
          icon={MapPinPlus}
          description={
            isFollowUpDraft
              ? 'Complete the follow-up visit for the linked parent visit.'
              : 'Create a branch visit, review products, and capture notes and photos.'
          }
        />

        <NewVisitHeader
          visitNumberLabel={visitNumberLabel}
          userLabel={userLabel}
          visitDateLabel={visitDateLabel}
          visitStatus={visitStatus}
        />

        <NewVisitProgress
          steps={progressSteps}
          completionPercent={completionPercent}
        />

        {showValidationSummary &&
        (actionMessage || validation.issues.length > 0) ? (
          <NewVisitValidationSummary
            issues={validation.issues}
            actionMessage={actionMessage}
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <NewVisitCollapsibleSection
              sectionId="info"
              title="Visit Information"
              description="Set the date this visit took place."
              expanded={expandedSections.info}
              onToggle={() => toggleSection('info')}
            >
              <VisitDateField
                value={visitDate}
                onChange={(nextDate) => {
                  setVisitDate(nextDate)
                  markDirty()
                }}
              />
            </NewVisitCollapsibleSection>

            <NewVisitCollapsibleSection
              sectionId="branch"
              title="Branch"
              description="Search and select the store you are visiting."
              expanded={expandedSections.branch}
              onToggle={() => toggleSection('branch')}
            >
              <div className="space-y-5">
                <BranchSelector
                  branches={branches}
                  value={activeBranchId}
                  onChange={handleBranchChange}
                  isLoading={isBranchesLoading}
                  disabled={isFollowUpDraft}
                />
                <BranchDetailsPanel
                  branch={selectedBranch}
                  brandCount={branchBrands.length}
                  productsCount={branchProducts.length}
                  isLoadingProducts={isProductsLoading}
                />
              </div>
            </NewVisitCollapsibleSection>

            <NewVisitCollapsibleSection
              sectionId="performance"
              title="Branch Performance"
              description="Month-to-date sales target and achievement by brand."
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
              title="Products"
              description="Review products observed during this visit."
              expanded={expandedSections.inspection}
              onToggle={() => toggleSection('inspection')}
            >
              <div className="space-y-4">
                {!activeBranchId ? (
                  <AlertBanner title="Branch required">
                    Select a branch before adding inspection products.
                  </AlertBanner>
                ) : null}

                {activeBranchId && isProductsLoading ? (
                  <ProductCardsSkeleton />
                ) : null}

                {activeBranchId &&
                !isProductsLoading &&
                branchProducts.length === 0 ? (
                  <div
                    className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground"
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

                {products.length > 0 ? (
                  <div className="space-y-4">
                    {products.map((product, index) =>
                      renderProductCard(product, index),
                    )}
                  </div>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-auto min-h-16 w-full rounded-2xl border-dashed py-6 text-base"
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
              description="Upload, preview, reorder, and compress visit photos."
              expanded={expandedSections.photos}
              onToggle={() => toggleSection('photos')}
            >
              <VisitPhotosUploader
                photos={visitPhotos}
                onChange={(nextPhotos) => {
                  setVisitPhotos(nextPhotos)
                  markDirty()
                }}
              />
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
                  onChange={(event) => {
                    setGeneralNotes(event.target.value)
                    markDirty()
                  }}
                />
              </div>
            </NewVisitCollapsibleSection>
          </div>

          <NewVisitSummaryPanel
            branchName={selectedBranch?.name ?? null}
            visitDateLabel={visitDateLabel}
            productsCount={products.length}
            photosCount={visitPhotos.length}
            completionPercent={completionPercent}
            className="xl:block"
          />
        </div>
      </div>

      <NewVisitActionBar
        onSaveDraft={() => void saveDraft()}
        onSubmit={() => void handleSubmitVisit()}
        onCancel={handleCancel}
        isSubmitting={submitVisitMutation.isPending}
        isSavingDraft={saveDraftMutation.isPending}
        canSaveDraft={Boolean(selectedBranch)}
        lastSavedAt={lastSavedAt}
      />
    </div>
  )
}

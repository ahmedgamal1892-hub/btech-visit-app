import { ArrowLeft, Download, Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ErrorState } from '@/components/common'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import {
  BranchPerformanceCard,
  DeleteVisitDialog,
  type DeleteVisitTarget,
  InspectionItemsCard,
  RelatedVisitsCard,
  VisitDetailsHeader,
  VisitDetailsNotFound,
  VisitDetailsSkeleton,
  VisitNotesCard,
  VisitPhotoGallery,
  VisitReviewNotesCard,
  VisitReviewSection,
  VisitTimelineCard,
} from '@/features/history/components'
import { useCreateFollowUpVisit } from '@/features/history/hooks/use-create-follow-up'
import { useDeleteVisit } from '@/features/history/hooks/use-delete-visit'
import { useDownloadVisitPdf } from '@/features/history/hooks/use-download-visit-pdf'
import { useReviewVisit } from '@/features/history/hooks/use-review-visit'
import { useVisitDetails } from '@/features/history/hooks/use-visit-details'
import { useAuth } from '@/hooks'
import { getVisitPdfFilename } from '@/services/pdf/visit-pdf.service'
import { isVisitNotFoundError } from '@/types/visit-details'

export function VisitDetailsPage() {
  const { visitId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isAdmin } = useAuth()
  const { data, isLoading, isError, error, refetch } = useVisitDetails(visitId)
  const reviewVisitMutation = useReviewVisit()
  const createFollowUpMutation = useCreateFollowUpVisit()
  const downloadVisitPdfMutation = useDownloadVisitPdf()
  const deleteVisitMutation = useDeleteVisit()
  const [deleteTarget, setDeleteTarget] = useState<DeleteVisitTarget | null>(
    null,
  )
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  async function handleDownloadPdf() {
    if (!visitId || !data) {
      return
    }

    try {
      await downloadVisitPdfMutation.mutateAsync(visitId)
      toast({
        variant: 'success',
        title: 'PDF downloaded',
        description: getVisitPdfFilename(data.visitNumber),
      })
    } catch (downloadError) {
      toast({
        variant: 'error',
        title: 'PDF download failed',
        description:
          downloadError instanceof Error
            ? downloadError.message
            : 'Unable to generate the visit PDF.',
      })
    }
  }

  async function handleSubmitReview(input: {
    reviewNotes: string
    decision: 'approve' | 'needs_follow_up' | 'close'
  }) {
    if (!visitId) {
      return
    }

    try {
      await reviewVisitMutation.mutateAsync({
        visitId,
        reviewNotes: input.reviewNotes,
        decision: input.decision,
      })

      toast({
        variant: 'success',
        title: 'Review submitted',
        description: 'The visit status has been updated.',
      })
    } catch (reviewError) {
      toast({
        variant: 'error',
        title: 'Review failed',
        description:
          reviewError instanceof Error
            ? reviewError.message
            : 'Unable to submit review.',
      })
    }
  }

  async function handleCreateFollowUp() {
    if (!visitId) {
      return
    }

    try {
      const draftVisitId = await createFollowUpMutation.mutateAsync(visitId)

      toast({
        variant: 'success',
        title: 'Follow-up visit created',
        description: 'Continue the follow-up visit from the new visit form.',
      })

      navigate(`/new-visit?draftId=${draftVisitId}`)
    } catch (followUpError) {
      toast({
        variant: 'error',
        title: 'Follow-up creation failed',
        description:
          followUpError instanceof Error
            ? followUpError.message
            : 'Unable to create follow-up visit.',
      })
    }
  }

  function handleDeleteRequest() {
    if (!data) {
      return
    }

    setDeleteTarget({
      visitId: data.visitId,
      visitNumber: data.visitNumber,
      branchName: data.branchName,
    })
    setIsDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return
    }

    try {
      await deleteVisitMutation.mutateAsync(deleteTarget.visitId)

      toast({
        variant: 'success',
        title: 'Visit deleted',
        description: 'The visit and related records were removed.',
      })
      setIsDeleteDialogOpen(false)
      setDeleteTarget(null)
      navigate('/visit-history')
    } catch (deleteError) {
      toast({
        variant: 'error',
        title: 'Delete failed',
        description:
          deleteError instanceof Error
            ? deleteError.message
            : 'Unable to delete the visit.',
      })
    }
  }

  if (isLoading) {
    return <VisitDetailsSkeleton />
  }

  if (isError && isVisitNotFoundError(error)) {
    return <VisitDetailsNotFound />
  }

  if (isError) {
    return (
      <ErrorState
        title="Unable to load visit"
        message={
          error instanceof Error
            ? error.message
            : 'Please try again in a moment.'
        }
        onRetry={() => void refetch()}
      />
    )
  }

  if (!data) {
    return <VisitDetailsNotFound />
  }

  return (
    <div className="page-stack">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {data.visitNumber}
        </h1>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button type="button" variant="outline" asChild>
            <Link to="/visit-history">
              <ArrowLeft className="size-4" />
              Back to History
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={downloadVisitPdfMutation.isPending}
            onClick={() => void handleDownloadPdf()}
          >
            {downloadVisitPdfMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="size-4" />
                Download PDF
              </>
            )}
          </Button>
          {data.canDelete ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={deleteVisitMutation.isPending}
              onClick={handleDeleteRequest}
            >
              {deleteVisitMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete Visit
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {data.isReadOnly ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          This visit is closed and read-only. It cannot be edited or deleted.
        </div>
      ) : null}

      <VisitDetailsHeader visit={data} />

      <VisitTimelineCard events={data.timeline} />

      <RelatedVisitsCard
        relatedVisits={data.relatedVisits}
        canCreateFollowUp={data.canCreateFollowUp}
        isCreatingFollowUp={createFollowUpMutation.isPending}
        onCreateFollowUp={() => void handleCreateFollowUp()}
      />

      <VisitReviewNotesCard reviewNotes={data.reviewNotes} />

      {isAdmin && data.canReview ? (
        <VisitReviewSection
          visitStatus={data.status}
          isSubmitting={reviewVisitMutation.isPending}
          onSubmit={(input) => void handleSubmitReview(input)}
        />
      ) : null}

      <BranchPerformanceCard rows={data.performance} />

      <InspectionItemsCard items={data.inspectionItems} />

      <VisitPhotoGallery photos={data.photos} />

      <VisitNotesCard notes={data.generalNotes} />

      <DeleteVisitDialog
        visit={deleteTarget}
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        onConfirm={handleConfirmDelete}
        isSubmitting={deleteVisitMutation.isPending}
      />
    </div>
  )
}

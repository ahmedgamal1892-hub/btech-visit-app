import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import {
  BranchPerformanceCard,
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
  const { data, isLoading, isError, error } = useVisitDetails(visitId)
  const reviewVisitMutation = useReviewVisit()
  const createFollowUpMutation = useCreateFollowUpVisit()
  const downloadVisitPdfMutation = useDownloadVisitPdf()

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

  if (isLoading) {
    return <VisitDetailsSkeleton />
  }

  if (isError && isVisitNotFoundError(error)) {
    return <VisitDetailsNotFound />
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-6 text-sm text-destructive"
      >
        {error instanceof Error ? error.message : 'Unable to load visit.'}
      </div>
    )
  }

  if (!data) {
    return <VisitDetailsNotFound />
  }

  return (
    <div className="space-y-6">
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
    </div>
  )
}

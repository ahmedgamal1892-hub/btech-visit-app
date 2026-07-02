import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { ErrorState } from '@/components/common'
import { Button } from '@/components/ui/button'
import {
  VisitDetailsNotFound,
  VisitDetailsSkeleton,
} from '@/features/history/components'
import { useVisitDetails } from '@/features/history/hooks/use-visit-details'
import { LiveVisitReportPreview } from '@/features/report-preview'
import { isVisitNotFoundError } from '@/types/visit-details'

export function VisitReportPage() {
  const { visitId } = useParams()
  const { data, isLoading, isError, error, refetch } = useVisitDetails(visitId)

  if (isLoading) {
    return <VisitDetailsSkeleton />
  }

  if (isError && isVisitNotFoundError(error)) {
    return <VisitDetailsNotFound />
  }

  if (isError) {
    return (
      <ErrorState
        title="Unable to load visit report"
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
    <div className="page-stack visit-report-page">
      <div className="visit-report-page__toolbar flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Visit Report
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.visitNumber}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to={`/visit-history/${data.visitId}`}>
              <ArrowLeft className="size-4" />
              Back to Visit
            </Link>
          </Button>
        </div>
      </div>

      <LiveVisitReportPreview details={data} />
    </div>
  )
}

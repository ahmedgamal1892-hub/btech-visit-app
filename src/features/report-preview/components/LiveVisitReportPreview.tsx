import { useMemo } from 'react'

import {
  mapVisitDetailsToReportViewModel,
  VisitReportTemplate,
} from '@/report-engine'
import type { VisitDetails } from '@/types/visit-details'

export type LiveVisitReportPreviewProps = {
  details: VisitDetails
}

export function LiveVisitReportPreview({ details }: LiveVisitReportPreviewProps) {
  const reportViewModel = useMemo(
    () => mapVisitDetailsToReportViewModel(details),
    [details],
  )

  return <VisitReportTemplate data={reportViewModel} />
}

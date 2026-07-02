import type { ReportBadgeTone } from '../models/report-view-model'

import { ReportBadge } from './ReportBadge'
import { ReportInfoField } from './ReportInfoField'

type VisitInformationCardProps = {
  branchName: string
  brandName: string
  visitorName: string
  visitType: string
  visitStatus: string
  visitStatusTone: ReportBadgeTone
  createdDate: string
}

export function VisitInformationCard({
  branchName,
  brandName,
  visitorName,
  visitType,
  visitStatus,
  visitStatusTone,
  createdDate,
}: VisitInformationCardProps) {
  return (
    <dl className="report-info-grid">
      <ReportInfoField label="Branch" value={branchName} />
      <ReportInfoField label="Brand" value={brandName} />
      <ReportInfoField label="Visitor" value={visitorName} />
      <ReportInfoField label="Visit Type" value={visitType} />
      <ReportInfoField
        label="Visit Status"
        value={<ReportBadge label={visitStatus} tone={visitStatusTone} />}
      />
      <ReportInfoField label="Created Date" value={createdDate} />
    </dl>
  )
}

import type { ReportBadgeTone } from '../types.js'

import { ReportMixedText } from './ReportMixedText.js'

type ReportBadgeProps = {
  label: string
  tone: ReportBadgeTone
}

export function ReportBadge({ label, tone }: ReportBadgeProps) {
  return (
    <span className={`report-badge report-badge--${tone}`}>
      <ReportMixedText text={label} />
    </span>
  )
}

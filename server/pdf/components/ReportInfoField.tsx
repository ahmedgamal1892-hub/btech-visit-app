import type { ReactNode } from 'react'

import { ReportMixedText } from './ReportMixedText'

type ReportInfoFieldProps = {
  label: string
  value: ReactNode
}

function renderFieldValue(value: ReactNode): ReactNode {
  if (typeof value === 'string') {
    return <ReportMixedText text={value} />
  }

  return value
}

export function ReportInfoField({ label, value }: ReportInfoFieldProps) {
  return (
    <div className="report-info-grid__item">
      <dt className="report-info-grid__label">{label}</dt>
      <dd className="report-info-grid__value">{renderFieldValue(value)}</dd>
    </div>
  )
}

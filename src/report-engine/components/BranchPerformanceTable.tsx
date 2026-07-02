import type { ReportPerformanceRow } from '../models/report-view-model'

import { ReportBadge } from './ReportBadge'
import { ReportDirectionalText, ReportMixedText } from './ReportMixedText'

type BranchPerformanceTableProps = {
  rows: ReportPerformanceRow[]
}

export function BranchPerformanceTable({ rows }: BranchPerformanceTableProps) {
  if (rows.length === 0) {
    return (
      <p className="report-empty" role="status">
        No achievement data available for this branch.
      </p>
    )
  }

  return (
    <div className="report-table-wrap">
      <table className="report-table report-table--performance">
        <thead>
          <tr>
            <th scope="col">Brand</th>
            <th scope="col">Target</th>
            <th scope="col">Actual</th>
            <th scope="col">Achievement %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.brand}>
              <td>
                <ReportMixedText text={row.brand} />
              </td>
              <td className="report-table__numeric">
                <ReportDirectionalText text={row.target} direction="ltr" />
              </td>
              <td className="report-table__numeric">
                <ReportDirectionalText text={row.actual} direction="ltr" />
              </td>
              <td className="report-table__numeric">
                <ReportBadge
                  label={row.achievementPercent}
                  tone={row.achievementTone}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

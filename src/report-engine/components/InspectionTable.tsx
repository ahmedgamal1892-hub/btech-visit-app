import type { ReportInspectionItem } from '../models/report-view-model'

import { ReportBadge } from './ReportBadge'
import { ReportMixedText } from './ReportMixedText'

type InspectionTableProps = {
  items: ReportInspectionItem[]
}

export function InspectionTable({ items }: InspectionTableProps) {
  if (items.length === 0) {
    return (
      <p className="report-empty" role="status">
        No inspection items reported.
      </p>
    )
  }

  return (
    <div className="report-table-wrap">
      <table className="report-table report-table--inspection">
        <colgroup>
          <col className="report-table__col-brand" />
          <col className="report-table__col-product" />
          <col className="report-table__col-status" />
          <col className="report-table__col-notes" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Brand</th>
            <th scope="col">Product Name</th>
            <th scope="col">Status</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <ReportMixedText text={item.brand} />
              </td>
              <td className="report-table__text-cell">
                <ReportMixedText text={item.productName} />
              </td>
              <td className="report-table__status">
                <ReportBadge label={item.status} tone={item.statusTone} />
              </td>
              <td className="report-table__text-cell">
                <ReportMixedText text={item.notes} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import { generatePdfFromHtml } from '../production-pdf-spike/generate-pdf'
import { renderVisitReportHtml } from '../src/report-engine/server/render-template-html'
import type { ReportViewModel } from '../src/report-engine/models/report-view-model'

export async function generateVisitReportPdfBuffer(
  reportViewModel: ReportViewModel,
): Promise<Buffer> {
  const html = renderVisitReportHtml(reportViewModel)
  return generatePdfFromHtml(html)
}

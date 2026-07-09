export type { ReportViewModel } from './types.js'
export declare function renderVisitReportHtml(data: ReportViewModel): string
export declare function generateVisitReportPdfBuffer(
  reportViewModel: ReportViewModel,
): Promise<Buffer>

import { mapVisitDetailsToReportViewModel } from '@/report-engine'
import type { ReportViewModel } from '@/report-engine'
import type { VisitDetails } from '@/types/visit-details'

const PDF_API_PATH = '/api/pdf'

async function readPdfApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string }
    if (payload.error) {
      return payload.error
    }
  } catch {
    // Ignore JSON parse failures and fall back to status text.
  }

  return response.statusText || 'PDF generation failed'
}

export async function requestVisitReportPdf(
  reportViewModel: ReportViewModel,
): Promise<Blob> {
  const response = await fetch(PDF_API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reportViewModel }),
  })

  if (!response.ok) {
    throw new Error(await readPdfApiError(response))
  }

  const contentType = response.headers.get('Content-Type') ?? ''

  if (!contentType.includes('application/pdf')) {
    throw new Error('PDF generation failed: unexpected response type.')
  }

  return response.blob()
}

export async function generateVisitPdfFromHtmlEngine(
  details: VisitDetails,
): Promise<Blob> {
  const reportViewModel = mapVisitDetailsToReportViewModel(details)
  return requestVisitReportPdf(reportViewModel)
}

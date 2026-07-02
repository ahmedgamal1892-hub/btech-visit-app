import type { VercelRequest, VercelResponse } from '@vercel/node'

import { generateVisitReportPdfBuffer } from './pdf-handler'
import type { ReportViewModel } from '../src/report-engine/models/report-view-model'

export const config = {
  maxDuration: 30,
}

function parseRequestBody(body: unknown): unknown {
  if (body == null) {
    return null
  }

  if (typeof body === 'string') {
    if (body.trim().length === 0) {
      return null
    }

    try {
      return JSON.parse(body) as unknown
    } catch {
      return null
    }
  }

  if (Buffer.isBuffer(body)) {
    if (body.length === 0) {
      return null
    }

    try {
      return JSON.parse(body.toString('utf8')) as unknown
    } catch {
      return null
    }
  }

  return body
}

function isReportViewModel(value: unknown): value is ReportViewModel {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<ReportViewModel>
  return (
    typeof candidate.visitNumber === 'string' &&
    typeof candidate.reportTitle === 'string'
  )
}

function readReportViewModel(body: unknown): ReportViewModel | null {
  const parsedBody = parseRequestBody(body)

  if (!parsedBody || typeof parsedBody !== 'object') {
    return null
  }

  const payload = parsedBody as { reportViewModel?: unknown }

  if (isReportViewModel(payload.reportViewModel)) {
    return payload.reportViewModel
  }

  if (isReportViewModel(parsedBody)) {
    return parsedBody
  }

  return null
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      res.status(405).json({
        error:
          'Method not allowed. POST a JSON body with { reportViewModel } to generate a visit report PDF.',
      })
      return
    }

    const reportViewModel = readReportViewModel(req.body)

    if (!reportViewModel) {
      res.status(400).json({ error: 'A valid reportViewModel is required.' })
      return
    }

    const pdf = await generateVisitReportPdfBuffer(reportViewModel)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${reportViewModel.visitNumber}.pdf"`,
    )
    res.status(200).send(pdf)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'PDF generation failed'

    res.status(500).json({ error: message })
  }
}

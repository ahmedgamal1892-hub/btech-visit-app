import type { VercelRequest, VercelResponse } from '@vercel/node'

import { generatePdfFromHtml } from '../production-pdf-spike/generate-pdf'
import { buildSampleHtml } from '../production-pdf-spike/sample-html'

export const config = {
  maxDuration: 30,
}

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    const html = buildSampleHtml()
    const pdf = await generatePdfFromHtml(html)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      'inline; filename="production-pdf-spike.pdf"',
    )
    res.status(200).send(pdf)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'PDF generation failed'

    res.status(500).json({ error: message })
  }
}

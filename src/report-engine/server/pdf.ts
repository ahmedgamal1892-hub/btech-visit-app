import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { generatePdfFromHtml } from './generate-pdf-from-html'
import { renderVisitReportHtml } from './render-template-html'

const serverDir = dirname(fileURLToPath(import.meta.url))
const reportEngineRoot = join(serverDir, '..')

export const defaultSamplePdfPath = join(
  reportEngineRoot,
  'output',
  'sample-report.pdf',
)

export async function generateSampleReportPdf(
  outputPath = defaultSamplePdfPath,
): Promise<string> {
  const html = renderVisitReportHtml()

  return generatePdfFromHtml({
    html,
    outputPath,
  })
}

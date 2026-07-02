import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderToStaticMarkup } from 'react-dom/server'

import { mapVisitDetailsToReportViewModel } from '../adapters/visit-details.mapper'
import { mockVisitDetails } from '../adapters/__fixtures__/visit-details.mock'
import type { ReportViewModel } from '../models/report-view-model'
import { VisitReportTemplate } from '../templates/VisitReportTemplate'

const serverDir = dirname(fileURLToPath(import.meta.url))
const reportEngineRoot = join(serverDir, '..')
const projectRoot = join(reportEngineRoot, '../..')

function readProjectFile(relativePath: string): Buffer {
  return readFileSync(join(projectRoot, relativePath))
}

function toDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

export function enrichReportViewModelForPoc(
  data: ReportViewModel,
): ReportViewModel {
  let logoSrc = data.logoSrc

  try {
    logoSrc = toDataUrl(readProjectFile('public/logo.png'), 'image/png')
  } catch {
    logoSrc = data.logoSrc
  }

  return {
    ...data,
    logoSrc,
    photos: data.photos.map((photo) => ({
      ...photo,
      src: photo.src.startsWith('http') ? photo.src : logoSrc,
    })),
  }
}

function buildFontFaceCss(): string {
  const cairoBase64 = readProjectFile(
    'src/assets/fonts/Cairo-Regular.ttf',
  ).toString('base64')

  return `
@font-face {
  font-family: 'Cairo';
  src: url('data:font/ttf;base64,${cairoBase64}') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
`
}

export function renderVisitReportHtml(data?: ReportViewModel): string {
  const reportData = enrichReportViewModelForPoc(
    data ?? mapVisitDetailsToReportViewModel(mockVisitDetails),
  )
  const markup = renderToStaticMarkup(<VisitReportTemplate data={reportData} />)
  const reportCss = readFileSync(
    join(reportEngineRoot, 'styles/report.css'),
    'utf8',
  )
  const fontFaceCss = buildFontFaceCss()

  return `<!DOCTYPE html>
<html lang="ar" dir="auto">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${reportData.reportTitle} — ${reportData.visitNumber}</title>
    <style>
${fontFaceCss}
.report-engine {
  font-family: 'Cairo', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
${reportCss}
    </style>
  </head>
  <body>
    ${markup}
  </body>
</html>`
}

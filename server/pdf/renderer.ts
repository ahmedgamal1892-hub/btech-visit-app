import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { generatePdfFromHtml } from './production-pdf-spike/generate-pdf.js'
import { VisitReportTemplate } from './template.js'
import type { ReportViewModel } from './types.js'

export type { ReportViewModel } from './types.js'

const serverDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(serverDir, '../..')

function readProjectFile(relativePath: string): Buffer {
  return readFileSync(join(projectRoot, relativePath))
}

function toDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

function enrichReportViewModel(data: ReportViewModel): ReportViewModel {
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
    'public/fonts/Cairo-Regular.ttf',
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

export function renderVisitReportHtml(data: ReportViewModel): string {
  const reportData = enrichReportViewModel(data)
  const markup = renderToStaticMarkup(
    createElement(VisitReportTemplate, { data: reportData }),
  )
  const reportCss = readFileSync(join(serverDir, 'styles.css'), 'utf8')
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

export async function generateVisitReportPdfBuffer(
  reportViewModel: ReportViewModel,
): Promise<Buffer> {
  const html = renderVisitReportHtml(reportViewModel)
  return generatePdfFromHtml(html)
}

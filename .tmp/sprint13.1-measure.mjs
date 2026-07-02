import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { createServer } from 'vite'

const root = join(import.meta.dirname, '..')
const cssPath = join(root, 'src/report-engine/styles/report.css')

const BEFORE_CSS = readFileSync(join(root, '.tmp/sprint13.1-before-report.css'), 'utf8')
const AFTER_CSS = readFileSync(cssPath, 'utf8')

function countPdfPages(buffer) {
  return Buffer.from(buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
}

function buildVisitDetails(mockMod) {
  const base = mockMod.mockVisitDetails
  const photos = Array.from({ length: 18 }, (_, index) => ({
    id: `photo-${index + 1}`,
    fileName: `1000167${String(205 + index).padStart(3, '0')}.jpg`,
    storagePath: `visits/photo-${index + 1}.jpg`,
    previewUrl: `https://example.com/photo-${index + 1}.jpg`,
    sortOrder: index + 1,
  }))

  return {
    ...base,
    visitNumber: 'VIS-20260630-0001',
    generalNotes:
      '* تم زيارة الفرع والتحدث مع مدير الفرع.\n' +
      '* تم مراجعة المنتجات المعروضة والتأكد من الأسعار.\n' +
      '* يحتاج الفرع إلى متابعة للمنتجات التالفة.\n' +
      '* Follow-up required for damaged LG unit.\n' +
      '* تأكيد توفر AQD1070D 497 XEX.\n' +
      '* تم التقاط صور للمعرض والمخزن.',
    photos,
  }
}

async function generatePageCount(cssContent) {
  writeFileSync(cssPath, cssContent)

  const server = await createServer({
    configFile: join(root, 'vite.config.ts'),
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'error',
  })

  try {
    const htmlMod = await server.ssrLoadModule(
      pathToFileURL(join(root, 'src/report-engine/server/render-template-html.tsx')).href,
    )
    const pdfMod = await server.ssrLoadModule(
      pathToFileURL(join(root, 'production-pdf-spike/generate-pdf.ts')).href + `?v=${Date.now()}`,
    )
    const mapperMod = await server.ssrLoadModule(
      pathToFileURL(join(root, 'src/report-engine/adapters/visit-details.mapper.ts')).href,
    )
    const mockMod = await server.ssrLoadModule(
      pathToFileURL(join(root, 'src/report-engine/adapters/__fixtures__/visit-details.mock.ts')).href,
    )

    const visitDetails = buildVisitDetails(mockMod)
    const vm = mapperMod.mapVisitDetailsToReportViewModel(visitDetails)
    const html = htmlMod.renderVisitReportHtml(vm)
    const pdfBuffer = await pdfMod.generatePdfFromHtml(html)
    return countPdfPages(pdfBuffer)
  } finally {
    await server.close()
  }
}

const outDir = join(root, '.tmp/sprint13.1')
mkdirSync(outDir, { recursive: true })

try {
  const beforePages = await generatePageCount(BEFORE_CSS)
  const afterPages = await generatePageCount(AFTER_CSS)
  const result = { beforePages, afterPages, photos: 18 }
  writeFileSync(join(outDir, 'meta.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
} finally {
  writeFileSync(cssPath, AFTER_CSS)
}

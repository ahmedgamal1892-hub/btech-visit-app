import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { pdf } from 'pdf-to-img'
import { createServer } from 'vite'

const root = join(import.meta.dirname, '..')
const cssPath = join(root, 'src/report-engine/styles/report.css')
const beforeCss = readFileSync(join(root, '.tmp/sprint13-baseline-report.css'), 'utf8')
const afterCss = readFileSync(cssPath, 'utf8')

async function rasterizePdf(pdfPath, outDir, prefix) {
  mkdirSync(outDir, { recursive: true })
  const document = await pdf(pdfPath, { scale: 2 })
  let index = 1
  for await (const page of document) {
    writeFileSync(join(outDir, `${prefix}-page${index}.png`), page)
    index += 1
  }
  return index - 1
}

async function generatePdfWithCss(cssContent, outDir, label) {
  mkdirSync(outDir, { recursive: true })
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
      pathToFileURL(join(root, 'production-pdf-spike/generate-pdf.ts')).href + `?v=${label}`,
    )
    const mapperMod = await server.ssrLoadModule(
      pathToFileURL(join(root, 'src/report-engine/adapters/visit-details.mapper.ts')).href,
    )
    const mockMod = await server.ssrLoadModule(
      pathToFileURL(join(root, 'src/report-engine/adapters/__fixtures__/visit-details.mock.ts')).href,
    )

    const vm = mapperMod.mapVisitDetailsToReportViewModel(mockMod.mockVisitDetails)
    const html = htmlMod.renderVisitReportHtml(vm)
    const pdfBuffer = await pdfMod.generatePdfFromHtml(html)
    const pdfPath = join(outDir, `${label}.pdf`)
    writeFileSync(pdfPath, pdfBuffer)
    const pageCount = await rasterizePdf(pdfPath, outDir, label)
    writeFileSync(
      join(outDir, `${label}-meta.json`),
      JSON.stringify({ visitNumber: vm.visitNumber, pageCount }, null, 2),
    )
    return pageCount
  } finally {
    await server.close()
  }
}

const beforeDir = join(root, '.tmp/sprint13-before')
const afterDir = join(root, '.tmp/sprint13-after')

try {
  const beforePages = await generatePdfWithCss(beforeCss, beforeDir, 'before')
  const afterPages = await generatePdfWithCss(afterCss, afterDir, 'after')
  console.log(JSON.stringify({ beforePages, afterPages, beforeDir, afterDir }, null, 2))
} finally {
  writeFileSync(cssPath, afterCss)
}

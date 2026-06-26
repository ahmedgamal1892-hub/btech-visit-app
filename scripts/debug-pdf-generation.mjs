import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { createServer } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

/** @type {import('../src/types/visit-details').VisitDetails} */
const mockVisitDetails = {
  visitId: '00000000-0000-4000-8000-000000000001',
  visitNumber: 'VIS-20260626-0001',
  branchName: 'Main Branch',
  branchId: '00000000-0000-4000-8000-000000000002',
  visitorId: '00000000-0000-4000-8000-000000000003',
  visitorName: 'Test Visitor',
  visitDate: '2026-06-26T10:00:00.000Z',
  submittedAt: '2026-06-26T12:00:00.000Z',
  status: 'Submitted',
  reviewNotes: null,
  reviewDecision: null,
  reviewedAt: null,
  reviewedByName: null,
  isReadOnly: true,
  canReview: false,
  canCreateFollowUp: false,
  parentVisitId: null,
  generalNotes: 'ملاحظات عامة: سخان Ariston 50 لتر — unit OK',
  pdfReportReference: 'VIS-20260626-0001',
  performance: [
    {
      brand: 'Brand A',
      mtdTarget: 100000,
      actualSales: 85000,
      achievementPercent: 85,
    },
  ],
  inspectionItems: [
    {
      id: '00000000-0000-4000-8000-000000000004',
      brand: 'Brand A',
      productName: 'سخان Ariston 50 لتر',
      status: 'Sellable',
      statusLabel: 'Sellable',
      notes: 'المنتج معروض بجانب LG Model X500',
      displayOrder: 0,
    },
  ],
  photos: [],
  timeline: [
    {
      eventType: 'created',
      eventLabel: 'Created',
      userId: '00000000-0000-4000-8000-000000000003',
      userName: 'Test Visitor',
      eventAt: '2026-06-26T10:00:00.000Z',
    },
  ],
  relatedVisits: [],
}

async function main() {
  const server = await createServer({
    configFile: join(projectRoot, 'vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
    plugins: [
      {
        name: 'debug-pdf-font-url',
        enforce: 'pre',
        resolveId(source) {
          if (source.endsWith('Cairo-Regular.ttf?url')) {
            return '\0cairo-font-url'
          }
          return null
        },
        load(id) {
          if (id === '\0cairo-font-url') {
            const fontPath = join(
              projectRoot,
              'src/assets/fonts/Cairo-Regular.ttf',
            )
            return `export default ${JSON.stringify(pathToFileURL(fontPath).href)}`
          }
          return null
        },
      },
    ],
  })

  try {
    const moduleUrl = pathToFileURL(
      join(projectRoot, 'src/services/pdf/visit-pdf.service.ts'),
    ).href
    const pdfModule = await server.ssrLoadModule(moduleUrl)
    const blob = await pdfModule.generateVisitPdf(mockVisitDetails)
    const buffer = Buffer.from(await blob.arrayBuffer())
    mkdirSync(join(projectRoot, '.tmp'), { recursive: true })
    writeFileSync(join(projectRoot, '.tmp', 'debug-report.pdf'), buffer)
    console.log('PDF generation OK, size:', buffer.length)
  } catch (error) {
    console.error('PDF generation FAILED:')
    console.error(error)
    process.exit(1)
  } finally {
    await server.close()
  }
}

main()

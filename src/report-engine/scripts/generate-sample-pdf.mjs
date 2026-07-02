import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { createServer } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const reportEngineRoot = join(__dirname, '..')
const repoRoot = join(__dirname, '../../..')
const outputPath = join(reportEngineRoot, 'output', 'sample-report.pdf')
const htmlDebugPath = join(reportEngineRoot, 'output', 'sample-report.html')

async function main() {
  const server = await createServer({
    configFile: join(repoRoot, 'vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  })

  try {
    const pdfModule = await server.ssrLoadModule(
      pathToFileURL(join(reportEngineRoot, 'server', 'pdf.ts')).href,
    )
    const htmlModule = await server.ssrLoadModule(
      pathToFileURL(
        join(reportEngineRoot, 'server', 'render-template-html.tsx'),
      ).href,
    )

    const html = htmlModule.renderVisitReportHtml()
    mkdirSync(dirname(htmlDebugPath), { recursive: true })
    writeFileSync(htmlDebugPath, html, 'utf8')

    const writtenPath = await pdfModule.generateSampleReportPdf(outputPath)

    console.log('Report Engine V2 sample PDF written to:', writtenPath)
    console.log('Intermediate HTML written to:', htmlDebugPath)
  } catch (error) {
    console.error('Report Engine V2 sample PDF generation failed:')
    console.error(error)
    process.exit(1)
  } finally {
    await server.close()
  }
}

main()

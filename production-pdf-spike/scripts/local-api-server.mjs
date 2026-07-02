import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '../..')

process.chdir(projectRoot)

const { generatePdfFromHtml } = await import('../generate-pdf.ts')
const { buildSampleHtml } = await import('../sample-html.ts')

const port = Number(process.env.PORT ?? 3000)

const server = createServer(async (req, res) => {
  if (req.url !== '/api/pdf') {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found. Use GET /api/pdf')
    return
  }

  try {
    const html = buildSampleHtml()
    const pdf = await generatePdfFromHtml(html)

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="production-pdf-spike.pdf"',
    })
    res.end(pdf)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'PDF generation failed'

    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: message }))
  }
})

server.listen(port, () => {
  console.log(`Production PDF spike: http://localhost:${port}/api/pdf`)
})

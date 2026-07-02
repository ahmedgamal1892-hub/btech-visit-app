import { createServer as createHttpServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { createServer as createViteServer } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '../..')
const pdfHandlerPath = join(projectRoot, 'api', 'pdf-handler.ts')

const port = Number(process.env.PORT ?? 3000)

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []

    req.on('data', (chunk) => {
      chunks.push(chunk)
    })

    req.on('end', () => {
      if (chunks.length === 0) {
        resolve(undefined)
        return
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (error) {
        reject(error)
      }
    })

    req.on('error', reject)
  })
}

function isReportViewModel(value) {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof value.visitNumber === 'string' &&
    typeof value.reportTitle === 'string'
  )
}

function readReportViewModel(body) {
  if (!body || typeof body !== 'object') {
    return null
  }

  if (isReportViewModel(body.reportViewModel)) {
    return body.reportViewModel
  }

  if (isReportViewModel(body)) {
    return body
  }

  return null
}

const vite = await createViteServer({
  configFile: join(projectRoot, 'vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

const pdfHandler = await vite.ssrLoadModule(pathToFileURL(pdfHandlerPath).href)

const server = createHttpServer(async (req, res) => {
  if (req.url !== '/api/pdf') {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found. Use POST /api/pdf')
    return
  }

  try {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          error:
            'Method not allowed. POST a JSON body with { reportViewModel } to generate a visit report PDF.',
        }),
      )
      return
    }

    const body = await readJsonBody(req)
    const reportViewModel = readReportViewModel(body)

    if (!reportViewModel) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'A valid reportViewModel is required.' }))
      return
    }

    const pdf = await pdfHandler.generateVisitReportPdfBuffer(reportViewModel)

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${reportViewModel.visitNumber}.pdf"`,
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
  console.log(`PDF API: http://localhost:${port}/api/pdf (POST only)`)
})

process.on('SIGINT', async () => {
  await vite.close()
  server.close()
})

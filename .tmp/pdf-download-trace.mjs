import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { chromium } from 'playwright'

const root = join(import.meta.dirname, '..')
const outDir = join(root, '.tmp/pdf-download-trace')
mkdirSync(outDir, { recursive: true })

const visitId = 'e8a6e68b-6419-4613-9593-aada38827f5a'
const visitUrl = `http://localhost:5175/visit-history/${visitId}`

function loadEnv() {
  const env = {}
  for (const line of readFileSync(join(root, '.env'), 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i === -1) continue
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return env
}

function loadChromeToken() {
  const ldb = join(
    homedir(),
    'AppData/Local/Google/Chrome/User Data/Profile 5/Local Storage/leveldb',
  )
  let blob = ''
  for (const f of readdirSync(ldb)) {
    if (f.endsWith('.log') || f.endsWith('.ldb')) {
      blob += readFileSync(join(ldb, f)).toString('latin1')
    }
  }
  const marker = 'sb-cdflwrrmplbhugjosphn-auth-token'
  const slice = blob.slice(blob.lastIndexOf(marker), blob.lastIndexOf(marker) + 8000)
  return [...slice.matchAll(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g)][0]?.[0] ?? null
}

const env = loadEnv()
const token = loadChromeToken()
const supabaseUrl = env.VITE_SUPABASE_URL
const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
const authStorageKey = `sb-${projectRef}-auth-token`

const trace = {
  timestamp: new Date().toISOString(),
  visitId,
  visitUrl,
  authTokenFound: Boolean(token),
  steps: [],
}

function log(step, data = {}) {
  trace.steps.push({ step, at: new Date().toISOString(), ...data })
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ acceptDownloads: true })
const page = await context.newPage()

const rpcRequests = []
const pdfRequests = []
let downloadEvent = null

page.on('request', (request) => {
  const url = request.url()
  if (url.includes('/rest/v1/rpc/get_visit_details')) {
    rpcRequests.push({
      phase: 'request',
      method: request.method(),
      url,
      postData: request.postDataJSON?.() ?? null,
    })
  }
  if (url.includes('/api/pdf')) {
    pdfRequests.push({
      phase: 'request',
      method: request.method(),
      url,
      postDataBytes: request.postData()?.length ?? 0,
    })
  }
})

page.on('response', async (response) => {
  const url = response.url()
  if (url.includes('/rest/v1/rpc/get_visit_details')) {
    let body = null
    try {
      body = await response.json()
    } catch {
      body = await response.text().catch(() => null)
    }
    rpcRequests.push({
      phase: 'response',
      status: response.status(),
      ok: response.ok(),
      visitNumber: body?.visit_number ?? null,
      error: body?.message ?? null,
    })
  }
  if (url.includes('/api/pdf')) {
    const contentType = response.headers()['content-type'] ?? ''
    let bodyPreview = null
    if (!response.ok()) {
      bodyPreview = await response.text().catch(() => null)
    }
    pdfRequests.push({
      phase: 'response',
      status: response.status(),
      ok: response.ok(),
      contentType,
      bodyPreview,
    })
  }
})

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    log('browser_console_error', { text: msg.text() })
  }
})

page.on('pageerror', (error) => {
  log('browser_page_error', { message: error.message })
})

page.on('download', (download) => {
  downloadEvent = {
    suggestedFilename: download.suggestedFilename(),
    url: download.url(),
  }
})

await page.addInitScript(
  ({ key, accessToken }) => {
    const session = {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'trace-refresh-token',
      user: { id: 'trace-user', email: 'trace@example.com' },
    }
    localStorage.setItem(key, JSON.stringify(session))
  },
  { key: authStorageKey, accessToken: token },
)

await page.goto(visitUrl, { waitUntil: 'networkidle', timeout: 60000 })

const button = page.getByRole('button', { name: 'Download PDF' })
const buttonVisible = await button.isVisible().catch(() => false)
const buttonEnabled = buttonVisible ? await button.isEnabled() : false
log('button_state_before_click', { visible: buttonVisible, enabled: buttonEnabled })

let buttonClicked = false
if (buttonVisible && buttonEnabled) {
  buttonClicked = true
  log('button_click_fired', { clicked: true })
  await button.click()
} else {
  log('button_click_fired', { clicked: false, reason: 'button not visible or enabled' })
}

await page.waitForTimeout(15000)

const pendingText = await page.getByText('Generating PDF...').isVisible().catch(() => false)
const successToast = await page.getByText('PDF downloaded').isVisible().catch(() => false)
const errorToastTitle = await page.getByText('PDF download failed').isVisible().catch(() => false)
const errorToastBody = errorToastTitle
  ? await page.locator('[data-sonner-toast]').last().textContent().catch(() => null)
  : null

log('ui_after_click', {
  pendingText,
  successToast,
  errorToastTitle,
  errorToastBody,
})

trace.network = {
  get_visit_details: rpcRequests,
  api_pdf: pdfRequests,
}

trace.downloadEvent = downloadEvent

trace.inferred = {
  mutateAsyncCalled: buttonClicked,
  downloadVisitPdfByIdCalled:
    buttonClicked &&
    rpcRequests.some((entry) => entry.phase === 'request' && entry.url?.includes('get_visit_details')),
  fetchVisitDetailsSuccessful: rpcRequests.some(
    (entry) => entry.phase === 'response' && entry.ok && entry.visitNumber,
  ),
  postApiPdfSent: pdfRequests.some((entry) => entry.phase === 'request' && entry.method === 'POST'),
  apiPdfResponse: pdfRequests.find((entry) => entry.phase === 'response') ?? null,
  browserReceivedBlob:
    pdfRequests.some(
      (entry) =>
        entry.phase === 'response' &&
        entry.ok &&
        entry.contentType?.includes('application/pdf'),
    ) ?? false,
  downloadStarted: Boolean(downloadEvent),
}

writeFileSync(join(outDir, 'trace.json'), JSON.stringify(trace, null, 2))
console.log(JSON.stringify(trace.inferred, null, 2))
console.log('Full trace:', join(outDir, 'trace.json'))

await browser.close()

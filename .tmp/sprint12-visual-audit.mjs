import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const root = join(import.meta.dirname, '..')
const outDir = join(root, '.tmp/sprint12-visual-audit')
mkdirSync(outDir, { recursive: true })

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
  try {
    for (const f of readdirSync(ldb)) {
      if (f.endsWith('.log') || f.endsWith('.ldb')) {
        blob += readFileSync(join(ldb, f)).toString('latin1')
      }
    }
  } catch {
    return null
  }
  const marker = 'sb-cdflwrrmplbhugjosphn-auth-token'
  const idx = blob.lastIndexOf(marker)
  const slice = blob.slice(idx, idx + 8000)
  const jwtMatches = [
    ...slice.matchAll(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g),
  ]
  return jwtMatches[0]?.[0] ?? null
}

async function mapRpcToVisitDetails(rawRpc, supabase) {
  const photos = await Promise.all(
    (rawRpc.photos ?? []).map(async (photo) => {
      const { data } = await supabase.storage
        .from('visit-photos')
        .createSignedUrl(photo.storage_path, 3600)
      return {
        id: photo.id,
        fileName: photo.file_name,
        storagePath: photo.storage_path,
        previewUrl: data?.signedUrl ?? '',
        sortOrder: photo.sort_order,
      }
    }),
  )

  return {
    visitId: rawRpc.visit_id,
    visitNumber: rawRpc.visit_number,
    branchName: rawRpc.branch_name,
    branchId: rawRpc.branch_id,
    visitorId: rawRpc.visitor_id,
    visitorName: rawRpc.visitor_name,
    visitDate: rawRpc.visit_date,
    submittedAt: rawRpc.submitted_at,
    status: rawRpc.status,
    reviewNotes: rawRpc.review_notes,
    reviewDecision: rawRpc.review_decision,
    reviewedAt: rawRpc.reviewed_at,
    reviewedByName: rawRpc.reviewed_by_name,
    isReadOnly: rawRpc.is_read_only,
    canReview: rawRpc.can_review,
    canCreateFollowUp: rawRpc.can_create_follow_up,
    canDelete: rawRpc.can_delete,
    parentVisitId: rawRpc.parent_visit_id,
    generalNotes: rawRpc.general_notes,
    pdfReportReference: rawRpc.pdf_report_reference,
    performance: (rawRpc.performance ?? []).map((row) => ({
      brand: row.brand,
      mtdTarget: Number(row.mtd_target),
      actualSales: Number(row.actual_sales),
      achievementPercent: Number(row.achievement_percent),
    })),
    inspectionItems: (rawRpc.inspection_items ?? []).map((row) => ({
      id: row.id,
      brand: row.brand,
      productName: row.product_name,
      status: row.status_label,
      statusLabel: row.status_label,
      notes: row.notes,
      displayOrder: row.display_order,
    })),
    photos,
    timeline: rawRpc.timeline ?? [],
    relatedVisits: rawRpc.related_visits ?? [],
  }
}

const env = loadEnv()
const token = loadChromeToken()
if (!token) {
  writeFileSync(
    join(outDir, 'error.json'),
    JSON.stringify({ error: 'no_auth_token' }, null, 2),
  )
  process.exit(2)
}

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${token}` } },
})

const { data: history, error: histErr } = await sb.rpc('list_visit_history', {
  p_search: null,
  p_store_id: null,
  p_visitor_id: null,
  p_status: null,
  p_from_date: null,
  p_to_date: null,
  p_sort_by: 'visit_date',
  p_sort_dir: 'desc',
  p_page: 1,
  p_page_size: 20,
})

if (histErr) {
  writeFileSync(
    join(outDir, 'error.json'),
    JSON.stringify({ error: histErr.message }, null, 2),
  )
  process.exit(2)
}

const visits = history?.rows ?? []
let visitId =
  visits.find((v) => v.visit_number === 'VIS-20260630-0001')?.visit_id ??
  visits.find((v) => (v.photos_count ?? 0) > 0 && v.status === 'Submitted')
    ?.visit_id ??
  visits[0]?.visit_id

const { data: rawRpc, error: rpcErr } = await sb.rpc('get_visit_details', {
  p_visit_id: visitId,
})

if (rpcErr) {
  writeFileSync(
    join(outDir, 'error.json'),
    JSON.stringify({ error: rpcErr.message }, null, 2),
  )
  process.exit(2)
}

writeFileSync(
  join(outDir, 'visit-meta.json'),
  JSON.stringify(
    { visitId, visitNumber: rawRpc.visit_number, branch: rawRpc.branch_name },
    null,
    2,
  ),
)

const server = await createServer({
  configFile: join(root, 'vite.config.ts'),
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const mapperMod = await server.ssrLoadModule(
    pathToFileURL(
      join(root, 'src/report-engine/adapters/visit-details.mapper.ts'),
    ).href,
  )
  const htmlMod = await server.ssrLoadModule(
    pathToFileURL(
      join(root, 'src/report-engine/server/render-template-html.tsx'),
    ).href,
  )
  const templateMod = await server.ssrLoadModule(
    pathToFileURL(
      join(root, 'src/report-engine/templates/VisitReportTemplate.tsx'),
    ).href,
  )
  const pdfHandler = await server.ssrLoadModule(
    pathToFileURL(join(root, 'api/pdf-handler.ts')).href,
  )

  const visitDetails = await mapRpcToVisitDetails(rawRpc, sb)

  const vm = mapperMod.mapVisitDetailsToReportViewModel(visitDetails)

  const browserMarkup = renderToStaticMarkup(
    createElement(templateMod.VisitReportTemplate, { data: vm }),
  )
  const reportCss = readFileSync(
    join(root, 'src/report-engine/styles/report.css'),
    'utf8',
  )
  const browserHtml = `<!DOCTYPE html>
<html lang="ar" dir="auto">
<head><meta charset="UTF-8"/><style>${reportCss}</style></head>
<body>${browserMarkup}</body>
</html>`
  writeFileSync(join(outDir, 'browser-template.html'), browserHtml)

  const pdfHtml = htmlMod.renderVisitReportHtml(vm)
  writeFileSync(join(outDir, 'pdf-pipeline.html'), pdfHtml)

  const pdfBuffer = await pdfHandler.generateVisitReportPdfBuffer(vm)
  writeFileSync(join(outDir, 'generated.pdf'), pdfBuffer)

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 1200 } })
    await page.setContent(browserHtml, { waitUntil: 'networkidle' })
    await page.screenshot({
      path: join(outDir, '01-browser-template.png'),
      fullPage: true,
    })

    const pdfPage = await browser.newPage({ viewport: { width: 794, height: 1123 } })
    await pdfPage.setContent(pdfHtml, { waitUntil: 'networkidle' })
    await pdfPage.emulateMedia({ media: 'print' })
    await pdfPage.screenshot({
      path: join(outDir, '02-pdf-pipeline-html-print.png'),
      fullPage: true,
    })

    const pdfRenderPage = await browser.newPage()
    await pdfRenderPage.setContent(pdfHtml, { waitUntil: 'networkidle' })
    await pdfRenderPage.emulateMedia({ media: 'print' })
    const pdfBytes = await pdfRenderPage.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
    })
    writeFileSync(join(outDir, 'playwright-from-html.pdf'), pdfBytes)
  } finally {
    await browser.close()
  }

  writeFileSync(
    join(outDir, 'done.json'),
    JSON.stringify(
      { ok: true, visitId, visitNumber: rawRpc.visit_number },
      null,
      2,
    ),
  )
} finally {
  await server.close()
}

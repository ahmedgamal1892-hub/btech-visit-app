import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = join(import.meta.dirname, '..')
const outDir = join(root, '.tmp/sprint12.2-after')
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
  for (const f of readdirSync(ldb)) {
    if (f.endsWith('.log') || f.endsWith('.ldb')) {
      blob += readFileSync(join(ldb, f)).toString('latin1')
    }
  }
  const marker = 'sb-cdflwrrmplbhugjosphn-auth-token'
  const slice = blob.slice(blob.lastIndexOf(marker), blob.lastIndexOf(marker) + 8000)
  return [...slice.matchAll(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g)][0]?.[0] ?? null
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
if (!token) throw new Error('no auth token')

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${token}` } },
})

const visitId = 'e8a6e68b-6419-4613-9593-aada38827f5a'
const { data: rawRpc, error } = await sb.rpc('get_visit_details', { p_visit_id: visitId })
if (error) throw new Error(error.message)

const server = await createServer({
  configFile: join(root, 'vite.config.ts'),
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const mapperMod = await server.ssrLoadModule(
    pathToFileURL(join(root, 'src/report-engine/adapters/visit-details.mapper.ts')).href,
  )
  const htmlMod = await server.ssrLoadModule(
    pathToFileURL(join(root, 'src/report-engine/server/render-template-html.tsx')).href,
  )
  const pdfHandler = await server.ssrLoadModule(
    pathToFileURL(join(root, 'api/pdf-handler.ts')).href,
  )

  const visitDetails = await mapRpcToVisitDetails(rawRpc, sb)
  const vm = mapperMod.mapVisitDetailsToReportViewModel(visitDetails)
  const pdfHtml = htmlMod.renderVisitReportHtml(vm)
  writeFileSync(join(outDir, 'pdf-pipeline.html'), pdfHtml)

  const pdfBuffer = await pdfHandler.generateVisitReportPdfBuffer(vm)
  writeFileSync(join(outDir, 'generated.pdf'), pdfBuffer)

  const pageCount = Buffer.from(
    pdfBuffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? [],
  ).length
  writeFileSync(
    join(outDir, 'meta.json'),
    JSON.stringify({ visitNumber: rawRpc.visit_number, pageCount }, null, 2),
  )

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 } })
    await page.setContent(pdfHtml, { waitUntil: 'networkidle' })
    await page.emulateMedia({ media: 'print' })

    for (let index = 0; index < 4; index += 1) {
      await page.evaluate((y) => window.scrollTo(0, y), index * 1123)
      await page.screenshot({
        path: join(outDir, `page${index + 1}.png`),
      })
    }
  } finally {
    await browser.close()
  }
} finally {
  await server.close()
}

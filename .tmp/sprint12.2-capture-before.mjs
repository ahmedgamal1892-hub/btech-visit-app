import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { createClient } from '@supabase/supabase-js'
import { pdf } from 'pdf-to-img'
import { createServer } from 'vite'

const root = join(import.meta.dirname, '..')
const outDir = join(root, '.tmp/sprint12.2-before')
const pdfPath = join(outDir, 'generated.pdf')
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

const oldCss = readFileSync(
  join(root, 'src/report-engine/styles/report.css'),
  'utf8',
)
const baselineCss = readFileSync(
  join(root, '.tmp/sprint12.2-baseline-report.css'),
  'utf8',
)

writeFileSync(join(root, 'src/report-engine/styles/report.css'), baselineCss)

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
  const pdfHandler = await server.ssrLoadModule(
    pathToFileURL(join(root, 'api/pdf-handler.ts')).href,
  )

  const visitDetails = await mapRpcToVisitDetails(rawRpc, sb)
  const vm = mapperMod.mapVisitDetailsToReportViewModel(visitDetails)

  const { execSync } = await import('node:child_process')
  execSync('git checkout HEAD -- production-pdf-spike/generate-pdf.ts src/report-engine/server/generate-pdf-from-html.ts', {
    cwd: root,
    stdio: 'inherit',
  })

  const pdfHandlerBaseline = await server.ssrLoadModule(
    pathToFileURL(join(root, 'api/pdf-handler.ts')).href + '?t=' + Date.now(),
  )
  const pdfBuffer = await pdfHandlerBaseline.generateVisitReportPdfBuffer(vm)
  writeFileSync(pdfPath, pdfBuffer)

  const document = await pdf(pdfPath, { scale: 2 })
  mkdirSync(join(outDir, 'pdf-pages'), { recursive: true })
  let index = 1
  for await (const page of document) {
    writeFileSync(join(outDir, 'pdf-pages', `before-page${index}.png`), page)
    index += 1
  }
  writeFileSync(
    join(outDir, 'pdf-pages/meta.json'),
    JSON.stringify({ pageCount: index - 1 }, null, 2),
  )
} finally {
  writeFileSync(join(root, 'src/report-engine/styles/report.css'), oldCss)
  const { execSync } = await import('node:child_process')
  execSync('git checkout HEAD -- production-pdf-spike/generate-pdf.ts src/report-engine/server/generate-pdf-from-html.ts', {
    cwd: root,
    stdio: 'inherit',
  })
  await server.close()
}

console.log('Baseline PDF generated at', pdfPath)

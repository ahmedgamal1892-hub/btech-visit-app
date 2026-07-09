import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as esbuild from 'esbuild'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outFile = join(root, 'api/pdf/renderer.bundle.js')
const typesFile = join(root, 'api/pdf/renderer.bundle.d.ts')

await esbuild.build({
  entryPoints: [join(root, 'api/pdf/renderer.ts')],
  outfile: outFile,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  bundle: true,
  external: [
    'react',
    'react-dom',
    'playwright',
    'playwright-core',
    '@sparticuz/chromium',
  ],
  loader: {
    '.css': 'text',
    '.ttf': 'file',
  },
  jsx: 'automatic',
})

writeFileSync(
  typesFile,
  `export type { ReportViewModel } from './types.js'
export declare function renderVisitReportHtml(data: ReportViewModel): string
export declare function generateVisitReportPdfBuffer(
  reportViewModel: ReportViewModel,
): Promise<Buffer>
`,
)

console.log('PDF engine bundle written to:', outFile)

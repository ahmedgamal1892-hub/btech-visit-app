import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { pdf } from 'pdf-to-img'

const root = join(import.meta.dirname, '..')

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

const afterPdf = join(root, '.tmp/sprint12.2-after/generated.pdf')
const beforePdf = join(root, '.tmp/sprint12-visual-audit/generated.pdf')

const afterPages = await rasterizePdf(
  afterPdf,
  join(root, '.tmp/sprint12.2-after/pdf-pages'),
  'after',
)
writeFileSync(
  join(root, '.tmp/sprint12.2-after/pdf-pages/meta.json'),
  JSON.stringify({ pageCount: afterPages }, null, 2),
)

if (readFileSync(beforePdf)) {
  const beforePages = await rasterizePdf(
    beforePdf,
    join(root, '.tmp/sprint12.2-before/pdf-pages'),
    'before',
  )
  writeFileSync(
    join(root, '.tmp/sprint12.2-before/pdf-pages/meta.json'),
    JSON.stringify({ pageCount: beforePages }, null, 2),
  )
}

console.log('Rasterized after PDF:', afterPages, 'pages')

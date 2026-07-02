import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { chromium } from 'playwright'

export type GeneratePdfFromHtmlOptions = {
  html: string
  outputPath: string
}

async function launchReportBrowser() {
  try {
    return await chromium.launch({
      headless: true,
      channel: 'chrome',
    })
  } catch {
    return await chromium.launch({ headless: true })
  }
}

export async function generatePdfFromHtml({
  html,
  outputPath,
}: GeneratePdfFromHtmlOptions): Promise<string> {
  mkdirSync(dirname(outputPath), { recursive: true })

  const browser = await launchReportBrowser()

  try {
    const page = await browser.newPage()

    await page.setContent(html, {
      waitUntil: 'networkidle',
    })

    await page.emulateMedia({ media: 'print' })

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm',
      },
    })

    return outputPath
  } finally {
    await browser.close()
  }
}

export async function writePdfBuffer(
  outputPath: string,
  pdfBuffer: Buffer,
): Promise<string> {
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, pdfBuffer)

  return outputPath
}

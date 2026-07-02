import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { chromium } from 'playwright'

import { waitForReportImages } from '../../../production-pdf-spike/wait-for-report-images'

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
      waitUntil: 'domcontentloaded',
    })

    await waitForReportImages(page)

    await page.emulateMedia({ media: 'print' })

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
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

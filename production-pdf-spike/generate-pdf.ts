import { chromium as playwrightChromium } from 'playwright-core'

import { waitForReportImages } from './wait-for-report-images'

async function launchBrowser() {
  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default

    return playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })
  }

  try {
    return await playwrightChromium.launch({
      channel: 'chrome',
      headless: true,
    })
  } catch {
    const { chromium } = await import('playwright')
    return chromium.launch({ headless: true })
  }
}

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  const browser = await launchBrowser()

  try {
    const page = await browser.newPage()

    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
    })

    await waitForReportImages(page)

    await page.emulateMedia({ media: 'print' })

    const pdfBytes = await page.pdf({
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

    return Buffer.from(pdfBytes)
  } finally {
    await browser.close()
  }
}

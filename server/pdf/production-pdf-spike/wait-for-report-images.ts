import type { Page } from 'playwright-core'

const IMAGE_TIMEOUT_MS = 20_000

async function waitForImageLocator(
  page: Page,
  selector: string,
  index = 0,
): Promise<void> {
  const locator = page.locator(selector).nth(index)
  const count = await page.locator(selector).count()
  if (index >= count) {
    return
  }

  await locator.scrollIntoViewIfNeeded()
  await locator.evaluate(
    (element, timeoutMs) =>
      new Promise<void>((resolve) => {
        const img = element as HTMLImageElement
        img.loading = 'eager'

        const finish = () => {
          if (typeof img.decode === 'function') {
            void img.decode().finally(resolve)
            return
          }

          resolve()
        }

        if (img.complete && img.naturalWidth > 0) {
          finish()
          return
        }

        const timer = window.setTimeout(finish, timeoutMs)
        const done = () => {
          window.clearTimeout(timer)
          finish()
        }

        img.addEventListener('load', done, { once: true })
        img.addEventListener('error', done, { once: true })

        const src = img.currentSrc || img.getAttribute('src')
        if (src) {
          img.src = src
        }
      }),
    IMAGE_TIMEOUT_MS,
  )
}

export async function waitForReportImages(page: Page): Promise<void> {
  await page.setViewportSize({ width: 794, height: 1123 })

  const photoCount = await page.locator('.report-photo-grid__image').count()
  for (let index = 0; index < photoCount; index += 1) {
    await waitForImageLocator(page, '.report-photo-grid__image', index)
  }

  if (await page.locator('.report-header__logo-image').count()) {
    await waitForImageLocator(page, '.report-header__logo-image', 0)
  }

  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

  await page.evaluate(async () => {
    const replaceWithUnavailable = (img: HTMLImageElement) => {
      const placeholder = document.createElement('div')
      placeholder.className =
        'report-photo-grid__placeholder report-photo-grid__image report-photo-grid__image--unavailable'
      placeholder.setAttribute('role', 'img')
      placeholder.setAttribute('aria-label', 'Image unavailable')
      placeholder.textContent = 'Image unavailable'
      img.replaceWith(placeholder)
    }

    const retryImage = (img: HTMLImageElement) =>
      new Promise<void>((resolve) => {
        const finish = () => {
          if (typeof img.decode === 'function') {
            void img.decode().finally(resolve)
            return
          }

          resolve()
        }

        if (img.complete && img.naturalWidth > 0) {
          finish()
          return
        }

        img.addEventListener('load', finish, { once: true })
        img.addEventListener('error', finish, { once: true })

        const src = img.currentSrc || img.getAttribute('src')
        if (src) {
          img.src = src
        } else {
          finish()
        }
      })

    const images = Array.from(
      document.querySelectorAll<HTMLImageElement>('.report-photo-grid__image'),
    )

    for (const img of images) {
      img.loading = 'eager'
      img.scrollIntoView({ block: 'center' })
      await retryImage(img)

      if (!img.isConnected) {
        continue
      }

      if (!img.complete || img.naturalWidth === 0) {
        replaceWithUnavailable(img)
      }
    }
  })
}

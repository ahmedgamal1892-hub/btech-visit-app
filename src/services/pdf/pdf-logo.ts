let cachedLogoDataUrl: string | null = null
let cachedLogoDimensions: { width: number; height: number } | null = null

function readImageDimensions(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
    }

    image.onerror = () => {
      reject(
        new Error('Unable to measure BTECH logo dimensions for PDF export.'),
      )
    }

    image.src = dataUrl
  })
}

export async function loadPdfLogoDataUrl(): Promise<string> {
  if (cachedLogoDataUrl) {
    return cachedLogoDataUrl
  }

  const response = await fetch('/logo.png')

  if (!response.ok) {
    throw new Error('Unable to load BTECH logo for PDF export.')
  }

  const blob = await response.blob()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Invalid BTECH logo data for PDF export.'))
        return
      }

      cachedLogoDataUrl = reader.result
      resolve(reader.result)
    }

    reader.onerror = () => {
      reject(new Error('Unable to read BTECH logo for PDF export.'))
    }

    reader.readAsDataURL(blob)
  })
}

export async function loadPdfLogoDimensions(): Promise<{
  width: number
  height: number
}> {
  if (cachedLogoDimensions) {
    return cachedLogoDimensions
  }

  const dataUrl = await loadPdfLogoDataUrl()
  cachedLogoDimensions = await readImageDimensions(dataUrl)
  return cachedLogoDimensions
}

export function getPdfLogoRenderSize(
  naturalWidth: number,
  naturalHeight: number,
  maxHeight: number,
  maxWidth: number,
): { width: number; height: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: maxHeight, height: maxHeight }
  }

  const aspectRatio = naturalWidth / naturalHeight
  let height = maxHeight
  let width = height * aspectRatio

  if (width > maxWidth) {
    width = maxWidth
    height = width / aspectRatio
  }

  return { width, height }
}

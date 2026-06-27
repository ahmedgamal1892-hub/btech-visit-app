let cachedLogoDataUrl: string | null = null

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

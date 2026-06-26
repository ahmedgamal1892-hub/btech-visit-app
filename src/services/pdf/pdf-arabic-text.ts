import type { jsPDF } from 'jspdf'

const ARABIC_CHARACTER_PATTERN =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

const MODEL_TOKEN_PATTERN =
  /([A-Za-z]+(?:[-\s][A-Za-z0-9./]+)+|\b[A-Za-z]{1,6}\s*-?\s*\d[\w./-]*\b|\b\d+(?:\.\d+)?(?:mm|cm|kg|l|w|hp|btu|gb|tb|hz|mah)?\b)/gi

export const PDF_FONT_LATIN = 'helvetica'
export const PDF_FONT_ARABIC = 'Cairo'

export type PdfBidiOptions = {
  isInputVisual: boolean
  isOutputVisual: boolean
  isSymmetricSwapping: boolean
}

export const PDF_BIDI_OPTIONS: PdfBidiOptions = {
  isInputVisual: false,
  isOutputVisual: true,
  isSymmetricSwapping: true,
}

export function containsArabic(text: string): boolean {
  return ARABIC_CHARACTER_PATTERN.test(text)
}

function protectModelTokens(text: string): string {
  return text.replace(MODEL_TOKEN_PATTERN, (match) =>
    match.replace(/\s+/g, '\u00A0'),
  )
}

export function getPdfFontFamily(text: string): string {
  return containsArabic(text) ? PDF_FONT_ARABIC : PDF_FONT_LATIN
}

export function getPdfTextOptions(text: string): Record<string, unknown> {
  if (!containsArabic(text)) {
    return {}
  }

  return { ...PDF_BIDI_OPTIONS }
}

function mergeArabicTextOptions(
  text: string | string[],
  options?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const hasArabic =
    typeof text === 'string'
      ? containsArabic(text)
      : text.some((line) => typeof line === 'string' && containsArabic(line))

  if (!hasArabic) {
    return options
  }

  return {
    ...(options ?? {}),
    ...PDF_BIDI_OPTIONS,
  }
}

/**
 * Prepares mixed Arabic/English text for PDF rendering.
 * Keeps logical Unicode order and protects model tokens from bad line breaks.
 */
export function preparePdfMixedText(text: string): string {
  if (!text) {
    return text
  }

  return protectModelTokens(text.normalize('NFC'))
}

export function measurePdfMixedTextHeight(
  doc: jsPDF,
  text: string,
  boxWidth: number,
  fontSize = 10,
): number {
  const displayText = preparePdfMixedText(text)

  doc.setFont(getPdfFontFamily(displayText), 'normal')
  doc.setFontSize(fontSize)

  const lines = doc.splitTextToSize(displayText, boxWidth) as string[]

  return lines.length * fontSize * 0.45
}

export function drawPdfMixedTextInBox(
  doc: jsPDF,
  text: string,
  boxLeft: number,
  boxTop: number,
  boxWidth: number,
  fontSize = 10,
) {
  const displayText = preparePdfMixedText(text)
  const isArabic = containsArabic(displayText)

  doc.setFont(getPdfFontFamily(displayText), 'normal')
  doc.setFontSize(fontSize)

  const textX = isArabic ? boxLeft + boxWidth : boxLeft

  doc.text(displayText, textX, boxTop, {
    maxWidth: boxWidth,
    align: isArabic ? 'right' : 'left',
    ...getPdfTextOptions(displayText),
  })
}

export function installArabicTextRendering(doc: jsPDF): void {
  const docWithFlag = doc as jsPDF & {
    __arabicTextRenderingInstalled?: boolean
  }

  if (docWithFlag.__arabicTextRenderingInstalled) {
    return
  }

  const originalText = doc.text.bind(doc)
  const originalSplitTextToSize = doc.splitTextToSize.bind(doc)

  doc.text = ((
    text: string | string[],
    x: number,
    y: number,
    options?: Record<string, unknown>,
    transform?: unknown,
  ) => {
    return originalText(
      text as never,
      x,
      y,
      mergeArabicTextOptions(text, options) as never,
      transform as never,
    )
  }) as typeof doc.text

  doc.splitTextToSize = ((
    text: string,
    maxWidth: number,
    options?: Record<string, unknown>,
  ) => {
    const fontFamily = getPdfFontFamily(text)

    return originalSplitTextToSize(text, maxWidth, {
      ...(options ?? {}),
      font: options?.font ?? fontFamily,
    })
  }) as typeof doc.splitTextToSize

  docWithFlag.__arabicTextRenderingInstalled = true
}

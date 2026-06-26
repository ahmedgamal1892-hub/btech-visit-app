import type { jsPDF } from 'jspdf'

export const PRODUCT_NAME_MAX_LINES = 2

function getTextWidth(doc: jsPDF, text: string, fontSize: number): number {
  return (
    (doc.getStringUnitWidth(text, { fontSize }) * fontSize) /
    doc.internal.scaleFactor
  )
}

function tokenizeWords(text: string): string[] {
  return text.trim().split(/\s+/).filter((word) => word.length > 0)
}

function appendWordsToLine(line: string, words: string[]): string {
  if (words.length === 0) {
    return line
  }

  const addition = words.join(' ')
  return line ? `${line} ${addition}` : addition
}

function finalizeLines(
  lines: string[],
  remainingWords: string[],
  maxLines: number,
): string[] {
  const result = lines.slice(0, maxLines)

  if (remainingWords.length === 0) {
    return result.length > 0 ? result : ['']
  }

  if (result.length === 0) {
    return [remainingWords.join(' ')]
  }

  const lastIndex = Math.min(result.length, maxLines) - 1
  result[lastIndex] = appendWordsToLine(result[lastIndex] ?? '', remainingWords)
  return result
}

export function wrapTextAtWordBoundaries(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  maxLines: number,
  fontSize: number,
): string[] {
  const words = tokenizeWords(text)

  if (words.length === 0) {
    return ['']
  }

  if (maxLines <= 0) {
    return ['']
  }

  const widthLimit = maxWidth + 0.01
  const lines: string[] = []
  let currentLine = ''
  let wordIndex = 0

  while (wordIndex < words.length) {
    const word = words[wordIndex]!
    const candidate = currentLine ? `${currentLine} ${word}` : word

    if (getTextWidth(doc, candidate, fontSize) <= widthLimit) {
      currentLine = candidate
      wordIndex += 1
      continue
    }

    if (currentLine) {
      lines.push(currentLine)
      currentLine = ''

      if (lines.length >= maxLines) {
        return finalizeLines(lines, words.slice(wordIndex), maxLines)
      }

      continue
    }

    lines.push(word)
    wordIndex += 1

    if (lines.length >= maxLines) {
      return finalizeLines(lines, words.slice(wordIndex), maxLines)
    }
  }

  if (currentLine) {
    if (lines.length < maxLines) {
      lines.push(currentLine)
    } else {
      return finalizeLines(lines, tokenizeWords(currentLine), maxLines)
    }
  }

  return lines.length > 0 ? lines : ['']
}

export function wrapTextToMaxLines(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  maxLines: number,
  fontSize: number,
): string[] {
  return wrapTextAtWordBoundaries(doc, text, maxWidth, maxLines, fontSize)
}

export function createMaxLineWrapOverflowHandler(
  doc: jsPDF,
  options: {
    fontSize: number
    maxLines: number
    getFontFamily: (text: string) => string
  },
): (text: string | string[], width: number) => string[] {
  return (text, width) => {
    const value = Array.isArray(text) ? text.join(' ') : String(text ?? '')

    doc.setFont(options.getFontFamily(value), 'normal')
    doc.setFontSize(options.fontSize)

    return wrapTextAtWordBoundaries(
      doc,
      value,
      width,
      options.maxLines,
      options.fontSize,
    )
  }
}

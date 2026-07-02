const ARABIC_CHARACTER_PATTERN =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

const LEADING_NEUTRAL_CHARACTER_PATTERN =
  /[\s0-9\u0660-\u0669\u2022\u2023\u25E6\u2043\u2219·•\-–—.:;,)\]}>[\[(]/

export type ParagraphDirection = 'rtl' | 'ltr'

export function detectParagraphDirection(
  text: string,
  fallback: ParagraphDirection = 'rtl',
): ParagraphDirection {
  const trimmed = text.trim()

  if (!trimmed) {
    return fallback
  }

  for (const character of trimmed) {
    if (LEADING_NEUTRAL_CHARACTER_PATTERN.test(character)) {
      continue
    }

    if (ARABIC_CHARACTER_PATTERN.test(character)) {
      return 'rtl'
    }

    if (/[A-Za-z]/.test(character)) {
      return 'ltr'
    }
  }

  return fallback
}

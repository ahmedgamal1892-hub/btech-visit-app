import { detectParagraphDirection } from '@/components/editor/utils/detect-paragraph-direction'

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function looksLikeHtml(value: string): boolean {
  return /^\s*<[a-z][\s\S]*>/i.test(value.trim())
}

function paragraphHtml(line: string, defaultDirection: 'rtl' | 'ltr' = 'rtl'): string {
  const direction = line.trim()
    ? detectParagraphDirection(line, defaultDirection)
    : defaultDirection
  const align = direction === 'rtl' ? 'right' : 'left'

  if (!line) {
    return `<p dir="${direction}" style="text-align: ${align}"></p>`
  }

  return `<p dir="${direction}" style="text-align: ${align}">${escapeHtml(line)}</p>`
}

function plainTextGeneralNotesToHtml(plainText: string): string {
  const lines = plainText.split('\n')
  const parts: string[] = []
  let inBulletList = false
  let inOrderedList = false

  const closeLists = () => {
    if (inBulletList) {
      parts.push('</ul>')
      inBulletList = false
    }

    if (inOrderedList) {
      parts.push('</ol>')
      inOrderedList = false
    }
  }

  for (const line of lines) {
    const bulletMatch = line.match(/^•\s+(.*)$/)
    const orderedMatch = line.match(/^\d+\.\s+(.*)$/)

    if (bulletMatch) {
      if (inOrderedList) {
        closeLists()
      }

      if (!inBulletList) {
        parts.push('<ul>')
        inBulletList = true
      }

      const content = bulletMatch[1] ?? ''
      const direction = detectParagraphDirection(content, 'rtl')
      parts.push(
        `<li><p dir="${direction}" style="text-align: ${direction === 'rtl' ? 'right' : 'left'}">${escapeHtml(content)}</p></li>`,
      )
      continue
    }

    if (orderedMatch) {
      if (inBulletList) {
        closeLists()
      }

      if (!inOrderedList) {
        parts.push('<ol>')
        inOrderedList = true
      }

      const content = orderedMatch[1] ?? ''
      const direction = detectParagraphDirection(content, 'rtl')
      parts.push(
        `<li><p dir="${direction}" style="text-align: ${direction === 'rtl' ? 'right' : 'left'}">${escapeHtml(content)}</p></li>`,
      )
      continue
    }

    closeLists()
    parts.push(paragraphHtml(line))
  }

  closeLists()

  return parts.join('')
}

export function resolveGeneralNotesHtml(
  generalNotes: string | null,
  htmlOverride?: string | null,
): string {
  if (htmlOverride?.trim()) {
    return htmlOverride.trim()
  }

  if (!generalNotes?.trim()) {
    return ''
  }

  if (looksLikeHtml(generalNotes)) {
    return generalNotes.trim()
  }

  return plainTextGeneralNotesToHtml(generalNotes.trim())
}

function extractInlineText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const element = node as Element
  const tagName = element.tagName.toUpperCase()

  if (tagName === 'BR') {
    return '\n'
  }

  let text = ''

  for (const child of Array.from(element.childNodes)) {
    text += extractInlineText(child)
  }

  return text
}

function extractListItemText(listItem: Element): string {
  const paragraphs = Array.from(listItem.children).filter(
    (child) => child.tagName.toUpperCase() === 'P',
  )

  if (paragraphs.length > 0) {
    return paragraphs
      .map((paragraph) => extractInlineText(paragraph).replace(/\s+$/, ''))
      .filter((line) => line.length > 0)
      .join('\n  ')
  }

  return extractInlineText(listItem).replace(/\s+$/, '')
}

function processListItem(listItem: Element, marker: string): string {
  const text = extractListItemText(listItem)

  return `${marker}${text}`
}

function processBlockElement(element: Element): string[] {
  const tagName = element.tagName.toUpperCase()

  if (tagName === 'P') {
    const text = extractInlineText(element).replace(/\s+$/, '')

    return [text]
  }

  if (tagName === 'UL') {
    return Array.from(element.children)
      .filter((child) => child.tagName.toUpperCase() === 'LI')
      .map((listItem) => processListItem(listItem, '• '))
  }

  if (tagName === 'OL') {
    let index = 1

    return Array.from(element.children)
      .filter((child) => child.tagName.toUpperCase() === 'LI')
      .map((listItem) => {
        const line = processListItem(listItem, `${index}. `)
        index += 1
        return line
      })
  }

  if (tagName === 'LI') {
    return [extractListItemText(element)]
  }

  const text = extractInlineText(element).replace(/\s+$/, '')

  return text ? [text] : []
}

function isEmptyEditorHtml(html: string): boolean {
  const trimmedHtml = html.trim()

  return (
    !trimmedHtml ||
    trimmedHtml === '<p></p>' ||
    trimmedHtml === '<p dir="rtl"></p>' ||
    trimmedHtml === '<p dir="ltr"></p>' ||
    trimmedHtml === '<p dir="rtl" style="text-align: right"></p>' ||
    trimmedHtml === '<p dir="ltr" style="text-align: left"></p>'
  )
}

export function convertEditorHtmlToPlainText(html: string): string {
  if (isEmptyEditorHtml(html)) {
    return ''
  }

  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const lines: string[] = []

  for (const child of Array.from(parsed.body.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? '').replace(/\s+$/, '')

      if (text) {
        lines.push(text)
      }

      continue
    }

    if (child.nodeType === Node.ELEMENT_NODE) {
      lines.push(...processBlockElement(child as Element))
    }
  }

  return lines.join('\n')
}

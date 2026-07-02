const ALLOWED_BLOCK_TAGS = new Set(['P', 'UL', 'OL', 'LI', 'DIV', 'BR'])
const ALLOWED_INLINE_TAGS = new Set(['STRONG', 'B', 'EM', 'I', 'U'])
const OFFICE_TAG_PREFIXES = ['O:', 'W:', 'V:', 'ST1:', 'M:', 'XML']

function stripOfficeComments(html: string): string {
  return html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, (comment) =>
      comment
        .replace(/<!--\[if[^>]*>/gi, '')
        .replace(/<!\[endif\]-->/gi, ''),
    )
    .replace(/<!--[\s\S]*?-->/g, '')
}

function isOfficeTag(tagName: string): boolean {
  const upperTagName = tagName.toUpperCase()

  return OFFICE_TAG_PREFIXES.some((prefix) => upperTagName.startsWith(prefix))
}

function isBoldStyle(style: string): boolean {
  return (
    /(?:^|;)\s*font-weight:\s*(?:bold|[7-9]00)\b/i.test(style) ||
    /(?:^|;)\s*mso-bidi-font-weight:\s*bold\b/i.test(style)
  )
}

function isItalicStyle(style: string): boolean {
  return (
    /(?:^|;)\s*font-style:\s*italic\b/i.test(style) ||
    /(?:^|;)\s*mso-bidi-font-style:\s*italic\b/i.test(style)
  )
}

function isWordListParagraph(element: Element): boolean {
  const className = element.getAttribute('class') ?? ''
  const style = element.getAttribute('style') ?? ''

  return (
    /MsoListParagraph/i.test(className) ||
    /mso-list:/i.test(style) ||
    element.getAttribute('data-list-item') === 'true'
  )
}

function detectWordListType(element: Element): 'ul' | 'ol' {
  const style = element.getAttribute('style') ?? ''
  const className = element.getAttribute('class') ?? ''
  const text = element.textContent ?? ''

  if (/mso-list:\s*l\d+\s+level\d+\s+lfo\d+/i.test(style)) {
    if (/decimal|roman|alpha/i.test(style)) {
      return 'ol'
    }
  }

  if (/MsoListNumber/i.test(className)) {
    return 'ol'
  }

  if (/^\s*\d+[.)]\s+/.test(text)) {
    return 'ol'
  }

  return 'ul'
}

function stripListMarkerPrefix(text: string): string {
  return text
    .replace(/^\s*[\u2022\u2023\u25E6\u2043\u2219·•\-–—]\s+/, '')
    .replace(/^\s*\d+[.)]\s+/, '')
    .trimStart()
}

function wrapWithFormatting(
  document: Document,
  node: Node,
  bold: boolean,
  italic: boolean,
): Element | Text {
  let current: Node = node

  if (italic) {
    const em = document.createElement('em')
    em.append(current)
    current = em
  }

  if (bold) {
    const strong = document.createElement('strong')
    strong.append(current)
    current = strong
  }

  return current as Element | Text
}

function normalizeInlineChildren(
  element: Element,
  document: Document,
  inheritedBold = false,
  inheritedItalic = false,
): DocumentFragment {
  const fragment = document.createDocumentFragment()
  const inlineStyle = element.getAttribute('style') ?? ''
  const bold = inheritedBold || isBoldStyle(inlineStyle)
  const italic = inheritedItalic || isItalicStyle(inlineStyle)

  for (const child of Array.from(element.childNodes)) {
    const normalized = normalizeNode(child, document, bold, italic)

    if (normalized) {
      fragment.append(normalized)
    }
  }

  return fragment
}

function normalizeNode(
  node: Node,
  document: Document,
  inheritedBold = false,
  inheritedItalic = false,
): Element | DocumentFragment | Text | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''

    if (!text) {
      return null
    }

    if (!inheritedBold && !inheritedItalic) {
      return document.createTextNode(text)
    }

    return wrapWithFormatting(
      document,
      document.createTextNode(text),
      inheritedBold,
      inheritedItalic,
    )
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    return normalizeElement(node as Element, document, inheritedBold, inheritedItalic)
  }

  return null
}

function normalizeElement(
  node: Element,
  document: Document,
  inheritedBold = false,
  inheritedItalic = false,
): Element | DocumentFragment | Text | null {
  const tagName = node.tagName.toUpperCase()

  if (isOfficeTag(tagName) || tagName === 'STYLE' || tagName === 'SCRIPT') {
    const fragment = document.createDocumentFragment()

    for (const child of Array.from(node.childNodes)) {
      const normalized = normalizeNode(child, document, inheritedBold, inheritedItalic)

      if (normalized) {
        fragment.append(normalized)
      }
    }

    return fragment.childNodes.length > 0 ? fragment : null
  }

  if (tagName === 'BR') {
    return node.cloneNode(true) as Element
  }

  if (ALLOWED_INLINE_TAGS.has(tagName)) {
    const normalized = document.createElement(
      tagName === 'B' || tagName === 'STRONG'
        ? 'strong'
        : tagName === 'I' || tagName === 'EM'
          ? 'em'
          : tagName.toLowerCase(),
    )
    const bold =
      inheritedBold ||
      tagName === 'B' ||
      tagName === 'STRONG' ||
      isBoldStyle(node.getAttribute('style') ?? '')
    const italic =
      inheritedItalic ||
      tagName === 'I' ||
      tagName === 'EM' ||
      isItalicStyle(node.getAttribute('style') ?? '')

    for (const child of Array.from(node.childNodes)) {
      const normalizedChild = normalizeNode(child, document, bold, italic)

      if (normalizedChild) {
        normalized.append(normalizedChild)
      }
    }

    if (!normalized.textContent?.trim() && normalized.childNodes.length === 0) {
      return null
    }

    return normalized
  }

  if (tagName === 'SPAN' || tagName === 'FONT') {
    const inlineStyle = node.getAttribute('style') ?? ''
    const bold = inheritedBold || isBoldStyle(inlineStyle)
    const italic = inheritedItalic || isItalicStyle(inlineStyle)
    const fragment = normalizeInlineChildren(node, document, bold, italic)

    return fragment.childNodes.length > 0 ? fragment : null
  }

  if (tagName === 'UL' || tagName === 'OL') {
    const list = document.createElement(tagName.toLowerCase())

    for (const child of Array.from(node.children)) {
      if (child.tagName.toUpperCase() !== 'LI') {
        continue
      }

      const normalizedItem = normalizeElement(child, document)

      if (normalizedItem instanceof Element) {
        list.append(normalizedItem)
      }
    }

    return list.childNodes.length > 0 ? list : null
  }

  if (tagName === 'LI') {
    const item = document.createElement('li')
    const fragment = normalizeInlineChildren(node, document)

    for (const child of Array.from(fragment.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const childElement = child as Element
        const childTagName = childElement.tagName.toUpperCase()

        if (childTagName === 'P' || childTagName === 'DIV') {
          for (const inline of Array.from(childElement.childNodes)) {
            const normalizedInline = normalizeNode(inline, document)

            if (normalizedInline) {
              item.append(normalizedInline)
            }
          }

          continue
        }
      }

      item.append(child.cloneNode(true))
    }

    return item.childNodes.length > 0 ? item : null
  }

  if (ALLOWED_BLOCK_TAGS.has(tagName)) {
    const paragraph = document.createElement('p')

    for (const child of Array.from(node.childNodes)) {
      const normalizedChild = normalizeNode(child, document, inheritedBold, inheritedItalic)

      if (normalizedChild) {
        paragraph.append(normalizedChild)
      }
    }

    return paragraph.childNodes.length > 0 ? paragraph : null
  }

  if (node.children.length > 0) {
    const fragment = document.createDocumentFragment()

    for (const child of Array.from(node.childNodes)) {
      const normalized = normalizeNode(child, document, inheritedBold, inheritedItalic)

      if (normalized) {
        fragment.append(normalized)
      }
    }

    return fragment.childNodes.length > 0 ? fragment : null
  }

  const text = node.textContent ?? ''

  if (!text) {
    return null
  }

  if (!inheritedBold && !inheritedItalic) {
    return document.createTextNode(text)
  }

  return wrapWithFormatting(
    document,
    document.createTextNode(text),
    inheritedBold,
    inheritedItalic,
  )
}

function findFirstTextNode(root: Node): Text | null {
  if (root.nodeType === Node.TEXT_NODE) {
    return root as Text
  }

  for (const child of Array.from(root.childNodes)) {
    const match = findFirstTextNode(child)

    if (match) {
      return match
    }
  }

  return null
}

function stripLeadingMarkerFromNode(root: Node): void {
  const firstTextNode = findFirstTextNode(root)

  if (!firstTextNode?.textContent) {
    return
  }

  const cleaned = stripListMarkerPrefix(firstTextNode.textContent)

  if (cleaned !== firstTextNode.textContent) {
    firstTextNode.textContent = cleaned
  }
}

function buildListItemContent(element: Element, document: Document): Element | null {
  const item = document.createElement('li')
  const paragraph = document.createElement('p')
  const fragment = normalizeInlineChildren(element, document)

  for (const child of Array.from(fragment.childNodes)) {
    paragraph.append(child.cloneNode(true))
  }

  stripLeadingMarkerFromNode(paragraph)

  if (!paragraph.textContent?.trim() && paragraph.childNodes.length === 0) {
    return null
  }

  item.append(paragraph)
  return item
}

function groupWordListParagraphs(container: HTMLElement, document: Document): void {
  const nodes = Array.from(container.childNodes)
  container.textContent = ''

  let currentList: HTMLUListElement | HTMLOListElement | null = null
  let currentListType: 'ul' | 'ol' | null = null

  const flushList = () => {
    if (currentList && currentList.childNodes.length > 0) {
      container.append(currentList)
    }

    currentList = null
    currentListType = null
  }

  for (const node of nodes) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      flushList()

      const normalized = normalizeNode(node, document)

      if (normalized) {
        container.append(normalized)
      }

      continue
    }

    const element = node as Element

    if (isWordListParagraph(element)) {
      const listType = detectWordListType(element)
      const listItem = buildListItemContent(element, document)

      if (!listItem) {
        continue
      }

      if (!currentList || currentListType !== listType) {
        flushList()
        currentList = document.createElement(listType)
        currentListType = listType
      }

      currentList.append(listItem)
      continue
    }

    flushList()

    const normalized = normalizeElement(element, document)

    if (normalized) {
      container.append(normalized)
    }
  }

  flushList()
}

export function sanitizePastedHtml(html: string): string {
  if (!html.trim()) {
    return ''
  }

  const cleanedHtml = stripOfficeComments(html)
  const parsed = new DOMParser().parseFromString(cleanedHtml, 'text/html')
  const container = parsed.body
  const output = parsed.createElement('div')

  for (const child of Array.from(container.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as Element
      const tagName = element.tagName.toUpperCase()

      if (
        tagName === 'STYLE' ||
        tagName === 'SCRIPT' ||
        tagName === 'META' ||
        tagName === 'LINK' ||
        tagName === 'TITLE' ||
        isOfficeTag(tagName)
      ) {
        continue
      }
    }

    const normalized = normalizeNode(child, parsed)

    if (normalized) {
      output.append(normalized)
    }
  }

  groupWordListParagraphs(output, parsed)

  return output.innerHTML
}

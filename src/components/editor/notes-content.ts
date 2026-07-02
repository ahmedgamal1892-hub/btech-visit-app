import { convertEditorHtmlToPlainText } from './utils/html-to-plain-text'

export type NotesContent = {
  html: string
  plainText: string
}

export function createNotesContent(html: string, plainText: string): NotesContent {
  return {
    html,
    plainText,
  }
}

export function getNotesAsHtml(content: NotesContent): string {
  return content.html
}

export function getNotesAsPlainText(content: NotesContent): string {
  return content.plainText
}

export function createNotesContentFromHtml(html: string): NotesContent {
  const normalizedHtml = html.trim()

  return createNotesContent(
    normalizedHtml,
    convertEditorHtmlToPlainText(normalizedHtml),
  )
}

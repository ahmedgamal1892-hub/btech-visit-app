import type { jsPDF } from 'jspdf'

import cairoFontUrl from '@/assets/fonts/Cairo-Regular.ttf?url'

const VFS_FILE_NAME = 'Cairo-Regular.ttf'
const FONT_FAMILY = 'Cairo'

let fontBase64: string | null = null
const registeredDocs = new WeakSet<jsPDF>()

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

async function loadFontBase64(): Promise<string> {
  if (fontBase64) {
    return fontBase64
  }

  const response = await fetch(cairoFontUrl)
  if (!response.ok) {
    throw new Error('Unable to load Cairo font for PDF export.')
  }

  fontBase64 = arrayBufferToBase64(await response.arrayBuffer())
  return fontBase64
}

export async function registerPdfFonts(doc: jsPDF): Promise<void> {
  if (registeredDocs.has(doc)) {
    return
  }

  const base64 = await loadFontBase64()

  doc.addFileToVFS(VFS_FILE_NAME, base64)
  doc.addFont(VFS_FILE_NAME, FONT_FAMILY, 'normal')

  registeredDocs.add(doc)
}

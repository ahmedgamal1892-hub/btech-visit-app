import type { jsPDF } from 'jspdf'

import type { VisitBadgeDisplay } from '@/utils/visit-status-badge'
import type { PdfBadgeColors } from '@/utils/achievement-badge'

export const PAGE_WIDTH = 210
export const PAGE_HEIGHT = 297
export const MARGIN = 16
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
export const FOOTER_RESERVED_HEIGHT = 16
export const SECTION_GAP = 5
export const CARD_RADIUS = 3
export const BADGE_RADIUS = 2

export const COLORS = {
  primary: [15, 76, 129] as [number, number, number],
  secondary: [245, 247, 250] as [number, number, number],
  accent: [255, 122, 0] as [number, number, number],
  border: [217, 226, 236] as [number, number, number],
  textPrimary: [15, 23, 42] as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  textBody: [51, 65, 85] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  rowAlt: [248, 250, 252] as [number, number, number],
  shadow: [226, 232, 240] as [number, number, number],
}

export type PdfCursor = {
  y: number
}

export function ensureSpace(
  doc: jsPDF,
  cursor: PdfCursor,
  requiredHeight: number,
) {
  const remaining = PAGE_HEIGHT - FOOTER_RESERVED_HEIGHT - cursor.y

  if (remaining < requiredHeight) {
    doc.addPage()
    cursor.y = MARGIN
  }
}

export function ensureSectionTitleFits(doc: jsPDF, cursor: PdfCursor) {
  const remaining = PAGE_HEIGHT - FOOTER_RESERVED_HEIGHT - cursor.y

  if (remaining < 8) {
    doc.addPage()
    cursor.y = MARGIN
  }
}

export function drawSoftShadow(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  doc.setFillColor(...COLORS.shadow)
  doc.roundedRect(x + 0.5, y + 0.9, width, height, radius, radius, 'F')
}

export function drawCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = CARD_RADIUS,
) {
  drawSoftShadow(doc, x, y, width, height, radius)
  doc.setDrawColor(...COLORS.border)
  doc.setFillColor(...COLORS.white)
  doc.setLineWidth(0.25)
  doc.roundedRect(x, y, width, height, radius, radius, 'FD')
}

export function drawAccentLeftCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  accentWidth = 2.5,
) {
  drawCard(doc, x, y, width, height)
  doc.setFillColor(...COLORS.accent)
  doc.roundedRect(x, y + 1.2, accentWidth, height - 2.4, 1, 1, 'F')
}

function drawMiniBarsIcon(doc: jsPDF, x: number, y: number) {
  doc.setFillColor(...COLORS.accent)
  doc.roundedRect(x, y + 4, 2, 5, 0.4, 0.4, 'F')
  doc.roundedRect(x + 3.5, y + 2, 2, 7, 0.4, 0.4, 'F')
  doc.roundedRect(x + 7, y, 2, 9, 0.4, 0.4, 'F')
}

function drawMiniClipboardIcon(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor(...COLORS.accent)
  doc.setLineWidth(0.35)
  doc.roundedRect(x, y, 9, 11, 1, 1, 'S')
  doc.setFillColor(...COLORS.accent)
  doc.roundedRect(x + 2.5, y - 1.5, 4, 2.5, 0.5, 0.5, 'F')
  doc.setDrawColor(...COLORS.accent)
  for (let line = 0; line < 3; line += 1) {
    doc.line(x + 1.5, y + 3.5 + line * 2.2, x + 7.5, y + 3.5 + line * 2.2)
  }
}

function drawMiniCameraIcon(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor(...COLORS.accent)
  doc.setLineWidth(0.35)
  doc.roundedRect(x, y + 2, 10, 7, 1, 1, 'S')
  doc.roundedRect(x + 2.5, y, 5, 2.5, 0.6, 0.6, 'S')
  doc.setFillColor(...COLORS.accent)
  doc.circle(x + 5, y + 5.5, 1.8, 'F')
  doc.setFillColor(...COLORS.white)
  doc.circle(x + 5, y + 5.5, 0.8, 'F')
}

type SectionIcon = 'performance' | 'inspection' | 'photos'

function drawSectionIcon(doc: jsPDF, kind: SectionIcon, x: number, y: number) {
  doc.setFillColor(...COLORS.secondary)
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.2)
  doc.roundedRect(x, y - 4.5, 12, 12, 2, 2, 'FD')

  switch (kind) {
    case 'performance':
      drawMiniBarsIcon(doc, x + 1.5, y - 3)
      break
    case 'inspection':
      drawMiniClipboardIcon(doc, x + 1.5, y - 3.5)
      break
    case 'photos':
      drawMiniCameraIcon(doc, x + 1, y - 3.5)
      break
  }
}

export function drawSectionTitle(
  doc: jsPDF,
  cursor: PdfCursor,
  title: string,
  icon?: SectionIcon,
) {
  ensureSectionTitleFits(doc, cursor)

  if (icon) {
    drawSectionIcon(doc, icon, MARGIN, cursor.y)
  }

  const titleX = icon ? MARGIN + 15 : MARGIN

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...COLORS.primary)
  doc.text(title, titleX, cursor.y + 2)

  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, cursor.y + 6, PAGE_WIDTH - MARGIN, cursor.y + 6)

  cursor.y += 9
}

export function getVisitStatusPdfBadgeColors(
  display: VisitBadgeDisplay,
): PdfBadgeColors {
  switch (display) {
    case 'Submitted':
    case 'Closed':
      return { fill: [209, 250, 229], text: [6, 95, 70] }
    case 'Reviewed':
      return { fill: [255, 237, 213], text: [194, 65, 12] }
    case 'Needs Follow-up':
      return { fill: [254, 226, 226], text: [185, 28, 28] }
    case 'Draft':
      return { fill: [243, 244, 246], text: [55, 65, 81] }
    default:
      return { fill: [219, 234, 254], text: [30, 64, 175] }
  }
}

export function drawPillBadge(
  doc: jsPDF,
  centerX: number,
  centerY: number,
  label: string,
  colors: PdfBadgeColors,
  fontSize = 8,
) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(fontSize)
  const textWidth = doc.getTextWidth(label)
  const badgeWidth = textWidth + 6
  const badgeHeight = 5.2
  const x = centerX - badgeWidth / 2
  const y = centerY - badgeHeight / 2

  doc.setFillColor(...colors.fill)
  doc.setDrawColor(...colors.fill)
  doc.roundedRect(
    x,
    y,
    badgeWidth,
    badgeHeight,
    BADGE_RADIUS,
    BADGE_RADIUS,
    'F',
  )
  doc.setTextColor(...colors.text)
  doc.text(label, centerX, centerY + 0.6, { align: 'center' })
}

export function drawTableBadgeCell(
  doc: jsPDF,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number,
  label: string,
  colors: PdfBadgeColors,
  backgroundColor: [number, number, number] = COLORS.white,
) {
  doc.setFillColor(...backgroundColor)
  doc.rect(cellX, cellY, cellWidth, cellHeight, 'F')

  const centerX = cellX + cellWidth / 2
  const centerY = cellY + cellHeight / 2
  drawPillBadge(doc, centerX, centerY, label, colors, 8)
}

export function drawHeaderDivider(doc: jsPDF, y: number) {
  doc.setDrawColor(...COLORS.primary)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, y + 1.2, PAGE_WIDTH - MARGIN, y + 1.2)
}

export function drawFooterDivider(doc: jsPDF, y: number) {
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.25)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
}

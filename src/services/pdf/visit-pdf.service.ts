import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CellHookData } from 'jspdf-autotable'

import type { VisitDetails } from '@/types/visit-details'
import { PDF_BRANDING } from '@/lib/constants/branding'
import { fetchVisitDetails } from '@/services/visits/visit-details.service'
import { getAchievementBadgePdfColors } from '@/utils/achievement-badge'
import {
  formatAchievementPercent,
  formatNumberWithSeparators,
  formatPdfDate,
  formatPdfDateTime,
  formatPdfTime,
} from '@/utils/format'
import { resolveVisitBadgeDisplay } from '@/utils/visit-status-badge'
import { getVisitProductStatusPdfColors } from '@/utils/visit-product-status-badge'

import {
  containsArabic,
  drawPdfMixedTextInBox,
  installArabicTextRendering,
  measurePdfMixedTextHeight,
  PDF_FONT_ARABIC,
  preparePdfMixedText,
} from './pdf-arabic-text'
import {
  COLORS,
  CONTENT_WIDTH,
  drawAccentLeftCard,
  drawCard,
  drawFooterDivider,
  drawHeaderDivider,
  drawSectionTitle,
  drawTableBadgeCell,
  ensureSpace,
  FOOTER_RESERVED_HEIGHT,
  getVisitStatusPdfBadgeColors,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  SECTION_GAP,
  type PdfCursor,
} from './pdf-layout-theme'
import { registerPdfFonts } from './pdf-fonts'
import {
  loadPdfLogoDataUrl,
  loadPdfLogoDimensions,
  getPdfLogoRenderSize,
} from './pdf-logo'
import { prepareVisitPhotoForPdf } from './pdf-photo-presentation'

const PHOTO_COLUMNS = 3
const PHOTO_GAP = 4
const PHOTO_FRAME_HEIGHT_MM = 30
const INSPECTION_PRODUCT_WIDTH = CONTENT_WIDTH * 0.52
const INSPECTION_BRAND_WIDTH = CONTENT_WIDTH * 0.1
const INSPECTION_STATUS_WIDTH = CONTENT_WIDTH * 0.12
const INSPECTION_NOTES_WIDTH =
  CONTENT_WIDTH -
  INSPECTION_PRODUCT_WIDTH -
  INSPECTION_BRAND_WIDTH -
  INSPECTION_STATUS_WIDTH

const TABLE_MARGIN = {
  left: MARGIN,
  right: MARGIN,
  bottom: FOOTER_RESERVED_HEIGHT - 2,
} as const

const TABLE_CELL_PADDING = 2

function getTableRowBackground(
  rowIndex: number,
  fillColor: unknown,
): [number, number, number] {
  if (Array.isArray(fillColor) && fillColor.length === 3) {
    return fillColor as [number, number, number]
  }

  return rowIndex % 2 === 0 ? COLORS.white : COLORS.rowAlt
}

function getCreatedAt(details: VisitDetails): string {
  const createdEvent = details.timeline.find(
    (event) => event.eventType === 'created',
  )

  return createdEvent?.eventAt ?? details.visitDate
}

function getReportReferenceDate(details: VisitDetails): string {
  return details.visitDate
}

function getReportReferenceTime(details: VisitDetails): string {
  return details.submittedAt ?? details.visitDate
}

function addEmptyStateParagraph(doc: jsPDF, cursor: PdfCursor, text: string) {
  ensureSpace(doc, cursor, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.textMuted)
  doc.text(text, MARGIN, cursor.y)
  cursor.y += 8
}

function drawHeader(
  doc: jsPDF,
  details: VisitDetails,
  cursor: PdfCursor,
  logoDataUrl: string,
  logoWidth: number,
  logoHeight: number,
) {
  const referenceDate = getReportReferenceDate(details)
  const referenceTime = getReportReferenceTime(details)
  const textOffset = logoWidth + 6

  doc.addImage(logoDataUrl, 'PNG', MARGIN, cursor.y - 2, logoWidth, logoHeight)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...COLORS.textPrimary)
  doc.text(PDF_BRANDING.appName, MARGIN + textOffset, cursor.y + 4)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.textMuted)
  doc.text(PDF_BRANDING.tagline, MARGIN + textOffset, cursor.y + 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.textMuted)
  doc.text('Visit Report', MARGIN + textOffset, cursor.y + 17)

  const rightX = PAGE_WIDTH - MARGIN
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...COLORS.textMuted)
  doc.text('Visit Number', rightX, cursor.y, { align: 'right' })
  doc.text('Visit Date', rightX, cursor.y + 7, { align: 'right' })
  doc.text('Visit Time', rightX, cursor.y + 14, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...COLORS.primary)
  doc.text(details.visitNumber, rightX, cursor.y + 4, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.textPrimary)
  doc.text(formatPdfDate(referenceDate), rightX, cursor.y + 11, {
    align: 'right',
  })
  doc.text(formatPdfTime(referenceTime), rightX, cursor.y + 18, {
    align: 'right',
  })

  cursor.y += 22
  drawHeaderDivider(doc, cursor.y)
  cursor.y += SECTION_GAP
}

function drawVisitInformation(
  doc: jsPDF,
  details: VisitDetails,
  cursor: PdfCursor,
) {
  drawSectionTitle(doc, cursor, 'Visit Information')

  const statusLabel = resolveVisitBadgeDisplay({
    status: details.status,
    reviewDecision: details.reviewDecision,
  })
  const statusColors = getVisitStatusPdfBadgeColors(statusLabel)
  const cardHeight = 28
  const cardY = cursor.y

  ensureSpace(doc, cursor, cardHeight + SECTION_GAP)
  drawCard(doc, MARGIN, cardY, CONTENT_WIDTH, cardHeight)

  const columnGap = 8
  const columnWidth = (CONTENT_WIDTH - columnGap - 10) / 2
  const leftX = MARGIN + 5
  const rightX = leftX + columnWidth + columnGap
  let rowY = cardY + 6

  function drawInfoField(
    x: number,
    y: number,
    label: string,
    value: string,
    badgeColors?: ReturnType<typeof getVisitStatusPdfBadgeColors>,
  ) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...COLORS.textMuted)
    doc.text(label, x, y)

    if (badgeColors) {
      drawTableBadgeCell(
        doc,
        x,
        y + 1.5,
        columnWidth,
        8,
        statusLabel,
        badgeColors,
      )
      return
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...COLORS.textPrimary)
    doc.text(value, x, y + 5.5)
  }

  drawInfoField(leftX, rowY, 'Branch', details.branchName)
  drawInfoField(rightX, rowY, 'Visitor', details.visitorName)

  rowY += 12
  drawInfoField(leftX, rowY, 'Status', statusLabel, statusColors)
  drawInfoField(
    rightX,
    rowY,
    'Created At',
    formatPdfDateTime(getCreatedAt(details)),
  )

  cursor.y = cardY + cardHeight + SECTION_GAP
}

function drawBranchPerformance(
  doc: jsPDF,
  details: VisitDetails,
  cursor: PdfCursor,
) {
  drawSectionTitle(doc, cursor, 'Branch Performance', 'performance')

  if (details.performance.length === 0) {
    addEmptyStateParagraph(
      doc,
      cursor,
      'No achievement data available for this branch.',
    )
    return
  }

  autoTable(doc, {
    startY: cursor.y,
    margin: TABLE_MARGIN,
    tableWidth: CONTENT_WIDTH,
    rowPageBreak: 'auto',
    head: [['Brand', 'Target', 'Actual', 'Achievement %']],
    body: details.performance.map((row) => [
      row.brand,
      formatNumberWithSeparators(row.mtdTarget),
      formatNumberWithSeparators(row.actualSales),
      formatAchievementPercent(row.achievementPercent),
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: TABLE_CELL_PADDING,
      lineColor: COLORS.border,
      lineWidth: 0.15,
      textColor: COLORS.textBody,
      valign: 'middle',
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: COLORS.rowAlt,
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 3) {
        data.cell.text = ['']
      }
    },
    didDrawCell(data) {
      if (data.section !== 'body' || data.column.index !== 3) {
        return
      }

      const row = details.performance[data.row.index]
      if (!row) {
        return
      }

      const label = formatAchievementPercent(row.achievementPercent)
      const colors = getAchievementBadgePdfColors(row.achievementPercent)
      drawTableBadgeCell(
        data.doc,
        data.cell.x,
        data.cell.y,
        data.cell.width,
        data.cell.height,
        label,
        colors,
        getTableRowBackground(data.row.index, data.cell.styles.fillColor),
      )
    },
  })

  cursor.y = (doc.lastAutoTable?.finalY ?? cursor.y) + SECTION_GAP
}

function applyArabicMixedTextCell(data: CellHookData) {
  if (data.section !== 'body') {
    return
  }

  const text = String(data.cell.raw ?? '')

  if (!containsArabic(text)) {
    return
  }

  data.cell.styles.font = PDF_FONT_ARABIC
  data.cell.styles.halign = 'right'
}

function drawInspectionItems(
  doc: jsPDF,
  details: VisitDetails,
  cursor: PdfCursor,
) {
  drawSectionTitle(doc, cursor, 'Inspection Items', 'inspection')

  if (details.inspectionItems.length === 0) {
    addEmptyStateParagraph(doc, cursor, 'No inspection items reported.')
    return
  }

  const sortedItems = [...details.inspectionItems].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  )

  autoTable(doc, {
    startY: cursor.y,
    margin: TABLE_MARGIN,
    tableWidth: CONTENT_WIDTH,
    rowPageBreak: 'auto',
    head: [['Brand', 'Product Name', 'Status', 'Notes']],
    body: sortedItems.map((item) => [
      item.brand,
      preparePdfMixedText(item.productName),
      item.statusLabel,
      preparePdfMixedText(item.notes?.trim() || '—'),
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: TABLE_CELL_PADDING,
      lineColor: COLORS.border,
      lineWidth: 0.15,
      textColor: COLORS.textBody,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: COLORS.rowAlt,
    },
    columnStyles: {
      0: { cellWidth: INSPECTION_BRAND_WIDTH },
      1: { cellWidth: INSPECTION_PRODUCT_WIDTH },
      2: { cellWidth: INSPECTION_STATUS_WIDTH, halign: 'center' },
      3: { cellWidth: INSPECTION_NOTES_WIDTH },
    },
    didParseCell(data) {
      if (data.section === 'body' && [1, 3].includes(data.column.index)) {
        applyArabicMixedTextCell(data)
      }

      if (data.section === 'body' && data.column.index === 2) {
        data.cell.text = ['']
      }
    },
    didDrawCell(data) {
      if (data.section !== 'body' || data.column.index !== 2) {
        return
      }

      const item = sortedItems[data.row.index]
      if (!item) {
        return
      }

      const colors = getVisitProductStatusPdfColors(item.status)
      drawTableBadgeCell(
        data.doc,
        data.cell.x,
        data.cell.y,
        data.cell.width,
        data.cell.height,
        item.statusLabel,
        colors,
        getTableRowBackground(data.row.index, data.cell.styles.fillColor),
      )
    },
  })

  cursor.y = (doc.lastAutoTable?.finalY ?? cursor.y) + SECTION_GAP
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return null
    }

    const blob = await response.blob()

    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Unable to read photo data.'))
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function getImageFormat(dataUrl: string): 'JPEG' | 'PNG' {
  if (dataUrl.startsWith('data:image/png')) {
    return 'PNG'
  }

  return 'JPEG'
}

async function normalizeImageForPdf(
  dataUrl: string,
): Promise<{ dataUrl: string; format: 'JPEG' | 'PNG' }> {
  if (
    dataUrl.startsWith('data:image/jpeg') ||
    dataUrl.startsWith('data:image/jpg') ||
    dataUrl.startsWith('data:image/png')
  ) {
    return { dataUrl, format: getImageFormat(dataUrl) }
  }

  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')

      if (!context) {
        reject(new Error('Unable to prepare photo for PDF export.'))
        return
      }

      context.drawImage(image, 0, 0)
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        format: 'JPEG',
      })
    }
    image.onerror = () => reject(new Error('Unable to load visit photo.'))
    image.src = dataUrl
  })
}

async function drawVisitPhotos(
  doc: jsPDF,
  details: VisitDetails,
  cursor: PdfCursor,
) {
  drawSectionTitle(doc, cursor, 'Visit Photos', 'photos')

  if (details.photos.length === 0) {
    addEmptyStateParagraph(doc, cursor, 'No visit photos.')
    return
  }

  const sortedPhotos = [...details.photos].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  )

  const photoWidth =
    (CONTENT_WIDTH - PHOTO_GAP * (PHOTO_COLUMNS - 1)) / PHOTO_COLUMNS
  const frameWidthPx = Math.round(photoWidth * 11.811)
  const frameHeightPx = Math.round(PHOTO_FRAME_HEIGHT_MM * 11.811)
  let columnIndex = 0
  let rowStartY = cursor.y
  let rowMaxHeight = 0

  for (const photo of sortedPhotos) {
    const dataUrl = await loadImageDataUrl(photo.previewUrl)
    if (!dataUrl) {
      continue
    }

    const normalizedImage = await normalizeImageForPdf(dataUrl)
    const preparedPhoto = await prepareVisitPhotoForPdf(
      normalizedImage.dataUrl,
      frameWidthPx,
      frameHeightPx,
    )

    if (columnIndex === 0) {
      const remaining = PAGE_HEIGHT - FOOTER_RESERVED_HEIGHT - cursor.y
      if (remaining < PHOTO_FRAME_HEIGHT_MM + 4) {
        doc.addPage()
        cursor.y = MARGIN
      }
      rowStartY = cursor.y
      rowMaxHeight = 0
    }

    const x = MARGIN + columnIndex * (photoWidth + PHOTO_GAP)
    const y = rowStartY

    doc.addImage(
      preparedPhoto.dataUrl,
      preparedPhoto.format,
      x,
      y,
      photoWidth,
      PHOTO_FRAME_HEIGHT_MM,
    )

    rowMaxHeight = Math.max(rowMaxHeight, PHOTO_FRAME_HEIGHT_MM)

    if (columnIndex === PHOTO_COLUMNS - 1) {
      cursor.y = rowStartY + rowMaxHeight + PHOTO_GAP
      columnIndex = 0
    } else {
      columnIndex += 1
      cursor.y = rowStartY + rowMaxHeight
    }
  }

  if (columnIndex !== 0) {
    cursor.y = rowStartY + rowMaxHeight + PHOTO_GAP
  } else if (sortedPhotos.length > 0) {
    cursor.y += SECTION_GAP
  }
}

function drawGeneralNotes(
  doc: jsPDF,
  details: VisitDetails,
  cursor: PdfCursor,
) {
  const notesText = details.generalNotes?.trim() || 'No general notes.'
  const innerWidth = CONTENT_WIDTH - 10
  const cardPadding = 4
  const contentHeight = measurePdfMixedTextHeight(
    doc,
    notesText,
    innerWidth,
    10,
  )
  const cardHeight = Math.max(18, contentHeight + cardPadding * 2)
  const blockHeight = 9 + cardHeight + SECTION_GAP

  ensureSpace(doc, cursor, blockHeight)
  drawSectionTitle(doc, cursor, 'General Notes')
  drawAccentLeftCard(doc, MARGIN, cursor.y, CONTENT_WIDTH, cardHeight)

  doc.setTextColor(...COLORS.textBody)
  drawPdfMixedTextInBox(
    doc,
    notesText,
    MARGIN + cardPadding,
    cursor.y + cardPadding + 3,
    innerWidth,
    10,
  )

  cursor.y += cardHeight + SECTION_GAP
}

function drawFooters(doc: jsPDF, generatedAt: string) {
  const pageCount = doc.getNumberOfPages()
  const dividerY = PAGE_HEIGHT - FOOTER_RESERVED_HEIGHT + 2
  const footerY = PAGE_HEIGHT - 8

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    drawFooterDivider(doc, dividerY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.textMuted)
    doc.text(PDF_BRANDING.footerText, MARGIN, footerY - 3)
    doc.text(`Generated at: ${generatedAt}`, MARGIN, footerY + 1.5)
    doc.text(`Page ${page} of ${pageCount}`, PAGE_WIDTH - MARGIN, footerY - 3, {
      align: 'right',
    })
  }
}

export function getVisitPdfFilename(visitNumber: string): string {
  return `${visitNumber}.pdf`
}

export async function generateVisitPdf(details: VisitDetails): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  await registerPdfFonts(doc)
  installArabicTextRendering(doc)

  doc.setFillColor(...COLORS.white)
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F')

  const logoDataUrl = await loadPdfLogoDataUrl()
  const logoDimensions = await loadPdfLogoDimensions()
  const { width: logoWidth, height: logoHeight } = getPdfLogoRenderSize(
    logoDimensions.width,
    logoDimensions.height,
    20,
    36,
  )
  const cursor: PdfCursor = { y: MARGIN }
  const generatedAt = formatPdfDateTime(new Date().toISOString())

  drawHeader(doc, details, cursor, logoDataUrl, logoWidth, logoHeight)
  drawVisitInformation(doc, details, cursor)
  drawBranchPerformance(doc, details, cursor)
  drawInspectionItems(doc, details, cursor)
  await drawVisitPhotos(doc, details, cursor)
  drawGeneralNotes(doc, details, cursor)
  drawFooters(doc, generatedAt)

  return doc.output('blob')
}

export async function downloadVisitPdf(details: VisitDetails): Promise<void> {
  const blob = await generateVisitPdf(details)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = getVisitPdfFilename(details.visitNumber)
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function downloadVisitPdfById(visitId: string): Promise<void> {
  const details = await fetchVisitDetails(visitId)
  await downloadVisitPdf(details)
}

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number
    }
  }
}

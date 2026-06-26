import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import type { VisitDetails } from '@/types/visit-details'
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

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 14
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const FOOTER_RESERVED_HEIGHT = 18
const PHOTO_ROW_GAP = 4
const MAX_PHOTO_HEIGHT_MM = 55

type PdfCursor = {
  y: number
}

function getCreatedAt(details: VisitDetails): string {
  const createdEvent = details.timeline.find(
    (event) => event.eventType === 'created',
  )

  return createdEvent?.eventAt ?? details.visitDate
}

function getReportReferenceDate(details: VisitDetails): string {
  return details.submittedAt ?? details.visitDate
}

function ensureSpace(doc: jsPDF, cursor: PdfCursor, requiredHeight: number) {
  if (cursor.y + requiredHeight > PAGE_HEIGHT - FOOTER_RESERVED_HEIGHT) {
    doc.addPage()
    cursor.y = MARGIN
  }
}

function addSectionTitle(doc: jsPDF, cursor: PdfCursor, title: string) {
  ensureSpace(doc, cursor, 12)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(17, 24, 39)
  doc.text(title, MARGIN, cursor.y)
  cursor.y += 7
}

function addParagraph(doc: jsPDF, cursor: PdfCursor, text: string) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(55, 65, 81)
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH) as string[]
  ensureSpace(doc, cursor, lines.length * 5 + 2)
  doc.text(lines, MARGIN, cursor.y)
  cursor.y += lines.length * 5 + 4
}

function drawHeader(doc: jsPDF, details: VisitDetails, cursor: PdfCursor) {
  const referenceDate = getReportReferenceDate(details)

  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(MARGIN, cursor.y - 4, 18, 18, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text('LOGO', MARGIN + 9, cursor.y + 6, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text('Visit APP By Gimi', MARGIN + 24, cursor.y + 2)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(71, 85, 105)
  doc.text('Visit Report', MARGIN + 24, cursor.y + 9)

  const rightX = PAGE_WIDTH - MARGIN
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text(`Visit Number: ${details.visitNumber}`, rightX, cursor.y, {
    align: 'right',
  })
  doc.setFont('helvetica', 'normal')
  doc.text(`Visit Date: ${formatPdfDate(referenceDate)}`, rightX, cursor.y + 5, {
    align: 'right',
  })
  doc.text(`Visit Time: ${formatPdfTime(referenceDate)}`, rightX, cursor.y + 10, {
    align: 'right',
  })

  cursor.y += 22
  doc.setDrawColor(226, 232, 240)
  doc.line(MARGIN, cursor.y, PAGE_WIDTH - MARGIN, cursor.y)
  cursor.y += 8
}

function drawVisitInformation(
  doc: jsPDF,
  details: VisitDetails,
  cursor: PdfCursor,
) {
  addSectionTitle(doc, cursor, 'Visit Information')

  const statusLabel = resolveVisitBadgeDisplay({
    status: details.status,
    reviewDecision: details.reviewDecision,
  })

  autoTable(doc, {
    startY: cursor.y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 0 },
      textColor: [31, 41, 55],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 36, textColor: [75, 85, 99] },
      1: { cellWidth: 'auto' },
    },
    body: [
      ['Branch', details.branchName],
      ['Visitor', details.visitorName],
      ['Visit Status', statusLabel],
      ['Created At', formatPdfDateTime(getCreatedAt(details))],
    ],
  })

  cursor.y = (doc.lastAutoTable?.finalY ?? cursor.y) + 8
}

function drawBranchPerformance(
  doc: jsPDF,
  details: VisitDetails,
  cursor: PdfCursor,
) {
  addSectionTitle(doc, cursor, 'Branch Performance')

  if (details.performance.length === 0) {
    addParagraph(doc, cursor, 'No achievement data available for this branch.')
    return
  }

  autoTable(doc, {
    startY: cursor.y,
    margin: { left: MARGIN, right: MARGIN },
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
      cellPadding: 2.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      textColor: [31, 41, 55],
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [75, 85, 99],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell(data) {
      if (data.section !== 'body' || data.column.index !== 3) {
        return
      }

      const row = details.performance[data.row.index]
      if (!row) {
        return
      }

      const colors = getAchievementBadgePdfColors(row.achievementPercent)
      data.cell.styles.fillColor = colors.fill
      data.cell.styles.textColor = colors.text
      data.cell.styles.fontStyle = 'bold'
    },
  })

  cursor.y = (doc.lastAutoTable?.finalY ?? cursor.y) + 8
}

function drawInspectionItems(
  doc: jsPDF,
  details: VisitDetails,
  cursor: PdfCursor,
) {
  addSectionTitle(doc, cursor, 'Inspection Items')

  if (details.inspectionItems.length === 0) {
    addParagraph(doc, cursor, 'No inspection items reported.')
    return
  }

  const sortedItems = [...details.inspectionItems].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  )

  autoTable(doc, {
    startY: cursor.y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Brand', 'Product', 'Status', 'Notes']],
    body: sortedItems.map((item) => [
      item.brand,
      item.productName,
      item.statusLabel,
      item.notes?.trim() || '—',
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      textColor: [31, 41, 55],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [75, 85, 99],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 48 },
      2: { cellWidth: 24 },
      3: { cellWidth: 'auto' },
    },
    didParseCell(data) {
      if (data.section !== 'body' || data.column.index !== 2) {
        return
      }

      const item = sortedItems[data.row.index]
      if (!item) {
        return
      }

      const colors = getVisitProductStatusPdfColors(item.status)
      data.cell.styles.fillColor = colors.fill
      data.cell.styles.textColor = colors.text
      data.cell.styles.fontStyle = 'bold'
    },
  })

  cursor.y = (doc.lastAutoTable?.finalY ?? cursor.y) + 8
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

async function getImageDimensions(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
    }
    image.onerror = () => reject(new Error('Unable to load image dimensions.'))
    image.src = dataUrl
  })
}

async function drawVisitPhotos(
  doc: jsPDF,
  details: VisitDetails,
  cursor: PdfCursor,
) {
  addSectionTitle(doc, cursor, 'Visit Photos')

  if (details.photos.length === 0) {
    addParagraph(doc, cursor, 'No visit photos.')
    return
  }

  const sortedPhotos = [...details.photos].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  )

  const photoWidth = (CONTENT_WIDTH - PHOTO_ROW_GAP) / 2
  let columnIndex = 0
  let rowStartY = cursor.y
  let rowMaxHeight = 0

  for (const photo of sortedPhotos) {
    const dataUrl = await loadImageDataUrl(photo.previewUrl)
    if (!dataUrl) {
      continue
    }

    const normalizedImage = await normalizeImageForPdf(dataUrl)
    const dimensions = await getImageDimensions(normalizedImage.dataUrl)
    const aspectRatio = dimensions.width / dimensions.height
    let renderWidth = photoWidth
    let renderHeight = renderWidth / aspectRatio

    if (renderHeight > MAX_PHOTO_HEIGHT_MM) {
      renderHeight = MAX_PHOTO_HEIGHT_MM
      renderWidth = renderHeight * aspectRatio
    }

    if (columnIndex === 0) {
      ensureSpace(doc, cursor, renderHeight + 6)
      rowStartY = cursor.y
      rowMaxHeight = 0
    } else {
      ensureSpace(doc, cursor, rowMaxHeight + 6)
    }

    const x =
      columnIndex === 0 ? MARGIN : MARGIN + photoWidth + PHOTO_ROW_GAP
    const y = rowStartY

    doc.addImage(
      normalizedImage.dataUrl,
      normalizedImage.format,
      x,
      y,
      renderWidth,
      renderHeight,
    )

    rowMaxHeight = Math.max(rowMaxHeight, renderHeight)

    if (columnIndex === 1) {
      cursor.y = rowStartY + rowMaxHeight + PHOTO_ROW_GAP
      columnIndex = 0
    } else {
      columnIndex = 1
      cursor.y = rowStartY + rowMaxHeight
    }
  }

  if (columnIndex === 1) {
    cursor.y = rowStartY + rowMaxHeight + PHOTO_ROW_GAP
  } else {
    cursor.y += 4
  }
}

function drawGeneralNotes(doc: jsPDF, details: VisitDetails, cursor: PdfCursor) {
  addSectionTitle(doc, cursor, 'General Notes')
  addParagraph(
    doc,
    cursor,
    details.generalNotes?.trim() || 'No general notes.',
  )
}

function drawFooters(doc: jsPDF, generatedAt: string) {
  const pageCount = doc.getNumberOfPages()

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)

    const footerY = PAGE_HEIGHT - 10
    doc.text('Generated by Visit APP By Gimi', MARGIN, footerY - 4)
    doc.text(`Generated at: ${generatedAt}`, MARGIN, footerY)
    doc.text(`Page ${page} of ${pageCount}`, PAGE_WIDTH - MARGIN, footerY, {
      align: 'right',
    })
  }
}

export function getVisitPdfFilename(visitNumber: string): string {
  return `${visitNumber}.pdf`
}

export async function generateVisitPdf(details: VisitDetails): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const cursor: PdfCursor = { y: MARGIN }
  const generatedAt = formatPdfDateTime(new Date().toISOString())

  drawHeader(doc, details, cursor)
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

import * as XLSX from 'xlsx'

import {
  getMissingAchColumns,
  getMissingDisplayColumns,
  getMissingRankingColumns,
  mapAchHeaders,
  mapDisplayHeaders,
  mapRankingHeaders,
} from '@/lib/import/columns'
import type {
  ImportValidationError,
  ParsedAchSheet,
  ParsedDailyWorkbook,
  ParsedDisplaySheet,
  ParsedRankingSheet,
  ParsedSheetResult,
  RankingPayload,
  SalesAchievementPayload,
  StoreDisplayPayload,
} from '@/types/import'

export const DAILY_SHEET_NAMES = {
  display: 'Display',
  ach: 'ACH',
  ranking: 'Ranking',
} as const

function cellValue(row: unknown[], index: number): string {
  const value = row[index]
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

function parseNumber(value: string, fallback = 0): number {
  if (!value) {
    return fallback
  }

  const normalized = value.replace(/,/g, '').replace(/%/g, '').trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function parseInteger(value: string, fallback = 0): number {
  const parsed = parseNumber(value, fallback)
  if (Number.isNaN(parsed)) {
    return Number.NaN
  }

  return Math.trunc(parsed)
}

function readSheetRows(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  const sheet = workbook.Sheets[sheetName]

  if (!sheet) {
    return []
  }

  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })
}

export function findWorksheetByName(
  workbook: XLSX.WorkBook,
  expectedName: string,
): string | null {
  const normalizedExpected = expectedName.trim().toLowerCase()

  return (
    workbook.SheetNames.find(
      (sheetName) => sheetName.trim().toLowerCase() === normalizedExpected,
    ) ?? null
  )
}

function missingSheetResult<T>(): ParsedSheetResult<T> {
  return {
    sheetStatus: 'missing',
    data: null,
    errors: [],
  }
}

function parseDisplayRows(rows: unknown[][]): {
  data: ParsedDisplaySheet | null
  errors: ImportValidationError[]
} {
  const errors: ImportValidationError[] = []

  if (rows.length === 0) {
    return {
      data: null,
      errors: [
        {
          sheet: 'display',
          message: 'The Display worksheet is empty.',
        },
      ],
    }
  }

  const headers = (rows[0] ?? []).map((cell) => String(cell ?? '').trim())
  const missingColumns = getMissingDisplayColumns(headers)

  if (missingColumns.length > 0) {
    return {
      data: null,
      errors: missingColumns.map((column) => ({
        sheet: 'display',
        column,
        message: `Missing required column: ${column}`,
      })),
    }
  }

  const mapping = mapDisplayHeaders(headers)

  if (!mapping) {
    return {
      data: null,
      errors: [
        {
          sheet: 'display',
          message: 'Unable to map Display worksheet columns.',
        },
      ],
    }
  }

  const parsedRows: StoreDisplayPayload[] = []
  const budgetChannelsByStore: Record<string, string> = {}

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index] ?? []
    const storeName = cellValue(row, mapping['Store Name'])
    const brand = cellValue(row, mapping.Brand)
    const subCategory = cellValue(row, mapping['Sub Category'])
    const itemCode = cellValue(row, mapping['Item Code'])
    const productName = cellValue(row, mapping['Product Name'])
    const displayQtyRaw = cellValue(row, mapping['Display Qty'])

    if (
      !storeName &&
      !brand &&
      !subCategory &&
      !itemCode &&
      !productName &&
      !displayQtyRaw
    ) {
      continue
    }

    const excelRow = index + 1

    if (!storeName) {
      errors.push({
        sheet: 'display',
        row: excelRow,
        column: 'Store Name',
        message: 'Store Name is required.',
      })
    }

    if (!brand) {
      errors.push({
        sheet: 'display',
        row: excelRow,
        column: 'Brand',
        message: 'Brand is required.',
      })
    }

    if (!subCategory) {
      errors.push({
        sheet: 'display',
        row: excelRow,
        column: 'Sub Category',
        message: 'Sub Category is required.',
      })
    }

    if (!itemCode) {
      errors.push({
        sheet: 'display',
        row: excelRow,
        column: 'Item Code',
        message: 'Item Code is required.',
      })
    }

    if (!productName) {
      errors.push({
        sheet: 'display',
        row: excelRow,
        column: 'Product Name',
        message: 'Product Name is required.',
      })
    }

    const displayQty = parseInteger(displayQtyRaw, 0)
    if (Number.isNaN(displayQty) || displayQty < 0) {
      errors.push({
        sheet: 'display',
        row: excelRow,
        column: 'Display Qty',
        message: 'Display Qty must be a number greater than or equal to 0.',
      })
    }

    if (mapping['Budget Channel'] !== undefined) {
      const budgetChannel = cellValue(row, mapping['Budget Channel'])
      if (budgetChannel && storeName) {
        budgetChannelsByStore[storeName] = budgetChannel
      }
    }

    if (errors.some((error) => error.row === excelRow)) {
      continue
    }

    parsedRows.push({
      store_name: storeName,
      brand,
      sub_category: subCategory,
      item_code: itemCode,
      product_name: productName,
      display_qty: displayQty,
    })
  }

  if (parsedRows.length === 0 && errors.length === 0) {
    errors.push({
      sheet: 'display',
      message: 'No data rows were found in the Display worksheet.',
    })
  }

  return {
    data:
      errors.length === 0 ? { rows: parsedRows, budgetChannelsByStore } : null,
    errors,
  }
}

function parseAchRows(rows: unknown[][]): {
  data: ParsedAchSheet | null
  errors: ImportValidationError[]
} {
  const errors: ImportValidationError[] = []

  if (rows.length === 0) {
    return {
      data: null,
      errors: [
        {
          sheet: 'ach',
          message: 'The ACH worksheet is empty.',
        },
      ],
    }
  }

  const headers = (rows[0] ?? []).map((cell) => String(cell ?? '').trim())
  const missingColumns = getMissingAchColumns(headers)

  if (missingColumns.length > 0) {
    return {
      data: null,
      errors: missingColumns.map((column) => ({
        sheet: 'ach',
        column,
        message: `Missing required column: ${column}`,
      })),
    }
  }

  const mapping = mapAchHeaders(headers)

  if (!mapping) {
    return {
      data: null,
      errors: [
        {
          sheet: 'ach',
          message: 'Unable to map ACH worksheet columns.',
        },
      ],
    }
  }

  const parsedRows: SalesAchievementPayload[] = []

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index] ?? []
    const storeName = cellValue(row, mapping['Store Name'])
    const brand = cellValue(row, mapping.Brand)
    const mtdTargetRaw = cellValue(row, mapping['MTD Target'])
    const actualSalesRaw = cellValue(row, mapping['Actual Sales'])
    const achPercentRaw = cellValue(row, mapping['ACH Percent'])

    if (
      !storeName &&
      !brand &&
      !mtdTargetRaw &&
      !actualSalesRaw &&
      !achPercentRaw
    ) {
      continue
    }

    const excelRow = index + 1

    if (!storeName) {
      errors.push({
        sheet: 'ach',
        row: excelRow,
        column: 'Store Name',
        message: 'Store Name is required.',
      })
    }

    if (!brand) {
      errors.push({
        sheet: 'ach',
        row: excelRow,
        column: 'Brand',
        message: 'Brand is required.',
      })
    }

    const mtdTarget = parseNumber(mtdTargetRaw, 0)
    const actualSales = parseNumber(actualSalesRaw, 0)
    const achPercent = parseNumber(achPercentRaw, 0)

    if (Number.isNaN(mtdTarget) || mtdTarget < 0) {
      errors.push({
        sheet: 'ach',
        row: excelRow,
        column: 'MTD Target',
        message: 'MTD Target must be a number greater than or equal to 0.',
      })
    }

    if (Number.isNaN(actualSales) || actualSales < 0) {
      errors.push({
        sheet: 'ach',
        row: excelRow,
        column: 'Actual Sales',
        message: 'Actual Sales must be a number greater than or equal to 0.',
      })
    }

    if (Number.isNaN(achPercent)) {
      errors.push({
        sheet: 'ach',
        row: excelRow,
        column: 'ACH Percent',
        message: 'ACH Percent must be a valid number.',
      })
    }

    if (errors.some((error) => error.row === excelRow)) {
      continue
    }

    parsedRows.push({
      store_name: storeName,
      brand,
      mtd_target: mtdTarget,
      actual_sales: actualSales,
      ach_percent: achPercent,
    })
  }

  if (parsedRows.length === 0 && errors.length === 0) {
    errors.push({
      sheet: 'ach',
      message: 'No data rows were found in the ACH worksheet.',
    })
  }

  return {
    data: errors.length === 0 ? { rows: parsedRows } : null,
    errors,
  }
}

function parseRankingRows(rows: unknown[][]): {
  data: ParsedRankingSheet | null
  errors: ImportValidationError[]
} {
  const errors: ImportValidationError[] = []

  if (rows.length === 0) {
    return {
      data: null,
      errors: [
        {
          sheet: 'ranking',
          message: 'The Ranking worksheet is empty.',
        },
      ],
    }
  }

  const headers = (rows[0] ?? []).map((cell) => String(cell ?? '').trim())
  const missingColumns = getMissingRankingColumns(headers)

  if (missingColumns.length > 0) {
    return {
      data: null,
      errors: missingColumns.map((column) => ({
        sheet: 'ranking',
        column,
        message: `Missing required column: ${column}`,
      })),
    }
  }

  const mapping = mapRankingHeaders(headers)

  if (!mapping) {
    return {
      data: null,
      errors: [
        {
          sheet: 'ranking',
          message: 'Unable to map Ranking worksheet columns.',
        },
      ],
    }
  }

  const parsedRows: RankingPayload[] = []

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index] ?? []
    const storeName = cellValue(row, mapping.Store)
    const brand = cellValue(row, mapping.Brand)
    const category = cellValue(row, mapping.Category)
    const qtyRaw = cellValue(row, mapping.Qty)
    const salesRaw = cellValue(row, mapping.Sales)

    if (!storeName && !brand && !category && !qtyRaw && !salesRaw) {
      continue
    }

    const excelRow = index + 1

    if (!storeName) {
      errors.push({
        sheet: 'ranking',
        row: excelRow,
        column: 'Store',
        message: 'Store is required.',
      })
    }

    if (!brand) {
      errors.push({
        sheet: 'ranking',
        row: excelRow,
        column: 'Brand',
        message: 'Brand is required.',
      })
    }

    if (!category) {
      errors.push({
        sheet: 'ranking',
        row: excelRow,
        column: 'Category',
        message: 'Category is required.',
      })
    }

    const qty = parseInteger(qtyRaw, 0)
    const sales = parseNumber(salesRaw, 0)

    if (Number.isNaN(qty)) {
      errors.push({
        sheet: 'ranking',
        row: excelRow,
        column: 'Qty',
        message: 'Qty must be a valid number.',
      })
    }

    if (Number.isNaN(sales)) {
      errors.push({
        sheet: 'ranking',
        row: excelRow,
        column: 'Sales',
        message: 'Sales must be a valid number.',
      })
    }

    if (errors.some((error) => error.row === excelRow)) {
      continue
    }

    parsedRows.push({
      store_name: storeName,
      brand,
      category,
      qty,
      sales,
    })
  }

  if (parsedRows.length === 0 && errors.length === 0) {
    errors.push({
      sheet: 'ranking',
      message: 'No data rows were found in the Ranking worksheet.',
    })
  }

  return {
    data: errors.length === 0 ? { rows: parsedRows } : null,
    errors,
  }
}

function parseNamedSheet<T>(
  workbook: XLSX.WorkBook,
  sheetName: string,
  sheetKey: 'display' | 'ach' | 'ranking',
  parser: (rows: unknown[][]) => {
    data: T | null
    errors: ImportValidationError[]
  },
): ParsedSheetResult<T> {
  const resolvedSheetName = findWorksheetByName(workbook, sheetName)

  if (!resolvedSheetName) {
    return missingSheetResult<T>()
  }

  const parsed = parser(readSheetRows(workbook, resolvedSheetName))

  return {
    sheetStatus: 'found',
    data: parsed.data,
    errors: parsed.errors.map((error) => ({
      ...error,
      sheet: sheetKey,
    })),
  }
}

export function parseDailyWorkbook(buffer: ArrayBuffer): ParsedDailyWorkbook {
  const workbook = XLSX.read(buffer, { type: 'array' })

  return {
    display: parseNamedSheet(
      workbook,
      DAILY_SHEET_NAMES.display,
      'display',
      parseDisplayRows,
    ),
    ach: parseNamedSheet(workbook, DAILY_SHEET_NAMES.ach, 'ach', parseAchRows),
    ranking: parseNamedSheet(
      workbook,
      DAILY_SHEET_NAMES.ranking,
      'ranking',
      parseRankingRows,
    ),
  }
}

export function parseDisplayWorkbook(buffer: ArrayBuffer): {
  data: ParsedDisplaySheet | null
  errors: ImportValidationError[]
} {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]

  if (!sheetName) {
    return {
      data: null,
      errors: [
        {
          sheet: 'display',
          message: 'The Display Excel file is empty.',
        },
      ],
    }
  }

  return parseDisplayRows(readSheetRows(workbook, sheetName))
}

export function parseAchWorkbook(buffer: ArrayBuffer): {
  data: ParsedAchSheet | null
  errors: ImportValidationError[]
} {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]

  if (!sheetName) {
    return {
      data: null,
      errors: [
        {
          sheet: 'ach',
          message: 'The Sales Achievement Excel file is empty.',
        },
      ],
    }
  }

  return parseAchRows(readSheetRows(workbook, sheetName))
}

export function isAllowedExcelFile(
  file: File,
  allowedExtensions: string[],
): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return allowedExtensions.includes(extension)
}

export function isWithinSizeLimit(file: File, maxFileSizeMb: number): boolean {
  return file.size <= maxFileSizeMb * 1024 * 1024
}

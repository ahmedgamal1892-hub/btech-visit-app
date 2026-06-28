import { aggregateRankingRows } from '@/lib/import/aggregate-ranking-rows'
import type {
  ImportPreviewStats,
  ImportSheetSummary,
  ImportSheetSummaryStatus,
  ImportValidationError,
  ImportValidationResult,
  ParsedAchSheet,
  ParsedDailyWorkbook,
  ParsedDisplaySheet,
  ParsedRankingSheet,
  RankingPayload,
  SalesAchievementPayload,
  StoreDisplayPayload,
  StorePayload,
} from '@/types/import'

function sheetHasErrors(
  errors: ImportValidationError[],
  sheet: 'display' | 'ach' | 'ranking',
): boolean {
  return errors.some((error) => error.sheet === sheet)
}

function isSheetImportable<T>(
  result: { sheetStatus: 'found' | 'missing'; data: T | null; errors: ImportValidationError[] },
  sheet: 'display' | 'ach' | 'ranking',
): boolean {
  return (
    result.sheetStatus === 'found' &&
    result.data !== null &&
    !sheetHasErrors(result.errors, sheet)
  )
}

function buildStoresPayload(
  display: ParsedDisplaySheet | null,
  ach: ParsedAchSheet | null,
  ranking: ParsedRankingSheet | null,
): StorePayload[] {
  const stores = new Map<string, StorePayload>()
  const budgetChannelsByStore = display?.budgetChannelsByStore ?? {}

  for (const row of display?.rows ?? []) {
    if (!stores.has(row.store_name)) {
      stores.set(row.store_name, {
        name: row.store_name,
        budget_channel: budgetChannelsByStore[row.store_name] ?? null,
      })
    }
  }

  for (const row of ach?.rows ?? []) {
    if (!stores.has(row.store_name)) {
      stores.set(row.store_name, {
        name: row.store_name,
        budget_channel: budgetChannelsByStore[row.store_name] ?? null,
      })
    }
  }

  for (const row of ranking?.rows ?? []) {
    if (!stores.has(row.store_name)) {
      stores.set(row.store_name, {
        name: row.store_name,
        budget_channel: budgetChannelsByStore[row.store_name] ?? null,
      })
    }
  }

  return Array.from(stores.values())
}

function validateDuplicates(
  displayRows: StoreDisplayPayload[],
  achRows: SalesAchievementPayload[],
): ImportValidationError[] {
  const errors: ImportValidationError[] = []
  const displayKeys = new Set<string>()
  const achKeys = new Set<string>()

  displayRows.forEach((row, index) => {
    const key = `${row.store_name}::${row.item_code}`
    if (displayKeys.has(key)) {
      errors.push({
        sheet: 'display',
        row: index + 2,
        message: `Duplicate item "${row.item_code}" for store "${row.store_name}".`,
      })
    } else {
      displayKeys.add(key)
    }
  })

  achRows.forEach((row, index) => {
    const key = `${row.store_name}::${row.brand}`
    if (achKeys.has(key)) {
      errors.push({
        sheet: 'ach',
        row: index + 2,
        message: `Duplicate brand "${row.brand}" for store "${row.store_name}".`,
      })
    } else {
      achKeys.add(key)
    }
  })

  return errors
}

function validateStoreReferences(
  stores: StorePayload[],
  displayRows: StoreDisplayPayload[],
  achRows: SalesAchievementPayload[],
  rankingRows: RankingPayload[],
  importDisplay: boolean,
): ImportValidationError[] {
  const storeNames = new Set(stores.map((store) => store.name))
  const errors: ImportValidationError[] = []

  if (importDisplay) {
    achRows.forEach((row, index) => {
      if (!storeNames.has(row.store_name)) {
        errors.push({
          sheet: 'ach',
          row: index + 2,
          column: 'Store Name',
          message: `Store "${row.store_name}" is not present in the Display worksheet.`,
        })
      }
    })
  } else {
    achRows.forEach((row, index) => {
      if (!storeNames.has(row.store_name)) {
        errors.push({
          sheet: 'ach',
          row: index + 2,
          column: 'Store Name',
          message: `Store "${row.store_name}" could not be mapped.`,
        })
      }
    })
  }

  displayRows.forEach((row, index) => {
    if (!storeNames.has(row.store_name)) {
      errors.push({
        sheet: 'display',
        row: index + 2,
        column: 'Store Name',
        message: `Store "${row.store_name}" could not be mapped.`,
      })
    }
  })

  rankingRows.forEach((row, index) => {
    if (!storeNames.has(row.store_name)) {
      errors.push({
        sheet: 'ranking',
        row: index + 2,
        column: 'Store',
        message: `Store "${row.store_name}" could not be mapped.`,
      })
    }
  })

  return errors
}

function buildPreview(
  displayRows: StoreDisplayPayload[],
  achRows: SalesAchievementPayload[],
  rankingRows: RankingPayload[],
  stores: StorePayload[],
): ImportPreviewStats {
  const productCodes = new Set(displayRows.map((row) => row.item_code))

  return {
    displayRowCount: displayRows.length,
    achRowCount: achRows.length,
    rankingRowCount: rankingRows.length,
    storeCount: stores.length,
    productCount: productCodes.size,
  }
}

function countSheetErrors(
  errors: ImportValidationError[],
  sheet: 'display' | 'ach' | 'ranking',
): number {
  return errors.filter((error) => error.sheet === sheet).length
}

function buildSheetImportStatus(
  sheetResult: {
    sheetStatus: 'found' | 'missing'
    data: unknown
    errors: ImportValidationError[]
  },
  sheet: 'display' | 'ach' | 'ranking',
  imported: boolean,
  rowCount: number,
  allErrors: ImportValidationError[],
  importCompleted: boolean,
): ImportSheetSummaryStatus {
  if (imported) {
    return { state: 'imported', rowCount }
  }

  const validationErrorCount = countSheetErrors(allErrors, sheet)

  if (sheetResult.sheetStatus === 'found' && validationErrorCount > 0) {
    return { state: 'validation_errors', errorCount: validationErrorCount }
  }

  if (sheetResult.sheetStatus === 'missing') {
    return importCompleted ? { state: 'skipped' } : { state: 'not_found' }
  }

  return { state: 'not_found' }
}

function buildSheetSummary(
  parsed: ParsedDailyWorkbook,
  importFlags: {
    display: boolean
    ach: boolean
    ranking: boolean
  },
  displayRows: StoreDisplayPayload[],
  achRows: SalesAchievementPayload[],
  rankingRows: RankingPayload[],
  allErrors: ImportValidationError[],
  importCompleted: boolean,
): ImportSheetSummary {
  return {
    display: buildSheetImportStatus(
      parsed.display,
      'display',
      importFlags.display,
      displayRows.length,
      allErrors,
      importCompleted,
    ),
    ach: buildSheetImportStatus(
      parsed.ach,
      'ach',
      importFlags.ach,
      achRows.length,
      allErrors,
      importCompleted,
    ),
    ranking: buildSheetImportStatus(
      parsed.ranking,
      'ranking',
      importFlags.ranking,
      rankingRows.length,
      allErrors,
      importCompleted,
    ),
  }
}

export function validateDailyImportPayload(
  parsed: ParsedDailyWorkbook,
  fileErrors: ImportValidationError[] = [],
  importCompleted = false,
): ImportValidationResult {
  const errors = [
    ...fileErrors,
    ...parsed.display.errors,
    ...parsed.ach.errors,
    ...parsed.ranking.errors,
  ]

  const importFlags = {
    display: isSheetImportable(parsed.display, 'display'),
    ach: isSheetImportable(parsed.ach, 'ach'),
    ranking: isSheetImportable(parsed.ranking, 'ranking'),
  }

  const hasImportableSheet =
    importFlags.display || importFlags.ach || importFlags.ranking

  if (!hasImportableSheet) {
    if (
      parsed.display.sheetStatus === 'missing' &&
      parsed.ach.sheetStatus === 'missing' &&
      parsed.ranking.sheetStatus === 'missing'
    ) {
      errors.push({
        sheet: 'general',
        message:
          'No Display, ACH, or Ranking worksheets were found in the workbook.',
      })
    }

    return {
      isValid: false,
      errors,
      preview: null,
      stores: [],
      storeDisplay: [],
      salesAchievement: [],
      ranking: [],
      importFlags,
      sheetSummary: buildSheetSummary(
        parsed,
        importFlags,
        [],
        [],
        [],
        errors,
        importCompleted,
      ),
    }
  }

  const displayRows = importFlags.display ? (parsed.display.data?.rows ?? []) : []
  const achRows = importFlags.ach ? (parsed.ach.data?.rows ?? []) : []
  const rankingRows = importFlags.ranking
    ? aggregateRankingRows(parsed.ranking.data?.rows ?? [])
    : []

  const stores = buildStoresPayload(
    importFlags.display ? parsed.display.data : null,
    importFlags.ach ? parsed.ach.data : null,
    importFlags.ranking ? parsed.ranking.data : null,
  )

  errors.push(...validateDuplicates(displayRows, achRows))
  errors.push(
    ...validateStoreReferences(
      stores,
      displayRows,
      achRows,
      rankingRows,
      importFlags.display,
    ),
  )

  const blockingErrors = errors.filter((error) => {
    if (error.sheet === 'general') {
      return true
    }

    if (error.sheet === 'display') {
      return importFlags.display
    }

    if (error.sheet === 'ach') {
      return importFlags.ach
    }

    return importFlags.ranking
  })

  const isValid = blockingErrors.length === 0

  return {
    isValid,
    errors,
    preview: isValid
      ? buildPreview(displayRows, achRows, rankingRows, stores)
      : null,
    stores,
    storeDisplay: displayRows,
    salesAchievement: achRows,
    ranking: rankingRows,
    importFlags,
    sheetSummary: buildSheetSummary(
      parsed,
      importFlags,
      displayRows,
      achRows,
      rankingRows,
      errors,
      importCompleted,
    ),
  }
}

export function validateImportPayload(
  display: ParsedDisplaySheet | null,
  ach: ParsedAchSheet | null,
  fileErrors: ImportValidationError[] = [],
): ImportValidationResult {
  const parsed: ParsedDailyWorkbook = {
    display: {
      sheetStatus: display ? 'found' : 'missing',
      data: display,
      errors: fileErrors.filter((error) => error.sheet === 'display'),
    },
    ach: {
      sheetStatus: ach ? 'found' : 'missing',
      data: ach,
      errors: fileErrors.filter((error) => error.sheet === 'ach'),
    },
    ranking: missingSheetResult(),
  }

  if (!display && !fileErrors.some((error) => error.sheet === 'display')) {
    parsed.display.errors = [
      {
        sheet: 'display',
        message: 'Store Display Excel has not been validated yet.',
      },
    ]
  }

  if (!ach && !fileErrors.some((error) => error.sheet === 'ach')) {
    parsed.ach.errors = [
      {
        sheet: 'ach',
        message: 'Sales Achievement Excel has not been validated yet.',
      },
    ]
  }

  return validateDailyImportPayload(parsed, fileErrors)
}

function missingSheetResult<T>(): {
  sheetStatus: 'missing'
  data: T | null
  errors: ImportValidationError[]
} {
  return {
    sheetStatus: 'missing',
    data: null,
    errors: [],
  }
}

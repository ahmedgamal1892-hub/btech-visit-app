import type {
  ImportPreviewStats,
  ImportValidationError,
  ImportValidationResult,
  ParsedAchSheet,
  ParsedDisplaySheet,
  SalesAchievementPayload,
  StoreDisplayPayload,
  StorePayload,
} from '@/types/import'

function buildStoresPayload(
  display: ParsedDisplaySheet,
  ach: ParsedAchSheet,
): StorePayload[] {
  const stores = new Map<string, StorePayload>()

  for (const row of display.rows) {
    if (!stores.has(row.store_name)) {
      stores.set(row.store_name, {
        name: row.store_name,
        budget_channel: display.budgetChannelsByStore[row.store_name] ?? null,
      })
    }
  }

  for (const row of ach.rows) {
    if (!stores.has(row.store_name)) {
      stores.set(row.store_name, {
        name: row.store_name,
        budget_channel: display.budgetChannelsByStore[row.store_name] ?? null,
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
): ImportValidationError[] {
  const storeNames = new Set(stores.map((store) => store.name))
  const errors: ImportValidationError[] = []

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

  return errors
}

function buildPreview(
  displayRows: StoreDisplayPayload[],
  achRows: SalesAchievementPayload[],
  stores: StorePayload[],
): ImportPreviewStats {
  const productCodes = new Set(displayRows.map((row) => row.item_code))

  return {
    displayRowCount: displayRows.length,
    achRowCount: achRows.length,
    storeCount: stores.length,
    productCount: productCodes.size,
  }
}

export function validateImportPayload(
  display: ParsedDisplaySheet | null,
  ach: ParsedAchSheet | null,
  fileErrors: ImportValidationError[] = [],
): ImportValidationResult {
  const errors = [...fileErrors]

  if (!display && !errors.some((error) => error.sheet === 'display')) {
    errors.push({
      sheet: 'general',
      message: 'Store Display Excel has not been validated yet.',
    })
  }

  if (!ach && !errors.some((error) => error.sheet === 'ach')) {
    errors.push({
      sheet: 'general',
      message: 'Sales Achievement Excel has not been validated yet.',
    })
  }

  if (!display || !ach) {
    return {
      isValid: false,
      errors,
      preview: null,
      stores: [],
      storeDisplay: [],
      salesAchievement: [],
    }
  }

  const stores = buildStoresPayload(display, ach)
  errors.push(...validateDuplicates(display.rows, ach.rows))
  errors.push(...validateStoreReferences(stores, display.rows, ach.rows))

  const isValid = errors.length === 0

  return {
    isValid,
    errors,
    preview: isValid ? buildPreview(display.rows, ach.rows, stores) : null,
    stores,
    storeDisplay: display.rows,
    salesAchievement: ach.rows,
  }
}

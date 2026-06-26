export const DISPLAY_REQUIRED_COLUMNS = [
  'Store Name',
  'Brand',
  'Sub Category',
  'Item Code',
  'Product Name',
  'Display Qty',
] as const

export const DISPLAY_OPTIONAL_COLUMNS = ['Budget Channel'] as const

export const ACH_REQUIRED_COLUMNS = [
  'Store Name',
  'Brand',
  'MTD Target',
  'Actual Sales',
  'ACH Percent',
] as const

const DISPLAY_ALIASES: Record<string, string[]> = {
  'Store Name': ['store name', 'storename', 'store'],
  Brand: ['brand'],
  'Sub Category': ['sub category', 'subcategory', 'sub cat', 'subcat'],
  'Item Code': ['item code', 'itemcode', 'sku', 'code'],
  'Product Name': ['product name', 'productname', 'product'],
  'Display Qty': ['display qty', 'displayqty', 'qty', 'quantity'],
  'Budget Channel': ['budget channel', 'budgetchannel', 'channel'],
}

const ACH_ALIASES: Record<string, string[]> = {
  'Store Name': ['store name', 'storename', 'store'],
  Brand: ['brand'],
  'MTD Target': ['mtd target', 'mtdtarget', 'target'],
  'Actual Sales': ['actual sales', 'actualsales', 'sales'],
  'ACH Percent': [
    'ach percent',
    'achpercent',
    'ach %',
    'ach%',
    'achievement',
    'achievement %',
  ],
}

export function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
}

function matchesAlias(header: string, aliases: string[]): boolean {
  const normalized = normalizeHeader(header)
  return aliases.some(
    (alias) =>
      normalized === alias ||
      normalized.replace(/\s/g, '') === alias.replace(/\s/g, ''),
  )
}

export function mapDisplayHeaders(
  headers: string[],
): Record<string, number> | null {
  const mapping: Record<string, number> = {}

  for (const required of DISPLAY_REQUIRED_COLUMNS) {
    const index = headers.findIndex((header) =>
      matchesAlias(header, DISPLAY_ALIASES[required]),
    )

    if (index === -1) {
      return null
    }

    mapping[required] = index
  }

  for (const optional of DISPLAY_OPTIONAL_COLUMNS) {
    const index = headers.findIndex((header) =>
      matchesAlias(header, DISPLAY_ALIASES[optional]),
    )

    if (index !== -1) {
      mapping[optional] = index
    }
  }

  return mapping
}

export function mapAchHeaders(
  headers: string[],
): Record<string, number> | null {
  const mapping: Record<string, number> = {}

  for (const required of ACH_REQUIRED_COLUMNS) {
    const index = headers.findIndex((header) =>
      matchesAlias(header, ACH_ALIASES[required]),
    )

    if (index === -1) {
      return null
    }

    mapping[required] = index
  }

  return mapping
}

export function getMissingDisplayColumns(headers: string[]): string[] {
  return DISPLAY_REQUIRED_COLUMNS.filter((column) => {
    const index = headers.findIndex((header) =>
      matchesAlias(header, DISPLAY_ALIASES[column]),
    )
    return index === -1
  })
}

export function getMissingAchColumns(headers: string[]): string[] {
  return ACH_REQUIRED_COLUMNS.filter((column) => {
    const index = headers.findIndex((header) =>
      matchesAlias(header, ACH_ALIASES[column]),
    )
    return index === -1
  })
}

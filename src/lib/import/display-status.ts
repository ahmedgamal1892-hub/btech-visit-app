export const DISPLAY_FILE_STATUSES = ['Display', 'Delisted', 'Dead'] as const

export type DisplayFileStatus = (typeof DISPLAY_FILE_STATUSES)[number]

export function normalizeDisplayFileStatus(
  value: string,
): DisplayFileStatus | null {
  const normalized = value.trim().toLowerCase()

  if (normalized === 'display') {
    return 'Display'
  }

  if (normalized === 'delisted') {
    return 'Delisted'
  }

  if (normalized === 'dead') {
    return 'Dead'
  }

  return null
}

export function shouldAutoAddDisplayStatus(
  status: DisplayFileStatus | null | undefined,
): boolean {
  return status === 'Delisted' || status === 'Dead'
}

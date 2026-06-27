export function getTodayDateInputValue(referenceDate = new Date()): string {
  const year = referenceDate.getFullYear()
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0')
  const day = String(referenceDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function visitDateInputToStartedAt(dateValue: string): string {
  const [year, month, day] = dateValue.split('-').map(Number)

  if (!year || !month || !day) {
    return new Date().toISOString()
  }

  const date = new Date(year, month - 1, day, 12, 0, 0, 0)
  return date.toISOString()
}

export function startedAtToVisitDateInput(startedAt: string): string {
  const date = new Date(startedAt)

  if (Number.isNaN(date.getTime())) {
    return getTodayDateInputValue()
  }

  return getTodayDateInputValue(date)
}

export function isVisitDateAllowed(dateValue: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return false
  }

  return dateValue <= getTodayDateInputValue()
}

export function formatVisitDateInputLabel(dateValue: string): string {
  const startedAt = visitDateInputToStartedAt(dateValue)
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
  }).format(new Date(startedAt))
}

export function capitalize(value: string): string {
  if (!value) {
    return value
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

const numberFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatNumberWithSeparators(value: number): string {
  return numberFormatter.format(value)
}

export function formatAchievementPercent(value: number): string {
  return `${percentFormatter.format(value)}%`
}

export function formatPdfDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export function formatPdfTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatPdfDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

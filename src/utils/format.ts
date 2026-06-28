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

function formatCompactMagnitude(
  absValue: number,
  divisor: number,
  suffix: string,
): string {
  const scaled = absValue / divisor
  return `${scaled.toFixed(1).replace(/\.0$/, '')}${suffix}`
}

export function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (absValue >= 1_000_000_000) {
    return `${sign}${formatCompactMagnitude(absValue, 1_000_000_000, 'B')}`
  }

  if (absValue >= 1_000_000) {
    return `${sign}${formatCompactMagnitude(absValue, 1_000_000, 'M')}`
  }

  if (absValue >= 1_000) {
    return `${sign}${formatCompactMagnitude(absValue, 1_000, 'K')}`
  }

  return formatNumberWithSeparators(value)
}

export const formatCurrencyCompact = formatCompactNumber

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

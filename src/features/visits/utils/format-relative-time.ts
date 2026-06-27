export function formatRelativeTime(from: Date, to: Date = new Date()): string {
  const diffMs = to.getTime() - from.getTime()

  if (diffMs < 0) {
    return 'just now'
  }

  const seconds = Math.floor(diffMs / 1000)

  if (seconds < 45) {
    return 'just now'
  }

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }

  const days = Math.floor(hours / 24)

  return days === 1 ? '1 day ago' : `${days} days ago`
}

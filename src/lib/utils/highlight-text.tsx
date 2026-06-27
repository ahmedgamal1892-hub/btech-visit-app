import type { ReactNode } from 'react'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function highlightMatch(text: string, query: string): ReactNode {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return text
  }

  const regex = new RegExp(`(${escapeRegExp(trimmedQuery)})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, index) =>
    part.toLowerCase() === trimmedQuery.toLowerCase() ? (
      <mark
        key={`${part}-${index}`}
        className="rounded-sm bg-primary/20 px-0.5 text-foreground"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import type { NewVisitSectionId } from '@/lib/validations/new-visit'
import { getNewVisitSectionElementId } from '@/lib/validations/new-visit'
import { cn } from '@/lib/utils'

type NewVisitCollapsibleSectionProps = {
  sectionId: NewVisitSectionId
  title: string
  description?: string
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}

export function NewVisitCollapsibleSection({
  sectionId,
  title,
  description,
  expanded,
  onToggle,
  children,
}: NewVisitCollapsibleSectionProps) {
  return (
    <section
      id={getNewVisitSectionElementId(sectionId)}
      className="scroll-mt-24 w-full min-w-0 rounded-2xl border border-border/70 bg-card shadow-sm"
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 px-6 py-4',
          expanded && 'border-b border-border/70',
        )}
      >
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <button
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`${getNewVisitSectionElementId(sectionId)}-content`}
          aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
        >
          {expanded ? (
            <ChevronDown className="size-4" aria-hidden />
          ) : (
            <ChevronRight className="size-4" aria-hidden />
          )}
        </button>
      </div>
      {expanded ? (
        <div
          id={`${getNewVisitSectionElementId(sectionId)}-content`}
          className="px-6 py-5"
        >
          {description ? (
            <p className="mb-4 text-sm text-muted-foreground">{description}</p>
          ) : null}
          {children}
        </div>
      ) : null}
    </section>
  )
}

import { cn } from '@/lib/utils'

import { REPORT_SECTIONS } from '../constants'
import type { ReportSectionId } from '../types/reports.types'

type ReportsSectionNavProps = {
  activeSection: ReportSectionId
  onChange: (section: ReportSectionId) => void
}

export function ReportsSectionNav({
  activeSection,
  onChange,
}: ReportsSectionNavProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {REPORT_SECTIONS.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onChange(section.id)}
          className={cn(
            'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
            activeSection === section.id
              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
              : 'border-border/80 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
          )}
        >
          {section.label}
        </button>
      ))}
    </div>
  )
}

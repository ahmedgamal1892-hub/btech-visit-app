import type { NewVisitValidationIssue } from '@/lib/validations/new-visit'
import { scrollToNewVisitSection } from '@/lib/validations/new-visit'

type NewVisitValidationSummaryProps = {
  issues: NewVisitValidationIssue[]
  actionMessage?: string | null
}

export function NewVisitValidationSummary({
  issues,
  actionMessage,
}: NewVisitValidationSummaryProps) {
  if (issues.length === 0 && !actionMessage) {
    return null
  }

  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950"
      role="alert"
    >
      <p className="font-medium">Please complete the following:</p>
      <ul className="mt-3 space-y-2">
        {actionMessage ? (
          <li>
            <button
              type="button"
              className="text-left underline-offset-4 hover:underline"
              onClick={() => scrollToNewVisitSection('submit')}
            >
              {actionMessage}
            </button>
          </li>
        ) : null}
        {issues.map((issue) => (
          <li key={`${issue.sectionId}-${issue.message}`}>
            <button
              type="button"
              className="text-left underline-offset-4 hover:underline"
              onClick={() => scrollToNewVisitSection(issue.sectionId)}
            >
              {issue.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

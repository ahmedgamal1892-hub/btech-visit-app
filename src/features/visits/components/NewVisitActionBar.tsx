import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getNewVisitSectionElementId } from '@/lib/validations/new-visit'

type NewVisitActionBarProps = {
  onSubmit: () => void
  isSubmitting: boolean
}

export function NewVisitActionBar({
  onSubmit,
  isSubmitting,
}: NewVisitActionBarProps) {
  return (
    <div
      id={getNewVisitSectionElementId('submit')}
      className="sticky bottom-0 z-20 w-full scroll-mt-24 border-t border-border/70 bg-background/95 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="flex w-full items-center justify-end gap-3">
        <Button type="button" variant="outline" disabled title="Coming Soon">
          Save Draft
        </Button>
        <Button type="button" disabled={isSubmitting} onClick={onSubmit}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Visit'
          )}
        </Button>
      </div>
    </div>
  )
}

import { Clock3, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  DangerButton,
  PrimaryButton,
  SecondaryButton,
} from '@/components/ui/action-buttons'
import { formatRelativeTime } from '@/features/visits/utils/format-relative-time'
import { getNewVisitSectionElementId } from '@/lib/validations/new-visit'

type NewVisitActionBarProps = {
  onSaveDraft: () => void
  onSubmit: () => void
  onCancel: () => void
  isSubmitting: boolean
  isSavingDraft: boolean
  canSaveDraft: boolean
  lastSavedAt: Date | null
}

export function NewVisitActionBar({
  onSaveDraft,
  onSubmit,
  onCancel,
  isSubmitting,
  isSavingDraft,
  canSaveDraft,
  lastSavedAt,
}: NewVisitActionBarProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!lastSavedAt) {
      return
    }

    const intervalId = window.setInterval(() => {
      setTick((value) => value + 1)
    }, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [lastSavedAt])

  const isBusy = isSubmitting || isSavingDraft

  return (
    <div
      id={getNewVisitSectionElementId('submit')}
      className="sticky bottom-0 z-20 w-full scroll-mt-24 border-t border-border/70 bg-background/95 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="size-4 shrink-0" />
          {lastSavedAt ? (
            <span>
              Last saved{' '}
              <span className="font-medium text-foreground">
                {formatRelativeTime(lastSavedAt)}
              </span>
            </span>
          ) : (
            <span>
              Auto-save runs every 30 seconds once a branch is selected.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <DangerButton
            type="button"
            className="rounded-full"
            disabled={isBusy}
            onClick={onCancel}
          >
            Cancel
          </DangerButton>
          <SecondaryButton
            type="button"
            className="rounded-full"
            disabled={!canSaveDraft || isBusy}
            onClick={onSaveDraft}
          >
            {isSavingDraft ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Draft'
            )}
          </SecondaryButton>
          <PrimaryButton
            type="button"
            className="rounded-full"
            disabled={isBusy}
            onClick={onSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Visit'
            )}
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

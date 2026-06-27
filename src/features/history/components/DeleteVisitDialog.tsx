import { Loader2 } from 'lucide-react'

import { DangerButton, SecondaryButton } from '@/components/ui/action-buttons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export type DeleteVisitTarget = {
  visitId: string
  visitNumber: string | null
  branchName: string
}

type DeleteVisitDialogProps = {
  visit: DeleteVisitTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isSubmitting: boolean
}

function formatVisitLabel(visitNumber: string | null): string {
  return visitNumber ?? 'Draft visit'
}

export function DeleteVisitDialog({
  visit,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: DeleteVisitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete Visit</DialogTitle>
          <DialogDescription>
            This permanently deletes{' '}
            <span className="font-medium">
              {formatVisitLabel(visit?.visitNumber ?? null)}
            </span>{' '}
            at <span className="font-medium">{visit?.branchName}</span>,
            including inspection items, photos, and any related follow-up
            visits. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <SecondaryButton
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </SecondaryButton>
          <DangerButton
            type="button"
            disabled={isSubmitting}
            onClick={() => void onConfirm()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Visit'
            )}
          </DangerButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

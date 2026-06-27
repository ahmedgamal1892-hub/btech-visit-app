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
import type { EnterpriseUserRow } from '@/features/users/types/user-directory.types'

type DeactivateUserDialogProps = {
  user: EnterpriseUserRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isSubmitting: boolean
}

export function DeactivateUserDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: DeactivateUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Deactivate User</DialogTitle>
          <DialogDescription>
            Deactivating{' '}
            <span className="font-medium">
              {user?.full_name || user?.username}
            </span>{' '}
            will prevent them from signing in. You can reactivate the account at
            any time.
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
                Deactivating...
              </>
            ) : (
              'Deactivate User'
            )}
          </DangerButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

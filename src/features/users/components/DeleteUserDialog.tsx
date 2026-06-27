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
import type { UserProfile } from '@/types/user'

type DeleteUserDialogProps = {
  user: UserProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isSubmitting: boolean
}

export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: DeleteUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            This permanently removes{' '}
            <span className="font-medium">{user?.username}</span> from Supabase
            Auth and deletes their profile. Historical visits will remain and
            appear under &quot;Deleted User&quot;. This action cannot be undone.
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
              'Delete User'
            )}
          </DangerButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

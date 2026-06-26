import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  updateUserSchema,
  type UpdateUserFormValues,
} from '@/lib/validations/users'
import type { UserProfile } from '@/types/user'

type EditUserDialogProps = {
  user: UserProfile | null
  currentUserId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: UpdateUserFormValues) => Promise<void>
  isSubmitting: boolean
}

export function EditUserDialog({
  user,
  currentUserId,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: EditUserDialogProps) {
  const isEditingSelf = Boolean(
    user && currentUserId && user.id === currentUserId,
  )

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      role: 'Visitor',
      isActive: true,
    },
  })

  const isActive = useWatch({ control, name: 'isActive' })

  useEffect(() => {
    if (user && open) {
      reset({
        fullName: user.full_name,
        phone: user.phone ?? '',
        role: user.role,
        isActive: user.is_active,
      })
    }
  }, [user, open, reset])

  const submit = handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update profile details for{' '}
            <span className="font-medium">{user?.username}</span>.
            {isEditingSelf && (
              <span className="mt-2 block text-amber-700">
                You are editing your own account. Role and active status cannot
                be changed here.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="edit-full-name">Full Name</Label>
            <Input id="edit-full-name" {...register('fullName')} />
            {errors.fullName && (
              <p className="text-sm text-destructive">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-username">Username</Label>
            <Input id="edit-username" value={user?.username ?? ''} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input id="edit-phone" type="tel" {...register('phone')} />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <Select
              id="edit-role"
              disabled={isEditingSelf}
              {...register('role')}
            >
              <option value="Visitor">Visitor</option>
              <option value="Admin">Admin</option>
            </Select>
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-3">
            <Checkbox
              id="edit-is-active"
              checked={isActive}
              disabled={isEditingSelf}
              onCheckedChange={(checked) =>
                setValue('isActive', checked === true)
              }
            />
            <div>
              <Label htmlFor="edit-is-active">Active</Label>
              <p className="text-sm text-muted-foreground">
                Deactivated users cannot sign in.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

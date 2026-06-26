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
import { USER_AUTH_EMAIL_DOMAIN } from '@/services/users'
import {
  createUserSchema,
  type CreateUserFormValues,
} from '@/lib/validations/users'

type AddUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CreateUserFormValues) => Promise<void>
  isSubmitting: boolean
}

export function AddUserDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: AddUserDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      fullName: '',
      username: '',
      password: '',
      phone: '',
      role: 'Visitor',
      isActive: true,
    },
  })

  const isActive = useWatch({ control, name: 'isActive' })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const submit = handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            Create a Supabase Auth account and profile. Users sign in as{' '}
            <span className="font-medium">
              username@{USER_AUTH_EMAIL_DOMAIN}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="add-full-name">Full Name</Label>
            <Input id="add-full-name" {...register('fullName')} />
            {errors.fullName && (
              <p className="text-sm text-destructive">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-username">Username</Label>
            <Input
              id="add-username"
              autoComplete="off"
              {...register('username')}
            />
            {errors.username && (
              <p className="text-sm text-destructive">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-password">Password</Label>
            <Input
              id="add-password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-phone">Phone</Label>
            <Input id="add-phone" type="tel" {...register('phone')} />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-role">Role</Label>
            <Select id="add-role" {...register('role')}>
              <option value="Visitor">Visitor</option>
              <option value="Admin">Admin</option>
            </Select>
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-3">
            <Checkbox
              id="add-is-active"
              checked={isActive}
              onCheckedChange={(checked) =>
                setValue('isActive', checked === true)
              }
            />
            <div>
              <Label htmlFor="add-is-active">Active</Label>
              <p className="text-sm text-muted-foreground">
                Inactive users cannot sign in.
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
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

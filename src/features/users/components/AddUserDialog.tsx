import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { FormField } from '@/components/common'
import { PrimaryButton, SecondaryButton } from '@/components/ui/action-buttons'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogBody,
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

        <form className="space-y-5" onSubmit={submit} noValidate>
          <DialogBody>
            <FormField
              label="Full Name"
              htmlFor="add-full-name"
              error={errors.fullName?.message}
              required
            >
              <Input id="add-full-name" {...register('fullName')} />
            </FormField>

            <FormField
              label="Username"
              htmlFor="add-username"
              error={errors.username?.message}
              required
            >
              <Input
                id="add-username"
                autoComplete="off"
                {...register('username')}
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="add-password"
              error={errors.password?.message}
              required
            >
              <Input
                id="add-password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
              />
            </FormField>

            <FormField
              label="Phone"
              htmlFor="add-phone"
              error={errors.phone?.message}
            >
              <Input id="add-phone" type="tel" {...register('phone')} />
            </FormField>

            <FormField
              label="Role"
              htmlFor="add-role"
              error={errors.role?.message}
              required
            >
              <Select id="add-role" {...register('role')}>
                <option value="Visitor">Visitor</option>
                <option value="Admin">Admin</option>
              </Select>
            </FormField>

            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
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
          </DialogBody>

          <DialogFooter>
            <SecondaryButton
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

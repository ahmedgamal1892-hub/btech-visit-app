import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { FormField } from '@/components/common'
import { PrimaryButton, SecondaryButton } from '@/components/ui/action-buttons'
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
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/lib/validations/users'
import type { UserProfile } from '@/types/user'
import { cn } from '@/lib/utils'

type ResetPasswordDialogProps = {
  user: UserProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ResetPasswordFormValues) => Promise<void>
  onSendResetEmail: () => Promise<void>
  isSubmitting: boolean
  isSendingEmail: boolean
}

export function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
  onSendResetEmail,
  isSubmitting,
  isSendingEmail,
}: ResetPasswordDialogProps) {
  const [mode, setMode] = useState<'set' | 'email'>('set')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const submit = handleSubmit(async (values) => {
    await onSubmit(values)
  })

  const isBusy = isSubmitting || isSendingEmail

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setMode('set')
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Choose how to reset the password for{' '}
            <span className="font-medium">{user?.username}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 rounded-xl bg-muted/40 p-1">
          <SecondaryButton
            type="button"
            size="sm"
            className={cn(
              'flex-1 shadow-none',
              mode === 'set' && 'bg-background text-foreground shadow-sm',
            )}
            onClick={() => setMode('set')}
            disabled={isBusy}
          >
            Set Password
          </SecondaryButton>
          <SecondaryButton
            type="button"
            size="sm"
            className={cn(
              'flex-1 shadow-none',
              mode === 'email' && 'bg-background text-foreground shadow-sm',
            )}
            onClick={() => setMode('email')}
            disabled={isBusy}
          >
            Send Reset Email
          </SecondaryButton>
        </div>

        {mode === 'set' ? (
          <form className="space-y-5" onSubmit={submit} noValidate>
            <DialogBody>
              <FormField
                label="New Password"
                htmlFor="reset-password"
                error={errors.password?.message}
                required
              >
                <Input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.password)}
                  {...register('password')}
                />
              </FormField>

              <FormField
                label="Confirm Password"
                htmlFor="reset-confirm-password"
                error={errors.confirmPassword?.message}
                required
              >
                <Input
                  id="reset-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  {...register('confirmPassword')}
                />
              </FormField>
            </DialogBody>

            <DialogFooter>
              <SecondaryButton
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isBusy}
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={isBusy}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </PrimaryButton>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Supabase will email a password reset link to this user&apos;s
              registered address.
            </p>

            <DialogFooter>
              <SecondaryButton
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isBusy}
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton
                type="button"
                disabled={isBusy}
                onClick={() => void onSendResetEmail()}
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="size-4" />
                    Send Reset Email
                  </>
                )}
              </PrimaryButton>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

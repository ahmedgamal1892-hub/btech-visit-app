import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth, useSupabaseConnection } from '@/hooks'
import { APP_NAME } from '@/lib/constants'
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const {
    isChecking,
    isConnected,
    errorMessage: connectionError,
  } = useSupabaseConnection()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage(null)

    if (!isConnected) {
      setErrorMessage(
        connectionError ??
          'Supabase is not connected. Check your .env configuration and restart the dev server.',
      )
      return
    }

    const result = await signIn(values.username, values.password)

    if (!result.success) {
      setErrorMessage(result.message)
      return
    }

    void navigate('/dashboard', { replace: true })
  })

  const isFormDisabled = isChecking || !isConnected || isSubmitting

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <span className="text-lg font-bold">BT</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {APP_NAME}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to access your workspace
          </p>
        </div>

        {isChecking && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Connecting to Supabase...
          </div>
        )}

        {!isChecking && !isConnected && connectionError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            <p className="font-medium">Supabase connection failed</p>
            <p className="mt-1">{connectionError}</p>
          </div>
        )}

        {!isChecking && isConnected && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-800">
            Connected to Supabase
          </div>
        )}

        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your username and password. Usernames sign in as{' '}
              <span className="font-medium">username@btech.local</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your username"
                  disabled={isFormDisabled}
                  aria-invalid={Boolean(errors.username)}
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={isFormDisabled}
                  aria-invalid={Boolean(errors.password)}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  {errorMessage}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={isFormDisabled}
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { AppBrand } from '@/components/branding'
import { AlertBanner, FormField, LoadingIndicator } from '@/components/common'
import { PrimaryButton } from '@/components/ui/action-buttons'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth, useSupabaseConnection } from '@/hooks'
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
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-6 text-center">
          <AppBrand centered showTagline />
          <div className="space-y-2">
            <h1 className="page-title">Welcome back</h1>
            <p className="page-description">
              Sign in to access your visit management workspace
            </p>
          </div>
        </div>

        {isChecking ? (
          <LoadingIndicator message="Connecting to Supabase..." centered />
        ) : null}

        {!isChecking && !isConnected && connectionError ? (
          <AlertBanner variant="error" title="Supabase connection failed">
            {connectionError}
          </AlertBanner>
        ) : null}

        {!isChecking && isConnected ? (
          <AlertBanner variant="success">Connected to Supabase</AlertBanner>
        ) : null}

        <Card className="shadow-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>
              Enter your username and password. Usernames sign in as{' '}
              <span className="font-medium text-foreground">
                username@btech.local
              </span>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={onSubmit} noValidate>
              <FormField
                label="Username"
                htmlFor="username"
                error={errors.username?.message}
                required
              >
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your username"
                  disabled={isFormDisabled}
                  aria-invalid={Boolean(errors.username)}
                  {...register('username')}
                />
              </FormField>

              <FormField
                label="Password"
                htmlFor="password"
                error={errors.password?.message}
                required
              >
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={isFormDisabled}
                  aria-invalid={Boolean(errors.password)}
                  {...register('password')}
                />
              </FormField>

              {errorMessage ? (
                <AlertBanner variant="error">{errorMessage}</AlertBanner>
              ) : null}

              <PrimaryButton
                type="submit"
                className="w-full"
                size="lg"
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
              </PrimaryButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

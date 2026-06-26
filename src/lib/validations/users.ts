import { z } from 'zod'

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters.')
  .max(50, 'Username must be at most 50 characters.')
  .regex(
    /^[a-z0-9._-]+$/i,
    'Username may only contain letters, numbers, dots, hyphens, and underscores.',
  )

const phoneSchema = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || value.replace(/\D/g, '').length >= 7,
    'Phone must contain at least 7 digits.',
  )

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')

export const createUserSchema = z.object({
  fullName: z.string().trim().max(100, 'Full name is too long.'),
  username: usernameSchema,
  password: passwordSchema,
  phone: phoneSchema,
  role: z.enum(['Admin', 'Visitor']),
  isActive: z.boolean(),
})

export const updateUserSchema = z.object({
  fullName: z.string().trim().max(100, 'Full name is too long.'),
  phone: phoneSchema,
  role: z.enum(['Admin', 'Visitor']),
  isActive: z.boolean(),
})

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export type CreateUserFormValues = z.infer<typeof createUserSchema>
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

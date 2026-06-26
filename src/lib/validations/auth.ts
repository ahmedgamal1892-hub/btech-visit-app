import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters.'),
  password: z.string().min(1, 'Password is required.'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export type UserRole = 'Admin' | 'Visitor'

export type Profile = {
  id: string
  full_name: string
  username: string
  role: UserRole
  phone: string | null
  is_active: boolean
}

export type AuthUser = {
  id: string
  email: string | undefined
}

export type AuthState = {
  user: AuthUser | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
}

export type SignInResult =
  | { success: true }
  | { success: false; message: string }

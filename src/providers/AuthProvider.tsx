import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'

import {
  fetchCurrentProfile,
  getCurrentSession,
  signInWithUsername,
  signOut as signOutUser,
} from '@/services/auth'
import {
  getSupabaseClient,
  verifySupabaseConnection,
} from '@/services/supabase'
import type { AuthUser, Profile, SignInResult } from '@/types/auth'

type AuthContextValue = {
  user: AuthUser | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  signIn: (username: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapSessionUser(session: Session | null): AuthUser | null {
  if (!session?.user) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email,
  }
}

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const nextProfile = await fetchCurrentProfile(userId)
    setProfile(nextProfile)
  }, [])

  const hydrateSession = useCallback(
    async (session: Session | null) => {
      const nextUser = mapSessionUser(session)
      setUser(nextUser)

      if (nextUser) {
        await loadProfile(nextUser.id)
      } else {
        setProfile(null)
      }
    },
    [loadProfile],
  )

  useEffect(() => {
    let isMounted = true
    let unsubscribe: (() => void) | undefined

    const initialize = async () => {
      try {
        const connection = await verifySupabaseConnection()

        if (!connection.connected) {
          if (isMounted) {
            setUser(null)
            setProfile(null)
          }
          return
        }

        const supabase = getSupabaseClient()
        const session = await getCurrentSession()

        if (isMounted) {
          await hydrateSession(session)
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          void hydrateSession(nextSession)
        })

        unsubscribe = () => subscription.unsubscribe()
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void initialize()

    return () => {
      isMounted = false
      unsubscribe?.()
    }
  }, [hydrateSession])

  const signIn = useCallback(
    async (username: string, password: string): Promise<SignInResult> => {
      const result = await signInWithUsername(username, password)

      if (!result.success) {
        return result
      }

      const session = await getCurrentSession()
      await hydrateSession(session)

      return result
    },
    [hydrateSession],
  )

  const signOut = useCallback(async () => {
    await signOutUser()
    setUser(null)
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) {
      return
    }

    await loadProfile(user.id)
  }, [loadProfile, user])

  const isAdmin = profile?.role === 'Admin' && profile.is_active === true

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isLoading,
      isAuthenticated: Boolean(user),
      isAdmin,
      signIn,
      signOut,
      refreshProfile,
    }),
    [user, profile, isLoading, isAdmin, signIn, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider.')
  }

  return context
}

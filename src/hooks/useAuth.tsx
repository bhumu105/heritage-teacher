import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  /**
   * The current user's first family membership, if any. v0 assumes one family
   * per user; multi-family support arrives in v1 along with family switching.
   */
  familyId: string | null
  loading: boolean
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  /** Re-runs the family lookup — call after onboarding completes. */
  refreshFamily: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

async function lookupFamilyId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    // Log as a UUID-only event; never include email/name.
    console.error('[auth] family lookup failed', { userId, code: error.code })
    return null
  }
  return data?.family_id ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const hydrate = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession)
    if (nextSession?.user) {
      const fid = await lookupFamilyId(nextSession.user.id)
      setFamilyId(fid)
    } else {
      setFamilyId(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) void hydrate(data.session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) void hydrate(nextSession)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [hydrate])

  const signInWithEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true,
      },
    })
    return { error: error as Error | null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const refreshFamily = useCallback(async () => {
    if (session?.user) {
      const fid = await lookupFamilyId(session.user.id)
      setFamilyId(fid)
    }
  }, [session])

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        familyId,
        loading,
        signInWithEmail,
        signOut,
        refreshFamily,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

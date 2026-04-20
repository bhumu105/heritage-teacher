import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

/**
 * Gates a route behind a logged-in user who is also a member of a family.
 * - Not logged in → /login
 * - Logged in but no family → /onboarding (unless already there)
 * - Otherwise → render children
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, familyId, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!familyId && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { consumeInvite, PENDING_INVITE_KEY } from '@/lib/invites'

type Status = 'idle' | 'joining' | 'joined' | 'error'

export function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const { user, familyId, loading, refreshFamily } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // If signed out, stash the code and bounce to /login. LoginPage's post-auth
  // redirect picks the code back up and returns the user here.
  useEffect(() => {
    if (loading || !code) return
    if (!user) {
      sessionStorage.setItem(PENDING_INVITE_KEY, code)
      navigate('/login', { replace: true })
      return
    }
    if (status !== 'idle') return
    setStatus('joining')
    consumeInvite(code).then(async (result) => {
      if ('error' in result) {
        // "Already consumed" is only a hard failure if the user has nowhere
        // to land. If they're already in a family — typically because they
        // re-clicked their own invite link — quietly route to the library.
        if (result.error.includes('invite_already_consumed') && familyId) {
          sessionStorage.removeItem(PENDING_INVITE_KEY)
          navigate('/library', { replace: true })
          return
        }
        setErrorMsg(humanizeError(result.error))
        setStatus('error')
        return
      }
      sessionStorage.removeItem(PENDING_INVITE_KEY)
      await refreshFamily()
      setStatus('joined')
      navigate('/library', { replace: true })
    })
  }, [code, loading, user, familyId, status, navigate, refreshFamily])

  if (!code) return <Navigate to="/library" replace />

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Joining family…</CardTitle>
          <CardDescription>
            {status === 'error'
              ? 'We couldn’t use this invite.'
              : 'One moment while we add you to the family library.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {status === 'error' ? (
            <>
              <p className="text-red-600">{errorMsg}</p>
              <Button variant="outline" onClick={() => navigate('/library')}>
                Back to library
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">Working…</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Postgres errors come back as raw strings (`invite_expired`, …); turn them
// into something a family member can act on.
function humanizeError(raw: string): string {
  if (raw.includes('invite_not_found')) return 'That invite link is not valid.'
  if (raw.includes('invite_already_consumed'))
    return 'That invite link has already been used.'
  if (raw.includes('invite_expired'))
    return 'That invite link has expired. Ask the family owner for a new one.'
  if (raw.includes('not_authenticated'))
    return 'You need to be signed in to redeem an invite.'
  return raw
}

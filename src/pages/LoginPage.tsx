import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
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
import { useAuth } from '@/hooks/useAuth'

type Mode = 'password' | 'magic'
type Status = 'idle' | 'working' | 'sent' | 'error'

export function LoginPage() {
  const {
    user,
    loading,
    signInWithEmail,
    signInWithPassword,
    signUpWithPassword,
  } = useAuth()

  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (loading) return null
  if (user) return <Navigate to="/library" replace />

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('working')
    setErrorMsg(null)

    if (mode === 'magic') {
      const { error } = await signInWithEmail(email.trim())
      if (error) {
        setStatus('error')
        setErrorMsg(error.message)
        return
      }
      setStatus('sent')
      return
    }

    // Password path: try sign-in first; if the user doesn't exist yet, sign up.
    const trimmedEmail = email.trim()
    const { error: signInErr } = await signInWithPassword(trimmedEmail, password)
    if (!signInErr) {
      // Session is now set; useAuth's onAuthStateChange will redirect us.
      return
    }

    // Common "no user yet" messages — fall through to sign-up.
    const looksLikeMissingUser = /invalid login credentials|user not found/i.test(
      signInErr.message
    )
    if (looksLikeMissingUser) {
      const { error: signUpErr } = await signUpWithPassword(trimmedEmail, password)
      if (signUpErr) {
        setStatus('error')
        setErrorMsg(signUpErr.message)
        return
      }
      // If email confirmations are off, signUp returns a valid session —
      // onAuthStateChange will redirect. If on, status stays idle and we
      // fall through to the "check email" UI.
      setStatus('sent')
      return
    }

    setStatus('error')
    setErrorMsg(signInErr.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Heritage Teacher</CardTitle>
          <CardDescription>
            A private lesson keepsake for your family.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Mode switcher */}
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('password')
                setStatus('idle')
                setErrorMsg(null)
              }}
              className={`rounded-md border px-3 py-1 transition ${
                mode === 'password'
                  ? 'border-primary text-primary'
                  : 'border-border text-muted-foreground'
              }`}
            >
              Email + password
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('magic')
                setStatus('idle')
                setErrorMsg(null)
              }}
              className={`rounded-md border px-3 py-1 transition ${
                mode === 'magic'
                  ? 'border-primary text-primary'
                  : 'border-border text-muted-foreground'
              }`}
            >
              Magic link
            </button>
          </div>

          {status === 'sent' ? (
            <div className="space-y-3 text-sm">
              <p>
                Check <strong>{email}</strong> for a {mode === 'magic' ? 'sign-in link' : 'confirmation'}.
              </p>
              <p className="text-muted-foreground">
                You can close this tab — opening the link on any device will sign you in.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={status === 'working'}
                />
              </div>

              {mode === 'password' && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="at least 8 characters"
                    disabled={status === 'working'}
                  />
                  <p className="text-xs text-muted-foreground">
                    If this is your first time, we'll create your account
                    automatically with this password.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  status === 'working' ||
                  !email ||
                  (mode === 'password' && password.length < 8)
                }
              >
                {status === 'working'
                  ? 'Working…'
                  : mode === 'magic'
                    ? 'Send sign-in link'
                    : 'Sign in / create account'}
              </Button>

              {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

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

type Status = 'idle' | 'sending' | 'sent' | 'error'

export function LoginPage() {
  const { user, loading, signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (loading) return null
  if (user) return <Navigate to="/library" replace />

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg(null)

    const { error } = await signInWithEmail(email.trim())
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }
    setStatus('sent')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Heritage Teacher</CardTitle>
          <CardDescription>
            A private lesson keepsake for your family. Sign in with your email and we'll send you a one-time link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'sent' ? (
            <div className="space-y-3 text-sm">
              <p>
                Check <strong>{email}</strong> for a sign-in link.
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
                  disabled={status === 'sending'}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={status === 'sending' || !email}
              >
                {status === 'sending' ? 'Sending link…' : 'Send sign-in link'}
              </Button>
              {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

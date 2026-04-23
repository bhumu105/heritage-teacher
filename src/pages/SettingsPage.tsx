import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { useAuth } from '@/hooks/useAuth'
import { useTeacher } from '@/hooks/useTeacher'
import {
  deleteFamily,
  fetchFamilyName,
  grantConsent,
  renameFamily,
  revokeConsent,
} from '@/lib/settings'
import type { ConsentScope } from '@/lib/types'

const SCOPES: { key: ConsentScope; label: string; help: string }[] = [
  {
    key: 'record',
    label: 'Record',
    help: 'Capture new lessons. Revoking stops future recordings (existing ones stay).',
  },
  {
    key: 'archive',
    label: 'Archive',
    help: "Keep recordings in the family's private library. Revoking hides them from the app.",
  },
  {
    key: 'train',
    label: 'Train',
    help: "Allow AI models to learn this teacher's teaching style. Not used in v0 — keep off until you need it.",
  },
  {
    key: 'voice',
    label: 'Voice',
    help: "Allow AI to synthesise speech in this teacher's voice. Not used in v0 — requires paper sign-off.",
  },
]

export function SettingsPage() {
  const { user, familyId, signOut } = useAuth()
  const {
    loading: loadingTeacher,
    teacher,
    activeScopes,
    refresh: refreshTeacher,
  } = useTeacher(familyId)
  const navigate = useNavigate()

  const [familyName, setFamilyName] = useState<string>('')
  const [familyNameDraft, setFamilyNameDraft] = useState<string>('')
  const [savingFamily, setSavingFamily] = useState(false)
  const [familyMsg, setFamilyMsg] = useState<string | null>(null)
  const [togglingScope, setTogglingScope] = useState<ConsentScope | null>(null)
  const [scopeError, setScopeError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!familyId) return
    fetchFamilyName(familyId).then((name) => {
      if (!active) return
      setFamilyName(name ?? '')
      setFamilyNameDraft(name ?? '')
    })
    return () => {
      active = false
    }
  }, [familyId])

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  async function handleFamilyRename() {
    if (!familyId || savingFamily) return
    const trimmed = familyNameDraft.trim()
    if (!trimmed || trimmed === familyName) return
    setSavingFamily(true)
    setFamilyMsg(null)
    const err = await renameFamily(familyId, trimmed)
    if (err) {
      setFamilyMsg(`Save failed: ${err}`)
      setSavingFamily(false)
      return
    }
    setFamilyName(trimmed)
    setFamilyMsg('Saved.')
    setSavingFamily(false)
  }

  async function toggleScope(scope: ConsentScope, next: boolean) {
    if (!teacher || togglingScope) return
    setTogglingScope(scope)
    setScopeError(null)
    const err = next
      ? await grantConsent(teacher.id, scope)
      : await revokeConsent(teacher.id, scope)
    if (err) setScopeError(err)
    await refreshTeacher()
    setTogglingScope(null)
  }

  async function handleDeleteFamily(): Promise<string | null> {
    if (!familyId) return 'No family loaded.'
    const err = await deleteFamily(familyId)
    if (err) return err
    await signOut()
    navigate('/login', { replace: true })
    return null
  }

  const familyDirty = familyNameDraft.trim() !== familyName && familyNameDraft.trim().length > 0

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/library">
            <ArrowLeft className="mr-2 h-4 w-4" /> Library
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Settings</h1>
        <div className="w-20" /> {/* spacer to center title */}
      </header>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>{user?.email ?? 'Loading…'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </CardContent>
      </Card>

      {/* Family */}
      <Card>
        <CardHeader>
          <CardTitle>Family</CardTitle>
          <CardDescription>
            The name shown at the top of the library.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="familyName">Family name</Label>
            <Input
              id="familyName"
              value={familyNameDraft}
              onChange={(e) => setFamilyNameDraft(e.target.value)}
              disabled={savingFamily}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {familyMsg ?? (familyDirty ? 'Unsaved changes.' : 'Up to date.')}
            </p>
            <Button
              onClick={handleFamilyRename}
              disabled={!familyDirty || savingFamily}
              size="sm"
            >
              <Save className="mr-2 h-4 w-4" />
              {savingFamily ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Teacher + consents */}
      <Card>
        <CardHeader>
          <CardTitle>
            {teacher?.display_name ?? (loadingTeacher ? 'Loading teacher…' : 'No teacher')}
          </CardTitle>
          <CardDescription>
            Language code: {teacher?.native_language?.toUpperCase() ?? '—'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm font-medium">Consent scopes</p>
          <div className="space-y-3">
            {SCOPES.map(({ key, label, help }) => {
              const active = activeScopes.has(key)
              const pending = togglingScope === key
              return (
                <label
                  key={key}
                  className="flex items-start gap-3 rounded-md border border-border p-3"
                >
                  <Checkbox
                    checked={active}
                    disabled={!teacher || pending}
                    onCheckedChange={(v) => toggleScope(key, v === true)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {label}
                      {pending && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          updating…
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{help}</p>
                  </div>
                </label>
              )
            })}
          </div>
          {scopeError && <p className="text-sm text-red-600">{scopeError}</p>}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete this family and every recording, transcript, and
            consent record with it. Audio files stay encrypted in storage as the
            consent-clip record, but are orphaned and unreachable from the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteConfirm
            trigger={
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete everything
              </Button>
            }
            title={`Delete ${familyName || 'this family'}?`}
            description={`This is irreversible. To confirm, type the family name exactly: "${familyName}".`}
            confirmWord={familyName || 'delete'}
            onConfirm={handleDeleteFamily}
          />
        </CardContent>
      </Card>
    </div>
  )
}

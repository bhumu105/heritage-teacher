import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNowStrict } from 'date-fns'
import { ArrowLeft, Copy, LogOut, Plus, Save, Trash2, UserMinus } from 'lucide-react'
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
  createInvite,
  inviteUrl,
  listOpenInvites,
} from '@/lib/invites'
import { listFamilyMembers, removeFamilyMember } from '@/lib/members'
import {
  deleteFamily,
  fetchFamily,
  grantConsent,
  renameFamily,
  revokeConsent,
} from '@/lib/settings'
import type { ConsentScope, FamilyInvite, FamilyMember } from '@/lib/types'

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

  const [familyOwnerId, setFamilyOwnerId] = useState<string | null>(null)
  const isOwner = !!user?.id && user.id === familyOwnerId

  const [invites, setInvites] = useState<FamilyInvite[]>([])
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const [members, setMembers] = useState<FamilyMember[]>([])
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)
  const [memberMsg, setMemberMsg] = useState<string | null>(null)

  const refreshInvites = useCallback(async () => {
    if (!familyId) return
    const rows = await listOpenInvites(familyId)
    setInvites(rows)
  }, [familyId])

  const refreshMembers = useCallback(async () => {
    if (!familyId) return
    const rows = await listFamilyMembers(familyId)
    setMembers(rows)
  }, [familyId])

  useEffect(() => {
    let active = true
    if (!familyId) return
    fetchFamily(familyId).then((fam) => {
      if (!active) return
      setFamilyName(fam?.name ?? '')
      setFamilyNameDraft(fam?.name ?? '')
      setFamilyOwnerId(fam?.created_by ?? null)
    })
    return () => {
      active = false
    }
  }, [familyId])

  useEffect(() => {
    void refreshInvites()
  }, [refreshInvites])

  useEffect(() => {
    void refreshMembers()
  }, [refreshMembers])

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

  async function copyInviteLink(code: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(code))
      setCopiedCode(code)
      setInviteMsg('Link copied — share it with your relative.')
    } catch {
      setInviteMsg(`Couldn’t copy — link: ${inviteUrl(code)}`)
    }
  }

  async function handleCreateInvite() {
    if (!familyId || !user?.id || creatingInvite) return
    setCreatingInvite(true)
    setInviteMsg(null)
    const result = await createInvite(familyId, user.id)
    if ('error' in result) {
      // RLS rejects non-owners — surface a friendlier message in that case.
      const isPermission = /row-level security|permission|policy/i.test(result.error)
      setInviteMsg(
        isPermission
          ? 'Only the family owner can create invites.'
          : `Couldn’t create invite: ${result.error}`
      )
      setCreatingInvite(false)
      return
    }
    await refreshInvites()
    await copyInviteLink(result.invite.code)
    setCreatingInvite(false)
  }

  async function handleRemoveMember(userId: string): Promise<string | null> {
    if (!familyId || !isOwner) return 'Not allowed.'
    if (userId === user?.id) return "You can't remove yourself."
    setRemovingUserId(userId)
    setMemberMsg(null)
    const err = await removeFamilyMember(familyId, userId)
    setRemovingUserId(null)
    if (err) {
      const isPermission = /row-level security|permission|policy/i.test(err)
      return isPermission
        ? 'Only the family owner can remove members.'
        : `Couldn’t remove member: ${err}`
    }
    await refreshMembers()
    setMemberMsg('Member removed.')
    return null
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

      {/* Invites */}
      <Card>
        <CardHeader>
          <CardTitle>Invite family members</CardTitle>
          <CardDescription>
            Share the link with a relative — opening it adds them to this family.
            Links expire in 7 days and each one only works once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {invites.length > 0 ? (
            <ul className="space-y-2">
              {invites.map((inv) => (
                <li
                  key={inv.code}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-mono">{inv.code.slice(0, 8)}…</p>
                    <p className="text-xs text-muted-foreground">
                      Expires in{' '}
                      {formatDistanceToNowStrict(new Date(inv.expires_at))}
                    </p>
                  </div>
                  <Button
                    onClick={() => copyInviteLink(inv.code)}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedCode === inv.code ? 'Copied' : 'Copy link'}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              No active invites. Create one to share with a relative.
            </p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{inviteMsg ?? ''}</p>
            <Button
              onClick={handleCreateInvite}
              disabled={!familyId || creatingInvite}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              {creatingInvite ? 'Creating…' : 'Create invite'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>Family members</CardTitle>
          <CardDescription>
            Everyone who can see this library.
            {isOwner ? ' As the owner you can remove anyone except yourself.' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.length === 0 ? (
            <p className="text-xs text-muted-foreground">Loading members…</p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => {
                const isSelf = m.user_id === user?.id
                const removable = isOwner && !isSelf
                const pending = removingUserId === m.user_id
                return (
                  <li
                    key={m.user_id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {m.role === 'owner' ? 'Owner' : 'Member'}
                        {isSelf && (
                          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            you
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined{' '}
                        {formatDistanceToNowStrict(new Date(m.added_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {removable && (
                      <DeleteConfirm
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pending}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            {pending ? 'Removing…' : 'Remove'}
                          </Button>
                        }
                        title="Remove this member?"
                        description="They'll lose access to every lesson in this family. You can re-invite them later."
                        confirmWord="remove"
                        onConfirm={() => handleRemoveMember(m.user_id)}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {memberMsg && (
            <p className="text-xs text-muted-foreground">{memberMsg}</p>
          )}
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
